<template>
  <AppPageShell>
    <template #header><AppHeader :title="t(applyMode ? 'account.withdrawal.apply' : 'account.withdrawal.records')" :show-back="true" /></template>
    <template #content>
      <AppContent width-mode="standard" padding="12px var(--page-padding-x, 16px) 24px"
        :refresher-enabled="!applyMode" :refresher-triggered="refreshing" @refresherrefresh="refreshList"
        @refresherrestore="restore" @refresherabort="restore" @scrolltolower="loadMore">
        <view v-if="applyMode" class="finance-panel apply-panel">
          <text class="finance-title">{{ t('account.fundCenter.withdrawTo') }}</text>
          <button class="input-surface payee-picker" :disabled="submitting" @tap="chooseCard">
            <view class="bank-mark"><AppIcon name="bank" :size="20" /></view>
            <view class="picker-copy">
              <text>{{ selectedCard?.bankName || t('account.withdrawal.selectCard') }}</text>
              <text v-if="selectedCard" class="finance-meta">{{ selectedCard.accountHolder }} · <text class="card-tail">•••• {{ selectedCard.accountLast4 }}</text></text>
            </view>
            <AppIcon name="chevron-right" :size="16" color="#727983" />
          </button>
          <text class="finance-title">{{ t('account.withdrawal.amount') }}</text>
          <view class="input-surface amount-field">
            <text class="amount-prefix">¥</text>
            <input :placeholder-style="$inputPlaceholderStyle" v-model="amount" type="digit" maxlength="15" :disabled="submitting"
              :placeholder="t('account.withdrawal.amount')"  />
            <AppButton size="sm" variant="ghost" :disabled="submitting || !(selectedAccount?.availableCash > 0)" @tap="fillAvailable">
              {{ t('account.fundCenter.withdrawAll') }}
            </AppButton>
          </view>
          <view class="available-line">
            <text class="finance-meta">{{ t('account.withdrawal.availableCash') }}</text>
            <AmountText class="available-value" :text="money(selectedAccount?.availableCash)" />
          </view>
          <view v-if="accountError" class="available-line">
            <text class="form-error">{{ accountError }}</text>
            <AppButton size="sm" variant="ghost" @tap="loadAccounts">{{ t('common.retry') }}</AppButton>
          </view>
          <text v-if="formError" class="form-error" role="alert">{{ formError }}</text>
          <AppButton block :loading="submitting" :disabled="submitting || !selectedAccount" @tap="submit">{{ t('account.withdrawal.submit') }}</AppButton>
        </view>

        <template v-else>
          <view class="withdrawal-tools">
            <StatusTabBar :items="statusOptions" :model-value="statusIndex" max-width="100%" @change="changeStatus" />
          </view>
          <view class="finance-panel records-panel" :class="{ 'empty-data-surface': !loading && !error && !items.length }">
            <AppPageState v-if="loading && !items.length" state="loading" compact />
            <AppPageState v-else-if="error && !items.length" state="error" :description="error"
              :action-text="t('common.retry')" compact @retry="load()" />
            <AppPageState v-else-if="!items.length" state="empty" :title="t('account.withdrawal.empty')" compact>
              <template #illustration><AppSvgIllustration name="no-order" size="sm" /></template>
            </AppPageState>
            <view v-for="item in items" :key="item.withdrawalId" class="withdrawal-record">
              <button class="record-toggle" :aria-expanded="expandedId === item.withdrawalId"
                :aria-label="t(expandedId === item.withdrawalId ? 'account.fundCenter.hideDetails' : 'account.fundCenter.showDetails') + ' ' + money(item.amount)"
                @tap="toggleRecord(item.withdrawalId)">
                <view class="record-copy">
                  <AmountText class="record-amount" :text="money(item.amount)" />
                  <text class="finance-meta">{{ displayDate(item.createdAt) }}</text>
                </view>
                <view class="record-status">
                  <StatusTag :type="statusType(item.status)" :text="statusLabel(item.status)" />
                  <AppIcon :name="expandedId === item.withdrawalId ? 'chevron-down' : 'chevron-right'" :size="15" color="#727983" />
                </view>
              </button>
              <view v-if="expandedId === item.withdrawalId" class="record-detail">
                <text class="finance-title">{{ t('account.fundCenter.withdrawalDetails') }}</text>
                <view class="detail-line"><text>{{ t('account.fundCenter.withdrawalNumber') }}</text><text>{{ item.withdrawalNo }}</text></view>
                <view class="detail-line"><text>{{ t('account.withdrawal.sourceAccount') }}</text><text>{{ item.accountName }}</text></view>
                <view class="detail-line"><text>{{ t('account.fundCenter.withdrawTo') }}</text><text>{{ item.bankName }} · •••• {{ item.accountLast4 }}</text></view>
                <view class="detail-line"><text>{{ t('account.fundCenter.appliedAt') }}</text><text>{{ displayDate(item.createdAt) }}</text></view>
                <view v-if="item.auditedAt" class="detail-line"><text>{{ t('account.fundCenter.processedAt') }}</text><text>{{ displayDate(item.auditedAt) }}</text></view>
                <view v-if="item.auditRemark" class="detail-line"><text>{{ t('account.fundCenter.auditRemark') }}</text><text>{{ item.auditRemark }}</text></view>
                <AppButton v-if="item.hasReceipt" size="sm" variant="ghost" @tap="preview(item)">{{ t('account.withdrawal.receipt') }}</AppButton>
              </view>
            </view>
            <AppLoadMore v-if="items.length" :status="moreStatus" @retry="loadMore" />
          </view>
        </template>
      </AppContent>
    </template>
  </AppPageShell>
</template>


<script setup>
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import StatusTabBar from '@/shared/ui/StatusTabBar.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { routes } from '@/app/config/routes.js'
import { navigator } from '@/app/navigation/navigator.js'
import { formatDateTime } from '@/shared/utils/format.js'
import { createInvoiceRequestId } from '@/shared/api/invoice.js'
import { getWithdrawalAccounts, getWithdrawalList, applyWithdrawal } from '@/shared/api/withdrawal.js'
import { getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { useWithdrawalList } from '../../composables/useWithdrawalList.js'
import { formatFinanceAmount as money } from '../../model/financeDisplay.js'

const applyMode = ref(false)
const statusIndex = ref(0)
const expandedId = ref('')
const statusOptions = computed(() => [
  { label: t('account.fundCenter.allStatuses'), value: 0, status: undefined },
  ...[0, 1, 2, 3].map(status => ({ label: statusLabel(status), value: status + 1, status })),
])
const { items, loading, error, refreshing, moreStatus, load, loadMore, refresh: refreshList, restore } =
  useWithdrawalList(params => getWithdrawalList({ ...params, status: statusOptions.value[statusIndex.value].status }))
const accounts = ref([])
const accountId = ref('')
const accountError = ref('')
const selectedAccount = computed(() => accounts.value.find(item => item.accountId === accountId.value))
const selectedCard = ref(null)
const amount = ref('')
const formError = ref('')
const submitting = ref(false)
let choosing = false
let lastRequest = null
let accountSequence = 0

onLoad(options => { applyMode.value = options?.mode === 'apply' })
onShow(() => {
  choosing = false
  if (applyMode.value) loadAccounts()
  else load()
})

/** 按服务端默认资金账户匹配可提现本金账户。 */
async function loadAccounts() {
  const sequence = ++accountSequence
  accountError.value = ''
  accounts.value = []
  accountId.value = ''
  try {
    const [result, context] = await Promise.all([getWithdrawalAccounts(), getDealerFinanceContext()])
    if (sequence !== accountSequence) return
    accounts.value = result
    accountId.value = result.find(item => item.accountId === String(context.currentAccount?.accountId))?.accountId || ''
    if (!selectedAccount.value) accountError.value = t('account.withdrawal.defaultAccountUnavailable')
  } catch (failure) {
    if (sequence !== accountSequence) return
    accounts.value = []
    accountError.value = failure?.message || t('account.withdrawal.loadFailed')
  }
}

/** 按服务端状态筛选，刷新第一页并收起旧记录详情。 */
function changeStatus(index) {
  if (!statusOptions.value[index] || index === statusIndex.value) return
  statusIndex.value = index
  expandedId.value = ''
  items.value = []
  load()
}

/** 展开单笔现有记录，避免把单号和备注挤进窄屏首行。 */
function toggleRecord(id) { expandedId.value = expandedId.value === id ? '' : id }

/** 展示当前来源账户可提现金额。 */
function fillAvailable() {
  const cash = selectedAccount.value?.availableCash
  if (!submitting.value && cash > 0) amount.value = cash.toFixed(2)
}

/** 用银行卡列表选择收款资料，返回后恢复草稿。 */
async function chooseCard() {
  if (choosing || submitting.value) return
  choosing = true
  try {
    if (await navigator.navigateTo(routes.account.withdrawalBankCards({ selectMode: 1 }), {
      events: { withdrawalCardSelected: card => { selectedCard.value = card } },
    }) !== false) return
  } catch {
    uni.showToast({ title: t('account.withdrawal.chooseFailed'), icon: 'none' })
  }
  choosing = false
}

/** 同一资料和金额重试复用请求键，提交成功后刷新本金与列表。 */
async function submit() {
  if (submitting.value) return
  formError.value = ''
  if (!selectedAccount.value || !selectedCard.value || !/^\d{1,12}(\.\d{1,2})?$/.test(amount.value) || Number(amount.value) <= 0) {
    formError.value = t('account.withdrawal.invalidAmount')
    return
  }
  const draft = { accountId: accountId.value, bankCardId: selectedCard.value.bankCardId, amount: amount.value }
  const fingerprint = JSON.stringify(draft)
  if (lastRequest?.fingerprint !== fingerprint) {
    if (Number(amount.value) > selectedAccount.value.availableCash) {
      formError.value = t('account.withdrawal.insufficient')
      return
    }
    lastRequest = { fingerprint, id: createInvoiceRequestId() }
  }
  submitting.value = true
  try {
    await applyWithdrawal(draft, lastRequest.id)
    lastRequest = null
    amount.value = ''
    uni.showToast({ title: t('account.withdrawal.submitted'), icon: 'success' })
    await navigator.back()
  } catch (failure) {
    formError.value = failure?.message || t('account.withdrawal.submitFailed')
  } finally { submitting.value = false }
}

/** 状态文案与审核状态编码对应。 */
function statusType(status) { return ({ 0: 'warning', 1: 'info', 2: 'success', 3: 'error' })[status] || 'default' }

function statusLabel(status) { return t('account.withdrawal.status.' + ([0, 1, 2, 3].includes(status) ? status : 'unknown')) }

/** 预览页按登录主体重新读取本人打款凭证。 */
function preview(item) { return navigator.navigateTo(routes.account.withdrawalReceiptPreview(item.withdrawalId)) }

/** 申请与处理时间按设备时区显示。 */
function displayDate(value) { return formatDateTime(value, 'YYYY-MM-DD HH:mm') || '—' }
</script>

<style lang="scss" scoped>
@import '../finance-ui.scss';
@import './withdrawal.scss';

.apply-panel { display: grid; gap: 12px; max-width: 540px; margin: 0 auto; }
.apply-panel > .finance-title:not(:first-child) { margin-top: 7px; }
.input-surface { min-height: 52px; box-sizing: border-box; border-radius: var(--radius-control, 10px); background: var(--surface-page, #f4f5f8); }
.payee-picker { width: 100%; display: flex; align-items: center; gap: 10px; margin: 0; padding: 10px 12px; text-align: left; line-height: 1.45; }
.payee-picker::after, .record-toggle::after { border: 0; }
.picker-copy { display: grid; flex: 1; min-width: 0; gap: 3px; color: var(--type-body-color, #1b1c20); font-size: var(--type-body-size, 14px); overflow-wrap: anywhere; }
.amount-field { display: flex; align-items: center; gap: 6px; padding: 4px 6px 4px 12px; }
.amount-field input { flex: 1; min-width: 0; height: 44px; font-size: 22px; font-weight: 650; }
.amount-prefix { font-size: 19px; font-weight: 650; }
.available-line { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; min-width: 0; }
.available-value { font-size: var(--type-body-size, 14px); }
.apply-panel > :last-child { margin-top: 5px; }
.withdrawal-tools { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.withdrawal-tools > .status-tab-bar { flex: 1; min-width: 0; width: 0; }
.records-panel { padding: 0 14px; }
.withdrawal-record + .withdrawal-record { border-top: 1px solid var(--border-color, #eceef1); }
.record-toggle { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; min-height: 67px; margin: 0; padding: 10px 0; text-align: left; background: transparent; line-height: 1.45; }
.record-copy { display: grid; min-width: 0; flex: 1; gap: 3px; }
.record-amount { font-size: 18px; }
.record-status { display: flex; flex: none; align-items: center; gap: 6px; }
.record-detail { display: grid; gap: 10px; margin-bottom: 12px; padding: 12px; border-radius: var(--radius-control, 10px); background: var(--surface-page, #f4f5f8); }
.record-detail .detail-line { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: 8px; font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; }
.detail-line > text:first-child { color: var(--type-secondary-color, #62666f); }
.detail-line > text:last-child { text-align: right; }
@media (max-width: 355px) {
  .record-status { gap: 3px; }
  .amount-field input { font-size: 20px; }
}
</style>
