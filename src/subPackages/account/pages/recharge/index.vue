<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="充值中心" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 30px">
        <view class="recharge-page">
          <view class="page-grid">
            <view class="overview-column">
              <view class="balance-card">
                <view class="balance-head">
                  <view>
                    <text class="eyebrow">当前账户可用余额</text>
                    <text class="balance-value"><text class="currency">¥</text>{{ formatMoney(finance.currentAccount?.availableBalance) }}</text>
                  </view>
                  <view class="wallet-mark"><AppIcon name="wallet" :size="24" color="#D7192D" /></view>
                </view>
                <view class="balance-meta">
                  <view>
                    <text class="meta-label">当前账户冻结</text>
                    <text class="meta-value">¥{{ formatMoney(finance.currentAccount?.frozenBalance) }}</text>
                  </view>
                  <view>
                    <text class="meta-label">经销商主体可用</text>
                    <text class="meta-value">¥{{ formatMoney(finance.subjectAvailableBalance) }}</text>
                  </view>
                </view>
                <view class="card-entry" hover-class="card-entry--pressed" @tap="goToFundFlow">
                  <view class="card-entry-copy">
                    <text class="card-entry-title">资金流水</text>
                    <text class="card-entry-desc">查看充值、支付和退款明细</text>
                  </view>
                  <AppIcon name="chevron-right" :size="16" color="#8A9098" />
                </view>
              </view>

              <view class="credit-card">
                <view class="section-head">
                  <view>
                    <text class="section-title">主体授信</text>
                    <text class="section-desc">授信属于经销商主体，不等同于账户余额</text>
                  </view>
                  <text class="credit-status" :class="{ frozen: finance.credit.isFrozen }">
                    {{ finance.credit.isFrozen ? '授信冻结' : '状态正常' }}
                  </text>
                </view>
                <view class="credit-main">
                  <view>
                    <text class="metric-label">剩余可用授信</text>
                    <text class="credit-value">¥{{ formatMoney(finance.credit.availableAmount) }}</text>
                  </view>
                  <text class="credit-total">总额 ¥{{ formatMoney(finance.credit.totalAmount) }}</text>
                </view>
                <view class="progress-track">
                  <view class="progress-value" :style="{ width: `${creditUsage}%` }" />
                </view>
                <view class="credit-foot">
                  <text>已用 ¥{{ formatMoney(finance.credit.usedAmount) }}</text>
                  <text>冻结 ¥{{ formatMoney(finance.credit.frozenAmount) }}</text>
                </view>
                <view class="card-entry" hover-class="card-entry--pressed" @tap="goToCreditFlow">
                  <view class="card-entry-copy">
                    <text class="card-entry-title">授信流水</text>
                    <text class="card-entry-desc">查看额度占用、释放和还款明细</text>
                  </view>
                  <AppIcon name="chevron-right" :size="16" color="#8A9098" />
                </view>
              </view>
            </view>

            <view class="service-column">
              <view class="service-card">
                <view class="section-head">
                  <view>
                    <text class="section-title">充值服务</text>
                    <text class="section-desc">当前支持对公充值，由财务审核后入账</text>
                  </view>
                </view>

                <view class="channel-card is-available">
                  <view class="channel-icon"><AppIcon name="bank" :size="22" color="#40566B" /></view>
                  <view class="channel-copy">
                    <view class="channel-title-row">
                      <text class="channel-title">对公充值</text>
                      <text class="channel-tag">可办理</text>
                    </view>
                    <text class="channel-desc">联系财务获取账户信息，到账审核通过后计入当前账户余额</text>
                  </view>
                </view>
                <view class="coming-row">
                  <view class="coming-item"><AppIcon name="credit-card" :size="18" /><text>微信/支付宝</text><text>筹备中</text></view>
                  <view class="coming-item"><AppIcon name="refresh" :size="18" /><text>自动到账</text><text>筹备中</text></view>
                </view>

                <button class="finance-btn" @tap="contactFinance">
                  <AppIcon name="service" :size="18" color="#FFFFFF" />
                  <text>联系财务办理充值</text>
                </button>
                <text class="service-note">平台不会在充值完成前提前增加账户余额，请以充值记录状态为准。</text>
                <view class="card-entry service-entry" hover-class="card-entry--pressed" @tap="goToRecords">
                  <view class="card-entry-copy">
                    <text class="card-entry-title">充值记录</text>
                    <text class="card-entry-desc">查看充值审核、到账和失败状态</text>
                  </view>
                  <AppIcon name="chevron-right" :size="16" color="#8A9098" />
                </view>
              </view>
            </view>
          </view>

        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const userStore = useUserStore()
const finance = ref(userStore.financeContext)

const creditUsage = computed(() => {
  const total = Number(finance.value.credit?.totalAmount || 0)
  const used = Number(finance.value.credit?.usedAmount || 0) + Number(finance.value.credit?.frozenAmount || 0)
  return total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0
})

onShow(() => {
  loadFinance()
})

async function loadFinance() {
  try {
    const context = await getDealerFinanceContext()
    finance.value = context
    userStore.updateFinanceContext(context)
  } catch (error) {
    console.error('[Recharge] 加载财务上下文失败:', error)
  }
}

function formatMoney(value) {
  const number = Number(value)
  return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function contactFinance() {
  navigator.navigateTo(routes.content.help())
}

function goToRecords() { navigator.navigateTo(routes.account.rechargeRecords()) }
function goToFundFlow() { navigator.navigateTo(routes.account.fundFlow()) }
function goToCreditFlow() { navigator.navigateTo(routes.account.creditFlow()) }
</script>

<style lang="scss" scoped>
.recharge-page { width: 100%; max-width: 1120px; margin: 0 auto; padding-bottom: env(safe-area-inset-bottom); }
.page-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
.overview-column { display: grid; gap: 14px; }
.balance-card { overflow: hidden; padding: 21px 19px 18px; border-top: 3px solid #D7192D; border-radius: 20px; color: #20242A; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.balance-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.eyebrow { display: block; color: #747B84; font-size: 12px; }
.balance-value { display: block; margin-top: 8px; font-size: 31px; font-weight: 750; font-variant-numeric: tabular-nums; line-height: 38px; }
.currency { margin-right: 3px; font-size: 17px; font-weight: 600; }
.wallet-mark { display: grid; width: 46px; height: 46px; place-items: center; border: 1px solid #ECEEF1; border-radius: 15px; background: #FFF; }
.balance-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; margin-top: 22px; padding-top: 15px; border-top: 1px solid #ECEEF1; }
.balance-meta > view + view { padding-left: 16px; border-left: 1px solid #ECEEF1; }
.meta-label, .meta-value { display: block; }
.meta-label { color: #8A9098; font-size: 10px; }
.meta-value { margin-top: 4px; color: #262B32; font-size: 14px; font-weight: 650; }
.credit-card, .service-card { padding: 18px; border-radius: 19px; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.section-title, .section-desc { display: block; }
.section-title { color: #17191D; font-size: 16px; font-weight: 720; }
.section-desc { margin-top: 4px; color: #8B9098; font-size: 11px; line-height: 17px; }
.credit-status { flex: none; padding: 5px 9px; border-radius: 999px; color: #24724D; background: #EEF7F2; font-size: 10px; font-weight: 650; }
.credit-status.frozen { color: #9B2C25; background: #FFF3F2; }
.credit-main { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-top: 20px; }
.metric-label { display: block; color: #717680; font-size: 11px; }
.credit-value { display: block; margin-top: 5px; color: #20242B; font-size: 24px; font-weight: 750; font-variant-numeric: tabular-nums; }
.credit-total { color: #8C919A; font-size: 11px; }
.progress-track { height: 6px; margin-top: 16px; overflow: hidden; border-radius: 999px; background: #EEF0F2; }
.progress-value { height: 100%; border-radius: inherit; background: #D7192D; transition: width .25s ease; }
.credit-foot { display: flex; justify-content: space-between; margin-top: 9px; color: #7F848D; font-size: 10px; }
.card-entry { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 15px; padding-top: 12px; border-top: 1px solid #ECEEF1; }
.card-entry-copy { min-width: 0; }
.card-entry-title, .card-entry-desc { display: block; }
.card-entry-title { color: #30343A; font-size: 12px; font-weight: 680; }
.card-entry-desc { margin-top: 3px; overflow: hidden; color: #969AA3; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.card-entry--pressed { opacity: .68; }
.service-card { height: 100%; box-sizing: border-box; }
.channel-card { display: flex; gap: 13px; margin-top: 18px; padding: 14px; border-radius: 15px; background: rgba(255,255,255,.48); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.channel-icon { display: grid; width: 42px; height: 42px; flex: 0 0 42px; place-items: center; border-radius: 13px; background: #FFFFFF; box-shadow: 0 4px 12px rgba(31, 41, 55, .05); }
.channel-copy { min-width: 0; flex: 1; }
.channel-title-row { display: flex; align-items: center; gap: 8px; }
.channel-title { color: #22262D; font-size: 14px; font-weight: 700; }
.channel-tag { padding: 2px 7px; border-radius: 999px; color: #24724D; background: #E9F5EF; font-size: 9px; }
.channel-desc { display: block; margin-top: 5px; color: #777D86; font-size: 11px; line-height: 17px; }
.coming-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; margin-top: 10px; }
.coming-item { display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 6px; min-height: 42px; padding: 0 10px; border-radius: 12px; color: #737982; background: rgba(255,255,255,.42); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); font-size: 10px; }
.coming-item > text:last-child { color: #A2A6AD; font-size: 9px; }
.finance-btn { display: flex; width: 100%; height: 48px; align-items: center; justify-content: center; gap: 8px; margin: 15px 0 0; border: 0; border-radius: 13px; color: #FFFFFF; background: #D7192D; font-size: 14px; font-weight: 700; box-shadow: 0 8px 18px rgba(215, 25, 45, .17); }
.finance-btn::after { border: 0; }
.service-note { display: block; margin-top: 10px; color: #9499A2; font-size: 10px; line-height: 16px; text-align: center; }
.service-entry { margin-top: 13px; }
@media screen and (min-width: 760px) {
  .page-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; }
  .overview-column { grid-template-columns: minmax(0, 1.08fr) minmax(0, .92fr); grid-column: 1 / -1; gap: 18px; }
  .service-column { grid-column: 1 / -1; }
  .service-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, .7fr); column-gap: 22px; }
  .service-card > .section-head, .service-card > .channel-card { grid-column: 1; }
  .coming-row, .finance-btn, .service-note { grid-column: 2; }
  .coming-row { grid-row: 1 / span 2; align-content: start; margin-top: 0; }
  .finance-btn { align-self: end; }
}
@media screen and (min-width: 1020px) {
  .page-grid { grid-template-columns: minmax(0, 1.05fr) minmax(360px, .95fr); }
  .overview-column { grid-template-columns: 1fr; grid-column: auto; }
  .service-column { grid-column: auto; }
  .service-card { display: block; }
  .coming-row, .finance-btn, .service-note { grid-column: auto; }
  .coming-row { margin-top: 10px; }
}
</style>
