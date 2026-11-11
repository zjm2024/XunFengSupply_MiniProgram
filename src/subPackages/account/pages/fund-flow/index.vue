<template>
  <AppPageShell>
    <template #header>
      <view class="flow-header">
        <AppHeader :title="t('account.fundCenter.balanceDetails')" :show-back="true" />
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
        <view class="flow-page">
          <view class="filter-panel">
            <StatusTabBar :items="filters" :model-value="currentType" max-width="100%" @change="changeFilter" />
          </view>
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
                  <view class="flow-heading">
                    <text class="flow-title">{{ businessTitle(item.businessType) }}</text>
                    <AmountText class="flow-amount" :class="amountClass(item)" :text="formatChange(item)" />
                  </view>
                  <view class="flow-meta">
                    <text>{{ formatDateTime(item.createdAt) }}</text>
                    <AmountText :text="t('account.fundFlow.recordBalance', { amount: formatMoney(item.balanceAfter) })" />
                  </view>
                  <text v-if="item.businessType === 'freeze' || item.businessType === 'unfreeze'"
                    class="flow-status">{{ businessDescription(item.businessType) }}</text>
                  <text v-if="item.businessNo" class="flow-no">{{ t('account.fundFlow.businessNo', { number: item.businessNo }) }}</text>
                  <text v-if="item.remark" class="flow-desc">{{ item.remark }}</text>
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
  { label: t('account.withdrawal.title'), value: 'withdrawal' },
])
const titleMap = computed(() => ({
  order_payment: t('account.fundFlow.orderPayment'), payment: t('account.fundFlow.orderPayment'), recharge: t('account.fundFlow.recharge'), refund: t('account.fundFlow.refund'),
  rebate: t('account.fundFlow.rebate'), transfer_in: t('account.fundFlow.transferIn'), transfer_out: t('account.fundFlow.transferOut'),
  withdrawal: t('account.withdrawal.paidEntry'),
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
@import '../finance-flow.scss';

.flow-page { min-width: 0; }
.filter-panel { position: sticky; top: 0; z-index: 1; margin: -12px -16px 14px; padding: 10px 16px; background: var(--surface-page, #F4F5F8); }
.filter-panel :deep(.status-tab-track) { gap: 8px; padding: 0; }
.filter-panel :deep(.status-tab-item) { min-height: 32px; padding: 0 16px; border: 0; border-radius: 18px; background: #EBEDF0; box-shadow: none; }
.filter-panel :deep(.status-tab-item.active) { color: #FFF; background: var(--color-brand, #D7192D); }
.flow-list { display: grid; gap: 12px; background: transparent; border-radius: 0; }
.flow-card { padding: 16px; border-radius: 14px; background: var(--surface-card, #FFF); }
.flow-card + .flow-card { border-top: 0; }
.flow-heading { align-items: baseline; gap: 4px 12px; }
.flow-title { font-size: 14px; font-weight: 600; line-height: 21px; }
.flow-amount { font-size: 18px; font-weight: 600; line-height: 24px; }
.flow-amount.negative { color: var(--color-brand, #D7192D); }
.flow-amount.positive { color: #00A870; }
.flow-meta { justify-content: space-between; align-items: baseline; gap: 4px 12px; margin-top: 6px; color: #858A94; font-size: 12px; line-height: 18px; }
.flow-meta .amount-text { margin-left: auto; }
.flow-no, .flow-desc { margin-top: 5px; color: #969BA5; font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
.flow-status { display: inline-block; max-width: 100%; box-sizing: border-box; margin-top: 7px; padding: 3px 7px; border-radius: 4px; color: #B76500; background: #FFF5E5; font-size: 11px; line-height: 16px; }
@media (min-width: 700px) { .flow-card { padding: 18px 20px; } }

</style>
