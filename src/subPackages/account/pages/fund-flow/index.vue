<template>
  <AppPageShell>
    <template #header>
      <view class="flow-header">
        <AppHeader :title="t('account.titles.funds')" :show-back="true" />
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
        <view class="flow-page">
          <AppPageState
            :state="pageState"
            :title="t('account.fundFlow.empty')"
            :description="loadError || t('account.fundFlow.emptyHint')"
            :action-text="pageState === PageStatus.ERROR ? t('account.fundFlow.reload') : ''"
            icon-type="default"
            compact
            @retry="resetAndLoad"
          >
            <template #illustration>
              <AppSvgIllustration name="no-revenue" size="md" />
            </template>

            <template #default>
              <view class="flow-list">
                <view v-for="item in flows" :key="item.transactionId" class="flow-card">
                  <view class="flow-main">
                    <view class="flow-heading">
                      <text class="flow-title">{{ businessTitle(item.businessType) }}</text>
                      <AmountText class="flow-amount" :class="amountClass(item)" :text="(formatChange(item))" />
                    </view>
                    <text class="flow-desc">{{ item.remark || businessDescription(item.businessType) }}</text>
                    <view class="flow-meta">
                      <text>{{ formatDateTime(item.createdAt) }}</text>
                      <text v-if="item.businessNo">{{ t('account.fundFlow.businessNo', { number: item.businessNo }) }}</text>
                    </view>
                  </view>
                  <view class="balance-line">
                    <text>{{ t('account.fundFlow.account', { id: item.accountId }) }}</text>
                    <AmountText :text="t('account.fundFlow.afterBalance', { amount: formatMoney(item.balanceAfter) })" />
                    <AmountText v-if="item.frozenAfter" :text="t('account.fundFlow.frozenBalance', { amount: formatMoney(item.frozenAfter) })" />
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
import { getFundFlowList } from '../../api/settlement.js'
import { formatDateTime } from '../../../../shared/utils/format.js'
import { waitForRefreshAnimation } from '../../../../shared/utils/refreshAnimation.js'

const filters = computed(() => [
  { label: t('account.fundFlow.all'), value: '' },
  { label: t('account.fundFlow.payments'), value: 'payment' },
  { label: t('account.fundFlow.topups'), value: 'recharge' },
  { label: t('account.fundFlow.refunds'), value: 'refund' },
  { label: t('account.fundFlow.transfers'), value: 'transfer' },
])
const titleMap = computed(() => ({
  order_payment: t('account.fundFlow.orderPayment'), payment: t('account.fundFlow.orderPayment'), recharge: t('account.fundFlow.recharge'), refund: t('account.fundFlow.refund'),
  rebate: t('account.fundFlow.rebate'), transfer_in: t('account.fundFlow.transferIn'), transfer_out: t('account.fundFlow.transferOut'),
  freeze: t('account.fundFlow.freeze'), unfreeze: t('account.fundFlow.unfreeze'), adjustment: t('account.fundFlow.adjustment'), bill_repayment: t('account.fundFlow.repayment'),
}))

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

/** 重置原分页并读取资金流水，语言切换不调用本方法。 */
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
  try {
    await resetAndLoad()
  } finally {
    await waitForRefreshAnimation(startedAt)
    isRefreshing.value = false
  }
}

function handleRefresherRestore() {
  if (!loadingMore.value && pageState.value !== PageStatus.LOADING) isRefreshing.value = false
}

/** 沿用原资金类型与页码，只本地化错误显示。 */
async function fetchPage(append) {
  try {
    const result = await getFundFlowList({
      pageNum: pageNum.value,
      pageSize,
      businessType: currentType.value,
    })
    const items = result.items
    flows.value = append ? [...flows.value, ...items] : items
    totalCount.value = result.totalCount
    pageState.value = flows.value.length ? PageStatus.CONTENT : PageStatus.EMPTY
    loadMoreError.value = false
  } catch (error) {
    if (append) pageNum.value = Math.max(1, pageNum.value - 1)
    loadMoreError.value = Boolean(append)
    loadFailure.value = error?.message ? error : { messageKey: 'account.fundFlow.loadFailed' }
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

/** 翻译既有资金业务类型标签，未知类型使用通用标题。 */
function businessTitle(type) { return titleMap.value[type] || t('account.fundFlow.change') }
/** 按原业务类型显示余额变动说明，不改变金额符号。 */
function businessDescription(type) {
  if (type === 'freeze') return t('account.fundFlow.freezeHint')
  if (type === 'unfreeze') return t('account.fundFlow.unfreezeHint')
  return t('account.fundFlow.changeHint')
}
function signedValue(item) { return item.balanceDelta || (item.businessType === 'unfreeze' ? -item.frozenDelta : item.frozenDelta) }
function amountClass(item) { return signedValue(item) > 0 ? 'positive' : signedValue(item) < 0 ? 'negative' : 'neutral' }
function formatChange(item) {
  const value = signedValue(item)
  const prefix = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${prefix}¥${formatMoney(Math.abs(value))}`
}
function formatMoney(value) {
  return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

</script>

<style lang="scss" scoped>
.flow-header { background: var(--surface-page, #F4F5F8); }
.filter-panel { padding: 7px var(--page-padding-x, 16px) 12px; background: var(--surface-page, #F4F5F8); }
.flow-page { width: 100%; max-width: 820px; margin: 0 auto; }
.flow-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
.flow-card { overflow: hidden; border-radius: 16px; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.flow-main { padding: 15px 16px 7px; }
.flow-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
.flow-title { color: var(--color-text-primary, #111216); font-size: var(--type-body-size, 14px); font-weight: 650; }
.flow-amount { flex: 0 0 auto; font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
.flow-amount.positive { color: #168A52; }
.flow-amount.negative { color: #B42318; }
.flow-amount.neutral { color: #5E626B; }
.flow-desc { display: block; margin-top: 5px; color: var(--color-text-secondary, #676A73); font-size: var(--type-caption-size, 12px); line-height: 18px; }
.flow-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 5px 14px; margin-top: 10px; color: #969AA3; font-size: 11px; }
.balance-line { display: flex; flex-wrap: wrap; gap: 7px 14px; padding: 5px 16px 15px; color: #737780; background: rgba(255,255,255,.3); font-size: 11px; }
.load-more { width: 100%; height: 42px; margin: 3px 0 0; border: 0; border-radius: 12px; color: #555A63; background: #F2F3F5; font-size: 13px; line-height: 42px; }
.list-end { padding: 10px 0 2px; color: #9A9DA4; font-size: 11px; text-align: center; }
@media screen and (min-width: 760px) { .flow-list { gap: 14px; } }

/* 金额按实际可用宽度缩字，父布局允许收缩。 */
.flow-title { min-width: 0; flex: 1; }
.flow-amount { min-width: 0; flex: 0 1 auto; max-width: 65%; }
.balance-line .amount-text { font-size: inherit; }
</style>
