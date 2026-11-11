<!--
  付款页面（分包：paySub）
  对应业务流程节点：
  购物车&确认订单 → 独立收银台选择支付方式并完成支付
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('order.titles.pay')" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="pay-page">
          <!-- 支付金额与付款时限 -->
          <view class="amount-section">
            <text class="pay-label">{{ payMode === PAYMENT_MODE.CREDIT ? t('order.pay.creditAmount') : t('order.pay.amountDue') }}</text>
            <AmountText class="amount" :text="hasCheckoutSnapshot || !checkoutBatchId ? '¥' + Number(payAmount || 0).toFixed(2) : '—'" />
            <view v-if="checkoutBatchId">
              <view v-for="member in checkoutOrders" :key="member.orderId" class="checkout-member">
                <view class="checkout-member-copy">
                  <text class="checkout-member-number">{{ member.orderNo }}</text>
                  <text v-if="member.warehouseCode" class="checkout-member-warehouse">{{ member.warehouseCode }}</text>
                </view>
                <AmountText class="checkout-member-amount" :text="'¥' + Number(member.payableAmount).toFixed(2)" />
              </view>
              <view v-if="!orderPayable" class="checkout-status" role="status">
                <view class="checkout-status-copy" :class="{ 'is-retry': canRetryCheckout }"
                  :role="canRetryCheckout ? 'button' : undefined" :tabindex="canRetryCheckout ? 0 : undefined"
                  @tap="canRetryCheckout && refreshCheckout()"
                  @keydown.enter.prevent="canRetryCheckout && refreshCheckout()"
                  @keydown.space.prevent="canRetryCheckout && refreshCheckout()">
                  <text>{{ t(batchConfirming ? 'order.pay.checkoutConfirming' : batchStatusKey) }}</text>
                  <view v-if="batchConfirming" class="checkout-confirming-dots" aria-hidden="true"><text>.</text><text>.</text><text>.</text></view>
                </view>

              </view>
            </view>
            <text v-else class="order-no">{{ t('order.pay.orderNo') }} {{ orderNo }}</text>
            <view v-if="confirmationPending" class="deadline-panel">
              <view class="deadline-copy">
                <text class="deadline-label">{{ t('order.pay.confirmationPending') }}</text>
                <text class="deadline-note">{{ t('order.pay.confirmationNote') }}</text>
              </view>
              <AppIcon name="info" :size="18" color="#667085" />
            </view>
            <view v-else-if="!paymentExpired && remainTime > 0" class="deadline-panel">
              <view class="deadline-copy">
                <text class="deadline-label">{{ t('order.pay.timeRemaining') }}</text>
                <text class="deadline-note">{{ t('order.pay.timeoutNote') }}</text>
              </view>
              <text class="deadline-time">{{ formatRemainTime }}</text>
            </view>
            <view v-else-if="paymentExpired" class="deadline-panel is-expired">
              <view class="deadline-copy">
                <text class="deadline-label">{{ t('order.pay.paymentEnded') }}</text>
                <text class="deadline-note">{{ t('order.pay.paymentEndedNote') }}</text>
              </view>
              <AppIcon name="warning" :size="18" color="#B42318" />
            </view>
          </view>

          <view class="pay-methods mode-panel">
            <view class="method-title">{{ t('order.pay.chooseMethod') }}</view>
            <text class="method-tip">{{ t('order.pay.methodEffective') }}</text>
            <button
              v-for="method in paymentModeOptions"
              :key="method.value"
              class="payment-mode-option"
              :class="{ active: payMode === method.value, disabled: method.disabled }"
              :disabled="method.disabled || paying || paymentExpired || !orderPayable"
              @click="selectPaymentMode(method)"
            >
              <view class="mode-icon"><AppIcon :name="method.icon" :size="24" use-original-color /></view>
              <view class="mode-copy">
                <text>{{ method.label }}</text>
                <text>{{ method.description }}</text>
              </view>
              <view class="mode-radio"><text v-if="payMode === method.value">✓</text></view>
            </button>
          </view>

          <view v-if="payMode === PAYMENT_MODE.CASH" class="pay-methods channel-panel">
            <view class="method-title">{{ t('order.pay.onlineChannel') }}</view>
            <text class="method-tip">{{ t('order.pay.channelTip') }}</text>
            <button
              v-for="channel in cashPaymentMethods"
              :key="channel.key"
              class="payment-mode-option channel-option"
              :class="{ active: payType === channel.key }"
              :disabled="paying || paymentExpired || !orderPayable"
              @click="payType = channel.key"
            >
              <view class="mode-icon"><AppIcon :name="channel.icon" :size="24" use-original-color /></view>
              <view class="mode-copy">
                <text>{{ channel.label }}</text>
                <text>{{ channel.description }}</text>
              </view>
              <view class="mode-radio"><text v-if="payType === channel.key">✓</text></view>
            </button>
          </view>

          <!-- 授信赊账信息 -->
          <view class="credit-info" v-if="payMode === 2">
            <view class="credit-card-display">
              <view class="credit-header">
                <text class="credit-title">{{ t('order.pay.creditAccount') }}</text>
                <text v-if="userStore.creditLevel" class="credit-level">{{ userStore.creditLevel }}</text>
              </view>
              <view class="credit-rows">
            <view class="credit-row">
                <text class="cr-label">{{ t('order.pay.creditAmountLabel') }}</text>
                <AmountText class="cr-value primary" :text="hasCheckoutSnapshot || !checkoutBatchId ? '¥' + Number(payAmount || 0).toFixed(2) : '—'" />
              </view>
              <view class="credit-row">
                <text class="cr-label">{{ t('order.pay.availableCredit') }}</text>
                <AmountText class="cr-value" :text="'¥' + (availableCreditAmount.toFixed(2))" />
              </view>
              <view class="credit-row">
                <text class="cr-label">{{ t('order.pay.remainingCredit') }}</text>
                <AmountText class="cr-value warn" :text="'¥' + (Math.max(0, availableCreditAmount - Number(payAmount || 0)).toFixed(2))" />
              </view>
              </view>
              <view class="credit-tips">
                <AppIcon name="info" :size="14" color="#999" />
                <text>{{ t('order.pay.creditTip') }}</text>
              </view>
            </view>
          </view>

          <view v-if="payMode === PAYMENT_MODE.CASH" class="channel-notice">
            <AppIcon name="info" :size="16" color="#B76500" />
            <text>{{ t('order.pay.cashUnavailableNotice') }}</text>
          </view>

          <view class="pay-methods" v-if="payMode === PAYMENT_MODE.COMBINATION">
            <view class="method-title">{{ t('order.pay.balanceAllocation') }}</view>
            <view
              v-for="account in availableAccounts"
              :key="account.accountCustomerId"
              class="balance-source"
              :class="{ 'is-unavailable': !canFundOrder(account) }"
              @tap="toggleAccount(account)"
            >
              <checkbox :checked="isSelected(account)" :disabled="!canFundOrder(account)" color="#D7192D" />
              <view class="source-copy">
                <text>{{ account.isMaster ? t('order.pay.masterAccount') : (account.realName || account.username) }}</text>
                <AmountText :text="t('order.pay.availableBalance', { amount: Number(account.availableBalance || 0).toFixed(2) })" />
              </view>
              <input :placeholder-style="$inputPlaceholderStyle"
                v-if="isSelected(account)"
                class="source-input"
                type="digit"
                :value="allocationAmounts[account.accountCustomerId]"
                placeholder="0.00"
                @tap.stop
                @input="setAllocation(account, $event.detail.value)"
              />
            </view>
            <text v-if="!hasSufficientBalance" class="balance-notice">{{ t('order.pay.noSufficientBalance') }}</text>
            <view class="allocation-summary">
              <AmountText :text="t('order.pay.allocated', { amount: allocationTotal.toFixed(2) })" />
              <AmountText :text="t('order.pay.payable', { amount: Number(payAmount || 0).toFixed(2) })" />
            </view>
          </view>

          <!-- 底部占位 -->
          <view class="bottom-space" />
        </view>
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar>
        <button
          class="confirm-pay-btn"
          :disabled="paying || !orderPayable || paymentExpired || (payMode === PAYMENT_MODE.CASH && !cashPaymentAvailable) || (payMode === PAYMENT_MODE.COMBINATION && !hasSufficientBalance)"
          @click="handleConfirmPay"
        >
          {{ confirmButtonText }}
        </button>
      </FixedActionBar>
    </template>
    <template #overlay>
      <ConfirmPopup v-model="nativeQrVisible" :title="t('order.pay.qrTitle')" :show-cancel="false" :show-confirm="false">
        <view class="order-qr-content">
          <text class="order-qr-label">{{ t('order.pay.amountDue') }}</text>
          <AmountText class="order-qr-amount" :text="'¥' + Number(qrState.intent?.amount || payAmount).toFixed(2)" />
          <text class="order-qr-number">{{ checkoutBatchId ? t('order.pay.qrBatch') : orderNo }}</text>
          <text class="order-qr-hint" role="status">{{ qrStatusText }}</text>
          <view v-if="qrMatrix.length" class="order-qr-code" :aria-label="t('order.pay.qrTitle')">
            <view v-for="(row, rowIndex) in qrMatrix" :key="rowIndex" class="order-qr-row">
              <view v-for="(dark, columnIndex) in row" :key="columnIndex" class="order-qr-cell" :class="{ dark }" />
            </view>
          </view>
          <view v-if="qrState.phase === 'paid'" class="order-qr-success"><AppIcon name="check" :size="40" color="#168A52" /></view>
          <text v-if="qrState.error" class="order-qr-error" role="alert">{{ qrErrorText }}</text>
          <AppButton v-if="qrState.phase === 'closed' || (qrState.phase === 'error' && !qrState.intent?.rechargeNo)" block @tap="retryOrderQr">{{ t('order.pay.qrRetry') }}</AppButton>
          <AppButton v-else-if="!['creating','confirming','paid'].includes(qrState.phase)" block :loading="qrChecking" @tap="checkOrderQr">{{ t(qrState.phase === 'confirm-error' ? 'order.pay.qrConfirmRetry' : 'order.pay.qrCheck') }}</AppButton>
          <AppButton block variant="ghost" @tap="nativeQrVisible = false">{{ t('order.pay.qrClose') }}</AppButton>
          <text class="order-qr-footnote">{{ t('order.pay.qrCloseHint') }}</text>
        </view>
      </ConfirmPopup>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/order/i18n/register.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { ref, computed, watch, onUnmounted } from 'vue'
import { onHide, onLoad, onShow } from '@dcloudio/uni-app'
import { getOrderDetail } from '../../api/orderApi.js'
import { parseUtcToLocal } from '../../../../shared/utils/format.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { ERP_REVIEW_STATUS, PAYMENT_MODE, ORDER_STATUS, PAYMENT_STATUS } from '@/app/config/constant.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { confirmCheckoutPayment, confirmDealerOrderPayment, getCheckoutPayment, getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { AppError, ErrorKind } from '@/shared/api/appError.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import { createQrMatrix } from '@/shared/utils/qrMatrix.js'
import { createNativeRecharge, getRechargeStatus } from '@/shared/api/dealerFinance.js'
import { createOrderQrPayment } from '../../model/orderQrPayment.js'

const userStore = useUserStore()

const orderId = ref(null)
const orderNo = ref('')
const checkoutBatchId = ref(null)
const checkoutOrders = ref([])
const batchPaid = ref(false)
const loadingBatch = ref(false)
const hasCheckoutSnapshot = ref(false)
let checkoutReadPromise = null
let checkoutReadAgain = false
let paidResult = null
let paidRedirected = false
let checkoutDisposed = false
const checkoutPaymentKeys = new Map()
const payMode = ref(PAYMENT_MODE.COMBINATION)     // 默认使用单一余额账户支付
const payAmount = ref(0)    // 单位：元（后端返回元）
// 在线支付在当前收银台展示微信扫码，不跳转充值页。
const payType = ref('wechat_native')
const paying = ref(false)
const remainTime = ref(0)   // 剩余时间（秒）
const paymentExpired = ref(false)
const confirmationPending = ref(false)
const finance = ref({ credit: {}, accounts: [] })
const cashPaymentAvailable = true


const nativeQrVisible = ref(false)
const qrState = ref({ phase: 'idle', intent: null, error: '' })
const qrChecking = ref(false)
let qrPayment = null
let qrPollTimer = null
let qrPollCount = 0
const qrMatrix = computed(() => {
  // 倒计时让后台返回和二维码有效期同步刷新；过期码只查询原单，不新建第二笔。
  void remainTime.value
  const intent = qrState.value.intent
  if (!intent?.codeUrl || !['pending','unknown'].includes(qrState.value.phase)) return []
  if (intent.expiresAtUtc && parseUtcToLocal(intent.expiresAtUtc).getTime() <= Date.now()) return []
  try { return createQrMatrix(intent.codeUrl) } catch { return [] }
})
const qrStatusText = computed(() => {
  const phase = qrState.value.phase
  if (phase === 'creating') return t('order.pay.qrCreating')
  if (phase === 'confirming') return t('order.pay.qrConfirming')
  if (phase === 'paid') return t('order.pay.paid')
  if (phase === 'confirm-error') return t('order.pay.qrConfirmFailed')
  if (phase === 'closed') return t('order.pay.qrClosed')
  return t(qrMatrix.value.length ? 'order.pay.qrScan' : 'order.pay.qrPending')
})
const qrErrorText = computed(() => {
  const key = { PAYMENT_FACT_MISMATCH: 'qrFactMismatch', PAYMENT_CONTEXT_CHANGED: 'qrContextChanged' }[qrState.value.error]
  return key ? t('order.pay.' + key) : qrState.value.error
})
watch([nativeQrVisible, () => qrState.value.phase], syncQrPolling)
watch(() => userStore.token, () => { qrPayment?.dispose(); qrPayment = null; nativeQrVisible.value = false; clearTimeout(qrPollTimer) })

/** 页面可见且弹层待确认时有限轮询；关闭、离页和终态立即停止。 */
function syncQrPolling() {
  clearTimeout(qrPollTimer)
  if (!checkoutVisible || !nativeQrVisible.value || qrPollCount >= 120 || !['pending','unknown'].includes(qrState.value.phase)) return
  qrPollTimer = setTimeout(async () => { qrPollCount++; await qrPayment?.check(); syncQrPolling() }, 3000)
}
/** 使用已建账的当前账户显式编码，不把空编码带到充值页再猜账户。 */
async function openOrderQr() {
  const context = await getDealerFinanceContext()
  const account = context.currentAccount
  if (!account?.accountId || account.accountStatus !== 1 || account.financeStatus !== 1
    || !account.fundAccountCode || !account.canParticipateCombinationPay) throw localError('qrAccountUnavailable')
  finance.value = context
  if (!qrPayment) {
    const token = userStore.token
    const owner = context.dealerId + ':' + account.accountCustomerId
    const target = checkoutBatchId.value ? 'batch:' + checkoutBatchId.value : 'order:' + orderId.value
    const key = 'order-native-payment:' + owner + ':' + target
    qrPayment = createOrderQrPayment({
      storage: { get: () => uni.getStorageSync(key) || null, set: value => uni.setStorageSync(key, value), remove: () => uni.removeStorageSync(key) },
      createIntent: createNativeRecharge, readStatus: getRechargeStatus,
      isCurrent: () => userStore.token === token,
      onChange: value => { qrState.value = value },
      onPaid: result => handlePaid(result),
      confirmOrder: intent => submitPayment({
        orderId: orderId.value, clientRequestId: 'order-qr-confirm-' + intent.rechargeNo,
        paymentMode: PAYMENT_MODE.COMBINATION, fundAccountCode: intent.fundAccountCode,
        allocations: [{ payMethod: 'balance', accountCustomerId: intent.accountCustomerId, amount: Number(intent.amount) }],
      }),
    })
  }
  qrPollCount = 0
  nativeQrVisible.value = true
  await qrPayment.open({ amount: Number(payAmount.value), fundAccountCode: account.fundAccountCode, accountCustomerId: account.accountCustomerId })
}
/** 弹层重试仍保留错误提示，不制造未处理Promise。 */
async function retryOrderQr() { try { await openOrderQr() } catch (error) { uni.showToast({ title: error?.message || t('order.pay.failed'), icon: 'none' }) } }
/** 手动查询和失败重试均复用同一到账单及订单确认幂等键。 */
async function checkOrderQr() {
  if (qrChecking.value) return
  qrChecking.value = true
  try { await qrPayment?.check() } finally { qrChecking.value = false }
}

const selectedAccountIds = ref([])
const allocationAmounts = ref({})
const orderPayable = ref(false)
let checkoutRefreshTimer = null
let checkoutRefreshAttempts = 0
const checkoutConfirmationTimedOut = ref(false)
let checkoutConfirmationDeadline = 0
let checkoutConfirmationTimer = null
let checkoutConfirmationVersion = 0
let checkoutVisible = true
let countdownTimer = null
let expireHandled = false
let serverTimeOffsetMs = 0
let paymentExpiryAtMs = Number.NaN

/** 将十五分钟付款时限格式化为移动端易读的“分:秒”。 */
const formatRemainTime = computed(() => {
  if (remainTime.value <= 0) return '00:00'
  const m = Math.floor(remainTime.value / 60)
  const s = remainTime.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
const availableAccounts = computed(() => (finance.value.accounts || []).filter(item =>
  item.accountStatus === 1 && item.financeStatus === 1 && item.canParticipateCombinationPay,
))
const hasSufficientBalance = computed(() => availableAccounts.value.some(account => canFundOrder(account)))
const batchErpRejected = computed(() => checkoutOrders.value.some(order => order.cancelledForErpRejection))
const batchStatusKey = computed(() => {
  if (batchPaid.value) return 'order.pay.paid'
  if (!hasCheckoutSnapshot.value && loadingBatch.value) return 'common.loading'
  if (batchErpRejected.value) return 'order.pay.stockInsufficientCancelled'
  if (checkoutOrders.value.some(order => order.isPaymentExpired)) return 'order.pay.paymentEnded'
  if (checkoutConfirmationTimedOut.value) return 'order.pay.checkoutConfirmationTimeout'
  if (checkoutOrders.value.some(order => order.hasActivePayment)) return 'order.pay.confirmationPending'
  if (checkoutOrders.value.some(order => !order.erpReady && order.erpPending)) return 'order.pay.batchErpPending'
  if (checkoutOrders.value.some(order => order.erpReady === false)) return 'order.pay.batchErpUnavailable'
  return 'order.pay.checkoutUnavailable'
})
const batchConfirming = computed(() => !orderPayable.value && !checkoutConfirmationTimedOut.value && [
  'common.loading', 'order.pay.batchErpPending', 'order.pay.batchErpUnavailable', 'order.pay.confirmationPending',
].includes(batchStatusKey.value))
const canRetryCheckout = computed(() => !batchConfirming.value && !batchPaid.value && !batchErpRejected.value
  && !loadingBatch.value && batchStatusKey.value !== 'order.pay.paymentEnded')
const allocationTotal = computed(() => selectedAccountIds.value.reduce(
  (sum, id) => sum + Number(allocationAmounts.value[id] || 0), 0,
))
const availableCreditAmount = computed(() => Math.max(0, Number(finance.value.credit?.availableAmount || 0)))
const paymentModeOptions = computed(() => [
  { value: PAYMENT_MODE.CASH, label: t('order.pay.cash'), description: t('order.pay.cashDescription'), icon: 'pay-cash', disabled: !cashPaymentAvailable },
  { value: PAYMENT_MODE.CREDIT, label: t('order.pay.credit'), description: t('order.pay.creditDescription'), icon: 'pay-credit', disabled: Number(finance.value.credit?.status) !== 1 },
  { value: PAYMENT_MODE.COMBINATION, label: t('order.pay.balance'), description: t('order.pay.balanceDescription'), icon: 'pay-combine', disabled: false },
])
const cashPaymentMethods = computed(() => [
  { key: 'wechat_native', label: t('order.pay.wechatNative'), description: t('order.pay.wechatNativeDescription'), icon: 'pay-wechat' },
  { key: 'wechat', label: t('order.pay.wechat'), description: t('order.pay.wechatDescription'), icon: 'pay-wechat' },
  { key: 'alipay', label: t('order.pay.alipay'), description: t('order.pay.alipayDescription'), icon: 'pay-alipay' },
].filter(channel => channel.key === 'wechat_native'))
const confirmButtonText = computed(() => {
  if (paying.value) return t('order.pay.paying')
  if (paymentExpired.value) return t('order.pay.paymentEnded')
  if (payMode.value === PAYMENT_MODE.CASH && !cashPaymentAvailable) return t('order.pay.cashUnavailable')
  return payMode.value === PAYMENT_MODE.CREDIT ? t('order.pay.confirmCredit') : t('order.pay.confirm')
})
onLoad(async (options) => {
  orderId.value = Number(options.orderId) || null
  checkoutBatchId.value = Number(options.checkoutBatchId) || null
  if (checkoutBatchId.value) {
    startCheckoutConfirmation()
    await Promise.all([loadCheckoutInfo(), loadFinanceContext()])
    return
  }

  // 从订单详情获取实际金额
  if (orderId.value) {
    await loadOrderInfo()
    if (orderPayable.value) await loadFinanceContext()
  }
})

onShow(() => {
  checkoutVisible = true
  if (paidResult || qrState.value.phase === 'paid') { handlePaid(paidResult || qrState.value.paymentResult); return }
  if (nativeQrVisible.value && qrPayment) { qrPayment.check().then(syncQrPolling); return }
  if (checkoutBatchId.value && !paying.value) resumeCheckoutConfirmation()
  else if (orderId.value && !paying.value) loadOrderInfo()

})

onHide(() => {
  checkoutVisible = false
  clearTimeout(checkoutConfirmationTimer)
  checkoutReadAgain = false
  clearTimeout(qrPollTimer)
  clearTimeout(checkoutRefreshTimer)
})

onUnmounted(() => {
  checkoutDisposed = true
  clearTimeout(qrPollTimer)
  qrPayment?.dispose()
  checkoutVisible = false
  clearTimeout(checkoutConfirmationTimer)
  clearTimeout(checkoutRefreshTimer)
  if (countdownTimer) clearInterval(countdownTimer)
})

/**
 * 使用后端校准后的本地时钟刷新倒计时，避免应用切到后台后定时器暂停导致时间漂移。
 */
function startCountdown() {
  if (countdownTimer || paymentExpired.value) return
  countdownTimer = setInterval(() => {
    remainTime.value = Math.max(0, Math.ceil(
      (paymentExpiryAtMs - (Date.now() + serverTimeOffsetMs)) / 1000,
    ))
    if (remainTime.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
      handlePaymentExpired()
    }
  }, 1000)
}

async function handlePaymentExpired() {
  paymentExpired.value = true
  if (expireHandled) return
  expireHandled = true
  const confirmed = await openAppDialog({
    title: t('order.pay.expiredTitle'),
    description: t('order.pay.expiredContent'),
    showCancel: false,
  })
  if (confirmed) navigator.redirectTo(routes.order.detail(orderId.value))
}

/**
 * 订单已离开待付款状态时停止支付，并引导用户查看后端最终状态。
 */
async function handlePaymentUnavailable(reasonKey = 'order.pay.unavailableContent') {
  orderPayable.value = false
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  const confirmed = await openAppDialog({
    title: t('order.pay.unavailableTitle'),
    description: t(reasonKey),
    showCancel: false,
  })
  if (confirmed) navigator.redirectTo(routes.order.detail(orderId.value))
}

function syncPaymentCountdown(order) {
  const reviewStatus = Number(order.erpReviewStatus)
  confirmationPending.value = reviewStatus === ERP_REVIEW_STATUS.PENDING
  const explicitExpiryAt = order.paymentExpiresAt ? parseUtcToLocal(order.paymentExpiresAt).getTime() : Number.NaN
  const createdAt = order.createdAt ? parseUtcToLocal(order.createdAt).getTime() : Number.NaN
  if (Number.isNaN(explicitExpiryAt) && reviewStatus !== ERP_REVIEW_STATUS.LEGACY_UNTRACKED) {
    paymentExpiryAtMs = Number.NaN
    remainTime.value = 0
    paymentExpired.value = false
    return
  }
  paymentExpiryAtMs = Number.isNaN(explicitExpiryAt) ? createdAt + 15 * 60 * 1000 : explicitExpiryAt
  if (Number.isNaN(paymentExpiryAtMs)) return
  const serverAt = order.serverTime ? parseUtcToLocal(order.serverTime).getTime() : Number.NaN
  if (!Number.isNaN(serverAt)) serverTimeOffsetMs = serverAt - Date.now()
  remainTime.value = Math.max(0, Math.ceil((paymentExpiryAtMs - (Date.now() + serverTimeOffsetMs)) / 1000))
  if (remainTime.value <= 0) {
    handlePaymentExpired()
  } else {
    startCountdown()
  }
}

/**
 * 加载订单信息（获取支付金额和订单号）
 */
async function loadOrderInfo() {
  try {
    const res = await getOrderDetail(orderId.value)
    if (checkoutDisposed || paidResult) return
    if (Number(res.paymentStatus) === PAYMENT_STATUS.CONFIRMED) { handlePaid({ orderId: orderId.value }); return }
    orderNo.value = res.orderNo || ''
    payAmount.value = Number(res.payableAmount || 0)
    const canPay = Number(res.orderStatus) === ORDER_STATUS.PENDING_PAYMENT
      && [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.FAILED].includes(Number(res.paymentStatus))
      && Array.isArray(res.allowedActions)
      && res.allowedActions.includes('pay')
    if (!canPay) {
      handlePaymentUnavailable(res.cancellationReasonCode === 'ERP_CREATE_REJECTED'
        ? 'order.pay.stockInsufficientCancelled'
        : 'order.pay.unavailableContent')
      return
    }
    orderPayable.value = true
    syncPaymentCountdown(res)
  } catch (e) {
    console.error('加载订单信息失败:', e)
    uni.showToast({ title: e.message || t('order.pay.loadOrderFailed'), icon: 'none' })
  }
}

/** 从批次快照恢复所有主单。未就绪时保持禁止支付。 */
/** 手动刷新或重新进入页面时重启有限的批次状态检查。 */
function refreshCheckout() {
  startCheckoutConfirmation()
  if (checkoutReadPromise) { checkoutReadAgain = true; return checkoutReadPromise }
  return loadCheckoutInfo()
}

/** 每次主动重试开启独立的30秒确认窗口，不重建订单或重复提交支付。 */
function startCheckoutConfirmation() {
  clearTimeout(checkoutConfirmationTimer)
  clearTimeout(checkoutRefreshTimer)
  checkoutRefreshAttempts = 0
  checkoutConfirmationVersion++
  checkoutConfirmationTimedOut.value = false
  checkoutConfirmationDeadline = Date.now() + 30000
  checkoutConfirmationTimer = setTimeout(expireCheckoutConfirmation, 30000)
}

/** 超时只代表本次等待结束，不把业务订单标记失败。 */
function expireCheckoutConfirmation() {
  clearTimeout(checkoutRefreshTimer)
  clearTimeout(checkoutConfirmationTimer)
  checkoutReadAgain = false
  if (checkoutDisposed || orderPayable.value || batchPaid.value || batchErpRejected.value
    || checkoutOrders.value.some(order => order.isPaymentExpired)) return
  checkoutConfirmationTimedOut.value = true
  checkoutReadPromise = null
  loadingBatch.value = false
}

/** 后台时间也计入30秒，回到页面不悄悄开启新的等待窗口。 */
function resumeCheckoutConfirmation() {
  if (checkoutConfirmationTimedOut.value) return
  if (!checkoutConfirmationDeadline || orderPayable.value) startCheckoutConfirmation()
  else if (Date.now() >= checkoutConfirmationDeadline) { expireCheckoutConfirmation(); return }
  else {
    clearTimeout(checkoutConfirmationTimer)
    checkoutConfirmationTimer = setTimeout(expireCheckoutConfirmation, checkoutConfirmationDeadline - Date.now())
  }
  if (checkoutReadPromise) { checkoutReadAgain = true; return checkoutReadPromise }
  return loadCheckoutInfo()
}

/** 为可能恢复的批次状态安排下一次只读查询。 */
function scheduleCheckoutRefresh(retryRead = false) {
  if (!checkoutVisible || paying.value || orderPayable.value || batchPaid.value || batchErpRejected.value || checkoutConfirmationTimedOut.value) return
  if (batchStatusKey.value === 'order.pay.paymentEnded') return
  const waiting = ['order.pay.batchErpPending', 'order.pay.batchErpUnavailable', 'order.pay.confirmationPending']
  if (!retryRead && !waiting.includes(batchStatusKey.value)) return
  const delay = Math.min(1000 * 2 ** Math.floor(checkoutRefreshAttempts / 3), 5000)
  if (Date.now() >= checkoutConfirmationDeadline) { expireCheckoutConfirmation(); return }
  checkoutRefreshAttempts++
  checkoutRefreshTimer = setTimeout(() => loadCheckoutInfo(true), delay)
}

/** 读取批次实时状态和服务端应付金额。 */
function loadCheckoutInfo(background = false) {
  if (checkoutConfirmationTimedOut.value || checkoutDisposed) return Promise.resolve()
  if (checkoutReadPromise) return checkoutReadPromise
  const pending = readCheckoutInfo(background).finally(() => {
    if (checkoutReadPromise !== pending) return
    checkoutReadPromise = null
    if (checkoutReadAgain && checkoutVisible && !checkoutDisposed && !paidResult) {
      checkoutReadAgain = false
      return loadCheckoutInfo(true)
    }
  })
  checkoutReadPromise = pending
  return pending
}

/** 单次读取只接受当前页面尚未确认付款的服务端快照。 */
async function readCheckoutInfo(background) {
  const version = checkoutConfirmationVersion
  clearTimeout(checkoutRefreshTimer)
  loadingBatch.value = true
  orderPayable.value = false
  let retryRead = false
  try {
    const result = await getCheckoutPayment(checkoutBatchId.value)
    if (checkoutDisposed || paidResult || checkoutConfirmationTimedOut.value || version !== checkoutConfirmationVersion) return
    hasCheckoutSnapshot.value = true
    checkoutOrders.value = (result.orders ?? result.Orders ?? []).map(order => ({
      orderId: order.orderId ?? order.OrderId,
      orderNo: order.orderNo ?? order.OrderNo,
      warehouseCode: order.warehouseCode ?? order.WarehouseCode,
      payableAmount: order.payableAmount ?? order.PayableAmount,
      erpReady: order.erpReady ?? order.ErpReady,
      erpPending: order.erpPending ?? order.ErpPending,
      cancelledForErpRejection: order.cancelledForErpRejection ?? order.CancelledForErpRejection,
      isPaymentExpired: order.isPaymentExpired ?? order.IsPaymentExpired,
      hasActivePayment: order.hasActivePayment ?? order.HasActivePayment,
      isPaid: order.isPaid ?? order.IsPaid,
    }))
    payAmount.value = Number(result.totalPayable ?? result.TotalPayable ?? 0)
    batchPaid.value = Boolean(result.isPaid ?? result.IsPaid)
    orderPayable.value = Boolean(result.canPay ?? result.CanPay) && !batchPaid.value && !batchErpRejected.value
    if (batchPaid.value) { handlePaid(result); return }
    if (payMode.value === PAYMENT_MODE.COMBINATION) autoAllocate()
  } catch (error) {
    if (checkoutDisposed || checkoutConfirmationTimedOut.value || version !== checkoutConfirmationVersion) return
    retryRead = true
    if (!background) uni.showToast({ title: error?.message || t('order.pay.loadOrderFailed'), icon: 'none' })
  } finally {
    if (version === checkoutConfirmationVersion) loadingBatch.value = false
    if (version === checkoutConfirmationVersion && (orderPayable.value || batchPaid.value || batchErpRejected.value || checkoutOrders.value.some(order => order.isPaymentExpired))) {
      clearTimeout(checkoutConfirmationTimer)
    }
    if (version === checkoutConfirmationVersion) scheduleCheckoutRefresh(retryRead)
  }
}

/** 单订单仍走原入口，批次支付按同一资金来源和金额复用请求编号。 */
function submitPayment(params) {
  if (!checkoutBatchId.value) return confirmDealerOrderPayment(params)
  const allocation = params.allocations[0]
  const signature = JSON.stringify([params.paymentMode, params.fundAccountCode || null, allocation])
  if (!checkoutPaymentKeys.has(signature)) {
    checkoutPaymentKeys.set(signature, `checkout-${checkoutBatchId.value}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
  }
  return confirmCheckoutPayment({
    ...params, allocation, checkoutBatchId: checkoutBatchId.value,
    clientRequestId: params.clientRequestId?.startsWith('order-qr-confirm-') ? params.clientRequestId : checkoutPaymentKeys.get(signature),
  })
}

async function loadFinanceContext() {
  try {
    finance.value = await getDealerFinanceContext()
    if (payMode.value === PAYMENT_MODE.COMBINATION) autoAllocate()
  } catch (error) {
    console.error('加载收银台资金信息失败:', error)
    uni.showToast({ title: error?.message || t('order.pay.financeLoadFailed'), icon: 'none' })
  }
}

async function selectPaymentMode(method) {
  if (method.disabled || paying.value || paymentExpired.value || !orderPayable.value) return
  payMode.value = method.value
  if (method.value === PAYMENT_MODE.CREDIT || method.value === PAYMENT_MODE.COMBINATION) {
    await loadFinanceContext()
  }
}

/**
 * 确认支付/赊账
 * 授信与账户余额走内部确定性支付；现款支付等待外部支付渠道回调。
 */
async function handleConfirmPay() {
  if (!orderPayable.value) {
    handlePaymentUnavailable()
    return
  }
  if (paymentExpired.value || (!checkoutBatchId.value && !confirmationPending.value && remainTime.value <= 0)) {
    handlePaymentExpired()
    return
  }
  paying.value = true

  try {
    if (payMode.value === PAYMENT_MODE.CREDIT) {
      if (Number(finance.value.credit?.status) !== 1) throw localError('creditUnavailable')
      const result = await submitPayment({
        orderId: orderId.value,
        clientRequestId: `credit-pay-${orderId.value}-${Date.now()}`,
        paymentMode: PAYMENT_MODE.CREDIT,
        fundAccountCode: finance.value.credit?.fundAccountCode || null,
        allocations: [{ payMethod: 'credit', accountCustomerId: null, amount: payAmount.value }],
      })
      return handlePaid(result)
    }
    if (payMode.value === PAYMENT_MODE.COMBINATION) {
      if (selectedAccountIds.value.length === 0) throw localError('accountRequired')
      for (const id of selectedAccountIds.value) {
        const account = availableAccounts.value.find(item => item.accountCustomerId === id)
        const amount = Number(allocationAmounts.value[id])
        if (!account) throw localError('accountUnavailable')
        if (!Number.isFinite(amount) || amount <= 0) throw localError('amountRequired')
        if (amount - Number(account.availableBalance || 0) > 0.005) {
          throw new AppError('', ErrorKind.UNKNOWN, { messageKey: 'order.pay.exceedsBalance', messageParameters: { name: account.isMaster ? t('order.pay.masterAccount') : (account.realName || account.username) } })
        }
      }
      if (Math.abs(allocationTotal.value - Number(payAmount.value)) >= 0.005) {
        throw localError('totalMismatch')
      }
      const result = await submitPayment({
        orderId: orderId.value,
        clientRequestId: `balance-pay-${orderId.value}-${Date.now()}`,
        paymentMode: PAYMENT_MODE.COMBINATION,
        fundAccountCode: checkoutBatchId.value ? finance.value.currentAccount?.fundAccountCode || null : null,
        allocations: selectedAccountIds.value.map(id => ({
          payMethod: 'balance',
          accountCustomerId: Number(id),
          amount: Number(allocationAmounts.value[id] || 0),
        })),
      })
      return handlePaid(result)
    }
    if (payMode.value === PAYMENT_MODE.CASH) {
      await openOrderQr()
      return
    }
    throw localError('cashIntegration')
  } catch (e) {
    console.error('支付失败:', e)
    uni.showToast({ title: e.message || t('order.pay.failed'), icon: 'none' })
  } finally {
    paying.value = false
  }
}

function isSelected(account) { return selectedAccountIds.value.includes(account.accountCustomerId) }
function setAllocation(account, value) {
  allocationAmounts.value = { ...allocationAmounts.value, [account.accountCustomerId]: value }
}
/** 单一账户必须能覆盖整笔应付金额，才可选为付款来源。 */
function canFundOrder(account) {
  return Number(payAmount.value) > 0 && Number(account.availableBalance || 0) >= Number(payAmount.value)
}
function toggleAccount(account) {
  if (!orderPayable.value || paying.value || paymentExpired.value || !canFundOrder(account)) return
  const id = account.accountCustomerId
  if (isSelected(account)) {
    selectedAccountIds.value = selectedAccountIds.value.filter(item => item !== id)
    const next = { ...allocationAmounts.value }; delete next[id]; allocationAmounts.value = next
    return
  }
  // 当前后端规则是单一资金账户；切换账户时替换原选择，避免前端提交组合分摊。
  selectedAccountIds.value = [id]
  allocationAmounts.value = { [id]: Number(payAmount.value).toFixed(2) }
}
function autoAllocate() {
  selectedAccountIds.value = []
  allocationAmounts.value = {}
  const amount = Number(payAmount.value)
  const account = availableAccounts.value.find(canFundOrder)
  if (!account) return
  selectedAccountIds.value = [account.accountCustomerId]
  allocationAmounts.value[account.accountCustomerId] = amount.toFixed(2)
}
/** 仅接受订单确认响应或已付款快照；立即停止收银并打开本次订单详情。 */
function handlePaid(result) {
  if (checkoutDisposed || paidRedirected) return
  paidResult = result || paidResult || {}
  batchPaid.value = true
  orderPayable.value = false
  nativeQrVisible.value = false
  checkoutReadAgain = false
  clearTimeout(checkoutRefreshTimer)
  clearTimeout(checkoutConfirmationTimer)
  clearTimeout(qrPollTimer)
  clearInterval(countdownTimer)
  countdownTimer = null
  if (!checkoutVisible) return
  const members = paidResult.orders ?? paidResult.Orders ?? checkoutOrders.value
  const targetId = paidResult.orderId ?? paidResult.OrderId ?? members[0]?.orderId ?? members[0]?.OrderId ?? orderId.value
  if (!targetId) return
  paidRedirected = true
  uni.showToast({ title: t('order.pay.paid'), icon: 'success' })
  Promise.resolve(navigator.redirectTo(routes.order.detail(targetId)))
    .then(success => { if (success === false) paidRedirected = false })
    .catch(() => { paidRedirected = false })
}

/** 创建支付页本地校验错误，使用 messageKey 让已存在页面随语言切换重新取词。 */
function localError(key, messageParameters = {}) {
  return new AppError('', ErrorKind.UNKNOWN, { messageKey: 'order.pay.' + key, messageParameters })
}
</script>

<style lang="scss" scoped>
@import "./presentation.scss";
</style>
