<template>
  <view class="share-payment-panel">
    <text class="payment-heading">{{ t('share.orderDetail.paymentInfo') }}</text>
    <view class="payment-total">
      <text>{{ t(status === 'paid' ? 'share.orderDetail.paidAmount' : 'share.checkout.payable') }}</text>
      <AmountText class="amount" :text="'¥' + order.payableAmount" />
    </view>
    <view class="payment-status">
      <AppIcon v-if="paymentOpen" name="pay-wechat" :size="20" use-original-color />
      <text>{{ t('share.orderDetail.paymentState.' + status) }}</text>
      <text v-if="status === 'payable'" class="deadline-time">{{ countdown }}</text>
    </view>
    <template v-if="paymentOpen">
      <view v-if="payment.codeUrl" class="native-pay">
        <AppQrCode :matrix="nativeMatrix" :size="192" />
        <text>{{ t('share.orderDetail.scanToPay') }}</text>
      </view>
      <text v-if="payment.message && !['error','unsupported','cancelled'].includes(payment.status)" class="method-tip" role="status">{{ payment.message }}</text>
    </template>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { t } from '@/shared/i18n/index.js'
import { createQrMatrix } from '@/shared/utils/qrMatrix.js'
import AppQrCode from '@/shared/ui/AppQrCode/AppQrCode.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'

const props = defineProps({
  order: { type: Object, required: true },
  payment: { type: Object, default: () => ({}) },
  status: { type: String, required: true },
  countdown: { type: String, default: '' },
})
const paymentOpen = computed(() => props.status === 'payable' || props.status === 'expired')
const nativeMatrix = computed(() => props.payment.codeUrl ? createQrMatrix(props.payment.codeUrl) : [])
</script>

<style scoped>
.payment-heading { display: block; color: var(--type-title-color); font-size: var(--type-card-title-size, 16px); font-weight: var(--font-weight-semibold, 600); line-height: 24px; }
.payment-total { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 12px 0; color: var(--type-secondary-color); font-size: var(--type-body-small-size, 13px); }
.amount { max-width: 100%; color: var(--color-brand, #D7192D); font-size: var(--type-money-total-size, 24px); line-height: var(--type-money-total-line-height, 32px); font-weight: var(--font-weight-bold, 700); font-variant-numeric: tabular-nums; }
.payment-status { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: var(--radius-control, 10px); background: var(--surface-subtle, #F5F6F8); color: var(--type-secondary-color); font-size: var(--type-body-small-size, 13px); }
.deadline-time { flex-shrink: 0; margin-left: auto; color: var(--type-title-color); font-weight: var(--font-weight-semibold, 600); font-variant-numeric: tabular-nums; }
.native-pay { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 12px; text-align: center; }
.native-pay, .method-tip { color: var(--type-secondary-color); font-size: var(--type-caption-size, 12px); line-height: 1.5; }
.method-tip { display: block; margin-top: 8px; }
</style>
