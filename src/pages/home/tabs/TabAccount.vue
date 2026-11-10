<template>
  <view class="account-tab tab-page">
    <AppInitializing
      v-if="showInitialLoading"
      class="account-initializing"
      :title="accountCopy.loading.title"
      :description="accountCopy.loading.description"
      :fill="true"
      :compact="true"
    />

    <template v-else>
    <view class="profile-hero">

      <view class="profile-main" hover-class="item--pressed" @tap="openProfile">
        <view class="avatar-wrap">
          <AppImage class="avatar-image" width="100%" height="100%" :src="userStore.avatarUrl || '/static/images/logo.png'" mode="aspectFill" />
        </view>
        <view class="profile-copy">
          <view class="name-row">
            <text class="profile-name">{{ displayName }}</text>
            <AppIcon name="chevron-right" :size="18" color="#59697A" />
          </view>
          <view class="identity-row">
            <text class="level-tag">{{ dealerLevel }}</text>
            <text class="account-role">{{ userStore.isMainAccount ? accountCopy.roles.main : accountCopy.roles.sub }}</text>
          </view>
        </view>
      </view>

      <view v-if="!userStore.isAccountNormal || finance.credit?.isFrozen" class="account-notice">
        <AppIcon name="alert-circle" :size="16" color="#9A3B35" />
        <text>{{ accountNoticeText }}</text>
      </view>

      <view class="profile-metrics">
        <view v-for="item in metricEntries" :key="item.key" class="profile-metric" @tap="item.action && item.action()">
          <AmountText v-if="item.key === 'credit' || item.key === 'balance'" class="metric-value" :text="item.value" /><text v-else class="metric-value">{{ item.value }}<text v-if="item.unit" class="metric-unit">{{ item.unit }}</text></text>
          <text class="metric-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <view class="core-grid">
      <view v-if="userStore.hasPermission('ORDER_VIEW')" class="order-card">
        <view class="card-heading" hover-class="item--pressed" @tap="goToOrders()">
          <view>
            <text class="card-title">{{ accountCopy.sections.orders }}</text>
          </view>
          <view class="heading-link"><text>{{ accountCopy.actions.allOrders }}</text><AppIcon name="chevron-right" :size="16" /></view>
        </view>
        <view class="order-status-grid">
          <view
            v-for="item in orderShortcuts"
            :key="item.key"
            class="order-status"
            :class="{ 'has-count': item.count > 0 }"
            hover-class="item--pressed"
            @tap="item.action"
          >
            <view class="status-icon-wrap">
              <AppIcon :name="item.icon" :size="24" />
              <!-- <text v-if="item.count > 0" class="status-badge">{{ formatCount(item.count) }}</text> -->
            </view>
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="function-card">
      <view class="card-heading" hover-class="item--pressed" @tap="functionsExpanded = !functionsExpanded">
        <view>
          <text class="card-title">{{ accountCopy.sections.functions }}</text>
        </view>
        <view class="collapse-button">
          <text>{{ functionsExpanded ? accountCopy.actions.collapse : accountCopy.actions.expand }}</text>
          <AppIcon :name="functionsExpanded ? 'chevron-down' : 'chevron-right'" :size="16" />
        </view>
      </view>

      <view v-show="functionsExpanded" class="function-grid" :class="{ 'function-grid--two': functionEntries.length === 4 || functionEntries.length === 2 }">
        <button v-for="item in functionEntries" :key="item.key" class="function-item" hover-class="item--pressed" @tap="item.action">
          <view class="function-icon" :class="item.tone"><AppIcon :name="item.icon" :size="24" /></view>
          <text>{{ item.label }}</text>
        </button>
      </view>
    </view>

      <view class="service-card">
        <view class="card-heading static">
          <view>
            <text class="card-title">{{ accountCopy.sections.service }}</text>
          </view>
        </view>
        <view class="service-links">
          <button v-for="item in serviceEntries" :key="item.key" class="service-link" hover-class="item--pressed" @tap="item.action">
            <view class="service-link-icon"><AppIcon :name="item.icon" :size="24" /></view>
            <view class="service-link-copy"><text>{{ item.label }}</text><text>{{ item.description }}</text></view>
            <AppIcon name="chevron-right" :size="16" color="#727983" />
          </button>
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { computed, reactive, ref, watch } from 'vue'
import { ORDER_STATUS } from '@/app/config/constant.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { getProfile } from '@/shared/api/auth.js'
import { getDealerInventoryOverview } from '@/shared/api/inventory.js'
import { getOrderCounts } from '@/shared/api/order.js'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppInitializing from '@/shared/ui/AppInitializing/AppInitializing.vue'
import AppImage from '@/shared/ui/AppImage/AppImage.vue'

const props = defineProps({ active: { type: Boolean, default: false } })
const userStore = useUserStore()
const finance = ref(userStore.financeContext)
const inventoryOverview = ref(null)
const dealerCode = ref(String(userStore.dealerInfo?.dealerCode || '').trim())
const orderCounts = reactive({ allCount: 0, pendingReviewCount: 0, pendingPaymentCount: 0, processingCount: 0, completedCount: 0 })
const dashboardLoading = ref(false)
const dashboardInitialized = ref(false)
const functionsExpanded = ref(true)

const accountCopy = computed(() => ({
  loading: {
    title: t('main.accountPanel.loadingTitle'),
    description: t('main.accountPanel.loadingDescription'),
  },
  fallback: {
    displayName: t('main.accountPanel.dealer'),
    dealerLevel: t('main.accountPanel.dealerLevel'),
    accountIdentity: t('main.accountPanel.pendingCode'),
  },
  roles: { main: t('main.accountPanel.main'), sub: t('main.accountPanel.sub') },
  notice: {
    abnormal: t('main.accountPanel.abnormal'),
    frozen: t('main.accountPanel.frozen'),
  },
  metrics: {
    credit: t('main.accountPanel.credit'),
    balance: t('main.accountPanel.balance'),
    inventory: t('main.accountPanel.inventory'),
    score: t('main.accountPanel.score'),
    inventoryUnit: t('main.accountPanel.items'),
    scoreUnit: t('main.accountPanel.points'),
  },
  sections: { orders: t('main.accountPanel.orders'), functions: t('main.accountPanel.functions'), service: t('main.accountPanel.service') },
  actions: { allOrders: t('main.accountPanel.allOrders'), expand: t('main.accountPanel.expand'), collapse: t('main.accountPanel.collapse') },
  services: {
    afterSales: t('main.accountPanel.afterSales'),
    afterSalesDescription: t('main.accountPanel.afterSalesDescription'),
    help: t('main.accountPanel.help'),
    helpDescription: t('main.accountPanel.helpDescription'),
    invoice: t('main.accountPanel.invoice'),
    invoiceDescription: t('main.accountPanel.invoiceDescription'),
  },
}))

const displayName = computed(() => userStore.displayName || userStore.realName || userStore.username || accountCopy.value.fallback.displayName)
const dealerLevel = computed(() => userStore.creditLevel || accountCopy.value.fallback.dealerLevel)
const accountNoticeText = computed(() => (
  !userStore.isAccountNormal ? accountCopy.value.notice.abnormal : accountCopy.value.notice.frozen
))
const showInitialLoading = computed(() => props.active && dashboardLoading.value && !dashboardInitialized.value)
const metricEntries = computed(() => [
  { key: 'credit', value: formatCompactMoney(finance.value?.credit?.availableAmount), label: accountCopy.value.metrics.credit, action: goToCreditFlow },
  { key: 'balance', value: formatCompactMoney(finance.value?.subjectAvailableBalance), label: accountCopy.value.metrics.balance, action: goToFundCenter },
  { key: 'inventory', value: formatQuantity(inventoryOverview.value?.availableQuantity), unit: accountCopy.value.metrics.inventoryUnit, label: accountCopy.value.metrics.inventory, action: goToInventory },
  { key: 'score', value: String(userStore.creditScore || 0), unit: accountCopy.value.metrics.scoreUnit, label: accountCopy.value.metrics.score },
])
const serviceEntries = computed(() => [
  {
    key: 'after-sales',
    label: accountCopy.value.services.afterSales,
    description: accountCopy.value.services.afterSalesDescription,
    icon: 'profile-after-sales',
    action: goToAfterSales,
  },
  ...(['PUBLIC_STOCK_SHARE', 'RETAIL_SHARE_CREATE', 'RETAIL_SHARE_VIEW', 'RETAIL_SHARE_REVOKE'].some(code => userStore.hasPermission(code)) ? [{ key: 'share', label: t('main.accountPanel.share'), description: t('main.accountPanel.shareDescription'), icon: 'globe', action: goToShare }] : []),
  { key: 'help', label: accountCopy.value.services.help, description: accountCopy.value.services.helpDescription, icon: 'profile-help', action: goToHelp },
])

watch(() => props.active, active => {
  if (active) loadDashboard()
}, { immediate: true })

async function loadDashboard() {
  if (dashboardLoading.value) return
  dashboardLoading.value = true
  try {
    const tasks = [
      { key: 'profile', request: getProfile() },
      { key: 'finance', request: getDealerFinanceContext() },
      ...(userStore.hasPermission('INVENTORY_VIEW') ? [{ key: 'inventory', request: getDealerInventoryOverview() }] : []),
      ...(userStore.hasPermission('ORDER_VIEW') ? [{ key: 'orders', request: getOrderCounts() }] : []),
    ]
    const results = await Promise.allSettled(tasks.map(item => item.request))
    results.forEach((result, index) => {
      if (result.status !== 'fulfilled') return
      const key = tasks[index].key
      if (key === 'profile') {
        dealerCode.value = String(result.value?.dealerCode || '').trim()
        userStore.setDealerInfo({
          dealerCode: dealerCode.value,
          storeName: result.value?.companyName || userStore.dealerInfo?.storeName,
          contactName: result.value?.contactName || result.value?.realName || userStore.dealerInfo?.contactName,
        })
      } else if (key === 'finance') {
        finance.value = result.value
        userStore.updateFinanceContext(result.value)
      } else if (key === 'inventory') inventoryOverview.value = result.value
      else if (key === 'orders') Object.assign(orderCounts, result.value)
    })
  } finally {
    dashboardInitialized.value = true
    dashboardLoading.value = false
  }
}

function formatCompactMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '¥0'
  if (Math.abs(number) >= 10000) return `¥${(number / 10000).toFixed(number >= 100000 ? 0 : 1)}万`
  return `¥${number.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`
}
function formatQuantity(value) {
  const number = Number(value)
  return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN')
}
function formatCount(value) { return Number(value) > 99 ? '99+' : String(value) }

function openProfile() { return navigator.navigateTo(routes.account.profile()) }
function goToOrders(status) { return navigator.navigateTo(routes.order.list(typeof status === 'number' ? { status } : {})) }
/** 打开经销商分享中心，页面与服务端会再次校验权限。 */
function goToShare() { return navigator.navigateTo(routes.share.home()) }
function goToInventory() { return navigator.navigateTo(routes.account.inventoryOverview()) }
function goToAfterSales() { return navigator.navigateTo(routes.order.afterSaleList()) }
function goToInvoice() { return navigator.navigateTo(routes.account.invoice()) }
function goToBill() { return navigator.navigateTo(routes.account.billList()) }
function goToFundCenter() { return navigator.navigateTo(routes.account.fundCenter()) }
function goToCreditFlow() { return navigator.navigateTo(routes.account.creditFlow()) }
function goToAddress() { return navigator.navigateTo(routes.account.address()) }
function goToSubAccount() { return navigator.navigateTo(routes.account.subAccount()) }
function goToMessages() { return navigator.navigateTo(routes.content.messages()) }
function goToHelp() { return navigator.navigateTo(routes.content.help()) }

const orderShortcuts = computed(() => [
  { key: 'all', label: t('main.accountPanel.all'), count: orderCounts.allCount, icon: 'profile-orders', action: () => goToOrders() },
  { key: 'pending-payment', label: t('main.accountPanel.orderFilters.pendingPayment'), count: orderCounts.pendingPaymentCount, icon: 'order-pending-payment', action: () => goToOrders(ORDER_STATUS.PENDING_PAYMENT) },
  { key: 'processing', label: t('main.accountPanel.orderFilters.processing'), count: orderCounts.processingCount, icon: 'order-shipped', action: () => goToOrders(ORDER_STATUS.PROCESSING) },
  { key: 'completed', label: t('main.accountPanel.orderFilters.completed'), count: orderCounts.completedCount, icon: 'order-signed', action: () => goToOrders(ORDER_STATUS.COMPLETED) },
])

const functionEntries = computed(() => [
  ...(userStore.hasPermission('BALANCE_VIEW') ? [{ key: 'fund-center', label: t('main.accountPanel.fundCenter'), icon: 'profile-fund-flow', action: goToFundCenter }] : []),
  ...(userStore.hasPermission('INVENTORY_VIEW') ? [{ key: 'inventory', label: t('main.accountPanel.inventoryManagement'), icon: 'profile-inventory', tone: 'primary', action: goToInventory }] : []),
  ...(userStore.hasPermission('BALANCE_VIEW') ? [
    { key: 'bill', label: t('main.accountPanel.bill'), icon: 'profile-bill', action: goToBill },
  ] : []),
  { key: 'invoice', label: accountCopy.value.services.invoice, icon: 'profile-invoice', action: goToInvoice },
  { key: 'address', label: t('main.accountPanel.address'), icon: 'profile-address', action: goToAddress },
  ...(userStore.isMainAccount ? [{ key: 'sub-account', label: t('main.accountPanel.sub'), icon: 'profile-sub-account', action: goToSubAccount }] : []),
])

</script>

<style lang="scss" scoped>
.tab-page { width: 100%; max-width: 1040px; min-height: 100%; margin: 0 auto; padding: 0 var(--page-padding-x, 16px) var(--spacing-lg, 24px); box-sizing: border-box; background: transparent; }
.account-initializing { min-height: calc(100vh - 138px - env(safe-area-inset-bottom)); }
.profile-hero { position: relative; overflow: hidden; padding: var(--module-padding, 16px); border-radius: var(--radius-card, 16px); background: var(--surface-card, #FFF); box-shadow: var(--shadow-sm); }
.profile-main { position: relative; z-index: 1; display: grid; grid-template-columns: 64px minmax(0,1fr); align-items: center; gap: 13px; min-height: 76px; }
.avatar-wrap { display: grid; width: 64px; height: 64px; place-items: center; overflow: hidden; border: 4px solid rgba(255,255,255,.84); border-radius: 50%; color: #FFF; box-shadow: 0 9px 22px rgba(79,102,128,.14); box-sizing: border-box; }.avatar-image { width: 100%; height: 100%; }.avatar-text { font-size: var(--type-heading-size, 24px); font-weight: var(--font-weight-bold, 700); }
.profile-copy { min-width: 0; }.name-row { display: flex; min-width: 0; align-items: center; gap: 5px; }.profile-name { overflow: hidden; color: #202831; font-size: var(--type-page-title-size, 20px); font-weight: var(--font-weight-bold, 700); text-overflow: ellipsis; white-space: nowrap; }
.identity-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 7px; }.level-tag, .account-role { max-width: 100%; padding: 4px 7px; border-radius: var(--radius-small, 8px); overflow-wrap: anywhere; font-size: var(--type-micro-size, 11px); line-height: var(--type-micro-line-height, 16px); font-weight: var(--font-weight-semibold, 600); }.level-tag { color: #7C5824; background: #F5E2B9; }.account-role { color: #536A81; background: rgba(255,255,255,.62); }
.account-identity { display: block; margin-top: 6px; overflow: hidden; color: var(--type-secondary-color, #62666F); font-size: var(--type-micro-size, 11px); line-height: var(--type-micro-line-height, 16px); text-overflow: ellipsis; white-space: nowrap; }
.account-notice { position: relative; z-index: 1; display: flex; align-items: flex-start; gap: 7px; margin-top: 12px; padding: 9px 10px; border: 1px solid rgba(201,91,82,.16); border-radius: var(--radius-control, 10px); color: #873B35; background: rgba(255,255,255,.62); font-size: var(--type-caption-size, 12px); line-height: var(--type-caption-line-height, 18px); }
/* 手机端使用两列资产概览，让完整名称及放大后的文字自然换行。 */
.profile-metrics { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); row-gap: 12px; margin-top: 19px; }
.profile-metric { position: relative; min-width: 0; padding: 6px 10px; text-align: center; }.profile-metric:nth-child(odd)::after { content: ''; position: absolute; top: 9px; bottom: 9px; right: 0; width: 1px; background: rgba(87,108,130,.13); }
.metric-value, .metric-label { display: block; min-width: 0; white-space: normal; overflow-wrap: anywhere; }.metric-value { color: var(--type-title-color, #1B1C20); font-size: var(--type-label-size, 15px); font-weight: var(--font-weight-bold, 700); font-variant-numeric: tabular-nums; }.metric-unit { display: inline-block; margin-left: 4px; font-size: var(--type-micro-size, 11px); font-weight: var(--font-weight-semibold, 600); }.metric-label { margin-top: 5px; color: var(--type-secondary-color, #62666F); font-size: var(--type-caption-size, 12px); line-height: var(--type-caption-line-height, 18px); }
.core-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 14px; }.order-card, .service-card, .function-card, .account-service-card { border-radius: var(--radius-feature, 18px); background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.order-card, .service-card { padding: var(--module-padding, 16px); }.card-heading { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 8px 12px; }.card-heading.static { pointer-events: none; }.card-title, .card-subtitle { display: block; }.card-title { color: var(--type-title-color, #1B1C20); font-size: var(--type-card-title-size, 16px); line-height: var(--type-card-title-line-height, 24px); font-weight: var(--font-weight-bold, 700); }.card-subtitle { margin-top: 4px; color: var(--type-muted-color, #969AA3); font-size: var(--type-micro-size, 11px); }.heading-link, .collapse-button { display: flex; align-items: center; gap: 2px; color: var(--type-secondary-color, #62666F); font-size: var(--type-caption-size, 12px); line-height: var(--type-caption-line-height, 18px); }
.order-card .card-title, .function-card .card-title, .order-card .heading-link, .function-card .collapse-button { color: #111216; }
.card-title { position: relative; padding-left: 10px; }.card-title::before { content: ''; position: absolute; top: 3px; bottom: 3px; left: 0; width: 3px; border-radius: 2px; background: #D7192D; }
.heading-link, .collapse-button { min-height: 30px; padding: 0 2px 0 8px; }
.order-status-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); margin-top: 17px; padding: 15px 0 3px; border-top: 1px solid #EFF1F3; }.order-status { position: relative; display: flex; min-width: 0; min-height: 62px; align-items: center; justify-content: center; flex-direction: column; gap: 8px; color: #111216; font-size: var(--type-caption-size, 12px); line-height: var(--type-caption-line-height, 18px); }.order-status:not(:last-child)::after { content: ''; position: absolute; top: 10px; right: 0; width: 1px; height: 34px; background: #F0F1F3; }.status-icon-wrap { position: relative; display: grid; width: var(--module-icon-box, 36px); height: var(--module-icon-box, 36px); place-items: center; color: #111216; }.order-card .order-status.has-count .status-icon-wrap { color: #111216; }.status-badge { position: absolute; top: -3px; right: -4px; display: inline-flex; min-width: 18px; height: 18px; align-items: center; justify-content: center; padding: 0 4px; border: 2px solid #FFF; border-radius: var(--radius-control, 10px); color: #FFF; background: #D7192D; box-sizing: border-box; font-size: var(--type-caption-size, 12px); font-weight: var(--font-weight-bold, 700); line-height: 1; font-variant-numeric: tabular-nums; }
.service-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.service-link { display: grid; grid-template-columns: 32px minmax(0,1fr) 16px; flex: 1 1 100%; min-width: 0; box-sizing: border-box; align-items: center; gap: 9px; margin: 0; padding: 12px; border: 0; border-radius: var(--radius-control, 10px); background: var(--surface-page, #F4F5F8); text-align: left; line-height: 1.45; }
.service-link-icon { display: grid; width: 32px; height: 36px; place-items: center; color: var(--icon-primary, #303238); }
.service-link-copy { display: grid; min-width: 0; gap: 3px; }
.service-link-copy text { display: block; min-width: 0; white-space: normal; overflow-wrap: anywhere; }
.service-link-copy text:first-child { color: var(--type-title-color, #1B1C20); font-size: var(--type-body-size, 14px); font-weight: 650; }
.service-link-copy text:last-child { color: var(--type-secondary-color, #62666F); font-size: var(--type-body-small-size, 13px); }
.function-card, .account-service-card { padding: var(--module-padding, 16px); }.function-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); row-gap: var(--module-gap, 12px); margin-top: 17px; padding-top: 13px; border-top: 1px solid #EFF1F3; }.function-item { position: relative; display: flex; min-width: 0; min-height: 68px; align-items: center; justify-content: center; flex-direction: column; gap: 8px; color: #111216; font-size: var(--type-caption-size, 12px); line-height: var(--type-caption-line-height, 18px); text-align: center; }.function-icon, .function-icon.primary { display: grid; width: var(--module-icon-box, 36px); height: var(--module-icon-box, 36px); place-items: center; color: #111216; }
/* 入口文字保留完整内容，行高随内容增长，图标在同一行顶部对齐。 */
.function-grid, .order-status-grid { font-size: var(--type-caption-size, 12px); }
.function-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.function-item { flex: 1 1 calc(33.333% - 8px); }
.order-status-grid { grid-template-columns: repeat(auto-fit,minmax(min(100%,5.5em),1fr)); }
.function-item, .order-status { justify-content: flex-start; padding: 0 2px; }
.function-item > text, .order-status > text { display: block; width: 100%; min-width: 0; white-space: normal; overflow-wrap: anywhere; text-align: center; }
.function-icon, .status-icon-wrap { flex-shrink: 0; }
.account-service-card { margin-bottom: 4px; }.updating-text { color: var(--type-muted-color, #969AA3); font-size: var(--type-micro-size, 11px); }.account-service-grid { display: grid; grid-template-columns: 1fr; margin-top: 11px; }.account-service-item { display: grid; grid-template-columns: 30px minmax(0,1fr) 16px; align-items: center; gap: 10px; min-height: 62px; border-top: 1px solid #EFF0F2; }.account-service-icon { display: grid; width: 30px; height: 30px; place-items: center; color: var(--icon-primary, #303238); }.account-service-copy { min-width: 0; }.account-service-copy text { display: block; }.account-service-copy text:first-child { color: var(--type-title-color, #1B1C20); font-size: var(--type-body-small-size, 13px); font-weight: var(--font-weight-semibold, 600); }.account-service-copy text:last-child { margin-top: 2px; color: var(--type-muted-color, #969AA3); font-size: var(--type-micro-size, 11px); }
.item--pressed { opacity: .65; }.function-card, .function-grid { transition: opacity .18s ease, transform .18s ease; }
@media screen and (min-width: 600px) {
  .profile-metrics { grid-template-columns: repeat(4,minmax(0,1fr)); }.profile-metric:not(:last-child)::after { content: ''; position: absolute; top: 9px; bottom: 9px; right: 0; width: 1px; background: rgba(87,108,130,.13); }
  .core-grid { gap: 14px; }.function-grid { row-gap: 12px; }.account-service-grid { grid-template-columns: repeat(3,minmax(0,1fr)); gap: 1px; background: #EFF0F2; }.account-service-item { padding: 0 11px; border-top: 0; background: #FFF; }
}
@media screen and (min-width: 820px) {
  .profile-main { grid-template-columns: 72px minmax(0,1fr); }.avatar-wrap { width: 72px; height: 72px; }.profile-metrics { max-width: none; margin-top: 22px; }.core-grid { margin-top: 16px; }.order-card, .service-card, .function-card, .account-service-card { padding: 20px 22px; }.function-item { min-height: 72px; }.order-status { min-height: 68px; }.status-icon-wrap { width: var(--module-icon-box, 36px); height: var(--module-icon-box, 36px); }
}
@media screen and (max-width: 374px) {
  .profile-main { grid-template-columns: 58px minmax(0,1fr); }.avatar-wrap { width: 58px; height: 58px; }.profile-name { font-size: var(--type-section-title-size, 18px); }.order-card, .service-card, .function-card, .account-service-card { padding: var(--module-padding, 16px); }.function-grid { row-gap: 18px; }.function-icon { width: var(--module-icon-box, 36px); height: var(--module-icon-box, 36px); }
}

/* 金额按实际可用宽度缩字，父布局允许收缩。 */
.profile-metric > .amount-text { margin-left: auto; margin-right: auto; }

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.order-card, .function-card, .service-card, .account-service-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
/* 入口随权限数量伸缩，每排等宽，长名称按内容换行。 */
.function-item { box-sizing: border-box; margin: 0; padding: 10px 5px; min-height: 82px; border: 0; border-radius: var(--radius-control, 10px); background: var(--surface-page, #F4F5F8); font-size: var(--type-body-size, 14px); line-height: 1.4; }
.function-grid { font-size: var(--type-body-size, 14px); }
.function-item { min-width: min(100%, 5.5em); }
.function-grid--two .function-item { flex-basis: calc(50% - 8px); }
.function-item::after, .service-link::after { border: 0; }
.function-item:focus-visible, .service-link:focus-visible { outline: 2px solid var(--color-brand, #D7192D); outline-offset: 2px; }
.function-grid { padding-top: 12px; margin-top: 12px; }
.metric-label, .heading-link, .collapse-button, .order-status { font-size: var(--type-body-small-size, 13px); line-height: 1.45; }
.level-tag, .account-role { font-size: var(--type-body-small-size, 13px); line-height: 1.4; }
.order-status-grid { grid-template-columns: repeat(4,minmax(0,1fr)); }
.order-status { min-height: 68px; }
@media screen and (min-width: 600px) {
  .function-item { flex-direction: row; justify-content: flex-start; gap: 10px; padding: 12px; min-height: 62px; }
  .function-item > text { width: auto; text-align: left; }
}
@media screen and (min-width: 700px) {
  .service-link { flex-basis: 190px; align-items: start; min-height: 94px; }
  .service-link > :last-child { align-self: center; }
}
@media (prefers-reduced-motion: reduce) { .function-card, .function-grid { transition: none; } }
</style>
