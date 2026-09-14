<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="售后服务" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="8px var(--page-padding-x, 16px) 28px">
        <view class="after-sale-page">
          <scroll-view class="status-tabs" scroll-x :show-scrollbar="false">
            <view class="tabs-inner">
              <view
                v-for="tab in statusTabs"
                :key="String(tab.value)"
                class="tab-item"
                :class="{ active: currentStatus === tab.value }"
                @tap="switchStatus(tab.value)"
              >{{ tab.label }}</view>
            </view>
          </scroll-view>

          <view v-if="loading && afterSaleList.length === 0" class="skeleton-grid">
            <view v-for="i in 3" :key="i" class="skeleton-card">
              <view class="skeleton-line short" />
              <view class="skeleton-main"><view class="skeleton-image" /><view class="skeleton-copy"><view class="skeleton-line" /><view class="skeleton-line medium" /></view></view>
              <view class="skeleton-line tiny" />
            </view>
          </view>

          <AppPageState
            v-else-if="loadError && afterSaleList.length === 0"
            state="error"
            title="售后记录加载失败"
            :description="loadError"
            action-text="重新加载"
            compact
            @retry="resetAndLoad"
          />

          <view v-else-if="afterSaleList.length" class="after-sale-grid">
            <view v-for="item in afterSaleList" :key="item.afterSaleId" class="after-sale-card">
              <view class="card-header">
                <view class="identify-copy">
                  <view class="type-line">
                    <text class="type-tag">{{ getTypeLabel(item.afterSaleType) }}</text>
                    <text class="after-sale-no">{{ item.afterSaleNo }}</text>
                  </view>
                  <text class="order-no">采购订单 {{ item.orderNo || '-' }}</text>
                </view>
                <StatusTag :type="getStatusType(item.status)" :text="getStatusLabel(item.status)" />
              </view>

              <view class="goods-row">
                <AppProductImage class="goods-image" :src="item.firstItemImageUrl" mode="aspectFill" />
                <view class="goods-copy">
                  <text class="goods-name">{{ item.firstItemProductName || '售后商品' }}</text>
                  <text class="goods-count">{{ item.itemCount || 1 }} 种商品 · {{ formatTime(item.createdAt) }}</text>
                  <text class="reason">{{ item.reason || '未填写补充原因' }}</text>
                </view>
              </view>

              <view v-if="!isTerminal(item.status)" class="progress-block">
                <view class="progress-copy"><text>{{ getStatusHelp(item.status) }}</text><text>{{ getProgress(item.status) }}%</text></view>
                <view class="progress-track"><view class="progress-value" :style="{ width: `${getProgress(item.status)}%` }" /></view>
              </view>
              <view v-else class="result-note" :class="getResultTone(item.status)">
                <AppIcon :name="item.status === STATUS.COMPLETED ? 'check' : 'info'" :size="16" />
                <text>{{ getStatusHelp(item.status) }}</text>
              </view>

              <view class="card-footer">
                <view class="refund-amount">
                  <text>申请退款</text>
                  <text>¥{{ formatMoney(item.refundAmount) }}</text>
                </view>
                <view class="actions">
                  <button v-if="canCancel(item.status)" class="action-btn secondary" @tap="confirmCancel(item)">取消申请</button>
                  <button class="action-btn secondary" @tap="viewOrder(item)">查看订单</button>
                </view>
              </view>
            </view>
          </view>

          <AppPageState
            v-else
            state="empty"
            title="暂无售后记录"
            description="如需售后，请从已完成订单中发起申请"
            icon-type="order"
            compact
          >
            <template #actions>
              <button class="empty-action" @tap="viewCompletedOrders">查看已完成订单</button>
            </template>
          </AppPageState>

          <view v-if="afterSaleList.length" class="load-more" @tap="loadMore">
            <text v-if="loading">正在加载…</text>
            <text v-else-if="hasMore">加载更多记录</text>
            <text v-else>已展示全部 {{ totalCount }} 条售后记录</text>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ORDER_STATUS } from '@/app/config/constant.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { cancelAfterSale, getAfterSaleList } from '@/subPackages/order/api/afterSaleApi.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'

const STATUS = Object.freeze({ APPLIED: 0, PENDING_REVIEW: 1, PENDING_RETURN: 2, RETURNING: 3, RECEIVED: 4, REFUNDING: 5, COMPLETED: 6, REJECTED: 7, FAILED: 8, CLOSED: 9 })
const statusTabs = [
  { value: null, label: '全部' },
  { value: STATUS.PENDING_REVIEW, label: '待审核' },
  { value: STATUS.PENDING_RETURN, label: '待退货' },
  { value: STATUS.RETURNING, label: '退货中' },
  { value: STATUS.REFUNDING, label: '退款中' },
  { value: STATUS.COMPLETED, label: '已完成' },
]
const currentStatus = ref(null)
const afterSaleList = ref([])
const loading = ref(false)
const loadError = ref('')
const hasMore = ref(true)
const totalCount = ref(0)
const page = reactive({ current: 1, pageSize: 10 })

onShow(() => resetAndLoad())

function switchStatus(status) {
  if (currentStatus.value === status) return
  currentStatus.value = status
  resetAndLoad()
}

async function resetAndLoad() {
  page.current = 1
  afterSaleList.value = []
  totalCount.value = 0
  hasMore.value = true
  loadError.value = ''
  await loadRecords()
}

async function loadRecords() {
  if (loading.value || !hasMore.value) return
  loading.value = true
  loadError.value = ''
  try {
    const result = await getAfterSaleList({ status: currentStatus.value, pageNum: page.current, pageSize: page.pageSize })
    afterSaleList.value = page.current === 1 ? result.items : [...afterSaleList.value, ...result.items]
    totalCount.value = Number(result.totalCount || afterSaleList.value.length)
    hasMore.value = afterSaleList.value.length < totalCount.value
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
  loadRecords()
}

function getTypeLabel(type) { return ({ 1: '仅退款', 2: '退货退款' })[type] || '售后申请' }
function getStatusLabel(status) {
  return ({ 0: '已申请', 1: '待审核', 2: '待退货', 3: '退货中', 4: '已收货', 5: '退款中', 6: '已完成', 7: '已驳回', 8: '处理失败', 9: '已关闭' })[status] || '状态更新中'
}
function getStatusType(status) {
  if (status === STATUS.COMPLETED) return 'success'
  if ([STATUS.REJECTED, STATUS.FAILED].includes(status)) return 'error'
  if ([STATUS.PENDING_RETURN, STATUS.RETURNING, STATUS.RECEIVED].includes(status)) return 'info'
  if ([STATUS.APPLIED, STATUS.PENDING_REVIEW, STATUS.REFUNDING].includes(status)) return 'warning'
  return 'default'
}
function getStatusHelp(status) {
  return ({
    0: '申请已提交，系统正在分派审核',
    1: '品牌方正在核对订单与售后原因',
    2: '审核已通过，请按售后指引寄回商品',
    3: '退货商品运输中，请留意物流状态',
    4: '品牌方已收货，正在核验商品',
    5: '退款处理中，请留意账户资金变动',
    6: '本次售后已处理完成',
    7: '申请未通过，可联系客户服务了解原因',
    8: '处理未完成，请联系客户服务',
    9: '本次售后申请已关闭',
  })[status] || '售后状态正在同步'
}
function getProgress(status) { return ({ 0: 12, 1: 28, 2: 48, 3: 62, 4: 76, 5: 90, 6: 100 })[status] || 0 }
function isTerminal(status) { return [STATUS.COMPLETED, STATUS.REJECTED, STATUS.FAILED, STATUS.CLOSED].includes(status) }
function getResultTone(status) { return status === STATUS.COMPLETED ? 'success' : 'muted' }
function canCancel(status) { return [STATUS.APPLIED, STATUS.PENDING_REVIEW].includes(status) }
function formatMoney(value) {
  const number = Number(value)
  return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatTime(value) {
  if (!value) return '申请时间待同步'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
function viewOrder(item) { navigator.navigateTo(routes.order.detail(item.orderId)) }
function viewCompletedOrders() { navigator.navigateTo(routes.order.list({ status: ORDER_STATUS.COMPLETED })) }
function confirmCancel(item) {
  uni.showModal({
    title: '取消售后申请',
    content: `确定取消售后单 ${item.afterSaleNo} 吗？`,
    confirmText: '确认取消',
    success: async result => {
      if (!result.confirm) return
      try {
        await cancelAfterSale({ afterSaleId: item.afterSaleId, reason: '经销商主动取消' })
        uni.showToast({ title: '申请已取消', icon: 'success' })
        resetAndLoad()
      } catch (error) {
        uni.showToast({ title: error?.message || '取消失败', icon: 'none' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.after-sale-page { width: 100%; max-width: 1160px; margin: 0 auto; padding-bottom: env(safe-area-inset-bottom); }
.status-tabs { width: 100%; padding: 4px 0 8px; white-space: nowrap; }
.tabs-inner { display: inline-flex; min-width: max-content; gap: 7px; }
.tab-item { display: inline-flex; flex: 0 0 auto; height: 35px; align-items: center; padding: 0 13px; border: 1px solid #E3E5E8; border-radius: 11px; color: #707680; background: #FFF; font-size: 11px; white-space: nowrap; }
.tab-item.active { border-color: #D7192D; color: #FFF; background: #D7192D; font-weight: 650; }
.after-sale-grid, .skeleton-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 12px; }
.after-sale-card { padding: 16px; border: 1px solid #E5E7EA; border-radius: 19px; background: #FFF; box-shadow: 0 10px 28px rgba(25,30,37,.045); }
.card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.identify-copy { min-width: 0; }
.type-line { display: flex; min-width: 0; align-items: center; gap: 8px; }
.type-tag { flex: none; padding: 4px 7px; border-radius: 7px; color: #48535F; background: #EEF1F3; font-size: 9px; font-weight: 660; }
.after-sale-no { overflow: hidden; color: #2A2F36; font-size: 11px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.order-no { display: block; margin-top: 5px; color: #989DA5; font-size: 9px; }
.goods-row { display: grid; grid-template-columns: 72px minmax(0,1fr); gap: 13px; margin-top: 15px; }
.goods-image { width: 72px; height: 72px; overflow: hidden; border-radius: 13px; background: #F2F4F5; }
.goods-copy { min-width: 0; }
.goods-name { display: -webkit-box; overflow: hidden; color: #22262C; font-size: 14px; font-weight: 650; line-height: 1.4; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.goods-count, .reason { display: block; margin-top: 5px; overflow: hidden; color: #9499A1; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.reason { color: #646B75; }
.progress-block, .result-note { margin-top: 15px; padding: 11px 12px; border-radius: 12px; background: #F6F7F8; }
.progress-copy { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #6E7580; font-size: 9px; }
.progress-copy text:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.progress-track { height: 5px; margin-top: 8px; overflow: hidden; border-radius: 999px; background: #E1E4E7; }
.progress-value { height: 100%; border-radius: inherit; background: #D7192D; transition: width .25s ease; }
.result-note { display: flex; align-items: center; gap: 8px; color: #6D747E; font-size: 10px; }
.result-note.success { color: #32664D; background: #F0F7F3; }
.card-footer { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #EEF0F2; }
.refund-amount text { display: block; }
.refund-amount text:first-child { color: #989DA5; font-size: 9px; }
.refund-amount text:last-child { margin-top: 4px; color: #22262B; font-size: 16px; font-weight: 730; }
.actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.action-btn, .empty-action { display: inline-flex; min-width: 76px; height: 34px; align-items: center; justify-content: center; margin: 0; padding: 0 13px; border: 1px solid #DDE0E3; border-radius: 11px; color: #555C66; background: #FFF; font-size: 11px; line-height: 1; }
.action-btn::after, .empty-action::after { border: 0; }
.empty-action { border-color: #D7192D; color: #FFF; background: #D7192D; }
.load-more { display: flex; min-height: 50px; align-items: center; justify-content: center; color: #969BA3; font-size: 10px; }
.skeleton-card { padding: 16px; border: 1px solid #ECEDEF; border-radius: 19px; background: #FFF; }
.skeleton-main { display: flex; gap: 13px; margin: 16px 0; }.skeleton-image { width: 72px; height: 72px; flex: none; border-radius: 13px; background: #F0F1F3; }.skeleton-copy { flex: 1; padding-top: 7px; }
.skeleton-line { height: 12px; margin-bottom: 10px; border-radius: 6px; background: linear-gradient(90deg,#F2F3F4 25%,#E8EAEC 50%,#F2F3F4 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }.skeleton-line.short { width: 42%; }.skeleton-line.medium { width: 65%; }.skeleton-line.tiny { width: 28%; margin: 0; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@media screen and (min-width: 720px) {
  .after-sale-grid, .skeleton-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 15px; }
}
</style>
