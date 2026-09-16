<!--
  取消订单原因选择页面（分包：order）
  对应业务流程节点：
  订单待付款/待审核 → 选择取消原因，确认后提交取消
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="取消订单" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="cancel-page" v-if="orderId">
          <!-- 订单信息摘要 -->
          <view class="order-summary">
            <text class="order-no">订单编号：{{ orderNo || orderId }}</text>
          </view>

          <!-- 提示文本 -->
          <text class="hint-text">请选择取消原因</text>

          <!-- 原因列表 -->
          <view class="reason-list">
            <view
              v-for="reason in cancelReasons"
              :key="reason.code"
              class="reason-item"
              :class="{
                active: selectedReasonCode === reason.code,
                'is-other': reason.code === 'other'
              }"
              @click="selectedReasonCode = reason.code"
            >
              <text class="reason-text">{{ reason.label }}</text>
              <view class="reason-check" v-if="selectedReasonCode === reason.code">
                <AppIcon name="check" :size="16" color="#FFFFFF" />
              </view>
            </view>
          </view>

          <!-- 其他原因输入框 -->
          <view class="reason-input-block" v-if="selectedReasonCode === 'other'">
            <view class="input-label-text">
              <text class="required-mark">*</text>
              <text class="label-text">请填写取消原因</text>
            </view>
            <textarea
              class="reason-textarea"
              :value="customReason"
              @input="customReason = $event.detail.value"
              placeholder="请详细描述取消原因..."
              placeholder-class="reason-placeholder"
              maxlength="200"
              :auto-height="true"
            />
            <text class="char-count">{{ customReason.length }}/200</text>
          </view>

          <!-- 底部占位 -->
          <view class="footer-placeholder" />
        </view>
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar>
        <button class="submit-btn" :disabled="!canSubmit || submitting" @click="handleSubmit">
          {{ submitting ? '提交中...' : '确认取消' }}
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { cancelOrder, generateClientRequestId } from '../../api/orderApi.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const orderId = ref(null)
const orderNo = ref('')
const selectedReasonCode = ref('')
const customReason = ref('')
const submitting = ref(false)

// 取消原因列表
const cancelReasons = Object.freeze([
  { code: 'changed_mind', label: '不想要了/改变主意' },
  { code: 'duplicate_order', label: '重复下单' },
  { code: 'wrong_info', label: '商品信息/地址填写错误' },
  { code: 'price_reason', label: '价格原因/更便宜的选择' },
  { code: 'delivery_too_slow', label: '发货太慢' },
  { code: 'other', label: '其他原因' },
])

// 是否可以提交
const canSubmit = computed(() => {
  if (!selectedReasonCode.value) return false
  if (selectedReasonCode.value === 'other') {
    return customReason.value.trim().length > 0
  }
  return true
})

onLoad((options) => {
  if (options.orderId) {
    orderId.value = Number(options.orderId)
  }
  if (options.orderNo) {
    orderNo.value = options.orderNo
  }
})

/**
 * 提交取消申请
 */
async function handleSubmit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true

  const selected = cancelReasons.find(r => r.code === selectedReasonCode.value)
  const params = {
    orderId: orderId.value,
    clientRequestId: generateClientRequestId(),
  }

  if (selectedReasonCode.value === 'other') {
    params.reasonCode = 'other'
    params.reason = customReason.value.trim()
  } else {
    params.reasonCode = selectedReasonCode.value
    params.reason = selected?.label || null
  }

  try {
    await cancelOrder(params)
    uni.showToast({ title: '取消成功', icon: 'success' })
    // 返回订单详情页（重新加载状态）
    setTimeout(() => {
      navigator.redirectTo(routes.order.detail(orderId.value))
    }, 300)
  } catch (e) {
    uni.showToast({ title: e.message || '取消失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.cancel-page {
  min-height: 100%;
  padding: 24rpx 0 24rpx;
  background: var(--bg-color);
}

.order-summary {
  background: linear-gradient(135deg, #E6A23C 0%, #F5DAB1 100%);
  border-radius: 12rpx;
  padding: 28rpx 32rpx;
  margin: 0 24rpx 28rpx;

  .order-no {
    font-size: 28rpx;
    color: #fff;
    font-weight: 500;
    letter-spacing: 0.5rpx;
  }
}

.hint-text {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 32rpx 20rpx;
}

.reason-list {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 0 32rpx;
  margin-bottom: 24rpx;
}

.reason-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
  padding: 24rpx 28rpx;
  border-radius: 10rpx;
  background: #fff;
  border: 1rpx solid transparent;
  transition: background 180ms ease, border-color 180ms ease;

  &:active {
    background: #f7f8fa;
  }

  &.active {
    background: #fff6f6;
    border-color: var(--primary-color);
  }

  &.is-other {
    margin-top: 8rpx;
  }
}

.reason-text {
  font-size: 28rpx;
  color: var(--text-primary);
  flex: 1;
  line-height: 1.5;
}

.reason-check {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-color);
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.reason-input-block {
  background: #fff;
  border-radius: 10rpx;
  padding: 28rpx 32rpx;
  margin: 0 32rpx 16rpx;
  animation: slide-down 220ms cubic-bezier(.2, .8, .2, 1) both;

  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateY(-8rpx);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

.input-label-text {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.required-mark {
  color: #F56C6C;
  font-size: 28rpx;
  margin-right: 6rpx;
}

.label-text {
  font-size: 26rpx;
  color: var(--text-secondary);
  font-weight: 500;
}

.reason-textarea {
  width: 100%;
  min-height: 160rpx;
  max-height: 280rpx;
  padding: 16rpx 18rpx;
  background: #f7f8fa;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: var(--text-primary);
  line-height: 1.6;
  border: 1rpx solid var(--border-color);
  box-sizing: border-box;
}

.reason-placeholder {
  color: var(--text-placeholder);
  font-size: 26rpx;
}

.char-count {
  display: block;
  font-size: 22rpx;
  color: var(--text-placeholder);
  text-align: right;
  margin-top: 8rpx;
}

.footer-placeholder {
  height: 32rpx;
}

.submit-btn {
  width: 100%;
  height: 80rpx;
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
  background: var(--primary-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  &:active {
    background: #b91224;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &::after {
    border: none;
  }
}

@media screen and (min-width: 600px) {
  .cancel-page {
    padding: 32rpx 20% 32rpx;
  }

  .order-summary,
  .reason-list,
  .reason-input-block {
    margin-left: 0;
    margin-right: 0;
  }

  .hint-text {
    margin-left: 8rpx;
    margin-right: 8rpx;
  }
}
</style>
