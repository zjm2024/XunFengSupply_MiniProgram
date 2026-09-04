<template>
  <AppPageShell>
    <!-- 标题栏 -->
    <template #header>
      <app-header title="订单中心" :show-back="true" />
    </template>

    <!-- 内容区 -->
    <template #content>
      <AppContent>
        <!-- Tab 切换 -->
        <scroll-view class="segment-tabs" scroll-x>
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ 'is-active': activeTab === tab.key }"
            @click="switchTab(tab.key)"
          >{{ tab.label }}
            <view class="tab-badge" v-if="tab.count > 0">{{ tab.count }}</view>
          </button>
        </scroll-view>

        <!-- 订单列表：使用 AppPageState 统一状态管理 -->
        <app-page-state
          :state="pageStatus.status"
          :has-stale-content="pageStatus.hasStaleContent"
          icon-type="order"
          action-text="重新加载"
          :fullscreen="false"
          @retry="handleRetry"
        >
          <view class="order-list">
            <view v-for="order in orders" :key="order.orderId" class="order-card" @click="viewDetail(order)">
              <!-- 订单头部 -->
              <view class="order-header">
                <text class="order-no">{{ order.orderNo }}</text>
                <status-tag-new :type="getStatusTagType(order.orderStatus)" :text="getStatusText(order.orderStatus)" />
              </view>

              <!-- 订单内容 -->
              <view class="order-body">
                <image class="order-image" :src="order.firstItemImageUrl || '/static/images/jersey-red.png'" mode="aspectFill" />
                <view class="order-info">
                  <text class="product-name">{{ order.firstItemProductName || '多商品订单' }}</text>
                  <text class="order-detail">{{ order.itemCount }} 种 · 共 {{ order.totalQuantity }} 件</text>
                </view>
                <text class="order-amount">¥{{ Number(order.payableAmount || 0).toFixed(2) }}</text>
              </view>

              <!-- 订单操作 -->
              <view class="order-footer">
                <button class="footer-btn" @click.stop="viewDetail(order)">查看详情</button>
                <button
                  v-if="order.orderStatus === ORDER_STATUS.PENDING_PAYMENT"
                  class="footer-btn btn-primary"
                  @click.stop="payOrder(order)"
                >去付款</button>
                <button
                  v-if="[ORDER_STATUS.PENDING_REVIEW, ORDER_STATUS.PENDING_PAYMENT].includes(order.orderStatus)"
                  class="footer-btn"
                  @click.stop="handleCancel(order)"
                >取消订单</button>
              </view>
            </view>

            <!-- 分页加载更多 -->
            <app-load-more
              :status="pageStatus.hasMore ? (pageStatus.isLoadingMore ? 'loading' : 'idle') : 'no-more'"
              @retry="pageStatus.loadMore"
            />
          </view>

          <!-- 骨架屏 -->
          <template #skeleton>
            <view class="order-skeleton">
              <view v-for="i in 3" :key="i" class="skeleton-order-card">
                <view class="sk-header"><view class="sk-line sk-no" /><view class="sk-tag" /></view>
                <view class="sk-body">
                  <view class="sk-img" />
                  <view class="sk-info">
                    <view class="sk-line sk-name" />
                    <view class="sk-line sk-detail" />
                  </view>
                  <view class="sk-amount" />
                </view>
                <view class="sk-footer"><view class="sk-btn" /><view class="sk-btn sk-btn-primary" /></view>
              </view>
            </view>
          </template>
        </app-page-state>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import statusTagNew from '@/components/StatusTag/StatusTag.vue'
import AppPageState from '@/components/AppPageState/AppPageState.vue'
import AppLoadMore from '@/components/AppLoadMore/AppLoadMore.vue'
import { usePageState } from '@/hooks/usePageState.js'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import appHeader from '@/components/AppHeader/AppHeader.vue'
import AppContent from '@/components/AppContent/AppContent.vue'
import { getOrderList, getOrderCounts, cancelOrder, generateClientRequestId } from '@/api/order.js'
import { ORDER_STATUS, ORDER_STATUS_MAP } from '@/config/constant.js'
import { useOrderStore } from '@/store/modules/order.js'

const orderStore = useOrderStore()

// Tab 配置（与后端 OrderStatus 对齐）
const tabs = ref([
  { key: '', label: '全部', count: 0 },
  { key: ORDER_STATUS.PENDING_REVIEW, label: '待审核', count: 0 },
  { key: ORDER_STATUS.PENDING_PAYMENT, label: '待付款', count: 0 },
  { key: ORDER_STATUS.PROCESSING, label: '处理中', count: 0 },
  { key: ORDER_STATUS.COMPLETED, label: '已完成', count: 0 },
])

const activeTab = ref('')

// 当前 tab 对应的订单状态值（空字符串表示全部）
const currentStatusFilter = computed(() => activeTab.value === '' ? null : activeTab.value)

// 使用 usePageState 管理订单列表状态
const pageStatus = usePageState(
  async ({ page, pageSize }) => {
    const res = await getOrderList({
      orderStatus: currentStatusFilter.value,
      pageNum: page,
      pageSize,
    })
    return res.items || res.list || []
  },
  { autoLoad: true, pageSize: 10 }
)

// 从 usePageState.data 获取订单列表
const orders = computed(() => pageStatus.data || [])

// 加载订单数量统计
async function loadOrderCounts() {
  try {
    const counts = await getOrderCounts()
    orderStore.setOrderCounts(counts)

    // 更新 Tab 上的角标
    tabs.value = tabs.value.map(tab => {
      let count = 0
      if (tab.key === '') count = counts.allCount || 0
      else if (tab.key === ORDER_STATUS.PENDING_REVIEW) count = counts.pendingReviewCount || 0
      else if (tab.key === ORDER_STATUS.PENDING_PAYMENT) count = counts.pendingPaymentCount || 0
      else if (tab.key === ORDER_STATUS.PROCESSING) count = counts.processingCount || 0
      else if (tab.key === ORDER_STATUS.COMPLETED) count = counts.completedCount || 0
      return { ...tab, count }
    })
  } catch (e) {
    console.error('加载订单统计失败:', e)
  }
}

// 切换 Tab
function switchTab(key) {
  if (activeTab.value === key) return
  activeTab.value = key
  pageStatus.reset()
  pageStatus.refresh()
}

// 重试加载
function handleRetry() {
  pageStatus.retry()
}

// 获取状态标签类型
function getStatusTagType(status) {
  const map = {
    [ORDER_STATUS.DRAFT]: 'default',
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

// 获取状态文本
function getStatusText(status) {
  return ORDER_STATUS_MAP[status]?.text || '未知'
}

// 查看详情
function viewDetail(order) {
  uni.navigateTo({ url: `/subPackages/orderSub/orderDetail?orderId=${order.orderId}` })
}

// 去付款
function payOrder(order) {
  uni.navigateTo({ url: `/subPackages/paySub/payPage?orderId=${order.orderId}` })
}

// 取消订单
function handleCancel(order) {
  uni.showModal({
    title: '确认取消',
    content: `确定要取消订单 ${order.orderNo} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await cancelOrder({
            orderId: order.orderId,
            clientRequestId: generateClientRequestId(),
          })
          uni.showToast({ title: '订单已取消', icon: 'success' })
          // 刷新列表
          pageStatus.refresh()
          loadOrderCounts()
        } catch (e) {
          uni.showToast({ title: e.message || '取消失败', icon: 'none' })
        }
      }
    }
  })
}

// 页面显示时刷新数据
onShow(() => {
  if (pageStatus.hasData) {
    pageStatus.refresh()
  }
  loadOrderCounts()
})
</script>

<style lang="scss" scoped>
.segment-tabs {
  display: flex;
  gap: 18px;
  border-bottom: 1px solid #EFEFF1;
  margin-bottom: 16px;
  white-space: nowrap;
}

.tab-btn {
  min-height: 42px;
  padding: 0;
  white-space: nowrap;
  border: none;
  background: transparent;
  color: #5E626B;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  position: relative;

  &.is-active {
    color: #D7192D;
    border-bottom: 2px solid #D7192D;
    font-weight: 600;
  }
}

.tab-badge {
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  font-size: 11px;
  color: #fff;
  background: #D7192D;
  border-radius: 9px;
  margin-left: 6px;
  padding: 0 5px;
}

.order-list { display: grid; gap: 12px; }

.order-card {
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
}

.order-header, .order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
}

.order-header { border-bottom: 1px solid #EFEFF1; }
.order-footer { justify-content: flex-end; gap: 8px; border-top: none; }

.order-no { font-size: 14px; color: #111216; font-weight: 500; }

.order-body {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 12px;
}

.order-image {
  width: 64px;
  height: 64px;
  border-radius: 7px;
  object-fit: cover;
}

.product-name { font-size: 14px; color: #111216; display: block; line-height: 1.45; }
.order-detail { margin-top: 2px; color: #5E626B; font-size: 12px; display: block; }
.order-amount { font-size: 15px; font-weight: 600; color: #111216; }

.footer-btn {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid #DEDFE3;
  background: white;
  border-radius: 8px;
  font-size: 13px;
  color: #5E626B;

  &.btn-primary {
    background: #D7192D;
    color: white;
    border-color: #D7192D;
  }

  &:active { opacity: 0.8; }
}

/* 订单骨架屏 */
.order-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-order-card {
  background: white;
  border-radius: 12px;
  padding: 12px;

  .sk-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    .sk-no { width: 40%; height: 14px; background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; border-radius: 3px; }
    .sk-tag { width: 28%; height: 16px; background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; border-radius: 8px; }
  }

  .sk-body {
    display: grid;
    grid-template-columns: 64px 1fr auto;
    gap: 10px;
    align-items: center;
    .sk-img { width: 64px; height: 64px; border-radius: 7px; background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; }
    .sk-info { display: flex; flex-direction: column; gap: 6px; }
    .sk-name { width: 70%; height: 14px; background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; border-radius: 3px; }
    .sk-detail { width: 45%; height: 12px; background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; border-radius: 3px; }
    .sk-amount { width: 24%; height: 15px; background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; border-radius: 3px; }
  }

  .sk-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #F7F7F8;
    .sk-btn { width: 24%; height: 28px; background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; border-radius: 8px; }
    .sk-btn-primary { width: 24%; height: 28px; background: linear-gradient(90deg, #FDECEA 25%, #FAD0D3 50%, #FDECEA 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; border-radius: 8px; }
  }
}

@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>
