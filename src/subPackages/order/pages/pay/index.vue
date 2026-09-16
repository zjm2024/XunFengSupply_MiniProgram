<!--
  付款页面（分包：paySub）
  对应业务流程节点：
  购物车&下单结算 → 结算二选一【现款支付 / 授信赊账】
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="订单支付" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="pay-page">
          <!-- 支付金额展示 -->
          <view class="amount-section">
            <text class="pay-label">{{ payMode === 1 ? '应付金额' : '赊账金额' }}</text>
            <text class="amount">¥{{ Number(payAmount || 0).toFixed(2) }}</text>
            <text class="order-no">订单号: {{ orderNo }}</text>
          </view>

          <!-- 现款支付方式 -->
          <view class="pay-methods" v-if="payMode === 1">
            <view class="method-title">选择支付方式</view>
            <view 
              class="method-item" 
              :class="{ active: payType === 'wechat' }"
              @click="payType = 'wechat'"
            >
              <view class="method-icon wechat"><AppIcon name="wechat-pay" :size="28" /></view>
              <text class="method-name">微信支付</text>
              <view class="check-circle" :class="{ checked: payType === 'wechat' }"></view>
            </view>
            <view 
              class="method-item" 
              :class="{ active: payType === 'alipay' }"
              @click="payType = 'alipay'"
            >
              <view class="method-icon alipay"><text style="font-size:28px;color:#1677FF;">支</text></view>
              <text class="method-name">支付宝</text>
              <view class="check-circle" :class="{ checked: payType === 'alipay' }"></view>
            </view>
            <view
              class="method-item"
              :class="{ active: payType === 'bank-card' }"
              @click="payType = 'bank-card'"
            >
              <view class="method-icon bank-card"><AppIcon name="bank" :size="26" /></view>
              <text class="method-name">银行卡支付</text>
              <view class="check-circle" :class="{ checked: payType === 'bank-card' }"></view>
            </view>
          </view>

          <!-- 授信赊账信息 -->
          <view class="credit-info" v-if="payMode === 2">
            <view class="credit-card-display">
              <view class="credit-header">
                <text class="credit-title">授信账户</text>
                <text class="credit-level">{{ userStore.creditLevel }}</text>
              </view>
              <view class="credit-rows">
            <view class="credit-row">
                <text class="cr-label">本次赊账</text>
                <text class="cr-value primary">¥{{ Number(payAmount || 0).toFixed(2) }}</text>
              </view>
              <view class="credit-row">
                <text class="cr-label">当前可用额度</text>
                <text class="cr-value">¥{{ Number(userStore.availableCreditLimit || 0).toFixed(2) }}</text>
              </view>
              <view class="credit-row">
                <text class="cr-label">赊账后剩余额度</text>
                <text class="cr-value warn">¥{{ Math.max(0, Number(userStore.availableCreditLimit || 0) - Number(payAmount || 0)).toFixed(2) }}</text>
              </view>
              </view>
              <view class="credit-tips">
                <AppIcon name="info" :size="14" color="#999" />
                <text>赊账金额将计入本月账单，请于每月5日前完成还款</text>
              </view>
            </view>
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

          <!-- 倒计时提示（待付款订单） -->
          <view class="expire-tip" v-if="remainTime > 0">
            <AppIcon name="clock" :size="14" color="#E6A23C" />
            <text>请在 <text class="time-highlight">{{ formatRemainTime }}</text> 内完成支付，超时订单将自动取消</text>
          </view>

          <!-- 底部占位 -->
          <view style="height: 140rpx;" />
        </view>
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar>
        <button 
          class="confirm-pay-btn" 
          :disabled="paying"
          @click="handleConfirmPay"
        >
          {{ paying ? '支付中...' : (payMode === PAYMENT_MODE.CREDIT ? '确认授信支付' : '确认支付') }}
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrderDetail } from '../../api/orderApi.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { PAYMENT_MODE, ORDER_STATUS } from '@/app/config/constant.js'
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
const payMode = ref(PAYMENT_MODE.CASH)     // 1现款 2授信
const payAmount = ref(0)    // 单位：元（后端返回元）
const payType = ref('wechat') // wechat/alipay/bank-card
const paying = ref(false)
const remainTime = ref(0)   // 剩余时间（秒）
const finance = ref({ credit: {}, accounts: [] })
const selectedAccountIds = ref([])
const allocationAmounts = ref({})
let countdownTimer = null

// 格式化剩余时间
const formatRemainTime = computed(() => {
  if (remainTime.value <= 0) return '00:00:00'
  const h = Math.floor(remainTime.value / 3600)
  const m = Math.floor((remainTime.value % 3600) / 60)
  const s = remainTime.value % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
const availableAccounts = computed(() => (finance.value.accounts || []).filter(item =>
  item.accountStatus === 1 && item.financeStatus === 1 && item.canParticipateCombinationPay,
))
const allocationTotal = computed(() => selectedAccountIds.value.reduce(
  (sum, id) => sum + Number(allocationAmounts.value[id] || 0), 0,
))

onLoad(async (options) => {
  orderId.value = Number(options.orderId) || null
  payMode.value = Number(options.paymentMode) || PAYMENT_MODE.CASH
  if (['wechat', 'alipay', 'bank-card'].includes(options.paymentChannel)) {
    payType.value = options.paymentChannel
  }

  // 从订单详情获取实际金额
  if (orderId.value) {
    await loadOrderInfo()
    if (payMode.value === PAYMENT_MODE.CREDIT || payMode.value === PAYMENT_MODE.COMBINATION) {
      finance.value = await getDealerFinanceContext()
      if (payMode.value === PAYMENT_MODE.COMBINATION) autoAllocate()
    }
  }
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

function startCountdown() {
  countdownTimer = setInterval(() => {
    remainTime.value--
    if (remainTime.value <= 0) {
      clearInterval(countdownTimer)
      uni.showModal({
        title: '提示',
        content: '订单已超时，请重新下单',
        showCancel: false,
        success: () => {
          navigator.back()
        }
      })
    }
  }, 1000)
}

/**
 * 加载订单信息（获取支付金额和订单号）
 */
async function loadOrderInfo() {
  try {
    const res = await getOrderDetail(orderId.value)
    orderNo.value = res.orderNo || ''
    payAmount.value = Number(res.payableAmount || 0)
    payMode.value = res.paymentMode || payMode.value
  } catch (e) {
    console.error('加载订单信息失败:', e)
    uni.showToast({ title: e.message || '加载订单信息失败', icon: 'none' })
  }
}

/**
 * 确认支付/赊账
 * 授信与账户余额走内部确定性支付；现款支付等待外部支付渠道回调。
 */
async function handleConfirmPay() {
  paying.value = true

  try {
    if (payMode.value === PAYMENT_MODE.CREDIT) {
      if (Number(finance.value.credit?.status) !== 1) throw new Error('主体授信当前不可用')
      await confirmDealerOrderPayment({
        orderId: orderId.value,
        clientRequestId: `credit-pay-${orderId.value}-${Date.now()}`,
        allocations: [{ payMethod: 'credit', accountCustomerId: null, amount: payAmount.value }],
      })
      return handlePaid()
    }
    if (payMode.value === PAYMENT_MODE.COMBINATION) {
      if (Math.abs(allocationTotal.value - Number(payAmount.value)) >= 0.005) {
        throw new Error('账户分摊合计必须等于订单应付金额')
      }
      await confirmDealerOrderPayment({
        orderId: orderId.value,
        clientRequestId: `balance-pay-${orderId.value}-${Date.now()}`,
        allocations: selectedAccountIds.value.map(id => ({
          payMethod: 'balance',
          accountCustomerId: Number(id),
          amount: Number(allocationAmounts.value[id] || 0),
        })),
      })
      return handlePaid()
    }
    uni.showModal({ title: '提示', content: '现款支付渠道正在对接中，请稍后再试或联系客服', showCancel: false })
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
.pay-page {
  min-height: 100%;
  background: var(--bg-color);
}

.amount-section {
  text-align: center;
  padding: 40rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A 0%, #9A1729 100%);
  border-radius: 12rpx;
  margin: 16rpx 24rpx;
  
  .pay-label {
    display: block;
    font-size: 28rpx;
    color: rgba(255,255,255,0.8);
    margin-bottom: 16rpx;
  }
  
  .amount {
    display: block;
    font-size: 64rpx;
    font-weight: 700;
    color: #fff;
    margin-bottom: 12rpx;
  }
  
  .order-no {
    font-size: 24rpx;
    color: rgba(255,255,255,0.6);
  }
}

.pay-methods, .credit-info {
  background: #fff;
  margin: 24rpx;
  border-radius: 12rpx;
  padding: 28rpx 32rpx;
  
  .method-title {
    font-size: 30rpx;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 24rpx;
  }
}

.method-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--border-color);
  
  &:last-child { border-bottom: none; }
  
  &.active .method-name { color: var(--primary-color); }
  
  .method-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
    
    &.wechat { background: #07C160; color: #fff; }
    &.alipay { background: #E8F1FF; }
    &.bank-card { background: #F2F3F5; color: #4E5664; }
  }
  
  .method-name {
    flex: 1;
    font-size: 30rpx;
    color: var(--text-primary);
  }
  
  .check-circle {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    border: 2rpx solid var(--border-color);
    
    &.checked {
      background: var(--primary-color);
      border-color: var(--primary-color);
      position: relative;
      
      &::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #fff;
        font-size: 24rpx;
      }
    }
  }
}

.balance-source { display: flex; align-items: center; gap: 12px; min-height: 58px; border-top: 1px solid #EEF0F2; }
.source-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4px; color: #2A2E35; font-size: 13px; }
.source-copy text + text { color: #92979F; font-size: 11px; }
.source-input { width: 96px; height: 34px; box-sizing: border-box; border: 1px solid #DDE0E4; border-radius: 9px; padding: 0 9px; text-align: right; }
.allocation-summary { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #EEF0F2; color: #555B64; font-size: 12px; }

.credit-card-display {
  .credit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    
    .credit-title {
      font-size: 30rpx;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .credit-level {
      font-size: 24rpx;
      color: var(--primary-color);
      background: rgba(196, 30, 58, 0.08);
      padding: 4rpx 16rpx;
      border-radius: 16rpx;
    }
  }
  
  .credit-rows {
    .credit-row {
      display: flex;
      justify-content: space-between;
      padding: 16rpx 0;
      border-bottom: 1rpx solid var(--border-color);
      
      &:last-child { border-bottom: none; }
      
      .cr-label {
        font-size: 28rpx;
        color: var(--text-secondary);
      }
      
      .cr-value {
        font-size: 30rpx;
        font-weight: 600;
        color: var(--text-primary);
        
        &.primary { color: var(--primary-color); }
        &.warn { color: #E6A23C; }
      }
    }
  }
  
  .credit-tips {
    display: flex;
    align-items: flex-start;
    margin-top: 20rpx;
    padding: 16rpx;
    background: var(--bg-color);
    border-radius: 8rpx;
    
    text {
      font-size: 22rpx;
      color: var(--text-placeholder);
      margin-left: 8rpx;
      line-height: 1.5;
    }
  }
}

.expire-tip {
  display: flex;
  align-items: center;
  margin: 0 24rpx;
  padding: 20rpx 24rpx;
  background: #FDF6EC;
  border-radius: 8rpx;
  
  text {
    font-size: 24rpx;
    color: #E6A23C;
    margin-left: 8rpx;
    
    .time-highlight {
      font-weight: 700;
    }
  }
}

.confirm-pay-btn {
  width: 100%;
  height: 92rpx;
  line-height: 92rpx;
  background: var(--primary-color);
  color: #fff;
  font-size: 34rpx;
  font-weight: 600;
  border-radius: 46rpx;
  border: none;
  
  &[disabled] {
    opacity: 0.6;
  }
}
</style>
