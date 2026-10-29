<template>
  <AppPageShell>
    <template #header>
      <view class="order-header">
        <AppHeader
          :title="t('order.list.title')"
          :show-back="true"
          :searchable="true"
          :search-value="keywordInput"
          :search-placeholder="t('order.list.search')"
          @update:search-value="keywordInput = $event"
          @search="applySearch"
          @clear-search="clearSearch"
        />
        <view class="filter-panel">
          <view class="page-width-container filter-frame"><view class="order-filter-content">
            <StatusTabBar :items="displayTabs" :model-value="currentTab" max-width="100%" :item-width="72" @change="switchStatus" />
          </view></view>
        </view>
      </view>
    </template>

    <template #content>
      <AppContent
        :no-max-width="true"
        padding="8px var(--page-padding-x, 16px) 28px"
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="handleRefresh"
        @refresherrestore="handleRefresherRestore"
        @refresherabort="handleRefresherRestore"
        @scrolltolower="loadMore"
        @scroll="actionMenu = null"
      >
        <view
          class="order-page"
          @touchstart="handleStatusTouchStart"
          @touchend="handleStatusTouchEnd"
        >
          <AppNetworkBanner
            :visible="localeRefreshError"
            type="refresh-fail"
            :message="loadErrorMessage"
            :action-text="t('common.retry')"
            @action="orderRead.localeChanged()"
          />
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
            :title="t('order.list.loadFailed')"
            :description="loadErrorMessage"
            :action-text="t('common.ui.reload')"
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
                    <text class="order-no"><text class="order-no-label">{{ t('order.list.orderNo') }}</text>{{ order.orderNo }}</text>
                    <text v-if="order.orderSource === 'ERP_MANUAL'" class="manual-order-tag">线下订单</text>
                    <text v-if="order.splitOrderCount > 1" class="split-order-tag">
                      {{ order.parentOrderId ? t('order.list.splitChild') : t('order.list.splitSummary', { count: order.splitOrderCount }) }}
                    </text>
                  </view>
                  <text class="order-time">{{ formatDateTime(order.createdAt || order.createdTime) }}</text>
                </view>
                <view class="order-status">
                  <StatusTag :type="getOrderCustomerDisplay(order).type" :text="getOrderCustomerDisplay(order).text" />
                </view>
              </view>

              <view class="goods-preview">
                <AppProductImage class="goods-img" :src="order.firstItemImageUrl || ''" mode="aspectFill" />
                <view class="goods-info">
                  <text class="product-name">{{ order.firstItemProductName || t('order.list.productFallback') }}</text>
                  <text class="product-detail">{{ t('order.list.productsSummary', { kinds: order.itemCount || 0, quantity: order.totalQuantity || 0 }) }}</text>
                  <text class="order-stage">{{ getOrderCustomerDisplay(order).description }}</text>
                </view>
              </view>

              <view class="card-footer">
                <view class="amount-area">
                  <text>{{ t('order.list.payable') }}</text>
                  <AmountText :text="'¥' + (formatMoney(order.payableAmount))" />
                </view>
                <view class="action-row" @tap.stop>
                  <ActionRow compact :actions="getOrderActions(order)" :more-text="t('order.list.more')" @select="selectOrderAction($event, order)" @overflow="openActionMenu($event, order)" />
                </view>
              </view>
              </view>
            </view>
            <AppLoadMore :status="loadMoreStatus" @retry="loadMore" />
          </template>

          <AppPageState
            v-else
            state="empty"
            :title="keyword ? t('order.list.emptyMatch') : t('order.list.emptyTab')"
            :description="keyword ? t('order.list.emptySearchHint') : t('order.list.emptyHint')"
            compact
          >
            <template #illustration>
              <AppSvgIllustration name="no-order" size="lg" />
            </template>
            <template v-if="keyword" #actions>
              <button class="empty-action" @tap="clearSearch">{{ t('common.search.clear') }}</button>
            </template>
          </AppPageState>

        </view>
      </AppContent>
    </template>
    <template #overlay>
      <ActionOverflowMenu :anchor="actionMenu?.anchor" :actions="overflowActions" :title="t('order.list.more')" @close="actionMenu = null" @select="selectMenuAction" />
    </template>
  </AppPageShell>
</template>

<script setup>
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { computed, reactive, ref, watch } from 'vue'
import { locale, t } from '@/shared/i18n/index.js'
import { createLocaleReadCoordinator } from '@/shared/composables/localeReadCoordinator.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'
import '../../i18n/register.js'
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import {
  ORDER_STATUS,
  ERP_REVIEW_STATUS,
} from '@/app/config/constant.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { getOrderList, getOrderDetail, confirmReceipt, generateClientRequestId } from '@/subPackages/order/api/orderApi.js'
import { getOrderActionButtons } from '@/subPackages/order/model/orderActions.js'
import { getOrderCustomerDisplay } from '../../model/orderDisplay.js'
import { batchAddToCart } from '@/shared/api/cartApi.js'
import { buildReorderCartItems } from '@/subPackages/order/domain/reorderCart.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import StatusTabBar from '@/shared/ui/StatusTabBar.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import AppNetworkBanner from '@/shared/ui/AppNetworkBanner/AppNetworkBanner.vue'
import ActionRow from '@/shared/ui/ActionRow.vue'
import ActionOverflowMenu from '@/shared/ui/ActionOverflowMenu.vue'
import { formatDateTime } from '../../../../shared/utils/format.js'
import { waitForRefreshAnimation } from '../../../../shared/utils/refreshAnimation.js'

const ERP_REVIEW_PENDING_TAB = 'erp-pending'
const allTabs = Object.freeze([
  { value: null, labelKey: 'order.list.all', orderStatus: null, erpReviewStatus: null, excludePendingErpReview: false },
  { value: ORDER_STATUS.PENDING_PAYMENT, labelKey: 'order.list.filters.pendingPayment', orderStatus: ORDER_STATUS.PENDING_PAYMENT, erpReviewStatus: null, excludePendingErpReview: false },
  { value: ERP_REVIEW_PENDING_TAB, labelKey: 'order.list.filters.pendingConfirmation', orderStatus: ORDER_STATUS.PROCESSING, erpReviewStatus: ERP_REVIEW_STATUS.PENDING, excludePendingErpReview: false },
  { value: ORDER_STATUS.PROCESSING, labelKey: 'order.list.filters.processing', orderStatus: ORDER_STATUS.PROCESSING, erpReviewStatus: null, excludePendingErpReview: true },
  { value: ORDER_STATUS.COMPLETED, labelKey: 'order.list.filters.completed', orderStatus: ORDER_STATUS.COMPLETED, erpReviewStatus: null, excludePendingErpReview: false },
  { value: ORDER_STATUS.CANCELLED, labelKey: 'order.list.filters.cancelled', orderStatus: ORDER_STATUS.CANCELLED, erpReviewStatus: null, excludePendingErpReview: false },
])
/** 筛选入口按当前语言取词，查询协议与实际订单状态投影各自保留原职责。 */
const displayTabs = computed(() => allTabs.map(tab => ({ ...tab, label: t(tab.labelKey) })))
const currentTab = ref(null)
const selectedTab = computed(() => allTabs.find(tab => tab.value === currentTab.value) || allTabs[0])
const currentStatus = computed(() => selectedTab.value.orderStatus)
const currentErpReviewStatus = computed(() => selectedTab.value.erpReviewStatus)
const currentExcludePendingErpReview = computed(() => selectedTab.value.excludePendingErpReview)
const orderList = ref([])
const loading = ref(false)
const isRefreshing = ref(false)
const hasMore = ref(true)
const loadError = ref('')
const localeRefreshError = ref(false)
const loadErrorMessage = computed(() => loadError.value?.key
  ? t(loadError.value.key) : (loadError.value?.message || loadError.value || ''))
const totalCount = ref(0)
const loadMoreError = ref(false)
const keywordInput = ref('')
const keyword = ref('')
const page = reactive({ current: 1, pageSize: 10 })
const actionMenu = ref(null)
const reorderingOrderId = ref(null)
const swipeStart = ref(null)
const loadMoreStatus = computed(() => {
  if (loadMoreError.value) return 'error'
  if (loading.value) return 'loading'
  if (!hasMore.value) return 'no-more'
  return 'idle'
})
const orderRead = createLocaleReadCoordinator({
  read: readOrderListSnapshot,
  apply: applyOrderListSnapshot,
  onError: showOrderListReadError,
  onBusy: setOrderListBusy,
})
watch(locale, () => { actionMenu.value = null; orderRead.localeChanged() }, { flush: 'sync' })
onHide(() => { actionMenu.value = null; orderRead.deactivate() })
onUnload(() => orderRead.dispose())

onLoad(options => {
  if (options.status !== undefined && options.status !== '') {
    const requestedStatus = Number(options.status)
    if (allTabs.some(tab => tab.value === requestedStatus)) currentTab.value = requestedStatus
  }
  if (options.reviewStatus === 'pending') currentTab.value = ERP_REVIEW_PENDING_TAB
})

onShow(() => {
  orderRead.activate()
})

function switchStatus(status) {
  if (currentTab.value === status) return
  currentTab.value = status
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
  const currentIndex = allTabs.findIndex(tab => tab.value === currentTab.value)
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

/** 只读查询入口；显式刷新合并旧查询，不包装任何订单写操作。 */
async function loadOrderList() {
  if (!hasMore.value) return
  return orderRead.refresh()
}

/** 切换语种时按当前已加载窗口重取，不清关键词/状态筛选或追加旧语种页。 */
async function readOrderListSnapshot(context) {
  const refreshWindow = context.localeChanged
  const firstPage = refreshWindow || context.reason === 'show' ? 1 : page.current
  const lastPage = refreshWindow
    ? Math.max(1, Math.ceil(orderList.value.length / page.pageSize)) : firstPage
  const query = {
    orderStatus: currentStatus.value,
    erpReviewStatus: currentErpReviewStatus.value,
    excludePendingErpReview: currentExcludePendingErpReview.value,
    keyword: keyword.value || null,
    pageSize: page.pageSize,
  }
  const results = []
  for (let pageNum = firstPage; pageNum <= lastPage; pageNum++) {
    if (!context.isCurrent()) break
    results.push(await getOrderList({ ...query, pageNum }))
  }
  return { results, firstPage, lastPage, refreshWindow }
}

/** 应用当前语种/查询代际的服务端结果，金额及状态投影不重新计算。 */
function applyOrderListSnapshot({ results, firstPage, lastPage, refreshWindow }) {
  const items = results.flatMap(result => result.items || [])
  const result = results[results.length - 1] || {}
  orderList.value = refreshWindow || firstPage === 1 ? items : [...orderList.value, ...items]
  page.current = lastPage
  totalCount.value = Number(result.totalCount || orderList.value.length)
  hasMore.value = orderList.value.length < totalCount.value
  loadMoreError.value = false
  localeRefreshError.value = false
}

/** 仅展示当前读请求错误；语种窗口刷新失败保留旧列表与分页事实。 */
function showOrderListReadError(error, context) {
  loadError.value = error?.message ? error : { key: 'order.list.networkFailed' }
  if (context.localeChanged) {
    localeRefreshError.value = orderList.value.length > 0
    return
  }
  if (page.current > 1) page.current--
  if (page.current > 1 || orderList.value.length) loadMoreError.value = true
}

/** loading 覆盖整个合并读流程，防止旧读完成时提前允许加载下一页。 */
function setOrderListBusy(value) {
  loading.value = value
  if (value) {
    loadError.value = ''
    localeRefreshError.value = false
    if (page.current > 1) loadMoreError.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.current++
  loadOrderList()
}

function goToDetail(orderId) {
  navigator.navigateTo(routes.order.detail(orderId))
}


function formatMoney(value) {
  const number = Number(value)
  return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
/** 订单列表只展示服务端允许的动作，并把本地再来一单置于首屏。 */
function getOrderActions(order) {
  const actions = getOrderActionButtons(order?.allowedActions)
  if (Number(order?.itemCount || 0) > 0) {
    actions.push({
      key: 'reorder',
      label: reorderingOrderId.value === order.orderId ? t('order.list.reordering') : t('order.list.reorder'),
      type: reorderingOrderId.value === order.orderId ? 'disabled' : 'default',
      priority: 2,
    })
  }

  const priority = { reorder: 0, afterSale: 1, pay: 2, cancel: 3, confirmReceipt: 4, viewLogistics: 5 }
  return actions.sort((left, right) => (priority[left.key] ?? 99) - (priority[right.key] ?? 99))
}
/** 一个页面只展开一个订单菜单，持有订单标识而非过期对象。 */
function openActionMenu(menu, order) { actionMenu.value = { ...menu, orderId: order.orderId } }
const menuOrder = computed(() => orderList.value.find(order => order.orderId === actionMenu.value?.orderId))
const overflowActions = computed(() => menuOrder.value ? getOrderActions(menuOrder.value).filter(action => actionMenu.value?.keys.includes(action.key)) : [])
/** 菜单只在点击时读取当前订单，状态刷新后失效动作不会继续执行。 */
function selectMenuAction(key) { if (menuOrder.value) selectOrderAction(key, menuOrder.value) }
/** 所有按钮统一复核服务端允许动作，并在执行前收起菜单。 */
function selectOrderAction(key, order) {
  actionMenu.value = null
  const action = getOrderActions(order).find(item => item.key === key)
  if (action && action.type !== 'disabled') handleAction(key, order)
}

/** 从订单详情读取原成交商品，重新走购物车报价和库存校验。 */
async function reorderOrder(order) {
  if (reorderingOrderId.value || !order?.orderId) return

  reorderingOrderId.value = order.orderId
  try {
    const detail = await getOrderDetail(order.orderId)
    const items = buildReorderCartItems(detail?.items)
    if (!items.length) {
      uni.showToast({ title: t('order.list.noReorderProducts'), icon: 'none' })
      return
    }

    await batchAddToCart({ items, clientRequestId: generateClientRequestId() })
    uni.showToast({ title: t('order.list.addedToCart'), icon: 'success' })
    setTimeout(() => navigator.navigateTo(routes.commerce.cart()), 350)
  } catch (error) {
    uni.showToast({ title: error?.message || t('order.list.productChanged'), icon: 'none' })
  } finally {
    reorderingOrderId.value = null
  }
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
      if (!await openAppDialog({
        confirmText: t('common.confirm'),
        cancelText: t('common.cancel'),
        title: t('order.list.receiptTitle'),
        description: t('order.list.receiptContent'),
      })) return
      try {
        await confirmReceipt({ orderId: order.orderId, clientRequestId: generateClientRequestId() })
        uni.showToast({ title: t('order.list.receiptSuccess'), icon: 'success' })
        await resetAndLoad()
      } catch (error) {
        uni.showToast({ title: error?.message || t('common.errors.operation'), icon: 'none' })
      }
      break
    case 'afterSale':
      navigator.navigateTo(routes.order.afterSaleApply(order.orderId, order.orderNo))
      break
    case 'reorder':
      await reorderOrder(order)
      break
  }
}
</script>

<style lang="scss" scoped>
.order-status { display: flex; flex: 0 0 auto; justify-content: flex-end; }
.order-header { background: var(--surface-page, #F4F5F8); }
.order-page { width: 100%; max-width: var(--content-max-width, 1120px); margin: 0 auto; padding-bottom: env(safe-area-inset-bottom); }
.filter-panel { background: var(--surface-page, #F4F5F8); }
.filter-frame { padding: 7px var(--page-padding-x, 16px) 12px; }
.order-filter-content { width: 100%; max-width: var(--content-max-width, 1120px); margin: 0 auto; box-sizing: border-box; }
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
.manual-order-tag { flex: 0 0 auto; padding: 2px 6px; border-radius: 7px; color: #215B82; background: #EAF4FB; font-size: 9px; line-height: 14px; }
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
.amount-area > .amount-text { margin-top: 3px; color: #D7192D; font-size: 17px; font-weight: 750; font-variant-numeric: tabular-nums; white-space: nowrap; }

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
  .filter-frame { padding-top: 9px; padding-bottom: 14px; }
  .card-header { padding: 16px 18px 11px; }
  .goods-preview { grid-template-columns: 84px minmax(0,1fr); gap: 16px; padding: 4px 18px 16px; }
  .goods-img { width: 84px; height: 84px; }
  .card-footer { padding: 0 18px 16px; }
}


@media screen and (min-width: 1024px) {
  .order-grid, .skeleton-grid { grid-template-columns: minmax(0, 1fr); gap: 14px; }
}

/* 金额按实际可用宽度缩字，父布局允许收缩。 */
.amount-area { min-width: 0; }
.amount-area > text { flex: none; }
</style>
