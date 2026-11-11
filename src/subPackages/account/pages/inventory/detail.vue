<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('account.titles.inventoryDetail')" :show-back="true" /></template>
    <template #content>
      <AppContent padding="16px var(--page-padding-x,16px) 28px">
        <view class="inventory-wrap">
          <AppPageState :state="pageState" :title="t('account.inventory.detailEmpty')" :description="pageState === PageStatus.ERROR ? loadError : t('account.inventory.detailEmptyHint')" @retry="loadDetail" @action="loadDetail">
            <view class="hero-card">
              <AppProductImage class="hero-image" :src="detail.imageUrl" mode="aspectFit" />
              <view class="stock-copy"><text class="product-name">{{ detail.productName }}</text><text class="spec-line">{{ [detail.colorName, detail.sizeName].filter(Boolean).join(' / ') || detail.skuName }}</text><text class="sku-code">{{ detail.skuCode || ('SKU ' + detail.skuId) }}</text><text v-if="detail.barcode" class="sku-code">{{ detail.barcode }}</text></view>
            </view>
            <view class="quantity-card">
              <view class="quantity-primary"><text>{{ t('account.inventory.currentAvailable') }}</text><text>{{ formatQty(detail.availableQuantity) }} <text>{{ detail.unit }}</text></text></view>
              <view class="quantity-secondary"><view><text>{{ t('account.inventory.physicalStock') }}</text><text>{{ formatQty(detail.onHandQuantity) }}</text></view><view><text>{{ t('account.inventory.reserved') }}</text><text>{{ formatQty(detail.reservedQuantity) }}</text></view><view><text>{{ t('account.inventory.unavailable') }}</text><text>{{ formatQty(detail.unavailableQuantity) }}</text></view></view>
            </view>
            <view class="section-card">
              <view class="section-head"><text class="section-title">{{ t('account.inventory.transactions') }}</text><text class="muted">{{ t('account.inventory.recentTotal', { count: recentTransactions.length }) }}</text></view>
              <view v-for="item in recentTransactions" :key="item.transactionId" class="flow-row" @tap="openSource(item)">
                <view class="flow-heading"><text class="flow-title">{{ businessTypeText(item.businessType) }}</text><AppIcon v-if="canOpenSource(item)" name="chevron-right" :size="14" color="#AAB0BA" /></view>
                <text class="sku-code">{{ item.sourceNo || '—' }}</text><text class="muted">{{ formatDateTime(item.occurredAt) }}</text>
                <view class="flow-deltas"><text>{{ t('account.inventory.physicalChange') }}<text :class="deltaClass(item.quantityDelta)">{{ signed(item.quantityDelta) }}</text></text><text v-if="item.reservedDelta">{{ t('account.inventory.reservedChange') }}<text>{{ signed(item.reservedDelta) }}</text></text></view>
              </view>
              <text v-if="!recentTransactions.length" class="muted">{{ t('account.inventory.emptyLedger') }}</text>
            </view>
            <text class="note">{{ t('account.inventory.lastInbound', { date: formatDateTime(detail.lastInboundAt) }) }}</text>
          </AppPageState>
        </view>
      </AppContent>
    </template>
    <template v-if="pageState === PageStatus.CONTENT" #footer>
      <FixedActionBar><button class="action-button secondary" @tap="openLedger">{{ t('account.inventory.ledger') }}</button><!-- 暂停售后入口，保留代码待恢复。
<button v-if="(userStore.hasPermission('INVENTORY_VIEW') && userStore.hasPermission('ORDER_CREATE'))" class="action-button" :disabled="detail.availableQuantity <= 0" @tap="openInventoryAfterSale">{{ t('account.inventory.applyAfterSale') }}</button>
--></FixedActionBar>
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
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { getDealerInventoryDetail } from '../../api/inventory.js'
import { formatDateTime } from '@/shared/utils/format.js'

const userStore = useUserStore(), skuId = ref(0), detail = ref(null), pageState = ref(PageStatus.LOADING), loadFailure = ref(null)
const loadError = computed(() => loadFailure.value?.message || (loadFailure.value?.messageKey ? t(loadFailure.value.messageKey) : ''))
const recentTransactions = computed(() => (detail.value?.recentTransactions || []).slice(0, 5))
let reading = false, disposed = false
onLoad(options => { skuId.value = Number(options?.skuId || 0) })
onShow(loadDetail)
onUnload(() => { disposed = true })
/** Re-read this SKU on return so reservations cannot remain visually stale. */
async function loadDetail() {
  if (reading || disposed) return
  if (!Number.isSafeInteger(skuId.value) || skuId.value <= 0) { loadFailure.value = { messageKey: 'account.inventory.missingSku' }; pageState.value = PageStatus.ERROR; return }
  reading = true; pageState.value = PageStatus.LOADING; loadFailure.value = null
  try { const result = await getDealerInventoryDetail(skuId.value); if (!disposed) { detail.value = result; pageState.value = result ? PageStatus.CONTENT : PageStatus.EMPTY } }
  catch (error) { if (!disposed) { loadFailure.value = error?.message ? error : { messageKey: 'account.inventory.detailLoadFailed' }; pageState.value = PageStatus.ERROR } }
  finally { reading = false }
}
/** Use only the current SKU for an inventory return. */
function openInventoryAfterSale() { if (detail.value?.availableQuantity > 0 && (userStore.hasPermission('INVENTORY_VIEW') && userStore.hasPermission('ORDER_CREATE'))) return navigator.navigateTo(routes.order.inventoryAfterSaleApply({ skuId: detail.value.skuId })) }
/** Scope the full ledger to this SKU. */
function openLedger() { return navigator.navigateTo(routes.account.inventoryLedger({ skuId: skuId.value })) }
/** Respect order access before following a purchase source. */
function canOpenOrder(item) { return item.sourceType === 'ORDER' && item.sourceId > 0 && userStore.hasPermission('ORDER_VIEW') }
/** Permit inventory-return sources through the inventory permission. */
// 暂停售后单据跳转：function canOpenSource(item) { return canOpenOrder(item) || (item.sourceType === 'AFTER_SALE' && item.sourceId > 0 && (userStore.hasPermission('INVENTORY_VIEW') && userStore.hasPermission('ORDER_CREATE'))) }
function canOpenSource(item) { return canOpenOrder(item) }
/** Follow the actual source document type. */
// 暂停售后单据跳转：function openSource(item) { if (canOpenOrder(item)) return navigator.navigateTo(routes.order.detail(item.sourceId)); if (canOpenSource(item)) return navigator.navigateTo(routes.order.afterSaleDetail(item.sourceId)) }
function openSource(item) { if (canOpenOrder(item)) return navigator.navigateTo(routes.order.detail(item.sourceId)) }
/** Translate stable movement codes without changing their direction. */
function businessTypeText(type) { return t('account.inventory.' + ({ PURCHASE_RECEIPT: 'purchaseReceipt', AFTER_SALE_RESERVE: 'afterSaleReserve', AFTER_SALE_RELEASE: 'afterSaleRelease', RETURN_OUT: 'returnOut', SALE_OUT: 'saleOut', TRANSFER: 'transfer', COUNT_ADJUST: 'countAdjust' }[type] || 'change')) }
/** Format quantities consistently with the list. */
function formatQty(value) { return Number(value || 0).toLocaleString('zh-CN') }
/** Keep zero physical movement visible for a reservation-only event. */
function signed(value) { return (value > 0 ? '+' : '') + formatQty(value) }
/** Mark only physical stock increases and decreases. */
function deltaClass(value) { return value > 0 ? 'positive' : value < 0 ? 'negative' : '' }
</script>
<style lang="scss" scoped>
@import './inventory.scss';
.hero-card { display: grid; grid-template-columns: 88px minmax(0,1fr); align-items: center; gap: 15px; padding: 18px 16px; border-radius: var(--radius-feature, 18px); background: #fff; }
.hero-card .product-name { white-space: normal; overflow-wrap: anywhere; }
.hero-image { width: 88px; height: 96px; border-radius: var(--radius-control, 10px); }
.quantity-card { margin-top: 14px; padding: 20px 18px; border-radius: var(--radius-feature, 18px); background: #fff; }
.quantity-primary > text { display: block; font-size: var(--type-caption-size, 12px); color: #8C939E; }
.quantity-primary > text + text { margin-top: 8px; font-size: var(--type-display-size, 28px); color: #D7192D; font-weight: var(--font-weight-bold, 700); }
.quantity-primary text text { color: #8C939E; font-size: var(--type-body-small-size, 13px); font-weight: var(--font-weight-regular, 400); }
.quantity-secondary { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; margin-top: 20px; padding-top: 18px; border-top: 1px solid #F0F2F5; }
.quantity-secondary text { display: block; font-size: var(--type-caption-size, 12px); color: #9299A3; }
.quantity-secondary view > text:first-child { min-height: 32px; line-height: 1.45; }
.quantity-secondary text + text { margin-top: 5px; font-size: var(--type-page-title-size, 20px); color: #3C4551; font-weight: var(--font-weight-semibold, 600); }

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.hero-card, .quantity-card, .section-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
</style>
