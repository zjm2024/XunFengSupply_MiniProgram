<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('account.titles.recharge')" :show-back="true" />
    </template>

    <template #content>
      <AppContent width-mode="standard" padding="12px var(--page-padding-x, 16px) 30px">
        <view class="recharge-page">
          <view v-if="rechargeOrderId || rechargeCheckoutBatchId" class="service-card order-recharge-context">
            <text class="section-title">{{ t('account.recharge.orderTopUp') }}</text>
            <text class="section-desc">{{ t('account.recharge.orderTopUpHint') }}</text>
            <AppButton v-if="confirmedRechargeNo" block @tap="continueOrderPayment">{{ t('account.recharge.continueOrder') }}</AppButton>
          </view>
          <view v-if="pendingRechargeNo" class="service-card order-recharge-context" role="status">
            <text class="section-title">{{ t(pendingRechargeStatus === 0 ? 'account.recharge.awaitingPayment' : 'account.recharge.confirmingPayment') }}</text>
            <text class="section-desc">{{ t('account.recharge.progressHint') }}</text>
            <AppButton size="sm" variant="secondary" :loading="checkingRecharge" :disabled="checkingRecharge" @tap="checkRechargeResult()">{{ t('account.recharge.checkProgress') }}</AppButton>
          </view>
          <view class="service-card">
            <view class="section-head">
              <text class="balance-label">{{ t('account.recharge.availableBalance') }}</text>
              <view class="records-entry"><AppButton size="sm" variant="ghost" @tap="goToRecords"><text>{{ t('account.recharge.records') }}</text><AppIcon name="chevron-right" :size="14" /></AppButton></view>
            </view>

            <view class="recharge-balance">
              <AmountText class="recharge-balance-value" :text="money(finance?.currentAccount?.availableBalance)" />
            </view>

            <view class="recharge-form">
              <text class="form-label">{{ t('account.recharge.amount') }}</text>
              <view class="amount-input-wrap">
                <text class="amount-prefix">¥</text>
                <input :placeholder-style="$inputPlaceholderStyle"
                  v-model="rechargeAmount"
                  class="amount-input"
                  type="digit"
                  :placeholder="t('account.recharge.amountPlaceholder')"
                  placeholder-class="amount-placeholder"

                  :disabled="submitting"
                  @input="handleAmountChanged"
                />
              </view>
              <view class="quick-amounts">
                <button
                  v-for="amount in quickAmounts"
                  :key="amount"
                  class="quick-amount"
                  :class="{ active: rechargeAmount === String(amount) }"
                  :disabled="submitting"
                  @tap="selectQuickAmount(amount)"
                >¥{{ amount.toLocaleString('zh-CN') }}</button>
              </view>
            </view>
            <view class="channel-picker">
              <view
                v-for="channel in visiblePaymentChannels"
                :key="channel.key"
                class="channel-card"
                :class="{ selected: selectedChannel === channel.key, disabled: channel.disabled }"
                hover-class="channel-card--pressed"
                @tap="selectPaymentChannel(channel)"
              >
                <view class="channel-icon" :style="{ color: channel.color }"><AppIcon :name="channel.icon" :size="24" :color="channel.color" :use-original-color="channel.useOriginalColor" /></view>
                <view class="channel-copy">
                  <view class="channel-title-row">
                    <text class="channel-title">{{ channel.title }}</text>
                  </view>
                </view>
                <view v-if="!channel.disabled" class="channel-check">{{ selectedChannel === channel.key ? '✓' : '' }}</view>
              </view>
            </view>
            <AppButton block :loading="submitting" :disabled="submitting" @tap="startRecharge">
              <AppIcon :name="selectedPaymentChannel.icon" :size="18" color="#FFFFFF" />
              <text>{{ rechargeButtonText }}</text>
            </AppButton>
            <view class="service-note"><AppIcon name="info" :size="15" /><text>{{ paymentSupportHint }}</text></view>
          </view>
        </view>
      </AppContent>
    </template>
    <template #overlay>
      <ConfirmPopup v-model="nativeQrVisible" :title="t('account.recharge.qrTitle')" :show-cancel="false" :show-confirm="false">
        <view class="native-qr-content">
          <text class="finance-meta">{{ t('account.recharge.amount') }}</text>
          <AmountText class="native-qr-amount" :text="money(nativeQrAmount)" />
          <text class="native-qr-number">{{ t('account.recharge.qrNumber', { number: nativeQrNumber }) }}</text>
      <view v-if="nativeQrStatus === 2" class="native-qr-result" role="status">
        <view class="native-qr-success"><AppIcon name="check" :size="40" color="#168A52" /></view>
        <text class="native-qr-result-title">{{ t('account.recharge.successTitle') }}</text>
        <text class="native-qr-result-hint">{{ t('account.recharge.creditedHint') }}</text>
      </view>
      <view v-else-if="[3, 4].includes(nativeQrStatus)" class="native-qr-result" role="status">
        <text class="native-qr-result-title">{{ t('account.recharge.closedTitle') }}</text>
        <text class="native-qr-result-hint">{{ t('account.recharge.closedHint') }}</text>
      </view>
      <text v-else class="native-qr-hint">{{ t(nativeQrExpired ? 'account.recharge.qrExpired' : 'account.recharge.qrHint') }}</text>
      <text v-if="nativeQrCountdown && ![2, 3, 4].includes(nativeQrStatus)" class="native-qr-hint">{{ t('account.recharge.qrRemaining', { time: nativeQrCountdown }) }}</text>
      <view v-if="![2, 3, 4].includes(nativeQrStatus) && !nativeQrExpired" class="native-qr-code">
        <view v-for="(row, rowIndex) in nativeQrMatrix" :key="rowIndex" class="native-qr-row">
          <view v-for="(dark, columnIndex) in row" :key="columnIndex" class="native-qr-cell" :class="{ dark }" />
        </view>
      </view>
      <AppButton v-if="![2, 3, 4].includes(nativeQrStatus) && !nativeQrExpired" block variant="secondary" @tap="copyNativeQrLink">{{ t('account.recharge.qrCopyLink') }}</AppButton>
      <AppButton v-if="![2, 3, 4].includes(nativeQrStatus)" block :loading="checkingRecharge" :disabled="checkingRecharge" @tap="checkRechargeResult()">{{ t(checkingRecharge ? 'account.recharge.checking' : 'account.recharge.checkPaid') }}</AppButton>
      <AppButton block variant="ghost" @tap="closeNativeQr">{{ t('account.recharge.qrClose') }}</AppButton>

        </view>
      </ConfirmPopup>
    </template>
  </AppPageShell>


</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import { formatFinanceAmount as money } from '../../model/financeDisplay.js'
import { computed, ref, watch, onScopeDispose } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { createAppRecharge, createNativeRecharge, getRechargeStatus, getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'
import { createQrMatrix } from '@/shared/utils/qrMatrix.js'
import { createRechargeRealtime } from '@/subPackages/account/services/rechargeRealtime.js'
import { registerSessionCleanup, unregisterSessionCleanup } from '@/shared/session/sessionCleanup.js'

const userStore = useUserStore()
const finance = ref(userStore.financeContext)
const quickAmounts = Object.freeze([100, 500, 1000, 2000])
const paymentChannels = Object.freeze([
  { key: 'wechat', /** 渠道名称按当前语言显示。 */ get title() { return t('account.recharge.wechat') }, icon: 'pay-wechat', color: '#1AAD19', provider: 'wxpay', useOriginalColor: true, /** 渠道说明按当前语言显示。 */ get description() { return t('account.recharge.wechatHint') } },
  { key: 'wechat_native', /** 渠道名称按当前语言显示。 */ get title() { return t('account.recharge.wechatNative') }, icon: 'pay-wechat', color: '#1AAD19', useOriginalColor: true, native: true, /** 渠道说明按当前语言显示。 */ get description() { return t('account.recharge.wechatNativeHint') } },
  { key: 'alipay', /** 渠道名称按当前语言显示。 */ get title() { return t('account.recharge.alipay') }, icon: 'pay-alipay', color: '#1677FF', provider: 'alipay', useOriginalColor: true, /** 渠道说明按当前语言显示。 */ get description() { return t('account.recharge.alipayHint') } },
  { key: 'abc_cashier', /** 渠道名称按当前语言显示。 */ get title() { return t('account.recharge.bank') }, icon: 'bank', color: '#8A9098', provider: null, useOriginalColor: false, disabled: true, /** 渠道说明按当前语言显示。 */ get description() { return t('account.recharge.bankHint') } },
])
// 汇报演示只展示微信网页扫码入口，保留其余渠道实现以便后续恢复。
const visiblePaymentChannels = computed(() => paymentChannels.filter(channel => channel.key === 'wechat_native'))
const rechargeAmount = ref('')
const submitting = ref(false)
const selectedChannel = ref('wechat_native')
const availableProviders = ref(null)
const pendingClientRequestId = ref('')
const pendingRequestAmount = ref('')
const pendingRequestChannel = ref('wechat')
const pendingOrderId = ref(null)
const pendingRechargeStorageKey = 'finance:pending-app-recharge'
const rechargeOrderId = ref(null)
const rechargeCheckoutBatchId = ref(null)
const rechargeAccountCode = ref(null)
const pendingStorageKey = computed(() => {
  if (rechargeCheckoutBatchId.value) {
    return `${pendingRechargeStorageKey}:checkout:${rechargeCheckoutBatchId.value}:${rechargeAccountCode.value || 'default'}`
  }
  return rechargeOrderId.value
    ? `${pendingRechargeStorageKey}:order:${rechargeOrderId.value}` : pendingRechargeStorageKey
})
const nativeQrVisible = ref(false)
const nativeQrLink = ref('')
const nativeQrNumber = ref('')
const nativeQrAmount = ref('')
const nativeQrMatrix = ref([])
const nativeQrStatus = ref(0)
const nativeQrExpiresAt = ref('')
const nativeQrNow = ref(Date.now())
const nativeQrSeconds = computed(() => {
  const expires = Date.parse(nativeQrExpiresAt.value)
  return Number.isFinite(expires) ? Math.max(0, Math.ceil((expires - nativeQrNow.value) / 1000)) : null
})
const nativeQrExpired = computed(() => nativeQrSeconds.value === 0)
const nativeQrCountdown = computed(() => nativeQrSeconds.value === null ? ''
  : String(Math.floor(nativeQrSeconds.value / 60)).padStart(2, '0') + ':' + String(nativeQrSeconds.value % 60).padStart(2, '0'))
let nativeQrTimer = null
let nativeQrExpiryChecked = ''
const pendingRechargeNo = ref('')
const pendingRechargeStatus = ref(5)
const checkingRecharge = ref(false)
const confirmedRechargeNo = ref('')
const lastFinalRecharge = ref(null)
let rechargeCheckPromise = null
let pageVisible = true
let successNoticePending = false
const rechargeRealtime = createRechargeRealtime({
  getToken: () => userStore.token,
  refresh: () => checkRechargeResult({ silent: true, afterCurrent: true }),
})

/** 可见待支付页独占实时连接，终态、退出账号及页面隐藏立即释放。 */
function syncRechargeRealtime() {
  if (pageVisible && pendingRechargeNo.value && userStore.token) rechargeRealtime.start(pendingRechargeNo.value)
  else rechargeRealtime.stop()
}
const rechargeCleanupKey = 'finance-recharge-' + Date.now() + '-' + Math.random().toString(36).slice(2)
/** 统一退出会话钩子主动关闭缓存页连接，并清除该页所有待支付显示上下文。 */
function resetRechargeSession() {
  stopNativeQrClock()
  rechargeRealtime.stop()
  nativeQrVisible.value = false
  nativeQrMatrix.value = []
  nativeQrLink.value = ''
  nativeQrAmount.value = ''
  successNoticePending = false
  clearPendingRequest()
}
registerSessionCleanup(rechargeCleanupKey, resetRechargeSession)
onScopeDispose(() => { stopNativeQrClock(); rechargeRealtime.stop(); unregisterSessionCleanup(rechargeCleanupKey) })
watch(() => pendingRechargeNo.value, syncRechargeRealtime)
watch(() => [userStore.token, userStore.userId], ([token, userId], previous) => {
  if (!token || (previous?.[1] && previous[1] !== userId)) {
    resetRechargeSession()
  } else syncRechargeRealtime()
}, { flush: 'sync' })

const selectedPaymentChannel = computed(() => paymentChannels.find(item => item.key === selectedChannel.value) || paymentChannels[0])
const rechargeButtonText = computed(() => submitting.value
  ? t('account.recharge.starting', { channel: selectedPaymentChannel.value.title })
  : t('account.recharge.start', { channel: selectedPaymentChannel.value.title }))
const paymentSupportHint = computed(() => {
  if (selectedPaymentChannel.value.native) return t('account.recharge.wechatNativeHint')
  if (availableProviders.value && !availableProviders.value[selectedChannel.value]) {
    return t('account.recharge.unsupportedHint', { channel: selectedPaymentChannel.value.title })
  }
  return t('account.recharge.balanceHint')
})

/** 路由只提供本地订单ID；ERP单号由后端校验，充值成功不自动扣款。 */
onLoad((options = {}) => {
  const id = Number(options.orderId)
  const batchId = Number(options.checkoutBatchId)
  rechargeCheckoutBatchId.value = Number.isSafeInteger(batchId) && batchId > 0 ? batchId : null
  rechargeOrderId.value = !rechargeCheckoutBatchId.value && Number.isSafeInteger(id) && id > 0 ? id : null
  if (rechargeOrderId.value || rechargeCheckoutBatchId.value) {
    rechargeAccountCode.value = String(options.fundAccountCode || '') || null
    if (Number(options.amount) > 0) rechargeAmount.value = Number(options.amount).toFixed(2)
  }
  if (visiblePaymentChannels.value.some(item => item.key === options.channel && !item.disabled)) selectedChannel.value = options.channel
  else selectedChannel.value = 'wechat_native'
})

/** 继续订单收银台，扣款仍需用户确认并由后端重新检查订单状态。 */
function continueOrderPayment() {
  if (rechargeCheckoutBatchId.value) navigator.redirectTo(routes.order.checkoutPay(rechargeCheckoutBatchId.value))
  else if (rechargeOrderId.value) navigator.redirectTo(routes.order.pay(rechargeOrderId.value))
}

onShow(() => {
  pageVisible = true
  if (nativeQrVisible.value) startNativeQrClock()
  if (successNoticePending) announceRechargeSuccess()
  loadFinance()
  restorePendingRequest()
  checkPaymentAvailability()
  if (pendingRechargeNo.value) checkRechargeResult({ silent: true })
  syncRechargeRealtime()
})
onHide(() => { stopNativeQrClock(); pageVisible = false; rechargeRealtime.stop() })
onUnload(() => { stopNativeQrClock(); pageVisible = false; rechargeRealtime.stop() })

async function loadFinance() {
  try {
    const context = await getDealerFinanceContext()
    finance.value = context
    userStore.updateFinanceContext(context)
  } catch (error) {
    console.error('[Recharge] 加载财务上下文失败:', error)
  }
}

function contactFinance() {
  navigator.navigateTo(routes.content.help())
}

/** 恢复尚未确认的本地幂等键，避免网络中断后重复创建充值单。 */
function restorePendingRequest() {
  const pending = uni.getStorageSync(pendingStorageKey.value)
  if (!pending || !pending.clientRequestId
    || (pending.userId && pending.userId !== String(userStore.userId || ''))
    || (pending.dealerId && pending.dealerId !== String(userStore.dealerId || ''))) {
    uni.removeStorageSync(pendingStorageKey.value)
    return
  }
  pendingClientRequestId.value = String(pending.clientRequestId || '')
  pendingRequestAmount.value = String(pending.amount || '')
  pendingRequestChannel.value = String(pending.channel || 'wechat')
  pendingOrderId.value = pending.orderId || null
  pendingRechargeNo.value = String(pending.rechargeNo || '')
  pendingRechargeStatus.value = Number(pending.status ?? 5)
  if (visiblePaymentChannels.value.some(item => item.key === pendingRequestChannel.value && !item.disabled)) {
    selectedChannel.value = pendingRequestChannel.value
  }
  if (!rechargeAmount.value && pendingRequestAmount.value) rechargeAmount.value = pendingRequestAmount.value
}

/** 检查当前 App 安装包是否编入各支付能力；H5 和未配置包不允许伪装可支付。 */
function checkPaymentAvailability() {
  if (typeof plus === 'undefined') {
    availableProviders.value = { wechat: false, wechat_native: true, alipay: false }
    return
  }
  uni.getProvider({
    service: 'payment',
    success: result => {
      const providers = Array.isArray(result.provider) ? result.provider : []
      availableProviders.value = { wechat: providers.includes('wxpay'), wechat_native: true, alipay: providers.includes('alipay') }
    },
    fail: () => { availableProviders.value = { wechat: false, wechat_native: true, alipay: false } },
  })
}

/** 选择支付渠道；银行收银台等未启用渠道只展示规划状态，不发起请求。 */
function selectPaymentChannel(channel) {
  if (channel.disabled || submitting.value || !visiblePaymentChannels.value.some(item => item.key === channel.key)) return
  if (selectedChannel.value !== channel.key) clearPendingRequest()
  selectedChannel.value = channel.key
}

/** 金额变化时废弃旧幂等键，避免同一个客户端请求标识对应不同金额。 */
function handleAmountChanged() {
  if (pendingRequestAmount.value && rechargeAmount.value !== pendingRequestAmount.value) clearPendingRequest()
}

/** 使用快捷金额并执行与手动输入相同的幂等键保护。 */
function selectQuickAmount(amount) {
  rechargeAmount.value = String(amount)
  handleAmountChanged()
}

/** 创建或复用稳定的客户端请求标识，并持久化短时间的未确认支付上下文。 */
function ensureClientRequestId(amount, channel) {
  if (pendingClientRequestId.value
    && pendingRequestAmount.value === amount
    && pendingRequestChannel.value === channel
    && pendingOrderId.value === rechargeOrderId.value) return pendingClientRequestId.value
  pendingClientRequestId.value = `app-${channel}-recharge-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  pendingRequestAmount.value = amount
  pendingRequestChannel.value = channel
  pendingOrderId.value = rechargeOrderId.value
  uni.setStorageSync(pendingStorageKey.value, {
    clientRequestId: pendingClientRequestId.value,
    userId: String(userStore.userId || ''), dealerId: String(userStore.dealerId || ''),
    amount,
    channel,
    orderId: rechargeOrderId.value,
    createdAt: Date.now(),
  })
  return pendingClientRequestId.value
}

/** 清理已不再可复用的本地充值幂等上下文。 */
function clearPendingRequest() {
  pendingClientRequestId.value = ''
  pendingRequestAmount.value = ''
  pendingRechargeNo.value = ''
  uni.removeStorageSync(pendingStorageKey.value)
}

/** 保存服务端单号，恢复页面时只读查询此单，不重复调用创建接口。 */
function rememberRecharge(response) {
  if (!response.rechargeNo) return
  pendingRechargeStatus.value = Number(response.status ?? 5)
  pendingRechargeNo.value = String(response.rechargeNo)
  const existing = uni.getStorageSync(pendingStorageKey.value) || {}
  uni.setStorageSync(pendingStorageKey.value, {
    ...existing, userId: String(userStore.userId || ''), dealerId: String(userStore.dealerId || ''), rechargeNo: pendingRechargeNo.value, clientRequestId: pendingClientRequestId.value,
    amount: pendingRequestAmount.value, channel: pendingRequestChannel.value, status: pendingRechargeStatus.value, createdAt: existing.createdAt || Date.now(),
  })
}

/** 使用服务端已提交状态更新界面；支付SDK回调本身不能确认到账。 */
function applyRechargeResult(response) {
  pendingRechargeStatus.value = Number(response.status ?? 5)
  const number = String(response.rechargeNo || pendingRechargeNo.value || '')
  if (response.status === 2) {
    lastFinalRecharge.value = { rechargeNo: number, status: response.status }
    if (nativeQrNumber.value === number) {
      nativeQrStatus.value = 2
      stopNativeQrClock()
      nativeQrMatrix.value = []
      nativeQrLink.value = ''
    }
    clearPendingRequest()
    if (confirmedRechargeNo.value !== number || !number) {
      confirmedRechargeNo.value = number
      announceRechargeSuccess()
    }
  } else if ([3, 4].includes(response.status)) {
    lastFinalRecharge.value = { rechargeNo: number, status: response.status }
    if (nativeQrNumber.value === number) {
      nativeQrStatus.value = response.status
      stopNativeQrClock()
      nativeQrMatrix.value = []
      nativeQrLink.value = ''
    }
    clearPendingRequest()
  }
}

/** 后台确认的成功提示留到页面可见时显示，避免从支付工具返回前被吞掉。 */
function announceRechargeSuccess() {
  successNoticePending = true
  if (!pageVisible) return
  successNoticePending = false
  uni.showToast({ title: t('account.recharge.successTitle'), icon: 'success' })
}

/** 手动、推送及回到前台均只读本地事实；推送到达在途查询时追加一次读取以覆盖提交竞态。 */
function checkRechargeResult({ silent = false, afterCurrent = false } = {}) {
  if (rechargeCheckPromise) return afterCurrent
    ? rechargeCheckPromise.then(() => checkRechargeResult({ silent })) : rechargeCheckPromise
  const rechargeNo = pendingRechargeNo.value
  const statusToken = userStore.token
  if (!rechargeNo) return Promise.resolve(null)
  checkingRecharge.value = true
  rechargeCheckPromise = (async () => {
    try {
      const response = await getRechargeStatus(rechargeNo)
      if (pendingRechargeNo.value !== rechargeNo || userStore.token !== statusToken) return null
      if (String(response.rechargeNo) !== rechargeNo) throw new Error(t('account.recharge.checkFailed'))
      applyRechargeResult(response)
      if (response.status === 2) await loadFinance()
      else if (!silent && pageVisible) uni.showToast({ title: t([3, 4].includes(response.status) ? 'account.recharge.closedTitle' : 'account.recharge.stillPending'), icon: 'none' })
      return response.status
    } catch (error) {
      if (!silent && pageVisible) uni.showToast({ title: error?.message || t('account.recharge.checkFailed'), icon: 'none' })
      return null
    } finally {
      checkingRecharge.value = false
      rechargeCheckPromise = null
    }
  })()
  return rechargeCheckPromise
}

/** 校验并解析后端生成的 APP 微信支付参数，拒绝客户端自行拼装签名数据。 */
function parseWeChatPayOrderInfo(clientPayload) {
  let payload = clientPayload
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch (_) {
      throw new Error(t('account.recharge.wechatFormat'))
    }
  }
  const requiredKeys = ['appid', 'partnerid', 'prepayid', 'package', 'noncestr', 'timestamp', 'sign']
  if (!payload || typeof payload !== 'object' || requiredKeys.some(key => !payload[key])) {
    throw new Error(t('account.recharge.wechatMissing'))
  }
  return payload
}

/** 封装原生调起；成功只表示客户端流程返回成功，不代表服务端已经入账。 */
function requestPayment(channel, orderInfo) {
  return new Promise((resolve, reject) => {
    uni.requestPayment({ provider: channel === 'alipay' ? 'alipay' : 'wxpay', orderInfo, success: resolve, fail: reject })
  })
}

/** 发起选定渠道 APP 充值，所有终态均以服务端回调或查单处理后的充值记录为准。 */
async function startRecharge() {
  if (submitting.value) return
  const channel = selectedPaymentChannel.value
  if (channel.disabled) return
  if (!channel.native && availableProviders.value?.[channel.key] !== true) {
    await openAppDialog({ title: t('account.recharge.unavailableTitle', { channel: channel.title }), description: t('account.recharge.unavailableContent', { channel: channel.title }), showCancel: false, confirmText: t('common.confirm') })
    return
  }
  const amount = rechargeAmount.value.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
    uni.showToast({ title: t('account.recharge.amountInvalid'), icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const createRecharge = channel.native ? createNativeRecharge : createAppRecharge
    const response = await createRecharge({
      channel: channel.key,
      amount: Number(amount),
      clientRequestId: ensureClientRequestId(amount, channel.key),
      fundAccountCode: rechargeAccountCode.value || finance.value.currentAccount?.fundAccountCode || null,
       // 订单页进入充值只用于支付完成后的本地回跳，不传给充值接口或 ERP。
    })
    rememberRecharge(response)
    if ([3, 4].includes(response.status)) {
      clearPendingRequest()
      throw new Error(response.failureMessage || t('account.recharge.createFailed', { channel: channel.title }))
    }
    if (response.status === 2) {
      // 服务端已经确认到账；本地幂等键只服务于当前一次支付，不能复用到下一次同金额充值。
      applyRechargeResult(response)
      return
    }
    if (!response.clientPayload) {
      if (channel.native && response.codeUrl) {
        openNativeQr(response)
        return
      }
      await showPaymentResultPending(t('account.recharge.acceptedHint'))
      return
    }

    const orderInfo = channel.key === 'wechat'
      ? parseWeChatPayOrderInfo(response.clientPayload)
      : response.clientPayload
    if (typeof orderInfo !== 'string' && channel.key === 'alipay') throw new Error(t('account.recharge.alipayFormat'))
    await requestPayment(channel.key, orderInfo)
    if (response.rechargeNo && lastFinalRecharge.value?.rechargeNo === response.rechargeNo) return
    const confirmedStatus = await checkRechargeResult({ silent: true })
    if ([2, 3, 4].includes(confirmedStatus)) return
    await showPaymentResultPending(t('account.recharge.requested', { channel: channel.title }))
  } catch (error) {
    const message = String(error?.errMsg || error?.message || '')
    if (/cancel/i.test(message)) {
      uni.showToast({ title: t('account.recharge.cancelled', { channel: channel.title }), icon: 'none' })
    } else {
      uni.showToast({ title: message || t('account.recharge.startFailed', { channel: channel.title }), icon: 'none' })
    }
  } finally {
    submitting.value = false
    await loadFinance()
  }
}

/** 展示服务端返回的 Native 支付二维码；关闭弹层不会清除幂等上下文，便于继续查看或重试。 */
function openNativeQr(response) {
  nativeQrExpiresAt.value = String(response.expiresAtUtc || '')
  nativeQrExpiryChecked = ''
  nativeQrAmount.value = response.amount ?? pendingRequestAmount.value ?? rechargeAmount.value
  nativeQrStatus.value = Number(response.status || 0)
  nativeQrLink.value = String(response.codeUrl || '')
  nativeQrNumber.value = String(response.rechargeNo || '')
  nativeQrMatrix.value = createQrMatrix(nativeQrLink.value)
  nativeQrVisible.value = nativeQrMatrix.value.length > 0
  if (nativeQrVisible.value) startNativeQrClock()
}

/** 倒计时仅控制二维码可用提示；到期仍读取服务端事实，不伪造充值关闭。 */
function startNativeQrClock() {
  stopNativeQrClock()
  const tick = () => {
    nativeQrNow.value = Date.now()
    if (nativeQrExpired.value && nativeQrNumber.value && nativeQrExpiryChecked !== nativeQrNumber.value) {
      nativeQrExpiryChecked = nativeQrNumber.value
      checkRechargeResult({ silent: true })
    }
  }
  tick()
  nativeQrTimer = setInterval(tick, 1000)
}

/** 页面隐藏、关闭弹层、终态和退出账号时释放倒计时。 */
function stopNativeQrClock() {
  if (nativeQrTimer !== null) clearInterval(nativeQrTimer)
  nativeQrTimer = null
}

/** 关闭 Native 支付二维码弹层，不改变充值单的服务端状态。 */
function closeNativeQr() {
  stopNativeQrClock()
  nativeQrVisible.value = false
}

/** 复制 Native 支付链接，方便在无法直接扫码时转发到其他设备。 */
function copyNativeQrLink() {
  if (nativeQrExpired.value) return uni.showToast({ title: t('account.recharge.qrExpired'), icon: 'none' })
  if (!nativeQrLink.value) return
  uni.setClipboardData({
    data: nativeQrLink.value,
    success: () => uni.showToast({ title: t('account.recharge.qrCopied'), icon: 'none' }),
    fail: () => uni.showToast({ title: t('account.recharge.qrCopyFailed'), icon: 'none' }),
  })
}

/** 在客户端调起结束后统一说明服务端确认语义，并引导查看可靠状态。 */
function showPaymentResultPending(content) {
  return openAppDialog({ title: t('account.recharge.pendingTitle'), description: content,
    confirmText: t('common.confirm'), showCancel: false })
}

function goToRecords() { navigator.navigateTo(routes.account.rechargeRecords()) }
</script>

<style lang="scss" scoped>
@import '../finance-ui.scss';
.recharge-page { display: grid; width: 100%; max-width: 560px; margin: 0 auto; gap: 16px; }
.balance-label { color: var(--type-secondary-color, #62666f); font-size: var(--type-body-size, 14px); line-height: 1.5; }
.recharge-balance { min-width: 0; padding: 6px 0 24px; border-bottom: 1px solid var(--border-color, #eceef1); }
.recharge-balance-value { font-size: var(--type-display-size, 28px); font-weight: 700; line-height: 1.3; }
.service-card { min-width: 0; padding: 16px; background: var(--glass-card-background, #fff); border-radius: var(--radius-card, 14px); }
.order-recharge-context { display: grid; gap: 8px; }
.section-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; }
.section-head > :first-child { min-width: 0; overflow-wrap: anywhere; }
.records-entry { justify-self: end; min-width: 0; }
.records-entry :deep(.app-button) { margin: 0; gap: 4px; }
.section-title, .form-label { font-size: var(--type-card-title-size, 16px); font-weight: 650; line-height: 1.4; }
.section-desc, .service-note { color: var(--type-secondary-color, #62666f); font-size: var(--type-body-small-size, 13px); line-height: 1.55; overflow-wrap: anywhere; }
.recharge-form { margin-top: 24px; }
.amount-input-wrap { display: flex; min-height: 60px; align-items: center; gap: 9px; margin-top: 8px; padding: 0 12px; border-radius: var(--radius-control, 10px); background: var(--surface-page, #f4f5f8); }
.amount-input-wrap:focus-within { outline: 2px solid var(--color-brand, #d7192d); outline-offset: -2px; }
.amount-prefix { font-size: 22px; font-weight: 650; }
.amount-input { flex: 1; min-width: 0; height: 52px; font-size: 24px; font-weight: 650; }
.amount-placeholder { font-size: var(--input-placeholder-size, 13px); font-weight: 400; }
.quick-amounts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.quick-amount { display: flex; justify-content: center; align-items: center; width: 100%; min-height: 44px; margin: 0; padding: 5px; border: 1px solid transparent; border-radius: var(--radius-control, 10px); color: var(--type-body-color, #1b1c20); background: var(--surface-page, #f4f5f8); font-size: 14px; line-height: 1.35; font-weight: 600; }
.quick-amount.active { border-color: #d7192d; color: #ad1024; background: #f4f5f8; }
.quick-amount::after { border: 0; }
.channel-picker { display: grid; gap: 8px; margin: 24px 0; }
.channel-card { display: flex; min-height: 48px; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--radius-control, 10px); background: var(--surface-page, #f4f5f8); font-size: 14px; line-height: 1.45; }
.channel-copy { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.channel-icon, .channel-check { flex: none; }
.channel-check { color: #ad1024; font-weight: 700; }
.channel-card--pressed { opacity: .8; }
.service-note { display: flex; align-items: flex-start; gap: 6px; margin-top: 12px; }
.service-note > :first-child { flex: none; margin-top: 2px; }
@media (min-width: 420px) { .quick-amounts { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (min-width: 700px) { .service-card { padding: 22px; } }
.native-qr-number { margin-top: 4px; color: #9499A2; font-size: var(--type-caption-size, 12px); line-height: 18px; }
.native-qr-hint { display: block; margin-top: 14px; color: #6F7680; font-size: var(--type-caption-size, 12px); line-height: 18px; }
.native-qr-code { display: flex; width: 240px; max-width: calc(100vw - 72px); height: 240px; max-height: calc(100vw - 72px); flex-direction: column; margin: 18px auto 16px; padding: 12px; box-sizing: border-box; background: #FFF; border: 1px solid #ECEEF1; border-radius: var(--radius-card, 14px); }
.native-qr-row { display: flex; min-height: 0; flex: 1; }
.native-qr-cell { min-width: 0; min-height: 0; flex: 1; background: #FFF; }
.native-qr-cell.dark { background: #14171C; }
.native-qr-amount { font-size: var(--type-heading-size, 24px); font-weight: 700; }
.native-qr-content { display: grid; gap: 12px; min-width: 0; }
.native-qr-number { display: block; overflow-wrap: anywhere; }
.native-qr-result { display: flex; align-items: center; flex-direction: column; padding: 28px 6px; text-align: center; }
.native-qr-success { display: flex; align-items: center; justify-content: center; width: 70px; height: 70px; margin-bottom: 16px; border-radius: 50%; background: #EAF7EF; }
.native-qr-result-title { display: block; font-size: var(--type-page-title-size, 20px); line-height: 28px; font-weight: var(--font-weight-bold, 700); }
.native-qr-result-hint { display: block; margin-top: 10px; color: var(--color-text-secondary, #6F7680); font-size: var(--type-body-small-size, 13px); line-height: 21px; overflow-wrap: anywhere; }
@media (max-width: 355px) { .native-qr-code { width: 208px; height: 208px; margin: 10px auto; } .native-qr-content { gap: 8px; } }
</style>
