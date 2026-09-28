<template>
  <view class="order-status-panel" :class="panelClass">
    <view class="status-overview">
      <view class="status-copy">
        <text class="status-eyebrow">订单状态</text>
        <text class="status-title">{{ text }}</text>
        <text class="status-description">{{ description }}</text>
      </view>
      <view class="status-badge">
        <text class="status-badge-dot" />
        <text>{{ badgeText }}</text>
      </view>
    </view>

    <view v-if="showProgress" class="status-progress">
      <view class="progress-track">
        <view class="progress-track-fill" :style="{ width: `${progressPercent}%` }" />
      </view>
      <view
        v-for="(step, index) in steps"
        :key="step.key"
        class="progress-step"
        :class="{ done: index < currentIndex, current: index === currentIndex }"
      >
        <view class="progress-dot">
          <text v-if="index < currentIndex" class="progress-check">✓</text>
          <text v-else>{{ index + 1 }}</text>
        </view>
        <text class="progress-label">{{ step.title }}</text>
      </view>
    </view>

    <view v-else class="status-result">
      <view class="result-mark">{{ resultMark }}</view>
      <view class="result-copy">
        <text class="result-title">{{ resultTitle }}</text>
        <text class="result-description">{{ resultDescription }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const ORDER_STATUS = Object.freeze({
  REVIEW_REJECTED: 11,
  PENDING_PAYMENT: 20,
  PROCESSING: 40,
  COMPLETED: 60,
  CANCELLING: 90,
  CANCELLED: 91,
})

const FULFILLMENT_STATUS = Object.freeze({
  SHIPPED: 4,
  COMPLETED: 6,
})

const props = defineProps({
  status: { type: [Number, String], default: 0 },
  fulfillmentStatus: { type: [Number, String], default: 0 },
  text: { type: String, default: '订单状态更新中' },
  description: { type: String, default: '' },
})

const steps = Object.freeze([
  { key: 'submitted', title: '提交订单' },
  { key: 'paid', title: '完成付款' },
  { key: 'shipped', title: '商家发货' },
  { key: 'completed', title: '交易完成' },
])

const normalizedStatus = computed(() => Number(props.status))
const normalizedFulfillmentStatus = computed(() => Number(props.fulfillmentStatus))
const isCancelled = computed(() => normalizedStatus.value === ORDER_STATUS.CANCELLED)
const isCancelling = computed(() => normalizedStatus.value === ORDER_STATUS.CANCELLING)
const isRejected = computed(() => normalizedStatus.value === ORDER_STATUS.REVIEW_REJECTED)
const showProgress = computed(() => !isCancelled.value && !isCancelling.value && !isRejected.value)

const currentIndex = computed(() => {
  const status = normalizedStatus.value
  if (status === ORDER_STATUS.COMPLETED || normalizedFulfillmentStatus.value >= FULFILLMENT_STATUS.COMPLETED) return 3
  if (status === ORDER_STATUS.PROCESSING && normalizedFulfillmentStatus.value >= FULFILLMENT_STATUS.SHIPPED) return 2
  if (status === ORDER_STATUS.PENDING_PAYMENT || status === ORDER_STATUS.PROCESSING) return 1
  return 0
})

const progressPercent = computed(() => {
  if (currentIndex.value <= 0) return 0
  return Math.round((currentIndex.value / (steps.length - 1)) * 100)
})

const panelClass = computed(() => ({
  'is-cancelled': isCancelled.value,
  'is-cancelling': isCancelling.value,
  'is-rejected': isRejected.value,
}))

const badgeText = computed(() => {
  if (isCancelled.value) return '已结束'
  if (isCancelling.value) return '处理中'
  if (isRejected.value) return '未通过'
  if (normalizedStatus.value === ORDER_STATUS.COMPLETED) return '已完成'
  return '进行中'
})

const resultMark = computed(() => (isRejected.value ? '!' : '✓'))
const resultTitle = computed(() => {
  if (isRejected.value) return '订单未通过审核'
  if (isCancelling.value) return '订单正在关闭'
  return '订单已结束'
})
const resultDescription = computed(() => {
  if (isRejected.value) return '可返回订单重新调整采购计划'
  if (isCancelling.value) return '正在处理取消申请，请稍候查看退款结果'
  return props.description || '订单已取消，相关退款将按原支付方式处理'
})
</script>

<style lang="scss" scoped>
.order-status-panel {
  position: relative;
  overflow: hidden;
  margin: 0 0 10px;
  padding: 17px 16px 18px;
  border-radius: var(--radius-feature, 18px);
  color: #fff;
  background: linear-gradient(135deg, var(--color-brand, #D7192D) 0%, #B70F26 100%);
  box-shadow: 0 8px 20px rgba(180, 19, 39, .16);
  box-sizing: border-box;
}
.order-status-panel::after { position: absolute; top: -46px; right: -30px; width: 150px; height: 150px; border: 1px solid rgba(255,255,255,.16); border-radius: 50%; content: ''; }
.order-status-panel.is-cancelled, .order-status-panel.is-rejected { background: linear-gradient(135deg, #747983 0%, #565B64 100%); box-shadow: 0 8px 20px rgba(65,70,78,.14); }
.status-overview { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.status-copy { min-width: 0; }
.status-eyebrow { display: block; color: rgba(255,255,255,.72); font-size: 11px; line-height: 16px; }
.status-title { display: block; margin-top: 2px; color: #fff; font-size: 22px; font-weight: 750; line-height: 31px; }
.status-description { display: block; margin-top: 2px; color: rgba(255,255,255,.84); font-size: 12px; line-height: 19px; }
.status-badge { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 5px; margin-top: 5px; padding: 5px 8px; border: 1px solid rgba(255,255,255,.28); border-radius: 999px; color: rgba(255,255,255,.94); background: rgba(255,255,255,.12); font-size: 10px; line-height: 14px; }
.status-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: #FFD36B; }
.status-progress { position: relative; z-index: 1; display: flex; justify-content: space-between; margin-top: 21px; }
.progress-track { position: absolute; top: 8px; right: 10%; left: 10%; height: 2px; border-radius: 2px; background: rgba(255,255,255,.24); }
.progress-track-fill { height: 100%; border-radius: inherit; background: #FFD36B; transition: width .2s ease; }
.progress-step { position: relative; z-index: 1; display: flex; width: 25%; flex-direction: column; align-items: center; gap: 6px; }
.progress-dot { display: grid; width: 18px; height: 18px; place-items: center; border: 2px solid rgba(255,255,255,.58); border-radius: 50%; color: rgba(255,255,255,.78); background: rgba(170,18,37,.7); font-size: 9px; font-weight: 700; box-sizing: border-box; }
.progress-dot > text { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; padding: 0; line-height: 1; text-align: center; }
.progress-step.done .progress-dot, .progress-step.current .progress-dot { border-color: #FFD36B; color: #8A202B; background: #FFD36B; }
.progress-check { font-size: 11px; line-height: 1; }
.progress-label { color: rgba(255,255,255,.7); font-size: 10px; line-height: 15px; white-space: nowrap; }
.progress-step.current .progress-label { color: #fff; font-weight: 700; }
.status-result { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; margin-top: 19px; padding: 10px 11px; border-radius: 11px; background: rgba(255,255,255,.12); }
.result-mark { display: flex; width: 25px; height: 25px; flex: 0 0 25px; align-items: center; justify-content: center; border-radius: 50%; color: #626872; background: #fff; font-size: 15px; font-weight: 800; line-height: 1; text-align: center; }
.result-copy { min-width: 0; }
.result-title { display: block; color: #fff; font-size: 12px; font-weight: 700; line-height: 18px; }
.result-description { display: block; margin-top: 1px; color: rgba(255,255,255,.78); font-size: 10px; line-height: 16px; }
@media (min-width: 720px) { .order-status-panel { padding: 19px 20px 20px; } .status-title { font-size: 23px; } }
@media (max-width: 340px) { .order-status-panel { padding-right: 13px; padding-left: 13px; } .status-title { font-size: 20px; } .progress-label { font-size: 9px; } }
</style>
