<template>
  <AppPageShell>
    <template #header>
      <view class="flow-header">
        <AppHeader :title="t('account.titles.credit')" :show-back="true" />
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
.flow-header { background: var(--surface-page, #F4F5F8); }
.filter-panel { padding: 7px var(--page-padding-x, 16px) 12px; background: var(--surface-page, #F4F5F8); }
.credit-flow-page { width: 100%; max-width: var(--content-max-width, 1120px); margin: 0 auto; }
.flow-list { display: grid; gap: 10px; }
.flow-card { padding: 15px 16px; border-radius: var(--radius-feature, 18px); background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.flow-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.flow-title-wrap { min-width: 0; }
.flow-title, .flow-no { display: block; }
.flow-title { color: #20242A; font-size: var(--type-card-title-size, 16px); font-weight: var(--font-weight-semibold, 600); }
.flow-no { margin-top: 4px; overflow: hidden; color: #969AA3; font-size: var(--type-caption-size, 12px); text-overflow: ellipsis; white-space: nowrap; }
.flow-amount { flex: 0 0 auto; font-size: var(--type-card-title-size, 16px); font-weight: var(--font-weight-bold, 700); font-variant-numeric: tabular-nums; }
.flow-amount.positive { color: #168A52; }
.flow-amount.negative { color: #B42318; }
.flow-meta { display: flex; flex-wrap: wrap; gap: 5px 14px; margin-top: 13px; color: #858A93; font-size: var(--type-caption-size, 12px); }
.list-end { padding: 10px 0 2px; color: #9A9DA4; font-size: var(--type-caption-size, 12px); text-align: center; }

/* 金额按实际可用宽度缩字，父布局允许收缩。 */
.flow-title-wrap { flex: 1; }
.flow-amount { min-width: 0; flex: 0 1 auto; max-width: 65%; }
.flow-meta .amount-text { font-size: inherit; }
@media screen and (min-width: 1024px) {
  .flow-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.flow-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
/* 流水与账单共用阅读层级：名称14、变动金额18、时间与单号12–13。 */
.flow-page, .credit-flow-page { max-width: 1040px; }
.flow-list { grid-template-columns: minmax(0, 1fr); gap: 12px; }
.flow-card { min-width: 0; border-radius: var(--radius-card, 14px); }
.flow-main { padding: 18px 18px 12px; }
.credit-flow-page .flow-card { padding: 18px; }
.flow-heading { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px 12px; }
.flow-title, .flow-title-wrap { flex: 1 1 9em; min-width: 0; }
.flow-title { color: var(--type-body-color, #1B1C20); font-size: var(--type-body-size, 14px); line-height: 22px; overflow-wrap: anywhere; }
.flow-amount { min-width: 0; max-width: 100%; flex: 0 1 auto; margin-left: auto; font-size: var(--type-section-title-size, 18px); line-height: 26px; }
.flow-desc { margin-top: 8px; color: var(--type-secondary-color, #62666F); font-size: var(--type-body-small-size, 13px); line-height: 20px; overflow-wrap: anywhere; }
.flow-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: 8px 16px; margin-top: 12px; color: var(--type-secondary-color, #62666F); font-size: var(--type-caption-size, 12px); line-height: 18px; }
.flow-meta > text { min-width: 0; overflow-wrap: anywhere; }
.flow-no { margin-top: 5px; overflow: visible; white-space: normal; overflow-wrap: anywhere; color: var(--type-secondary-color, #62666F); font-size: var(--type-caption-size, 12px); line-height: 18px; }
.balance-line { display: flex; flex-wrap: wrap; gap: 8px 16px; padding: 12px 18px; border: 0; color: var(--type-secondary-color, #62666F); background: rgba(255,255,255,.28); font-size: var(--type-body-small-size, 13px); line-height: 20px; }
.balance-line .amount-text, .flow-meta .amount-text { min-width: 0; max-width: 100%; font-size: inherit; }
@media screen and (min-width: 1000px) { .flow-list { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; } }
</style>
