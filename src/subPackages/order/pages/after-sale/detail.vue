<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('order.afterSaleDetail.title')" :show-back="true" /></template>
    <template #content>
      <AppContent width-mode="standard" padding="16px var(--page-padding-x, 16px) 28px"
        :refresher-enabled="!saving" :refresher-triggered="isRefreshing"
        @refresherrefresh="handleRefresh" @refresherrestore="handleRefresherRestore" @refresherabort="handleRefresherRestore">
    <AppPageState page-loading v-if="loading && !detail" state="loading" :title="t('common.loading')" compact />
    <AppPageState v-else-if="error && !detail" state="error" :title="t('order.afterSaleDetail.loadFailed')" :description="error" :action-text="t('common.retry')" compact @retry="loadDetail" />
    <view v-else-if="detail" class="detail-body">
      <AppPageState v-if="error" state="error" :title="t('order.afterSaleDetail.loadFailed')" :description="error" :action-text="t('common.retry')" compact @retry="loadDetail" />
      <view class="detail-card summary-card">
        <view class="summary-heading">
          <text class="status-name">{{ statusName }}</text>
          <text class="type-badge">{{ detail.afterSaleType === 2 ? t('order.afterSale.returnRefund') : t('order.afterSale.onlyRefund') }}</text>
        </view>
        <text class="status-description">{{ statusDescription }}</text>
        <view class="detail-row number-row">
          <text>{{ t('order.afterSaleDetail.numberLabel') }}</text>
          <button class="number-copy" :disabled="!detail.afterSaleNo" :aria-label="t('order.afterSaleDetail.copyNumber')" @tap="copyAfterSaleNo">{{ detail.afterSaleNo || '—' }}</button>
        </view>
        <view class="detail-row refund-row">
          <text>{{ t('order.afterSaleList.refundRequested') }}</text>
          <text v-if="awaitingPrice || closedUnpricedAmount" class="awaiting-price">{{ closedUnpricedAmount ? '—' : t('order.afterSaleList.awaitingPrice') }}</text>
          <AmountText v-else class="summary-amount" :text="'¥' + detail.refundAmount.toFixed(2)" />
        </view>
      </view>
      <view v-if="detail.workflowVersion === 2" class="detail-card workflow-block">
        <text class="section-title">{{ t('order.afterSaleDetail.workflow.title') }}</text>
        <view class="progress-step" :class="{ 'is-current': detail.erpReviewStatus === 0, 'is-complete': detail.erpReviewStatus === 1, 'is-alert': detail.erpReviewStatus === 2, 'is-last': detail.status === 7 }">
          <view class="progress-track"><view class="progress-dot" /></view>
          <text class="progress-label">{{ t('order.afterSaleDetail.workflow.reviewLabel') }}</text>
          <text class="progress-badge">{{ workflowLabel('review', detail.erpReviewStatus) }}</text>
        </view>
        <view v-if="detail.status !== 7" class="progress-step is-last" :class="{ 'is-current': detail.erpReviewStatus === 1 && detail.receiptStatus < 2, 'is-complete': detail.receiptStatus === 2, 'is-alert': detail.receiptStatus === 3 }">
          <view class="progress-track"><view class="progress-dot" /></view>
          <text class="progress-label">{{ t('order.afterSaleDetail.workflow.receiptLabel') }}</text>
          <text class="progress-badge">{{ workflowLabel('receiptStatus', detail.receiptStatus) }}</text>
        </view>
      </view>
      <view class="detail-card products-card">
        <text class="section-title">{{ t('order.afterSaleDetail.productsTitle') }}</text>
        <view v-for="item in detail.items" :key="item.afterSaleItemId || item.orderItemId" class="detail-product">
          <AppProductImage class="product-image" :src="item.imageUrl" mode="aspectFit" />
          <view class="product-copy">
            <text class="product-name">{{ item.productName }}</text>
            <text>{{ item.skuName }}</text>
            <text>{{ t('order.afterSaleDetail.itemQuantity', { quantity: item.applyQuantity, received: item.receivedQuantity }) }}</text>
          </view>
          <text v-if="awaitingPrice || closedUnpricedAmount" class="product-amount awaiting-price">{{ closedUnpricedAmount ? '—' : t('order.afterSaleList.awaitingPrice') }}</text>
          <AmountText v-else class="product-amount" :text="'¥' + item.refundAmount.toFixed(2)" />
        </view>
      </view>
      <view class="detail-card reason-card">
        <text class="section-title">{{ t('order.afterSale.reason') }}</text>
        <text class="reason-content">{{ detail.reason }}</text>
      </view>
      <view v-if="detail.auditRemark" class="detail-card audit-note">
        <text class="section-title">{{ t('order.afterSaleDetail.auditRemark') }}</text>
        <text class="note-content">{{ detail.auditRemark }}</text>
      </view>
      <view class="detail-card time-block">
        <view class="detail-row"><text>{{ detail.orderId > 0 ? t('order.afterSaleList.orderNo') : t('order.afterSaleList.inventorySource') }}</text><text>{{ detail.orderId > 0 ? detail.orderNo : '—' }}</text></view>
        <view class="detail-row"><text>{{ t('order.afterSaleDetail.createdAt') }}</text><text>{{ formatDateTimeSec(detail.createdAt) }}</text></view>
        <view v-if="detail.auditedAt" class="detail-row"><text>{{ t('order.afterSaleDetail.auditedAt') }}</text><text>{{ formatDateTimeSec(detail.auditedAt) }}</text></view>
        <view v-if="detail.receivedAt" class="detail-row"><text>{{ t('order.afterSaleDetail.receivedAt') }}</text><text>{{ formatDateTimeSec(detail.receivedAt) }}</text></view>
        <view v-if="detail.completedAt" class="detail-row"><text>{{ t('order.afterSaleDetail.completedAt') }}</text><text>{{ formatDateTimeSec(detail.completedAt) }}</text></view>
      </view>
      <view v-if="detail.returnTrackingNo" class="detail-card">
        <text class="section-title">{{ t('order.afterSaleDetail.returnLogistics') }}</text>
        <text class="note-content">{{ [detail.returnCarrierCode, detail.returnTrackingNo].filter(Boolean).join(' · ') }}</text>
      </view>
      <view v-if="detail.status === 2 && detail.afterSaleType === 2" class="detail-card return-form">
        <text class="note-title">{{ t('order.afterSaleDetail.returnLogistics') }}</text>
        <text class="return-note">{{ t('order.afterSaleDetail.returnNote') }}</text>
        <text class="field-label">{{ t('order.afterSaleDetail.carrier') }}</text>
        <button class="field-input carrier-picker" :disabled="saving || !carriers.length" @tap="carrierPickerVisible = true">
          {{ selectedCarrierName || t('order.afterSaleDetail.carrierPlaceholder') }}
        </button>
        <button v-if="carrierError" class="text-action" :disabled="saving" @tap="loadCarriers">{{ t('common.retry') }} · {{ carrierError }}</button>
        <text class="field-label">{{ t('order.afterSaleDetail.trackingNo') }}</text>
        <input :placeholder-style="$inputPlaceholderStyle" v-model="logistics.trackingNo" class="field-input" :disabled="saving" maxlength="100" :placeholder="t('order.afterSaleDetail.trackingPlaceholder')" />
        <text v-if="saveError" class="save-error">{{ saveError }}</text>
        <button class="return-submit" :disabled="saving || !canSave" @tap="saveLogistics">{{ saving ? t('order.afterSale.submitting') : t('order.afterSaleDetail.submitLogistics') }}</button>
      </view>
    </view>
      </AppContent>
    </template>
    <template #overlay>
      <AppOptionPicker v-model:visible="carrierPickerVisible" :model-value="logistics.carrierCode" :options="carrierOptions" :title="t('order.afterSaleDetail.carrierPlaceholder')" :disabled="saving" @confirm="chooseCarrier" />
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { t, getLocale } from '@/shared/i18n/index.js'
import '@/subPackages/order/i18n/register.js'
import { getAfterSaleDetail, getAfterSaleCarriers, submitReturnLogistics } from '../../api/afterSaleApi.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppOptionPicker from '@/shared/ui/AppOptionPicker.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { formatDateTime as formatDateTimeSec } from '@/shared/utils/format.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'

const afterSaleId = ref(0)
let disposed = false
let readRevision = 0
const detail = ref(null)
const loading = ref(false)
const isRefreshing = ref(false)
let refreshInFlight = false
let detailLoadPromise = null
const saving = ref(false)
const error = ref('')
const saveError = ref('')
const logistics = reactive({ carrierCode: '', trackingNo: '' })
let logisticsInitialized = false
const carriers = ref([])
const carrierPickerVisible = ref(false)
const carrierOptions = computed(() => carriers.value.map(item => ({ value: item.code, label: item.name, meta: item.code })))
const carrierError = ref('')
const selectedCarrierName = computed(() => carriers.value.find(item => item.code === logistics.carrierCode)?.name || '')
const canSave = computed(() => Boolean(selectedCarrierName.value) && logistics.trackingNo.trim())
const statusName = computed(() => (getLocale() === 'en-US' ? detail.value?.statusNameEn || detail.value?.statusName : detail.value?.statusName) || t('order.afterSaleDetail.statusUpdating'))

/** 用服务端售后状态展示对应说明，不把退款中描述为已到账。 */
const statusDescription = computed(() => {
  const key = ['applied', 'review', 'toReturn', 'returning', 'received', 'refunding', 'completed', 'rejected', 'failed', 'closed'][detail.value?.status] || 'unknown'
  return t('order.afterSaleDetail.help.' + key)
})

/** 点击售后单号复制完整原值，成功与失败均给出明确反馈。 */
function copyAfterSaleNo() {
  const number = detail.value?.afterSaleNo
  if (!number) return
  uni.setClipboardData({
    data: number,
    showToast: false,
    success: () => uni.showToast({ title: t('order.afterSaleDetail.copied'), icon: 'none' }),
    fail: () => uni.showToast({ title: t('order.afterSaleDetail.copyFailed'), icon: 'none' }),
  })
}

/** 将闭环状态码映射为当前语言的简短节点文案。 */
function workflowLabel(axis, value) {
  return t(`order.afterSaleDetail.workflow.${axis}.${Number(value)}`)
}

onLoad(options => {
  const id = Number(options?.afterSaleId)
  afterSaleId.value = Number.isSafeInteger(id) && id > 0 ? id : 0
})
onShow(() => { if (!saving.value) return loadDetail() })
onUnload(() => { disposed = true; readRevision++; isRefreshing.value = false })
const unconfirmedAmount = computed(() => detail.value?.workflowVersion === 2 && detail.value?.sourceType === 2 && detail.value?.pricingStatus === 0)
const closedUnpricedAmount = computed(() => unconfirmedAmount.value && [6, 7, 8, 9].includes(detail.value?.status))
const awaitingPrice = computed(() => unconfirmedAmount.value && !closedUnpricedAmount.value)

/** 复用正在进行的详情读取，下拉刷新需等待实际请求完成，保留未提交物流草稿。 */
function loadDetail() {
  if (detailLoadPromise) return detailLoadPromise
  detailLoadPromise = fetchDetail().finally(() => { detailLoadPromise = null })
  return detailLoadPromise
}

/** 下拉刷新读取最新业务进度，成功或失败均收回统一刷新指示器。 */
async function handleRefresh() {
  if (disposed || saving.value || refreshInFlight) return
  const startedAt = Date.now()
  refreshInFlight = true
  isRefreshing.value = true
  try {
    await loadDetail()
  } finally {
    await waitForRefreshAnimation(startedAt)
    refreshInFlight = false
    isRefreshing.value = false
  }
}

/** 原生滚动恢复/取消不能提前结束仍在请求或最小动画周期中的刷新。 */
function handleRefresherRestore() {
  if (!refreshInFlight) isRefreshing.value = false
}

/** 读取服务端审核/收货结果，旧页面响应不得覆盖当前内容。 */
async function fetchDetail() {
  if (disposed || loading.value) return
  if (!afterSaleId.value) { error.value = t('order.afterSaleDetail.notFound'); return }
  const revision = ++readRevision
  loading.value = true
  error.value = ''
  try {
    const result = await getAfterSaleDetail(afterSaleId.value)
    if (disposed || revision !== readRevision) return
    if (!result) throw new Error(t('order.afterSaleDetail.notFound'))
    detail.value = result
    if (!logisticsInitialized) {
      logistics.carrierCode = result.returnCarrierCode || ''
      logistics.trackingNo = result.returnTrackingNo || ''
      logisticsInitialized = true
    }
    if (result.status === 2 && result.afterSaleType === 2 && !carriers.value.length) await loadCarriers()
  } catch (failure) {
    if (!disposed && revision === readRevision) error.value = failure?.message || t('order.afterSaleDetail.loadFailed')
  } finally { loading.value = false }
}

/** 承运商名称来自既有主数据接口，不在界面要求客户手填系统编码。 */
async function loadCarriers() {
  carrierError.value = ''
  try {
    const result = await getAfterSaleCarriers()
    if (disposed) return
    carriers.value = result
    if (!carriers.value.length) carrierError.value = t('order.afterSaleDetail.noCarriers')
  } catch (failure) { carrierError.value = failure?.message || t('order.afterSaleDetail.noCarriers') }
}

/** 保留原主数据编码用于提交，只改变界面的承运商名称。 */
function chooseCarrier(code) {
  if (saving.value || !carriers.value.some(item => item.code === code)) return
  logistics.carrierCode = code
}

/** 待退货时提交承运商编码和运单号，等待服务端状态迁移后刷新列表与详情。 */
async function saveLogistics() {
  if (disposed || loading.value || saving.value || !canSave.value || detail.value?.status !== 2 || detail.value?.afterSaleType !== 2) return
  const payload = { afterSaleId: afterSaleId.value, carrierCode: logistics.carrierCode.trim(), trackingNo: logistics.trackingNo.trim() }
  saving.value = true
  saveError.value = ''
  try {
    await submitReturnLogistics(payload)
    if (disposed) return
    // 写入已成功即收起表单；详情补查失败时也不能再次提交同一份物流。
    detail.value = { ...detail.value, status: 3, returnCarrierCode: payload.carrierCode, returnTrackingNo: payload.trackingNo }
    uni.showToast({ title: t('order.afterSaleDetail.logisticsSaved'), icon: 'success' })
    await loadDetail()
  } catch (failure) {
    if (!disposed) saveError.value = failure?.message || t('order.afterSaleDetail.saveFailed')
  } finally { saving.value = false }
}

</script>

<style lang="scss" scoped>
.detail-body { display: flex; flex-direction: column; gap: 12px; width: 100%; min-width: 0; box-sizing: border-box; color: var(--text-primary, #22262C); font-size: var(--type-body-size, 14px); }
.detail-card { min-width: 0; padding: 16px; border-radius: var(--radius-card, 16px); background: var(--surface-card, #fff); box-shadow: var(--glass-card-shadow, 0 2px 12px rgba(25, 31, 42, .025)); }
.summary-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.status-name { min-width: 0; font-size: var(--type-heading-size, 24px); font-weight: var(--font-weight-bold, 700); line-height: 1.3; overflow-wrap: anywhere; }
.type-badge { flex-shrink: 0; max-width: 45%; padding: 5px 10px; border-radius: 20px; background: var(--surface-muted, #F2F3F5); font-size: var(--type-caption-size, 12px); line-height: 1.5; text-align: center; }
.status-description { display: block; margin-top: 6px; color: var(--text-secondary, #737A84); font-size: var(--type-body-small-size, 13px); line-height: 1.6; }
.detail-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-width: 0; padding: 12px 0; line-height: 1.5; }
.detail-row > :first-child { flex-shrink: 0; color: var(--text-secondary, #737A84); }
.detail-row > :last-child { min-width: 0; text-align: right; overflow-wrap: anywhere; }
.number-row { margin-top: 14px; padding: 3px 0; border-top: 1px solid var(--border-light, #EEF0F2); border-bottom: 1px solid var(--border-light, #EEF0F2); }
.number-row > :first-child { font-size: var(--type-body-small-size, 13px); }
.number-copy { display: flex; align-items: center; justify-content: flex-end; flex: 1; min-width: 0; min-height: 44px; margin: 0; padding: 7px 0; border: 0; border-radius: 6px; color: inherit; background: transparent; font-size: var(--type-body-small-size, 13px); line-height: 1.5; text-align: right; overflow-wrap: anywhere; white-space: normal; }
.number-copy:active { opacity: .65; }
.number-copy:focus-visible { outline: 2px solid var(--primary-color, #D7192D); outline-offset: 3px; }
button::after { border: 0; }
.refund-row { padding-bottom: 0; }
.refund-row > :first-child { color: var(--text-primary, #22262C); font-size: var(--type-card-title-size, 15px); }
.summary-amount { font-size: var(--type-money-total-size, 28px); font-weight: var(--font-weight-bold, 700); }
.section-title, .note-title { display: block; margin-bottom: 12px; font-size: var(--type-section-title-size, 16px); font-weight: var(--font-weight-semibold, 600); line-height: 1.4; }
.progress-step { display: flex; align-items: center; gap: 12px; min-height: 40px; }
.progress-track { position: relative; display: flex; align-items: center; justify-content: center; align-self: stretch; width: 16px; flex-shrink: 0; }
.progress-track::after { position: absolute; top: 50%; bottom: -50%; left: 7px; width: 1px; background: #DDE0E4; content: ''; }
.is-last .progress-track::after { display: none; }
.progress-dot { position: relative; z-index: 1; width: 12px; height: 12px; border: 2px solid #C3C7CD; border-radius: 50%; background: var(--surface-card, #fff); box-sizing: border-box; }
.progress-label { flex: 1; min-width: 0; font-size: var(--type-body-size, 14px); line-height: 1.5; }
.progress-badge { flex-shrink: 0; max-width: 48%; padding: 3px 10px; border-radius: 20px; background: #F2F3F5; color: #737A84; font-size: var(--type-caption-size, 12px); line-height: 1.5; text-align: center; }
.is-current .progress-dot, .is-complete .progress-dot, .is-alert .progress-dot { border-color: var(--primary-color, #D7192D); }
.is-complete .progress-dot { background: var(--primary-color, #D7192D); }
.is-current .progress-label { font-weight: var(--font-weight-semibold, 600); }
.is-current .progress-badge, .is-alert .progress-badge { background: #FFF0F1; color: var(--primary-color, #D7192D); }
.detail-product { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; align-items: center; gap: 12px; min-width: 0; padding: 14px 0; border-top: 1px solid var(--border-light, #EEF0F2); }
.detail-product:first-of-type { padding-top: 0; border-top: 0; }
.detail-product:last-child { padding-bottom: 0; }
.product-image { width: 64px; height: 64px; border-radius: var(--radius-small, 8px); overflow: hidden; }
.product-copy { min-width: 0; }
.product-copy text { display: block; margin-top: 3px; color: var(--text-secondary, #737A84); font-size: var(--type-body-small-size, 13px); line-height: 1.5; overflow-wrap: anywhere; }
.product-copy .product-name { margin-top: 0; color: var(--text-primary, #22262C); font-size: var(--type-card-title-size, 15px); font-weight: var(--font-weight-semibold, 600); }
.product-amount { max-width: 100%; font-size: var(--type-price-size, 18px); font-weight: var(--font-weight-semibold, 600); }
.awaiting-price { color: #95621D; font-size: var(--type-body-small-size, 13px); font-weight: var(--font-weight-semibold, 600); }
.reason-content { display: block; padding: 10px 12px; border-radius: var(--radius-control, 10px); background: var(--surface-muted, #F6F7F9); line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.note-content { display: block; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.audit-note { background: #FFFBF5; }
.time-block { padding-top: 4px; padding-bottom: 4px; font-size: var(--type-body-small-size, 13px); }
.time-block .detail-row + .detail-row { border-top: 1px solid var(--border-light, #EEF0F2); }
.time-block .detail-row > :last-child { flex: 1; }
.return-note { display: block; color: var(--text-secondary, #737A84); font-size: var(--type-body-small-size, 13px); line-height: 1.6; }
.field-label { display: block; margin: 14px 0 8px; font-size: var(--type-body-size, 14px); }
.field-input { width: 100%; height: 44px; padding: 0 12px; box-sizing: border-box; border: 1px solid #E5E7EB; border-radius: var(--radius-control, 10px); background: #F9FAFB; font-size: var(--type-body-size, 14px); }
.carrier-picker { display: flex; align-items: center; height: auto; min-height: 44px; margin: 0; padding-top: 10px; padding-bottom: 10px; line-height: 1.5; overflow-wrap: anywhere; }
.text-action { margin: 0; padding: 6px 0; color: var(--primary-color, #D7192D); background: transparent; font-size: var(--type-body-small-size, 13px); }
.return-submit { display: flex; width: 100%; min-height: 44px; align-items: center; justify-content: center; margin: 16px 0 0; padding: 10px 14px; border-radius: var(--radius-control, 10px); color: #fff; background: var(--primary-color, #D7192D); font-size: var(--type-body-size, 14px); line-height: 1.5; }
.return-submit[disabled] { color: #969AA3; background: #E9EAED; }
.save-error { display: block; color: var(--primary-color, #D7192D); margin-top: 10px; font-size: var(--type-body-small-size, 13px); line-height: 1.5; }
@media (max-width: 359px) {
  .detail-product { grid-template-columns: 56px minmax(0, 1fr); gap: 8px 10px; }
  .product-image { width: 56px; height: 56px; grid-row: span 2; }
  .product-amount { grid-column: 2; }
}
</style>
