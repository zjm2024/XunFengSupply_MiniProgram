﻿<!--
  订单详情页面（分包：orderSub）
  对应业务流程节点：
  订单履约发货 → 查看客户可见订单信息、物流进度与可执行操作
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="订单详情" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="order-detail-page" v-if="detail">
          <!-- 状态栏 -->
          <view class="status-header" :class="'status-' + detail.orderStatus">
            <text class="status-text">{{ orderStatusText }}</text>
            <text class="status-desc">{{ orderStatusDesc }}</text>
          </view>

          <!-- 物流信息 -->
          <view class="logistics-card" v-if="detail.shipments && detail.shipments.length > 0" @tap="handleAction('logistics')">
            <view class="logistics-info">
              <AppIcon name="shipping" :size="20" color="#67C23A" />
              <view class="logistics-text">
                <text class="logistics-company">{{ detail.shipments[0]?.carrierName || '物流运输中' }}</text>
                <text class="tracking-no" v-if="detail.shipments[0]?.trackingNo">运单号 {{ detail.shipments[0].trackingNo }}</text>
              </view>
              <AppIcon name="chevron-right" :size="16" color="#CCC" />
            </view>
          </view>

          <!-- 收货地址 -->
          <view class="address-card">
            <view class="address-icon-wrap">
              <AppIcon name="address" :size="20" color="#C41E3A" />
            </view>
            <view class="address-detail">
              <view class="contact-row">
                <text class="name">{{ detail.receiverName || '-' }}</text>
                <text class="phone">{{ detail.receiverPhone || '-' }}</text>
              </view>
              <text class="address-text">{{ fullAddress }}</text>
            </view>
          </view>

          <!-- 商品列表 -->
          <view class="goods-card">
            <view class="card-title">商品信息</view>
            <view
              class="goods-item"
              v-for="item in detail.items"
              :key="item.orderItemId"
            >
              <view class="goods-image-link" @click="goToProductDetail(item)">
                <AppProductImage class="goods-image" :src="item.imageUrl" mode="aspectFill" />
              </view>
              <view class="goods-info">
                <text class="goods-name">{{ item.productName }}</text>
                <text class="sku-name">{{ item.skuName }}</text>
                <view class="price-row">
                  <text class="price">¥{{ Number(item.salePrice || 0).toFixed(2) }}</text>
                  <text class="qty">x{{ item.quantity }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 订单信息 -->
          <view class="info-card">
            <view class="card-title">订单信息</view>
            <view class="info-row">
              <text class="info-label">订单编号</text>
              <text class="info-value copyable" @click="copyText(detail.orderNo)">{{ detail.orderNo }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">下单时间</text>
              <text class="info-value">{{ formatTime(detail.createdAt) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">结算方式</text>
              <text class="info-value">{{ paymentModeText(detail.paymentMode) }}</text>
            </view>
            <view class="info-row" v-if="detail.customerRemark">
              <text class="info-label">发货备注</text>
              <text class="info-value">{{ detail.customerRemark }}</text>
            </view>
          </view>

          <!-- 客户可见的订单进度，不展示内部系统状态与处理日志 -->
          <view class="info-card" v-if="customerTimeline.length > 0">
            <view class="card-title">订单进度</view>
            <view
              class="timeline-item"
              v-for="item in customerTimeline"
              :key="item.key"
            >
              <view class="timeline-dot" />
              <view class="timeline-copy">
                <text class="timeline-title">{{ item.title }}</text>
                <text class="timeline-time">{{ item.time ? formatTime(item.time) : item.description }}</text>
              </view>
            </view>
          </view>

          <!-- 价格明细 -->
          <view class="price-card">
            <view class="price-row">
              <text class="price-label">商品总额</text>
              <text class="price-value">¥{{ Number(detail.goodsAmount || 0).toFixed(2) }}</text>
            </view>
            <view class="price-row" v-if="detail.discountAmount > 0">
              <text class="price-label">优惠金额</text>
              <text class="price-value">-¥{{ Number(detail.discountAmount || 0).toFixed(2) }}</text>
            </view>
            <view class="price-row">
              <text class="price-label">运费</text>
              <text class="price-value">¥{{ Number(detail.freightAmount || 0).toFixed(2) }}</text>
            </view>
            <view class="price-row total">
              <text class="price-label">应付金额</text>
              <text class="price-value highlight">¥{{ Number(detail.payableAmount || 0).toFixed(2) }}</text>
            </view>
            <view class="price-row" v-if="detail.paidAmount > 0">
              <text class="price-label">已支付</text>
              <text class="price-value">¥{{ Number(detail.paidAmount || 0).toFixed(2) }}</text>
            </view>
            <view class="price-row" v-if="detail.refundedAmount > 0">
              <text class="price-label">已退款</text>
              <text class="price-value">¥{{ Number(detail.refundedAmount || 0).toFixed(2) }}</text>
            </view>
          </view>

          <!-- 底部占位，避免内容被 FixedActionBar 遮挡 -->
          <view class="bottom-space" v-if="actionButtons.length > 0" />
        </view>

        <AppInitializing
          v-else
          class="order-initializing"
          title="正在加载订单"
          description="正在同步订单与履约进度"
          :fill="true"
        />
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar v-if="actionButtons.length > 0">
        <button
          v-for="action in actionButtons"
          :key="action.key"
          class="action-btn"
          :class="action.type"
          :disabled="action.type === 'disabled'"
          @click="handleAction(action.key)"
        >{{ action.label }}</button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrderDetail, confirmReceipt, generateClientRequestId } from '../../api/orderApi.js'
import { FULFILLMENT_STATUS, ORDER_STATUS, ORDER_STATUS_MAP, PAYMENT_MODE, PAYMENT_STATUS } from '@/app/config/constant.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppInitializing from '@/shared/ui/AppInitializing/AppInitializing.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { batchAddToCart } from '@/shared/api/cartApi.js'
import { buildReorderCartItems } from '../../domain/reorderCart.js'

const orderId = ref(null)
const detail = ref(null)
const reordering = ref(false)

onLoad(async (options) => {
  if (options.orderId) {
    orderId.value = Number(options.orderId)
    await loadOrderDetail()
  }
})

/**
 * 加载订单详情
 */
async function loadOrderDetail() {
  try {
    const res = await getOrderDetail(orderId.value)
    detail.value = res
  } catch (e) {
    console.error('加载订单详情失败:', e)
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
}

// 完整地址
const fullAddress = computed(() => {
  if (!detail.value) return ''
  const d = detail.value
  return `${d.receiverProvince || ''}${d.receiverCity || ''}${d.receiverDistrict || ''}${d.receiverAddress || ''}`
})

// 状态文本映射
const orderStatusText = computed(() => {
  return ORDER_STATUS_MAP[detail.value?.orderStatus]?.text || '未知'
})

const orderStatusDesc = computed(() => {
  const map = {
    [ORDER_STATUS.DRAFT]: '订单已创建',
    [ORDER_STATUS.PENDING_REVIEW]: '您的订单正在由品牌方审核中',
    [ORDER_STATUS.REVIEW_REJECTED]: '订单审核未通过',
    [ORDER_STATUS.PENDING_PAYMENT]: '请在付款时限内完成支付',
    [ORDER_STATUS.PROCESSING]: processingStatusDescription.value,
    [ORDER_STATUS.COMPLETED]: '订单已完成，感谢您的购买',
    [ORDER_STATUS.CANCELLING]: '订单正在关闭，退款将按原支付方式处理',
    [ORDER_STATUS.CANCELLED]: '订单已取消',
  }
  return map[detail.value?.orderStatus] || ''
})

/** 根据客户可理解的履约阶段生成状态说明，屏蔽内部系统与消息处理细节。 */
const processingStatusDescription = computed(() => {
  const fulfillmentStatus = Number(detail.value?.fulfillmentStatus || 0)
  if (fulfillmentStatus >= FULFILLMENT_STATUS.SHIPPED) return '商品已发出，请留意物流进度'
  if (fulfillmentStatus >= FULFILLMENT_STATUS.PICKING) return '商品正在备货，请耐心等待发出'
  return '订单已确认，正在为您安排发货'
})

/** 仅使用客户旅程节点生成时间线，不渲染 ERP、WMS、Outbox 等内部日志。 */
const customerTimeline = computed(() => {
  if (!detail.value) return []
  const order = detail.value
  const timeline = [{ key: 'created', title: '订单已提交', time: order.createdAt }]
  if (Number(order.paymentStatus) === PAYMENT_STATUS.CONFIRMED) {
    timeline.push({ key: 'paid', title: '付款已完成', description: '付款信息已确认' })
  }
  if (order.stockConfirmedAt) {
    timeline.push({ key: 'stock-confirmed', title: '商品已确认', time: order.stockConfirmedAt })
  }
  if (order.shippedAt) {
    timeline.push({ key: 'shipped', title: '商品已发出', time: order.shippedAt })
  }
  if (order.completedAt) {
    timeline.push({ key: 'completed', title: '订单已完成', time: order.completedAt })
  }
  if (order.cancelledAt) {
    timeline.push({ key: 'cancelled', title: '订单已取消', time: order.cancelledAt })
  }
  return timeline
})

// 可用操作按钮（基于后端 AllowedActions 或前端状态映射）
const actionButtons = computed(() => {
  if (!detail.value) return []

  const reorderAction = {
    key: 'reorder',
    label: reordering.value ? '加入中…' : '再来一单',
    type: reordering.value ? 'disabled' : 'default',
  }

  // 优先使用后端返回的 AllowedActions
  if (detail.value.allowedActions && detail.value.allowedActions.length > 0) {
    const mappedActions = detail.value.allowedActions.map(action => {
      const actionMap = {
        'pay': { key: 'pay', label: '立即付款', type: 'primary' },
        'splitFulfillment': { key: 'splitFulfillment', label: '安排多地配送', type: 'primary' },
        'viewFulfillmentSplits': { key: 'splitFulfillment', label: '查看配送安排', type: 'default' },
        'cancel': { key: 'cancel', label: '取消订单', type: 'default' },
        'confirm_receipt': { key: 'receive', label: '确认收货', type: 'primary' },
        'confirmReceipt': { key: 'receive', label: '确认收货', type: 'primary' },
        'logistics': detail.value.shipments?.length ? null : { key: 'logistics', label: '查看物流', type: 'default' },
        'after_sale': { key: 'afterSale', label: '申请售后', type: 'default' },
        'afterSale': { key: 'afterSale', label: '申请售后', type: 'default' },
      }
      return actionMap[action] || null
    }).filter(Boolean)
    return [reorderAction, ...mappedActions]
      .sort((left, right) => Number(left.type === 'primary') - Number(right.type === 'primary'))
  }

  // 降级：前端状态映射
  const s = detail.value.orderStatus
  const actions = [reorderAction]
  if (s === ORDER_STATUS.PENDING_PAYMENT) actions.push({ key: 'pay', label: '立即付款', type: 'primary' })
  if ([ORDER_STATUS.PENDING_REVIEW, ORDER_STATUS.PENDING_PAYMENT].includes(s)) {
    actions.push({ key: 'cancel', label: '取消订单', type: 'default' })
  }
  const fulfillmentStatus = Number(detail.value.fulfillmentStatus || 0)
  if (s === ORDER_STATUS.PROCESSING && fulfillmentStatus >= FULFILLMENT_STATUS.SHIPPED) {
    actions.push({ key: 'receive', label: '确认收货', type: 'primary' })
  }
  if (fulfillmentStatus >= FULFILLMENT_STATUS.SHIPPED) {
    actions.push({ key: 'logistics', label: '查看物流', type: 'default' })
    actions.push({ key: 'afterSale', label: '申请售后', type: 'default' })
  }
  return actions
})

function paymentModeText(mode) {
  return ({
    [PAYMENT_MODE.CASH]: '现款支付',
    [PAYMENT_MODE.CREDIT]: '授信支付',
    [PAYMENT_MODE.COMBINATION]: '账户组合支付',
  })[Number(mode)] || '未知方式'
}

/**
 * 格式化时间
 */
function formatTime(timeStr) {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function copyText(text) {
  uni.setClipboardData({ data: text })
}

/**
 * 跳转商品详情
 */
function goToProductDetail(item) {
  const productId = item.productId || item.ProductId
  if (!productId) return
  navigator.navigateTo(routes.commerce.productDetail(productId))
}

/**
 * 将原订单中的普通商品按原数量一次性加入购物车，并进入购物车确认当前价格与库存。
 * 赠品不直接加购，促销资格会在重新结算时由服务端计算。
 */
async function reorderToCart() {
  if (reordering.value) return
  const items = buildReorderCartItems(detail.value?.items)
  if (!items.length) {
    uni.showToast({ title: '该订单暂无可再次购买的商品', icon: 'none' })
    return
  }

  reordering.value = true
  try {
    await batchAddToCart({ items, clientRequestId: generateClientRequestId() })
    uni.showToast({ title: '已加入购物车', icon: 'success' })
    setTimeout(() => navigator.navigateTo(routes.commerce.cart()), 350)
  } catch (error) {
    uni.showToast({ title: error?.message || '商品状态已变化，请稍后重试', icon: 'none' })
  } finally {
    reordering.value = false
  }
}

async function handleAction(key) {
  switch (key) {
    case 'reorder':
      await reorderToCart()
      break
    case 'pay':
      navigator.navigateTo(routes.order.pay(orderId.value))
      break
    case 'splitFulfillment':
      navigator.navigateTo(routes.order.fulfillmentSplit(orderId.value))
      break
    case 'cancel':
      navigator.navigateTo(routes.order.cancelOrder(orderId.value))
      break
    case 'receive':
      uni.showModal({
        title: '提示',
        content: '确定已收到商品吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await confirmReceipt({
                orderId: orderId.value,
                clientRequestId: generateClientRequestId(),
              })
              uni.showToast({ title: '已确认收货', icon: 'success' })
              setTimeout(() => loadOrderDetail(), 1000)
            } catch (e) {
              uni.showToast({ title: e.message || '操作失败', icon: 'none' })
            }
          }
        }
      })
      break
    case 'logistics':
      if (detail.value?.shipments?.[0]?.trackingNo) {
        copyText(detail.value.shipments[0].trackingNo)
        uni.showToast({ title: '运单号已复制', icon: 'none' })
      } else {
        uni.showToast({ title: '暂未生成物流信息', icon: 'none' })
      }
      break
    case 'afterSale':
      navigator.navigateTo(routes.order.afterSaleApply(orderId.value))
      break
  }
}
</script>

<style lang="scss" scoped>
.order-detail-page {
  min-height: 100%;
  background: var(--bg-color);
}

.order-initializing { min-height: 68vh; }

.status-header {
  margin: 12px;
  padding: 20px 18px;
  color: var(--text-primary);
  background: #fff;
  border: 1px solid rgba(215, 25, 45, 0.16);
  border-left: 4px solid var(--primary-color);
  border-radius: 14px;

  &.status-11, &.status-91 { border-left-color: #8B8E96; }

  .status-text {
    display: block;
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 10rpx;
  }

  .status-desc {
    font-size: 14px;
    color: var(--text-secondary);
  }
}

.logistics-card, .address-card, .goods-card, .info-card, .price-card {
  background: #fff;
  margin: 16rpx 24rpx;
  border-radius: 12rpx;
  padding: 28rpx 32rpx;

  .card-title {
    font-size: 30rpx;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20rpx;
  }
}

.logistics-info {
  display: flex;
  align-items: center;

  .logistics-text {
    flex: 1;
    margin-left: 16rpx;

    .logistics-company {
      display: block;
      font-size: 28rpx;
      color: var(--text-primary);
    }

    .tracking-no {
      display: block;
      font-size: 24rpx;
      color: var(--text-placeholder);
      margin-top: 6rpx;
    }
  }
}

.address-card {
  display: flex;
  align-items: flex-start;

  .address-icon-wrap {
    margin-right: 16rpx;
    padding-top: 4rpx;
  }

  .address-detail {
    flex: 1;

    .contact-row {
      margin-bottom: 8rpx;

      .name {
        font-size: 30rpx;
        font-weight: 600;
        color: var(--text-primary);
        margin-right: 20rpx;
      }

      .phone {
        font-size: 28rpx;
        color: var(--text-secondary);
      }
    }

    .address-text {
      font-size: 26rpx;
      color: var(--text-secondary);
      line-height: 1.5;
    }
  }
}

.goods-item {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child { border-bottom: none; }

  .goods-image-link {
    flex-shrink: 0;
    cursor: pointer;
    transition: opacity 150ms ease;

    &:active {
      opacity: 0.75;
    }
  }

  .goods-image {
    width: 150rpx;
    height: 150rpx;
    border-radius: 8rpx;
  }

  .goods-info {
    flex: 1;
    margin-left: 20rpx;

    .goods-name {
      font-size: 28rpx;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .sku-name {
      display: block;
      font-size: 24rpx;
      color: var(--text-placeholder);
      margin-top: 8rpx;
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 12rpx;

      .price {
        font-size: 30rpx;
        font-weight: 700;
        color: var(--primary-color);
      }

      .qty {
        font-size: 26rpx;
        color: var(--text-secondary);
      }
    }
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 14rpx 0;

  .info-label {
    font-size: 26rpx;
    color: var(--text-secondary);
  }

  .info-value {
    font-size: 26rpx;
    color: var(--text-primary);

    &.copyable {
      color: var(--primary-color);
    }
  }
}

.log-item {
  display: flex;
  flex-direction: column;
  padding: 12rpx 0;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child { border-bottom: none; }

  .log-time {
    font-size: 22rpx;
    color: var(--text-placeholder);
    margin-bottom: 6rpx;
  }

  .log-text {
    font-size: 26rpx;
    color: var(--text-secondary);
  }
}

.price-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;

  .price-label {
    font-size: 26rpx;
    color: var(--text-secondary);
  }

  .price-value {
    font-size: 26rpx;
    color: var(--text-primary);

    &.highlight {
      font-size: 34rpx;
      font-weight: 700;
      color: var(--primary-color);
    }
  }

  &.total {
    border-top: 1rpx solid var(--border-color);
    margin-top: 8rpx;
    padding-top: 20rpx;
  }
}

.action-btn {
  min-width: 180rpx;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  font-size: 28rpx;
  border-radius: 34rpx;
  border: none;
  padding: 0 24rpx;

  &.primary {
    background: var(--primary-color);
    color: #fff;
  }

  &.default {
    background: transparent;
    color: var(--text-primary);
    border: 1rpx solid var(--border-color);
  }
}
</style>

<style lang="scss" scoped>
/* 成品页覆盖层：统一使用项目字体与间距 token，并保持 390px/800px 两档布局。 */
.order-detail-page { width: 100%; max-width: 1120px; min-height: 100%; margin: 0 auto; padding: 12px 14px 28px; box-sizing: border-box; background: transparent; }
.status-header { margin: 0 0 14px; padding: 20px 18px; border: 0; border-left: 4px solid var(--color-brand, #D7192D); border-radius: var(--radius-feature, 18px); background: var(--surface-card, #FFF); box-shadow: var(--shadow-sm); }
.status-header .status-text { margin-bottom: 5px; color: var(--type-title-color); font-size: var(--type-page-title-size, 20px); line-height: var(--type-page-title-line-height, 32px); }
.status-header .status-desc { color: var(--type-secondary-color); font-size: var(--type-body-small-size, 13px); line-height: var(--type-body-small-line-height, 20px); }
.logistics-card, .address-card, .goods-card, .info-card, .price-card { margin: 0 0 12px; padding: 16px; border-radius: var(--radius-card, 14px); background: var(--surface-card, #FFF); box-shadow: var(--shadow-sm); box-sizing: border-box; }
.logistics-card:active { opacity: .72; }
.logistics-info { min-height: 42px; }
.logistics-info .logistics-text { margin-left: 12px; }
.logistics-info .logistics-text .logistics-company { color: var(--type-title-color); font-size: var(--type-body-size, 14px); font-weight: 650; }
.logistics-info .logistics-text .tracking-no { margin-top: 3px; color: var(--type-muted-color); font-size: var(--type-micro-size, 11px); }
.address-card { gap: 11px; }
.address-card .address-icon-wrap { margin: 0; padding-top: 1px; }
.address-card .address-detail .contact-row { margin-bottom: 5px; }
.address-card .address-detail .contact-row .name { margin-right: 10px; color: var(--type-title-color); font-size: var(--type-label-size, 15px); }
.address-card .address-detail .contact-row .phone { color: var(--type-secondary-color); font-size: var(--type-body-small-size, 13px); }
.address-card .address-detail .address-text { color: var(--type-secondary-color); font-size: var(--type-body-small-size, 13px); line-height: 20px; }
.goods-card .card-title, .info-card .card-title { margin-bottom: 10px; color: var(--type-title-color); font-size: var(--type-card-title-size, 16px); line-height: var(--type-card-title-line-height, 24px); }
.goods-item { min-height: 82px; padding: 12px 0; border-bottom: 1px solid #EEF0F2; }
.goods-item .goods-image { width: 78px; height: 78px; border-radius: var(--radius-control, 10px); }
.goods-item .goods-info { display: flex; min-width: 0; flex-direction: column; margin-left: 13px; }
.goods-item .goods-info .goods-name { color: var(--type-title-color); font-size: var(--type-body-size, 14px); line-height: 20px; }
.goods-item .goods-info .sku-name { margin-top: 4px; color: var(--type-muted-color); font-size: var(--type-micro-size, 11px); }
.goods-item .goods-info .price-row { margin-top: auto; padding-top: 8px; }
.goods-item .goods-info .price-row .price { color: var(--color-brand, #D7192D); font-size: var(--type-label-size, 15px); }
.goods-item .goods-info .price-row .qty { color: var(--type-secondary-color); font-size: var(--type-caption-size, 12px); }
.info-row, .price-row { gap: 18px; padding: 8px 0; }
.info-row .info-label, .price-row .price-label { flex: 0 0 auto; color: var(--type-secondary-color); font-size: var(--type-body-small-size, 13px); }
.info-row .info-value, .price-row .price-value { min-width: 0; color: var(--type-title-color); font-size: var(--type-body-small-size, 13px); text-align: right; overflow-wrap: anywhere; }
.price-row.total { margin-top: 7px; padding-top: 14px; border-top: 1px solid #EEF0F2; }
.price-row .price-value.highlight { color: var(--color-brand, #D7192D); font-size: var(--type-money-size, 18px); }
.timeline-item { position: relative; display: flex; gap: 12px; min-height: 48px; padding-bottom: 8px; }
.timeline-item:not(:last-child)::before { content: ''; position: absolute; top: 17px; left: 5px; bottom: -2px; width: 1px; background: #E6E8EB; }
.timeline-dot { position: relative; z-index: 1; width: 11px; height: 11px; flex: 0 0 11px; margin-top: 5px; border: 3px solid #FFE3E7; border-radius: 50%; background: var(--color-brand, #D7192D); box-sizing: border-box; }
.timeline-copy { min-width: 0; flex: 1; }
.timeline-title, .timeline-time { display: block; }
.timeline-title { color: var(--type-title-color); font-size: var(--type-body-small-size, 13px); font-weight: 650; }
.timeline-time { margin-top: 2px; color: var(--type-muted-color); font-size: var(--type-micro-size, 11px); }
.bottom-space { height: 76px; }
.action-btn { display: flex; min-width: 0; height: 44px; flex: 1 1 0; align-items: center; justify-content: center; margin: 0; padding: 0 10px; border: 1px solid var(--color-border, #DDE0E4); border-radius: var(--radius-control, 10px); box-sizing: border-box; color: var(--type-title-color); background: #FFF; font-size: var(--type-button-size, 14px); font-weight: 650; line-height: 1; white-space: nowrap; }
.action-btn.primary { border-color: var(--color-brand, #D7192D); color: #FFF; background: var(--color-brand, #D7192D); }
.action-btn.default { border-color: var(--color-border, #DDE0E4); color: var(--type-title-color); background: #FFF; }
.action-btn.disabled { color: #A8ABB2; background: #ECEEF2; }
@media (min-width: 800px) {
  .order-detail-page { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, .8fr); align-items: start; gap: 14px; padding: 20px; }
  .status-header, .logistics-card, .address-card, .goods-card { grid-column: 1; }
  .info-card, .price-card { grid-column: 2; }
  .status-header { grid-row: 1; }
  .logistics-card { grid-row: 2; }
  .address-card { grid-row: 3; }
  .goods-card { grid-row: 4 / span 4; }
  .info-card { margin-bottom: 0; }
  .price-card { margin-bottom: 0; }
  .bottom-space { display: none; }
}
</style>
