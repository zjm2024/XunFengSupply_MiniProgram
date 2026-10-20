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
      <AppContent padding="0">
        <view class="order-detail-page" :class="{ 'has-logistics': detail?.shipments?.length > 0 }" v-if="detail">
          <view class="detail-columns">
            <view class="detail-main-column">
          <!-- 淘宝式订单状态进度 -->
          <OrderStatusProgress
            :status="detail.orderStatus"
            :payment-status="detail.paymentStatus"
            :fulfillment-status="detail.fulfillmentStatus"
            :text="orderStatusText"
            :description="orderStatusDesc"
          />

          <!-- 物流信息 -->
          <view class="logistics-card" v-if="detail.shipments && detail.shipments.length > 0" @tap="handleAction('viewLogistics')">
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
          <view v-if="detail.orderSource !== 'ERP_MANUAL'" class="address-card">
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
            <view v-if="productGroups.length" class="spu-order-list">
              <view v-for="group in productGroups" :key="group.key" class="spu-order-card">
                <view class="spu-order-header" @tap="toggleProductGroup(group.key)">
                  <view class="spu-image-link" @tap.stop="goToProductDetail(group.items[0])">
                    <AppProductImage class="spu-image" :src="group.image" mode="aspectFill" />
                  </view>
                  <view class="spu-order-copy">
                    <text class="spu-order-name">{{ group.name }}</text>
                    <text class="spu-order-meta">{{ group.items.length }} 个 SKU · 共 {{ group.totalQuantity }} 件</text>
                  </view>
                  <text class="spu-order-total">¥{{ group.totalAmount.toFixed(2) }}</text>
                  <view class="spu-collapse-button">
                    <AppIcon
                      name="chevron-right"
                      :size="16"
                      class="spu-collapse-icon"
                      :class="{ expanded: !isProductGroupCollapsed(group.key) }"
                    />
                  </view>
                </view>

                <view v-show="!isProductGroupCollapsed(group.key)" class="sku-order-list">
                  <view
                    v-for="item in group.items"
                    :key="item.orderItemId || item.skuId"
                    class="goods-item"
                  >
                    <view class="goods-image-link" @tap="goToProductDetail(item)">
                      <AppProductImage class="goods-image" :src="item.image" mode="aspectFill" />
                    </view>
                    <view class="goods-info">
                      <text class="goods-name">{{ item.skuName || '默认规格' }}</text>
                      <text class="sku-name">SKU：{{ item.skuCode || item.skuId || '-' }}</text>
                      <view class="price-row">
                        <text class="price">¥{{ Number(item.salePrice || 0).toFixed(2) }}</text>
                        <text class="qty">x{{ item.quantity }}</text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- ERP 最终审批前的配送安排入口。 -->
          <view v-if="showFulfillmentCard" class="split-card fulfillment-arrange-card">
            <view class="fulfillment-arrange-head">
              <view class="fulfillment-arrange-copy">
                <text class="card-title">配送安排</text>
                <text class="fulfillment-arrange-summary">{{ fulfillmentSummary }}</text>
              </view>
              <button
                class="arrange-button"
                :disabled="!canArrangeFulfillment"
                @tap="goToFulfillmentSplit"
              >安排配送</button>
            </view>
            <text v-if="!canArrangeFulfillment && detail.fulfillmentDisabledReason" class="fulfillment-disabled-reason">
              {{ detail.fulfillmentDisabledReason }}
            </text>
          </view>

          <!-- 拆单与实际发货数量：母单详情只展示 ERP/WMS 已确认的事实。 -->
          <view v-if="detail.fulfillmentSplits && detail.fulfillmentSplits.length" class="split-card">
            <view class="card-title">配送拆单</view>
            <view v-for="split in detail.fulfillmentSplits" :key="split.splitId || split.splitNo" class="split-block">
              <view class="split-header">
                <view class="split-heading">
                  <text class="split-name">{{ split.splitName || `配送单${split.sequenceNo || ''}` }}</text>
                  <text class="split-no">{{ split.splitNo || '-' }}</text>
                </view>
                <text class="split-status" :class="splitStatusClass(split.status)">{{ splitStatusText(split.status) }}</text>
              </view>
              <text v-if="split.fullAddress" class="split-address">配送至：{{ split.fullAddress }}</text>
              <view v-for="item in split.items" :key="`${split.splitId}-${item.orderItemId}`" class="split-item">
                <text class="split-item-name">{{ item.skuName || item.productName || '商品' }}</text>
                <text class="split-item-qty">应发 {{ item.quantity }} · 实发 {{ item.shippedQuantity }}</text>
              </view>
               <view class="split-total">
                 <text>本子单合计</text>
                 <text>应发 {{ split.totalQuantity }} · 实发 {{ split.shippedQuantity }}</text>
               </view>
               <text v-if="split.erpReviewStatus === ERP_REVIEW_STATUS.REJECTED && split.erpReviewReasonMessage" class="split-failure">
                 配送安排未通过：{{ split.erpReviewReasonMessage }}。请重新安排配送。
               </text>
             </view>
          </view>

            </view>

            <view class="detail-side-column">
          <!-- 订单信息 -->
          <view class="info-card order-info-card">
            <view class="card-title">订单信息</view>
            <view class="info-row">
              <text class="info-label">订单编号</text>
              <text class="info-value copyable" @click="copyText(detail.orderNo)">{{ detail.orderNo }}</text>
            </view>
            <view v-if="detail.orderSource === 'ERP_MANUAL'" class="info-row">
              <text class="info-label">订单来源</text>
              <text class="info-value">ERP手工单</text>
            </view>
            <view v-if="detail.orderSource === 'ERP_MANUAL' && detail.erpOrderNo" class="info-row">
              <text class="info-label">ERP单号</text>
              <text class="info-value copyable" @click="copyText(detail.erpOrderNo)">{{ detail.erpOrderNo }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">下单时间</text>
              <text class="info-value">{{ formatDateTime(detail.createdAt) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">结算方式</text>
              <text class="info-value">{{ detail.orderSource === 'ERP_MANUAL' ? '账户本金支付' : paymentModeText(detail.paymentMode, detail.paymentStatus, detail.orderStatus) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">支付状态</text>
              <text class="info-value" :style="{ color: paymentStatus.color }">{{ paymentStatus.text }}</text>
            </view>
            <view v-if="detail.orderSource !== 'ERP_MANUAL'" class="info-row">
              <text class="info-label">订单确认</text>
              <text class="info-value">{{ confirmationStatusText }}</text>
            </view>
            <view class="info-row" v-if="detail.customerRemark">
              <text class="info-label">发货备注</text>
              <text class="info-value">{{ detail.customerRemark }}</text>
            </view>
          </view>

          <view
            v-if="detail.orderStatus === ORDER_STATUS.CANCELLED && cancellationReasonText"
            class="info-card cancellation-card"
          >
            <view class="card-title">取消说明</view>
            <view class="info-row">
              <text class="info-label">取消原因</text>
              <text class="info-value cancellation-reason">{{ cancellationReasonText }}</text>
            </view>
          </view>

          <!-- 客户可见的订单进度，不展示内部系统状态与处理日志 -->
          <view class="info-card timeline-card" v-if="customerTimeline.length > 0">
            <view class="card-title">订单进度</view>
            <view
              class="timeline-item"
              v-for="item in customerTimeline"
              :key="item.key"
            >
              <view class="timeline-dot" />
              <view class="timeline-copy">
                <text class="timeline-title">{{ item.title }}</text>
                <text class="timeline-time">{{ item.time ? formatDateTime(item.time) : item.description }}</text>
              </view>
            </view>
          </view>

          <!-- 价格明细 -->
          <view class="price-card summary-card">
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
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getOrderDetail, confirmReceipt, generateClientRequestId } from '../../api/orderApi.js'
import { FULFILLMENT_STATUS, ORDER_STATUS, ORDER_STATUS_MAP, PAYMENT_MODE, PAYMENT_STATUS, PAYMENT_STATUS_MAP } from '@/app/config/constant.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppInitializing from '@/shared/ui/AppInitializing/AppInitializing.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import OrderStatusProgress from '@/shared/ui/OrderStatusProgress/OrderStatusProgress.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { batchAddToCart } from '@/shared/api/cartApi.js'
import { buildReorderCartItems } from '../../domain/reorderCart.js'
import { formatDateTime } from '../../../../shared/utils/format.js'
import { getOrderActionButtons } from '../../model/orderActions.js'


const orderId = ref(null)
const detail = ref(null)
const reordering = ref(false)
const collapsedProductGroups = ref({})

onLoad(async (options) => {
  if (options.orderId) {
    orderId.value = Number(options.orderId)
    await loadOrderDetail()
  }
})

onShow(() => {
  if (orderId.value) loadOrderDetail()
})

/**
 * 加载订单详情
 */
async function loadOrderDetail() {
  try {
    const res = await getOrderDetail(orderId.value)
    detail.value = res
    collapsedProductGroups.value = {}
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

// 状态文本映射：订单主状态优先，其次是支付，再补充 ERP 确认和履约阶段。
const orderStatusText = computed(() => {
  const status = Number(detail.value?.orderStatus)
  if (status === ORDER_STATUS.CANCELLING) return '取消处理中'
  if (status === ORDER_STATUS.CANCELLED) return '已取消'
  if (status === ORDER_STATUS.COMPLETED) return '交易完成'
  if (isActivePaymentPending.value) return paymentProgressTitle.value
  if (confirmationDisplay.value) return confirmationDisplay.value.title
  if (isPaymentConfirmedBeforeProcessing.value || status === ORDER_STATUS.PROCESSING) {
    return processingStatusTitle.value
  }
  return ORDER_STATUS_MAP[detail.value?.orderStatus]?.text || '状态同步中'
})

const orderStatusDesc = computed(() => {
  const status = Number(detail.value?.orderStatus)
  if (status === ORDER_STATUS.CANCELLING) {
    return cancellationReasonText.value || '订单取消处理中，请稍候查看退款结果'
  }
  if (status === ORDER_STATUS.CANCELLED) {
    return cancellationReasonText.value || '订单已取消，相关退款将按原支付方式处理'
  }
  if (status === ORDER_STATUS.COMPLETED) {
    return detail.value?.orderSource === 'ERP_MANUAL'
      ? 'ERP手工订单已扣款、扣库存并完成'
      : '交易已完成，感谢您的采购'
  }
  if (isActivePaymentPending.value) return paymentProgressDescription.value
  if (confirmationDisplay.value) return confirmationDisplay.value.description
  if (isPaymentConfirmedBeforeProcessing.value || status === ORDER_STATUS.PROCESSING) {
    return processingStatusDescription.value
  }
  const map = {
    [ORDER_STATUS.DRAFT]: '订单草稿已保存',
    [ORDER_STATUS.PENDING_REVIEW]: '订单正在确认中',
    [ORDER_STATUS.REVIEW_REJECTED]: '订单确认未通过',
    [ORDER_STATUS.PENDING_PAYMENT]: '请在付款时限内完成支付',
  }
  return map[status] || ''
})

/** 根据履约状态生成客户可理解的阶段标题，屏蔽内部系统与消息处理细节。 */
const processingStatusTitle = computed(() => {
  const fulfillmentStatus = Number(detail.value?.fulfillmentStatus || 0)
  if (fulfillmentStatus >= FULFILLMENT_STATUS.SHIPPED) return '配送中'
  if (fulfillmentStatus >= FULFILLMENT_STATUS.PICKING) return '备货中'
  return '待发货'
})

/** 根据客户可理解的履约阶段生成状态说明，屏蔽内部系统与消息处理细节。 */
const processingStatusDescription = computed(() => {
  const fulfillmentStatus = Number(detail.value?.fulfillmentStatus || 0)
  if (fulfillmentStatus >= FULFILLMENT_STATUS.SHIPPED) return '商品配送中，请留意物流进度'
  if (fulfillmentStatus >= FULFILLMENT_STATUS.PICKING) return '商品正在备货，请耐心等待发出'
  return '订单确认完成，等待仓库发货'
})
const ERP_REVIEW_STATUS = Object.freeze({
  LEGACY_UNTRACKED: 0,
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
  REJECTED_AFTER_SHIPMENT: 4,
  DECISION_CONFLICT: 5,
})

/** 将 ERP 审核转换为客户可理解的订单确认文案。 */
const confirmationDisplay = computed(() => {
  const orderStatus = Number(detail.value?.orderStatus)
  if (orderStatus === ORDER_STATUS.CANCELLING || orderStatus === ORDER_STATUS.CANCELLED) {
    return null
  }

  // 未支付时先展示支付状态，避免“待付款”订单被 ERP 确认文案覆盖。
  const paymentStatus = Number(detail.value?.paymentStatus)
  if ((orderStatus === ORDER_STATUS.PENDING_PAYMENT || orderStatus === ORDER_STATUS.PROCESSING)
    && paymentStatus !== PAYMENT_STATUS.CONFIRMED) {
    return null
  }

  const status = Number(detail.value?.erpReviewStatus)
  if (status === ERP_REVIEW_STATUS.PENDING) {
    return {
      title: '订单确认中',
      description: detail.value?.confirmationMessage || '正在确认订单，结果将通过消息通知',
    }
  }
  if (status === ERP_REVIEW_STATUS.REJECTED) {
    return {
      title: '订单未通过确认',
      description: detail.value?.erpReviewReasonMessage || '订单确认未通过，请查看订单说明',
    }
  }
  if (status === ERP_REVIEW_STATUS.REJECTED_AFTER_SHIPMENT
    || status === ERP_REVIEW_STATUS.DECISION_CONFLICT) {
    return { title: '订单确认待处理', description: '订单确认结果异常，客服正在处理' }
  }
  return null
})
const confirmationStatusText = computed(() => {
  const status = Number(detail.value?.erpReviewStatus)
  return ({
    [ERP_REVIEW_STATUS.LEGACY_UNTRACKED]: '历史订单',
    [ERP_REVIEW_STATUS.PENDING]: '确认中',
    [ERP_REVIEW_STATUS.APPROVED]: '已确认',
    [ERP_REVIEW_STATUS.REJECTED]: '未通过',
    [ERP_REVIEW_STATUS.REJECTED_AFTER_SHIPMENT]: '异常待处理',
    [ERP_REVIEW_STATUS.DECISION_CONFLICT]: '异常待处理',
  })[status] || '状态同步中'
})

const isActivePaymentPending = computed(() => {
  const status = Number(detail.value?.orderStatus)
  const paymentStatus = Number(detail.value?.paymentStatus)
  if (status === ORDER_STATUS.CANCELLING || status === ORDER_STATUS.CANCELLED) return false
  return (status === ORDER_STATUS.PENDING_PAYMENT || status === ORDER_STATUS.PROCESSING)
    && paymentStatus !== PAYMENT_STATUS.CONFIRMED
})
const isPaymentConfirmedBeforeProcessing = computed(() => {
  return Number(detail.value?.orderStatus) === ORDER_STATUS.PENDING_PAYMENT
    && Number(detail.value?.paymentStatus) === PAYMENT_STATUS.CONFIRMED
})

const paymentProgressTitle = computed(() => {
  const status = Number(detail.value?.paymentStatus)
  if (status === PAYMENT_STATUS.PAYING) return '支付处理中'
  if (status === PAYMENT_STATUS.PARTIALLY_PAID) return '部分支付'
  if (status === PAYMENT_STATUS.FAILED) return '支付失败'
  if (status === PAYMENT_STATUS.UNKNOWN) return '支付结果待确认'
  return '待付款'
})

const paymentProgressDescription = computed(() => {
  const status = Number(detail.value?.paymentStatus)
  if (status === PAYMENT_STATUS.PAYING) return '支付结果确认中，请稍候刷新订单状态'
  if (status === PAYMENT_STATUS.PARTIALLY_PAID) return '订单尚未完成全额支付，请继续完成付款'
  if (status === PAYMENT_STATUS.FAILED) return '本次支付未完成，请重新发起支付'
  if (status === PAYMENT_STATUS.UNKNOWN) return '支付结果待确认，请勿重复支付'
  return '请在付款时限内完成支付'
})

const paymentStatus = computed(() => {
  return PAYMENT_STATUS_MAP[detail.value?.paymentStatus]
    || { text: '支付状态未知', color: '#707783' }
})

const cancellationReasonText = computed(() => {
  if (!detail.value?.cancellationReason) return ''
  return detail.value.cancellationReasonCode === 'PAYMENT_TIMEOUT'
    ? `${detail.value.cancellationReason}（本地库存占用已释放）`
    : detail.value.cancellationReason
})

/** 仅使用客户旅程节点生成时间线，不渲染 ERP、WMS、Outbox 等内部日志。 */
const customerTimeline = computed(() => {
  if (!detail.value) return []
  const order = detail.value
  const timeline = [{ key: 'created', title: '订单已提交', time: order.createdAt }]
  if (Number(order.erpReviewStatus) === ERP_REVIEW_STATUS.APPROVED) {
    timeline.push({ key: 'confirmed', title: '订单已确认', time: order.erpReviewedAt })
  }
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

// ERP 最终审批前，已支付且尚未进入履约的商城订单可以安排配送。
const canArrangeFulfillment = computed(() => {
  return detail.value?.orderSource !== 'ERP_MANUAL'
    && detail.value?.canArrangeFulfillment === true
})

const showFulfillmentCard = computed(() => {
  const order = detail.value
  if (!order || order.orderSource === 'ERP_MANUAL') return false
  if (![ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.PROCESSING].includes(Number(order.orderStatus))) return false
  return Number(order.paymentStatus) === PAYMENT_STATUS.CONFIRMED
})

const fulfillmentSummary = computed(() => {
  if (canArrangeFulfillment.value) return 'ERP 最终审批前，可安排配送地址'
  return detail.value?.fulfillmentDisabledReason || '当前暂不能安排配送，请查看原因'
})

// 可用操作按钮由服务端 AllowedActions 决定，前端只做统一展示。
const actionButtons = computed(() => {
  if (!detail.value) return []

  const reorderAction = {
    key: 'reorder',
    label: reordering.value ? '加入中…' : '再来一单',
    type: reordering.value ? 'disabled' : 'default',
  }

  return [reorderAction, ...getOrderActionButtons(detail.value.allowedActions)]
    .sort((left, right) => Number(left.type === 'primary') - Number(right.type === 'primary'))
})

function paymentModeText(mode, paymentStatus, orderStatus) {
  const pendingPayment = Number(orderStatus) === ORDER_STATUS.PENDING_PAYMENT
    && [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PAYING, PAYMENT_STATUS.PARTIALLY_PAID,
      PAYMENT_STATUS.FAILED, PAYMENT_STATUS.UNKNOWN].includes(Number(paymentStatus))
  if (pendingPayment && Number(paymentStatus) === PAYMENT_STATUS.UNPAID) return '待选择支付方式'
  if (Number(orderStatus) === ORDER_STATUS.CANCELLED && Number(paymentStatus) !== PAYMENT_STATUS.CONFIRMED) {
    return '未完成支付'
  }
  return ({
    [PAYMENT_MODE.CASH]: '现款支付',
    [PAYMENT_MODE.CREDIT]: '授信支付',
    [PAYMENT_MODE.COMBINATION]: '账户组合支付',
  })[Number(mode)] || '未知方式'
}

function copyText(text) {
  uni.setClipboardData({ data: text })
}

/**
 * 跳转商品详情
 */
function goToFulfillmentSplit() {
  if (!canArrangeFulfillment.value) return
  navigator.navigateTo(routes.order.fulfillmentSplit(orderId.value))
}

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
    case 'cancel':
      navigator.navigateTo(routes.order.cancelOrder(orderId.value))
      break
    case 'confirmReceipt':
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
    case 'viewLogistics':
      if (detail.value?.shipments?.[0]?.trackingNo) {
        copyText(detail.value.shipments[0].trackingNo)
        uni.showToast({ title: '复制成功', icon: 'none' })
      } else {
        uni.showToast({ title: '暂未生成物流信息', icon: 'none' })
      }
      break
    case 'afterSale':
      navigator.navigateTo(routes.order.afterSaleApply(orderId.value))
      break
  }
}
const productGroups = computed(() => {
  const groups = new Map()
  const items = Array.isArray(detail.value?.items) ? detail.value.items : []
  items.forEach((source, index) => {
    const item = source || {}
    const productId = Number(item.productId ?? item.ProductId ?? 0)
    const skuId = Number(item.skuId ?? item.SkuId ?? 0)
    const rawProductName = item.productName || item.ProductName || ''
    const productName = rawProductName || item.skuName || item.SkuName || '采购商品'
    const key = productId > 0
      ? `spu-${productId}`
      : rawProductName
        ? `spu-name-${rawProductName}`
        : `sku-${skuId || index}`
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        productId: productId || null,
        name: productName,
        image: item.imageUrl || item.ImageUrl || item.image || '',
        items: [],
      })
    }
    groups.get(key).items.push({
      ...item,
      orderItemId: item.orderItemId ?? item.OrderItemId,
      productId,
      skuId,
      image: item.imageUrl || item.ImageUrl || item.image || groups.get(key).image,
      skuName: item.skuName || item.SkuName || '',
      skuCode: item.skuCode || item.SkuCode || item.code || item.Code || '',
      salePrice: Number(item.salePrice ?? item.SalePrice ?? item.price ?? item.Price ?? 0),
      quantity: Number(item.quantity ?? item.Quantity ?? 0),
      lineTotal: Number(item.totalAmount ?? item.TotalAmount ?? item.subTotal ?? item.SubTotal ?? 0),
    })
  })
  return Array.from(groups.values()).map(group => ({
    ...group,
    totalQuantity: group.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    totalAmount: group.items.reduce((sum, item) => sum + (Number(item.lineTotal) || (Number(item.salePrice) || 0) * (Number(item.quantity) || 0)), 0),
  }))
})

function isProductGroupCollapsed(groupKey) {
  return collapsedProductGroups.value[groupKey] !== false
}

function toggleProductGroup(groupKey) {
  collapsedProductGroups.value = {
    ...collapsedProductGroups.value,
    [groupKey]: !isProductGroupCollapsed(groupKey),
  }
}

function splitStatusText(status) {
  return ({
    0: '待推送',
    1: '推送中',
    2: '已受理',
    3: '已发货',
    4: '已完成',
    5: '处理失败',
    6: '已取消',
  })[Number(status)] || '处理中'
}

function splitStatusClass(status) {
  const value = Number(status)
  if (value === 3 || value === 4) return 'is-success'
  if (value === 5 || value === 6) return 'is-warning'
  return 'is-processing'
}
</script>

<style lang="scss" scoped>
.order-detail-page {
  min-height: 100%;
  background: var(--bg-color);
}

.order-initializing { min-height: 68vh; }

.logistics-card, .address-card, .goods-card, .split-card, .info-card, .price-card {
  background: var(--glass-card-background, rgba(255,255,255,.74));
  margin: 16rpx 24rpx;
  border-radius: 12rpx;
  padding: 28rpx 32rpx;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);

  .card-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20rpx;
  }
}

.fulfillment-arrange-card {
  padding-bottom: 20rpx;
}

.fulfillment-arrange-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.fulfillment-arrange-copy {
  min-width: 0;
  flex: 1;
}

.fulfillment-arrange-summary,
.fulfillment-disabled-reason {
  display: block;
  margin-top: 6rpx;
  color: var(--type-muted-color, #707783);
  font-size: var(--type-micro-size, 11px);
  line-height: 1.5;
}

.fulfillment-disabled-reason {
  color: #c47a19;
}

.arrange-button {
  flex: 0 0 auto;
  min-width: 88px;
  height: 38px;
  margin: 0;
  padding: 0 12px;
  border: 0;
  border-radius: 9px;
  color: #fff;
  background: var(--color-brand, #D7192D);
  font-size: var(--type-button-size, 13px);
  line-height: 38px;
}

.arrange-button[disabled] {
  color: #a8abb2;
  background: #eceef2;
}

.split-block {
  padding: 18rpx 0;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child { border-bottom: none; }
}

.split-header, .split-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.split-heading { min-width: 0; flex: 1; }
.split-name { display: block; color: var(--text-primary); font-size: 14px; font-weight: 600; }
.split-no, .split-address { display: block; margin-top: 6rpx; color: var(--text-placeholder); font-size: 12px; }
.split-status { flex-shrink: 0; font-size: 12px; }
.split-status.is-success { color: var(--success-color, #67c23a); }
.split-status.is-warning { color: var(--warning-color, #e6a23c); }
.split-status.is-processing { color: var(--text-secondary); }
.split-item { display: flex; justify-content: space-between; gap: 16rpx; margin-top: 12rpx; color: var(--text-secondary); font-size: 12px; }
.split-item-name { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.split-item-qty { flex-shrink: 0; }
.split-total { margin-top: 14rpx; color: var(--text-primary); font-size: 12px; font-weight: 600; }
.split-failure { display: block; margin-top: 12rpx; color: var(--error-color, #d7192d); font-size: 12px; line-height: 1.5; }

.logistics-info {
  display: flex;
  align-items: center;

  .logistics-text {
    flex: 1;
    margin-left: 16rpx;

    .logistics-company {
      display: block;
      font-size: 14px;
      color: var(--text-primary);
    }

    .tracking-no {
      display: block;
      font-size: 12px;
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
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
        margin-right: 20rpx;
      }

      .phone {
        font-size: 14px;
        color: var(--text-secondary);
      }
    }

    .address-text {
      font-size: 13px;
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
      font-size: 14px;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .sku-name {
      display: block;
      font-size: 12px;
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
        font-size: 15px;
        font-weight: 700;
        color: var(--primary-color);
      }

      .qty {
        font-size: 13px;
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
    font-size: 13px;
    color: var(--text-secondary);
  }

  .info-value {
    font-size: 13px;
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
    font-size: 11px;
    color: var(--text-placeholder);
    margin-bottom: 6rpx;
  }

  .log-text {
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.price-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;

  .price-label {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .price-value {
    font-size: 13px;
    color: var(--text-primary);

    &.highlight {
      font-size: 17px;
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
  font-size: 14px;
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
.order-detail-page { width: 100%; max-width: 1120px; min-height: 0; margin: 0 auto; padding: 10px 16px calc(22px + env(safe-area-inset-bottom)); box-sizing: border-box; background: transparent; }
.logistics-card, .address-card, .goods-card, .info-card, .price-card { margin: 0 0 10px; padding: 14px; border-radius: var(--radius-card, 14px); background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); box-sizing: border-box; }
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
.goods-card .card-title, .info-card .card-title { display: flex; margin-bottom: 10px; align-items: center; gap: 8px; color: var(--type-title-color); font-size: var(--type-card-title-size, 16px); line-height: var(--type-card-title-line-height, 24px); }
.goods-card .card-title::before, .info-card .card-title::before { width: 3px; height: 16px; flex: 0 0 3px; border-radius: 2px; background: var(--color-brand, #D7192D); content: ''; }
.spu-order-list { display: flex; flex-direction: column; gap: 8px; }
.spu-order-card { overflow: hidden; border-radius: 12px; background: rgba(255,255,255,.34); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.spu-order-header { display: grid; grid-template-columns: 52px minmax(0, 1fr) auto 28px; align-items: center; gap: 10px; min-height: 68px; padding: 8px; box-sizing: border-box; }
.spu-image-link { width: 52px; height: 52px; overflow: hidden; border-radius: 9px; background: #FFF; }
.spu-image { width: 100%; height: 100%; }
.spu-order-copy { min-width: 0; }
.spu-order-name { display: block; overflow: hidden; color: var(--type-title-color); font-size: var(--type-body-size, 14px); font-weight: 650; line-height: 20px; text-overflow: ellipsis; white-space: nowrap; }
.spu-order-meta { display: block; margin-top: 3px; color: var(--type-muted-color); font-size: var(--type-micro-size, 11px); }
.spu-order-total { color: var(--type-title-color); font-size: var(--type-body-small-size, 13px); font-weight: 650; font-variant-numeric: tabular-nums; white-space: nowrap; }
.spu-collapse-button { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; color: var(--type-secondary-color); background: #FFF; }
.spu-collapse-icon { transition: transform 180ms ease; }
.spu-collapse-icon.expanded { transform: rotate(90deg); }
.sku-order-list { padding: 0 8px 8px; border-top: 1px solid rgba(255,255,255,.38); background: transparent; }
.goods-item { min-height: 82px; padding: 12px 0; border-bottom: 1px solid #EEF0F2; }
.goods-item .goods-image { width: 78px; height: 78px; border-radius: var(--radius-control, 10px); }
.goods-item .goods-info { display: flex; min-width: 0; flex-direction: column; margin-left: 13px; }
.goods-item .goods-info .goods-name { color: var(--type-title-color); font-size: var(--type-body-size, 14px); line-height: 20px; }
.goods-item .goods-info .sku-name { margin-top: 4px; color: var(--type-muted-color); font-size: var(--type-micro-size, 11px); }
.goods-item .goods-info .price-row { margin-top: auto; padding-top: 8px; }
.goods-item .goods-info .price-row .price { color: var(--color-brand, #D7192D); font-size: var(--type-label-size, 15px); }
.goods-item .goods-info .price-row .qty { color: var(--type-secondary-color); font-size: var(--type-caption-size, 12px); }
.info-row, .price-row { gap: 18px; padding: 9px 0; }
.info-row .info-label, .price-row .price-label { flex: 0 0 76px; color: var(--type-secondary-color); font-size: var(--type-body-small-size, 13px); }
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
 .detail-columns { display: flex; flex-direction: column; gap: 10px; }
 .detail-main-column, .detail-side-column { display: flex; min-width: 0; flex-direction: column; gap: 10px; }
 .detail-main-column > *, .detail-side-column > * { margin: 0; }

@media (min-width: 720px) {
  .order-detail-page { padding: 14px 20px 20px; }
  .detail-columns { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr); align-items: start; gap: 10px 14px; }
  .detail-main-column, .detail-side-column { gap: 10px; }
  .bottom-space { display: none; }
}

@media (min-width: 720px) and (max-width: 1023px) {
  .order-detail-page { padding: 12px 14px 18px; }
  .detail-columns { grid-template-columns: minmax(0, 1fr) minmax(260px, .78fr); gap: 8px 10px; }
  .logistics-card, .address-card, .goods-card, .info-card, .price-card { padding: 12px; }
  .spu-order-header { grid-template-columns: 48px minmax(0, 1fr) auto 26px; gap: 8px; min-height: 62px; }
  .spu-image-link { width: 48px; height: 48px; }
}

@media (max-width: 719px) {
  .order-detail-page { padding-right: 12px; padding-left: 12px; }
  .logistics-card, .address-card, .goods-card, .info-card, .price-card { padding: 12px; }
  .spu-order-header { grid-template-columns: 48px minmax(0, 1fr) auto 26px; gap: 8px; min-height: 62px; }
  .spu-image-link { width: 48px; height: 48px; }
  .spu-order-total { font-size: 12px; }
  .goods-item .goods-image { width: 64px; height: 64px; }
  .goods-item .goods-info { margin-left: 10px; }
  .goods-item .goods-info .goods-name { font-size: 13px; line-height: 18px; }
  .goods-item .goods-info .price-row .price { font-size: 14px; }
  .bottom-space { height: 64px; }
}
</style>

