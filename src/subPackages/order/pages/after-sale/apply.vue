<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('order.titles.apply')" :show-back="true" /></template>
    <template #content>
      <AppContent width-mode="standard" padding="12px var(--page-padding-x, 16px) 24px">
        <view class="apply-after-sale-page">
          <AppPageState v-if="loading" state="loading" :title="t('common.loading')" compact />
          <AppPageState v-else-if="loadError" state="error" :title="t('order.afterSale.loadFailed')" :description="loadError" :action-text="orderId ? t('common.retry') : ''" compact @retry="loadAfterSaleableItems(orderId)" />
          <template v-else>
            <view v-if="orderNo" class="order-context"><text>{{ t('order.afterSale.orderContext') }}</text><text class="order-number">{{ orderNo }}</text></view>
            <view class="section-card">
              <view class="section-heading">
                <text class="section-label">{{ t('order.afterSale.selectGoods') }}</text>
              </view>
              <text class="section-note">{{ t('order.afterSale.shippedOnly') }}</text>
              <AppPageState v-if="!afterSaleItems.length" state="empty" :title="t('order.afterSale.noProducts')" compact />
              <template v-else>
                <view class="selection-summary">
                  <text>{{ t('order.afterSale.selectionCount', { count: selectedLines.length, quantity: totalQuantity }) }}</text>
                  <button class="text-button" :disabled="submitting || submitted" @tap="toggleAll">{{ allSelected ? t('order.afterSale.clearSelection') : t('order.afterSale.selectAll') }}</button>
                </view>
                <view v-for="item in afterSaleItems" :key="item.orderItemId" class="goods-row">
                  <button class="check-button" :class="{ checked: quantities[item.orderItemId] > 0 }" :disabled="submitting || submitted" :aria-label="t('order.afterSale.select') + ' ' + item.productName + ' ' + item.skuName" @tap="selectGoods(item)">
                    <AppIcon v-if="quantities[item.orderItemId] > 0" name="check" :size="14" color="#fff" />
                  </button>
                  <AppProductImage class="goods-image" :src="item.imageUrl" mode="aspectFit" />
                  <view class="goods-info">
                    <text class="goods-name">{{ item.productName }}</text>
                    <text class="sku-name">{{ item.skuName }}</text>
                    <text class="section-note">{{ t('order.afterSale.availableQuantity', { count: item.availableQuantity }) }}</text>
                    <QuantityStepper v-if="quantities[item.orderItemId] > 0" size="sm" :model-value="quantities[item.orderItemId]" :min="1" :max="item.availableQuantity" allow-input :disabled="submitting || submitted" @update:modelValue="setQuantity($event, item)" />
                  </view>
                </view>
              </template>
            </view>
            <template v-if="afterSaleItems.length">
              <view class="section-card">
                <text class="section-label">{{ t('order.afterSale.type') }}</text>
                <view class="type-summary">
                  <view class="type-copy">
                    <text class="type-name">{{ t('order.afterSale.returnRefund') }}</text>
                    <text class="section-note">{{ t('order.afterSale.returnRefundDescription') }}</text>
                  </view>
                  <AppIcon name="check" :size="17" color="#D7192D" />
                </view>
              </view>
              <view class="section-card">
                <text class="section-label">{{ t('order.afterSale.reason') }}</text>
                <textarea v-model="form.reason" class="reason-input" :disabled="submitting || submitted" :placeholder="t('order.afterSale.reasonPlaceholder')" maxlength="500" auto-height />
                <text class="character-count">{{ form.reason.length }}/500</text>
              </view>
              <view class="section-card express-card">
                <text class="section-label">{{ t('order.afterSale.expressNo') }}</text>
                <input v-model="form.expressNo" class="express-input" :disabled="submitting || submitted" maxlength="100" :placeholder="t('order.afterSale.expressNoPlaceholder')" />
              </view>
              <view class="section-card refund-card">
                <view class="refund-row"><text>{{ t('order.afterSale.refundAmount') }}</text><AmountText class="refund-value" :text="'¥' + estimatedRefundAmount.toFixed(2)" /></view>
                <text class="section-note">{{ t('order.afterSale.refundNote') }}</text>
              </view>
            </template>
          </template>
        </view>
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar width-mode="standard">
        <button class="submit-btn" :disabled="submitting || submitted || !canSubmit" @tap="handleSubmit">{{ submitting ? t('order.afterSale.submitting') : t('order.afterSale.submit') }}</button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/order/i18n/register.js'
import { applyAfterSale, getAfterSaleableItems } from '../../api/afterSaleApi.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import QuantityStepper from '@/shared/ui/QuantityStepper/QuantityStepper.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

let successRedirectTimer = null
let pageDisposed = false
onUnload(() => { pageDisposed = true; if (successRedirectTimer) clearTimeout(successRedirectTimer) })
const orderId = ref('')
const orderNo = ref('')
const afterSaleItems = ref([])
const quantities = reactive({})
const loading = ref(false)
const loadError = ref('')
const submitting = ref(false)
const submitted = ref(false)
const clientRequestId = ref('')
const requestFingerprint = ref('')
const form = reactive({ type: 2, reason: '', expressNo: '' })
let loadRevision = 0
const selectedLines = computed(() => afterSaleItems.value
  .filter(item => quantities[item.orderItemId] > 0)
  .map(item => ({ orderItemId: item.orderItemId, quantity: quantities[item.orderItemId] }))
  .sort((a, b) => a.orderItemId - b.orderItemId))
const totalQuantity = computed(() => selectedLines.value.reduce((sum, item) => sum + item.quantity, 0))
const allSelected = computed(() => afterSaleItems.value.length > 0 && selectedLines.value.length === afterSaleItems.value.length)
const canSubmit = computed(() => !loading.value && !loadError.value && Number(orderId.value) > 0
  && form.type === 2 && form.reason.trim().length > 0 && selectedLines.value.length > 0)

/** 逐行按分计算预估金额，完整申请一行时保留服务端剩余净额。 */
const estimatedRefundAmount = computed(() => afterSaleItems.value.reduce((sum, item) => {
  const quantity = quantities[item.orderItemId] || 0
  return sum + (quantity > 0 && item.availableQuantity > 0
    ? Math.round(Number(item.refundAmount || 0) * 100 * quantity / item.availableQuantity) : 0)
}, 0) / 100)

onLoad(options => {
  const currentOrderId = Number(options?.orderId || 0)
  if (currentOrderId > 0) {
    orderId.value = String(currentOrderId)
    orderNo.value = String(options?.orderNo || '')
    loadAfterSaleableItems(currentOrderId)
  } else {
    loadError.value = t('order.afterSale.missingOrder')
  }
})

/** 加载当前订单内仍符合申请条件的明细，失败时保留重试入口。 */
async function loadAfterSaleableItems(currentOrderId) {
  if (submitting.value || submitted.value || !currentOrderId) return
  const revision = ++loadRevision
  loading.value = true
  loadError.value = ''
  try {
    const items = await getAfterSaleableItems(currentOrderId)
    if (revision !== loadRevision) return
    afterSaleItems.value = items.filter(item => item.availableQuantity > 0)
    Object.keys(quantities).forEach(key => delete quantities[key])
    afterSaleItems.value.forEach(item => { quantities[item.orderItemId] = 0 })
  } catch (error) {
    if (revision !== loadRevision) return
    afterSaleItems.value = []
    loadError.value = error?.message || t('order.afterSale.loadFailed')
  } finally {
    if (revision === loadRevision) loading.value = false
  }
}

/** 勾选或取消单个 SKU，其他已选商品及数量保留。 */
function selectGoods(item) {
  if (!item || submitting.value || submitted.value) return
  quantities[item.orderItemId] = quantities[item.orderItemId] > 0 ? 0 : item.availableQuantity
}

/** 数量规范为该 SKU 可申请范围内的整数。 */
function setQuantity(raw, item = afterSaleItems.value[0]) {
  if (!item || submitting.value || submitted.value) return
  quantities[item.orderItemId] = Math.min(item.availableQuantity, Math.max(1, Math.floor(Number(raw) || 1)))
}

/** 全选使用各行可申请数量，清空时不修改申请原因。 */
function toggleAll() {
  if (submitting.value || submitted.value) return
  const clear = allSelected.value
  afterSaleItems.value.forEach(item => { quantities[item.orderItemId] = clear ? 0 : item.availableQuantity })
}

/** 固定本次提交快照；失败重试复用请求号，成功后锁住按钮并打开新单详情。 */
async function handleSubmit() {
  if (submitting.value || submitted.value || !canSubmit.value) return
  const payload = { orderId: Number(orderId.value), afterSaleType: form.type,
    reason: form.reason.trim(), expressNo: form.expressNo.trim(), items: selectedLines.value.map(item => ({ ...item })) }
  const fingerprint = JSON.stringify(payload)
  if (fingerprint !== requestFingerprint.value) {
    requestFingerprint.value = fingerprint
    clientRequestId.value = 'after-sale-' + orderId.value + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
  }
  submitting.value = true
  try {
    const result = await applyAfterSale({ ...payload, clientRequestId: clientRequestId.value })
    if (pageDisposed) return
    submitted.value = true
    uni.showToast({ title: t('order.afterSale.submitted'), icon: 'success' })
    successRedirectTimer = setTimeout(() => navigator.redirectTo(result?.afterSaleId ? routes.order.afterSaleDetail(result.afterSaleId) : routes.order.afterSaleList()), 500)
  } catch (error) {
    if (pageDisposed) return
    uni.showToast({ title: error?.message || t('order.afterSale.submitFailed'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.apply-after-sale-page { min-width: 0; }
.order-context { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding: 13px 16px; border: 1px solid #F0E1E3; border-radius: 14px; background: #FFF9FA; color: #777D86; font-size: 12px; }
.order-number { min-width: 0; overflow-wrap: anywhere; color: #30363E; font-weight: 650; text-align: right; }
.section-card { padding: 16px; margin-bottom: 12px; border-radius: 16px; background: var(--surface-card, #fff); }
.section-heading, .selection-summary, .refund-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.section-label { display: block; min-width: 0; font-size: 15px; font-weight: 650; line-height: 1.5; }
.section-note { display: block; margin-top: 5px; color: var(--text-secondary, #737A84); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.text-button { flex-shrink: 0; margin: 0; padding: 6px 0 6px 8px; background: transparent; color: #D7192D; font-size: 12px; line-height: 1.5; }
button::after { border: 0; }
.selection-summary { margin-top: 12px; padding-top: 10px; border-top: 1px solid #EEF0F2; font-size: 12px; color: #737A84; }
.goods-row { display: flex; gap: 10px; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid #EEF0F2; }
.goods-row:last-child { border-bottom: 0; padding-bottom: 0; }
.check-button { display: flex; flex: 0 0 24px; width: 24px; height: 24px; align-items: center; justify-content: center; margin: 17px 0 0; padding: 0; border: 1px solid #DDE0E4; border-radius: 50%; background: #fff; }
.check-button.checked { background: #D7192D; border-color: #D7192D; }
.goods-image { flex: 0 0 64px; width: 64px; height: 64px; border-radius: 10px; overflow: hidden; }
.goods-info { min-width: 0; flex: 1; }
.goods-name { display: block; font-size: 14px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
.sku-name { display: block; margin-top: 4px; font-size: 12px; color: #737A84; overflow-wrap: anywhere; }
.goods-info .quantity-stepper { margin-top: 10px; }
.type-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; padding: 12px; border: 1px solid #F0D9DD; border-radius: 12px; background: #FFF8F9; line-height: 1.5; }
.type-copy { min-width: 0; flex: 1; }
.type-name { font-size: 14px; font-weight: 600; }
.reason-input { display: block; width: 100%; min-height: 100px; margin-top: 12px; padding: 12px; box-sizing: border-box; border-radius: 10px; background: #F6F7F9; font-size: 14px; line-height: 1.6; }
.character-count { display: block; margin-top: 6px; text-align: right; color: #969AA3; font-size: 11px; }
.refund-row { font-size: 14px; }
.refund-value { min-width: 0; color: #D7192D; font-size: 22px; font-weight: 700; }
.submit-btn { display: flex; min-height: 46px; width: 100%; margin: 0; padding: 11px 16px; align-items: center; justify-content: center; border-radius: 12px; background: #D7192D; color: #fff; font-size: 15px; font-weight: 600; line-height: 1.5; white-space: normal; }
.submit-btn[disabled] { background: #E9EAED; color: #969AA3; }
.express-input { width:100%; height:44px; margin-top:12px; padding:0 12px; box-sizing:border-box; border-radius:10px; background:#F6F8FA; color:#3F4C5C; font-size:14px; }
</style>
