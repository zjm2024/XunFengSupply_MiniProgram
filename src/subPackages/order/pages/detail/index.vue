<!--
  订单详情页面（分包：orderSub）
  对应业务流程节点：
  订单履约发货 → 查看客户可见订单信息、物流进度与可执行操作
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('order.detail.title')" :show-back="true" />
    </template>
    <template #content>
      <AppContent :no-max-width="true" padding="10px var(--page-padding-x, 16px) 22px">
        <view class="order-detail-page" :class="{ 'has-logistics': detail?.shipments?.length > 0, 'is-english': locale === 'en-US' }" v-if="detail">
          <view class="detail-columns">
            <view class="detail-main-column">
          <!-- 淘宝式订单状态进度 -->
          <OrderStatusProgress
            :status="detail.orderStatus"
            :payment-status="detail.paymentStatus"
            :fulfillment-status="detail.fulfillmentStatus"
            :text="orderDisplay.text"
            :description="orderDisplay.description"
            :journey-visible="orderDisplay.showProgress"
            :step-labels="progressStepLabels"
          />

          <!-- 物流信息 -->
          <view class="logistics-card" v-if="detail.shipments && detail.shipments.length > 0" @tap="handleAction('viewLogistics')">
            <view class="logistics-info">
              <AppIcon name="shipping" :size="20" color="#67C23A" />
              <view class="logistics-text">
                <text class="logistics-company">{{ detail.shipments[0]?.carrierName || t('order.detail.logisticsFallback') }}</text>
                <text class="tracking-no" v-if="detail.shipments[0]?.trackingNo">{{ t('order.detail.trackingNo') }} {{ detail.shipments[0].trackingNo }}</text>
              </view>
              <AppIcon name="chevron-right" :size="16" color="#CCC" />
            </view>
          </view>

          <!-- 收货地址 -->
          <view v-if="detail.salesScene !== 1 && detail.orderSource !== 'ERP_MANUAL' && !detail.fulfillmentSplits?.length" class="address-card">
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
            <view class="card-title">{{ t('order.detail.productInfo') }}</view>
            <view v-if="productGroups.length" class="spu-order-list">
              <view v-for="group in productGroups" :key="group.key" class="spu-order-card">
                <view class="spu-order-header" @tap="toggleProductGroup(group.key)">
                  <view class="spu-image-link" @tap.stop="goToProductDetail(group.items[0])">
                    <AppProductImage class="spu-image" :src="group.image" mode="aspectFill" />
                  </view>
                  <view class="spu-order-copy">
                    <text class="spu-order-name">{{ group.name }}</text>
                    <text class="spu-order-meta">{{ t('order.detail.productSummary', { count: group.items.length, quantity: group.totalQuantity }) }}</text>
                    <text class="spu-shipping-summary">{{ group.shipmentSummary }}</text>
                  </view>
                  <AmountText class="spu-order-total" :text="'¥' + (group.totalAmount.toFixed(2))" />
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
                      <AppProductImage class="goods-image" :src="item.image" :lazy-load="true" mode="aspectFill" />
                    </view>
                    <view class="goods-info">
                      <text class="goods-name">{{ item.skuName || t('order.detail.defaultVariant') }}</text>
                      <text class="sku-name">SKU：{{ item.skuCode || item.skuId || '-' }}</text>
                      <view class="price-row">
                        <AmountText class="price" :text="'¥' + (Number(item.salePrice || 0).toFixed(2))" />
                        <AmountText v-if="getPriceDisplay(item).showListPrice" class="list-price" :class="{ 'list-price--strike': getPriceDisplay(item).strikeListPrice }" :text="'¥' + Number(item.listPrice).toFixed(2)" />
                        <text class="qty">x{{ item.quantity }}</text>
                      </view>
                      <view class="item-shipment" :class="'is-' + item.shipment.tone">
                        <text class="item-shipment-status">{{ item.shipment.text }}</text>
                        <view v-if="item.shipment.known" class="item-shipment-quantities"><text>{{ t('order.detail.skuShipped', { quantity: item.shipment.sent }) }} {{ item.unit }}</text><text>{{ t('order.detail.skuUnshipped', { quantity: item.shipment.remaining }) }} {{ item.unit }}</text></view>
                      </view>
                      <AmountText v-if="item.strategyDiscount > 0" class="strategy-discount" :text="(t('order.detail.strategyDiscount')) + ' ¥' + (item.strategyDiscount.toFixed(2))" />
                      <AmountText v-if="item.promotionDiscount > 0" class="promotion-discount" :text="(t('order.detail.promotionDiscount')) + ' ¥' + (item.promotionDiscount.toFixed(2))" />
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 客户在订单详情中查看配送结果，并按需展开商品明细。 -->
          <view v-if="showFulfillmentCard || splitBatchGroups.length" class="split-card">
            <view class="split-card-heading">
              <text class="card-title">{{ t('order.detail.deliveryInfo') }}</text>
              <button v-if="canArrangeFulfillment" class="arrange-button" @tap="goToFulfillmentSplit">{{ t('order.detail.arrange') }}</button>
            </view>
            <text v-if="splitOverview" class="split-overview">{{ splitOverview }}</text>
            <view v-for="batch in visibleSplitBatchGroups" :key="batch.batchNo || batch.sequence" class="split-batch-group">
              <text v-if="!batch.isCurrent" class="split-history-heading">{{ t('order.detail.historyBatch', { sequence: batch.sequence }) }}</text>
              <view v-for="split in batch.splits" :key="split.splitId || split.splitNo" class="split-block">
                <view class="split-header">
                  <text class="split-name">{{ split.splitName || t('order.detail.deliveryDefault', { sequence: split.sequenceNo || '' }) }}</text>
                  <text class="split-status" :class="'is-' + getSplitCustomerDisplay(split).type">{{ getSplitCustomerDisplay(split).text }}</text>
                </view>
                <text v-if="split.fullAddress" class="split-address">{{ split.fullAddress }}</text>
                <text class="split-quantity">{{ splitQuantityText(split) }}</text>
                <text v-if="splitNotice(split)" class="split-notice">{{ splitNotice(split) }}</text>
                <view v-if="split.items?.length" class="split-items-toggle" @tap="toggleSplitItems(split)">
                  <text>{{ isSplitItemsExpanded(split) ? t('order.detail.itemsCollapse') : t('order.detail.itemsShow', { count: split.items.length }) }}</text>
                  <AppIcon name="chevron-right" :size="14" class="split-toggle-icon" :class="{ expanded: isSplitItemsExpanded(split) }" />
                </view>
                <view v-if="isSplitItemsExpanded(split)" class="split-items-detail">
                  <text v-if="split.erpReviewReasonMessage" class="split-no">{{ t('order.detail.reason') }}{{ split.erpReviewReasonMessage }}</text>
                  <text v-if="split.splitNo" class="split-no">{{ t('order.detail.deliveryNo') }}{{ split.splitNo }}</text>
                  <view v-for="group in splitProductGroups(split)" :key="group.key" class="split-product-card">
                    <view class="split-product-header">
                      <AppProductImage class="split-product-image" :src="group.image" :lazy-load="true" />
                      <text class="split-product-name">{{ group.name }}</text>
                    </view>
                    <view v-for="item in group.items" :key="item.orderItemId || item.skuId" class="split-item">
                      <text class="split-item-name">{{ item.skuName || t('order.detail.defaultVariant') }}</text>
                      <text class="split-item-qty">{{ splitItemQuantityText(split, item) }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
            <view v-if="hasSplitHistory" class="split-history-toggle" @tap="showSplitHistory = !showSplitHistory">
              <text>{{ showSplitHistory ? t('order.detail.historyCollapse') : t('order.detail.historyShow') }}</text>
              <AppIcon name="chevron-right" :size="14" class="split-toggle-icon" :class="{ expanded: showSplitHistory }" />
            </view>
          </view>
            </view>
            <view class="detail-side-column">
          <!-- 订单信息 -->
          <view class="info-card order-info-card">
            <view class="card-title">{{ t('order.detail.orderInfo') }}</view>
            <view class="info-row">
              <text class="info-label">{{ t('order.detail.orderNo') }}</text>
              <text class="info-value copyable" @click="copyText(detail.orderNo)">{{ detail.orderNo }}</text>
            </view>
            <view v-if="detail.orderSource === 'ERP_MANUAL'" class="info-row">
              <text class="info-label">{{ t('order.detail.source') }}</text>
              <text class="info-value">{{ t('order.detail.offlineSource') }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">{{ t('order.detail.placedAt') }}</text>
              <text class="info-value">{{ formatDateTime(detail.createdAt) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">{{ t('order.detail.paymentMode') }}</text>
              <text class="info-value">{{ detail.orderSource === 'ERP_MANUAL' ? t('order.detail.accountPayment') : paymentModeText(detail.paymentMode, detail.paymentStatus, detail.orderStatus) }}</text>
            </view>
            <view class="info-row" v-if="detail.customerRemark">
              <text class="info-label">{{ t('order.detail.shippingRemark') }}</text>
              <text class="info-value">{{ detail.customerRemark }}</text>
            </view>
          </view>

          <view
            v-if="detail.orderStatus === ORDER_STATUS.CANCELLED && cancellationReasonText"
            class="info-card cancellation-card"
          >
            <view class="card-title">{{ t('order.detail.cancelInfo') }}</view>
            <view class="info-row">
              <text class="info-label">{{ t('order.detail.cancelReason') }}</text>
              <text class="info-value cancellation-reason">{{ cancellationReasonText }}</text>
            </view>
          </view>

          <!-- 客户可见的订单进度，不展示内部系统状态与处理日志 -->
          <view class="info-card timeline-card" v-if="customerTimeline.length > 0">
            <view class="card-title">{{ t('order.detail.progress') }}</view>
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
              <text class="price-label">{{ t('order.detail.subtotal') }}</text>
              <AmountText class="price-value" :text="'¥' + (Number(detail.goodsAmount || 0).toFixed(2))" />
            </view>
            <view class="price-row" v-if="detail.discountAmount > 0">
              <text class="price-label">{{ t('order.detail.discount') }}</text>
              <AmountText class="price-value" :text="'-¥' + (Number(detail.discountAmount || 0).toFixed(2))" />
            </view>
            <view class="price-row">
              <text class="price-label">{{ t('order.detail.freight') }}</text>
              <AmountText class="price-value" :text="'¥' + (Number(detail.freightAmount || 0).toFixed(2))" />
            </view>
            <view class="price-row total">
              <text class="price-label">{{ t('order.detail.payable') }}</text>
              <AmountText class="price-value highlight" :text="'¥' + (Number(detail.payableAmount || 0).toFixed(2))" />
            </view>
            <view class="price-row" v-if="detail.paidAmount > 0">
              <text class="price-label">{{ t('order.detail.paid') }}</text>
              <AmountText class="price-value" :text="'¥' + (Number(detail.paidAmount || 0).toFixed(2))" />
            </view>
            <view v-if="refundDisplay" class="refund-progress">
              <view class="price-row">
                <text class="price-label">{{ t('order.detail.refundProgress') }}</text>
                <text class="price-value">{{ refundDisplay.text }}</text>
              </view>
              <text class="refund-description">{{ refundDisplay.description }}</text>
            </view>
            <view class="price-row" v-if="detail.refundedAmount > 0">
              <text class="price-label">{{ t('order.detail.refunded') }}</text>
              <AmountText class="price-value" :text="'¥' + (Number(detail.refundedAmount || 0).toFixed(2))" />
            </view>
          </view>

            </view>
          </view>

        </view>

        <AppInitializing
          v-else
          class="order-initializing"
          :title="t('order.detail.loadingTitle')"
          :description="t('order.detail.loadingDescription')"
          :fill="true"
        />
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar v-if="actionButtons.length > 0" class="order-action-bar" width-mode="responsive">
        <ActionRow :actions="actionButtons" :more-text="t('order.list.more')" @select="selectOrderAction" @overflow="actionMenu = $event" />
      </FixedActionBar>
    </template>
    <template #overlay>
      <ActionOverflowMenu :anchor="actionMenu?.anchor" :actions="overflowActions" :title="t('order.list.more')" @close="actionMenu = null" @select="selectOrderAction" />
    </template>
  </AppPageShell>
</template>

<script setup>
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { getPriceDisplay } from '@/shared/utils/priceDisplay.js'
import { ref, computed, watch } from 'vue'
import { locale, t } from '@/shared/i18n/index.js'
import { createLocaleReadCoordinator } from '@/shared/composables/localeReadCoordinator.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'
import '../../i18n/register.js'
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { getOrderDetail, confirmReceipt, generateClientRequestId } from '../../api/orderApi.js'
import { ERP_REVIEW_STATUS, ORDER_STATUS, PAYMENT_MODE, PAYMENT_STATUS } from '@/app/config/constant.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppInitializing from '@/shared/ui/AppInitializing/AppInitializing.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import OrderStatusProgress from '@/shared/ui/OrderStatusProgress/OrderStatusProgress.vue'
import ActionRow from '@/shared/ui/ActionRow.vue'
import ActionOverflowMenu from '@/shared/ui/ActionOverflowMenu.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { batchAddToCart } from '@/shared/api/cartApi.js'
import { buildReorderCartItems } from '../../domain/reorderCart.js'
import { formatDateTime } from '../../../../shared/utils/format.js'
import { getOrderActionButtons } from '../../model/orderActions.js'
import { getOrderCustomerDisplay, getCustomerRefundDisplay, getSplitCustomerDisplay } from '../../model/orderDisplay.js'


const orderId = ref(null)
const detail = ref(null)
const reordering = ref(false)
const collapsedProductGroups = ref({})
const expandedSplitItems = ref({})
const showSplitHistory = ref(false)
const actionMenu = ref(null)

const orderRead = createLocaleReadCoordinator({
  isReady: () => Boolean(orderId.value),
  read: () => getOrderDetail(orderId.value),
  apply: applyOrderDetailSnapshot,
  onError: showOrderDetailReadError,
})
watch(locale, () => { actionMenu.value = null; orderRead.localeChanged() }, { flush: 'sync' })
onHide(() => { actionMenu.value = null; orderRead.deactivate() })
onUnload(() => orderRead.dispose())

onLoad(async (options) => {
  if (options.orderId) {
    orderId.value = Number(options.orderId)
    await loadOrderDetail()
  }
})

onShow(() => {
  orderRead.activate()
})

/**
 * 加载订单详情
 */
async function loadOrderDetail() {
  return orderRead.refresh()
}

/** 应用服务端只读详情；仅语种刷新时保留用户的商品/配送展开状态。 */
function applyOrderDetailSnapshot(value, context) {
  detail.value = value
  if (!context.localeChanged) {
    collapsedProductGroups.value = {}
    expandedSplitItems.value = {}
    showSplitHistory.value = false
  }
}

/** 只展示当前语种详情读取错误；写操作的处理流程不经过此协调器。 */
function showOrderDetailReadError(error) {
  console.error('加载订单详情失败:', error)
  uni.showToast({ title: error?.message || t('common.ui.errorTitle'), icon: 'none' })
}

// 完整地址
const fullAddress = computed(() => {
  if (!detail.value) return ''
  const d = detail.value
  return `${d.receiverProvince || ''}${d.receiverCity || ''}${d.receiverDistrict || ''}${d.receiverAddress || ''}`
})

const splitBatchGroups = computed(() => {
  const splits = detail.value?.fulfillmentSplits ?? []
  const groups = []
  const byBatch = new Map()
  splits.forEach(split => {
    const batchNo = split.splitBatchNo || ''
    if (!byBatch.has(batchNo)) {
      const group = { batchNo, splits: [], sequence: groups.length + 1, isCurrent: split.isCurrentBatch, total: 0 }
      byBatch.set(batchNo, group)
      groups.push(group)
    }
    const group = byBatch.get(batchNo)
    group.splits.push(split)
    group.total += 1
  })
  return groups
})

/** 当前配送优先展示；历史安排留给客户按需查看。 */
const hasSplitHistory = computed(() => splitBatchGroups.value.some(batch => !batch.isCurrent))
const visibleSplitBatchGroups = computed(() => showSplitHistory.value
  ? splitBatchGroups.value
  : splitBatchGroups.value.filter(batch => batch.isCurrent))

/** 这里只概括配送单数量，阶段文案由主状态和每个配送单各展示一次。 */
const splitOverview = computed(() => {
  const batch = splitBatchGroups.value.find(group => group.isCurrent)
  if (batch) return t('order.detail.splitBatchSummary', { count: batch.total })
  return canArrangeFulfillment.value ? fulfillmentSummary.value : ''
})
/** 主状态及退款提示由后端通过启用字典生成，列表与详情完全共用。 */
const orderDisplay = computed(() => getOrderCustomerDisplay(detail.value))
/** 订单分包负责进度节点取词，共享组件只接收展示数据。 */
const progressStepLabels = computed(() => ['submitted', 'paid', 'shipped', 'completed'].map(key => t('order.detail.progressSteps.' + key)))
const refundDisplay = computed(() => getCustomerRefundDisplay(detail.value))

const cancellationReasonText = computed(() => {
  if (detail.value?.cancellationReasonCode === 'ERP_CREATE_REJECTED') return t('order.pay.stockInsufficient')
  if (!detail.value?.cancellationReason) return ''
  return detail.value.cancellationReason
})

/** 仅使用客户旅程节点生成时间线，不渲染 ERP、WMS、Outbox 等内部日志。 */
const customerTimeline = computed(() => {
  if (!detail.value) return []
  const order = detail.value
  const timeline = [{ key: 'created', title: t('order.detail.timeline.submitted'), time: order.createdAt }]
  if (Number(order.erpReviewStatus) === ERP_REVIEW_STATUS.APPROVED) {
    timeline.push({ key: 'confirmed', title: t('order.detail.timeline.confirmed'), time: order.erpReviewedAt })
  }
  if (Number(order.paymentStatus) === PAYMENT_STATUS.CONFIRMED) {
    timeline.push({ key: 'paid', title: t('order.detail.timeline.paid'), description: t('order.detail.timeline.paidDescription') })
  }
  if (order.stockConfirmedAt) {
    timeline.push({ key: 'stock-confirmed', title: t('order.detail.timeline.stockConfirmed'), time: order.stockConfirmedAt })
  }
  if (order.shippedAt) {
    timeline.push({ key: 'shipped', title: t('order.detail.timeline.shipped'), time: order.shippedAt })
  }
  if (order.completedAt) {
    timeline.push({ key: 'completed', title: t('order.detail.timeline.completed'), time: order.completedAt })
  }
  if (order.cancelledAt) {
    timeline.push({ key: 'cancelled', title: t('order.detail.timeline.cancelled'), time: order.cancelledAt })
  }
  return timeline
})

// ERP 最终审批前，已支付且尚未进入履约的商城订单可以安排配送。
const canArrangeFulfillment = computed(() => {
  return detail.value?.orderSource !== 'ERP_MANUAL'
    && detail.value?.canArrangeFulfillment === true
})

// 未产生配送单且没有可执行配送操作时，不重复显示禁用原因卡片。
const showFulfillmentCard = computed(() => canArrangeFulfillment.value)
const fulfillmentSummary = computed(() => t('order.detail.arrangeHint'))

// 可用操作按钮由服务端 AllowedActions 决定，前端只做统一展示。
const actionButtons = computed(() => {
  if (!detail.value) return []

  const reorderAction = {
    key: 'reorder',
    label: reordering.value ? t('order.list.reordering') : t('order.list.reorder'),
    type: reordering.value ? 'disabled' : 'default',
    priority: 2,
  }

  const actions = [...(detail.value.salesScene === 1 ? [] : [reorderAction]), ...getOrderActionButtons(detail.value.allowedActions)]
  const priority = { reorder: 0, pay: 1, cancel: 2, confirmReceipt: 3, viewLogistics: 4 }
  return actions.sort((left, right) => (priority[left.key] ?? 99) - (priority[right.key] ?? 99))
})

/** 菜单只包含当前服务端仍允许的动作，读取刷新后不会保留失效操作。 */
const overflowActions = computed(() => actionButtons.value.filter(action => actionMenu.value?.keys.includes(action.key)))
/** 外露按钮与菜单共用入口，点击前重新检查当前动作与禁用状态。 */
function selectOrderAction(key) {
  actionMenu.value = null
  const action = actionButtons.value.find(item => item.key === key)
  if (action && action.type !== 'disabled') handleAction(key)
}

function paymentModeText(mode, paymentStatus, orderStatus) {
  const pendingPayment = Number(orderStatus) === ORDER_STATUS.PENDING_PAYMENT
    && [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PAYING, PAYMENT_STATUS.PARTIALLY_PAID,
      PAYMENT_STATUS.FAILED, PAYMENT_STATUS.UNKNOWN].includes(Number(paymentStatus))
  if (pendingPayment && Number(paymentStatus) === PAYMENT_STATUS.UNPAID) return t('order.detail.paymentMethodPending')
  if (Number(orderStatus) === ORDER_STATUS.CANCELLED && Number(paymentStatus) !== PAYMENT_STATUS.CONFIRMED) {
    return t('order.detail.paymentIncomplete')
  }
  return ({
    [PAYMENT_MODE.CASH]: t('order.detail.paymentModes.cash'),
    [PAYMENT_MODE.CREDIT]: t('order.detail.paymentModes.credit'),
    [PAYMENT_MODE.COMBINATION]: t('order.detail.paymentModes.combination'),
  })[Number(mode)] || t('order.detail.paymentModes.unknown')
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
    uni.showToast({ title: t('order.list.noReorderProducts'), icon: 'none' })
    return
  }

  reordering.value = true
  try {
    await batchAddToCart({ items, clientRequestId: generateClientRequestId() })
    uni.showToast({ title: t('order.list.addedToCart'), icon: 'success' })
    setTimeout(() => navigator.navigateTo(routes.commerce.cart()), 350)
  } catch (error) {
    uni.showToast({ title: error?.message || t('order.list.productChanged'), icon: 'none' })
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
      navigator.navigateTo(detail.value?.checkoutBatchId
        ? routes.order.checkoutPay(detail.value.checkoutBatchId)
        : routes.order.pay(orderId.value))
      break
    case 'cancel':
      navigator.navigateTo(routes.order.cancelOrder(orderId.value))
      break
    case 'confirmReceipt':
      if (!await openAppDialog({
        confirmText: t('common.confirm'),
        cancelText: t('common.cancel'),
        title: t('common.tip'),
        description: t('order.detail.receiptContent'),
      })) return
      try {
        await confirmReceipt({ orderId: orderId.value, clientRequestId: generateClientRequestId() })
        uni.showToast({ title: t('order.list.receiptSuccess'), icon: 'success' })
        setTimeout(() => loadOrderDetail(), 1000)
      } catch (e) {
        uni.showToast({ title: e.message || t('common.errors.operation'), icon: 'none' })
      }
      break
    case 'viewLogistics':
      if (detail.value?.shipments?.[0]?.trackingNo) {
        copyText(detail.value.shipments[0].trackingNo)
        uni.showToast({ title: t('order.detail.copySuccess'), icon: 'none' })
      } else {
        uni.showToast({ title: t('order.detail.noLogistics'), icon: 'none' })
      }
      break
    case 'afterSale':
      navigator.navigateTo(routes.order.afterSaleApply(orderId.value, detail.value?.orderNo))
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
    const productName = rawProductName || t('order.detail.productFallback')
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
      basePrice: Number(item.basePrice ?? item.BasePrice ?? item.base_price ?? item.salePrice ?? item.SalePrice ?? 0),
      salePrice: Number(item.salePrice ?? item.SalePrice ?? item.price ?? item.Price ?? 0),
      listPrice: Number(item.listPrice ?? item.ListPrice ?? 0),
      priceSource: item.priceSource ?? item.PriceSource ?? 'BASE',
      priceRuleId: item.priceRuleId ?? item.PriceRuleId ?? null,
      quantity: Number(item.quantity ?? item.Quantity ?? 0),
      strategyDiscount: Math.round(getPriceDisplay(item).strategyDiscount * Number(item.quantity ?? item.Quantity ?? 0) * 100) / 100,
      promotionDiscount: Number(item.discountAmount ?? item.DiscountAmount ?? 0),
      lineTotal: Number(item.totalAmount ?? item.TotalAmount ?? item.subTotal ?? item.SubTotal ?? 0),
      promotionSnapshot: item.promotionSnapshot ?? item.PromotionSnapshot ?? null,
      unit: item.unit ?? item.Unit ?? '',
      shipment: itemShipmentDisplay(item),
    })
  })
  return Array.from(groups.values()).map(group => ({
    ...group,
    shipmentSummary: group.items.every(item => item.shipment.known)
      ? t('order.detail.skuShippingSummary', { sent: group.items.reduce((sum,item) => sum + item.shipment.sent,0), total: group.items.reduce((sum,item) => sum + item.quantity,0) })
      : t('order.detail.skuShippingUnknown'),
    totalQuantity: group.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    totalAmount: group.items.reduce((sum, item) => sum + (Number(item.lineTotal) || (Number(item.salePrice) || 0) * (Number(item.quantity) || 0)), 0),
  }))
})

/** 建立订单行到SPU快照的索引，避免分单渲染反复扫描全部订单行。 */
const productByOrderItemId = computed(() => {
  const result = new Map()
  productGroups.value.forEach(group => group.items.forEach(item => {
    if (item.orderItemId != null) result.set(String(item.orderItemId), group)
  }))
  return result
})

/** 分单明细始终按SPU包裹SKU；缺少分单商品快照时通过原订单行恢复标题。 */
function splitProductGroups(split) {
  const groups = new Map()
  ;(split.items || []).forEach((item,index) => {
    const parent = productByOrderItemId.value.get(String(item.orderItemId))
    const key = parent?.key || (item.productId ? 'spu-' + item.productId : 'line-' + (item.orderItemId ?? index))
    if (!groups.has(key)) groups.set(key, { key, name:parent?.name || item.productName || t('order.detail.productFallback'), image:parent?.image || item.imageUrl || '', items:[] })
    groups.get(key).items.push(item)
  })
  return Array.from(groups.values())
}

/** 只按逐行实发事实显示状态，既不从整单状态推算数量，也不把历史未知记录显示成零。 */
function itemShipmentDisplay(item) {
  const raw = item.shippedQuantity ?? item.ShippedQuantity
  if (raw == null || !Number.isFinite(Number(raw))) return { known:false,text:t('order.detail.skuShippingUnknown'),tone:'unknown' }
  const sent = Math.max(0,Number(raw)), total = Math.max(0,Number(item.quantity ?? item.Quantity) || 0)
  const remaining = Math.max(0,Number(item.unshippedQuantity ?? item.UnshippedQuantity ?? (total-sent)) || 0)
  const key = sent <= 0 ? 'skuNotShipped' : remaining > 0 ? 'skuPartiallyShipped' : 'skuFullyShipped'
  return { known:true,sent,remaining,text:t('order.detail.' + key),tone:sent <= 0 ? 'pending' : remaining > 0 ? 'partial' : 'shipped' }
}

/** 未拆单时默认展开规格，仍保留用户手动折叠和拆单订单的按需展开。 */
function isProductGroupCollapsed(groupKey) {
  const selected = collapsedProductGroups.value[groupKey]
  return selected == null ? Boolean(detail.value?.fulfillmentSplits?.length) : selected
}

function toggleProductGroup(groupKey) {
  collapsedProductGroups.value = {
    ...collapsedProductGroups.value,
    [groupKey]: !isProductGroupCollapsed(groupKey),
  }
}

/** 读取配送子单在当前页的展开状态。 */
function isSplitItemsExpanded(split) {
  return expandedSplitItems.value[String(split.splitId || split.splitNo || split.sequenceNo)] === true
}

/** 在当前订单详情页切换子单商品明细。 */
function toggleSplitItems(split) {
  const key = String(split.splitId || split.splitNo || split.sequenceNo)
  expandedSplitItems.value = { ...expandedSplitItems.value, [key]: !isSplitItemsExpanded(split) }
}


/** 只展示实际数量，没有发货事实时不显示“已发零件”。 */
function splitQuantityText(split) {
  const total = Number(split.totalQuantity) || 0
  const sent = Number(split.shippedQuantity) || 0
  return sent > 0 ? t('order.detail.shippedQuantity', { total, sent }) : t('order.detail.totalQuantity', { total })
}

/** 仅按字典提醒样式突出说明，不在页面重新推导退款或审核结果。 */
function splitNotice(split) {
  const display = getSplitCustomerDisplay(split)
  return !display.metadataComplete || ['warning', 'error'].includes(display.type) ? display.description : ''
}

/** 有发货事实时逐项展示实发数量，包含未发的零数量商品。 */
function splitItemQuantityText(split, item) {
  const sent = Number(item.shippedQuantity) || 0
  return Number(split.shippedQuantity) > 0 ? t('order.detail.shippedItemQuantity', { sent, quantity: item.quantity }) : t('order.detail.itemQuantity', { quantity: item.quantity })
}
</script>

<style lang="scss" scoped>
@import "./presentation.scss";
</style>
<style lang="scss" scoped>
/* 成品页覆盖层：统一使用项目字体与间距 token，并保持 390px/800px 两档布局。 */
.order-detail-page { width: 100%; max-width: var(--content-max-width, 1120px); min-height: 0; margin: 0 auto; padding: 0; box-sizing: border-box; background: transparent; }
.logistics-card, .address-card, .goods-card, .split-card, .info-card, .price-card { margin: 0 0 10px; padding: var(--module-padding, 16px); border-radius: var(--radius-card, 14px); background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); box-sizing: border-box; }
.logistics-card:active { opacity: .72; }
.logistics-info { min-height: 42px; }
.logistics-info .logistics-text { margin-left: 12px; }
.logistics-info .logistics-text .logistics-company { color: var(--type-title-color); font-size: var(--type-body-size, 14px); font-weight: var(--font-weight-semibold, 600); }
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
.spu-order-card { overflow: hidden; border-radius: var(--radius-card, 14px); background: rgba(255,255,255,.34); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.spu-order-header { display: grid; grid-template-columns: 52px minmax(0, 1fr) minmax(0, .7fr) 28px; align-items: center; gap: 10px; min-height: 68px; padding: 8px; box-sizing: border-box; }
.spu-image-link { width: 52px; height: 52px; overflow: hidden; border-radius: var(--radius-small, 8px); background: #FFF; }
.spu-image { width: 100%; height: 100%; }
.spu-order-copy { min-width: 0; }
.spu-order-name { display: block; overflow: hidden; color: var(--type-title-color); font-size: var(--type-body-size, 14px); font-weight: var(--font-weight-semibold, 600); line-height: 20px; text-overflow: ellipsis; white-space: nowrap; }
.spu-order-meta { display: block; margin-top: 3px; color: var(--type-muted-color); font-size: var(--type-micro-size, 11px); }
.spu-order-total { color: var(--type-title-color); font-size: var(--type-body-small-size, 13px); font-weight: var(--font-weight-semibold, 600); font-variant-numeric: tabular-nums; white-space: nowrap; }
.spu-collapse-button { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; color: var(--type-secondary-color); background: #FFF; }
.spu-collapse-icon { transition: transform 180ms ease; }
.spu-collapse-icon.expanded { transform: rotate(90deg); }
.sku-order-list { padding: 0 8px 8px; border-top: 1px solid rgba(255,255,255,.38); background: transparent; }
.goods-item { min-height: 82px; padding: 12px 0; border-bottom: 1px solid #EEF0F2; }
.goods-item .goods-image { width: 78px; height: 78px; border-radius: var(--radius-control, 10px); }
.goods-item .goods-info { display: flex; min-width: 0; flex-direction: column; margin-left: 13px; }
.goods-item .goods-info .goods-name { color: var(--type-title-color); font-size: var(--type-body-size, 14px); line-height: 20px; }
.goods-item .goods-info .sku-name { margin-top: 4px; color: var(--type-muted-color); font-size: var(--type-micro-size, 11px); }
.goods-item .goods-info .strategy-discount { display: block; color: var(--color-brand, #D7192D); font-size: var(--type-caption-size, 12px); }
.goods-item .goods-info .promotion-discount { display: block; color: #d96b24; font-size: var(--type-caption-size, 12px); }
.goods-item .goods-info .price-row { margin-top: auto; padding-top: 8px; }
.goods-item .goods-info .price-row .price { color: var(--color-brand, #D7192D); font-size: var(--type-label-size, 15px); }
.goods-item .goods-info .price-row .qty { color: var(--type-secondary-color); font-size: var(--type-caption-size, 12px); }
.info-row, .price-row { gap: 18px; padding: 9px 0; }
.info-row .info-label, .price-row .price-label { flex: 0 0 76px; color: var(--type-secondary-color); font-size: var(--type-body-small-size, 13px); }
.info-row .info-value, .price-row .price-value { min-width: 0; color: var(--type-title-color); font-size: var(--type-body-small-size, 13px); text-align: right; }
.info-row .info-value { overflow-wrap: anywhere; }
.price-row.total { margin-top: 7px; padding-top: 14px; border-top: 1px solid #EEF0F2; }
.price-row .price-value.highlight { color: var(--color-brand, #D7192D); font-size: var(--type-money-size, 18px); }
.timeline-item { position: relative; display: flex; gap: 12px; min-height: 48px; padding-bottom: 8px; }
.timeline-item:not(:last-child)::before { content: ''; position: absolute; top: 17px; left: 5px; bottom: -2px; width: 1px; background: #E6E8EB; }
.timeline-dot { position: relative; z-index: 1; width: 11px; height: 11px; flex: 0 0 11px; margin-top: 5px; border: 3px solid #FFE3E7; border-radius: 50%; background: var(--color-brand, #D7192D); box-sizing: border-box; }
.timeline-copy { min-width: 0; flex: 1; }
.timeline-title, .timeline-time { display: block; }
.timeline-title { color: var(--type-title-color); font-size: var(--type-body-small-size, 13px); font-weight: var(--font-weight-semibold, 600); }
.timeline-time { margin-top: 2px; color: var(--type-muted-color); font-size: var(--type-micro-size, 11px); }
.action-btn { display: flex; min-width: 0; height: 44px; flex: 1 1 0; align-items: center; justify-content: center; margin: 0; padding: 0 10px; border: 1px solid var(--color-border, #DDE0E4); border-radius: var(--radius-control, 10px); box-sizing: border-box; color: var(--type-title-color); background: #FFF; font-size: var(--type-button-size, 14px); font-weight: var(--font-weight-semibold, 600); line-height: 1; white-space: nowrap; }
.action-btn.primary { border-color: var(--color-brand, #D7192D); color: #FFF; background: var(--color-brand, #D7192D); }
.action-btn.default { border-color: var(--color-border, #DDE0E4); color: var(--type-title-color); background: #FFF; }
.action-btn.disabled { color: #A8ABB2; background: #ECEEF2; }
.order-detail-page.is-english .info-row .info-label,
.order-detail-page.is-english .price-row .price-label { flex-basis: 96px; line-height: 1.4; overflow-wrap: anywhere; }
 .detail-columns { display: flex; flex-direction: column; gap: var(--module-gap, 12px); }
 .detail-main-column, .detail-side-column { display: flex; min-width: 0; flex-direction: column; gap: var(--module-gap, 12px); }
 .detail-main-column > *, .detail-side-column > * { margin: 0; }

@media (min-width: 720px) {
  .detail-columns { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr); align-items: start; gap: 10px 14px; }
  .detail-main-column, .detail-side-column { gap: 10px; }
}

@media (min-width: 720px) and (max-width: 1023px) {
  .detail-columns { grid-template-columns: minmax(0, 1fr) minmax(260px, .78fr); gap: 8px 10px; }
  .logistics-card, .address-card, .goods-card, .split-card, .info-card, .price-card { padding: 12px; }
  .spu-order-header { grid-template-columns: 48px minmax(0, 1fr) minmax(0, .7fr) 26px; gap: 8px; min-height: 62px; }
  .spu-image-link { width: 48px; height: 48px; }
}

@media (max-width: 719px) {
  .logistics-card, .address-card, .goods-card, .split-card, .info-card, .price-card { padding: 12px; }
  .spu-order-header { grid-template-columns: 48px minmax(0, 1fr) minmax(0, .7fr) 26px; gap: 8px; min-height: 62px; }
  .spu-image-link { width: 48px; height: 48px; }
  .spu-order-total { font-size: var(--type-caption-size, 12px); }
  .goods-item .goods-image { width: 64px; height: 64px; }
  .goods-item .goods-info { margin-left: 10px; }
  .goods-item .goods-info .goods-name { font-size: var(--type-body-small-size, 13px); line-height: 18px; }
  .goods-item .goods-info .price-row .price { font-size: var(--type-body-size, 14px); }
}

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.logistics-card, .address-card, .goods-card, .spu-order-card, .split-card, .split-product-card, .info-card, .price-card, .order-info-card, .cancellation-card, .timeline-card, .summary-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
</style>
