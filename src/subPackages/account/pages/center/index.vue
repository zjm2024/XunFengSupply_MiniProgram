﻿﻿﻿﻿<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="经销商中心" :show-back="true" :show-message="true" @message="goToMessages" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 30px">
        <view class="center-page">
          <view class="account-hero">
            <view class="identity-row">
              <view class="avatar">{{ avatarText }}</view>
              <view class="identity-copy">
                <view class="name-row">
                  <text class="dealer-name">{{ dealerName }}</text>
                  <text class="account-role">{{ accountType }}</text>
                </view>
                <text class="dealer-meta">客户编号 {{ dealerCode }} · {{ dealerLevel }}</text>
              </view>
              <view class="profile-entry" hover-class="pressed" @tap="goToProfile">
                <AppIcon name="chevron-right" :size="18" color="#727983" />
              </view>
            </view>

            <view v-if="!userStore.isAccountNormal || finance.credit.isFrozen" class="risk-notice">
              <AppIcon name="alert-circle" :size="17" color="#9B2C25" />
              <text>{{ !userStore.isAccountNormal ? '当前账号已冻结，仅可查看允许访问的业务数据' : '主体授信已冻结，暂不可提交采购订单' }}</text>
            </view>

            <view class="finance-summary">
              <view class="finance-primary">
                <text class="metric-label">主体可用授信</text>
                <text class="metric-value"><text>¥</text>{{ formatMoney(finance.credit.availableAmount) }}</text>
                <view class="credit-line">
                  <view class="progress-track"><view class="progress-value" :style="{ width: `${creditUsage}%` }" /></view>
                  <text>已占用 {{ creditUsage.toFixed(0) }}%</text>
                </view>
              </view>
              <view class="finance-secondary">
                <view>
                  <text>主体可用余额</text>
                  <text>¥{{ formatMoney(finance.subjectAvailableBalance) }}</text>
                </view>
                <view>
                  <text>当前账户可用</text>
                  <text>¥{{ formatMoney(finance.currentAccount?.availableBalance) }}</text>
                </view>
                <view>
                  <text>当前账户冻结</text>
                  <text>¥{{ formatMoney(finance.currentAccount?.frozenBalance) }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="business-section">
            <view class="section-head">
              <view>
                <text class="section-title">经营工作台</text>
                <text class="section-desc">采购、库存与履约服务</text>
              </view>
              <text class="section-kicker">BUSINESS</text>
            </view>
            <view class="business-grid">
              <view
                v-for="item in businessEntries"
                :key="item.label"
                class="business-card"
                :class="item.tone"
                hover-class="business-card--pressed"
                @tap="item.action"
              >
                <view class="business-card-head">
                  <view class="business-icon"><AppIcon :name="item.icon" :size="22" /></view>
                  <AppIcon name="arrow-right" :size="17" color="#8A9098" />
                </view>
                <text class="business-label">{{ item.label }}</text>
                <text class="business-value">{{ item.value }}</text>
                <text class="business-help">{{ item.help }}</text>
              </view>
            </view>
          </view>

          <view v-for="group in serviceGroups" :key="group.title" class="service-section">
            <view class="section-head compact">
              <view>
                <text class="section-title">{{ group.title }}</text>
                <text class="section-desc">{{ group.description }}</text>
              </view>
            </view>
            <view class="service-panel">
              <view
                v-for="item in group.items"
                :key="item.label"
                class="service-row"
                hover-class="service-row--pressed"
                @tap="item.action"
              >
                <view class="service-icon"><AppIcon :name="item.icon" :size="20" /></view>
                <view class="service-copy">
                  <text class="service-label">{{ item.label }}</text>
                  <text class="service-help">{{ item.help }}</text>
                </view>
                <AppIcon name="chevron-right" :size="16" color="#A7ABB2" />
              </view>
            </view>
          </view>

          <button class="logout-btn" @tap="handleLogout">
            <AppIcon name="logout" :size="18" color="#6C727C" />
            <text>退出当前账号</text>
          </button>
          <text class="footer-note">薰风经销商采购平台 · 账户数据以后端财务系统为准</text>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/shared/session/userStore.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { getDealerInventoryOverview } from '@/subPackages/account/api/inventory.js'

const userStore = useUserStore()
const finance = ref(userStore.financeContext)
const inventoryOverview = ref(null)
const dealerName = computed(() => userStore.displayName)
const dealerCode = computed(() => userStore.dealerId || userStore.userId || '-')
const dealerLevel = computed(() => userStore.creditLevel || '主体授信')
const accountType = computed(() => userStore.isMainAccount ? '主账号' : '子账号')
const avatarText = computed(() => String(dealerName.value || '经').trim().slice(0, 1))
const creditUsage = computed(() => {
  const total = Number(finance.value.credit?.totalAmount || 0)
  const occupied = Number(finance.value.credit?.usedAmount || 0) + Number(finance.value.credit?.frozenAmount || 0)
  return total > 0 ? Math.min(100, Math.max(0, occupied / total * 100)) : 0
})

onShow(loadDashboard)

async function loadDashboard() {
  const tasks = [getDealerFinanceContext()]
  const canViewInventory = userStore.hasPermission('INVENTORY_VIEW')
  if (canViewInventory) tasks.push(getDealerInventoryOverview())
  const [financeResult, inventoryResult] = await Promise.allSettled(tasks)

  if (financeResult.status === 'fulfilled') {
    finance.value = financeResult.value
    userStore.updateFinanceContext(financeResult.value)
  } else {
    console.error('[AccountCenter] 加载财务上下文失败:', financeResult.reason)
  }
  if (canViewInventory && inventoryResult?.status === 'fulfilled') {
    inventoryOverview.value = inventoryResult.value
  }
}

function formatMoney(value) {
  const number = Number(value)
  return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatQuantity(value) {
  const number = Number(value)
  return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN')
}

function goToMessages() { navigator.navigateTo(routes.content.messages()) }
function goToProfile() { navigator.navigateTo(routes.account.profile()) }
function goToOrders() { navigator.navigateTo(routes.order.list()) }
function goToInventory() { navigator.navigateTo(routes.account.inventory()) }
function goToRecharge() { navigator.navigateTo(routes.account.recharge()) }
function goToBill() { navigator.navigateTo(routes.account.billList()) }
function goToFundFlow() { navigator.navigateTo(routes.account.fundFlow()) }
function goToAfterSales() { navigator.navigateTo(routes.order.afterSaleList()) }
function goToInvoice() { navigator.navigateTo(routes.account.invoice()) }
function goToAddress() { navigator.navigateTo(routes.account.address()) }
function goToVoucher() { navigator.navigateTo(routes.account.voucher()) }
function goToSubAccount() { navigator.navigateTo(routes.account.subAccount()) }
function goToSecurity() { navigator.navigateTo(routes.account.security()) }
function goToLanguage() { navigator.navigateTo(routes.account.language()) }
function goToHelp() { navigator.navigateTo(routes.content.help()) }
function goToAbout() { navigator.navigateTo(routes.content.about()) }

const businessEntries = computed(() => [
  ...(userStore.hasPermission('ORDER_VIEW') ? [{
    label: '订单中心',
    value: '采购全流程',
    help: '审核、付款与履约进度',
    icon: 'order',
    tone: 'orders',
    action: goToOrders,
  }] : []),
  ...(userStore.hasPermission('INVENTORY_VIEW') ? [{
    label: '我的库存',
    value: `${formatQuantity(inventoryOverview.value?.availableQuantity)} 件可用`,
    help: `${formatQuantity(inventoryOverview.value?.skuCount)} 个 SKU · 查看库存明细`,
    icon: 'inventory',
    tone: 'inventory',
    action: goToInventory,
  }] : []),
  {
    label: '售后服务',
    value: '进度可追踪',
    help: '退款、退货与处理记录',
    icon: 'after-sales',
    tone: 'service',
    action: goToAfterSales,
  },
  {
    label: '发票中心',
    value: '企业开票',
    help: '抬头、订单与电子归档',
    icon: 'invoice',
    tone: 'invoice',
    action: goToInvoice,
  },
])

const serviceGroups = computed(() => [
  {
    title: '资金与对账',
    description: '账户资金、充值及月度账单',
    items: userStore.hasPermission('BALANCE_VIEW') ? [
      { label: '充值中心', help: '账户充值与历史记录', icon: 'wallet', action: goToRecharge },
      { label: '对账账单', help: '主体月度账单与结算', icon: 'receipt', action: goToBill },
      { label: '资金流水', help: '账户收支变动明细', icon: 'history', action: goToFundFlow },
    ] : [],
  },
  {
    title: '账号与服务',
    description: '配送资料、权限与平台支持',
    items: [
      { label: '收货地址', help: '维护常用配送地址', icon: 'map-pin', action: goToAddress },
      { label: '优惠券', help: '查看可用采购权益', icon: 'voucher', action: goToVoucher },
      ...(userStore.isMainAccount ? [{ label: '子账号管理', help: '权限与账号状态', icon: 'users', action: goToSubAccount }] : []),
      { label: '安全设置', help: '密码与登录安全', icon: 'shield', action: goToSecurity },
      { label: '消息中心', help: '业务通知与提醒', icon: 'message', action: goToMessages },
      { label: '语言设置', help: '切换页面语言', icon: 'globe', action: goToLanguage },
      { label: '帮助中心', help: '采购与售后使用帮助', icon: 'help', action: goToHelp },
      { label: '关于薰风', help: '平台与版本信息', icon: 'info', action: goToAbout },
    ],
  },
].filter(group => group.items.length))

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '退出后需要重新登录，是否继续？',
    confirmText: '退出',
    success: (result) => {
      if (!result.confirm) return
      userStore.logout().then(() => navigator.reLaunch(routes.auth.login()))
    },
  })
}
</script>

<style lang="scss" scoped>
.center-page { width: 100%; max-width: 1160px; margin: 0 auto; padding-bottom: env(safe-area-inset-bottom); }
.account-hero { padding: 18px; border-radius: 22px; background: linear-gradient(145deg, #FFFFFF 0%, #F7F8FA 100%); box-shadow: 0 14px 36px rgba(24, 29, 37, .06); }
.identity-row { display: grid; grid-template-columns: 50px minmax(0, 1fr) 36px; align-items: center; gap: 12px; }
.avatar { display: grid; width: 50px; height: 50px; place-items: center; border-radius: 16px; color: #FFF; background: linear-gradient(145deg, #424A56, #181C22); font-size: 19px; font-weight: 760; box-shadow: inset 0 1px 0 rgba(255,255,255,.2); }
.identity-copy { min-width: 0; }
.name-row { display: flex; min-width: 0; align-items: center; gap: 8px; }
.dealer-name { overflow: hidden; color: #171A1F; font-size: 18px; font-weight: 740; text-overflow: ellipsis; white-space: nowrap; }
.account-role { flex: none; padding: 4px 7px; border-radius: 999px; color: #4F5965; background: #EDEFF2; font-size: 9px; font-weight: 650; }
.dealer-meta { display: block; margin-top: 6px; overflow: hidden; color: #888E97; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.profile-entry { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 12px; background: #F0F3F5; }
.pressed { opacity: .62; }
.risk-notice { display: flex; align-items: flex-start; gap: 8px; margin-top: 14px; padding: 10px 12px; border: 1px solid #F0DAD7; border-radius: 12px; color: #8D3731; background: #FFF8F7; font-size: 11px; line-height: 1.5; }
.finance-summary { display: grid; grid-template-columns: 1fr; gap: 14px; margin-top: 18px; padding-top: 17px; border-top: 1px solid #E7E8EA; }
.metric-label, .metric-value { display: block; }
.metric-label { color: #777E88; font-size: 11px; }
.metric-value { margin-top: 6px; color: #171A20; font-size: 27px; font-weight: 760; font-variant-numeric: tabular-nums; letter-spacing: -.5px; }
.metric-value > text { margin-right: 3px; font-size: 14px; font-weight: 650; }
.credit-line { display: flex; align-items: center; gap: 10px; margin-top: 13px; color: #8C9199; font-size: 9px; }
.progress-track { flex: 1; max-width: 180px; height: 5px; overflow: hidden; border-radius: 999px; background: #E5E7EA; }
.progress-value { height: 100%; border-radius: inherit; background: #D7192D; transition: width .25s ease; }
.finance-secondary { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); overflow: hidden; border: 1px solid #E7E8EA; border-radius: 14px; background: #E7E8EA; gap: 1px; }
.finance-secondary > view { min-width: 0; padding: 11px 9px; background: rgba(255,255,255,.78); }
.finance-secondary text { display: block; color: #8B9098; font-size: 9px; }
.finance-secondary text + text { margin-top: 5px; overflow: hidden; color: #282D34; font-size: 12px; font-weight: 690; font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }
.business-section, .service-section { margin-top: 24px; }
.section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; margin: 0 2px 11px; }
.section-title, .section-desc { display: block; }
.section-title { color: #1E2228; font-size: 17px; font-weight: 740; }
.section-desc { margin-top: 4px; color: #969BA3; font-size: 10px; }
.section-kicker { color: #B1B5BB; font-size: 8px; font-weight: 700; letter-spacing: 1.5px; }
.business-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
.business-card { min-width: 0; padding: 15px; border-radius: 18px; background: #FFF; box-shadow: 0 9px 25px rgba(27,32,39,.04); transition: transform .16s ease, opacity .16s ease; }
.business-card.inventory { background: linear-gradient(145deg, #FBFDFC, #F2F7F5); }
.business-card-head { display: flex; align-items: center; justify-content: space-between; }
.business-icon { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 13px; color: #414B57; background: #EEF1F4; }
.business-card.inventory .business-icon { color: #2F6751; background: #E1EEE8; }
.business-card--pressed { opacity: .68; transform: scale(.985); }
.business-label, .business-value, .business-help { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.business-label { margin-top: 15px; color: #24282F; font-size: 13px; font-weight: 680; }
.business-value { margin-top: 6px; color: #171A1F; font-size: 16px; font-weight: 740; }
.business-help { margin-top: 5px; color: #92979F; font-size: 9px; }
.section-head.compact { margin-bottom: 10px; }
.service-panel { display: grid; grid-template-columns: 1fr; overflow: hidden; border-radius: 18px; background: #FFF; box-shadow: 0 8px 24px rgba(24,29,36,.035); }
.service-row { display: grid; grid-template-columns: 39px minmax(0,1fr) 18px; align-items: center; gap: 11px; min-height: 67px; padding: 11px 14px; border-bottom: 1px solid #EEF0F2; box-sizing: border-box; }
.service-row:last-child { border-bottom: 0; }
.service-row--pressed { background: #F6F7F8; }
.service-icon { display: grid; width: 39px; height: 39px; place-items: center; border-radius: 12px; color: #53616E; background: #F0F3F5; }
.service-copy { min-width: 0; }
.service-label, .service-help { display: block; }
.service-label { color: #282C32; font-size: 13px; font-weight: 650; }
.service-help { margin-top: 3px; overflow: hidden; color: #9A9EA5; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.logout-btn { display: flex; width: 100%; height: 48px; align-items: center; justify-content: center; gap: 8px; margin: 24px 0 0; border-radius: 14px; color: #636A74; background: #FFF; font-size: 13px; box-shadow: 0 4px 12px rgba(24,29,36,.04); }
.logout-btn::after { border: 0; }
.footer-note { display: block; margin: 14px 0 4px; color: #A5A9B0; font-size: 9px; text-align: center; }
@media screen and (min-width: 720px) {
  .account-hero { padding: 22px; }
  .finance-summary { grid-template-columns: minmax(250px,.38fr) minmax(0,.62fr); align-items: end; gap: 24px; }
  .business-grid { grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; }
  .business-card { min-height: 165px; padding: 17px; }
  .service-panel { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .service-row:nth-child(odd) { border-right: 1px solid #EEF0F2; }
  .service-row:nth-last-child(-n+2) { border-bottom: 0; }
}
</style>
