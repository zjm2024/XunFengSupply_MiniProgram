<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('account.inventory.ledger')" :show-back="true" :searchable="true" :search-value="keywordInput" :search-placeholder="t('account.inventory.ledgerSearch')" @update:search-value="keywordInput = $event" @search="applySearch" @clear-search="clearSearch" />
      <view class="ledger-filters inventory-wrap">
        <button class="filter-value type-filter-trigger" :class="{ 'is-filtered': businessType }" @tap="typePickerVisible = true"><text>{{ selectedTypeLabel }}</text><AppIcon name="chevron-down" :size="14" /></button>
        <button class="filter-value date-range-trigger" :class="{ 'is-filtered': hasDateFilter }" @tap="openDateFilter"><text>{{ dateFilterLabel }}</text><AppIcon name="chevron-down" :size="14" /></button>
      </view>
    </template>
    <template #content>
      <AppContent width-mode="standard" padding="16px var(--page-padding-x,16px) 32px" :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="refresh" @refresherrestore="restoreRefresh" @refresherabort="restoreRefresh" @scrolltolower="loadMore">
        <view class="inventory-wrap">
          <view class="result-head"><text>{{ t('account.inventory.ledgerTotal', { count: totalCount }) }}</text><AppButton v-if="hasFilters" size="sm" variant="ghost" @tap="resetFilters">{{ t('account.inventory.clearFilters') }}</AppButton></view>
          <view v-if="skuId" class="sku-scope"><text>{{ t('account.inventory.skuScope') }} · {{ skuId }}</text><text class="link-text" @tap="clearSku">{{ t('account.inventory.clearSku') }}</text></view>
          <AppPageState :state="pageState" :action-text="pageState === PageStatus.ERROR ? t('account.inventory.reload') : ''" :title="pageState === PageStatus.ERROR ? t('account.inventory.readFailed') : t('account.inventory.ledgerEmpty')" :description="pageState === PageStatus.ERROR ? loadError : t('account.inventory.ledgerEmptyHint')" @retry="reload" @action="reload">
            <view class="ledger-list">
              <view v-for="item in items" :key="item.transactionId" class="flow-row ledger-card">
                <view class="flow-heading"><text class="flow-title">{{ businessTypeText(item.businessType) }}</text><text class="muted">{{ formatDateTime(item.occurredAt) }}</text></view>
                <view class="ledger-product" role="button" tabindex="0" hover-class="inventory-pressed" @keydown.enter="openSku(item)" @tap="openSku(item)"><AppProductImage class="ledger-image" :src="item.imageUrl" mode="aspectFit" /><view class="stock-copy"><text class="product-name">{{ item.productName || t('account.inventory.unnamed') }}</text><text class="spec-line">{{ [item.colorName, item.sizeName].filter(Boolean).join(' / ') || item.skuName }}</text><text class="sku-code">{{ item.skuCode || ('SKU ' + item.skuId) }}</text></view><AppIcon name="chevron-right" :size="14" color="#ABB1BB" /></view>
                <view class="flow-deltas"><view class="delta-metric"><text>{{ t('account.inventory.physicalChange') }}</text><text :class="deltaClass(item.quantityDelta)">{{ signed(item.quantityDelta) }} <text class="quantity-unit">{{ item.unit }}</text></text></view><view v-if="item.reservedDelta" class="delta-metric"><text>{{ t('account.inventory.reservedChange') }}</text><text>{{ signed(item.reservedDelta) }}</text></view></view>
                <view class="source-line" :role="canOpenSource(item) ? 'button' : undefined" :tabindex="canOpenSource(item) ? 0 : undefined" @keydown.enter="openSource(item)" @tap="openSource(item)"><text class="source-label">{{ t('account.inventory.sourceDocument') }}</text><text :class="{ 'link-text': canOpenSource(item) }">{{ item.sourceNo || '—' }}</text><AppIcon v-if="canOpenSource(item)" name="chevron-right" :size="14" color="#ABB1BB" /></view>
              </view>
            </view>
          </AppPageState>
          <AppLoadMore v-if="pageState === PageStatus.CONTENT" :status="loadMoreStatus" @retry="loadMore" />
        </view>
      </AppContent>
    </template>
    <template #overlay>
      <ConfirmPopup :model-value="dateFilterVisible && !startPickerVisible && !endPickerVisible" :title="t('account.inventory.dateFilterTitle')" presentation="action-sheet" @update:model-value="dateFilterVisible = $event" @confirm="applyDateFilter">
        <view class="date-filter-fields">
          <button class="date-field" @tap="startPickerVisible = true"><text>{{ t('account.inventory.startDate') }}</text><view><text>{{ draftStartDate || t('account.inventory.allDates') }}</text><AppIcon name="chevron-right" :size="14" /></view></button>
          <button class="date-field" @tap="endPickerVisible = true"><text>{{ t('account.inventory.endDate') }}</text><view><text>{{ draftEndDate || t('account.inventory.allDates') }}</text><AppIcon name="chevron-right" :size="14" /></view></button>
          <AppButton size="sm" variant="ghost" @tap="resetDateDraft">{{ t('account.inventory.clearDates') }}</AppButton>
        </view>
      </ConfirmPopup>
      <AppDatePicker v-model="startPickerVisible" :value="draftStartDate" :title="t('account.inventory.startDate')" @change="draftStartDate = $event.detail.value" />
      <AppDatePicker v-model="endPickerVisible" :value="draftEndDate" :title="t('account.inventory.endDate')" @change="draftEndDate = $event.detail.value" />
      <AppOptionPicker class="inventory-type-picker" presentation="action-sheet" v-model:visible="typePickerVisible" :model-value="businessType" :options="typeOptions" :title="t('account.inventory.typeFilterTitle')" @confirm="changeType" />
    </template>
  </AppPageShell>
</template>
<script setup>
import { waitForPaginationResult } from '@/shared/utils/refreshAnimation.js'

import { computed, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import AppOptionPicker from '@/shared/ui/AppOptionPicker.vue'
import AppDatePicker from '@/shared/ui/AppDatePicker/AppDatePicker.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'
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
  ...['PURCHASE_RECEIPT' /* 暂停售后筛选：, 'AFTER_SALE_RESERVE', 'AFTER_SALE_RELEASE', 'RETURN_OUT' */].map(value => ({ value, label: businessTypeText(value) })),
])
const typePickerVisible = ref(false)
const dateFilterVisible = ref(false), draftStartDate = ref(''), draftEndDate = ref('')
const hasDateFilter = computed(() => Boolean(startDate.value || endDate.value))
const dateFilterLabel = computed(() => hasDateFilter.value
  ? (startDate.value || t('account.inventory.startDate')) + ' — ' + (endDate.value || t('account.inventory.endDate'))
  : t('account.inventory.allDates'))
const startPickerVisible = ref(false), endPickerVisible = ref(false)
const selectedTypeLabel = computed(() => typeOptions.value.find(item => item.value === businessType.value)?.label || t('account.inventory.allTypes'))
const hasFilters = computed(() => Boolean(keyword.value || businessType.value || startDate.value || endDate.value))
const loadError = computed(() => loadFailure.value?.message || (loadFailure.value ? t('account.inventory.loadFailed') : ''))
const loadMoreStatus = computed(() => loadingMore.value ? 'loading' : moreError.value ? 'error' : pageNum.value * pageSize < totalCount.value ? 'idle' : 'no-more')
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
    const result = await waitForPaginationResult(getDealerInventoryTransactions(query(next)), true); if (disposed || token !== generation) return
    items.value = [...new Map([...items.value, ...result.items].map(item => [item.transactionId, item])).values()]
    pageNum.value = next; totalCount.value = result.totalCount; moreError.value = false
  } catch (error) { if (!disposed && token === generation) moreError.value = true }
  finally { if (token === generation) loadingMore.value = false }
}
/** Refresh the current filter without adding a polling timer. */
async function refresh() { if (refreshing.value) return; const start=Date.now(); refreshing.value = true; try { await reload() } finally { await waitForRefreshAnimation(start); if (!disposed) refreshing.value = false } }
/** Restore the native refresher without interrupting a pending request. */
function restoreRefresh() { if (!reading) refreshing.value = false }
/** Submit the search field. */
function applySearch() { keyword.value = keywordInput.value.trim(); return reload() }
/** Remove only the search keyword. */
function clearSearch() { keywordInput.value = ''; keyword.value = ''; return reload() }
/** Change the stable business type code. */
function changeType(value) {
  if (!typeOptions.value.some(item => item.value === value) || businessType.value === value) return
  businessType.value = value
  return reload()
}
/** Open a temporary date draft; canceling the sheet never changes the active query. */
function openDateFilter() { draftStartDate.value=startDate.value; draftEndDate.value=endDate.value; dateFilterVisible.value=true }
/** Clear only the sheet draft, preserving the applied filters until confirmation. */
function resetDateDraft() { draftStartDate.value=''; draftEndDate.value='' }
/** Apply one validated range and reload once, preserving the current SKU and type filter. */
function applyDateFilter() {
  if (draftStartDate.value && draftEndDate.value && draftEndDate.value < draftStartDate.value) {
    uni.showToast({title:t('account.inventory.dateInvalid'),icon:'none'}); return
  }
  const changed=startDate.value!==draftStartDate.value || endDate.value!==draftEndDate.value
  startDate.value=draftStartDate.value; endDate.value=draftEndDate.value; dateFilterVisible.value=false
  if (changed) return reload()
}
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
// 暂停售后单据跳转：function canOpenSource(item) { return item.sourceId > 0 && ((item.sourceType === 'ORDER' && userStore.hasPermission('ORDER_VIEW')) || (item.sourceType === 'AFTER_SALE' && userStore.hasPermission('INVENTORY_VIEW'))) }
function canOpenSource(item) { return item.sourceId > 0 && item.sourceType === 'ORDER' && userStore.hasPermission('ORDER_VIEW') }
/** Navigate to the actual order or return document. */
// 暂停售后单据跳转：function openSource(item) { if (canOpenSource(item)) return navigator.navigateTo(item.sourceType === 'ORDER' ? routes.order.detail(item.sourceId) : routes.order.afterSaleDetail(item.sourceId)) }
function openSource(item) { if (canOpenSource(item)) return navigator.navigateTo(routes.order.detail(item.sourceId)) }
/** Translate inventory movement codes, preserving unknown history. */
function businessTypeText(type) { return t('account.inventory.' + ({ PURCHASE_RECEIPT: 'purchaseReceipt', AFTER_SALE_RESERVE: 'afterSaleReserve', AFTER_SALE_RELEASE: 'afterSaleRelease', RETURN_OUT: 'returnOut' }[type] || 'change')) }
/** Preserve the sign of both stock and reservation movements. */
function signed(value) { return (value > 0 ? '+' : '') + Number(value || 0).toLocaleString('zh-CN') }
/** Color only physical movement, since releasing a reservation is not a receipt. */
function deltaClass(value) { return value > 0 ? 'positive' : value < 0 ? 'negative' : '' }
</script>
<style lang="scss" scoped>
@import './inventory.scss';

.ledger-filters { max-width:calc(820px + var(--page-padding-x,16px) + var(--page-padding-x,16px)); display:flex; align-items:center; gap:16px; padding:0 var(--page-padding-x,16px) 8px; }
.filter-value { display:flex; align-items:center; justify-content:center; gap:8px; min-width:0; min-height:48px; margin:0; padding:8px 0; border:0; border-radius:0; box-shadow:none; background:transparent; color:var(--text-primary); font-size:var(--type-body-small-size,13px); line-height:1.5; }
.filter-value text { min-width:0; overflow-wrap:anywhere; }
.type-filter-trigger { flex:0 1 38%; }
.date-range-trigger { flex:1; }
.filter-value.is-filtered { color:var(--primary-color); font-weight:600; }
.inventory-type-picker :deep(.app-option) { border:0; border-radius:0; box-shadow:none; background:transparent; padding-inline:0; }
.inventory-type-picker :deep(.app-option.is-selected) { color:var(--primary-color); background:transparent; }
.date-filter-fields { padding:4px 0; }
.date-field { display:flex; align-items:center; justify-content:space-between; gap:16px; width:100%; min-height:56px; padding:12px 0; margin:0; border:0; box-shadow:none; background:transparent; color:var(--text-secondary); font-size:var(--type-body-size,14px); line-height:1.5; text-align:left; }
.date-field > view { display:flex; align-items:center; gap:8px; color:var(--text-primary); }
.ledger-list { display:grid; gap:12px; }
.ledger-card { padding:16px; background:var(--inventory-card); border-radius:var(--radius-feature,18px); box-shadow:none; border:0; }
.ledger-list .flow-row { padding:16px; }
.ledger-list .flow-row:last-child { padding-bottom:16px; }
.ledger-product { display:grid; grid-template-columns:52px minmax(0,1fr) 16px; gap:12px; align-items:center; margin:16px 0; cursor:pointer; }
.ledger-image { width:52px; height:60px; border-radius:var(--radius-small,8px); background:var(--surface-subtle); }
.ledger-product .product-name { font-size:var(--type-body-size,14px); white-space:normal; overflow-wrap:anywhere; }
.sku-scope { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; padding:8px 12px; color:var(--inventory-muted); background:var(--surface-subtle); border-radius:var(--radius-control,10px); font-size:var(--type-caption-size,12px); }
.sku-scope .link-text { display:flex; align-items:center; min-height:44px; }
@media (min-width:720px) { .ledger-card { padding:24px; } .ledger-list .flow-row:last-child { padding-bottom:24px; } }
@media (max-width:374px) { .flow-heading { align-items:flex-start; flex-direction:column; gap:4px; } }

</style>
