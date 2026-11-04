<template>
  <view class="order-detail-page share-order-detail">
    <OrderStatusProgress :status="detail.order.orderStatus" :payment-status="detail.order.paymentStatus" :fulfillment-status="detail.order.fulfillmentStatus ?? 0" :text="statusText" :description="statusDescription" :journey-visible="![90,91].includes(detail.order.orderStatus)" :step-labels="['已提交','待付款','待发货','已完成']" />
    <view class="detail-columns">
        <view v-if="detail.receiver" class="detail-card address-card">
          <AppIcon name="address" :size="20" />
          <view class="address-detail"><view class="contact-row"><text class="name">{{ detail.receiver.name }}</text><text class="phone">{{ detail.receiver.phone }}</text></view><text class="address-text">{{ detail.receiver.address }}</text></view>
        </view>
      <view class="detail-side-column"><SharePaymentPanel :order="detail.order" :payment="payment" :busy="busy" @pay="emit('pay')" @query="emit('query')" /></view>
        <view class="detail-card goods-card">
          <view class="card-heading"><text class="card-title">商品信息</text><text class="card-meta">{{ groups.length }} 款 · {{ totalQuantity }} 件</text></view>
          <view v-for="group in groups" :key="group.key" class="spu-order-card">
            <CheckoutSpuHeader :name="group.name" :meta="group.items.length + ' 个规格 · ' + group.quantity + ' 件'" :amount="'¥' + shareGroupAmount(group)" :collapsed="isGroupCollapsed(group.key)" @toggle="toggleGroup(group.key)" />
            <view v-show="!isGroupCollapsed(group.key)" class="sku-order-list">
              <view v-for="item in group.items" :key="item.skuId" class="goods-item">
                <AppProductImage class="goods-image" :src="item.imageUrl || ''" :show-stock-badge="false" />
                <view class="goods-info"><text class="goods-name">{{ item.specDesc || item.productName }}</text><text class="sku-name">SKU：{{ item.skuId }}</text><view class="price-row"><AmountText :text="'¥' + item.unitPrice" /><text class="qty">× {{ item.quantity }}</text></view></view>
              </view>
            </view>
          </view>
        </view>
        <view class="detail-card order-info-card">
          <view class="card-heading"><text class="card-title">订单信息</text><button class="refresh-link" :disabled="busy" @tap="emit('refresh')">刷新订单</button></view>
          <AppButton v-if="detail.canCancel === true" variant="secondary" :disabled="busy" @tap="confirmingCancel = true">取消订单</AppButton>
          <ShareOverlayPortal :visible="confirmingCancel"><ConfirmPopup v-model="confirmingCancel" title="取消订单" description="确认取消本单？已付款项将在仓储确认后原路退回。" confirm-text="确认取消" :confirm-disabled="busy" danger @confirm="confirmingCancel=false; emit('cancel')" /></ShareOverlayPortal>
          <view class="share-info-row"><text>订单编号</text><text class="share-value">{{ detail.order.orderNo }}</text></view>
          <view v-if="detail.cancellationNo" class="share-info-row"><text>取消单号</text><text class="share-value">{{ detail.cancellationNo }}</text></view>
          <view v-if="detail.warehouseReleaseState != null" class="share-info-row"><text>取消进度</text><text class="share-value">{{ detail.cancellationState === 5 ? '订单已发货，取消未成功，请查看履约进度' : detail.warehouseReleaseState === 3 ? (detail.refundState === 4 ? '已原路退款' : detail.order.paymentStatus === 3 ? '仓储已确认，退款处理中' : '仓储已确认') : '取消已受理，等待支付及仓储确认' }}</text></view>
          <view class="share-info-row"><text>付款截止</text><text class="share-value">{{ deadlineText }}</text></view>
        </view>

    </view>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import OrderStatusProgress from '@/shared/ui/OrderStatusProgress/OrderStatusProgress.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import CheckoutSpuHeader from '../../commerce/components/CheckoutSpuHeader.vue'
import SharePaymentPanel from './SharePaymentPanel.vue'
import ShareOverlayPortal from './ShareOverlayPortal.vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import { shareProductGroups, shareGroupAmount } from '../model/shareOrderPresentation.js'
const props = defineProps({ detail: { type:Object,required:true }, busy:Boolean, payment:{type:Object,default:()=>({})} })
const emit = defineEmits(['refresh','pay','query','cancel'])
const confirmingCancel = ref(false)
const groups = computed(() => shareProductGroups(props.detail.items))
const totalQuantity = computed(() => groups.value.reduce((sum, group) => sum + group.quantity, 0))
const collapsedGroups = ref({})
/** 详情默认展示成交规格，SPU标题沿用结算的伸缩交互。 */
function isGroupCollapsed(key) { return collapsedGroups.value[key] === true }
/** 只改变当前详情的规格可见性，不修改已下单内容。 */
function toggleGroup(key) { collapsedGroups.value = { ...collapsedGroups.value, [key]: !isGroupCollapsed(key) } }
const deadlineText = computed(() => { const date = new Date(props.detail.order.paymentExpiresAtUtc); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', { hour12:false }) })
const statusText = computed(() => ({20:'待付款',40:'订单处理中',60:'已完成',90:'取消处理中',91:'已取消'}[props.detail.order.orderStatus] || '订单状态更新中'))
const statusDescription = computed(() => props.detail.order.orderStatus === 90 ? '已发起取消，等待仓储释放确认' : props.detail.order.orderStatus === 91 ? '订单已结束，请刷新库存后重新选购' : props.detail.order.paymentStatus === 3 ? '付款已确认' : '请在付款期限内完成支付')
</script>
<style scoped lang="scss">
.share-order-detail{max-width:1160px;margin:0 auto;padding:16px;box-sizing:border-box;color:var(--text-primary,#25272d)}
.detail-columns{display:grid;gap:14px;min-width:0;margin-top:14px;grid-template-areas:"address" "payment" "goods" "info"}.address-card{grid-area:address}.goods-card{grid-area:goods}.order-info-card{grid-area:info}.detail-side-column{grid-area:payment;min-width:0}
.detail-card{padding:18px;border-radius:var(--radius-card,14px);background:var(--glass-card-background,rgba(255,255,255,.84));box-shadow:var(--glass-card-shadow,0 8px 24px rgba(55,65,80,.05));min-width:0;box-sizing:border-box}
.card-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.card-title{font-size:var(--type-label-size,15px);font-weight:600}.card-meta{color:var(--text-secondary,#737985);font-size:12px;white-space:nowrap}
.address-card{display:flex;align-items:flex-start;gap:12px}.address-detail{flex:1;min-width:0}.contact-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-bottom:6px;font-size:14px}.name{font-weight:600}.phone,.address-text{color:var(--text-secondary,#737985)}.address-text{display:block;overflow-wrap:anywhere;font-size:13px;line-height:1.6}
.spu-order-card+.spu-order-card{border-top:1px solid var(--border-color,#edf0f3);margin-top:10px;padding-top:10px}.sku-order-list{padding-top:4px}.goods-item{display:flex;align-items:center;gap:12px;padding:12px 0;min-width:0}.goods-item+.goods-item{border-top:1px solid var(--border-color,#edf0f3)}.goods-image{width:68px;height:68px;flex:0 0 68px;border-radius:8px}.goods-info{flex:1;min-width:0}.goods-name{display:block;font-size:14px;line-height:1.5;overflow-wrap:anywhere}.sku-name{display:block;margin-top:4px;color:var(--text-secondary,#737985);font-size:11px}.price-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;font-size:13px}.qty{color:var(--text-secondary,#737985);white-space:nowrap}
.share-info-row{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;padding:8px 0;color:var(--text-secondary,#737985);font-size:12px;line-height:1.6}.share-value{color:var(--text-primary,#25272d);overflow-wrap:anywhere;text-align:right;font-variant-numeric:tabular-nums}.refresh-link{padding:4px 0;border:0;background:transparent;margin:0;font-size:12px;line-height:1.5;color:var(--text-secondary,#737985)}.refresh-link:after{border:0}.refresh-link[disabled]{opacity:.5}
@media(min-width:720px){.detail-columns{grid-template-columns:minmax(0,1fr) minmax(240px,30%);grid-template-areas:"address payment" "goods payment" "info payment";align-items:start}.detail-side-column{position:sticky;top:16px;align-self:start}}
@media(max-width:479px){.share-order-detail{padding:12px}.detail-card{padding:15px}.share-info-row{grid-template-columns:60px minmax(0,1fr)}.card-heading{margin-bottom:10px}}
:deep(.checkout-spu-meta){color:var(--text-secondary,#737985)}
</style>
