﻿﻿﻿﻿<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('account.center.title')" :show-back="true" :show-message="true" @message="goToMessages" />
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
                <text class="dealer-meta">{{ dealerLevel }}</text>
              </view>
              <view class="profile-entry" hover-class="pressed" @tap="goToProfile">
                <AppIcon name="chevron-right" :size="18" color="#727983" />
              </view>
            </view>

            <view v-if="!userStore.isAccountNormal || finance.credit.isFrozen" class="risk-notice">
              <AppIcon name="alert-circle" :size="17" color="#9B2C25" />
              <text>{{ !userStore.isAccountNormal ? t('account.center.abnormal') : t('account.center.frozen') }}</text>
            </view>

            <view class="finance-summary">
              <view class="finance-primary">
                <text class="metric-label">{{ t('account.center.availableCredit') }}</text>
                <AmountText class="metric-value" :text="'¥' + (formatMoney(finance.credit.availableAmount))" />
                <view class="credit-line">
                  <view class="progress-track"><view class="progress-value" :style="{ width: `${creditUsage}%` }" /></view>
                  <text>{{ t('account.center.used', { percent: creditUsage.toFixed(0) }) }}</text>
                </view>
              </view>
              <view class="finance-secondary">
                <view>
                  <text>{{ t('account.center.balance') }}</text>
                  <AmountText :text="'¥' + (formatMoney(finance.subjectAvailableBalance))" />
                </view>
                <view>
                  <text>{{ t('account.center.accountBalance') }}</text>
                  <AmountText :text="'¥' + (formatMoney(finance.currentAccount?.availableBalance))" />
                </view>
                <view>
                  <text>{{ t('account.center.accountFrozen') }}</text>
                  <AmountText :text="'¥' + (formatMoney(finance.currentAccount?.frozenBalance))" />
                </view>
              </view>
            </view>
          </view>

          <view class="business-section">
            <view class="section-head">
              <view>
                <text class="section-title">{{ t('account.center.workbench') }}</text>
                <text class="section-desc">{{ t('account.center.workbenchHint') }}</text>
              </view>
              <text class="section-kicker">BUSINESS</text>
            </view>
            <view class="business-grid">
              <view
                v-for="item in businessEntries"
                :key="item.action.name"
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

          <view v-for="group in serviceGroups" :key="group.items[0].action.name" class="service-section">
            <view class="section-head compact">
              <view>
                <text class="section-title">{{ group.title }}</text>
                <text class="section-desc">{{ group.description }}</text>
              </view>
            </view>
            <view class="service-panel">
              <view
                v-for="item in group.items"
                :key="item.action.name"
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
            <text>{{ t('account.center.logout') }}</text>
          </button>
          <text class="footer-note">{{ t('account.center.footer') }}</text>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '../../i18n/register.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
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
import { openAppDialog } from '@/shared/composables/useAppDialog.js'

const userStore = useUserStore()
const finance = ref(userStore.financeContext)
const inventoryOverview = ref(null)
const dealerName = computed(() => userStore.displayName)
const dealerLevel = computed(() => userStore.creditLevel || t('account.center.creditFallback'))
const accountType = computed(() => userStore.isMainAccount ? t('account.center.main') : t('account.center.sub'))
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
function goToCreditFlow() { navigator.navigateTo(routes.account.creditFlow()) }
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
    label: t('account.center.orders'),
    value: t('account.center.purchaseFlow'),
    help: t('account.center.ordersHint'),
    icon: 'order',
    tone: 'orders',
    action: goToOrders,
  }] : []),
  ...(userStore.hasPermission('INVENTORY_VIEW') ? [{
    label: t('account.center.inventory'),
    value: t('account.center.available', { count: formatQuantity(inventoryOverview.value?.availableQuantity) }),
    help: t('account.center.sku', { count: formatQuantity(inventoryOverview.value?.skuCount) }),
    icon: 'inventory',
    tone: 'inventory',
    action: goToInventory,
  }] : []),
  {
    label: t('account.center.afterSales'),
    value: t('account.center.trackable'),
    help: t('account.center.afterSalesHint'),
    icon: 'after-sales',
    tone: 'service',
    action: goToAfterSales,
  },
  {
    label: t('account.center.invoice'),
    value: t('account.center.companyInvoice'),
    help: t('account.center.invoiceHint'),
    icon: 'invoice',
    tone: 'invoice',
    action: goToInvoice,
  },
])

const serviceGroups = computed(() => [
  {
    title: t('account.center.finance'),
    description: t('account.center.financeHint'),
    items: userStore.hasPermission('BALANCE_VIEW') ? [
      { label: t('account.center.recharge'), help: t('account.center.rechargeHint'), icon: 'wallet', action: goToRecharge },
      { label: t('account.center.bill'), help: t('account.center.billHint'), icon: 'receipt', action: goToBill },
      { label: t('account.center.fundFlow'), help: t('account.center.fundFlowHint'), icon: 'history', action: goToFundFlow },
      { label: t('account.center.creditFlow'), help: t('account.center.creditFlowHint'), icon: 'history', action: goToCreditFlow },
    ] : [],
  },
  {
    title: t('account.center.accountServices'),
    description: t('account.center.accountServicesHint'),
    items: [
      { label: t('account.center.address'), help: t('account.center.addressHint'), icon: 'map-pin', action: goToAddress },
      { label: t('account.center.voucher'), help: t('account.center.voucherHint'), icon: 'voucher', action: goToVoucher },
      ...(userStore.isMainAccount ? [{ label: t('account.center.subAccount'), help: t('account.center.subAccountHint'), icon: 'users', action: goToSubAccount }] : []),
      { label: t('account.center.security'), help: t('account.center.securityHint'), icon: 'shield', action: goToSecurity },
      { label: t('account.center.messages'), help: t('account.center.messagesHint'), icon: 'message', action: goToMessages },
      { label: t('account.center.language'), help: t('account.center.languageHint'), icon: 'globe', action: goToLanguage },
      { label: t('account.center.help'), help: t('account.center.helpHint'), icon: 'help', action: goToHelp },
      { label: t('account.center.about'), help: t('account.center.aboutHint'), icon: 'info', action: goToAbout },
    ],
  },
].filter(group => group.items.length))

async function handleLogout() {
  if (!await openAppDialog({
    title: t('account.center.logoutTitle'),
    description: t('account.center.logoutContent'),
    confirmText: t('account.center.logoutConfirm'),
    cancelText: t('common.cancel'),
  })) return
  userStore.logout().then(() => navigator.reLaunch(routes.auth.login()))
}
</script>

<style lang="scss" scoped>
.center-page { width: 100%; max-width: 1160px; margin: 0 auto; padding-bottom: env(safe-area-inset-bottom); }
.account-hero { padding: 18px; border-radius: 22px; background: linear-gradient(145deg, rgba(255,255,255,.82), rgba(247,248,250,.68)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
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
.credit-line { display: flex; align-items: center; gap: 10px; margin-top: 13px; color: #8C9199; font-size: 9px; }
.progress-track { flex: 1; max-width: 180px; height: 5px; overflow: hidden; border-radius: 999px; background: #E5E7EA; }
.progress-value { height: 100%; border-radius: inherit; background: #D7192D; transition: width .25s ease; }
.finance-secondary { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); overflow: hidden; border-radius: 14px; background: rgba(255,255,255,.36); gap: 1px; -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.finance-secondary > view { min-width: 0; padding: 11px 9px; background: rgba(255,255,255,.48); }
.finance-secondary text { display: block; color: #8B9098; font-size: 9px; }
.finance-secondary .amount-text { margin-top: 5px; color: #282D34; font-size: 12px; font-weight: 690; font-variant-numeric: tabular-nums; white-space: nowrap; }
.business-section, .service-section { margin-top: 24px; }
.section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; margin: 0 2px 11px; }
.section-title, .section-desc { display: block; }
.section-title { color: #1E2228; font-size: 17px; font-weight: 740; }
.section-desc { margin-top: 4px; color: #969BA3; font-size: 10px; }
.section-kicker { color: #B1B5BB; font-size: 8px; font-weight: 700; letter-spacing: 1.5px; }
.business-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
.business-card { min-width: 0; padding: 15px; border-radius: 18px; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); transition: transform .16s ease, opacity .16s ease; }
.business-card.inventory { background: linear-gradient(145deg, rgba(251,253,252,.72), rgba(242,247,245,.64)); }
.business-card-head { display: flex; align-items: center; justify-content: space-between; }
.business-icon { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 13px; color: #414B57; background: #EEF1F4; }
.business-card.inventory .business-icon { color: #2F6751; background: #E1EEE8; }
.business-card--pressed { opacity: .68; transform: scale(.985); }
.business-label, .business-value, .business-help { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.business-label { margin-top: 15px; color: #24282F; font-size: 13px; font-weight: 680; }
.business-value { margin-top: 6px; color: #171A1F; font-size: 16px; font-weight: 740; }
.business-help { margin-top: 5px; color: #92979F; font-size: 9px; }
.section-head.compact { margin-bottom: 10px; }
.service-panel { display: grid; grid-template-columns: 1fr; overflow: hidden; border-radius: 18px; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.service-row { display: grid; grid-template-columns: 39px minmax(0,1fr) 18px; align-items: center; gap: 11px; min-height: 67px; padding: 11px 14px; border-bottom: 1px solid #EEF0F2; box-sizing: border-box; }
.service-row:last-child { border-bottom: 0; }
.service-row--pressed { background: #F6F7F8; }
.service-icon { display: grid; width: 39px; height: 39px; place-items: center; border-radius: 12px; color: #53616E; background: #F0F3F5; }
.service-copy { min-width: 0; }
.service-label, .service-help { display: block; }
.service-label { color: #282C32; font-size: 13px; font-weight: 650; }
.service-help { margin-top: 3px; overflow: hidden; color: #9A9EA5; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.logout-btn { display: flex; width: 100%; height: 48px; align-items: center; justify-content: center; gap: 8px; margin: 24px 0 0; border-radius: 14px; color: #636A74; background: rgba(255,255,255,.68); font-size: 13px; box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); }
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

/* 金额按实际可用宽度缩字，父布局允许收缩。 */
.finance-primary, .finance-secondary > view { min-width: 0; }
</style>
