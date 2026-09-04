<!--
  结算模式选择弹窗组件
  结算二选一：【现款支付 / 授信赊账】
  展示授信额度信息，帮助用户决策
-->
<template>
  <view class="pay-mode-popup">
    <uni-popup ref="popupRef" type="bottom">
      <view class="popup-content">
        <view class="popup-header">
          <text class="title">选择结算方式</text>
          <uni-icons type="close" size="22" @click="close" />
        </view>

        <!-- 订单金额 -->
        <view class="amount-display">
          <text class="label">订单金额</text>
          <text class="amount">¥{{ (orderAmount / 100).toFixed(2) }}</text>
        </view>

        <!-- 模式选项 -->
        <view class="mode-options">
          <!-- 现款支付 -->
          <view 
            class="mode-card" 
            :class="{ active: innerMode === 1 }"
            @click="selectMode(1)"
          >
            <view class="mode-header">
              <view class="mode-icon cash">
                <uni-icons type="weixin" size="28" />
              </view>
              <view class="mode-info">
                <text class="mode-name">现款支付</text>
                <text class="mode-desc">在线即时结算，交易即完成</text>
              </view>
              <view class="radio-circle" :class="{ checked: innerMode === 1 }"></view>
            </view>
          </view>

          <!-- 授信赊账 -->
          <view 
            class="mode-card" 
            :class="{ active: innerMode === 2, disabled: !canUseCredit }"
            @click="canUseCredit && selectMode(2)"
          >
            <view class="mode-header">
              <view class="mode-icon credit">
                <uni-icons type="wallet" size="28" />
              </view>
              <view class="mode-info">
                <text class="mode-name">授信赊账</text>
                <text class="mode-desc">使用授信额度，月度统一结算</text>
              </view>
              <view class="radio-circle" :class="{ checked: innerMode === 2 }"></view>
            </view>

            <!-- 授信额度信息 -->
            <view class="credit-detail" v-if="innerMode === 2">
              <view class="credit-row">
                <text>可用额度</text>
                <text class="credit-val">¥{{ (availableCredit / 100).toFixed(2) }}</text>
              </view>
              <view class="credit-row">
                <text>赊账后剩余</text>
                <text class="credit-val warn">¥{{ ((availableCredit - orderAmount) / 100).toFixed(2) }}</text>
              </view>
            </view>

            <!-- 额度不足提示 -->
            <view class="insufficient-tip" v-if="!canUseCredit">
              <uni-icons type="info" size="14" color="#F56C6C" />
              <text>可用额度不足，请选择现款支付或先还款</text>
            </view>
          </view>
        </view>

        <!-- 确认按钮 -->
        <button class="confirm-btn" @click="confirmSelect">确认选择</button>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useUserStore } from '../../store/modules/user.js'

const props = defineProps({
  modelValue: { type: Number, default: 1 },
  availableCredit: { type: Number, default: 0 },
  orderAmount: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue'])

const userStore = useUserStore()
const popupRef = ref(null)

const innerMode = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  innerMode.value = val
})

// 是否可以使用授信
const canUseCredit = computed(() => {
  return userStore.canUseCreditPay && props.availableCredit >= props.orderAmount
})

function selectMode(mode) {
  innerMode.value = mode
}

function confirmSelect() {
  emit('update:modelValue', innerMode.value)
  close()
}

function open() {
  popupRef.value?.open?.()
}

function close() {
  popupRef.value?.close?.()
}

defineExpose({ open, close })
</script>

<style lang="scss" scoped>
.popup-content {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx;
  max-height: 80vh;
  
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28rpx;
    
    .title {
      font-size: 34rpx;
      font-weight: 700;
      color: var(--text-primary);
    }
  }
  
  .amount-display {
    text-align: center;
    padding: 20rpx 0 28rpx;
    border-bottom: 1rpx solid var(--border-color);
    margin-bottom: 28rpx;
    
    .label {
      display: block;
      font-size: 26rpx;
      color: var(--text-secondary);
      margin-bottom: 8rpx;
    }
    
    .amount {
      font-size: 48rpx;
      font-weight: 700;
      color: var(--primary-color);
    }
  }
  
  .mode-options {
    .mode-card {
      border: 2rpx solid var(--border-color);
      border-radius: 16rpx;
      padding: 28rpx;
      margin-bottom: 20rpx;
      
      &.active {
        border-color: var(--primary-color);
        background: rgba(196, 30, 58, 0.02);
      }
      
      &.disabled {
        opacity: 0.6;
      }
      
      .mode-header {
        display: flex;
        align-items: center;
        
        .mode-icon {
          width: 72rpx;
          height: 72rpx;
          border-radius: 16rpx;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 20rpx;
          
          &.cash { background: #07C160; color: #fff; }
          &.credit { background: #409EFF; color: #fff; }
        }
        
        .mode-info {
          flex: 1;
          
          .mode-name {
            display: block;
            font-size: 30rpx;
            font-weight: 600;
            color: var(--text-primary);
          }
          
          .mode-desc {
            display: block;
            font-size: 24rpx;
            color: var(--text-placeholder);
            margin-top: 6rpx;
          }
        }
        
        .radio-circle {
          width: 40rpx;
          height: 40rpx;
          border-radius: 50%;
          border: 2rpx solid var(--border-color);
          
          &.checked {
            border-color: var(--primary-color);
            background: var(--primary-color);
            position: relative;
            
            &::after {
              content: '';
              position: absolute;
              top: 50%;
              left: 55%;
              transform: translate(-50%, -50%) rotate(45deg);
              width: 12rpx;
              height: 20rpx;
              border-right: 3rpx solid #fff;
              border-bottom: 3rpx solid #fff;
            }
          }
        }
      }
      
      .credit-detail {
        margin-top: 20rpx;
        padding-top: 20rpx;
        border-top: 1rpx dashed var(--border-color);
        
        .credit-row {
          display: flex;
          justify-content: space-between;
          padding: 8rpx 0;
          font-size: 26rpx;
          
          .credit-val {
            color: var(--primary-color);
            font-weight: 500;
            
            &.warn { color: #E6A23C; }
          }
        }
      }
      
      .insufficient-tip {
        display: flex;
        align-items: center;
        margin-top: 16rpx;
        
        text {
          font-size: 24rpx;
          color: #F56C6C;
          margin-left: 8rpx;
        }
      }
    }
  }
  
  .confirm-btn {
    width: 100%;
    height: 88rpx;
    line-height: 88rpx;
    background: var(--primary-color);
    color: #fff;
    font-size: 32rpx;
    font-weight: 600;
    border-radius: 44rpx;
    border: none;
    margin-top: 16rpx;
  }
}
</style>
