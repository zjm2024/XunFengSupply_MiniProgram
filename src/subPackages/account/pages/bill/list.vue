﻿﻿﻿﻿﻿﻿<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('account.titles.bills')" :show-back="true" />
    </template>

    <template #content>
      <AppContent
        padding="16px var(--page-padding-x, 16px) 30px"
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="handleRefresh"
        @refresherrestore="handleRefresherRestore"
        @refresherabort="handleRefresherRestore"
        @scrolltolower="loadMore"
      >
        <view class="bill-page">
          <view class="toolbar-card">
            <view class="toolbar-copy">
              <text class="toolbar-label">{{ t('account.billing.period') }}</text>
            </view>
            <picker class="month-picker" mode="date" fields="month" :value="currentMonth" @change="onMonthChange">
              <view class="month-trigger">
                <AppIcon name="calendar" :size="17" />
                <text class="month-value">{{ formatMonthDisplay(currentMonth, monthDisplayLabel) }}</text>
                <AppIcon name="chevron-down" :size="14" />
              </view>
            </picker>
          </view>

          <view class="overview-card">
            <view class="overview-main">
              <text class="overview-label">{{ t('account.billing.periodTotal') }}</text>
              <AmountText class="overview-amount" :text="'¥' + (formatMoney(overview.totalAmount))" />
              <view class="overview-period"><text>{{ formatMonthDisplay(currentMonth, monthDisplayLabel) }}</text><text>{{ t('account.billing.totalStatements', { count: totalCount }) }}</text></view>
            </view>
            <view class="overview-metrics">
              <view><text>{{ t('account.billing.paidAmount') }}</text><AmountText :text="'¥' + (formatMoney(overview.paidAmount))" /></view>
              <view><text>{{ t('account.billing.outstandingAmount') }}</text><AmountText :class="{ outstanding: overview.outstandingAmount > 0 }" :text="'¥' + (formatMoney(overview.outstandingAmount))" /></view>
            </view>
          </view>

          <view class="filter-tabs">
            <StatusTabBar :items="statusTabs" :model-value="activeStatus" :max-width="700" @change="changeStatus" />
          </view>

          <AppPageState
            :state="pageState"
            :title="t('account.billing.empty')"
            :description="pageState === PageStatus.ERROR ? loadError : t('account.billing.emptyHint')"
            icon-type="order"
            @retry="loadBillList"
            @action="loadBillList"
          >
            <template #default>
              <view class="bill-grid">
                <view
                  v-for="bill in visibleBills"
                  :key="bill.billId"
                  class="bill-card"
                  hover-class="bill-card--pressed"
                  @tap="goToDetail(bill.billId)"
                >
                  <view class="bill-card-head">
                    <view class="bill-identity">
                      <view class="bill-identity-copy">
                        <text class="bill-period">{{ t('account.billing.periodStatement', { period: formatMonthDisplay(bill.billPeriod, monthDisplayLabel) }) }}</text>
                        <text class="bill-no">{{ bill.billNo || t('account.billing.statementRef', { id: bill.billId }) }}</text>
                      </view>
                    </view>
                    <StatusTag class="bill-status" :type="statusType(bill.status)" :text="statusText(bill.status)" />
                  </view>

                  <view class="bill-amount-row">
                    <view>
                      <text class="amount-label">{{ t('account.billing.amount') }}</text>
                      <AmountText class="bill-amount" :text="'¥' + (formatMoney(bill.totalAmount))" />
                    </view>
                    <view class="outstanding-copy">
                      <text>{{ t('account.billing.outstandingAmount') }}</text>
                      <AmountText :class="{ outstanding: bill.outstandingAmount > 0 }" :text="'¥' + (formatMoney(bill.outstandingAmount))" />
                    </view>
                  </view>

                  <view class="bill-foot">
                    <text>{{ t('account.billing.generated', { date: formatDate(bill.generatedAt) }) }}</text>
                    <view><text>{{ t('account.billing.details') }}</text><AppIcon name="chevron-right" :size="15" /></view>
                  </view>
                </view>
              </view>

              <view v-if="!visibleBills.length" class="filter-empty">
                <AppSvgIllustration class="filter-empty-illustration" name="no-revenue" size="sm" />
                <text>{{ t('account.billing.filterEmpty') }}</text>
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
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getBillList } from '../../api/settlement.js'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import StatusTabBar from '@/shared/ui/StatusTabBar.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { formatDate, formatMonthDisplay } from '../../../../shared/utils/format.js'
import { waitForRefreshAnimation } from '../../../../shared/utils/refreshAnimation.js'

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const bills = ref([])
const totalCount = ref(0)
const activeStatus = ref('all')
const pageState = ref(PageStatus.LOADING)
const loadFailure = ref(null)
const loadError = computed(() => loadFailure.value?.message
  || (loadFailure.value?.messageKey ? t(loadFailure.value.messageKey) : ''))
const isRefreshing = ref(false)
const pageNum = ref(1)
const pageSize = 20
const hasMore = ref(true)
const loadingMore = ref(false)
const loadMoreError = ref(false)
const overview = reactive({ totalAmount: 0, paidAmount: 0, outstandingAmount: 0 })
const statusTabs = Object.freeze([
  { key: 'all', /** 筛选通用名称随语言刷新，状态码保持不变。 */ get label() { return t('account.billing.all') } },
  { key: 'open', /** 筛选标签随语言刷新，原账单状态码不变。 */ get label() { return t('account.billing.filters.open') }, status: 0 },
  { key: 'settled', /** 筛选标签随语言刷新，原账单状态码不变。 */ get label() { return t('account.billing.filters.settled') }, status: 1 },
  { key: 'closed', /** 筛选标签随语言刷新，原账单状态码不变。 */ get label() { return t('account.billing.filters.closed') }, status: 2 },
])
const visibleBills = computed(() => {
  const status = statusTabs.find(tab => tab.key === activeStatus.value)?.status
  return status === undefined ? bills.value : bills.value.filter(bill => bill.status === status)
})
const loadMoreStatus = computed(() => {
  if (loadMoreError.value) return 'error'
  if (loadingMore.value) return 'loading'
  if (!hasMore.value) return 'no-more'
  return 'idle'
})

onLoad((options = {}) => {
  const year = Number(options.year)
  const month = Number(options.month)
  if (year > 2000 && month >= 1 && month <= 12) currentMonth.value = `${year}-${String(month).padStart(2, '0')}`
})
onShow(loadBillList)

/** 按原账期与状态重载账单，只保留可重新取词的错误。 */
async function loadBillList() {
  pageNum.value = 1
  bills.value = []
  totalCount.value = 0
  hasMore.value = true
  loadMoreError.value = false
  pageState.value = PageStatus.LOADING
  loadFailure.value = null
  await fetchBillPage(false)
}

/** 沿用原账期、状态、分页与金额汇总规则。 */
async function fetchBillPage(append) {
  if (append) loadingMore.value = true
  try {
    const status = statusTabs.find(tab => tab.key === activeStatus.value)?.status
    const result = await getBillList({
      billPeriod: currentMonth.value,
      pageNum: pageNum.value,
      pageSize,
      status,
    })
    bills.value = append ? [...bills.value, ...result.items] : result.items
    totalCount.value = result.totalCount
    hasMore.value = bills.value.length < result.totalCount
    overview.totalAmount = bills.value.reduce((sum, bill) => sum + bill.totalAmount, 0)
    overview.paidAmount = bills.value.reduce((sum, bill) => sum + bill.paidAmount, 0)
    overview.outstandingAmount = bills.value.reduce((sum, bill) => sum + bill.outstandingAmount, 0)
    pageState.value = bills.value.length ? PageStatus.CONTENT : PageStatus.EMPTY
    loadMoreError.value = false
  } catch (error) {
    if (append) {
      pageNum.value = Math.max(1, pageNum.value - 1)
      loadMoreError.value = true
    }
    loadFailure.value = error?.message ? error : { messageKey: 'account.billing.loadFailed' }
    if (!append) pageState.value = PageStatus.ERROR
  } finally {
    loadingMore.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loadingMore.value || pageState.value !== PageStatus.CONTENT) return
  pageNum.value += 1
  fetchBillPage(true)
}

async function handleRefresh() {
  if (isRefreshing.value) return
  const startedAt = Date.now()
  isRefreshing.value = true
  try {
    await loadBillList()
  } finally {
    await waitForRefreshAnimation(startedAt)
    isRefreshing.value = false
  }
}

function handleRefresherRestore() {
  if (pageState.value !== PageStatus.LOADING) isRefreshing.value = false
}

function onMonthChange(event) {
  currentMonth.value = event.detail.value
  activeStatus.value = 'all'
  loadBillList()
}

function changeStatus(key) {
  if (activeStatus.value === key) return
  activeStatus.value = key
  loadBillList()
}
function goToDetail(billId) { navigator.navigateTo(routes.account.billDetail(billId)) }
/** 仅格式化账期显示，不改变查询中的 YYYY-MM。 */
function monthDisplayLabel(year, month) {
  return t('account.billing.monthDisplay', { year, month })
}

function formatMoney(value) { const number = Number(value); return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
/** 仅本地化既有账单枚举的显示名称，保留原状态码及分支。 */
function statusText(status) { return t(({ 0: 'account.billing.statusLabels.unsettled', 1: 'account.billing.statusLabels.settled', 2: 'account.billing.statusLabels.closed' })[status] || 'account.billing.statusLabels.unknown') }
function statusType(status) { return ({ 0: 'warning', 1: 'success', 2: 'info' })[status] || 'default' }
</script>

<style lang="scss" scoped>
.bill-page { width: 100%; max-width: 1100px; margin: 0 auto; }
.toolbar-card, .overview-card, .bill-card { background: var(--glass-card-background, rgba(255,255,255,.9)); box-shadow: var(--glass-card-shadow, 0 8px 24px rgba(55,65,80,.05)); }
/* 账期选择保持完整；大字号下整块换行，不挤压年月。 */
.toolbar-card { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 12px; margin-bottom: 14px; padding: 14px 16px; border-radius: 16px; }
.toolbar-copy { flex: 1 1 8em; min-width: 0; font-size: var(--type-body-small-size, 13px); }
.toolbar-label { display: block; color: #282D34; font-size: var(--type-body-size, 14px); line-height: 1.5; font-weight: 650; }
.month-picker { flex: 0 0 auto; max-width: 100%; }
.month-trigger { display: flex; min-height: 44px; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid #DFE2E6; border-radius: 10px; color: #30353D; background: #F8F9FA; font-size: var(--type-body-small-size, 13px); line-height: 1.5; box-sizing: border-box; }
.month-value { flex: 0 0 auto; white-space: nowrap; word-break: keep-all; font-variant-numeric: tabular-nums; }
.month-trigger :deep(.app-icon) { flex-shrink: 0; }
.overview-card { overflow: hidden; border-radius: 18px; color: #20242A; }
.overview-main { min-width: 0; padding: 18px 18px 16px; }
.overview-label, .overview-period { display: block; color: #62666F; font-size: var(--type-caption-size, 12px); line-height: 1.5; }
.overview-amount { display: block; margin-top: 7px; font-size: var(--type-bill-total-size, 28px); font-weight: 750; font-variant-numeric: tabular-nums; }
.overview-period { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 6px; }
.overview-period > text { display: block; white-space: nowrap; }
/* 金额区根据文字尺寸减列，让标签完整换行，数值保留统一对齐。 */
.overview-metrics, .bill-amount-row { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,8em),1fr)); gap: 14px; font-size: var(--type-body-small-size, 13px); }
.overview-metrics { padding: 14px 18px; border-top: 1px solid #ECEEF1; background: #F8F9FB; }
.overview-metrics > view, .bill-amount-row > view { display: flex; min-width: 0; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 6px; }
.overview-metrics > view > text, .amount-label, .outstanding-copy > text { display: block; color: #62666F; font-size: var(--type-caption-size, 12px); line-height: 1.5; overflow-wrap: anywhere; }
.overview-metrics .amount-text, .outstanding-copy > .amount-text { color: #62666F; font-size: var(--type-label-size, 15px); font-weight: 650; }
.overview-metrics .outstanding, .outstanding-copy > .outstanding { color: #D7192D; }
.filter-tabs { min-width: 0; margin: 14px 0 12px; overflow: hidden; }
.bill-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 12px; }
.bill-card { min-width: 0; overflow: hidden; padding: 16px; border-radius: 16px; }
.bill-card--pressed { opacity: .72; }
.bill-card-head { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px 12px; }
.bill-identity { flex: 1 1 10em; min-width: 0; font-size: var(--type-body-size, 14px); }
.bill-identity-copy { min-width: 0; }
.bill-period, .bill-no { display: block; }
.bill-period { color: #23272E; font-size: var(--type-body-size, 14px); line-height: 1.5; font-weight: 650; overflow-wrap: anywhere; }
.bill-no { margin-top: 4px; overflow: hidden; color: #757A83; font-size: var(--type-micro-size, 11px); line-height: 1.5; text-overflow: ellipsis; white-space: nowrap; }
.bill-status { flex: 0 0 auto; margin-top: 2px; }
.bill-page :deep(.bill-status) { font-size: var(--type-micro-size, 11px); }
.bill-amount-row { margin-top: 14px; padding: 14px 0; border-top: 1px solid #ECEEF1; border-bottom: 1px solid #ECEEF1; }
.bill-amount { display: block; color: #1F2329; font-size: var(--type-bill-amount-size, 22px); font-weight: 700; font-variant-numeric: tabular-nums; }
.bill-foot, .bill-foot > view { display: flex; align-items: center; }
.bill-foot { flex-wrap: wrap; justify-content: space-between; gap: 10px 12px; padding-top: 12px; color: #757A83; font-size: var(--type-caption-size, 12px); line-height: 1.5; }
.bill-foot > text { min-width: 0; overflow-wrap: anywhere; }
.bill-foot > view { flex: 0 0 auto; min-height: 32px; gap: 2px; color: #454B54; }
.filter-empty { display: flex; flex-direction: column; align-items: center; padding: 20px 0 34px; color: #62666F; font-size: var(--type-caption-size, 12px); text-align: center; }
.filter-empty-illustration { width: 128px; height: 128px; }
@media screen and (min-width: 720px) {
  .bill-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; }
  .bill-card { padding: 18px; }
}
</style>
