<template>
  <AppPageShell>
    <template #header>
      <view class="after-sale-header">
        <AppHeader :title="t('order.titles.afterSale')" :show-back="true" />
          <view class="filter-panel">
            <StatusTabBar :items="statusTabs" :model-value="currentStatus" :max-width="700" @change="switchStatus" />
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
          class="after-sale-page"
        >
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
            :title="t('order.afterSaleList.loadFailed')"
            :description="loadErrorText"
            :action-text="t('common.retry')"
            compact
            @retry="resetAndLoad"
          />

          <template v-else-if="afterSaleList.length">
            <view class="after-sale-grid">
              <view v-for="item in afterSaleList" :key="item.afterSaleId" class="after-sale-card">
              <view class="card-header">
                <view class="identify-copy">
                  <view class="type-line">
                    <text class="type-tag">{{ getTypeLabel(item.afterSaleType) }}</text>
                    <text class="after-sale-no">{{ item.afterSaleNo }}</text>
                  </view>
                  <text class="order-no">{{ t('order.afterSaleList.orderNo') }} {{ item.orderNo || '-' }}</text>
                </view>
                <StatusTag :type="getStatusType(item.status)" :text="getStatusLabel(item.status)" />
              </view>

              <view class="goods-row">
                <AppProductImage class="goods-image" :src="item.firstItemImageUrl" mode="aspectFill" />
                <view class="goods-copy">
                  <text class="goods-name">{{ item.firstItemProductName || t('order.afterSaleList.productFallback') }}</text>
                  <text class="goods-count">{{ t('order.afterSaleList.goodsCount', { count: item.itemCount || 1, date: formatDate(item.createdAt) }) }}</text>
                  <text class="reason">{{ item.reason || t('order.afterSaleList.reasonFallback') }}</text>
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
                  <text>{{ t('order.afterSaleList.refundRequested') }}</text>
                  <AmountText :text="'¥' + (formatMoney(item.refundAmount))" />
                </view>
                <view class="actions">
                  <button v-if="canCancel(item.status)" class="action-btn secondary" @tap="confirmCancel(item)">{{ t('order.afterSaleList.cancel') }}</button>
                  <button class="action-btn secondary" @tap="viewOrder(item)">{{ t('order.afterSaleList.viewOrder') }}</button>
                </view>
              </view>
              </view>
            </view>
            <AppLoadMore :status="loadMoreStatus" @retry="loadMore" />
          </template>

          <AppPageState
            v-else
            state="empty"
            :title="t('order.afterSaleList.emptyTitle')"
            :description="t('order.afterSaleList.emptyDescription')"
            icon-type="order"
            compact
          >
            <template #actions>
              <button class="empty-action" @tap="viewCompletedOrders">{{ t('order.afterSaleList.viewCompletedOrders') }}</button>
            </template>
          </AppPageState>

        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/order/i18n/register.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { computed, reactive, ref } from 'vue'
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
import StatusTabBar from '@/shared/ui/StatusTabBar.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import { formatDate } from '../../../../shared/utils/format.js'
import { waitForRefreshAnimation } from '../../../../shared/utils/refreshAnimation.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'

const STATUS = Object.freeze({ APPLIED: 0, PENDING_REVIEW: 1, PENDING_RETURN: 2, RETURNING: 3, RECEIVED: 4, REFUNDING: 5, COMPLETED: 6, REJECTED: 7, FAILED: 8, CLOSED: 9 })
const statusTabs = computed(() => [
  { value: null, label: t('order.afterSaleList.all') },
  { value: STATUS.PENDING_REVIEW, label: t('order.afterSaleList.filters.pendingReview') },
  { value: STATUS.PENDING_RETURN, label: t('order.afterSaleList.filters.pendingReturn') },
  { value: STATUS.RETURNING, label: t('order.afterSaleList.filters.returning') },
  { value: STATUS.REFUNDING, label: t('order.afterSaleList.filters.refunding') },
  { value: STATUS.COMPLETED, label: t('order.afterSaleList.filters.completed') },
])
const currentStatus = ref(null)
const afterSaleList = ref([])
const loading = ref(false)
const isRefreshing = ref(false)
const loadError = ref('')
const loadErrorText = computed(() => loadError.value?.message
  || (loadError.value?.key ? t(loadError.value.key) : ''))
const hasMore = ref(true)
const totalCount = ref(0)
const loadMoreError = ref(false)
const page = reactive({ current: 1, pageSize: 10 })
const loadMoreStatus = computed(() => {
  if (loadMoreError.value) return 'error'
  if (loading.value) return 'loading'
  if (!hasMore.value) return 'no-more'
  return 'idle'
})

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
  loadMoreError.value = false
  await loadRecords()
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

/** 读取售后列表，保留错误对象让已有页面按当前语言显示。 */
async function loadRecords() {
  if (loading.value || !hasMore.value) return
  loading.value = true
  loadError.value = ''
  if (page.current > 1) loadMoreError.value = false
  try {
    const result = await getAfterSaleList({ status: currentStatus.value, pageNum: page.current, pageSize: page.pageSize })
    afterSaleList.value = page.current === 1 ? result.items : [...afterSaleList.value, ...result.items]
    totalCount.value = Number(result.totalCount || afterSaleList.value.length)
    hasMore.value = afterSaleList.value.length < totalCount.value
    loadMoreError.value = false
  } catch (error) {
    loadError.value = error?.message ? error : { key: 'order.afterSaleList.networkFailed' }
    if (page.current > 1) page.current--
    if (page.current > 1 || afterSaleList.value.length) loadMoreError.value = true
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.current++
  loadRecords()
}

/** 仅格式化售后申请类型名称，状态投影仍沿用原显示来源。 */
function getTypeLabel(type) { return ({ 1: t('order.afterSale.onlyRefund'), 2: t('order.afterSale.returnRefund') })[type] || t('order.afterSaleList.request') }
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
function viewOrder(item) { navigator.navigateTo(routes.order.detail(item.orderId)) }
function viewCompletedOrders() { navigator.navigateTo(routes.order.list({ status: ORDER_STATUS.COMPLETED })) }
/** 确认取消当前售后申请，提交固定审计原因并刷新原列表。 */
async function confirmCancel(item) {
  if (!await openAppDialog({
    title: t('order.afterSaleList.cancelTitle'),
    description: t('order.afterSaleList.cancelContent', { number: item.afterSaleNo }),
    confirmText: t('order.afterSaleList.confirmCancel'),
  })) return
  try {
    await cancelAfterSale({ afterSaleId: item.afterSaleId, reason: '经销商主动取消' })
    uni.showToast({ title: t('order.afterSaleList.cancelled'), icon: 'success' })
    resetAndLoad()
  } catch (error) {
    uni.showToast({ title: error?.message || t('order.afterSaleList.cancelFailed'), icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.after-sale-header { background: var(--surface-page, #F4F5F8); }
.after-sale-page { width: 100%; max-width: 1160px; margin: 0 auto; padding-bottom: env(safe-area-inset-bottom); }
.filter-panel { padding: 7px var(--page-padding-x, 16px) 12px; background: var(--surface-page, #F4F5F8); }
.after-sale-grid, .skeleton-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 12px; }
.after-sale-card { padding: 16px; border-radius: 19px; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
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
.refund-amount > .amount-text { margin-top: 4px; color: #22262B; font-size: 16px; font-weight: 730; }
.actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.action-btn, .empty-action { display: inline-flex; min-width: 76px; height: 34px; align-items: center; justify-content: center; margin: 0; padding: 0 13px; border: 1px solid #DDE0E3; border-radius: 11px; color: #555C66; background: #FFF; font-size: 11px; line-height: 1; }
.action-btn::after, .empty-action::after { border: 0; }
.empty-action { border-color: #D7192D; color: #FFF; background: #D7192D; }
.load-more { display: flex; min-height: 50px; align-items: center; justify-content: center; color: #969BA3; font-size: 10px; }
.skeleton-card { padding: 16px; border-radius: 19px; background: var(--glass-card-background, rgba(255,255,255,.74)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.skeleton-main { display: flex; gap: 13px; margin: 16px 0; }.skeleton-image { width: 72px; height: 72px; flex: none; border-radius: 13px; background: #F0F1F3; }.skeleton-copy { flex: 1; padding-top: 7px; }
.skeleton-line { height: 12px; margin-bottom: 10px; border-radius: 6px; background: linear-gradient(90deg,#F2F3F4 25%,#E8EAEC 50%,#F2F3F4 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }.skeleton-line.short { width: 42%; }.skeleton-line.medium { width: 65%; }.skeleton-line.tiny { width: 28%; margin: 0; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@media screen and (min-width: 720px) {
  .after-sale-grid, .skeleton-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 15px; }
}
@media screen and (max-width: 380px) {
  .filter-panel { padding-right: 10px; padding-left: 10px; }
}

/* 金额按实际可用宽度缩字，父布局允许收缩。 */
.refund-amount { min-width: 0; max-width: 65%; }
</style>
