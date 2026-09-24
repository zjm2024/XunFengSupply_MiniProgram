<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="资金流水" :show-back="true" />
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
          <view class="filter-row">
            <StatusTabBar :items="filters" :model-value="currentType" :max-width="700" :item-width="88" @change="changeFilter" />
          </view>

          <AppPageState
            :state="pageState"
            title="暂无资金流水"
            :description="loadError || '充值、支付、退款及账户调整记录会显示在这里'"
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
                <view v-for="item in flows" :key="item.transactionId" class="flow-card">
                  <view class="flow-main">
                    <view class="flow-heading">
                      <text class="flow-title">{{ businessTitle(item.businessType) }}</text>
                      <text class="flow-amount" :class="amountClass(item)">{{ formatChange(item) }}</text>
                    </view>
                    <text class="flow-desc">{{ item.remark || businessDescription(item.businessType) }}</text>
                    <view class="flow-meta">
                      <text>{{ formatDateTime(item.createdAt) }}</text>
                      <text v-if="item.businessNo">业务单号 {{ item.businessNo }}</text>
                    </view>
                  </view>
                  <view class="balance-line">
                    <text>账户 {{ item.accountId }}</text>
                    <text>变动后余额 ¥{{ formatMoney(item.balanceAfter) }}</text>
                    <text v-if="item.frozenAfter">冻结 ¥{{ formatMoney(item.frozenAfter) }}</text>
                  </view>
                </view>

                <text v-if="!hasMore && flows.length" class="list-end">已展示全部 {{ totalCount }} 条流水</text>
              </view>
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
import StatusTabBar from '@/shared/ui/StatusTabBar.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { getFundFlowList } from '../../api/settlement.js'
import { formatDateTime } from '../../../../shared/utils/format.js'
import { waitForRefreshAnimation } from '../../../../shared/utils/refreshAnimation.js'

const filters = Object.freeze([
  { label: '全部', value: '' },
  { label: '支付', value: 'payment' },
  { label: '充值', value: 'recharge' },
  { label: '退款', value: 'refund' },
  { label: '调拨', value: 'transfer' },
])
const titleMap = Object.freeze({
  order_payment: '订单支付', payment: '订单支付', recharge: '充值入账', refund: '退款入账',
  rebate: '返利入账', transfer_in: '余额转入', transfer_out: '余额转出',
  freeze: '余额冻结', unfreeze: '余额解冻', adjustment: '账户调整', bill_repayment: '对账还款',
})

const flows = ref([])
const currentType = ref('')
const pageState = ref(PageStatus.LOADING)
const loadError = ref('')
const pageNum = ref(1)
const pageSize = 20
const totalCount = ref(0)
const loadingMore = ref(false)
const isRefreshing = ref(false)
const hasMore = computed(() => flows.value.length < totalCount.value)

onLoad(resetAndLoad)

async function resetAndLoad() {
  pageNum.value = 1
  flows.value = []
  pageState.value = PageStatus.LOADING
  loadError.value = ''
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
  } catch (error) {
    loadError.value = error?.message || '资金流水加载失败，请稍后重试'
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

function businessTitle(type) { return titleMap[type] || '资金变动' }
function businessDescription(type) {
  if (type === 'freeze') return '部分余额已冻结，不可用于支付'
  if (type === 'unfreeze') return '冻结余额已恢复为可用余额'
  return '账户资金发生变动'
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
.flow-page { width: 100%; max-width: 820px; margin: 0 auto; }
.filter-row { width: 100%; overflow-x: auto; padding: 0 0 12px; }
.flow-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
.flow-card { overflow: hidden; border: 0; border-radius: 17px; background: #FFFFFF; box-shadow: 0 7px 22px rgba(25,30,37,.045); }
.flow-main { padding: 15px 16px 7px; }
.flow-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
.flow-title { color: var(--color-text-primary, #111216); font-size: var(--type-body-size, 14px); font-weight: 650; }
.flow-amount { flex: 0 0 auto; font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
.flow-amount.positive { color: #168A52; }
.flow-amount.negative { color: #B42318; }
.flow-amount.neutral { color: #5E626B; }
.flow-desc { display: block; margin-top: 5px; color: var(--color-text-secondary, #676A73); font-size: var(--type-caption-size, 12px); line-height: 18px; }
.flow-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 5px 14px; margin-top: 10px; color: #969AA3; font-size: 11px; }
.balance-line { display: flex; flex-wrap: wrap; gap: 7px 14px; padding: 5px 16px 15px; color: #737780; background: #FFFFFF; font-size: 11px; }
.load-more { width: 100%; height: 42px; margin: 3px 0 0; border: 0; border-radius: 12px; color: #555A63; background: #F2F3F5; font-size: 13px; line-height: 42px; }
.list-end { padding: 10px 0 2px; color: #9A9DA4; font-size: 11px; text-align: center; }
@media screen and (min-width: 760px) { .flow-list { gap: 14px; } }
</style>
