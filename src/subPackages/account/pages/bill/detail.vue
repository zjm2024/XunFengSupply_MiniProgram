<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="账单详情" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 30px">
        <view class="detail-page">
          <AppPageState
            :state="pageState"
            title="账单暂不可用"
            :description="loadError || '请返回账单列表后重试'"
            action-text="重新加载"
            icon-type="order"
            @retry="loadDetail"
            @action="loadDetail"
          >
            <template #default>
              <view class="bill-hero">
                <view class="hero-head">
                  <view>
                    <text class="hero-label">{{ formatPeriod(bill.billPeriod) }}对账单</text>
                    <text class="hero-no">{{ bill.billNo || `账单 ${bill.billId}` }}</text>
                  </view>
                  <StatusTag :type="statusType(bill.status)" :text="statusText(bill.status)" />
                </view>
                <view class="hero-amount">
                  <text class="amount-caption">账单总额</text>
                  <text class="amount-value"><text>¥</text>{{ formatMoney(bill.totalAmount) }}</text>
                </view>
                <view class="hero-metrics">
                  <view><text>已结金额</text><text>¥{{ formatMoney(bill.paidAmount) }}</text></view>
                  <view><text>未结金额</text><text :class="{ warn: bill.outstandingAmount > 0 }">¥{{ formatMoney(bill.outstandingAmount) }}</text></view>
                </view>
              </view>

              <view v-if="bill.outstandingAmount > 0 && bill.status === 0" class="settlement-notice">
                <AppIcon name="info" :size="18" color="#735D35" />
                <view>
                  <text class="notice-title">该账单尚未结清</text>
                  <text class="notice-desc">可选择主体下正常的余额账户还款，还款后将实时恢复可用授信。</text>
                </view>
              </view>

              <view class="content-grid">
                <view class="info-card">
                  <text class="card-title">账单信息</text>
                  <view class="info-row"><text>账单周期</text><text>{{ formatPeriod(bill.billPeriod) }}</text></view>
                  <view class="info-row"><text>生成时间</text><text>{{ formatDateTime(bill.generatedAt) }}</text></view>
                  <view v-if="bill.settledAt" class="info-row"><text>结清时间</text><text>{{ formatDateTime(bill.settledAt) }}</text></view>
                  <view v-if="bill.closedAt" class="info-row"><text>关闭时间</text><text>{{ formatDateTime(bill.closedAt) }}</text></view>
                  <view class="info-row"><text>明细数量</text><text>{{ bill.items.length }} 条</text></view>
                </view>

                <view class="items-card">
                  <view class="items-head">
                    <view>
                      <text class="card-title">账单明细</text>
                      <text class="card-desc">金额单位：元</text>
                    </view>
                    <text class="items-count">{{ bill.items.length }} 条</text>
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
                        <text class="item-no">{{ item.businessNo || `明细 ${item.billItemId}` }} · {{ formatDate(item.createdAt) }}</text>
                      </view>
                      <view class="item-result">
                        <text class="item-amount">¥{{ formatMoney(item.amount) }}</text>
                        <AppIcon v-if="item.orderId > 0" name="chevron-right" :size="15" color="#A2A6AD" />
                      </view>
                    </view>
                  </view>
                  <view v-else class="items-empty">
                    <AppSvgIllustration class="items-empty-illustration" name="no-revenue" size="sm" />
                    <text>暂无账单明细</text>
                  </view>
                </view>
              </view>
            </template>
          </AppPageState>
        </view>
      </AppContent>
    </template>

    <template #footer>
      <FixedActionBar v-if="pageState === PageStatus.CONTENT">
        <button class="flow-btn flow-btn--secondary" @tap="goToFundFlow">
          <AppIcon name="history" :size="18" color="#FFFFFF" />
          <text>查看资金流水</text>
        </button>
        <button v-if="bill.outstandingAmount > 0 && bill.status === 0" class="flow-btn" :disabled="repaying" @tap="startRepayment">
          <AppIcon name="credit-card" :size="18" color="#FFFFFF" />
          <text>{{ repaying ? '还款中…' : '余额还款' }}</text>
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getBillDetail, payBill } from '../../api/settlement.js'
import { getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const billId = ref(0)
const pageState = ref(PageStatus.LOADING)
const loadError = ref('')
const repaying = ref(false)
const finance = ref({ accounts: [] })
const bill = reactive({ billId: 0, billNo: '', billPeriod: '', totalAmount: 0, paidAmount: 0, outstandingAmount: 0, status: 0, generatedAt: null, settledAt: null, closedAt: null, items: [] })

onLoad((options = {}) => {
  billId.value = Number(options.billId) || 0
  loadDetail()
})

async function loadDetail() {
  if (!billId.value) {
    loadError.value = '缺少有效账单编号'
    pageState.value = PageStatus.ERROR
    return
  }
  pageState.value = PageStatus.LOADING
  loadError.value = ''
  try {
    const [detail, financeContext] = await Promise.all([
      getBillDetail(billId.value),
      getDealerFinanceContext(),
    ])
    Object.assign(bill, detail)
    finance.value = financeContext
    pageState.value = PageStatus.CONTENT
  } catch (error) {
    loadError.value = error?.message || '账单详情读取失败，请稍后重试'
    pageState.value = PageStatus.ERROR
  }
}

function formatMoney(value) { const number = Number(value); return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function formatPeriod(value) { const [year, month] = String(value || '').slice(0, 7).split('-'); return year && month ? `${year}年${month}月` : '-' }
function formatDate(value) { if (!value) return '-'; const date = new Date(value); if (Number.isNaN(date.getTime())) return String(value); const pad = number => String(number).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
function formatDateTime(value) { if (!value) return '-'; const date = new Date(value); if (Number.isNaN(date.getTime())) return String(value); const pad = number => String(number).padStart(2, '0'); return `${formatDate(value)} ${pad(date.getHours())}:${pad(date.getMinutes())}` }
function statusText(status) { return ({ 0: '未结清', 1: '已结清', 2: '已关闭' })[status] || '未知状态' }
function statusType(status) { return ({ 0: 'warning', 1: 'success', 2: 'info' })[status] || 'default' }
function businessTypeText(type) { return ({ order: '订单入账', order_charge: '授信订单入账', payment: '支付记录', repayment: '授信还款', refund: '退款记录', adjustment: '财务调整' })[String(type || '').toLowerCase()] || '财务明细' }
function businessIcon(type) { return ['order', 'order_charge'].includes(String(type || '').toLowerCase()) ? 'order' : 'receipt' }
function openBusiness(item) { if (item.orderId > 0) navigator.navigateTo(routes.order.detail(item.orderId)) }
function goToFundFlow() { navigator.navigateTo(routes.account.fundFlow()) }

function startRepayment() {
  const accounts = (finance.value.accounts || []).filter(item =>
    item.accountStatus === 1
    && item.financeStatus === 1
    && item.canParticipateCombinationPay
    && Number(item.availableBalance) > 0,
  )
  if (!accounts.length) {
    uni.showToast({ title: '暂无可用于还款的余额账户', icon: 'none' })
    return
  }
  uni.showActionSheet({
    itemList: accounts.map(item => `${item.isMaster ? '主账户' : (item.realName || item.username)}  可用 ¥${formatMoney(item.availableBalance)}`),
    success: ({ tapIndex }) => confirmRepayment(accounts[tapIndex]),
  })
}

function confirmRepayment(account) {
  const amount = Math.min(Number(bill.outstandingAmount), Number(account.availableBalance))
  uni.showModal({
    title: '确认授信还款',
    content: `将从${account.isMaster ? '主账户' : (account.realName || account.username)}余额扣除 ¥${formatMoney(amount)}，并恢复同额授信。`,
    confirmText: '确认还款',
    confirmColor: '#D7192D',
    success: result => { if (result.confirm) submitRepayment(account, amount) },
  })
}

async function submitRepayment(account, amount) {
  if (repaying.value) return
  repaying.value = true
  try {
    await payBill(bill.billId, {
      accountCustomerId: account.accountCustomerId,
      amount,
      clientRequestId: `bill-repay-${bill.billId}-${Date.now()}`,
    })
    uni.showToast({ title: '还款成功', icon: 'success' })
    await loadDetail()
  } catch (error) {
    uni.showToast({ title: error?.message || '还款失败', icon: 'none' })
  } finally {
    repaying.value = false
  }
}
</script>

<style lang="scss" scoped>
.detail-page { width: 100%; max-width: 1080px; margin: 0 auto; }
.bill-hero { overflow: hidden; border: 1px solid #E5E7EA; border-top: 3px solid #D7192D; border-radius: 20px; color: #20242A; background: #FFFFFF; box-shadow: 0 10px 28px rgba(24,29,37,.05); }
.hero-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 19px 19px 0; }
.hero-label, .hero-no { display: block; }
.hero-label { color: #252A31; font-size: 15px; font-weight: 680; }
.hero-no { margin-top: 4px; color: #969BA3; font-size: 10px; }
.hero-amount { padding: 24px 19px 19px; }
.amount-caption, .amount-value { display: block; }
.amount-caption { color: #858B94; font-size: 10px; }
.amount-value { margin-top: 6px; font-size: 32px; font-weight: 760; font-variant-numeric: tabular-nums; }
.amount-value > text { margin-right: 3px; font-size: 17px; }
.hero-metrics { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); border-top: 1px solid #ECEEF1; background: #FAFAFB; }
.hero-metrics > view { padding: 13px 19px; }
.hero-metrics > view + view { border-left: 1px solid #ECEEF1; }
.hero-metrics text { display: block; color: #858B94; font-size: 10px; }
.hero-metrics text + text { margin-top: 4px; color: #282D34; font-size: 14px; font-weight: 650; }
.hero-metrics .warn { color: #D7192D; }
.settlement-notice { display: flex; align-items: flex-start; gap: 10px; margin-top: 14px; padding: 13px 14px; border: 1px solid #E9E0CB; border-radius: 14px; color: #735D35; background: #FAF8F2; }
.notice-title, .notice-desc { display: block; }
.notice-title { font-size: 12px; font-weight: 680; }
.notice-desc { margin-top: 4px; color: #8A7A5C; font-size: 10px; line-height: 16px; }
.content-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 14px; margin-top: 14px; }
.info-card, .items-card { padding: 17px; border: 1px solid #E7E8EB; border-radius: 18px; background: #FFFFFF; box-shadow: 0 7px 24px rgba(24,29,37,.04); }
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
.bill-item { display: grid; grid-template-columns: 38px minmax(0,1fr) auto; align-items: center; gap: 10px; min-height: 68px; border-top: 1px solid #F0F1F3; }
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
</style>
