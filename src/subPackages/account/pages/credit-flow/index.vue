<template>
  <AppPageShell>
    <template #header>
      <view class="flow-header">
        <AppHeader :title="t('account.fundCenter.creditDetails')" :show-back="true" />
      </view>
    </template>

    <template #content>
      <AppContent
        width-mode="standard"
        padding="12px var(--page-padding-x, 16px) 28px"
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="handleRefresh"
        @refresherrestore="handleRefresherRestore"
        @refresherabort="handleRefresherRestore"
        @scrolltolower="loadMore"
      >
        <view class="credit-flow-page">
          <FinanceFlowSummary kind="credit" :refreshing="isRefreshing" />
          <text class="finance-records-title">{{ t('account.fundCenter.creditRecords') }}</text>
          <view class="filter-panel">
            <StatusTabBar :items="filters" :model-value="currentType" max-width="100%" @change="changeFilter" />
          </view>
          <AppPageState
            :state="pageState"
            :title="t('account.creditFlow.empty')"
            :description="loadError || t('account.creditFlow.emptyHint')"
            :action-text="pageState === PageStatus.ERROR ? t('account.creditFlow.reload') : ''"
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
                    <AmountText class="flow-amount" :class="amountClass(item)" :text="(formatChange(item))" />
                  </view>
                  <view class="flow-meta">
                    <text>{{ formatDateTime(item.createdAt) }}</text>
                    <AmountText :text="t('account.creditFlow.usedAmount', { amount: formatMoney(item.afterUsedAmount) })" />
                    <AmountText :text="t('account.creditFlow.reservedAmount', { amount: formatMoney(item.afterReservedAmount) })" />
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
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import FinanceFlowSummary from '../../components/FinanceFlowSummary.vue'
import StatusTabBar from '@/shared/ui/StatusTabBar.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { getCreditUsageList } from '../../api/settlement.js'
import { formatDateTime } from '../../../../shared/utils/format.js'
import { waitForRefreshAnimation } from '../../../../shared/utils/refreshAnimation.js'

const filters = computed(() => [
  { label: t('account.creditFlow.all'), value: '' },
  { label: t('account.creditFlow.orderReservation'), value: 1 },
  { label: t('account.creditFlow.release'), value: 2 },
  { label: t('account.creditFlow.repaymentFilter'), value: 3 },
  { label: t('account.creditFlow.settledFilter'), value: 4 },
])
const usageMap = computed(() => ({ 1: t('account.creditFlow.orderReservation'), 2: t('account.creditFlow.release'), 3: t('account.creditFlow.repayment'), 4: t('account.creditFlow.settlement') }))
const flows = ref([])
const currentType = ref('')
const pageState = ref(PageStatus.LOADING)
const loadFailure = ref(null)
const loadError = computed(() => loadFailure.value?.message
  || (loadFailure.value?.messageKey ? t(loadFailure.value.messageKey) : ''))
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

/** 按原分页读取授信流水，不监听语言重发请求。 */
async function resetAndLoad() {
  pageNum.value = 1
  flows.value = []
  pageState.value = PageStatus.LOADING
  loadFailure.value = null
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

/** 保留授信使用类型和分页，只本地化错误。 */
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
    loadFailure.value = error?.message ? error : { messageKey: 'account.creditFlow.loadFailed' }
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

/** 仅翻译既有授信流水类型的显示名称。 */
function usageTitle(type) { return usageMap.value[type] || t('account.creditFlow.change') }
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
@import '../finance-flow.scss';
</style>
