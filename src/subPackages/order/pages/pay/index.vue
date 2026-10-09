﻿<!--
  付款页面（分包：paySub）
  对应业务流程节点：
  购物车&确认订单 → 独立收银台选择支付方式并完成支付
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="订单支付" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="pay-page">
          <!-- 支付金额与付款时限 -->
          <view class="amount-section">
            <text class="pay-label">{{ payMode === 1 ? '应付金额' : '赊账金额' }}</text>
            <text class="amount">¥{{ Number(payAmount || 0).toFixed(2) }}</text>
            <text class="order-no">订单号 {{ orderNo }}</text>
            <view v-if="!paymentExpired && remainTime > 0" class="deadline-panel">
              <view class="deadline-copy">
                <text class="deadline-label">剩余支付时间</text>
                <text class="deadline-note">逾期订单将自动关闭</text>
              </view>
              <text class="deadline-time">{{ formatRemainTime }}</text>
            </view>
            <view v-else-if="paymentExpired" class="deadline-panel is-expired">
              <view class="deadline-copy">
                <text class="deadline-label">支付时间已结束</text>
                <text class="deadline-note">请返回订单详情查看处理结果</text>
              </view>
              <AppIcon name="warning" :size="18" color="#B42318" />
            </view>
          </view>

          <view class="pay-methods mode-panel">
            <view class="method-title">选择支付方式</view>
            <text class="method-tip">支付方式仅在本次收银台确认时生效</text>
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
            <view class="method-title">在线支付通道</view>
            <text class="method-tip">请选择常用支付方式；通道开通后可在此直接支付</text>
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
                <text class="credit-title">授信账户</text>
                <text v-if="userStore.creditLevel" class="credit-level">{{ userStore.creditLevel }}</text>
              </view>
              <view class="credit-rows">
            <view class="credit-row">
                <text class="cr-label">本次赊账</text>
                <text class="cr-value primary">¥{{ Number(payAmount || 0).toFixed(2) }}</text>
              </view>
              <view class="credit-row">
                <text class="cr-label">当前可用额度</text>
                <text class="cr-value">¥{{ availableCreditAmount.toFixed(2) }}</text>
              </view>
              <view class="credit-row">
                <text class="cr-label">赊账后剩余额度</text>
                <text class="cr-value warn">¥{{ Math.max(0, availableCreditAmount - Number(payAmount || 0)).toFixed(2) }}</text>
              </view>
              </view>
              <view class="credit-tips">
                <AppIcon name="info" :size="14" color="#999" />
                <text>赊账金额将计入本月账单，请于每月5日前完成还款</text>
              </view>
            </view>
          </view>

          <view v-if="payMode === PAYMENT_MODE.CASH" class="channel-notice">
            <AppIcon name="info" :size="16" color="#B76500" />
            <text>当前订单暂不支持在线付款，请联系客户经理处理。</text>
          </view>

          <view class="pay-methods" v-if="payMode === PAYMENT_MODE.COMBINATION">
            <view class="method-title">账户余额分摊</view>
            <view
              v-for="account in availableAccounts"
              :key="account.accountCustomerId"
              class="balance-source"
              @tap="toggleAccount(account)"
            >
              <checkbox :checked="isSelected(account)" color="#D7192D" />
              <view class="source-copy">
                <text>{{ account.isMaster ? '主账户' : (account.realName || account.username) }}</text>
                <text>可用 ¥{{ Number(account.availableBalance || 0).toFixed(2) }}</text>
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
              <text>已分配 ¥{{ allocationTotal.toFixed(2) }}</text>
              <text>应付 ¥{{ Number(payAmount || 0).toFixed(2) }}</text>
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
          {{ paying ? '支付中...' : (paymentExpired ? '支付时间已结束' : (payMode === PAYMENT_MODE.CASH && !cashPaymentAvailable ? '暂不支持在线付款' : (payMode === PAYMENT_MODE.CREDIT ? '确认授信支付' : '确认支付'))) }}
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getOrderDetail } from '../../api/orderApi.js'
import { parseUtcToLocal } from '../../../../shared/utils/format.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { PAYMENT_MODE, ORDER_STATUS, PAYMENT_STATUS } from '@/app/config/constant.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { confirmDealerOrderPayment, getDealerFinanceContext } from '@/shared/api/dealerFinance.js'

const userStore = useUserStore()

const orderId = ref(null)
const orderNo = ref('')
const payMode = ref(PAYMENT_MODE.CASH)     // 1现款 2授信 3账户组合
const payAmount = ref(0)    // 单位：元（后端返回元）
const payType = ref('wechat') // wechat/alipay/bank-card
const paying = ref(false)
const remainTime = ref(0)   // 剩余时间（秒）
const paymentExpired = ref(false)
const finance = ref({ credit: {}, accounts: [] })
const cashPaymentAvailable = false
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
  { value: PAYMENT_MODE.CASH, label: '现款支付', description: '通过微信、支付宝或银行卡在线付款', icon: 'pay-cash', disabled: false },
  { value: PAYMENT_MODE.CREDIT, label: '授信支付', description: '使用经销商主体授信结算，生成应收账单', icon: 'pay-credit', disabled: Number(finance.value.credit?.status) !== 1 },
  { value: PAYMENT_MODE.COMBINATION, label: '账户组合支付', description: '使用主账户或子账户余额分摊结算', icon: 'pay-combine', disabled: false },
])
const cashPaymentMethods = [
  { key: 'wechat', label: '微信支付', description: '推荐使用微信安全支付', icon: 'pay-wechat' },
  { key: 'alipay', label: '支付宝', description: '支付宝快捷支付', icon: 'pay-alipay' },
  { key: 'bank-card', label: '银行卡支付', description: '支持已开通网银的银行卡', icon: 'bank' },
]
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

function handlePaymentExpired() {
  paymentExpired.value = true
  if (expireHandled) return
  expireHandled = true
  uni.showModal({
    title: '支付时间已结束',
    content: '该订单已超过 15 分钟支付期限，请到订单详情查看后端最终处理状态。',
    showCancel: false,
    success: () => {
      navigator.redirectTo(routes.order.detail(orderId.value))
    }
  })
}

/**
 * 订单已离开待付款状态时停止支付，并引导用户查看后端最终状态。
 */
function handlePaymentUnavailable() {
  orderPayable.value = false
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  uni.showModal({
    title: '订单当前不可支付',
    content: '订单状态已发生变化，请到订单详情查看处理结果。',
    showCancel: false,
    success: () => navigator.redirectTo(routes.order.detail(orderId.value)),
  })
}

function syncPaymentCountdown(order) {
  const explicitExpiryAt = order.paymentExpiresAt ? parseUtcToLocal(order.paymentExpiresAt).getTime() : Number.NaN
  const createdAt = order.createdAt ? parseUtcToLocal(order.createdAt).getTime() : Number.NaN
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
    uni.showToast({ title: e.message || '加载订单信息失败', icon: 'none' })
  }
}

async function loadFinanceContext() {
  try {
    finance.value = await getDealerFinanceContext()
    if (payMode.value === PAYMENT_MODE.COMBINATION) autoAllocate()
  } catch (error) {
    console.error('加载收银台资金信息失败:', error)
    uni.showToast({ title: error?.message || '资金信息加载失败', icon: 'none' })
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
  if (paymentExpired.value || remainTime.value <= 0) {
    handlePaymentExpired()
    return
  }
  paying.value = true

  try {
    if (payMode.value === PAYMENT_MODE.CREDIT) {
      if (Number(finance.value.credit?.status) !== 1) throw new Error('主体授信当前不可用')
      if (Number(payAmount.value) > availableCreditAmount.value) throw new Error('订单金额超过主体剩余可用授信')
      await confirmDealerOrderPayment({
        orderId: orderId.value,
        clientRequestId: `credit-pay-${orderId.value}-${Date.now()}`,
        paymentMode: PAYMENT_MODE.CREDIT,
        allocations: [{ payMethod: 'credit', accountCustomerId: null, amount: payAmount.value }],
      })
      return handlePaid()
    }
    if (payMode.value === PAYMENT_MODE.COMBINATION) {
      if (selectedAccountIds.value.length === 0) throw new Error('请至少选择一个余额账户')
      for (const id of selectedAccountIds.value) {
        const account = availableAccounts.value.find(item => item.accountCustomerId === id)
        const amount = Number(allocationAmounts.value[id])
        if (!account) throw new Error('存在不可用的余额账户，请刷新后重试')
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('每个账户的分摊金额必须大于 0')
        if (amount - Number(account.availableBalance || 0) > 0.005) {
          throw new Error(`${account.isMaster ? '主账户' : (account.realName || account.username)}分摊金额超过可用余额`)
        }
      }
      if (Math.abs(allocationTotal.value - Number(payAmount.value)) >= 0.005) {
        throw new Error('账户分摊合计必须等于订单应付金额')
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
    throw new Error('现款支付渠道尚未完成生产联调')
  } catch (e) {
    console.error('支付失败:', e)
    uni.showToast({ title: e.message || '支付失败', icon: 'none' })
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
  const remaining = Math.max(0, Number(payAmount.value) - allocationTotal.value)
  selectedAccountIds.value = [...selectedAccountIds.value, id]
  setAllocation(account, Math.min(remaining, Number(account.availableBalance)).toFixed(2))
}
function autoAllocate() {
  selectedAccountIds.value = []
  allocationAmounts.value = {}
  let remaining = Number(payAmount.value)
  for (const account of availableAccounts.value) {
    if (remaining <= 0) break
    const amount = Math.min(remaining, Number(account.availableBalance))
    if (amount <= 0) continue
    selectedAccountIds.value.push(account.accountCustomerId)
    allocationAmounts.value[account.accountCustomerId] = amount.toFixed(2)
    remaining = Number((remaining - amount).toFixed(2))
  }
}
function handlePaid() {
  uni.showToast({ title: '支付成功', icon: 'success' })
  setTimeout(() => navigator.redirectTo(routes.order.detail(orderId.value)), 500)
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
.source-copy text + text { color: var(--type-muted-color); font-size: var(--type-micro-size, 11px); }
.source-input { width: 92px; height: 36px; padding: 0 9px; border: 1px solid var(--color-border); border-radius: var(--radius-control); box-sizing: border-box; background: var(--surface-subtle); font-size: var(--type-body-size); text-align: right; }
.allocation-summary { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #EEF0F2; color: var(--type-secondary-color); font-size: var(--type-caption-size, 12px); }
.channel-notice { display: flex; align-items: flex-start; gap: 8px; margin-top: 14px; padding: 12px 14px; border-radius: var(--radius-control, 10px); color: #8A5200; background: #FFF8EB; font-size: var(--type-body-small-size, 13px); line-height: 20px; }
.bottom-space { height: 74px; }
.confirm-pay-btn { display: flex; width: 100%; height: 48px; align-items: center; justify-content: center; margin: 0; border: 0; border-radius: var(--radius-card, 14px); color: #FFF; background: var(--color-brand, #D7192D); font-size: var(--type-button-size, 14px); font-weight: 700; line-height: 1; }
.confirm-pay-btn[disabled] { color: #A8ABB2; background: #ECEEF2; opacity: 1; }
@media (min-width: 800px) { .pay-page { padding: 20px 20px 40px; } .amount-section { padding: 30px 28px 22px; } .pay-methods, .credit-info { padding: 20px 22px; } }
</style>
