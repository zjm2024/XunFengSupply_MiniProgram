<template>
  <AppPageShell>
    <template #header>
      <view class="records-header">
        <AppHeader :title="t('account.titles.rechargeRecords')" :show-back="true" />
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
        <view class="records-page">
          <view class="record-summary">
            <text class="finance-title">{{ t('account.rechargeRecords.paidRecords') }}</text>
            <text class="finance-meta">{{ t('account.rechargeRecords.count', { count: totalCount }) }}</text>
          </view>

            <AppPageState
              :state="pageState"
              :description="pageState === PageStatus.ERROR ? loadError : t('account.rechargeRecords.emptyHint')"
              icon-type="default"
              @retry="reload"
              @action="reload"
            >
              <template #default>
                <view class="record-grid">
                  <view v-for="record in records" :key="record.rechargeId" class="record-card">
                    <button class="record-trigger" :aria-expanded="expandedId === record.rechargeId"
                      :aria-label="t(expandedId === record.rechargeId ? 'account.fundCenter.hideDetails' : 'account.fundCenter.showDetails') + ' ' + money(record.amount)"
                      @tap="toggleRecord(record.rechargeId)">
                      <view class="method-copy">
                        <AmountText class="amount-value" :text="money(record.amount)" />
                        <text class="record-channel">{{ payMethodText(record.payMethod) }}</text>
                        <text class="finance-meta">{{ record.createdAt ? formatDateTime(record.createdAt, 'YYYY-MM-DD HH:mm') : '—' }}</text>
                      </view>
                      <view class="status-wrap">
                        <text class="status-tag" :class="'status-' + record.status">{{ statusText(record.status) }}</text>
                        <AppIcon :name="expandedId === record.rechargeId ? 'chevron-down' : 'chevron-right'" :size="15" color="#727983" />
                      </view>
                    </button>
                    <view v-if="expandedId === record.rechargeId" class="record-details">
                      <text class="finance-title">{{ payMethodText(record.payMethod) }}</text>
                      <view class="detail-row"><text>{{ t('account.rechargeRecords.number') }}</text><text>{{ record.rechargeNo || '-' }}</text></view>
                      <view class="detail-row"><text>{{ t('account.rechargeRecords.account') }}</text><text>{{ record.accountId ? t('account.rechargeRecords.accountRef', { id: record.accountId }) : '-' }}</text></view>
                      <view v-if="record.transactionId" class="detail-row"><text>{{ t('account.rechargeRecords.transaction') }}</text><text>{{ record.transactionId }}</text></view>
                      <view v-if="isConfirming(record)" class="recovery-note">
                        <AppIcon name="refresh" :size="14" />
                        <text>{{ t('account.rechargeRecords.processingHint') }}</text>
                      </view>
                      <view v-if="record.failureMessage" class="recovery-note is-failure">
                        <AppIcon name="info" :size="14" />
                        <text>{{ record.failureMessage }}</text>
                      </view>
                      <view v-if="record.completedAt" class="detail-row"><text>{{ t('account.rechargeRecords.completedAt') }}</text><text>{{ formatDateTime(record.completedAt) }}</text></view>
                    </view>
                  </view>
                </view>
              </template>
            </AppPageState>

            <AppLoadMore
              v-if="pageState === PageStatus.CONTENT"
              :status="loadMoreStatus"
              @retry="loadMore"
            />
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import { formatFinanceAmount as money } from '../../model/financeDisplay.js'
import '@/subPackages/account/i18n/register.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { getRechargeList } from '../../api/settlement.js'
import { formatDateTime } from '../../../../shared/utils/format.js'
import { waitForRefreshAnimation } from '../../../../shared/utils/refreshAnimation.js'

const expandedId = ref(null)
let requestSequence = 0
const records = ref([])
const totalCount = ref(0)
const pageNum = ref(1)
const pageSize = 12
const hasMore = ref(false)
const loadingMore = ref(false)
const loadMoreError = ref(false)
const isRefreshing = ref(false)
const pageState = ref(PageStatus.LOADING)
const loadFailure = ref(null)
const loadError = computed(() => loadFailure.value?.message
  || (loadFailure.value?.messageKey ? t(loadFailure.value.messageKey) : ''))
const loadMoreStatus = computed(() => {
  if (loadMoreError.value) return 'error'
  if (loadingMore.value) return 'loading'
  if (!hasMore.value) return 'no-more'
  return 'idle'
})

onShow(() => { reload() })

function toggleRecord(id) { expandedId.value = expandedId.value === id ? null : id }

async function reload() {
  pageNum.value = 1
  expandedId.value = null
  loadingMore.value = false
  records.value = []
  pageState.value = PageStatus.LOADING
  loadMoreError.value = false
  await fetchPage(false)
}

async function handleRefresh() {
  if (isRefreshing.value) return
  const startedAt = Date.now()
  isRefreshing.value = true
  try {
    await reload()
  } finally {
    await waitForRefreshAnimation(startedAt)
    isRefreshing.value = false
  }
}

function handleRefresherRestore() {
  if (!loadingMore.value && pageState.value !== PageStatus.LOADING) isRefreshing.value = false
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value || pageState.value !== PageStatus.CONTENT) return
  pageNum.value += 1
  await fetchPage(true)
}

/** 按原渠道状态和分页读取充值记录，保留错误对象。 */
async function fetchPage(append) {
  const sequence = ++requestSequence
  if (append) loadingMore.value = true
  loadFailure.value = null
  try {
    const result = await getRechargeList({ pageNum: pageNum.value, pageSize })
    if (sequence !== requestSequence) return
    records.value = append ? [...records.value, ...result.items] : result.items
    totalCount.value = result.totalCount
    hasMore.value = records.value.length < result.totalCount
    pageState.value = records.value.length ? PageStatus.CONTENT : PageStatus.EMPTY
    loadMoreError.value = false
  } catch (error) {
    if (sequence !== requestSequence) return
    if (append) {
      pageNum.value = Math.max(1, pageNum.value - 1)
      loadMoreError.value = true
    }
    loadFailure.value = error?.message ? error : { messageKey: 'account.rechargeRecords.loadFailed' }
    if (!records.value.length) pageState.value = PageStatus.ERROR
    else uni.showToast({ title: loadError.value, icon: 'none' })
  } finally {
    if (sequence === requestSequence) loadingMore.value = false
  }
}

function statusText(status) {
  return t(Number(status) === 3 ? 'account.rechargeRecords.creditException'
    : Number(status) === 1 ? 'account.rechargeRecords.creditProcessing' : 'account.fundCenter.rechargeStatus.2')
}

function isConfirming(record) { return Number(record?.status) === 1 }

/** 仅翻译已存在的充值渠道显示名，未知渠道使用通用标题。 */
function payMethodText(method) {
  return ({ wechat_native: t('account.recharge.wechatNative'), offline: t('account.rechargeRecords.offline'), wechat: t('account.rechargeRecords.wechat'), alipay: t('account.rechargeRecords.alipay') })[String(method || '').toLowerCase()] || t('account.rechargeRecords.fallback')
}


</script>

<style lang="scss" scoped>
@import '../finance-ui.scss';
.records-header { background: var(--surface-page, #f4f5f8); }
.record-summary { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.record-summary > .status-tab-bar { flex: 1; min-width: 0; width: 0; }
.record-summary > .finance-meta { flex: none; }
.record-summary text { font-size: var(--type-body-small-size, 13px); line-height: 1.5; }
.record-grid { padding: 0 14px; border-radius: var(--radius-card, 14px); background: var(--glass-card-background, #fff); }
.record-card + .record-card { border-top: 1px solid var(--border-color, #eceef1); }
.record-trigger { display: flex; align-items: center; justify-content: space-between; min-height: 80px; width: 100%; margin: 0; padding: 16px 0; gap: 8px; text-align: left; background: transparent; line-height: 1.45; }
.record-trigger::after { border: 0; }
.method-copy { display: grid; gap: 3px; min-width: 0; flex: 1; }
.record-channel { color: var(--type-secondary-color, #62666f); font-size: 13px; line-height: 1.5; }
.amount-value { font-size: 18px; }
.status-wrap { display: flex; align-items: center; flex: 0 1 auto; gap: 6px; min-width: 0; }
.status-tag { max-width: 117px; padding: 3px 7px; border-radius: 6px; color: #775020; background: #fff0d6; font-size: 13px; line-height: 1.35; }
.status-0, .status-5 { color: #465a7c; background: #edf1f7; }
.status-1 { color: #315b96; background: #edf2f8; }
.status-2 { color: #156b3c; background: #e0f4e8; }
.status-3, .status-4 { color: #a4142c; background: #f0f2f5; }
.status-tag { white-space: normal; overflow-wrap: anywhere; }
.record-details { display: grid; gap: 9px; margin-bottom: 12px; padding: 12px; border-radius: var(--radius-control, 10px); background: var(--surface-page, #f4f5f8); }
.detail-row { display: grid; grid-template-columns: minmax(0, .75fr) minmax(0, 1.25fr); gap: 8px; color: var(--type-secondary-color, #62666f); font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; }
.detail-row > :last-child { color: var(--type-body-color, #1b1c20); text-align: right; }
.recovery-note { display: flex; align-items: flex-start; gap: 6px; color: #775020; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
.recovery-note.is-failure { color: #a4142c; }
@media (max-width: 380px) {
  .detail-row { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .detail-row > :last-child { text-align: left; }
}
</style>
