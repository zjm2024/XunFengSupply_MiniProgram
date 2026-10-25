<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('account.titles.billDetail')" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 30px">
        <view class="detail-page">
          <AppPageState
            :state="pageState"
            :title="t('account.billing.unavailable')"
            :description="loadError || t('account.billing.retryHint')"
            :action-text="t('account.billing.reload')"
            icon-type="order"
            @retry="loadDetail"
            @action="loadDetail"
          >
            <template #default>
              <view class="bill-hero">
                <view class="hero-head">
                  <view>
                    <text class="hero-label">{{ t('account.billing.periodStatement', { period: formatMonthDisplay(String(bill.billPeriod).slice(0, 7), monthDisplayLabel) }) }}</text>
                    <text class="hero-no">{{ bill.billNo || t('account.billing.statementRef', { id: bill.billId }) }}</text>
                  </view>
                  <StatusTag :type="statusType(bill.status)" :text="statusText(bill.status)" />
                </view>
                <view class="hero-amount">
                  <text class="amount-caption">{{ t('account.billing.total') }}</text>
                  <AmountText class="amount-value" :text="'¥' + (formatMoney(bill.totalAmount))" />
                </view>
                <view class="hero-metrics">
                  <view><text>{{ t('account.billing.paidAmount') }}</text><AmountText :text="'¥' + (formatMoney(bill.paidAmount))" /></view>
                  <view><text>{{ t('account.billing.outstandingAmount') }}</text><AmountText :class="{ warn: bill.outstandingAmount > 0 }" :text="'¥' + (formatMoney(bill.outstandingAmount))" /></view>
                </view>
              </view>

              <view v-if="bill.outstandingAmount > 0 && bill.status === 0" class="settlement-notice">
                <AppIcon name="info" :size="18" color="#735D35" />
                <view>
                  <text class="notice-title">{{ t('account.billing.noticeTitle') }}</text>
                  <text class="notice-desc">{{ t('account.billing.noticeHint') }}</text>
                </view>
              </view>

              <view class="content-grid">
                <view class="info-card">
                  <text class="card-title">{{ t('account.billing.info') }}</text>
                  <view class="info-row"><text>{{ t('account.billing.period') }}</text><text>{{ formatMonthDisplay(String(bill.billPeriod).slice(0, 7), monthDisplayLabel) }}</text></view>
                  <view class="info-row"><text>{{ t('account.billing.generatedAt') }}</text><text>{{ formatDateTime(bill.generatedAt) }}</text></view>
                  <view v-if="bill.settledAt" class="info-row"><text>{{ t('account.billing.settledAt') }}</text><text>{{ formatDateTime(bill.settledAt) }}</text></view>
                  <view v-if="bill.closedAt" class="info-row"><text>{{ t('account.billing.closedAt') }}</text><text>{{ formatDateTime(bill.closedAt) }}</text></view>
                  <view class="info-row"><text>{{ t('account.billing.itemCount') }}</text><text>{{ t('account.billing.entryCount', { count: bill.items.length }) }}</text></view>
                </view>

                <view class="items-card">
                  <view class="items-head">
                    <view>
                      <text class="card-title">{{ t('account.billing.entries') }}</text>
                      <text class="card-desc">{{ t('account.billing.currencyHint') }}</text>
                    </view>
                    <text class="items-count">{{ t('account.billing.entryCount', { count: bill.items.length }) }}</text>
                  </view>

                  <view v-if="bill.items.length" class="item-list">
                    <view
                      v-for="item in bill.items"
                      :key="item.billItemId"
                      class="bill-item"
                      :class="{ tappable: item.orderId > 0 }"
                      @tap="openBusiness(item)"
                    >
                      <view class="item-mark"><AppIcon :name="businessIcon(item.businessType)" :size="18" /></view>
                      <view class="item-copy">
                        <text class="item-title">{{ businessTypeText(item.businessType) }}</text>
                        <text class="item-no">{{ item.businessNo || t('account.billing.entryRef', { id: item.billItemId }) }} · {{ formatDate(item.createdAt) }}</text>
                      </view>
                      <view class="item-result">
                        <AmountText class="item-amount" :text="'¥' + (formatMoney(item.amount))" />
                        <AppIcon v-if="item.orderId > 0" name="chevron-right" :size="15" color="#A2A6AD" />
                      </view>
                    </view>
                  </view>
                  <view v-else class="items-empty">
                    <AppSvgIllustration class="items-empty-illustration" name="no-revenue" size="sm" />
                    <text>{{ t('account.billing.emptyEntries') }}</text>
                  </view>
                </view>
              </view>
            </template>
          </AppPageState>
        </view>
      </AppContent>
    </template>

    <template #overlay>
      <ConfirmPopup v-model="repaymentPickerVisible" :title="t('account.billing.selectAccount')"
        :show-cancel="false" :confirm-text="t('common.cancel')" @confirm="repaymentPickerVisible = false">
        <view class="repayment-options">
          <button v-for="option in repaymentAccountOptions" :key="option.account.accountCustomerId"
            class="repayment-option" @tap="selectRepaymentAccount(option.account)">{{ option.label }}</button>
        </view>
      </ConfirmPopup>
    </template>

    <template #footer>
      <FixedActionBar v-if="pageState === PageStatus.CONTENT">
        <button class="flow-btn flow-btn--secondary" @tap="goToFundFlow">
          <AppIcon name="history" :size="18" color="#FFFFFF" />
          <text>{{ t('account.billing.viewFundFlow') }}</text>
        </button>
        <button v-if="bill.outstandingAmount > 0 && bill.status === 0" class="flow-btn" :disabled="repaying" @tap="startRepayment">
          <AppIcon name="credit-card" :size="18" color="#FFFFFF" />
          <text>{{ repaying ? t('account.billing.repaying') : t('account.billing.repay') }}</text>
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getBillDetail, payBill } from '../../api/settlement.js'
import { getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { formatDate, formatDateTime, formatMonthDisplay } from '../../../../shared/utils/format.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'

const billId = ref(0)
const pageState = ref(PageStatus.LOADING)
const loadFailure = ref(null)
const loadError = computed(() => loadFailure.value?.message
  || (loadFailure.value?.messageKey ? t(loadFailure.value.messageKey) : ''))
const repaying = ref(false)
const repaymentPickerVisible = ref(false)
const repaymentAccounts = ref([])
const finance = ref({ accounts: [] })
const bill = reactive({ billId: 0, billNo: '', billPeriod: '', totalAmount: 0, paidAmount: 0, outstandingAmount: 0, status: 0, generatedAt: null, settledAt: null, closedAt: null, items: [] })

onLoad((options = {}) => {
  billId.value = Number(options.billId) || 0
  loadDetail()
})

/** 读取原账单及资金上下文，保留错误对象或本地错误键。 */
async function loadDetail() {
  if (!billId.value) {
    loadFailure.value = { messageKey: 'account.billing.missingId' }
    pageState.value = PageStatus.ERROR
    return
  }
  pageState.value = PageStatus.LOADING
  loadFailure.value = null
  try {
    const [detail, financeContext] = await Promise.all([
      getBillDetail(billId.value),
      getDealerFinanceContext(),
    ])
    Object.assign(bill, detail)
    finance.value = financeContext
    pageState.value = PageStatus.CONTENT
  } catch (error) {
    loadFailure.value = error?.message ? error : { messageKey: 'account.billing.detailLoadFailed' }
    pageState.value = PageStatus.ERROR
  }
}

/** 仅格式化账期显示，不改变查询中的 YYYY-MM。 */
function monthDisplayLabel(year, month) {
  return t('account.billing.monthDisplay', { year, month })
}

function formatMoney(value) { const number = Number(value); return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function statusText(status) { return ({ 0: '未结清', 1: '已结清', 2: '已关闭' })[status] || '未知状态' }
function statusType(status) { return ({ 0: 'warning', 1: 'success', 2: 'info' })[status] || 'default' }
/** 仅翻译财务明细类型的显示名称。 */
function businessTypeText(type) { return ({ order: t('account.billing.order'), order_charge: t('account.billing.creditOrder'), payment: t('account.billing.payment'), repayment: t('account.billing.repayment'), refund: t('account.billing.refund'), adjustment: t('account.billing.adjustment') })[String(type || '').toLowerCase()] || t('account.billing.entry') }
function businessIcon(type) { return ['order', 'order_charge'].includes(String(type || '').toLowerCase()) ? 'order' : 'receipt' }
function openBusiness(item) { if (item.orderId > 0) navigator.navigateTo(routes.order.detail(item.orderId)) }
function goToFundFlow() { navigator.navigateTo(routes.account.fundFlow()) }

/** 按原资格筛选账户，冻结当前选择菜单的账户快照。 */
function startRepayment() {
  const accounts = (finance.value.accounts || []).filter(item =>
    item.accountStatus === 1
    && item.financeStatus === 1
    && item.canParticipateCombinationPay
    && Number(item.availableBalance) > 0,
  )
  if (!accounts.length) {
    uni.showToast({ title: t('account.billing.noAccount'), icon: 'none' })
    return
  }
  repaymentAccounts.value = accounts
  repaymentPickerVisible.value = true
}

/** 返回选择时的原账户显示名称，真实姓名不翻译。 */
function repaymentAccountName(account) {
  return account.isMaster ? t('account.billing.mainAccount') : (account.realName || account.username)
}

const repaymentAccountOptions = computed(() => repaymentAccounts.value.map(account => ({
  account,
  label: t('account.billing.accountOption', { name: repaymentAccountName(account), amount: formatMoney(account.availableBalance) }),
})))

/** 关闭菜单后确认所选快照账户，语言变化不提交操作。 */
function selectRepaymentAccount(account) {
  if (!account) return
  repaymentPickerVisible.value = false
  confirmRepayment(account)
}

/** 用户确认原计算金额后沿用原还款请求。 */
async function confirmRepayment(account) {
  const amount = Math.min(Number(bill.outstandingAmount), Number(account.availableBalance))
  if (!await openAppDialog({
    title: t('account.billing.confirmRepayTitle'),
    description: t('account.billing.confirmContent', { name: repaymentAccountName(account), amount: formatMoney(amount) }),
    confirmText: t('account.billing.confirmRepay'),
    cancelText: t('common.cancel'),
    danger: true,
  })) return
  submitRepayment(account, amount)
}

/** 沿用原账单、账户、金额与幂等键提交一次还款。 */
async function submitRepayment(account, amount) {
  if (repaying.value) return
  repaying.value = true
  try {
    await payBill(bill.billId, {
      accountCustomerId: account.accountCustomerId,
      amount,
      clientRequestId: `bill-repay-${bill.billId}-${Date.now()}`,
    })
    uni.showToast({ title: t('account.billing.repaid'), icon: 'success' })
    await loadDetail()
  } catch (error) {
    uni.showToast({ title: error?.message || t('account.billing.repayFailed'), icon: 'none' })
  } finally {
    repaying.value = false
  }
}
</script>

<style lang="scss" scoped>
.repayment-options { display: grid; gap: 10px; }
.repayment-option { width: 100%; margin: 0; padding: 12px; border-radius: var(--radius-control); color: var(--type-body-color); background: var(--surface-subtle); font-size: var(--type-body-size); line-height: 1.5; text-align: left; overflow-wrap: anywhere; }
.repayment-option::after { border: 0; }
.detail-page { width: 100%; max-width: 1080px; margin: 0 auto; }
.bill-hero { overflow: hidden; border-top: 3px solid #D7192D; border-radius: 20px; color: #20242A; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.hero-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 19px 19px 0; }
.hero-label, .hero-no { display: block; }
.hero-label { color: #252A31; font-size: 15px; font-weight: 680; }
.hero-no { margin-top: 4px; color: #969BA3; font-size: 10px; }
.hero-amount { padding: 24px 19px 19px; }
.amount-caption, .amount-value { display: block; }
.amount-caption { color: #858B94; font-size: 10px; }
.amount-value { margin-top: 6px; font-size: 32px; font-weight: 760; font-variant-numeric: tabular-nums; }
.hero-metrics { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); border-top: 1px solid #ECEEF1; background: #FAFAFB; }
.hero-metrics > view { padding: 13px 19px; }
.hero-metrics > view + view { border-left: 1px solid #ECEEF1; }
.hero-metrics text { display: block; color: #858B94; font-size: 10px; }
.hero-metrics .amount-text { margin-top: 4px; color: #282D34; font-size: 14px; font-weight: 650; }
.hero-metrics .warn { color: #D7192D; }
.settlement-notice { display: flex; align-items: flex-start; gap: 10px; margin-top: 14px; padding: 13px 14px; border: 1px solid #E9E0CB; border-radius: 14px; color: #735D35; background: #FAF8F2; }
.notice-title, .notice-desc { display: block; }
.notice-title { font-size: 12px; font-weight: 680; }
.notice-desc { margin-top: 4px; color: #8A7A5C; font-size: 10px; line-height: 16px; }
.content-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 14px; margin-top: 14px; }
.info-card, .items-card { padding: 17px; border-radius: 18px; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.card-title, .card-desc { display: block; }
.card-title { color: #24282F; font-size: 15px; font-weight: 700; }
.card-desc { margin-top: 3px; color: #9A9EA5; font-size: 10px; }
.info-row { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid #F0F1F3; color: #858A93; font-size: 11px; }
.info-row:first-of-type { margin-top: 8px; }
.info-row:last-child { padding-bottom: 0; border-bottom: 0; }
.info-row > text:last-child { color: #3E444D; text-align: right; }
.items-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.items-count { color: #888D96; font-size: 10px; }
.item-list { margin-top: 10px; }
.bill-item { display: grid; grid-template-columns: 38px minmax(0,1fr) minmax(0,.65fr); align-items: center; gap: 10px; min-height: 68px; border-top: 1px solid #F0F1F3; }
.bill-item.tappable:active { opacity: .65; }
.item-mark { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 11px; color: #445A6D; background: #EEF3F5; }
.item-copy { min-width: 0; }
.item-title, .item-no { display: block; }
.item-title { color: #2A2E35; font-size: 12px; font-weight: 650; }
.item-no { margin-top: 4px; overflow: hidden; color: #999DA5; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.item-result { display: flex; align-items: center; gap: 4px; }
.item-amount { color: #23272E; font-size: 13px; font-weight: 680; font-variant-numeric: tabular-nums; }
.items-empty { display: flex; flex-direction: column; align-items: center; padding: 16px 0 28px; color: #969AA2; font-size: 11px; text-align: center; }
.items-empty-illustration { width: 124px; height: 124px; }
.flow-btn { display: flex; flex: 1; width: min(100%,460px); height: 48px; align-items: center; justify-content: center; gap: 8px; margin: 0; border: 0; border-radius: 13px; color: #FFFFFF; background: #D7192D; font-size: 14px; font-weight: 680; }
.flow-btn--secondary { background: #4F555E; }
.flow-btn::after { border: 0; }
@media screen and (min-width: 760px) {
  .bill-hero { display: grid; grid-template-columns: minmax(0,1.1fr) minmax(360px,.9fr); }
  .hero-head, .hero-amount { grid-column: 1; }
  .hero-metrics { grid-column: 2; grid-row: 1 / span 2; border-top: 0; border-left: 1px solid #ECEEF1; }
  .hero-metrics > view { display: flex; flex-direction: column; justify-content: center; }
  .content-grid { grid-template-columns: minmax(240px,.38fr) minmax(0,1fr); gap: 16px; }
  .info-card, .items-card { padding: 20px; }
}

/* 金额按实际可用宽度缩字，父布局允许收缩。 */
.hero-metrics > view, .item-result, .hero-amount { min-width: 0; }
.item-result { justify-content: flex-end; }
</style>
