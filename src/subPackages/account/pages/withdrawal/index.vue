<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('account.withdrawal.title')" :show-back="true" /></template>
    <template #content>
      <AppContent width-mode="standard" padding="12px var(--page-padding-x, 12px) 24px"
        :refresher-enabled="true" :refresher-triggered="refreshing"
        @refresherrefresh="refresh" @refresherrestore="restore" @refresherabort="restore" @scrolltolower="loadMore">
        <view class="withdrawal-card">
          <view class="card-row">
            <text class="card-secondary">{{ t('account.withdrawal.availableCash') }}</text>
            <AppButton size="sm" :disabled="!accounts.some(account => account.availableCash > 0)" @tap="openForm">
              {{ t('account.withdrawal.apply') }}
            </AppButton>
          </view>
          <AmountText class="available-amount" :text="availableCash == null ? '—' : money(availableCash)" />
          <view class="card-row">
            <text v-if="accountError" class="form-error" @tap="loadAccounts">{{ accountError }} · {{ t('common.retry') }}</text>
            <AppButton size="sm" variant="ghost" @tap="openCards">{{ t('account.withdrawal.cards') }}</AppButton>
          </view>
        </view>
        <view class="withdrawal-card">
          <text class="card-title">{{ t('account.withdrawal.records') }}</text>
          <AppPageState v-if="loading && !items.length" state="loading" compact />
          <AppPageState v-else-if="error && !items.length" state="error" :description="error"
            :action-text="t('common.retry')" compact @retry="load()" />
          <AppPageState v-else-if="!items.length" state="empty" :title="t('account.withdrawal.empty')" compact>
            <template #illustration><AppSvgIllustration name="no-order" size="sm" /></template>
          </AppPageState>
          <view v-for="item in items" :key="item.withdrawalId" class="withdrawal-record">
            <view class="card-row">
              <AmountText class="card-title" :text="money(item.amount)" />
              <text class="card-secondary">{{ statusLabel(item.status) }}</text>
            </view>
            <text class="record-line">{{ item.accountName }} · {{ item.bankName }} · •••• {{ item.accountLast4 }}</text>
            <text class="record-line card-secondary">{{ item.withdrawalNo }}</text>
            <text v-if="item.auditRemark" class="record-line">{{ item.auditRemark }}</text>
            <view class="card-row">
              <text class="card-secondary">{{ item.createdAt ? formatDateTime(item.createdAt, 'YYYY-MM-DD HH:mm') : '—' }}</text>
              <AppButton v-if="item.hasReceipt" size="sm" variant="ghost" @tap="preview(item)">{{ t('account.withdrawal.receipt') }}</AppButton>
            </view>
          </view>
          <AppLoadMore v-if="items.length" :status="moreStatus" @retry="loadMore" />
        </view>
      </AppContent>
    </template>
    <template #overlay>
      <ConfirmPopup v-model="showForm" :title="t('account.withdrawal.apply')" :confirm-text="t('account.withdrawal.submit')"
        :confirm-disabled="submitting" :dismiss-disabled="submitting" :close-on-overlay="false" @confirm="submit">
        <view class="withdrawal-form">
          <text>{{ t('account.withdrawal.sourceAccount') }}</text>
          <picker :range="accounts" range-key="accountName" :value="accountIndex" :disabled="submitting" @change="changeAccount">
            <view>{{ selectedAccount?.accountName || '—' }}</view>
          </picker>
          <text class="card-secondary">{{ t('account.withdrawal.availableCash') }} {{ money(selectedAccount?.availableCash || 0) }}</text>
          <text>{{ t('account.withdrawal.selectCard') }}</text>
          <view class="picker-field" @tap="chooseCard">
            {{ selectedCard ? selectedCard.bankName + ' · •••• ' + selectedCard.accountLast4 : t('account.withdrawal.selectCard') }}
          </view>
          <text>{{ t('account.withdrawal.amount') }}</text>
          <input v-model="amount" type="digit" maxlength="15" :disabled="submitting" :placeholder="t('account.withdrawal.amount')" />
          <text v-if="formError" class="form-error">{{ formError }}</text>
        </view>
      </ConfirmPopup>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { routes } from '@/app/config/routes.js'
import { navigator } from '@/app/navigation/navigator.js'
import { formatDateTime } from '@/shared/utils/format.js'
import { createInvoiceRequestId } from '@/shared/api/invoice.js'
import { getWithdrawalAccounts, getWithdrawalList, applyWithdrawal } from '@/shared/api/withdrawal.js'
import { useWithdrawalList } from '../../composables/useWithdrawalList.js'

const { items, loading, error, refreshing, moreStatus, load, loadMore, refresh: refreshList, restore } = useWithdrawalList(getWithdrawalList)
const accounts = ref([])
const accountId = ref('')
const accountError = ref('')
const availableCash = ref(null)
const selectedAccount = computed(() => accounts.value.find(item => item.accountId === accountId.value))
const accountIndex = computed(() => Math.max(0, accounts.value.findIndex(item => item.accountId === accountId.value)))
const selectedCard = ref(null)
const amount = ref('')
const showForm = ref(false)
const formError = ref('')
const submitting = ref(false)
let choosing = false
let pendingCard = null
let lastRequest = null
let accountSequence = 0

onShow(() => {
  if (choosing) {
    choosing = false
    if (pendingCard) selectedCard.value = pendingCard
    pendingCard = null
    showForm.value = true
  }
  load()
  loadAccounts()
})

/** 读取当前可提现本金，保留仍存在的来源账户选择。 */
async function loadAccounts() {
  const sequence = ++accountSequence
  accountError.value = ''
  try {
    const result = await getWithdrawalAccounts()
    if (sequence !== accountSequence) return
    accounts.value = result
    availableCash.value = result.reduce((sum, item) => sum + item.availableCash, 0)
    if (!selectedAccount.value) accountId.value = (result.find(item => item.availableCash > 0) || result[0])?.accountId || ''
  } catch (failure) {
    if (sequence !== accountSequence) return
    accounts.value = []
    availableCash.value = null
    accountError.value = failure?.message || t('account.withdrawal.loadFailed')
  }
}

/** 下拉刷新提现记录和各本金账户。 */
function refresh() { return Promise.all([refreshList(), loadAccounts()]) }

/** 更换扣款账户，申请金额仍由用户填写。 */
function changeAccount(event) { accountId.value = accounts.value[Number(event.detail.value)]?.accountId || '' }

/** 从提现中心进入银行卡管理。 */
function openCards() { return navigator.navigateTo(routes.account.withdrawalBankCards()) }

/** 打开申请并保留尚未提交的表单。 */
function openForm() {
  formError.value = ''
  showForm.value = true
}

/** 用银行卡列表选择收款资料，返回后恢复草稿。 */
async function chooseCard() {
  if (choosing || submitting.value) return
  choosing = true
  pendingCard = null
  showForm.value = false
  try {
    if (await navigator.navigateTo(routes.account.withdrawalBankCards({ selectMode: 1 }), {
      events: { withdrawalCardSelected: card => { pendingCard = card } },
    }) !== false) return
  } catch {
    uni.showToast({ title: t('account.withdrawal.chooseFailed'), icon: 'none' })
  }
  choosing = false
  showForm.value = true
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
    showForm.value = false
    uni.showToast({ title: t('account.withdrawal.submitted'), icon: 'success' })
    await Promise.all([load(), loadAccounts()])
  } catch (failure) {
    formError.value = failure?.message || t('account.withdrawal.submitFailed')
  } finally { submitting.value = false }
}

/** 状态文案与审核状态编码对应。 */
function statusLabel(status) { return t('account.withdrawal.status.' + ([0, 1, 2, 3].includes(status) ? status : 'unknown')) }

/** 预览页按登录主体重新读取本人打款凭证。 */
function preview(item) { return navigator.navigateTo(routes.account.withdrawalReceiptPreview(item.withdrawalId)) }

/** 统一显示人民币金额。 */
function money(amount) { return '¥' + Number(amount).toFixed(2) }
</script>

<style lang="scss" scoped>
@import './withdrawal.scss';
.available-amount { display: block; font-size: 28px; font-weight: 700; margin: 8px 0; }
.withdrawal-record { padding: 14px 0; border-bottom: 1px solid var(--color-line, #eef0f2); }
.withdrawal-record:last-child { border-bottom: 0; }
.record-line { display: block; margin: 6px 0; overflow-wrap: anywhere; font-size: 13px; }
</style>
