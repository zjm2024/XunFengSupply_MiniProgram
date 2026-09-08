<!--
  全部订单列表页面（分包：orderSub）
  对应业务流程节点：
  订单履约发货 → 查看品牌审核结果、待付款、发货状态等全部订单
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="全部订单" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="order-list-page">
          <!-- 状态Tab -->
          <scroll-view class="status-tabs" scroll-x>
            <view
              class="tab-item"
              :class="{ active: currentStatus === null }"
              @click="switchStatus(null)"
            >全部</view>
            <view
              class="tab-item"
              v-for="(tab, index) in statusTabs"
              :key="index"
              :class="{ active: currentStatus === tab.value }"
              @click="switchStatus(tab.value)"
            >{{ tab.label }}
              <view class="tab-badge" v-if="tab.count > 0">{{ tab.count }}</view>
            </view>
          </scroll-view>

          <!-- 订单列表 -->
          <scroll-view class="list-wrapper" scroll-y @scrolltolower="loadMore">
            <!-- 加载中骨架 -->
            <view v-if="loading && orderList.length === 0" class="loading-skeleton">
              <view v-for="i in 3" :key="i" class="skeleton-card">
                <view class="sk-line sk-order-no" />
                <view class="sk-line sk-product" />
                <view class="sk-line sk-amount" />
              </view>
            </view>

            <!-- 订单列表 -->
            <view class="order-list" v-if="!loading || orderList.length > 0">
              <view
                class="order-card"
                v-for="order in orderList"
                :key="order.orderId"
                @click="goToDetail(order.orderId)"
              >
                <!-- 订单头部 -->
                <view class="card-header">
                  <text class="order-no">订单号: {{ order.orderNo }}</text>
                  <status-tag :type="getStatusType(order.orderStatus)" :text="getStatusText(order.orderStatus)" />
                </view>

                <!-- 商品信息 -->
                <view class="goods-preview">
                  <image
                    class="goods-img"
                    :src="order.firstItemImageUrl || ''"
                    mode="aspectFill"
                  />
                  <view class="goods-info">
                    <text class="product-name">{{ order.firstItemProductName || '多商品订单' }}</text>
                    <text class="product-detail">{{ order.itemCount }} 种 · 共 {{ order.totalQuantity }} 件</text>
                  </view>
                  <view class="amount-area">
                    <text class="qty-text">¥{{ Number(order.payableAmount || 0).toFixed(2) }}</text>
                    <text class="status-text">{{ getStatusText(order.orderStatus) }}</text>
                  </view>
                </view>

                <!-- 订单底部 -->
                <view class="card-footer">
                  <text class="order-time">{{ formatTime(order.createdAt) }}</text>
                  <view class="action-row" v-if="getActions(order.orderStatus).length > 0">
                    <button
                      v-for="action in getActions(order.orderStatus)"
                      :key="action.key"
                      class="action-btn"
                      :class="action.type"
                      @click.stop="handleAction(action.key, order)"
                    >{{ action.label }}</button>
                  </view>
                </view>
              </view>
            </view>

            <AppPageState v-if="!loading && orderList.length === 0" state="empty" title="暂无订单" />

            <view class="load-more" v-if="orderList.length > 0">
              <text v-if="loading">加载中...</text>
              <text v-else-if="!hasMore" class="no-more">— 已经到底了 —</text>
            </view>
          </scroll-view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getOrderList, getOrderCounts, cancelOrder, confirmReceipt, generateClientRequestId } from '../../api/orderApi.js'
import { ORDER_STATUS, ORDER_STATUS_MAP } from '../../model/orderConstants.js'
import statusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

// 状态Tab配置（与后端 OrderStatus 对齐）
const statusTabs = reactive([
  { value: ORDER_STATUS.PENDING_REVIEW, label: '待审核', count: 0 },
  { value: ORDER_STATUS.PENDING_PAYMENT, label: '待付款', count: 0 },
  { value: ORDER_STATUS.PROCESSING, label: '处理中', count: 0 },
  { value: ORDER_STATUS.COMPLETED, label: '已完成', count: 0 },
  { value: ORDER_STATUS.CANCELLED, label: '已取消', count: 0 },
])

const currentStatus = ref(null)
const orderList = ref([])
const loading = ref(false)
const hasMore = ref(true)
const page = reactive({ current: 1, pageSize: 10 })

// 售后选择模式：点击订单不走详情，通过 eventChannel 返回选择结果
const selectMode = ref(null)

onLoad((options) => {
  if (options.status !== undefined) {
    currentStatus.value = Number(options.status)
  }
  if (options.selectMode === 'afterSale') {
    selectMode.value = 'afterSale'
  }
})

onShow(() => {
  resetAndLoad()
})

/**
 * 切换状态Tab
 */
function switchStatus(status) {
  currentStatus.value = status
  resetAndLoad()
}

/**
 * 重置并重新加载
 */
function resetAndLoad() {
  page.current = 1
  orderList.value = []
  hasMore.value = true
  loadOrderList()
}

/**
 * 加载订单列表
 */
async function loadOrderList() {
  if (loading.value) return
  loading.value = true

  try {
    const res = await getOrderList({
      orderStatus: currentStatus.value,
      pageNum: page.current,
      pageSize: page.pageSize,
    })

    const items = res.items || res.list || []

    if (page.current === 1) {
      orderList.value = items
    } else {
      orderList.value = [...orderList.value, ...items]
    }

    // 判断是否还有更多
    hasMore.value = items.length >= page.pageSize
  } catch (e) {
    console.error('加载订单失败:', e)
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
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
  // 售后选择模式：点击订单通过 eventChannel 返回选择结果
  if (selectMode.value === 'afterSale') {
    try {
      const pages = getCurrentPages()
      const curPage = pages[pages.length - 1]
      const eventChannel = curPage?.getOpenerEventChannel?.()
      if (eventChannel) {
        eventChannel.emit('orderSelected', { orderId })
      }
    } catch (e) {
      console.warn('[OrderList] eventChannel emit failed:', e)
    }
    navigator.back()
    return
  }
  navigator.navigateTo(routes.order.detail(orderId))
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
  return ORDER_STATUS_MAP[status]?.text || '未知'
}

/**
 * 获取状态类型（用于 StatusTag）
 */
function getStatusType(status) {
  return ORDER_STATUS_MAP[status]?.type || 'default'
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

/**
 * 根据状态获取可用操作按钮
 */
function getActions(status) {
  const actionMap = {
    [ORDER_STATUS.PENDING_REVIEW]: [{ key: 'cancel', label: '取消订单', type: 'default' }],
    [ORDER_STATUS.PENDING_PAYMENT]: [
      { key: 'pay', label: '立即付款', type: 'primary' },
      { key: 'cancel', label: '取消', type: 'default' },
    ],
    [ORDER_STATUS.PROCESSING]: [{ key: 'logistics', label: '查看物流', type: 'default' }],
    [ORDER_STATUS.COMPLETED]: [{ key: 'logistics', label: '查看物流', type: 'default' }],
  }
  return actionMap[status] || []
}

/**
 * 处理操作按钮点击
 */
async function handleAction(key, order) {
  switch (key) {
    case 'pay':
      navigator.navigateTo(routes.order.pay(order.orderId))
      break
    case 'cancel':
      uni.showModal({
        title: '提示',
        content: `确定要取消订单 ${order.orderNo} 吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await cancelOrder({
                orderId: order.orderId,
                clientRequestId: generateClientRequestId(),
              })
              uni.showToast({ title: '取消成功', icon: 'success' })
              resetAndLoad()
            } catch (e) {
              uni.showToast({ title: e.message || '取消失败', icon: 'none' })
            }
          }
        }
      })
      break
    case 'logistics':
      navigator.navigateTo(routes.order.detail(order.orderId))
      break
  }
}
</script>

<style lang="scss" scoped>
.order-list-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color);
}

.status-tabs {
  display: flex;
  white-space: nowrap;
  background: #fff;
  padding: 0 8rpx;
  flex-shrink: 0;

  .tab-item {
    display: inline-flex;
    align-items: center;
    position: relative;
    padding: 24rpx 28rpx;
    font-size: 28rpx;
    color: var(--text-secondary);

    &.active {
      color: var(--primary-color);
      font-weight: 600;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 40rpx;
        height: 4rpx;
        background: var(--primary-color);
        border-radius: 2rpx;
      }
    }

    .tab-badge {
      min-width: 30rpx;
      height: 30rpx;
      line-height: 30rpx;
      text-align: center;
      font-size: 20rpx;
      color: #fff;
      background: var(--primary-color);
      border-radius: 15rpx;
      margin-left: 8rpx;
      padding: 0 6rpx;
    }
  }
}

.list-wrapper {
  flex: 1;
  padding: 16rpx 24rpx;
}

.loading-skeleton {
  .skeleton-card {
    background: #fff;
    border-radius: 12rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;

    .sk-line {
      height: 24rpx;
      background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
      border-radius: 4rpx;
      margin-bottom: 16rpx;
    }
    .sk-order-no { width: 50%; }
    .sk-product { width: 70%; }
    .sk-amount { width: 30%; }
  }
}

.order-list {
  .order-card {
    background: #fff;
    border-radius: 12rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20rpx;

      .order-no {
        font-size: 24rpx;
        color: var(--text-secondary);
      }
    }

    .goods-preview {
      display: flex;
      gap: 16rpx;
      margin-bottom: 20rpx;

      .goods-img {
        width: 140rpx;
        height: 140rpx;
        border-radius: 8rpx;
        flex-shrink: 0;
      }

      .goods-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;

        .product-name {
          font-size: 28rpx;
          color: var(--text-primary);
          line-height: 1.4;
          margin-bottom: 8rpx;
        }

        .product-detail {
          font-size: 24rpx;
          color: var(--text-secondary);
        }
      }

      .amount-area {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: center;

        .qty-text {
          font-size: 30rpx;
          font-weight: 700;
          color: var(--primary-color);
          margin-bottom: 8rpx;
        }

        .status-text {
          font-size: 22rpx;
          color: var(--text-secondary);
        }
      }
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16rpx;
      border-top: 1rpx solid var(--border-color);

      .order-time {
        font-size: 24rpx;
        color: var(--text-placeholder);
      }

      .action-row {
        display: flex;
        gap: 16rpx;

        .action-btn {
          min-width: 140rpx;
          height: 60rpx;
          line-height: 60rpx;
          font-size: 26rpx;
          border-radius: 30rpx;
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
      }
    }
  }
}

.load-more {
  text-align: center;
  padding: 24rpx 0;
  font-size: 24rpx;
  color: var(--text-placeholder);

  .no-more { color: #CCC; }
}

@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>
