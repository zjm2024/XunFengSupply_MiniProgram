<template>
  <view class="pay-page share-payment-panel">
    <view class="amount-section"><text class="pay-label">应付金额</text><AmountText class="amount" :text="'¥' + order.payableAmount" /><text class="order-no">订单编号 {{ order.orderNo }}</text><view class="deadline-panel"><view class="deadline-copy"><text class="deadline-label">{{ paid ? '已付款' : closed ? '订单已取消' : cancelling ? '取消处理中' : expired ? '付款期限已到' : '剩余付款时间' }}</text><text class="deadline-note">{{ cancelling ? '等待仓储确认释放库存' : '15分钟内付款' }}</text></view><text v-if="!closed && !cancelling && !paid" class="deadline-time">{{ countdown }}</text></view></view>
    <view v-if="!closed && !cancelling && !paid" class="payment-methods"><view class="method-title">支付方式</view><view class="payment-mode-option channel-option active"><view class="mode-icon"><AppIcon name="pay-wechat" :size="25" use-original-color /></view><view class="mode-copy"><text>微信支付</text></view><view class="mode-radio">✓</view></view><text v-if="payment.message" class="method-tip" role="status">{{ payment.message }}</text><AppButton block :disabled="expired || busy || payment.busy" @tap="emit('pay')">{{ expired ? '付款已超时' : payment.busy ? '正在处理…' : '微信支付' }}</AppButton><AppButton variant="secondary" block :disabled="busy || payment.busy" @tap="emit('query')">刷新付款状态</AppButton></view>
  </view>
</template>
<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
const props = defineProps({ order: { type: Object, required: true }, payment:{type:Object,default:()=>({})}, busy:Boolean })
const emit=defineEmits(['pay','query'])
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
@import '../../order/pages/pay/presentation.scss';
.share-payment-panel{padding:0;max-width:none;min-height:0}.payment-methods{padding:20px;background:var(--bg-card,#fff);border-radius:var(--radius-card,14px);margin-top:12px}.payment-methods .method-tip{display:block;margin:14px 0;line-height:1.6}.mode-copy{display:flex;flex-direction:column}
</style>
