<template>
  <view class="share-order-detail">
    <view class="detail-columns">
      <view class="detail-main-column">
        <OrderStatusProgress class="status-card" :status="detail.order.orderStatus" :payment-status="detail.order.paymentStatus" :fulfillment-status="detail.order.fulfillmentStatus ?? 0" :text="statusText" :description="statusDescription" :journey-visible="![90,91].includes(detail.order.orderStatus)" :step-labels="['已提交','待付款','待发货','已完成']" />
        <view v-if="detail.receiver" class="detail-card address-card">
          <AppIcon name="address" :size="20" color="#C41E3A" />
          <view class="address-detail"><view class="contact-row"><text class="name">{{ detail.receiver.name }}</text><text class="phone">{{ detail.receiver.phone }}</text></view><text class="address-text">{{ detail.receiver.address }}</text></view>
        </view>
        <view class="detail-card goods-card">
          <view class="card-heading"><text class="card-title">{{ t('share.orderDetail.products') }}</text><text class="card-meta">{{ t('share.orderDetail.productSummary', { count: groups.length, quantity: totalQuantity }) }}</text></view>
          <view v-for="(group, index) in groups" :key="group.key" class="spu-order-card">
            <CheckoutSpuHeader :name="group.name" :meta="group.items.length + ' 个规格 · ' + group.quantity + ' 件'" :amount="'¥' + shareGroupAmount(group)" :collapsed="isGroupCollapsed(group.key, index)" @toggle="toggleGroup(group.key, index)" />
            <view v-show="!isGroupCollapsed(group.key, index)" class="sku-order-list">
              <view v-for="item in group.items" :key="item.skuId" class="goods-item">
                <AppProductImage class="goods-image" :src="item.imageUrl || ''" :show-stock-badge="false" />
                <view class="goods-info"><text class="goods-name">{{ item.specDesc || item.productName }}</text><text class="sku-name">SKU：{{ item.skuId }}</text><view class="price-row"><AmountText :text="'¥' + item.unitPrice" /><text class="qty">× {{ item.quantity }}</text></view></view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="detail-side-column">
        <SharePaymentPanel class="detail-card payment-card" :order="detail.order" :payment="payment" :status="paymentState" :countdown="countdown" />
        <view class="detail-card order-info-card">
          <view class="card-heading"><text class="card-title">{{ t('share.orderDetail.orderInfo') }}</text></view>
          <view class="share-info-row"><text>{{ t('share.orderDetail.orderNo') }}</text><text class="share-value">{{ detail.order.orderNo }}</text></view>
          <view v-if="detail.cancellationNo" class="share-info-row"><text>取消单号</text><text class="share-value">{{ detail.cancellationNo }}</text></view>
          <view v-if="detail.warehouseReleaseState != null" class="share-info-row"><text>取消进度</text><text class="share-value">{{ detail.cancellationState === 5 ? '订单已发货，取消未成功，请查看履约进度' : detail.warehouseReleaseState === 3 ? (detail.refundState === 4 ? '已原路退款' : detail.order.paymentStatus === 3 ? '仓储已确认，退款处理中' : '仓储已确认') : '取消已受理，等待支付及仓储确认' }}</text></view>
          <view class="share-info-row"><text>{{ t('share.orderDetail.deadline') }}</text><text class="share-value">{{ deadlineText }}</text></view>
        </view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { t } from '@/shared/i18n/index.js'
import OrderStatusProgress from '@/shared/ui/OrderStatusProgress/OrderStatusProgress.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import CheckoutSpuHeader from '../../commerce/components/CheckoutSpuHeader.vue'
import SharePaymentPanel from './SharePaymentPanel.vue'
import { shareProductGroups, shareGroupAmount } from '../model/shareOrderPresentation.js'
const props = defineProps({
  detail: { type: Object, required: true },
  payment: { type: Object, default: () => ({}) },
  paymentState: { type: String, required: true },
  countdown: { type: String, default: '' },
})
const groups = computed(() => shareProductGroups(props.detail.items))
const totalQuantity = computed(() => groups.value.reduce((sum, group) => sum + group.quantity, 0))
const collapsedGroups = ref({})
/** 首组默认展开，其余组默认折叠；手动操作优先。 */
function isGroupCollapsed(key, index) { return collapsedGroups.value[key] ?? (index !== 0) }
/** 只改变当前详情的规格可见性，不修改已下单内容。 */
function toggleGroup(key, index) { collapsedGroups.value = { ...collapsedGroups.value, [key]: !isGroupCollapsed(key, index) } }
const deadlineText = computed(() => { const date = new Date(props.detail.order.paymentExpiresAtUtc); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', { hour12:false }) })
const statusText = computed(() => ({20:'待付款',40:'订单处理中',60:'已完成',90:'取消处理中',91:'已取消'}[props.detail.order.orderStatus] || '订单状态更新中'))
const statusDescription = computed(() => props.detail.order.orderStatus === 90 ? '已发起取消，等待仓储释放确认' : props.detail.order.orderStatus === 91 ? '订单已结束，请刷新库存后重新选购' : props.detail.order.paymentStatus === 3 ? '付款已确认' : '请在付款期限内完成支付')
</script>
<style scoped lang="scss">
.share-order-detail { width: 100%; max-width: var(--content-max-width, 1120px); margin: 0 auto; box-sizing: border-box; color: var(--type-body-color); }
.detail-columns { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.detail-main-column, .detail-side-column { display:contents; }
.payment-card { order: 1; }
.goods-card { order: 2; }
.order-info-card { order: 3; }
.detail-card { min-width: 0; padding: var(--module-padding, 16px); border-radius: var(--radius-card, 14px); box-sizing: border-box; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); backdrop-filter: var(--glass-card-blur, blur(16px)); }
.card-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px 12px; margin-bottom: 10px; }
.card-title { display: flex; align-items: center; gap: 8px; color: var(--type-title-color); font-size: var(--type-card-title-size, 16px); line-height: 24px; font-weight: var(--font-weight-semibold, 600); }
.card-title::before { width: 3px; height: 16px; flex: 0 0 3px; border-radius: 2px; background: var(--color-brand, #D7192D); content: ''; }
.card-meta { color: var(--type-secondary-color); font-size: var(--type-body-small-size, 13px); }
.address-card{display:flex;align-items:flex-start;gap:12px}.address-detail{flex:1;min-width:0}.contact-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-bottom:6px;font-size:14px}.name{font-weight:600}.phone,.address-text{color:var(--text-secondary,#737985)}.address-text{display:block;overflow-wrap:anywhere;font-size:13px;line-height:1.6}
.spu-order-card+.spu-order-card{border-top:1px solid var(--border-color,#edf0f3);margin-top:10px;padding-top:10px}.sku-order-list{padding-top:4px}.goods-item{display:flex;align-items:center;gap:12px;padding:12px 0;min-width:0}.goods-item+.goods-item{border-top:1px solid var(--border-color,#edf0f3)}.goods-image{width:68px;height:68px;flex:0 0 68px;border-radius:8px}.goods-info{flex:1;min-width:0}.goods-name{display:block;font-size:14px;line-height:1.5;overflow-wrap:anywhere}.sku-name{display:block;margin-top:4px;color:var(--text-secondary,#737985);font-size:12px;line-height:1.5}.price-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;font-size:13px}.qty{color:var(--text-secondary,#737985);white-space:nowrap}
.share-info-row { display: grid; grid-template-columns: minmax(72px, auto) minmax(0, 1fr); gap: 10px; padding: 8px 0; color: var(--type-secondary-color); font-size: var(--type-body-small-size, 13px); line-height: 1.55; }
.share-info-row + .share-info-row { border-top: 1px solid var(--color-border, #EDF0F3); }
.share-value { color: var(--type-body-color); overflow-wrap: anywhere; text-align: right; font-variant-numeric: tabular-nums; }
@media (min-width:720px) {
  .detail-columns { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr); align-items: start; gap: 10px 14px; }
  .detail-main-column, .detail-side-column { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
}
@media (min-width:720px) and (max-width:1023px) {
  .detail-columns { grid-template-columns: minmax(0, 1fr) minmax(260px, .78fr); gap: 8px 10px; }
}
@media (max-width:1023px) { .detail-card { padding: 12px; } }
:deep(.checkout-spu-name) { font-size:15px; line-height:1.4; }
:deep(.checkout-spu-meta) { color:var(--text-secondary,#737985); font-size:13px; }
:deep(.checkout-spu-total) { font-variant-numeric:tabular-nums; }
</style>
