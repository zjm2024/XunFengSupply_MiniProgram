<template>
  <AppPageShell>
    <template #header>
      <view class="flow-header">
        <AppHeader title="授信流水" :show-back="true" />
        <view class="filter-panel">
          <StatusTabBar :items="filters" :model-value="currentType" :max-width="700" @change="changeFilter" />
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
        <view class="credit-flow-page">
          <AppPageState
            :state="pageState"
            title="暂无授信流水"
            :description="loadError || '订单使用授信后，相关额度变动会显示在这里'"
            :action-text="pageState === PageStatus.ERROR ? '重新加载' : ''"
            icon-type="default"
            compact
            @retry="resetAndLoad"
          >
            <template #illustration>
              <AppSvgIllustration name="no-revenue" size="md" />
            </template>

            <template #default>
              <view class="flow-list">
                <view v-for="item in flows" :key="item.usageId" class="flow-card">
                  <view class="flow-heading">
                    <view class="flow-title-wrap">
                      <text class="flow-title">{{ usageTitle(item.usageType) }}</text>
                      <text v-if="item.businessNo" class="flow-no">{{ item.businessNo }}</text>
                    </view>
                    <text class="flow-amount" :class="amountClass(item)">{{ formatChange(item) }}</text>
                  </view>
                  <view class="flow-meta">
                    <text>{{ formatDateTime(item.createdAt) }}</text>
                    <text>已用 ¥{{ formatMoney(item.afterUsedAmount) }}</text>
                    <text>暂占 ¥{{ formatMoney(item.afterReservedAmount) }}</text>
                  </view>
                </view>
              </view>
              <AppLoadMore :status="loadMoreStatus" @retry="loadMore" />
            </template>
          </AppPageState>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import StatusTabBar from '@/shared/ui/StatusTabBar.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { getCreditUsageList } from '../../api/settlement.js'
import { formatDateTime } from '../../../../shared/utils/format.js'
import { waitForRefreshAnimation } from '../../../../shared/utils/refreshAnimation.js'

const filters = Object.freeze([
  { label: '全部', value: '' },
  { label: '订单占用', value: 1 },
  { label: '额度释放', value: 2 },
  { label: '还款', value: 3 },
  { label: '已结算', value: 4 },
])
const usageMap = Object.freeze({ 1: '订单占用', 2: '额度释放', 3: '授信还款', 4: '授信结算' })
const flows = ref([])
const currentType = ref('')
const pageState = ref(PageStatus.LOADING)
const loadError = ref('')
const pageNum = ref(1)
const pageSize = 20
const totalCount = ref(0)
const loadingMore = ref(false)
const isRefreshing = ref(false)
const loadMoreError = ref(false)
const hasMore = computed(() => flows.value.length < totalCount.value)
const loadMoreStatus = computed(() => {
  if (loadMoreError.value) return 'error'
  if (loadingMore.value) return 'loading'
  if (!hasMore.value) return 'no-more'
  return 'idle'
})

onLoad(resetAndLoad)

async function resetAndLoad() {
  pageNum.value = 1
  flows.value = []
  pageState.value = PageStatus.LOADING
  loadError.value = ''
  loadMoreError.value = false
  await fetchPage(false)
}

async function handleRefresh() {
  if (isRefreshing.value) return
  const startedAt = Date.now()
  isRefreshing.value = true
  try { await resetAndLoad() } finally {
    await waitForRefreshAnimation(startedAt)
    isRefreshing.value = false
  }
}

function handleRefresherRestore() {
  if (!loadingMore.value && pageState.value !== PageStatus.LOADING) isRefreshing.value = false
}

async function fetchPage(append) {
  try {
    const result = await getCreditUsageList({
      pageNum: pageNum.value,
      pageSize,
      usageType: currentType.value,
    })
    flows.value = append ? [...flows.value, ...result.items] : result.items
    totalCount.value = result.totalCount
    pageState.value = flows.value.length ? PageStatus.CONTENT : PageStatus.EMPTY
    loadMoreError.value = false
  } catch (error) {
    if (append) pageNum.value = Math.max(1, pageNum.value - 1)
    loadMoreError.value = Boolean(append)
    loadError.value = error?.message || '授信流水加载失败，请稍后重试'
    pageState.value = flows.value.length ? PageStatus.CONTENT : PageStatus.ERROR
  }
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value) return
  loadingMore.value = true
  pageNum.value += 1
  try { await fetchPage(true) } finally { loadingMore.value = false }
}

function changeFilter(value) {
  if (currentType.value === value) return
  currentType.value = value
  resetAndLoad()
}

function usageTitle(type) { return usageMap[type] || '授信变动' }
function signedValue(item) {
  if (item.usageType === 1 || item.usageType === 4) return -Math.abs(item.changedAmount)
  return Math.abs(item.changedAmount)
}
function amountClass(item) { return signedValue(item) > 0 ? 'positive' : 'negative' }
function formatChange(item) {
  const value = signedValue(item)
  return `${value > 0 ? '+' : '−'}¥${formatMoney(Math.abs(value))}`
}
function formatMoney(value) {
  const number = Number(value || 0)
  return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style lang="scss" scoped>
.flow-header { background: var(--surface-page, #F4F5F8); }
.filter-panel { padding: 7px var(--page-padding-x, 16px) 12px; background: var(--surface-page, #F4F5F8); }
.credit-flow-page { width: 100%; max-width: 820px; margin: 0 auto; }
.flow-list { display: grid; gap: 10px; }
.flow-card { padding: 15px 16px; border-radius: 16px; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.flow-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.flow-title-wrap { min-width: 0; }
.flow-title, .flow-no { display: block; }
.flow-title { color: #20242A; font-size: 14px; font-weight: 680; }
.flow-no { margin-top: 4px; overflow: hidden; color: #969AA3; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.flow-amount { flex: 0 0 auto; font-size: 16px; font-weight: 720; font-variant-numeric: tabular-nums; }
.flow-amount.positive { color: #168A52; }
.flow-amount.negative { color: #B42318; }
.flow-meta { display: flex; flex-wrap: wrap; gap: 5px 14px; margin-top: 13px; color: #858A93; font-size: 11px; }
.list-end { padding: 10px 0 2px; color: #9A9DA4; font-size: 11px; text-align: center; }
</style>
