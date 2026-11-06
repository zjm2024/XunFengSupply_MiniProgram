<template>
  <view class="share-payment-panel">
    <text class="payment-heading">{{ paid ? '付款信息' : '订单金额' }}</text>
    <view class="payment-total"><text>{{ paid ? '已付金额' : '应付金额' }}</text><AmountText class="amount" :text="'¥' + order.payableAmount" /></view>
    <view class="deadline-panel"><text>{{ refunding ? (payment.status === 'refunded' ? '已退款' : '退款处理中') : paid ? '已付款' : closed ? '订单已取消' : cancelling ? '取消处理中' : expired ? '付款期限已到' : '剩余付款时间' }}</text><text v-if="!closed && !cancelling && !paid && !refunding" class="deadline-time">{{ countdown }}</text></view>
    <view v-if="!closed && !cancelling && !paid && !refunding" class="payment-methods">
      <view class="payment-mode-option"><AppIcon name="pay-wechat" :size="21" use-original-color /><text>微信支付</text><AppIcon class="channel-check" name="check" :size="15" /></view>
      <view v-if="payment.codeUrl" class="native-pay"><AppQrCode :matrix="nativeMatrix" :size="200" /><text>微信扫一扫付款</text></view>
      <text v-if="payment.message && !['error','unsupported','cancelled'].includes(payment.status)" class="method-tip" role="status">{{ payment.message }}</text>
      <AppButton v-if="!payment.codeUrl" block :disabled="expired || busy || payment.busy" @tap="emit('pay')">{{ expired ? '付款已超时' : payment.busy ? '正在处理…' : '微信支付' }}</AppButton>
      <button v-if="payment.codeUrl || ['pending','error','cancelled'].includes(payment.status)" class="query-link" :disabled="busy || payment.busy" @tap="emit('query')">查询付款状态</button>
    </view>
  </view>
</template>
<script setup>
import { createQrMatrix } from '@/shared/utils/qrMatrix.js'
import AppQrCode from '@/shared/ui/AppQrCode/AppQrCode.vue'
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
const props = defineProps({ order: { type: Object, required: true }, payment:{type:Object,default:()=>({})}, busy:Boolean })
const nativeMatrix=computed(()=>props.payment.codeUrl?createQrMatrix(props.payment.codeUrl):[])
const emit=defineEmits(['pay','query'])
const refunding=computed(()=>props.payment?.status==='refunding' || props.payment?.status==='refunded')
const paid=computed(()=>props.payment?.status==='paid' || props.order.paymentStatus===3)
const remaining = ref(0); let timer
const closed = computed(() => props.order.orderStatus === 91)
const cancelling = computed(() => props.order.orderStatus === 90)
const expired = computed(() => remaining.value <= 0)
const countdown = computed(() => String(Math.floor(remaining.value / 60)).padStart(2,'0') + ':' + String(remaining.value % 60).padStart(2,'0'))
/** 服务端剩余期限减去本页实际经过时间；重绘不续期，卸载清除计时。 */
function sync() { clearInterval(timer); const initial = Math.max(0,Date.parse(props.order.paymentExpiresAtUtc)-Date.parse(props.order.serverNowUtc)); const start = Date.now(); const tick = () => { remaining.value = Math.max(0,Math.ceil((initial-(Date.now()-start))/1000)) }; tick(); timer = setInterval(tick,1000) }
watch(() => props.order, sync, { immediate:true })
onBeforeUnmount(() => clearInterval(timer))
</script>
<style scoped lang="scss">
.share-payment-panel{padding:18px;min-width:0;border-radius:var(--radius-card,14px);box-sizing:border-box;background:var(--glass-card-background,rgba(255,255,255,.9));box-shadow:var(--glass-card-shadow,0 8px 24px rgba(55,65,80,.05));color:var(--text-primary,#25272d)}.payment-heading{display:block;font-size:16px;line-height:1.4;font-weight:650}.payment-total{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 0;font-size:14px;color:var(--text-secondary,#737985)}.amount{max-width:100%;color:var(--color-brand,#d7192d);font-size:28px;font-weight:700;font-variant-numeric:tabular-nums}.deadline-panel{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px;border-radius:8px;background:var(--surface-subtle,#f5f6f8);font-size:13px;color:var(--text-secondary,#737985)}.deadline-time{font-weight:600;color:var(--text-primary,#25272d);font-variant-numeric:tabular-nums;font-size:16px}.payment-mode-option{display:flex;align-items:center;gap:8px;padding:16px 0;font-size:14px}.channel-check{margin-left:auto;color:var(--color-brand,#d7192d)}.native-pay{display:flex;flex-direction:column;align-items:center;gap:10px;padding:4px 0 12px;font-size:12px;color:var(--text-secondary,#737985);text-align:center}.method-tip{display:block;font-size:12px;line-height:1.5;color:var(--text-secondary,#737985);margin-bottom:12px}.query-link{width:100%;padding:10px 0 0;border:0;margin:0;background:transparent;color:var(--text-secondary,#737985);font-size:12px;line-height:1.6}.query-link:after{border:0}.query-link[disabled]{opacity:.5}
@media(max-width:479px){.share-payment-panel{padding:15px}.payment-total{padding:16px 0}.amount{font-size:26px}}
</style>
