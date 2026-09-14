﻿﻿﻿﻿<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="对账账单" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 30px">
        <view class="bill-page">
          <view class="toolbar-card">
            <view>
              <text class="toolbar-label">账单周期</text>
              <text class="toolbar-desc">按月查看经销商主体对账结果</text>
            </view>
            <picker mode="date" fields="month" :value="currentMonth" @change="onMonthChange">
              <view class="month-trigger">
                <AppIcon name="calendar" :size="17" />
                <text>{{ formatMonthDisplay(currentMonth) }}</text>
                <AppIcon name="chevron-down" :size="14" />
              </view>
            </picker>
          </view>

          <view class="overview-card">
            <view class="overview-main">
              <text class="overview-label">本期账单总额</text>
              <text class="overview-amount"><text>¥</text>{{ formatMoney(overview.totalAmount) }}</text>
              <text class="overview-period">{{ formatMonthDisplay(currentMonth) }} · {{ totalCount }} 份账单</text>
            </view>
            <view class="overview-metrics">
              <view><text>已结金额</text><text>¥{{ formatMoney(overview.paidAmount) }}</text></view>
              <view><text>未结金额</text><text class="outstanding">¥{{ formatMoney(overview.outstandingAmount) }}</text></view>
            </view>
          </view>

          <view class="filter-tabs">
            <view
              v-for="tab in statusTabs"
              :key="tab.key"
              class="filter-tab"
              :class="{ active: activeStatus === tab.key }"
              @tap="changeStatus(tab.key)"
            >{{ tab.label }}</view>
          </view>

          <AppPageState
            :state="pageState"
            title="本期暂无账单"
            :description="pageState === PageStatus.ERROR ? loadError : '账单由财务系统按月生成，生成后会显示在这里'"
            action-text="重新加载"
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
                      <view class="bill-icon"><AppIcon name="receipt" :size="21" /></view>
                      <view>
                        <text class="bill-period">{{ formatPeriod(bill.billPeriod) }}对账单</text>
                        <text class="bill-no">{{ bill.billNo || `账单 ${bill.billId}` }}</text>
                      </view>
                    </view>
                    <StatusTag :type="statusType(bill.status)" :text="statusText(bill.status)" />
                  </view>

                  <view class="bill-amount-row">
                    <view>
                      <text class="amount-label">账单金额</text>
                      <text class="bill-amount"><text>¥</text>{{ formatMoney(bill.totalAmount) }}</text>
                    </view>
                    <view class="outstanding-copy">
                      <text>未结金额</text>
                      <text>¥{{ formatMoney(bill.outstandingAmount) }}</text>
                    </view>
                  </view>

                  <view class="bill-foot">
                    <text>生成于 {{ formatDate(bill.generatedAt) }}</text>
                    <view><text>查看明细</text><AppIcon name="chevron-right" :size="15" /></view>
                  </view>
                </view>
              </view>

              <view v-if="!visibleBills.length" class="filter-empty">
                <AppSvgIllustration class="filter-empty-illustration" name="no-revenue" size="sm" />
                <text>当前状态下暂无账单</text>
              </view>
            </template>
          </AppPageState>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
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
import { PageStatus } from '@/shared/model/pageState.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const bills = ref([])
const totalCount = ref(0)
const activeStatus = ref('all')
const pageState = ref(PageStatus.LOADING)
const loadError = ref('')
const overview = reactive({ totalAmount: 0, paidAmount: 0, outstandingAmount: 0 })
const statusTabs = Object.freeze([
  { key: 'all', label: '全部' },
  { key: 'open', label: '未结清', status: 0 },
  { key: 'settled', label: '已结清', status: 1 },
  { key: 'closed', label: '已关闭', status: 2 },
])
const visibleBills = computed(() => {
  const status = statusTabs.find(tab => tab.key === activeStatus.value)?.status
  return status === undefined ? bills.value : bills.value.filter(bill => bill.status === status)
})

onLoad((options = {}) => {
  const year = Number(options.year)
  const month = Number(options.month)
  if (year > 2000 && month >= 1 && month <= 12) currentMonth.value = `${year}-${String(month).padStart(2, '0')}`
})
onShow(loadBillList)

async function loadBillList() {
  pageState.value = PageStatus.LOADING
  loadError.value = ''
  try {
    const result = await getBillList({ billPeriod: currentMonth.value, pageNum: 1, pageSize: 50 })
    bills.value = result.items
    totalCount.value = result.totalCount
    overview.totalAmount = bills.value.reduce((sum, bill) => sum + bill.totalAmount, 0)
    overview.paidAmount = bills.value.reduce((sum, bill) => sum + bill.paidAmount, 0)
    overview.outstandingAmount = bills.value.reduce((sum, bill) => sum + bill.outstandingAmount, 0)
    pageState.value = bills.value.length ? PageStatus.CONTENT : PageStatus.EMPTY
  } catch (error) {
    loadError.value = error?.message || '账单读取失败，请稍后重试'
    pageState.value = PageStatus.ERROR
  }
}

function onMonthChange(event) {
  currentMonth.value = event.detail.value
  activeStatus.value = 'all'
  loadBillList()
}

function changeStatus(key) { activeStatus.value = key }
function goToDetail(billId) { navigator.navigateTo(routes.account.billDetail(billId)) }
function formatMonthDisplay(value) { const [year, month] = String(value || '').split('-'); return year && month ? `${year}年${month}月` : '-' }
function formatPeriod(value) { return formatMonthDisplay(String(value || '').slice(0, 7)) }
function formatMoney(value) { const number = Number(value); return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function formatDate(value) { if (!value) return '-'; const date = new Date(value); if (Number.isNaN(date.getTime())) return String(value); const pad = number => String(number).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
function statusText(status) { return ({ 0: '未结清', 1: '已结清', 2: '已关闭' })[status] || '未知状态' }
function statusType(status) { return ({ 0: 'warning', 1: 'success', 2: 'info' })[status] || 'default' }
</script>

<style lang="scss" scoped>
.bill-page { width: 100%; max-width: 1100px; margin: 0 auto; }
.toolbar-card { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 13px; padding: 14px 15px; border: 1px solid #E7E9EC; border-radius: 15px; background: #FFFFFF; }
.toolbar-label, .toolbar-desc { display: block; }
.toolbar-label { color: #22262D; font-size: 14px; font-weight: 680; }
.toolbar-desc { margin-top: 3px; color: #999DA5; font-size: 10px; }
.month-trigger { display: flex; height: 38px; align-items: center; gap: 7px; padding: 0 11px; border: 1px solid #DFE2E6; border-radius: 11px; color: #4C525B; background: #F8F9FA; font-size: 12px; }
.overview-card { overflow: hidden; border: 1px solid #E5E7EA; border-top: 3px solid #D7192D; border-radius: 20px; color: #20242A; background: #FFFFFF; box-shadow: 0 10px 28px rgba(24,29,37,.05); }
.overview-main { padding: 21px 19px 17px; }
.overview-label, .overview-amount, .overview-period { display: block; }
.overview-label { color: #797F88; font-size: 11px; }
.overview-amount { margin-top: 7px; font-size: 31px; font-weight: 760; font-variant-numeric: tabular-nums; }
.overview-amount > text { margin-right: 3px; font-size: 17px; }
.overview-period { margin-top: 5px; color: #9A9FA6; font-size: 10px; }
.overview-metrics { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); border-top: 1px solid #ECEEF1; background: #FAFAFB; }
.overview-metrics > view { padding: 13px 19px; }
.overview-metrics > view + view { border-left: 1px solid #ECEEF1; }
.overview-metrics text { display: block; color: #878D96; font-size: 10px; }
.overview-metrics text + text { margin-top: 4px; color: #282D34; font-size: 14px; font-weight: 650; }
.overview-metrics .outstanding { color: #D7192D; }
.filter-tabs { display: flex; gap: 8px; margin: 16px 0 12px; overflow-x: auto; }
.filter-tab { display: flex; min-width: 66px; height: 36px; align-items: center; justify-content: center; padding: 0 13px; border: 1px solid #E1E3E7; border-radius: 11px; color: #696E77; background: #FFFFFF; box-sizing: border-box; font-size: 12px; }
.filter-tab.active { border-color: #D7192D; color: #FFFFFF; background: #D7192D; font-weight: 650; }
.bill-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 12px; }
.bill-card { padding: 17px; border: 1px solid #E6E8EB; border-radius: 18px; background: #FFFFFF; box-shadow: 0 7px 24px rgba(24,29,37,.04); }
.bill-card--pressed { opacity: .72; transform: scale(.995); }
.bill-card-head, .bill-identity, .bill-foot, .bill-foot > view { display: flex; align-items: center; }
.bill-card-head { justify-content: space-between; gap: 12px; }
.bill-identity { min-width: 0; gap: 11px; }
.bill-icon { display: grid; width: 42px; height: 42px; flex: 0 0 42px; place-items: center; border-radius: 13px; color: #40566B; background: #EEF3F5; }
.bill-period, .bill-no { display: block; }
.bill-period { color: #23272E; font-size: 14px; font-weight: 690; }
.bill-no { margin-top: 4px; overflow: hidden; color: #989CA4; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.bill-amount-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-top: 18px; padding: 15px 0; border-top: 1px solid #F0F1F3; border-bottom: 1px solid #F0F1F3; }
.amount-label, .bill-amount { display: block; }
.amount-label { color: #81868F; font-size: 10px; }
.bill-amount { margin-top: 4px; color: #1F2329; font-size: 22px; font-weight: 750; font-variant-numeric: tabular-nums; }
.bill-amount > text { margin-right: 3px; font-size: 12px; }
.outstanding-copy { text-align: right; }
.outstanding-copy > text { display: block; color: #92969E; font-size: 10px; }
.outstanding-copy > text:last-child { margin-top: 5px; color: #A04B42; font-size: 13px; font-weight: 650; }
.bill-foot { justify-content: space-between; gap: 12px; padding-top: 13px; color: #969AA2; font-size: 10px; }
.bill-foot > view { gap: 2px; color: #5D636C; font-size: 11px; }
.filter-empty { display: flex; flex-direction: column; align-items: center; padding: 20px 0 34px; color: #92969E; font-size: 12px; text-align: center; }
.filter-empty-illustration { width: 128px; height: 128px; }
@media screen and (min-width: 720px) {
  .overview-card { display: grid; grid-template-columns: minmax(0,1.2fr) minmax(360px,.8fr); }
  .overview-metrics { border-top: 0; border-left: 1px solid #ECEEF1; }
  .overview-metrics > view { display: flex; flex-direction: column; justify-content: center; }
  .bill-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; }
  .bill-card { padding: 19px; }
}
</style>
