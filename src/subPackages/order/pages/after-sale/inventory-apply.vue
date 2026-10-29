<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('order.afterSale.inventoryApply.title')" :show-back="true" /></template>
    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 34px">
        <view class="apply-page">
          <AppPageState
            :state="pageState"
            :title="t('order.afterSale.inventoryApply.loadFailed')"
            :description="loadError"
            :action-text="t('common.retry')"
            @retry="loadData"
            @action="loadData"
          >
            <template #default>
              <view class="card product-card">
                <AppProductImage class="product-image" :src="detail.imageUrl" mode="aspectFill" />
                <view class="product-copy">
                  <text class="product-name">{{ detail.productName }}</text>
                  <text class="sku-name">{{ detail.skuName || `SKU ${detail.skuId}` }}</text>
                  <text class="available">{{ t('order.afterSale.inventoryApply.available') }} {{ formatQty(detail.availableQuantity) }} {{ detail.unit }}</text>
                </view>
              </view>

              <view class="card section-card">
                <text class="section-title">{{ t('order.afterSale.inventoryApply.warehouse') }}</text>
                <view v-if="selectedWarehouse" class="option-row">
                  <view class="option-copy"><text>{{ selectedWarehouse.warehouseName }}</text><text>{{ selectedWarehouse.warehouseCode }}</text></view>
                  <text class="option-qty">{{ t('order.afterSale.inventoryApply.available') }} {{ formatQty(selectedWarehouse.availableQuantity) }}</text>
                </view>
                <text v-else class="empty-note">{{ t('order.afterSale.inventoryApply.noAvailableStock') }}</text>
              </view>

              <view class="card section-card">
                <view class="row-heading"><text class="section-title">{{ t('order.afterSale.inventoryApply.quantity') }}</text><text class="hint">{{ t('order.afterSale.inventoryApply.quantityHint', { max: selectedWarehouse?.availableQuantity || 0 }) }}</text></view>
                <view class="quantity-control">
                  <button class="step-button" :disabled="form.quantity <= 1" @tap="changeQuantity(-1)">−</button>
                  <input class="quantity-input" type="number" :value="form.quantity" :disabled="!selectedWarehouse" @input="updateQuantity" />
                  <button class="step-button" :disabled="!selectedWarehouse || form.quantity >= selectedWarehouse.availableQuantity" @tap="changeQuantity(1)">＋</button>
                </view>
              </view>

              <view class="card section-card">
                <text class="section-title">{{ t('order.afterSale.inventoryApply.refundAccount') }}</text>
                <picker v-if="accounts.length" :range="accounts" range-key="label" :value="selectedAccountIndex" @change="selectAccount">
                  <view class="picker-row"><text :class="{ placeholder: !selectedAccount }">{{ selectedAccount?.label || t('order.afterSale.inventoryApply.chooseAccount') }}</text><AppIcon name="chevron-right" :size="15" color="#969BA3" /></view>
                </picker>
                <text v-else class="empty-note">{{ t('order.afterSale.inventoryApply.noAccount') }}</text>
              </view>

              <view class="card section-card">
                <text class="section-title">{{ t('order.afterSale.inventoryApply.reason') }}</text>
                <textarea v-model="form.reason" class="reason-input" maxlength="500" :placeholder="t('order.afterSale.inventoryApply.reasonPlaceholder')" />
                <text class="counter">{{ form.reason.length }}/500</text>
              </view>

              <view class="notice">{{ t('order.afterSale.inventoryApply.notice') }}</view>
              <button class="submit-button" :disabled="!canSubmit" :loading="submitting" @tap="submit">{{ t('order.afterSale.inventoryApply.submit') }}</button>
            </template>
          </AppPageState>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/order/i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { getDealerInventoryReturnOptions } from '@/shared/api/dealerInventoryReturnOptions.js'
import { getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { applyInventoryAfterSale } from '@/shared/api/afterSale.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

let successRedirectTimer = null
let pageDisposed = false
onUnload(() => { pageDisposed = true; if (successRedirectTimer) clearTimeout(successRedirectTimer) })
const skuId = ref(0)
const detail = ref(null)
const accounts = ref([])
const warehouses = ref([])
const pageState = ref(PageStatus.LOADING)
const loadError = ref('')
const submitting = ref(false)
const submitted = ref(false)
const clientRequestId = ref('')
const requestFingerprint = ref('')
const form = reactive({ warehouseId: 0, quantity: 1, refundAccountId: 0, reason: '' })
const selectedWarehouse = computed(() => warehouses.value.find(item => item.warehouseId === form.warehouseId) || null)
const selectedAccountIndex = computed(() => Math.max(0, accounts.value.findIndex(item => item.accountId === form.refundAccountId)))
const selectedAccount = computed(() => accounts.value.find(item => item.accountId === form.refundAccountId) || null)
const canSubmit = computed(() => !submitting.value && !submitted.value && Boolean(skuId.value && selectedWarehouse.value && selectedAccount.value && form.quantity > 0 && form.quantity <= selectedWarehouse.value.availableQuantity && form.reason.trim()))

onLoad(options => {
  skuId.value = Number(options?.skuId || 0)
  loadData()
})

/** Load the selected SKU warehouses and eligible refund accounts. */
async function loadData() {
  if (!skuId.value) {
    loadError.value = t('order.afterSale.inventoryApply.invalidSku')
    pageState.value = PageStatus.ERROR
    return
  }
  pageState.value = PageStatus.LOADING
  loadError.value = ''
  try {
    const [inventory, finance] = await Promise.all([getDealerInventoryReturnOptions(skuId.value), getDealerFinanceContext()])
    if (!inventory) throw new Error(t('order.afterSale.inventoryApply.invalidSku'))
    detail.value = inventory
    warehouses.value = inventory.warehouses.filter(item => item.warehouseId > 0 && item.availableQuantity > 0)
    if (!warehouses.value.some(item => item.warehouseId === form.warehouseId)) {
      form.warehouseId = warehouses.value[0]?.warehouseId || 0
      form.quantity = 1
    }
    accounts.value = finance.accounts
      .filter(item => item.accountId > 0 && item.accountStatus === 1 && item.financeStatus === 1)
      .filter((item, index, all) => all.findIndex(candidate => candidate.accountId === item.accountId) === index)
      .map(item => ({ ...item, label: [item.realName || item.username, item.fundAccountCode].filter(Boolean).join(' · ') || String(item.accountId) }))
    if (!accounts.value.some(item => item.accountId === form.refundAccountId)) form.refundAccountId = accounts.value[0]?.accountId || 0
    pageState.value = PageStatus.CONTENT
  } catch (error) {
    loadError.value = error?.message || t('order.afterSale.inventoryApply.loadFailed')
    pageState.value = PageStatus.ERROR
  }
}

/** Keep the requested quantity as a positive integer within the selected warehouse. */
function updateQuantity(event) {
  const maximum = selectedWarehouse.value?.availableQuantity || 1
  form.quantity = Math.min(maximum, Math.max(1, Math.floor(Number(event?.detail?.value) || 1)))
}
/** Increment or decrement quantity without crossing available stock. */
function changeQuantity(delta) {
  const maximum = selectedWarehouse.value?.availableQuantity || 1
  form.quantity = Math.min(maximum, Math.max(1, form.quantity + delta))
}
/** Select a finance account returned for the current dealer. */
function selectAccount(event) {
  const account = accounts.value[Number(event?.detail?.value)]
  if (account) form.refundAccountId = account.accountId
}
/** Submit a stable payload with a reusable idempotency key for network retries. */
async function submit() {
  if (!canSubmit.value) return
  const payload = {
    refundAccountId: form.refundAccountId,
    reason: form.reason.trim(),
    items: [{ warehouseId: form.warehouseId, skuId: skuId.value, quantity: form.quantity }],
  }
  const fingerprint = JSON.stringify(payload)
  if (fingerprint !== requestFingerprint.value) {
    requestFingerprint.value = fingerprint
    clientRequestId.value = `inventory-after-sale-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
  submitting.value = true
  try {
    const result = await applyInventoryAfterSale({ ...payload, clientRequestId: clientRequestId.value })
    if (pageDisposed) return
    submitted.value = true
    uni.showToast({ title: t('order.afterSale.inventoryApply.submitted'), icon: 'success' })
    successRedirectTimer = setTimeout(() => navigator.redirectTo(result?.afterSaleId ? routes.order.afterSaleDetail(result.afterSaleId) : routes.order.afterSaleList()), 450)
  } catch (error) {
    if (pageDisposed) return
    uni.showToast({ title: error?.message || t('order.afterSale.inventoryApply.submitFailed'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}
/** Format inventory quantities without unnecessary decimal places. */
function formatQty(value) { return Number(value || 0).toLocaleString('zh-CN') }
</script>

<style lang="scss" scoped>
.apply-page { width: 100%; max-width: 760px; margin: 0 auto; padding-bottom: 20px; }
.card { margin-bottom: 12px; border-radius: 16px; background: var(--surface-card, #fff); box-shadow: 0 8px 24px rgba(35,45,60,.05); }
.product-card { display: flex; align-items: center; gap: 13px; padding: 14px; }
.product-image { flex: 0 0 76px; width: 76px; height: 84px; border-radius: 11px; overflow: hidden; }
.product-copy { min-width: 0; }
.product-name,.sku-name,.available { display: block; }
.product-name { color: #252A31; font-size: 15px; font-weight: 650; line-height: 1.45; }
.sku-name { margin-top: 5px; color: #858B94; font-size: 12px; }
.available { margin-top: 9px; color: #28724F; font-size: 12px; font-weight: 600; }
.section-card { padding: 16px; }
.section-title { display: block; color: #282E35; font-size: 14px; font-weight: 650; }
.option-row { display: flex; min-height: 58px; align-items: center; gap: 10px; padding: 8px 2px; border-bottom: 1px solid #F0F1F3; }
.option-row:last-child { border-bottom: 0; }
.option-copy { min-width: 0; flex: 1; }
.option-copy text { display: block; overflow: hidden; color: #323840; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.option-copy text + text { margin-top: 3px; color: #9398A0; font-size: 10px; }
.option-qty,.hint { color: #858B94; font-size: 11px; }
.empty-note { display: block; margin-top: 9px; color: #969BA3; font-size: 12px; }
.row-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.quantity-control { display: flex; width: 148px; height: 38px; align-items: center; margin-top: 12px; border: 1px solid #E7E9EC; border-radius: 10px; overflow: hidden; }
.step-button { display: flex; width: 40px; height: 38px; align-items: center; justify-content: center; margin: 0; padding: 0; border-radius: 0; background: #F7F8F9; color: #454B53; font-size: 18px; line-height: 1; }
.quantity-input { min-width: 0; flex: 1; text-align: center; color: #252A31; font-size: 15px; }
.picker-row { display: flex; min-height: 42px; align-items: center; justify-content: space-between; gap: 10px; margin-top: 6px; color: #353B43; font-size: 13px; }
.placeholder { color: #9A9FA7; }
.reason-input { display: block; width: 100%; min-height: 92px; box-sizing: border-box; margin-top: 10px; padding: 11px; border-radius: 10px; background: #F6F7F8; color: #333941; font-size: 13px; line-height: 1.6; }
.counter { display: block; margin-top: 5px; color: #9A9FA7; font-size: 10px; text-align: right; }
.notice { margin: 2px 4px 12px; color: #858B94; font-size: 11px; line-height: 1.6; }
.submit-button { display: flex; width: 100%; min-height: 46px; align-items: center; justify-content: center; margin: 0; padding: 10px 14px; border-radius: 12px; background: #D7192D; color: #fff; font-size: 15px; font-weight: 650; line-height: 1.5; }
.submit-button[disabled] { background: #E8EAED; color: #969BA3; }
button::after { border: 0; }
</style>
