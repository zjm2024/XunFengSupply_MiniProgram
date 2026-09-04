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
              <view class="method-icon wechat"><uni-icons type="weixin" size="28" /></view>
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
                <uni-icons type="info" size="14" color="#999" />
                <text>赊账金额将计入本月账单，请于每月5日前完成还款</text>
              </view>
            </view>
          </view>

          <!-- 倒计时提示（待付款订单） -->
          <view class="expire-tip" v-if="remainTime > 0">
            <uni-icons type="clock" size="14" color="#E6A23C" />
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
          {{ paying ? '支付中...' : (payMode === 1 ? '确认支付' : '确认赊账') }}
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrderDetail } from '../../api/order.js'
import { useUserStore } from '../../store/modules/user.js'
import { PAYMENT_MODE, ORDER_STATUS } from '../../config/constant.js'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppContent from '@/components/AppContent/AppContent.vue'
import FixedActionBar from '@/components/FixedActionBar/FixedActionBar.vue'

const userStore = useUserStore()

const orderId = ref(null)
const orderNo = ref('')
const payMode = ref(PAYMENT_MODE.CASH)     // 1现款 2授信
const payAmount = ref(0)    // 单位：元（后端返回元）
const payType = ref('wechat') // weixin/alipay
const paying = ref(false)
const remainTime = ref(0)   // 剩余时间（秒）
let countdownTimer = null

// 格式化剩余时间
const formatRemainTime = computed(() => {
  if (remainTime.value <= 0) return '00:00:00'
  const h = Math.floor(remainTime.value / 3600)
  const m = Math.floor((remainTime.value % 3600) / 60)
  const s = remainTime.value % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

onLoad(async (options) => {
  orderId.value = Number(options.orderId) || null
  payMode.value = Number(options.paymentMode) || PAYMENT_MODE.CASH

  // 从订单详情获取实际金额
  if (orderId.value) {
    await loadOrderInfo()
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
          uni.navigateBack()
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
 * V1 支付集成模块尚未实现独立支付接口，此页面先展示订单金额
 */
async function handleConfirmPay() {
  paying.value = true

  try {
    // V1：支付功能尚未接入第三方支付渠道
    uni.showModal({
      title: '提示',
      content: '支付功能正在对接中，请稍后再试或联系客服',
      showCancel: false,
    })
  } catch (e) {
    console.error('支付失败:', e)
    uni.showToast({ title: e.message || '支付失败', icon: 'none' })
  } finally {
    paying.value = false
  }
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
