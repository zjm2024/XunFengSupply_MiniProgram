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
            <text class="pay-label">{{ payMode === PAYMENT_MODE.CASH ? t('order.pay.amountDue') : t('order.pay.creditAmount') }}</text>
            <AmountText class="amount" :text="'¥' + (Number(payAmount || 0).toFixed(2))" />
            <text class="order-no">{{ t('order.pay.orderNo') }} {{ orderNo }}</text>
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
              <view class="mode-icon"><AppIcon :name="method.icon" :size="23" use-original-color /></view>
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
              <view class="mode-icon"><AppIcon :name="channel.icon" :size="23" use-original-color /></view>
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
                <AmountText class="cr-value primary" :text="'¥' + (Number(payAmount || 0).toFixed(2))" />
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
              @tap="toggleAccount(account)"
            >
              <checkbox :checked="isSelected(account)" color="#D7192D" />
              <view class="source-copy">
                <text>{{ account.isMaster ? t('order.pay.masterAccount') : (account.realName || account.username) }}</text>
                <AmountText :text="t('order.pay.availableBalance', { amount: Number(account.availableBalance || 0).toFixed(2) })" />
              </view>
              <input
                v-if="isSelected(account)"
                class="source-input"
                type="digit"
                :value="allocationAmounts[account.accountCustomerId]"
                placeholder="0.00"
                @tap.stop
                @input="setAllocation(account, $event.detail.value)"
              />
            </view>
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
          :disabled="paying || !orderPayable || paymentExpired || (payMode === PAYMENT_MODE.CASH && !cashPaymentAvailable)"
          @click="handleConfirmPay"
        >
          {{ confirmButtonText }}
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/order/i18n/register.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getOrderDetail } from '../../api/orderApi.js'
import { parseUtcToLocal } from '../../../../shared/utils/format.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { ERP_REVIEW_STATUS, PAYMENT_MODE, ORDER_STATUS, PAYMENT_STATUS } from '@/app/config/constant.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { confirmDealerOrderPayment, getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { AppError, ErrorKind } from '@/shared/api/appError.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'

const userStore = useUserStore()

const orderId = ref(null)
const orderNo = ref('')
const payMode = ref(PAYMENT_MODE.COMBINATION)     // 默认使用单一余额账户支付
const payAmount = ref(0)    // 单位：元（后端返回元）
// 汇报演示默认进入网页微信扫码充值。
const payType = ref('wechat_native')
const paying = ref(false)
const remainTime = ref(0)   // 剩余时间（秒）
const paymentExpired = ref(false)
const confirmationPending = ref(false)
const finance = ref({ credit: {}, accounts: [] })
const cashPaymentAvailable = true
let returningFromRecharge = false
const selectedAccountIds = ref([])
const allocationAmounts = ref({})
const orderPayable = ref(true)
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
const allocationTotal = computed(() => selectedAccountIds.value.reduce(
  (sum, id) => sum + Number(allocationAmounts.value[id] || 0), 0,
))
const availableCreditAmount = computed(() => Math.max(0, Number(finance.value.credit?.availableAmount || 0)))
const paymentModeOptions = computed(() => [
  { value: PAYMENT_MODE.CASH, label: t('order.pay.cash'), description: t('order.pay.cashDescription'), icon: 'pay-cash', disabled: false },
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

  // 从订单详情获取实际金额
  if (orderId.value) {
    await loadOrderInfo()
    if (orderPayable.value) await loadFinanceContext()
  }
})

onShow(() => {
  if (orderId.value && !paying.value) loadOrderInfo()
  if (returningFromRecharge) {
    returningFromRecharge = false
    payMode.value = PAYMENT_MODE.COMBINATION
    loadFinanceContext()
  }
})

onUnmounted(() => {
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
async function handlePaymentUnavailable() {
  orderPayable.value = false
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  const confirmed = await openAppDialog({
    title: t('order.pay.unavailableTitle'),
    description: t('order.pay.unavailableContent'),
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
    orderNo.value = res.orderNo || ''
    payAmount.value = Number(res.payableAmount || 0)
    const canPay = Number(res.orderStatus) === ORDER_STATUS.PENDING_PAYMENT
      && [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.FAILED].includes(Number(res.paymentStatus))
      && Array.isArray(res.allowedActions)
      && res.allowedActions.includes('pay')
    if (!canPay) {
      handlePaymentUnavailable()
      return
    }
    syncPaymentCountdown(res)
  } catch (e) {
    console.error('加载订单信息失败:', e)
    uni.showToast({ title: e.message || t('order.pay.loadOrderFailed'), icon: 'none' })
  }
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
  if (paymentExpired.value || (!confirmationPending.value && remainTime.value <= 0)) {
    handlePaymentExpired()
    return
  }
  paying.value = true

  try {
    if (payMode.value === PAYMENT_MODE.CREDIT) {
      if (Number(finance.value.credit?.status) !== 1) throw localError('creditUnavailable')
      await confirmDealerOrderPayment({
        orderId: orderId.value,
        clientRequestId: `credit-pay-${orderId.value}-${Date.now()}`,
        paymentMode: PAYMENT_MODE.CREDIT,
        fundAccountCode: finance.value.credit?.fundAccountCode || null,
        allocations: [{ payMethod: 'credit', accountCustomerId: null, amount: payAmount.value }],
      })
      return handlePaid()
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
      await confirmDealerOrderPayment({
        orderId: orderId.value,
        clientRequestId: `balance-pay-${orderId.value}-${Date.now()}`,
        paymentMode: PAYMENT_MODE.COMBINATION,
        allocations: selectedAccountIds.value.map(id => ({
          payMethod: 'balance',
          accountCustomerId: Number(id),
          amount: Number(allocationAmounts.value[id] || 0),
        })),
      })
      return handlePaid()
    }
    if (payMode.value === PAYMENT_MODE.CASH) {
      returningFromRecharge = true
      await navigator.navigateTo(routes.account.recharge({ orderId: orderId.value,
        amount: Number(payAmount.value).toFixed(2),
        channel: cashPaymentMethods.value.some(item => item.key === payType.value) ? payType.value : 'wechat_native',
        fundAccountCode: finance.value.currentAccount?.fundAccountCode || null }))
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
function toggleAccount(account) {
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
  const account = availableAccounts.value.find(item => Number(item.availableBalance || 0) >= amount)
    || availableAccounts.value.find(item => Number(item.availableBalance || 0) > 0)
  if (!account) return
  selectedAccountIds.value = [account.accountCustomerId]
  allocationAmounts.value[account.accountCustomerId] = amount.toFixed(2)
}
function handlePaid() {
  uni.showToast({ title: t('order.pay.paid'), icon: 'success' })
  setTimeout(() => navigator.redirectTo(routes.order.detail(orderId.value)), 500)
}

/** 创建支付页本地校验错误，使用 messageKey 让已存在页面随语言切换重新取词。 */
function localError(key, messageParameters = {}) {
  return new AppError('', ErrorKind.UNKNOWN, { messageKey: 'order.pay.' + key, messageParameters })
}
</script>

<style lang="scss" scoped>
.pay-page { width: 100%; max-width: 760px; min-height: 100%; margin: 0 auto; padding: 12px 14px 28px; box-sizing: border-box; }
.amount-section { padding: 24px 20px 18px; border-radius: var(--radius-feature, 18px); color: #FFF; background: linear-gradient(145deg, #C9152B 0%, #A50F22 100%); box-shadow: 0 12px 28px rgba(174, 20, 38, .16); text-align: center; }
.pay-label, .amount, .order-no, .deadline-label, .deadline-note { display: block; }
.pay-label { color: rgba(255,255,255,.8); font-size: var(--type-caption-size, 12px); }
.amount { margin-top: 8px; font-size: 34px; font-weight: 760; line-height: 44px; font-variant-numeric: tabular-nums; letter-spacing: -.5px; }
.order-no { margin-top: 5px; color: rgba(255,255,255,.68); font-size: var(--type-micro-size, 11px); }
.deadline-panel { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 20px; padding: 12px 14px; border: 1px solid rgba(255,255,255,.2); border-radius: var(--radius-control, 10px); background: rgba(255,255,255,.11); text-align: left; }
.deadline-panel.is-expired { color: #B42318; background: #FFF; }
.deadline-copy { min-width: 0; }
.deadline-label { font-size: var(--type-body-small-size, 13px); font-weight: 700; }
.deadline-note { margin-top: 2px; color: rgba(255,255,255,.7); font-size: var(--type-micro-size, 11px); }
.deadline-panel.is-expired .deadline-note { color: #8B5A55; }
.deadline-time { flex: 0 0 auto; font-size: 25px; font-weight: 760; font-variant-numeric: tabular-nums; letter-spacing: .5px; }
.credit-info { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; padding: 17px 16px; border-radius: var(--radius-card, 14px); background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.pay-methods { margin-top: 14px; padding: 17px 16px; border-radius: var(--radius-card, 14px); background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.method-title { color: var(--type-title-color); font-size: var(--type-card-title-size, 16px); font-weight: 700; }
.method-tip { display: block; margin-top: 4px; color: var(--type-muted-color); font-size: var(--type-micro-size, 11px); line-height: var(--type-micro-line-height, 16px); }
.payment-mode-option { display: flex; width: 100%; min-height: 62px; align-items: center; gap: 11px; margin: 10px 0 0; padding: 10px 0; border: 0; border-top: 1px solid #EEF0F2; border-radius: 0; color: inherit; background: transparent; text-align: left; line-height: normal; }
.payment-mode-option::after { border: 0; }
.payment-mode-option.active .mode-copy > text:first-child { color: var(--color-brand, #D7192D); }
.payment-mode-option.disabled { opacity: .45; }
.mode-icon { display: flex; width: 38px; height: 38px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: var(--radius-control, 10px); background: var(--surface-subtle, #F7F8FA); }
.mode-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; }
.mode-copy > text:first-child { color: var(--type-title-color); font-size: var(--type-body-size, 14px); font-weight: 650; }
.mode-copy > text:last-child { overflow: hidden; color: var(--type-muted-color); font-size: var(--type-micro-size, 11px); line-height: var(--type-micro-line-height, 16px); text-overflow: ellipsis; white-space: nowrap; }
.mode-radio { display: flex; width: 18px; height: 18px; flex: 0 0 auto; align-items: center; justify-content: center; border: 1px solid var(--color-border, #D9DDE3); border-radius: 50%; box-sizing: border-box; color: #FFF; font-size: 11px; }
.active .mode-radio { border-color: var(--color-brand, #D7192D); background: var(--color-brand, #D7192D); }
.credit-title { color: var(--type-title-color); font-size: var(--type-card-title-size, 16px); font-weight: 700; }
.credit-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.credit-level { padding: 3px 9px; border-radius: var(--radius-full, 999px); color: var(--color-brand, #D7192D); background: #FFF0F2; font-size: var(--type-micro-size, 11px); }
.credit-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; min-height: 44px; border-bottom: 1px solid #EEF0F2; }
.credit-row:last-child { border-bottom: 0; }
.cr-label { color: var(--type-secondary-color); font-size: var(--type-body-small-size, 13px); }
.cr-value { color: var(--type-title-color); font-size: var(--type-body-size, 14px); font-weight: 650; font-variant-numeric: tabular-nums; }
.cr-value.primary { color: var(--color-brand, #D7192D); }
.cr-value.warn { color: #9A5A00; }
.credit-tips { display: flex; align-items: flex-start; gap: 7px; margin-top: 12px; padding: 10px 11px; border-radius: var(--radius-control, 10px); background: var(--surface-subtle, #F7F8FA); }
.credit-tips text { color: var(--type-muted-color); font-size: var(--type-micro-size, 11px); line-height: var(--type-micro-line-height, 16px); }
.balance-source { display: flex; min-height: 58px; align-items: center; gap: 10px; border-top: 1px solid #EEF0F2; }
.source-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; color: var(--type-body-color); font-size: var(--type-body-small-size, 13px); }
.source-copy .amount-text { color: var(--type-muted-color); font-size: var(--type-micro-size, 11px); }
.source-input { width: 92px; height: 36px; padding: 0 9px; border: 1px solid var(--color-border); border-radius: var(--radius-control); box-sizing: border-box; background: var(--surface-subtle); font-size: var(--type-body-size); text-align: right; }
.allocation-summary { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #EEF0F2; color: var(--type-secondary-color); font-size: var(--type-caption-size, 12px); }
.channel-notice { display: flex; align-items: flex-start; gap: 8px; margin-top: 14px; padding: 12px 14px; border-radius: var(--radius-control, 10px); color: #8A5200; background: #FFF8EB; font-size: var(--type-body-small-size, 13px); line-height: 20px; }
.bottom-space { height: 74px; }
.confirm-pay-btn { display: flex; width: 100%; height: 48px; align-items: center; justify-content: center; margin: 0; border: 0; border-radius: var(--radius-card, 14px); color: #FFF; background: var(--color-brand, #D7192D); font-size: var(--type-button-size, 14px); font-weight: 700; line-height: 1; }
.confirm-pay-btn[disabled] { color: #A8ABB2; background: #ECEEF2; opacity: 1; }
@media (min-width: 800px) { .pay-page { padding: 20px 20px 40px; } .amount-section { padding: 30px 28px 22px; } .pay-methods, .credit-info { padding: 20px 22px; } }

/* 金额按实际可用宽度缩字，父布局允许收缩。 */
.credit-card-display, .credit-rows, .allocation-summary { min-width: 0; }
.credit-card-display { width: 100%; }
.allocation-summary { flex-wrap: wrap; gap: 6px 12px; }
.allocation-summary .amount-text { font-size: inherit; }
.amount { margin-left: auto; margin-right: auto; }
</style>
