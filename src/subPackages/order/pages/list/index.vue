<template>
  <AppPageShell>
    <template #header>
      <view class="order-header">
        <AppHeader
          :title="selectMode === 'afterSale' ? '选择售后订单' : '订单中心'"
          :show-back="true"
          :searchable="true"
          :search-value="keywordInput"
          :search-placeholder="selectMode === 'afterSale' ? '搜索可售后订单号' : '搜索订单号'"
          @update:search-value="keywordInput = $event"
          @search="applySearch"
          @clear-search="clearSearch"
        />
        <view class="filter-panel">
          <StatusTabBar :items="allTabs" :model-value="currentStatus" :max-width="700" :item-width="72" @change="switchStatus" />
        </view>
      </view>
    </template>

    <template #content>
      <AppContent
        padding="8px var(--page-padding-x, 16px) 28px"
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="handleRefresh"
        @refresherrestore="handleRefresherRestore"
        @refresherabort="handleRefresherRestore"
        @scrolltolower="loadMore"
      >
        <view
          class="order-page"
          @touchstart="handleStatusTouchStart"
          @touchend="handleStatusTouchEnd"
        >
          <view v-if="loading && orderList.length === 0" class="skeleton-grid">
            <view v-for="i in 4" :key="i" class="skeleton-card">
              <view class="skeleton-line short" />
              <view class="skeleton-product"><view class="skeleton-image" /><view class="skeleton-copy"><view class="skeleton-line" /><view class="skeleton-line medium" /></view></view>
              <view class="skeleton-line tiny" />
            </view>
          </view>

          <AppPageState
            v-else-if="loadError && orderList.length === 0"
            state="error"
            title="订单加载失败"
            :description="loadError"
            action-text="重新加载"
            compact
            @retry="resetAndLoad"
          />

          <template v-else-if="orderList.length">
            <view class="order-grid">
              <view
                v-for="order in orderList"
                :key="order.orderId"
                class="order-card"
                hover-class="order-card--pressed"
                @tap="goToDetail(order.orderId)"
              >
              <view class="card-header">
                <view class="order-identify">
                  <view class="order-no-line">
                    <text class="order-no"><text class="order-no-label">订单号</text>{{ order.orderNo }}</text>
                    <text v-if="order.splitOrderCount > 1" class="split-order-tag">
                      {{ order.parentOrderId ? '拆分子单' : `拆分订单 · ${order.splitOrderCount}单` }}
                    </text>
                  </view>
                  <text class="order-time">{{ formatDateTime(order.createdAt || order.createdTime) }}</text>
                </view>
                <StatusTag :type="getStatusType(order)" :text="getStatusText(order)" />
              </view>

              <view class="goods-preview">
                <AppProductImage class="goods-img" :src="order.firstItemImageUrl || ''" mode="aspectFill" />
                <view class="goods-info">
                  <text class="product-name">{{ order.firstItemProductName || '采购订单商品' }}</text>
                  <text class="product-detail">{{ order.itemCount || 0 }} 种商品 · 共 {{ order.totalQuantity || 0 }} 件</text>
                  <text class="order-stage">{{ getStatusHelp(order) }}</text>
                </view>
              </view>

              <view class="card-footer">
                <view class="amount-area">
                  <text>订单应付</text>
                  <text><text>¥</text>{{ formatMoney(order.payableAmount) }}</text>
                </view>
                <view class="action-row">
                  <button
                    v-if="getOrderActions(order).length > 2"
                    class="more-action"
                    @tap.stop="toggleActions(order.orderId)"
                  >{{ isActionsExpanded(order.orderId) ? '收起' : '更多' }}<text class="more-action-icon">⌄</text></button>
                  <view class="action-list">
                    <button
                      v-for="action in getVisibleActions(order)"
                      :key="action.key"
                      class="action-btn"
                      :class="action.type"
                      @tap.stop="handleAction(action.key, order)"
                    >{{ action.label }}</button>
                    <button v-if="selectMode === 'afterSale'" class="action-btn primary" @tap.stop="goToDetail(order.orderId)">选择订单</button>
                  </view>
                </view>
              </view>
              </view>
            </view>
            <AppLoadMore :status="loadMoreStatus" @retry="loadMore" />
          </template>

          <AppPageState
            v-else
            state="empty"
            :title="keyword ? '未找到匹配订单' : '当前分类暂无订单'"
            :description="keyword ? '换一个订单号关键词试试' : '新采购订单会显示在这里'"
            compact
          >
            <template #illustration>
              <AppSvgIllustration name="no-order" size="lg" />
            </template>
            <template v-if="keyword" #actions>
              <button class="empty-action" @tap="clearSearch">清除搜索</button>
            </template>
          </AppPageState>

        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  ORDER_STATUS,
  ORDER_STATUS_MAP,
  PAYMENT_STATUS,
  PAYMENT_STATUS_MAP,
} from '@/app/config/constant.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { getOrderList, confirmReceipt, generateClientRequestId } from '@/subPackages/order/api/orderApi.js'
import { getOrderActionButtons } from '@/subPackages/order/model/orderActions.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import StatusTabBar from '@/shared/ui/StatusTabBar.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import { formatDateTime } from '../../../../shared/utils/format.js'
import { waitForRefreshAnimation } from '../../../../shared/utils/refreshAnimation.js'

const allTabs = Object.freeze([
  { value: null, label: '全部' },
  { value: ORDER_STATUS.PENDING_PAYMENT, label: '待付款' },
  { value: ORDER_STATUS.PROCESSING, label: '履约中' },
  { value: ORDER_STATUS.COMPLETED, label: '已完成' },
])
const currentStatus = ref(null)
const orderList = ref([])
const loading = ref(false)
const isRefreshing = ref(false)
const hasMore = ref(true)
const loadError = ref('')
const totalCount = ref(0)
const loadMoreError = ref(false)
const keywordInput = ref('')
const keyword = ref('')
const page = reactive({ current: 1, pageSize: 10 })
const selectMode = ref(null)
const expandedActionOrders = ref(new Set())
const swipeStart = ref(null)
const loadMoreStatus = computed(() => {
  if (loadMoreError.value) return 'error'
  if (loading.value) return 'loading'
  if (!hasMore.value) return 'no-more'
  return 'idle'
})
onLoad(options => {
  if (options.status !== undefined && options.status !== '') {
    const requestedStatus = Number(options.status)
    if (allTabs.some(tab => tab.value === requestedStatus)) currentStatus.value = requestedStatus
  }
  if (options.selectMode === 'afterSale') selectMode.value = 'afterSale'
})

onShow(() => {
  resetAndLoad()
})

function switchStatus(status) {
  if (currentStatus.value === status) return
  currentStatus.value = status
  resetAndLoad()
}

function handleStatusTouchStart(event) {
  swipeStart.value = getTouchPoint(event, 'touches')
}

function handleStatusTouchEnd(event) {
  const endPoint = getTouchPoint(event, 'changedTouches') || getTouchPoint(event, 'touches')
  const startPoint = swipeStart.value
  swipeStart.value = null
  if (!startPoint || !endPoint) return
  const deltaX = endPoint.x - startPoint.x
  const deltaY = endPoint.y - startPoint.y
  if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return
  const currentIndex = allTabs.findIndex(tab => tab.value === currentStatus.value)
  const nextIndex = currentIndex + (deltaX < 0 ? 1 : -1)
  if (nextIndex >= 0 && nextIndex < allTabs.length) switchStatus(allTabs[nextIndex].value)
}

function getTouchPoint(event, collection) {
  const touch = event?.[collection]?.[0] || event?.detail?.[collection]?.[0]
  if (!touch) return null
  const x = Number(touch.clientX ?? touch.pageX ?? touch.x)
  const y = Number(touch.clientY ?? touch.pageY ?? touch.y)
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
}

function applySearch() {
  keyword.value = keywordInput.value.trim()
  resetAndLoad()
}

function clearSearch() {
  keywordInput.value = ''
  keyword.value = ''
  resetAndLoad()
}

async function resetAndLoad() {
  page.current = 1
  orderList.value = []
  totalCount.value = 0
  hasMore.value = true
  loadError.value = ''
  loadMoreError.value = false
  await loadOrderList()
}

async function handleRefresh() {
  if (isRefreshing.value) return
  const startedAt = Date.now()
  isRefreshing.value = true
  try {
    await resetAndLoad()
  } finally {
    await waitForRefreshAnimation(startedAt)
    isRefreshing.value = false
  }
}

function handleRefresherRestore() {
  if (!loading.value) isRefreshing.value = false
}

async function loadOrderList() {
  if (loading.value || !hasMore.value) return
  loading.value = true
  loadError.value = ''
  if (page.current > 1) loadMoreError.value = false
  try {
    const result = await getOrderList({
      orderStatus: currentStatus.value,
      keyword: keyword.value || null,
      pageNum: page.current,
      pageSize: page.pageSize,
    })
    const items = result.items || []
    orderList.value = page.current === 1 ? items : [...orderList.value, ...items]
    totalCount.value = Number(result.totalCount || orderList.value.length)
    hasMore.value = orderList.value.length < totalCount.value
    loadMoreError.value = false
  } catch (error) {
    loadError.value = error?.message || '请检查网络后重试'
    if (page.current > 1) page.current--
    if (page.current > 1 || orderList.value.length) loadMoreError.value = true
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.current++
  loadOrderList()
}

function goToDetail(orderId) {
  if (selectMode.value === 'afterSale') {
    try {
      const pages = getCurrentPages()
      const eventChannel = pages[pages.length - 1]?.getOpenerEventChannel?.()
      eventChannel?.emit('orderSelected', { orderId })
    } catch (error) {
      console.warn('[OrderList] 返回订单选择结果失败:', error)
    }
    navigator.back()
    return
  }
  navigator.navigateTo(routes.order.detail(orderId))
}

const ORDER_STATUS_TYPE_MAP = Object.freeze({
  [ORDER_STATUS.PENDING_REVIEW]: 'warning',
  [ORDER_STATUS.REVIEW_REJECTED]: 'error',
  [ORDER_STATUS.PENDING_PAYMENT]: 'warning',
  [ORDER_STATUS.PROCESSING]: 'info',
  [ORDER_STATUS.COMPLETED]: 'success',
  [ORDER_STATUS.CANCELLING]: 'warning',
  [ORDER_STATUS.CANCELLED]: 'default',
})

/**
 * 订单主状态和支付状态必须分开展示，但支付未完成时，列表主标签要优先提示用户付款。
 * 这样可以避免订单主状态已经进入处理中、支付投影仍未确认时显示成“履约中”。
 */
function getPaymentDisplay(order) {
  const orderStatus = Number(order?.orderStatus)
  const paymentStatus = Number(order?.paymentStatus)
  const paymentPending = (orderStatus === ORDER_STATUS.PENDING_PAYMENT
    || orderStatus === ORDER_STATUS.PROCESSING)
    && paymentStatus !== PAYMENT_STATUS.CONFIRMED
  if (!paymentPending) return null

  const payment = PAYMENT_STATUS_MAP[paymentStatus]
  if (!payment) {
    return { text: '支付状态待同步', type: 'info', help: '支付结果正在同步，请稍后刷新订单' }
  }

  const display = {
    [PAYMENT_STATUS.UNPAID]: { text: '待付款', type: 'warning', help: '订单已生成，请及时完成付款' },
    [PAYMENT_STATUS.PAYING]: { text: '支付处理中', type: 'info', help: '支付结果确认中，请稍后刷新订单' },
    [PAYMENT_STATUS.PARTIALLY_PAID]: { text: '部分支付', type: 'warning', help: '订单尚未完成全额支付，请继续完成付款' },
    [PAYMENT_STATUS.FAILED]: { text: '支付失败', type: 'error', help: '本次支付未完成，请重新发起支付' },
    [PAYMENT_STATUS.UNKNOWN]: { text: '支付结果待确认', type: 'info', help: '支付结果待确认，请勿重复支付' },
  }
  return display[paymentStatus] || { text: payment.text, type: 'info', help: '支付状态正在同步' }
}

function getConfirmedPaymentDisplay(order) {
  if (Number(order?.orderStatus) === ORDER_STATUS.PENDING_PAYMENT
    && Number(order?.paymentStatus) === PAYMENT_STATUS.CONFIRMED) {
    return { text: '处理中', type: 'info', help: '支付已确认，正在为您安排发货' }
  }
  return null
}

function getStatusText(order) {
  return getPaymentDisplay(order)?.text
    || getConfirmedPaymentDisplay(order)?.text
    || ORDER_STATUS_MAP[Number(order?.orderStatus)]?.text
    || '状态更新中'
}

function getStatusType(order) {
  const paymentDisplay = getPaymentDisplay(order)
  if (paymentDisplay) return paymentDisplay.type
  const confirmedPaymentDisplay = getConfirmedPaymentDisplay(order)
  if (confirmedPaymentDisplay) return confirmedPaymentDisplay.type
  const status = Number(order?.orderStatus)
  return ORDER_STATUS_TYPE_MAP[status] || 'default'
}

function getStatusHelp(order) {
  const paymentDisplay = getPaymentDisplay(order)
  if (paymentDisplay) return paymentDisplay.help
  const confirmedPaymentDisplay = getConfirmedPaymentDisplay(order)
  if (confirmedPaymentDisplay) return confirmedPaymentDisplay.help
  const status = Number(order?.orderStatus)
  const map = {
    [ORDER_STATUS.PENDING_REVIEW]: '订单已提交，等待品牌方审核',
    [ORDER_STATUS.REVIEW_REJECTED]: '审核未通过，可查看订单了解原因',
    [ORDER_STATUS.PENDING_PAYMENT]: '审核已通过，请及时完成付款',
    [ORDER_STATUS.PROCESSING]: '订单正在备货或配送中',
    [ORDER_STATUS.COMPLETED]: '采购履约已完成',
    [ORDER_STATUS.CANCELLING]: '取消申请处理中',
    [ORDER_STATUS.CANCELLED]: '订单已取消',
  }
  return map[status] || '订单状态正在同步'
}
function formatMoney(value) {
  const number = Number(value)
  return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function getOrderActions(order) {
  return selectMode.value === 'afterSale' ? [] : getOrderActionButtons(order?.allowedActions)
}
function isActionsExpanded(orderId) {
  return expandedActionOrders.value.has(orderId)
}

function toggleActions(orderId) {
  const next = new Set(expandedActionOrders.value)
  if (next.has(orderId)) next.delete(orderId)
  else next.add(orderId)
  expandedActionOrders.value = next
}

function getVisibleActions(order) {
  const actions = getOrderActions(order)
  return isActionsExpanded(order.orderId) ? actions : actions.slice(0, 2)
}

async function handleAction(key, order) {
  switch (key) {
    case 'pay':
      navigator.navigateTo(routes.order.pay(order.orderId))
      break
    case 'cancel':
      navigator.navigateTo(routes.order.cancelOrder(order.orderId, { orderNo: order.orderNo || '' }))
      break
    case 'viewLogistics':
      navigator.navigateTo(routes.order.detail(order.orderId))
      break
    case 'confirmReceipt':
      uni.showModal({
        title: '确认收货',
        content: '确认已收到商品后，订单将完成。',
        success: async (result) => {
          if (!result.confirm) return
          try {
            await confirmReceipt({ orderId: order.orderId, clientRequestId: generateClientRequestId() })
            uni.showToast({ title: '已确认收货', icon: 'success' })
            await resetAndLoad()
          } catch (error) {
            uni.showToast({ title: error?.message || '操作失败', icon: 'none' })
          }
        },
      })
      break
    case 'afterSale':
      navigator.navigateTo(routes.order.afterSaleApply(order.orderId))
      break
  }
}
</script>

<style lang="scss" scoped>
.order-header { background: var(--surface-page, #F4F5F8); }
.order-page { width: 100%; max-width: 1160px; margin: 0 auto; padding-bottom: env(safe-area-inset-bottom); }
.filter-panel { padding: 7px var(--page-padding-x, 16px) 12px; background: var(--surface-page, #F4F5F8); }
.order-grid, .skeleton-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 14px; }
.order-card { overflow: hidden; padding: 0; border-radius: 17px; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); transition: transform .16s ease, opacity .16s ease, box-shadow .16s ease; }
.order-card:hover { box-shadow: 0 12px 28px rgba(25,30,37,.075); }
.order-card--pressed { opacity: .7; transform: scale(.992); }
.card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 15px 16px 10px; background: transparent; }
.order-identify { min-width: 0; }
.order-no-line { display: flex; min-width: 0; align-items: center; gap: 7px; }
.order-no, .order-time { display: block; }
.order-no { overflow: hidden; color: #2B3037; font-size: 12px; font-weight: 660; text-overflow: ellipsis; white-space: nowrap; }
.order-no-label { margin-right: 4px; color: #8B919A; font-weight: 400; }
.split-order-tag { flex: 0 0 auto; padding: 2px 6px; border-radius: 7px; color: #B22131; background: #FFF0F2; font-size: 9px; line-height: 14px; }
.order-time { margin-top: 4px; color: #9A9FA7; font-size: 9px; }
.goods-preview { display: grid; grid-template-columns: 76px minmax(0,1fr); gap: 13px; margin: 0; padding: 4px 16px 15px; background: transparent; }
.goods-img { width: 76px; height: 76px; border: 1px solid #F0F1F3; border-radius: 13px; overflow: hidden; background: #F3F4F6; }
.goods-info { min-width: 0; }
.product-name { display: -webkit-box; overflow: hidden; color: #20242A; font-size: 14px; font-weight: 650; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.product-detail, .order-stage { display: block; margin-top: 6px; color: #8D929A; font-size: 9px; }
.order-stage { color: #626A75; }
.card-footer { display: block; padding: 0 16px 15px; background: transparent; }
.amount-area { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.amount-area > text { display: block; }
.amount-area > text:first-child { color: #979CA4; font-size: 9px; }
.amount-area > text:last-child { margin-top: 3px; color: #D7192D; font-size: 17px; font-weight: 750; font-variant-numeric: tabular-nums; white-space: nowrap; }
.amount-area > text:last-child > text { display: inline; margin-right: 2px; color: inherit; font-size: 12px; font-weight: 700; line-height: 1; vertical-align: baseline; }
.action-row { display: flex;  align-items: center; gap: 10px; margin-top: 12px; }
.action-list { display: flex; flex: 1; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.more-action { flex: 0 0 auto; height: 32px; margin: 0; padding: 0; border: 0; color: #737A84; background: transparent; font-size: 11px; line-height: 32px; }
.more-action::after { border: 0; }
.more-action-icon { display: inline-block; margin-left: 3px; color: #9AA0A8; font-size: 12px; transform: translateY(-1px); }
.action-btn, .empty-action { display: inline-flex; min-width: 76px; height: 32px; align-items: center; justify-content: center; margin: 0; padding: 0 12px; border: 1px solid #DDE0E3; border-radius: 10px; color: #545B65; background: #FFF; font-size: 11px; line-height: 1; }
.action-btn::after, .empty-action::after { border: 0; }
.action-btn.primary, .empty-action { border-color: #D7192D; color: #FFF; background: #D7192D; }
.load-more { display: flex; min-height: 50px; align-items: center; justify-content: center; color: #969BA3; font-size: 10px; }
.skeleton-card { padding: 16px; border-radius: 19px; background: var(--glass-card-background, rgba(255,255,255,.74)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.skeleton-product { display: flex; gap: 13px; margin: 16px 0; }
.skeleton-image { width: 76px; height: 76px; flex: none; border-radius: 13px; background: #F0F1F3; }
.skeleton-copy { flex: 1; padding-top: 7px; }
.skeleton-line { height: 12px; margin-bottom: 10px; border-radius: 6px; background: linear-gradient(90deg,#F2F3F4 25%,#E8EAEC 50%,#F2F3F4 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
.skeleton-line.short { width: 42%; }.skeleton-line.medium { width: 68%; }.skeleton-line.tiny { width: 28%; margin: 0; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@media screen and (min-width: 720px) {
  .order-page { max-width: 760px; }
  .filter-panel { padding-top: 9px; padding-bottom: 14px; }
  .card-header { padding: 16px 18px 11px; }
  .goods-preview { grid-template-columns: 84px minmax(0,1fr); gap: 16px; padding: 4px 18px 16px; }
  .goods-img { width: 84px; height: 84px; }
  .card-footer { padding: 0 18px 16px; }
}

@media screen and (max-width: 380px) {
  .filter-panel { padding-right: 8px; padding-left: 8px; }
}

@media screen and (min-width: 1024px) {
  .order-page { max-width: 820px; }
  .order-grid { gap: 14px; }
}
</style>
