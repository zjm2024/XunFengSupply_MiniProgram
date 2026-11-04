<template>
  <view class="order-detail-page"><view class="detail-columns"><view class="detail-main-column">
    <OrderStatusProgress :status="detail.order.orderStatus" :payment-status="detail.order.paymentStatus" :fulfillment-status="detail.order.fulfillmentStatus ?? 0" :text="statusText" :description="statusDescription" :journey-visible="![90,91].includes(detail.order.orderStatus)" :step-labels="['已提交','待付款','待发货','已完成']" />
    <view v-if="detail.receiver" class="address-card"><view class="address-icon-wrap"><AppIcon name="address" :size="20" /></view><view class="address-detail"><view class="contact-row"><text class="name">{{ detail.receiver.name }}</text><text class="phone">{{ detail.receiver.phone }}</text></view><text class="address-text">{{ detail.receiver.address }}</text></view></view>
    <view class="goods-card"><view class="card-title">商品信息</view><view class="spu-order-list"><view v-for="group in groups" :key="group.key" class="spu-order-card"><view class="spu-order-header"><view class="spu-order-copy"><text class="spu-order-name">{{ group.name }}</text><text class="spu-order-meta">{{ group.items.length }} 个规格 · {{ group.quantity }} 件</text></view></view><view class="sku-order-list"><view v-for="item in group.items" :key="item.skuId" class="goods-item"><AppProductImage class="goods-image" :src="item.imageUrl || ''" :show-stock-badge="false" /><view class="goods-info"><text class="goods-name">{{ item.specDesc || item.productName }}</text><text class="sku-name">SKU：{{ item.skuId }}</text><view class="price-row"><AmountText class="price" :text="'¥' + item.unitPrice" /><text class="qty">×{{ item.quantity }}</text></view></view><AmountText :text="'¥' + item.lineAmount" /></view></view></view></view></view>
    <view class="goods-card"><view class="card-title">订单信息</view><view class="share-info-row"><text>订单编号</text><text class="share-value">{{ detail.order.orderNo }}</text></view><view class="share-info-row"><text>付款截止</text><text>{{ new Date(detail.order.paymentExpiresAtUtc).toLocaleString() }}</text></view><view class="share-info-row"><text>应付金额</text><AmountText :text="'¥' + detail.order.payableAmount" /></view><AppButton block variant="secondary" :disabled="busy" @tap="emit('refresh')">刷新订单状态</AppButton></view>
  </view><view class="detail-side-column"><SharePaymentPanel :order="detail.order" :payment="payment" :busy="busy" @pay="emit('pay')" @query="emit('query')" /></view></view></view>
</template>
<script setup>
import { computed } from 'vue'
import OrderStatusProgress from '@/shared/ui/OrderStatusProgress/OrderStatusProgress.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import SharePaymentPanel from './SharePaymentPanel.vue'
import { shareProductGroups } from '../model/shareOrderPresentation.js'
const props = defineProps({ detail: { type:Object,required:true }, busy:Boolean, payment:{type:Object,default:()=>({})} })
const emit = defineEmits(['refresh','pay','query'])
const groups = computed(() => shareProductGroups(props.detail.items))
const statusText = computed(() => ({20:'待付款',40:'订单处理中',60:'已完成',90:'取消处理中',91:'已取消'}[props.detail.order.orderStatus] || '订单状态更新中'))
const statusDescription = computed(() => props.detail.order.orderStatus === 90 ? '已发起取消，等待仓储释放确认' : props.detail.order.orderStatus === 91 ? '订单已结束，请刷新库存后重新选购' : props.detail.order.paymentStatus === 3 ? '付款已确认' : '请在付款期限内完成支付')
</script>
<style scoped lang="scss">
@import '../../order/pages/detail/presentation.scss';
.address-card,.goods-card{margin:12px 0;padding:20px;border-radius:14px}.goods-image{width:72px;height:72px;flex:0 0 72px}.goods-item{gap:14px;padding:16px 0}.goods-card .card-title{margin-bottom:16px}.spu-order-name,.spu-order-meta{display:block}.spu-order-header{padding:12px 0}.address-card{display:flex;gap:14px}.contact-row{display:flex;gap:12px}.order-detail-page{padding:16px;box-sizing:border-box}.detail-side-column{min-width:0}.share-info-row{display:flex;justify-content:space-between;gap:16px;padding:12px 0;color:var(--text-secondary);font-size: var(--type-body-small-size, 13px)}.share-value{overflow-wrap:anywhere;text-align:right}.goods-item{min-width:0}.spu-order-header{cursor:default}@media(min-width:960px){.detail-columns{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:18px}.detail-side-column{position:sticky;top:16px;align-self:start}}

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.address-card, .goods-card, .spu-order-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
</style>
