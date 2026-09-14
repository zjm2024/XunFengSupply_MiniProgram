<template>
  <AppPageShell>
    <template #header>
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
    </template>

    <template #content>
      <AppContent padding="8px var(--page-padding-x, 16px) 28px">
        <view class="order-page">
          <view class="filter-panel">
            <scroll-view class="status-tabs" scroll-x :show-scrollbar="false">
              <view class="tabs-inner">
                <view
                  v-for="tab in allTabs"
                  :key="String(tab.value)"
                  class="tab-item"
                  :class="{ active: currentStatus === tab.value }"
                  @tap="switchStatus(tab.value)"
                >
                  <text>{{ tab.label }}</text>
                </view>
              </view>
            </scroll-view>
          </view>

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

          <view v-else-if="orderList.length" class="order-grid">
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
                    <text class="order-no">{{ order.orderNo }}</text>
                    <text v-if="order.splitOrderCount > 1" class="split-order-tag">
                      {{ order.parentOrderId ? '拆分子单' : `拆分订单 · ${order.splitOrderCount}单` }}
                    </text>
                  </view>
                  <text class="order-time">{{ formatTime(order.createdAt || order.createdTime) }}</text>
                </view>
                <StatusTag :type="getStatusType(order.orderStatus)" :text="getStatusText(order.orderStatus)" />
              </view>

              <view class="goods-preview">
                <AppProductImage class="goods-img" :src="order.firstItemImageUrl || ''" mode="aspectFill" />
                <view class="goods-info">
                  <text class="product-name">{{ order.firstItemProductName || '采购订单商品' }}</text>
                  <text class="product-detail">{{ order.itemCount || 0 }} 种商品 · 共 {{ order.totalQuantity || 0 }} 件</text>
                  <text class="order-stage">{{ getStatusHelp(order.orderStatus) }}</text>
                </view>
              </view>

              <view class="card-footer">
                <view class="amount-area">
                  <text>订单应付</text>
                  <text><text>¥</text>{{ formatMoney(order.payableAmount) }}</text>
                </view>
                <view class="action-row">
                  <button
                    v-for="action in getActions(order.orderStatus)"
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

          <view v-if="orderList.length" class="load-more" @tap="loadMore">
            <text v-if="loading">正在加载…</text>
            <text v-else-if="hasMore">加载更多订单</text>
            <text v-else>已展示全部 {{ totalCount }} 笔订单</text>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ORDER_STATUS, ORDER_STATUS_MAP } from '@/app/config/constant.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { cancelOrder, generateClientRequestId, getOrderList } from '@/subPackages/order/api/orderApi.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'

const allTabs = Object.freeze([
  { value: null, label: '全部' },
  { value: ORDER_STATUS.PENDING_REVIEW, label: '待审核' },
  { value: ORDER_STATUS.PENDING_PAYMENT, label: '待付款' },
  { value: ORDER_STATUS.PROCESSING, label: '履约中' },
  { value: ORDER_STATUS.COMPLETED, label: '已完成' },
  { value: ORDER_STATUS.CANCELLED, label: '已取消' },
])
const currentStatus = ref(null)
const orderList = ref([])
const loading = ref(false)
const hasMore = ref(true)
const loadError = ref('')
const totalCount = ref(0)
const keywordInput = ref('')
const keyword = ref('')
const page = reactive({ current: 1, pageSize: 10 })
const selectMode = ref(null)
onLoad(options => {
  if (options.status !== undefined && options.status !== '') currentStatus.value = Number(options.status)
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
  await loadOrderList()
}

async function loadOrderList() {
  if (loading.value || !hasMore.value) return
  loading.value = true
  loadError.value = ''
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
  } catch (error) {
    loadError.value = error?.message || '请检查网络后重试'
    if (page.current > 1) page.current--
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

function getStatusText(status) { return ORDER_STATUS_MAP[status]?.text || '状态更新中' }
function getStatusType(status) {
  const map = {
    [ORDER_STATUS.PENDING_REVIEW]: 'warning',
    [ORDER_STATUS.REVIEW_REJECTED]: 'error',
    [ORDER_STATUS.PENDING_PAYMENT]: 'warning',
    [ORDER_STATUS.PROCESSING]: 'info',
    [ORDER_STATUS.COMPLETED]: 'success',
    [ORDER_STATUS.CANCELLING]: 'warning',
    [ORDER_STATUS.CANCELLED]: 'default',
  }
  return map[status] || 'default'
}
function getStatusHelp(status) {
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
function formatTime(value) {
  if (!value) return '时间待同步'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getActions(status) {
  if (selectMode.value === 'afterSale') return []
  const map = {
    [ORDER_STATUS.PENDING_REVIEW]: [{ key: 'cancel', label: '取消订单', type: 'secondary' }],
    [ORDER_STATUS.PENDING_PAYMENT]: [
      { key: 'cancel', label: '取消', type: 'secondary' },
      { key: 'pay', label: '立即付款', type: 'primary' },
    ],
    [ORDER_STATUS.PROCESSING]: [{ key: 'detail', label: '查看履约', type: 'secondary' }],
    [ORDER_STATUS.COMPLETED]: [{ key: 'detail', label: '查看订单', type: 'secondary' }],
  }
  return map[status] || []
}

function handleAction(key, order) {
  if (key === 'pay') {
    navigator.navigateTo(routes.order.pay(order.orderId))
    return
  }
  if (key === 'detail') {
    navigator.navigateTo(routes.order.detail(order.orderId))
    return
  }
  if (key !== 'cancel') return
  uni.showModal({
    title: '取消订单',
    content: `确定取消订单 ${order.orderNo} 吗？`,
    confirmText: '确认取消',
    success: async result => {
      if (!result.confirm) return
      try {
        await cancelOrder({ orderId: order.orderId, clientRequestId: generateClientRequestId() })
        uni.showToast({ title: '订单已取消', icon: 'success' })
        resetAndLoad()
      } catch (error) {
        uni.showToast({ title: error?.message || '取消失败', icon: 'none' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.order-page { width: 100%; max-width: 1160px; margin: 0 auto; padding-bottom: env(safe-area-inset-bottom); }
.filter-panel { padding: 4px 0 8px; }
.status-tabs { width: 100%; white-space: nowrap; }
.tabs-inner { display: inline-flex; min-width: max-content; gap: 7px; padding: 1px 0; }
.tab-item { display: inline-flex; flex: 0 0 auto; height: 34px; align-items: center; gap: 6px; padding: 0 12px; border: 1px solid #E6E8EB; border-radius: 11px; color: #717781; background: #FFF; font-size: 11px; white-space: nowrap; }
.tab-item.active { border-color: #D7192D; color: #FFF; background: #D7192D; font-weight: 650; }
.order-grid, .skeleton-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 14px; }
.order-card { padding: 16px; border-radius: 19px; background: #FFF; box-shadow: 0 10px 28px rgba(25,30,37,.045); transition: transform .16s ease, opacity .16s ease; }
.order-card--pressed { opacity: .7; transform: scale(.992); }
.card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.order-identify { min-width: 0; }
.order-no-line { display: flex; min-width: 0; align-items: center; gap: 7px; }
.order-no, .order-time { display: block; }
.order-no { overflow: hidden; color: #2B3037; font-size: 12px; font-weight: 660; text-overflow: ellipsis; white-space: nowrap; }
.split-order-tag { flex: 0 0 auto; padding: 2px 6px; border-radius: 7px; color: #B22131; background: #FFF0F2; font-size: 9px; line-height: 14px; }
.order-time { margin-top: 4px; color: #9A9FA7; font-size: 9px; }
.goods-preview { display: grid; grid-template-columns: 76px minmax(0,1fr); gap: 13px; margin-top: 15px; }
.goods-img { width: 76px; height: 76px; border-radius: 13px; overflow: hidden; background: #F3F4F6; }
.goods-info { min-width: 0; }
.product-name { display: -webkit-box; overflow: hidden; color: #20242A; font-size: 14px; font-weight: 650; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.product-detail, .order-stage { display: block; margin-top: 6px; color: #8D929A; font-size: 9px; }
.order-stage { color: #626A75; }
.card-footer { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 15px; padding-top: 14px; border-top: 1px solid #EEF0F2; }
.amount-area text { display: block; }
.amount-area > text:first-child { color: #979CA4; font-size: 9px; }
.amount-area > text:last-child { margin-top: 4px; color: #1D2025; font-size: 18px; font-weight: 750; font-variant-numeric: tabular-nums; }
.amount-area > text:last-child > text { margin-right: 2px; font-size: 11px; }
.action-row { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.action-btn, .empty-action { display: inline-flex; min-width: 76px; height: 34px; align-items: center; justify-content: center; margin: 0; padding: 0 13px; border: 1px solid #DDE0E3; border-radius: 11px; color: #545B65; background: #FFF; font-size: 11px; line-height: 1; }
.action-btn::after, .empty-action::after { border: 0; }
.action-btn.primary, .empty-action { border-color: #D7192D; color: #FFF; background: #D7192D; }
.load-more { display: flex; min-height: 50px; align-items: center; justify-content: center; color: #969BA3; font-size: 10px; }
.skeleton-card { padding: 16px; border: 1px solid #ECEDEF; border-radius: 19px; background: #FFF; }
.skeleton-product { display: flex; gap: 13px; margin: 16px 0; }
.skeleton-image { width: 76px; height: 76px; flex: none; border-radius: 13px; background: #F0F1F3; }
.skeleton-copy { flex: 1; padding-top: 7px; }
.skeleton-line { height: 12px; margin-bottom: 10px; border-radius: 6px; background: linear-gradient(90deg,#F2F3F4 25%,#E8EAEC 50%,#F2F3F4 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
.skeleton-line.short { width: 42%; }.skeleton-line.medium { width: 68%; }.skeleton-line.tiny { width: 28%; margin: 0; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@media screen and (min-width: 720px) {
  .order-grid, .skeleton-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 15px; }
  .filter-panel { padding-top: 7px; }
}
</style>
