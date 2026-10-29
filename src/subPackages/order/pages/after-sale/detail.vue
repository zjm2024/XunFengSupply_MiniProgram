<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('order.afterSaleDetail.title')" :show-back="true" /></template>
    <template #content>
      <AppContent width-mode="standard" padding="16px var(--page-padding-x, 16px) 28px">
    <AppPageState v-if="loading && !detail" state="loading" :title="t('common.loading')" compact />
    <AppPageState v-else-if="error && !detail" state="error" :title="t('order.afterSaleDetail.loadFailed')" :description="error" :action-text="t('common.retry')" compact @retry="loadDetail" />
    <view v-else-if="detail" class="detail-body">
      <AppPageState v-if="error" state="error" :title="t('order.afterSaleDetail.loadFailed')" :description="error" :action-text="t('common.retry')" compact @retry="loadDetail" />
      <view class="detail-summary"><text class="status-name">{{ statusName }}</text><button class="text-action" :disabled="saving || loading" @tap="loadDetail">{{ t('order.afterSaleDetail.refresh') }}</button></view>
      <text class="detail-number">{{ detail.afterSaleNo }}</text>
      <view class="detail-row"><text>{{ detail.orderId > 0 ? t('order.afterSaleList.orderNo') : t('order.afterSaleList.inventorySource') }}</text><text v-if="detail.orderId > 0">{{ detail.orderNo }}</text><text v-else>—</text></view>
      <view class="detail-row"><text>{{ t('order.afterSale.type') }}</text><text>{{ detail.afterSaleType === 2 ? t('order.afterSale.returnRefund') : t('order.afterSale.onlyRefund') }}</text></view>
      <view v-if="detail.workflowVersion === 2" class="workflow-block">
        <text class="note-title">{{ t('order.afterSaleDetail.workflow.title') }}</text>
        <view class="detail-row"><text>{{ t('order.afterSaleDetail.workflow.inventoryLabel') }}</text><text>{{ workflowLabel('inventory', detail.inventoryStatus) }}</text></view>
        <view class="detail-row"><text>{{ t('order.afterSaleDetail.workflow.submissionLabel') }}</text><text>{{ workflowLabel('submission', detail.erpSubmissionStatus) }}</text></view>
        <view class="detail-row"><text>{{ t('order.afterSaleDetail.workflow.reviewLabel') }}</text><text>{{ workflowLabel('review', detail.erpReviewStatus) }}</text></view>
        <view class="detail-row"><text>{{ t('order.afterSaleDetail.workflow.receiptLabel') }}</text><text>{{ workflowLabel('receiptStatus', detail.receiptStatus) }}</text></view>
        <view class="detail-row"><text>{{ t('order.afterSaleDetail.workflow.pricingLabel') }}</text><text>{{ workflowLabel('pricingStatus', detail.pricingStatus) }}<template v-if="detail.pricingVersion"> · {{ t('order.afterSaleDetail.workflow.pricingVersion', { version: detail.pricingVersion }) }}</template></text></view>
      </view>
      <view class="detail-row"><text>{{ t('order.afterSaleList.refundRequested') }}</text><text v-if="awaitingPrice" class="awaiting-price">{{ t('order.afterSaleList.awaitingPrice') }}</text><AmountText v-else :text="'¥' + detail.refundAmount.toFixed(2)" /></view>
      <view class="note-block"><text class="note-title">{{ t('order.afterSale.reason') }}</text><text>{{ detail.reason }}</text></view>
      <view v-if="detail.auditRemark" class="note-block audit-note"><text class="note-title">{{ t('order.afterSaleDetail.auditRemark') }}</text><text>{{ detail.auditRemark }}</text></view>
      <view v-for="item in detail.items" :key="item.afterSaleItemId || item.orderItemId" class="detail-product">
        <AppProductImage class="product-image" :src="item.imageUrl" mode="aspectFit" />
        <view class="product-copy"><text class="product-name">{{ item.productName }}</text><text>{{ item.skuName }}</text><text>{{ t('order.afterSaleDetail.itemQuantity', { quantity: item.applyQuantity, received: item.receivedQuantity }) }}</text></view>
        <text v-if="awaitingPrice" class="product-amount awaiting-price">{{ t('order.afterSaleList.awaitingPrice') }}</text><AmountText v-else class="product-amount" :text="'¥' + item.refundAmount.toFixed(2)" />
      </view>
      <view class="time-block">
        <view class="detail-row"><text>{{ t('order.afterSaleDetail.createdAt') }}</text><text>{{ formatDateTimeSec(detail.createdAt) }}</text></view>
        <view v-if="detail.auditedAt" class="detail-row"><text>{{ t('order.afterSaleDetail.auditedAt') }}</text><text>{{ formatDateTimeSec(detail.auditedAt) }}</text></view>
        <view v-if="detail.receivedAt" class="detail-row"><text>{{ t('order.afterSaleDetail.receivedAt') }}</text><text>{{ formatDateTimeSec(detail.receivedAt) }}</text></view>
        <view v-if="detail.completedAt" class="detail-row"><text>{{ t('order.afterSaleDetail.completedAt') }}</text><text>{{ formatDateTimeSec(detail.completedAt) }}</text></view>
      </view>
      <view v-if="detail.returnTrackingNo" class="note-block"><text class="note-title">{{ t('order.afterSaleDetail.returnLogistics') }}</text><text>{{ detail.returnCarrierCode }} · {{ detail.returnTrackingNo }}</text></view>
      <view v-if="detail.status === 2 && detail.afterSaleType === 2" class="return-form">
        <text class="note-title">{{ t('order.afterSaleDetail.returnLogistics') }}</text>
        <text class="return-note">{{ t('order.afterSaleDetail.returnNote') }}</text>
        <text class="field-label">{{ t('order.afterSaleDetail.carrier') }}</text>
        <picker :range="carriers" range-key="name" :disabled="saving || !carriers.length" @change="chooseCarrier">
          <view class="field-input carrier-picker">{{ selectedCarrierName || t('order.afterSaleDetail.carrierPlaceholder') }}</view>
        </picker>
        <button v-if="carrierError" class="text-action" :disabled="saving" @tap="loadCarriers">{{ t('common.retry') }} · {{ carrierError }}</button>
        <text class="field-label">{{ t('order.afterSaleDetail.trackingNo') }}</text>
        <input v-model="logistics.trackingNo" class="field-input" :disabled="saving" maxlength="100" :placeholder="t('order.afterSaleDetail.trackingPlaceholder')" />
        <text v-if="saveError" class="save-error">{{ saveError }}</text>
        <button class="return-submit" :disabled="saving || !canSave" @tap="saveLogistics">{{ saving ? t('order.afterSale.submitting') : t('order.afterSaleDetail.submitLogistics') }}</button>
      </view>
    </view>
      </AppContent>
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
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { formatDateTime as formatDateTimeSec } from '@/shared/utils/format.js'

const afterSaleId = ref(0)
let disposed = false
let readRevision = 0
const detail = ref(null)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const saveError = ref('')
const logistics = reactive({ carrierCode: '', trackingNo: '' })
const carriers = ref([])
const carrierError = ref('')
const selectedCarrierName = computed(() => carriers.value.find(item => item.code === logistics.carrierCode)?.name || '')
const canSave = computed(() => Boolean(selectedCarrierName.value) && logistics.trackingNo.trim())
const statusName = computed(() => (getLocale() === 'en-US' ? detail.value?.statusNameEn || detail.value?.statusName : detail.value?.statusName) || t('order.afterSaleDetail.statusUpdating'))

/** 将闭环状态码映射为当前语言的简短节点文案。 */
function workflowLabel(axis, value) {
  return t(`order.afterSaleDetail.workflow.${axis}.${Number(value)}`)
}

onLoad(options => {
  const id = Number(options?.afterSaleId)
  afterSaleId.value = Number.isSafeInteger(id) && id > 0 ? id : 0
})
onShow(() => { if (!saving.value) return loadDetail() })
onUnload(() => { disposed = true; readRevision++ })
const awaitingPrice = computed(() => detail.value?.workflowVersion === 2 && detail.value?.sourceType === 2 && detail.value?.pricingStatus === 0)

/** 每次打开或主动刷新时读取真实审核/物流结果，保留未提交物流草稿。 */
async function loadDetail() {
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
function chooseCarrier(event) {
  if (saving.value) return
  logistics.carrierCode = carriers.value[Number(event.detail.value)]?.code || ''
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
.awaiting-price { color: #A36A20; font-size: 12px; font-weight: 600; }
.detail-body { width: 100%; box-sizing: border-box; padding: 18px 16px; border-radius: 16px; background: var(--surface-card, #fff); min-width: 0; color: var(--text-primary, #22262C); font-size: 13px; }
.detail-summary { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.status-name { font-size: 17px; font-weight: 650; overflow-wrap: anywhere; }
.text-action { margin: 0; padding: 6px 0 6px 8px; color: #D7192D; background: transparent; font-size: 12px; }
button::after { border: 0; }
.detail-number { display: block; margin: 3px 0 16px; color: #969AA3; font-size: 11px; overflow-wrap: anywhere; }
.detail-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 7px 0; line-height: 1.5; }
.detail-row > :first-child { flex: 0 0 34%; color: #737A84; }
.detail-row > :last-child { min-width: 0; text-align: right; overflow-wrap: anywhere; }
.note-block { padding: 12px; margin-top: 12px; border-radius: 10px; background: #F6F7F9; line-height: 1.6; overflow-wrap: anywhere; }
.note-block text { display: block; white-space: pre-wrap; }
.note-title { display: block; margin-bottom: 6px; font-weight: 600; }
.workflow-block { margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: #F6F7F9; }
.workflow-block .detail-row { padding: 5px 0; font-size: 12px; }
.audit-note { background: #FFF8EE; }
.detail-product { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 8px 12px; padding: 14px 0; border-bottom: 1px solid #EEF0F2; }
.product-image { width: 64px; height: 64px; border-radius: 8px; overflow: hidden; }
.product-copy { flex: 1; min-width: 0; }
.product-copy text { display: block; margin-bottom: 4px; color: #737A84; font-size: 11px; line-height: 1.5; overflow-wrap: anywhere; }
.product-copy .product-name { color: #22262C; font-size: 13px; font-weight: 600; }
.product-amount { grid-column: 2; min-width: 0; font-size: 12px; font-weight: 600; }
.time-block { padding-top: 10px; font-size: 12px; }
.return-form { margin-top: 16px; padding-top: 16px; border-top: 1px solid #EEF0F2; }
.return-note { display: block; color: #737A84; font-size: 12px; line-height: 1.6; }
.field-label { display: block; margin: 14px 0 8px; font-size: 13px; }
.field-input { width: 100%; height: 44px; padding: 0 12px; box-sizing: border-box; border: 1px solid #E5E7EB; border-radius: 10px; background: #F9FAFB; font-size: 14px; }
.carrier-picker { display: flex; align-items: center; height: auto; min-height: 44px; padding-top: 10px; padding-bottom: 10px; line-height: 1.5; overflow-wrap: anywhere; }
.return-submit { display: flex; width: 100%; min-height: 44px; align-items: center; justify-content: center; margin: 16px 0 0; padding: 10px 14px; border-radius: 10px; color: #fff; background: #D7192D; font-size: 14px; line-height: 1.5; }
.return-submit[disabled] { color: #969AA3; background: #E9EAED; }
.save-error { display: block; color: #D7192D; margin-top: 10px; font-size: 12px; line-height: 1.5; }
</style>
