<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('account.inventory.ledger')" :show-back="true" :searchable="true" :search-value="keywordInput" :search-placeholder="t('account.inventory.ledgerSearch')" @update:search-value="keywordInput = $event" @search="applySearch" @clear-search="clearSearch" />
      <view class="ledger-filters inventory-wrap">
        <picker :range="typeOptions" range-key="label" :value="typeIndex" @change="changeType"><view class="filter-value">{{ typeOptions[typeIndex].label }} <AppIcon name="chevron-down" :size="12" /></view></picker>
        <picker mode="date" :value="startDate" @change="changeStart"><view class="filter-value">{{ startDate || t('account.inventory.startDate') }}</view></picker>
        <picker mode="date" :value="endDate" @change="changeEnd"><view class="filter-value">{{ endDate || t('account.inventory.endDate') }}</view></picker>
      </view>
    </template>
    <template #content>
      <AppContent padding="16px var(--page-padding-x,16px) 32px" :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="refresh" @scrolltolower="loadMore">
        <view class="inventory-wrap">
          <view class="result-head"><text>{{ t('account.inventory.ledgerTotal', { count: totalCount }) }}</text><text v-if="hasFilters" class="link-text" @tap="resetFilters">{{ t('account.inventory.clearFilters') }}</text></view>
          <view v-if="skuId" class="sku-scope"><text>{{ t('account.inventory.skuScope') }} · {{ skuId }}</text><text class="link-text" @tap="clearSku">{{ t('account.inventory.clearSku') }}</text></view>
          <AppPageState :state="pageState" :title="t('account.inventory.ledgerEmpty')" :description="pageState === PageStatus.ERROR ? loadError : t('account.inventory.ledgerEmptyHint')" @retry="reload" @action="reload">
            <view class="stock-list ledger-list">
              <view v-for="item in items" :key="item.transactionId" class="flow-row">
                <view class="flow-heading"><text class="flow-title">{{ businessTypeText(item.businessType) }}</text><text class="muted">{{ formatDateTime(item.occurredAt) }}</text></view>
                <view class="ledger-product" @tap="openSku(item)"><AppProductImage class="ledger-image" :src="item.imageUrl" mode="aspectFit" /><view class="stock-copy"><text class="product-name">{{ item.productName || t('account.inventory.unnamed') }}</text><text class="spec-line">{{ [item.colorName, item.sizeName].filter(Boolean).join(' / ') || item.skuName }}</text><text class="sku-code">{{ item.skuCode || ('SKU ' + item.skuId) }}</text></view><AppIcon name="chevron-right" :size="14" color="#ABB1BB" /></view>
                <view class="flow-deltas"><text>{{ t('account.inventory.physicalChange') }}<text :class="deltaClass(item.quantityDelta)">{{ signed(item.quantityDelta) }} {{ item.unit }}</text></text><text v-if="item.reservedDelta">{{ t('account.inventory.reservedChange') }}<text>{{ signed(item.reservedDelta) }}</text></text></view>
                <view class="source-line" @tap="openSource(item)"><text :class="{ 'link-text': canOpenSource(item) }">{{ item.sourceNo || '—' }}</text><AppIcon v-if="canOpenSource(item)" name="chevron-right" :size="12" color="#ABB1BB" /></view>
              </view>
            </view>
          </AppPageState>
          <AppLoadMore v-if="pageState === PageStatus.CONTENT" :status="loadMoreStatus" @retry="loadMore" />
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { formatDateTime } from '@/shared/utils/format.js'
import { getDealerInventoryTransactions } from '../../api/inventory.js'

const userStore = useUserStore(), skuId = ref(null), keywordInput = ref(''), keyword = ref(''), businessType = ref('')
const startDate = ref(''), endDate = ref(''), items = ref([]), totalCount = ref(0), pageNum = ref(1), pageSize = 20
const pageState = ref(PageStatus.LOADING), loadFailure = ref(null), loadingMore = ref(false), moreError = ref(false), refreshing = ref(false)
const typeOptions = computed(() => [
  { value: '', label: t('account.inventory.allTypes') },
  ...['PURCHASE_RECEIPT', 'AFTER_SALE_RESERVE', 'AFTER_SALE_RELEASE', 'RETURN_OUT'].map(value => ({ value, label: businessTypeText(value) })),
])
const typeIndex = computed(() => Math.max(0, typeOptions.value.findIndex(item => item.value === businessType.value)))
const hasFilters = computed(() => Boolean(keyword.value || businessType.value || startDate.value || endDate.value))
const loadError = computed(() => loadFailure.value?.message || (loadFailure.value ? t('account.inventory.loadFailed') : ''))
const loadMoreStatus = computed(() => moreError.value ? 'error' : loadingMore.value ? 'loading' : pageNum.value * pageSize < totalCount.value ? 'idle' : 'no-more')
let generation = 0, disposed = false, reading = false, invalidSku = false
onLoad(options => {
  if (options?.skuId != null) { const value = Number(options.skuId); invalidSku = !Number.isSafeInteger(value) || value <= 0; if (!invalidSku) skuId.value = value }
})
onShow(() => { if (!reading) reload() })
onUnload(() => { disposed = true; generation++ })
/** Convert a local calendar date to UTC; the inclusive end date uses the following midnight. */
function dateBound(value, nextDay = false) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day + (nextDay ? 1 : 0)).toISOString()
}
/** Build only business filters, with no client-supplied dealer identity. */
function query(page) { return { pageNum: page, pageSize, skuId: skuId.value, keyword: keyword.value, businessType: businessType.value, startAt: dateBound(startDate.value), endAt: dateBound(endDate.value, true) } }
/** Read filtered activity, invalidating outstanding pages from a previous filter. */
async function reload() {
  if (disposed) return
  if (invalidSku) { loadFailure.value = { message: t('account.inventory.missingSku') }; pageState.value = PageStatus.ERROR; return }
  const token = ++generation
  pageNum.value = 1; totalCount.value = 0; items.value = []; reading = true; loadingMore.value = false; moreError.value = false; loadFailure.value = null; pageState.value = PageStatus.LOADING
  try { const result = await getDealerInventoryTransactions(query(1)); if (!disposed && token === generation) { items.value = result.items; totalCount.value = result.totalCount; pageState.value = items.value.length ? PageStatus.CONTENT : PageStatus.EMPTY } }
  catch (error) { if (!disposed && token === generation) { loadFailure.value = error; pageState.value = PageStatus.ERROR } }
  finally { if (token === generation) reading = false }
}
/** Append activity once, without reusing a stale query generation. */
async function loadMore() {
  if (loadingMore.value || pageState.value !== PageStatus.CONTENT || pageNum.value * pageSize >= totalCount.value) return
  const token = generation, next = pageNum.value + 1; loadingMore.value = true
  try {
    const result = await getDealerInventoryTransactions(query(next)); if (disposed || token !== generation) return
    items.value = [...new Map([...items.value, ...result.items].map(item => [item.transactionId, item])).values()]
    pageNum.value = next; totalCount.value = result.totalCount; moreError.value = false
  } catch (error) { if (!disposed && token === generation) moreError.value = true }
  finally { if (token === generation) loadingMore.value = false }
}
/** Refresh the current filter without adding a polling timer. */
async function refresh() { if (refreshing.value) return; refreshing.value = true; try { await reload() } finally { if (!disposed) refreshing.value = false } }
/** Submit the search field. */
function applySearch() { keyword.value = keywordInput.value.trim(); return reload() }
/** Remove only the search keyword. */
function clearSearch() { keywordInput.value = ''; keyword.value = ''; return reload() }
/** Change the stable business type code. */
function changeType(event) { businessType.value = typeOptions.value[Number(event.detail.value)]?.value || ''; return reload() }
/** Reject an inverted date range without replacing valid query results. */
function changeDate(target, value) {
  const start = target === 'start' ? value : startDate.value, end = target === 'end' ? value : endDate.value
  if (start && end && end < start) { uni.showToast({ title: t('account.inventory.dateInvalid'), icon: 'none' }); return }
  if (target === 'start') startDate.value = value; else endDate.value = value
  return reload()
}
/** Apply the start date picker. */
function changeStart(event) { return changeDate('start', event.detail.value) }
/** Apply the end date picker. */
function changeEnd(event) { return changeDate('end', event.detail.value) }
/** Reset filters while keeping a detail page's selected SKU. */
function resetFilters() { keywordInput.value = ''; keyword.value = ''; businessType.value = ''; startDate.value = ''; endDate.value = ''; return reload() }
/** Explicitly leave the selected SKU scope. */
function clearSku() { skuId.value = null; return reload() }
/** Open current quantities for the activity's SKU. */
function openSku(item) { if (item.skuId > 0) return navigator.navigateTo(routes.account.inventoryDetail(item.skuId)) }
/** Follow only sources for which this account has access. */
function canOpenSource(item) { return item.sourceId > 0 && ((item.sourceType === 'ORDER' && userStore.hasPermission('ORDER_VIEW')) || (item.sourceType === 'AFTER_SALE' && userStore.hasPermission('INVENTORY_VIEW'))) }
/** Navigate to the actual order or return document. */
function openSource(item) { if (canOpenSource(item)) return navigator.navigateTo(item.sourceType === 'ORDER' ? routes.order.detail(item.sourceId) : routes.order.afterSaleDetail(item.sourceId)) }
/** Translate inventory movement codes, preserving unknown history. */
function businessTypeText(type) { return t('account.inventory.' + ({ PURCHASE_RECEIPT: 'purchaseReceipt', AFTER_SALE_RESERVE: 'afterSaleReserve', AFTER_SALE_RELEASE: 'afterSaleRelease', RETURN_OUT: 'returnOut' }[type] || 'change')) }
/** Preserve the sign of both stock and reservation movements. */
function signed(value) { return (value > 0 ? '+' : '') + Number(value || 0).toLocaleString('zh-CN') }
/** Color only physical movement, since releasing a reservation is not a receipt. */
function deltaClass(value) { return value > 0 ? 'positive' : value < 0 ? 'negative' : '' }
</script>
<style lang="scss" scoped>
@import './inventory.scss';
.ledger-filters { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px; padding: 6px var(--page-padding-x,16px) 12px; }
.filter-value { display: flex; align-items: center; justify-content: center; min-height: 36px; padding: 6px; border-radius: 9px; background: #fff; color: #657080; font-size: 11px; overflow-wrap: anywhere; }
.ledger-list { padding: 0 16px; }
.ledger-list .flow-row { padding: 18px 0; }
.flow-heading .muted { text-align: right; font-size: 10px; }
.ledger-product { display: grid; grid-template-columns: 48px minmax(0,1fr) 14px; align-items: center; gap: 10px; margin: 12px 0; }
.ledger-image { width: 48px; height: 56px; border-radius: 7px; }
.ledger-product .product-name { font-size: 13px; }
.ledger-product .spec-line { font-size: 11px; }
.source-line,.sku-scope { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px; color: #989FAA; font-size: 11px; overflow-wrap: anywhere; }
.sku-scope { margin: 0 0 12px; padding: 10px 12px; border-radius: 9px; background: #FCEEEF; }
</style>
