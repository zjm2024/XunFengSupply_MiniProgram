<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="充值记录" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="0 0 30px">
        <view class="records-page">
          <view class="filter-wrap">
            <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false">
              <view class="filter-tabs">
                <view
                  v-for="tab in tabs"
                  :key="tab.key"
                  class="filter-tab"
                  :class="{ active: activeTab === tab.key }"
                  @tap="changeTab(tab.key)"
                >{{ tab.label }}</view>
              </view>
            </scroll-view>
          </view>

          <view class="content-wrap">
            <view class="record-summary">
              <view>
                <text class="summary-label">当前筛选</text>
                <text class="summary-title">{{ activeTabLabel }}</text>
              </view>
              <text class="summary-count">{{ totalCount }} 条记录</text>
            </view>

            <AppPageState
              :state="pageState"
              title="暂无充值记录"
              :description="pageState === PageStatus.ERROR ? loadError : '充值提交并进入财务系统后，将在这里显示状态'"
              action-text="重新加载"
              icon-type="default"
              @retry="reload"
              @action="reload"
            >
              <template #default>
                <view class="record-grid">
                  <view v-for="record in records" :key="record.rechargeId" class="record-card">
                    <view class="card-top">
                      <view class="method-mark"><AppIcon :name="methodIcon(record.payMethod)" :size="20" /></view>
                      <view class="method-copy">
                        <text class="method-name">{{ payMethodText(record.payMethod) }}</text>
                        <text class="record-time">{{ formatDateTime(record.createdAt) }}</text>
                      </view>
                      <text class="status-tag" :class="`status-${record.status}`">{{ statusText(record.status) }}</text>
                    </view>
                    <view class="amount-row">
                      <text class="amount-label">充值金额</text>
                      <text class="amount-value"><text>¥</text>{{ formatMoney(record.amount) }}</text>
                    </view>
                    <view class="detail-row"><text>充值单号</text><text>{{ record.rechargeNo || '-' }}</text></view>
                    <view class="detail-row"><text>收款账户</text><text>{{ record.accountId ? `账户 ${record.accountId}` : '-' }}</text></view>
                    <view v-if="record.transactionId" class="detail-row"><text>交易流水</text><text>{{ record.transactionId }}</text></view>
                    <view v-if="record.completedAt" class="detail-row"><text>完成时间</text><text>{{ formatDateTime(record.completedAt) }}</text></view>
                  </view>
                </view>
              </template>
            </AppPageState>

            <view v-if="pageState === PageStatus.CONTENT" class="load-status">
              <text v-if="loadingMore">正在加载…</text>
              <text v-else-if="hasMore">上拉加载更多</text>
              <text v-else>已展示全部记录</text>
            </view>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { getRechargeList } from '../../api/settlement.js'

const tabs = Object.freeze([
  { key: 'all', label: '全部', status: undefined },
  { key: 'audit', label: '待审核', status: 6 },
  { key: 'processing', label: '处理中', status: 1 },
  { key: 'success', label: '已到账', status: 2 },
  { key: 'failed', label: '失败', status: 3 },
])
const activeTab = ref('all')
const records = ref([])
const totalCount = ref(0)
const pageNum = ref(1)
const pageSize = 12
const hasMore = ref(false)
const loadingMore = ref(false)
const pageState = ref(PageStatus.LOADING)
const loadError = ref('')
const activeTabLabel = computed(() => tabs.find(tab => tab.key === activeTab.value)?.label || '全部')

onShow(() => {
  if (pageState.value === PageStatus.LOADING) reload()
})
onReachBottom(loadMore)

function changeTab(key) {
  if (key === activeTab.value) return
  activeTab.value = key
  reload()
}

async function reload() {
  pageNum.value = 1
  records.value = []
  pageState.value = PageStatus.LOADING
  await fetchPage(false)
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value || pageState.value !== PageStatus.CONTENT) return
  pageNum.value += 1
  await fetchPage(true)
}

async function fetchPage(append) {
  if (append) loadingMore.value = true
  loadError.value = ''
  try {
    const tab = tabs.find(item => item.key === activeTab.value)
    const result = await getRechargeList({ pageNum: pageNum.value, pageSize, status: tab?.status })
    records.value = append ? [...records.value, ...result.items] : result.items
    totalCount.value = result.totalCount
    hasMore.value = records.value.length < result.totalCount
    pageState.value = records.value.length ? PageStatus.CONTENT : PageStatus.EMPTY
  } catch (error) {
    if (append) pageNum.value = Math.max(1, pageNum.value - 1)
    loadError.value = error?.message || '充值记录读取失败，请稍后重试'
    if (!records.value.length) pageState.value = PageStatus.ERROR
    else uni.showToast({ title: loadError.value, icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

function formatMoney(value) {
  const number = Number(value)
  return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function statusText(status) {
  return ({ 0: '待支付', 1: '处理中', 2: '已到账', 3: '失败', 4: '已关闭', 5: '待确认', 6: '待审核' })[status] || '未知状态'
}

function payMethodText(method) {
  return ({ offline: '对公充值', wechat: '微信充值', alipay: '支付宝充值' })[String(method || '').toLowerCase()] || '账户充值'
}

function methodIcon(method) {
  return String(method || '').toLowerCase() === 'offline' ? 'bank' : 'credit-card'
}
</script>

<style lang="scss" scoped>
.records-page { width: 100%; }
.filter-wrap { position: sticky; z-index: 4; top: 0; padding: 10px var(--page-padding-x, 16px); border-bottom: 1px solid #ECEEF1; background: rgba(248,249,251,.96); box-sizing: border-box; }
.filter-scroll { width: 100%; white-space: nowrap; }
.filter-tabs { display: flex; width: max-content; gap: 8px; }
.filter-tab { display: flex; min-width: 62px; height: 36px; align-items: center; justify-content: center; padding: 0 14px; border: 1px solid #E3E5E8; border-radius: 11px; color: #676C75; background: #FFFFFF; box-sizing: border-box; font-size: 12px; }
.filter-tab.active { border-color: #D7192D; color: #FFFFFF; background: #D7192D; font-weight: 650; }
.content-wrap { width: 100%; max-width: 1080px; margin: 0 auto; padding: 16px var(--page-padding-x, 16px) 30px; box-sizing: border-box; }
.record-summary { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 13px; }
.summary-label, .summary-title { display: block; }
.summary-label { color: #969AA2; font-size: 10px; }
.summary-title { margin-top: 3px; color: #202329; font-size: 18px; font-weight: 720; }
.summary-count { color: #7C818A; font-size: 11px; }
.record-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.record-card { padding: 16px; border: 1px solid #E7E8EB; border-radius: 17px; background: #FFFFFF; box-shadow: 0 7px 22px rgba(24,29,37,.04); }
.card-top { display: grid; grid-template-columns: 42px minmax(0,1fr) auto; align-items: center; gap: 11px; }
.method-mark { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 13px; color: #40566B; background: #EEF3F5; }
.method-copy { min-width: 0; }
.method-name, .record-time { display: block; }
.method-name { color: #262A31; font-size: 14px; font-weight: 680; }
.record-time { margin-top: 4px; color: #989CA4; font-size: 10px; }
.status-tag { padding: 5px 8px; border-radius: 999px; color: #716842; background: #F7F3E8; font-size: 9px; font-weight: 650; }
.status-tag.status-2 { color: #24724D; background: #EEF7F2; }
.status-tag.status-3, .status-tag.status-4 { color: #9B2C25; background: #FFF3F2; }
.amount-row { display: flex; align-items: flex-end; justify-content: space-between; margin: 16px 0 10px; padding-bottom: 13px; border-bottom: 1px solid #EFF0F2; }
.amount-label { color: #777C85; font-size: 11px; }
.amount-value { color: #1D2127; font-size: 23px; font-weight: 750; font-variant-numeric: tabular-nums; }
.amount-value > text { margin-right: 3px; font-size: 13px; }
.detail-row { display: flex; justify-content: space-between; gap: 14px; padding: 5px 0; color: #858A93; font-size: 10px; }
.detail-row > text:last-child { min-width: 0; overflow: hidden; color: #555B64; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
.load-status { padding: 20px 0 4px; color: #9A9EA6; font-size: 11px; text-align: center; }
@media screen and (min-width: 720px) {
  .filter-wrap { padding-top: 14px; padding-bottom: 14px; }
  .filter-tabs { margin: 0 auto; }
  .record-grid { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; }
  .record-card { padding: 18px; }
}
</style>
