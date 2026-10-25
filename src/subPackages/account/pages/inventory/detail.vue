<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('account.titles.inventoryDetail')" :show-back="true" /></template>
    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 34px">
        <view class="detail-page">
          <AppPageState
            :state="pageState"
            :title="t('account.inventory.detailEmpty')"
            :description="pageState === PageStatus.ERROR ? loadError : t('account.inventory.detailEmptyHint')"
            :action-text="t('account.inventory.reload')"
            @retry="loadDetail"
            @action="loadDetail"
          >
            <template #default>
              <view class="hero-card">
                <AppProductImage class="hero-image" :src="detail.imageUrl" :stock="detail.availableQuantity" mode="aspectFill" />
                <view class="hero-copy">
                  <text class="product-name">{{ detail.productName }}</text>
                  <text class="sku-name">{{ detail.skuName || `SKU ${detail.skuId}` }}</text>
                  <view class="specs">
                    <text v-if="detail.colorName">{{ t('account.inventory.color', { value: detail.colorName }) }}</text>
                    <text v-if="detail.sizeName">{{ t('account.inventory.size', { value: detail.sizeName }) }}</text>
                    <text v-if="detail.skuCode">{{ detail.skuCode }}</text>
                  </view>
                  <text class="updated">{{ t('account.inventory.lastInbound', { date: formatDateTime(detail.lastInboundAt) }) }}</text>
                </view>
              </view>

              <view class="quantity-card">
                <view class="primary"><text>{{ t('account.inventory.currentAvailable') }}</text><text>{{ formatQty(detail.availableQuantity) }} <text class="unit">{{ detail.unit }}</text></text></view>
                <view><text>{{ t('account.inventory.onHandStock') }}</text><text>{{ formatQty(detail.onHandQuantity) }}</text></view>
                <view><text>{{ t('account.inventory.reserved') }}</text><text>{{ formatQty(detail.reservedQuantity) }}</text></view>
                <view><text>{{ t('account.inventory.unavailable') }}</text><text>{{ formatQty(detail.unavailableQuantity) }}</text></view>
              </view>

              <view class="section-grid">
                <view class="section-card">
                  <view class="section-head">
                    <view><text class="section-title">{{ t('account.inventory.warehouses') }}</text><text class="section-desc">{{ t('account.inventory.warehouseHint') }}</text></view>
                    <text class="section-count">{{ t('account.inventory.warehouseTotal', { count: detail.warehouses.length }) }}</text>
                  </view>
                  <view class="warehouse-list">
                    <view v-for="warehouse in detail.warehouses" :key="warehouse.warehouseId" class="warehouse-row">
                      <view class="warehouse-mark"><AppIcon name="box" :size="18" /></view>
                      <view class="warehouse-copy">
                        <text>{{ warehouse.warehouseName }}</text>
                        <text>{{ warehouse.warehouseCode }} · {{ t('account.inventory.lastInbound', { date: formatDate(warehouse.lastInboundAt) }) }}</text>
                      </view>
                      <view class="warehouse-qty"><text>{{ formatQty(warehouse.availableQuantity) }}</text><text>{{ t('account.inventory.available') }}</text></view>
                    </view>
                  </view>
                </view>

                <view class="section-card">
                  <view class="section-head">
                    <view><text class="section-title">{{ t('account.inventory.transactions') }}</text><text class="section-desc">{{ t('account.inventory.transactionHint') }}</text></view>
                    <text class="section-count">{{ t('account.inventory.recentTotal', { count: detail.recentTransactions.length }) }}</text>
                  </view>
                  <view v-if="detail.recentTransactions.length" class="transaction-list">
                    <view v-for="item in detail.recentTransactions" :key="item.transactionId" class="transaction-row" :class="{ link: canOpenOrder(item) }" @tap="openSource(item)">
                      <view class="transaction-mark"><AppIcon :name="item.quantityDelta >= 0 ? 'arrow-down' : 'arrow-up'" :size="17" /></view>
                      <view class="transaction-copy">
                        <text>{{ businessTypeText(item.businessType) }}</text>
                        <text>{{ item.sourceNo || item.remark || t('account.inventory.adjustmentFallback') }} · {{ formatDateTime(item.occurredAt) }}</text>
                      </view>
                      <view class="delta" :class="{ negative: item.quantityDelta < 0 }">{{ item.quantityDelta > 0 ? '+' : '' }}{{ formatQty(item.quantityDelta) }}</view>
                      <AppIcon v-if="canOpenOrder(item)" name="chevron-right" :size="14" color="#A4A8AF" />
                    </view>
                  </view>
                  <view v-else class="empty-ledger">
                    <AppSvgIllustration class="ledger-empty-illustration" name="no-revenue" size="sm" />
                    <text>{{ t('account.inventory.emptyLedger') }}</text>
                  </view>
                </view>
              </view>
              <view class="data-note"><AppIcon name="info" :size="15" /><text>{{ t('account.inventory.dataNote') }}</text></view>
            </template>
          </AppPageState>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { getDealerInventoryDetail } from '../../api/inventory.js'
import { formatDate, formatDateTime } from '../../../../shared/utils/format.js'

const userStore = useUserStore()
const skuId = ref(0)
const detail = ref(null)
const pageState = ref(PageStatus.LOADING)
const loadFailure = ref(null)
const loadError = computed(() => loadFailure.value?.message
  || (loadFailure.value?.messageKey ? t(loadFailure.value.messageKey) : ''))

onLoad((options = {}) => {
  skuId.value = Number(options.skuId || 0)
  loadDetail()
})

/** 读取原 SKU 库存，保留错误对象或本地错误键。 */
async function loadDetail() {
  if (!skuId.value) {
    loadFailure.value = { messageKey: 'account.inventory.missingSku' }
    pageState.value = PageStatus.ERROR
    return
  }
  pageState.value = PageStatus.LOADING
  loadFailure.value = null
  try {
    detail.value = await getDealerInventoryDetail(skuId.value)
    pageState.value = detail.value ? PageStatus.CONTENT : PageStatus.EMPTY
  } catch (error) {
    loadFailure.value = error?.message ? error : { messageKey: 'account.inventory.detailLoadFailed' }
    pageState.value = PageStatus.ERROR
  }
}

function canOpenOrder(item) {
  return item.sourceType === 'ORDER' && item.sourceId > 0 && userStore.hasPermission('ORDER_VIEW')
}
function openSource(item) {
  if (canOpenOrder(item)) navigator.navigateTo(routes.order.detail(item.sourceId))
}
/** 仅翻译既有库存流水类型名称，不改类型代码。 */
function businessTypeText(type) {
  return ({
    PURCHASE_RECEIPT: t('account.inventory.purchaseReceipt'), SALE_OUT: t('account.inventory.saleOut'), RETURN_OUT: t('account.inventory.returnOut'),
    TRANSFER: t('account.inventory.transfer'), COUNT_ADJUST: t('account.inventory.countAdjust'),
  })[type] || t('account.inventory.change')
}
function formatQty(value) { return Number(value || 0).toLocaleString('zh-CN') }
</script>

<style lang="scss" scoped>
.detail-page { width: 100%; max-width: 1080px; margin: 0 auto; }
.hero-card,.quantity-card,.section-card { background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.hero-card { display: grid; grid-template-columns: 110px minmax(0,1fr); gap: 15px; padding: 15px; border-radius: 19px; }
.hero-image { width: 110px; height: 132px; border-radius: 14px; }
.hero-copy { min-width: 0; }
.product-name,.sku-name,.updated { display: block; }
.product-name { overflow: hidden; color: #20242A; font-size: 17px; font-weight: 730; line-height: 1.45; text-overflow: ellipsis; white-space: nowrap; }
.sku-name { margin-top: 6px; color: #7C828B; font-size: 11px; }
.specs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.specs text { padding: 4px 7px; border-radius: 7px; color: #66717B; background: #F1F3F4; font-size: 9px; }
.updated { margin-top: 15px; color: #9A9EA5; font-size: 9px; }
.quantity-card { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); margin-top: 14px; overflow: hidden; border-radius: 17px; }
.quantity-card > view { padding: 15px; border-right: 0; border-bottom: 0; background: rgba(255,255,255,.28); }
.quantity-card > view:nth-child(2n) { border-right: 0; }
.quantity-card > view:nth-last-child(-n+2) { border-bottom: 0; }
.quantity-card text { display: block; color: #898E96; font-size: 9px; }
.quantity-card text + text { margin-top: 5px; color: #30363E; font-size: 18px; font-weight: 730; font-variant-numeric: tabular-nums; }
.quantity-card .primary text + text { color: #1F6848; }
.quantity-card .unit { display: inline; font-size: 10px; font-weight: 550; }
.section-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 14px; margin-top: 14px; }
.section-card { padding: 17px; border-radius: 18px; }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 13px; border-bottom: 1px solid #EFF0F2; }
.section-title,.section-desc { display: block; }
.section-title { color: #272C33; font-size: 14px; font-weight: 700; }
.section-desc { margin-top: 4px; color: #979BA3; font-size: 9px; }
.section-count { color: #7B818A; font-size: 10px; }
.warehouse-row,.transaction-row { display: grid; align-items: center; gap: 10px; padding: 13px 0; border-bottom: 1px solid #F0F1F2; }
.warehouse-row:last-child,.transaction-row:last-child { border-bottom: 0; }
.warehouse-row { grid-template-columns: 36px minmax(0,1fr) auto; }
.warehouse-mark,.transaction-mark { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 11px; color: #405769; background: #EEF3F5; }
.warehouse-copy,.transaction-copy { min-width: 0; }
.warehouse-copy text,.transaction-copy text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.warehouse-copy text:first-child,.transaction-copy text:first-child { color: #353B43; font-size: 11px; font-weight: 660; }
.warehouse-copy text:last-child,.transaction-copy text:last-child { margin-top: 4px; color: #989CA3; font-size: 8px; }
.warehouse-qty { text-align: right; }
.warehouse-qty text { display: block; color: #276B4D; font-size: 14px; font-weight: 700; }
.warehouse-qty text:last-child { margin-top: 2px; color: #9A9EA5; font-size: 8px; font-weight: 500; }
.transaction-row { grid-template-columns: 36px minmax(0,1fr) auto; }
.transaction-row.link { grid-template-columns: 36px minmax(0,1fr) auto 14px; }
.delta { color: #1F704D; font-size: 13px; font-weight: 720; }
.delta.negative { color: #9A3933; }
.empty-ledger { display: flex; flex-direction: column; align-items: center; padding: 12px 0; color: #9B9FA6; font-size: 11px; text-align: center; }
.ledger-empty-illustration { width: 112px; height: 112px; }
.data-note { display: flex; align-items: flex-start; gap: 8px; margin: 14px 2px 0; color: #848A93; font-size: 9px; line-height: 1.6; }
@media screen and (min-width: 720px) {
  .hero-card { grid-template-columns: 134px minmax(0,1fr); padding: 19px; }
  .hero-image { width: 134px; height: 150px; }
  .quantity-card { grid-template-columns: repeat(4,minmax(0,1fr)); }
  .quantity-card > view { border-bottom: 0; }
  .quantity-card > view:nth-child(2) { border-right: 1px solid #ECEDEF; }
  .section-grid { grid-template-columns: minmax(0,.82fr) minmax(0,1.18fr); gap: 16px; }
  .section-card { padding: 19px; }
}
</style>
