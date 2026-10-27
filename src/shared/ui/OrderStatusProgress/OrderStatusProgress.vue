<template>
  <view class="order-status-panel" :class="panelClass">
    <view class="status-overview">
      <view class="status-copy">
        <text class="status-title">{{ text }}</text>
        <text class="status-description">{{ description }}</text>
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

  </view>
</template>

<script setup>
import { computed } from 'vue'

import { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } from '@/app/config/constant.js'

const props = defineProps({
  status: { type: [Number, String], default: 0 },
  paymentStatus: { type: [Number, String], default: 0 },
  fulfillmentStatus: { type: [Number, String], default: 0 },
  text: { type: String, default: '' },
  stepLabels: { type: Array, default: () => [] },
  description: { type: String, default: '' },
  journeyVisible: { type: Boolean, default: true },
})

/** 共享组件仅接收页面传来的节点文案，不依赖分包语言资源。 */
const steps = computed(() => ['submitted', 'paid', 'shipped', 'completed'].map((key, index) => ({ key, title: props.stepLabels[index] || '' })))

const normalizedStatus = computed(() => Number(props.status))
const normalizedPaymentStatus = computed(() => Number(props.paymentStatus))
const normalizedFulfillmentStatus = computed(() => Number(props.fulfillmentStatus))
const isCancelled = computed(() => normalizedStatus.value === ORDER_STATUS.CANCELLED)
const isCancelling = computed(() => normalizedStatus.value === ORDER_STATUS.CANCELLING)
const isRejected = computed(() => normalizedStatus.value === ORDER_STATUS.REVIEW_REJECTED)
const showProgress = computed(() => props.journeyVisible && !isCancelled.value && !isCancelling.value && !isRejected.value)

const currentIndex = computed(() => {
  const status = normalizedStatus.value
  if (status === ORDER_STATUS.COMPLETED || normalizedFulfillmentStatus.value >= FULFILLMENT_STATUS.COMPLETED) return 3
  if (status === ORDER_STATUS.DRAFT
      || status === ORDER_STATUS.PENDING_REVIEW
      || status === ORDER_STATUS.REVIEW_REJECTED) return 0
  if (status === ORDER_STATUS.PENDING_PAYMENT) {
    return normalizedPaymentStatus.value === PAYMENT_STATUS.CONFIRMED ? 2 : 1
  }
  if (status === ORDER_STATUS.PROCESSING) {
    if (normalizedPaymentStatus.value !== PAYMENT_STATUS.CONFIRMED) return 1
    if (normalizedFulfillmentStatus.value >= FULFILLMENT_STATUS.SHIPPED) return 2
    return 2
  }
  if (normalizedPaymentStatus.value === PAYMENT_STATUS.CONFIRMED) return 2
  return 0
})

const progressPercent = computed(() => {
  if (currentIndex.value <= 0) return 0
  return Math.round((currentIndex.value / (steps.value.length - 1)) * 100)
})

const panelClass = computed(() => ({
  'is-cancelled': isCancelled.value,
  'is-cancelling': isCancelling.value,
  'is-rejected': isRejected.value,
}))

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
.status-title { display: block; margin-top: 2px; color: #fff; font-size: 22px; font-weight: 750; line-height: 31px; }
.status-description { display: block; margin-top: 2px; color: rgba(255,255,255,.84); font-size: 12px; line-height: 19px; }
.status-progress { position: relative; z-index: 1; display: flex; justify-content: space-between; margin-top: 21px; }
.progress-track { position: absolute; top: 8px; right: 10%; left: 10%; height: 2px; border-radius: 2px; background: rgba(255,255,255,.24); }
.progress-track-fill { height: 100%; border-radius: inherit; background: #FFD36B; transition: width .2s ease; }
.progress-step { position: relative; z-index: 1; display: flex; width: 25%; min-width: 0; padding: 0 3px; box-sizing: border-box; flex-direction: column; align-items: center; gap: 6px; }
.progress-dot { display: grid; width: 18px; height: 18px; place-items: center; border: 2px solid rgba(255,255,255,.58); border-radius: 50%; color: rgba(255,255,255,.78); background: rgba(170,18,37,.7); font-size: 9px; font-weight: 700; box-sizing: border-box; }
.progress-dot > text { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; padding: 0; line-height: 1; text-align: center; }
.progress-step.done .progress-dot, .progress-step.current .progress-dot { border-color: #FFD36B; color: #8A202B; background: #FFD36B; }
.progress-check { font-size: 11px; line-height: 1; }
.progress-label { max-width: 100%; color: rgba(255,255,255,.7); font-size: 10px; line-height: 15px; white-space: normal; text-align: center; overflow-wrap: anywhere; }
.progress-step.current .progress-label { color: #fff; font-weight: 700; }
@media (min-width: 720px) { .order-status-panel { padding: 19px 20px 20px; } .status-title { font-size: 23px; } }
@media (max-width: 340px) { .order-status-panel { padding-right: 13px; padding-left: 13px; } .status-title { font-size: 20px; } .progress-label { font-size: 9px; } }
</style>
