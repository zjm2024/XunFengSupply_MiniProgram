<template>
  <view class="account-tab tab-page">
    <AppInitializing
      v-if="showInitialLoading"
      class="account-initializing"
      title="正在加载个人中心"
      description="正在同步账户与经营数据"
      :fill="true"
      :compact="true"
    />

    <template v-else>
    <view class="profile-hero">
      <view class="hero-decoration hero-decoration--large" />
      <view class="hero-decoration hero-decoration--small" />

      <view class="profile-main" hover-class="item--pressed" @tap="openProfile">
        <view class="avatar-wrap">
          <image v-if="userStore.avatarUrl" class="avatar-image" :src="userStore.avatarUrl" mode="aspectFill" />
         <image v-else class="avatar-image" src="/src/static/images/logo.png" mode="aspectFill" />
        </view>
        <view class="profile-copy">
          <view class="name-row">
            <text class="profile-name">{{ displayName }}</text>
            <AppIcon name="chevron-right" :size="17" color="#59697A" />
          </view>
          <view class="identity-row">
            <text class="level-tag">{{ dealerLevel }}</text>
            <text class="account-role">{{ userStore.isMainAccount ? '主账号' : '子账号' }}</text>
          </view>
          <text class="account-identity">{{ accountIdentity }}</text>
        </view>
      </view>

      <view v-if="!userStore.isAccountNormal || finance.credit?.isFrozen" class="account-notice">
        <AppIcon name="alert-circle" :size="16" color="#9A3B35" />
        <text>{{ !userStore.isAccountNormal ? '当前账号状态异常，部分采购能力已暂停' : '主体授信已冻结，暂不可提交采购订单' }}</text>
      </view>

      <view class="profile-metrics">
        <view class="profile-metric" @tap="goToRecharge">
          <text class="metric-value">{{ formatCompactMoney(finance.credit?.availableAmount) }}</text>
          <text class="metric-label">可用授信</text>
        </view>
        <view class="profile-metric" @tap="goToFundFlow">
          <text class="metric-value">{{ formatCompactMoney(finance.subjectAvailableBalance) }}</text>
          <text class="metric-label">主体余额</text>
        </view>
        <view class="profile-metric" @tap="goToInventory">
          <text class="metric-value">{{ formatQuantity(inventoryOverview?.availableQuantity) }}<text class="metric-unit">件</text></text>
          <text class="metric-label">可用库存</text>
        </view>
        <view class="profile-metric">
          <text class="metric-value">{{ userStore.creditScore || 0 }}<text class="metric-unit">分</text></text>
          <text class="metric-label">信誉分</text>
        </view>
      </view>
    </view>

    <view class="core-grid">
      <view v-if="userStore.hasPermission('ORDER_VIEW')" class="order-card">
        <view class="card-heading" hover-class="item--pressed" @tap="goToOrders()">
          <view>
            <text class="card-title">我的订单</text>
          </view>
          <view class="heading-link"><text>全部订单</text><AppIcon name="chevron-right" :size="16" /></view>
        </view>
        <view class="order-status-grid">
          <view
            v-for="item in orderShortcuts"
            :key="item.label"
            class="order-status"
            :class="{ 'has-count': item.count > 0 }"
            hover-class="item--pressed"
            @tap="item.action"
          >
            <view class="status-icon-wrap">
              <AppIcon :name="item.icon" :size="23" />
              <text v-if="item.count > 0" class="status-badge">{{ formatCount(item.count) }}</text>
            </view>
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="function-card">
      <view class="card-heading" hover-class="item--pressed" @tap="functionsExpanded = !functionsExpanded">
        <view>
          <text class="card-title">我的功能</text>
        </view>
        <view class="collapse-button">
          <text>{{ functionsExpanded ? '收起' : '展开' }}</text>
          <AppIcon :name="functionsExpanded ? 'chevron-down' : 'chevron-right'" :size="15" />
        </view>
      </view>

      <view v-show="functionsExpanded" class="function-grid">
        <view v-for="item in functionEntries" :key="item.label" class="function-item" hover-class="item--pressed" @tap="item.action">
          <view class="function-icon" :class="item.tone"><AppIcon :name="item.icon" :size="23" /></view>
          <text>{{ item.label }}</text>
        </view>
      </view>
    </view>

      <view class="service-card">
        <view class="card-heading static">
          <view>
            <text class="card-title">服务中心</text>
          </view>
        </view>
        <view class="service-links">
          <view class="service-link" hover-class="item--pressed" @tap="goToAfterSales">
            <view class="service-link-icon"><AppIcon name="profile-after-sales" :size="23" /></view>
            <view class="service-link-copy">
              <text>售后服务</text>
              <text>{{ pendingAfterSaleCount ? `${pendingAfterSaleCount} 条处理中` : '申请与进度查询' }}</text>
            </view>
            <AppIcon name="chevron-right" :size="16" color="#A0A7AF" />
          </view>
          <view class="service-link" hover-class="item--pressed" @tap="goToHelp">
            <view class="service-link-icon"><AppIcon name="profile-help" :size="23" /></view>
            <view class="service-link-copy"><text>帮助中心</text><text>采购与售后帮助</text></view>
            <AppIcon name="chevron-right" :size="16" color="#A0A7AF" />
          </view>
          <view class="service-link" hover-class="item--pressed" @tap="goToInvoice">
            <view class="service-link-icon"><AppIcon name="profile-invoice" :size="23" /></view>
            <view class="service-link-copy"><text>发票中心</text><text>企业抬头与开票记录</text></view>
            <AppIcon name="chevron-right" :size="16" color="#A0A7AF" />
          </view>
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ORDER_STATUS } from '@/app/config/constant.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { getProfile } from '@/shared/api/auth.js'
import { getDealerInventoryOverview } from '@/shared/api/inventory.js'
import { getOrderCounts } from '@/shared/api/order.js'
import { getAfterSaleCount } from '@/shared/api/afterSale.js'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppInitializing from '@/shared/ui/AppInitializing/AppInitializing.vue'

const props = defineProps({ active: { type: Boolean, default: false } })
const userStore = useUserStore()
const finance = ref(userStore.financeContext)
const inventoryOverview = ref(null)
const dealerCode = ref(String(userStore.dealerInfo?.dealerCode || '').trim())
const orderCounts = reactive({ allCount: 0, pendingReviewCount: 0, pendingPaymentCount: 0, processingCount: 0, completedCount: 0 })
const afterSaleCounts = reactive({ total: 0, pendingReview: 0, pendingReturn: 0, returning: 0, refunding: 0 })
const dashboardLoading = ref(false)
const dashboardInitialized = ref(false)
const functionsExpanded = ref(true)

const displayName = computed(() => userStore.displayName || userStore.realName || userStore.username || '经销商')
const dealerLevel = computed(() => userStore.creditLevel || '认证经销商')
const accountIdentity = computed(() => {
  return dealerCode.value ? `客户编号 ${dealerCode.value}` : '客户编号待同步'
})
const pendingAfterSaleCount = computed(() => (
  Number(afterSaleCounts.pendingReview || 0)
  + Number(afterSaleCounts.pendingReturn || 0)
  + Number(afterSaleCounts.returning || 0)
  + Number(afterSaleCounts.refunding || 0)
))
const showInitialLoading = computed(() => props.active && dashboardLoading.value && !dashboardInitialized.value)

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
      { key: 'afterSale', request: getAfterSaleCount() },
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
      else if (key === 'afterSale') Object.assign(afterSaleCounts, result.value)
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
function goToInventory() { return navigator.navigateTo(routes.account.inventory()) }
function goToAfterSales() { return navigator.navigateTo(routes.order.afterSaleList()) }
function goToInvoice() { return navigator.navigateTo(routes.account.invoice()) }
function goToRecharge() { return navigator.navigateTo(routes.account.recharge()) }
function goToBill() { return navigator.navigateTo(routes.account.billList()) }
function goToFundFlow() { return navigator.navigateTo(routes.account.fundFlow()) }
function goToAddress() { return navigator.navigateTo(routes.account.address()) }
function goToVoucher() { return navigator.navigateTo(routes.account.voucher()) }
function goToSubAccount() { return navigator.navigateTo(routes.account.subAccount()) }
function goToSecurity() { return navigator.navigateTo(routes.account.security()) }
function goToMessages() { return navigator.navigateTo(routes.content.messages()) }
function goToHelp() { return navigator.navigateTo(routes.content.help()) }

const orderShortcuts = computed(() => [
  { label: '待审核', count: orderCounts.pendingReviewCount, icon: 'order-pending-payment', action: () => goToOrders(ORDER_STATUS.PENDING_REVIEW) },
  { label: '待付款', count: orderCounts.pendingPaymentCount, icon: 'order-pending-payment', action: () => goToOrders(ORDER_STATUS.PENDING_PAYMENT) },
  { label: '履约中', count: orderCounts.processingCount, icon: 'order-shipped', action: () => goToOrders(ORDER_STATUS.PROCESSING) },
  { label: '已完成', count: orderCounts.completedCount, icon: 'order-signed', action: () => goToOrders(ORDER_STATUS.COMPLETED) },
])

const functionEntries = computed(() => [
  ...(userStore.hasPermission('INVENTORY_VIEW') ? [{ label: '库存管理', icon: 'profile-inventory', tone: 'primary', action: goToInventory }] : []),
  ...(userStore.hasPermission('BALANCE_VIEW') ? [
    { label: '充值中心', icon: 'profile-recharge', tone: 'primary', action: goToRecharge },
    { label: '对账账单', icon: 'profile-bill', action: goToBill },
    { label: '资金流水', icon: 'profile-fund-flow', action: goToFundFlow },
  ] : []),
  { label: '收货地址', icon: 'profile-address', action: goToAddress },
  { label: '优惠券', icon: 'profile-voucher', action: goToVoucher },
  ...(userStore.isMainAccount ? [{ label: '子账号', icon: 'profile-sub-account', action: goToSubAccount }] : []),
  // { label: '消息中心', icon: 'profile-message', action: goToMessages },
])

</script>

<style lang="scss" scoped>
.tab-page { width: 100%; max-width: 1180px; min-height: 100%; margin: 0 auto; padding: 0 14px calc(82px + env(safe-area-inset-bottom)); box-sizing: border-box; background: transparent; }
.account-initializing { min-height: calc(100vh - 138px - env(safe-area-inset-bottom)); }
.profile-hero { position: relative; overflow: hidden; margin: 0 -14px; padding: 12px 18px 24px; background: transparent; }
.hero-decoration { position: absolute; border-radius: 50%; background: rgba(255,255,255,.38); pointer-events: none; }.hero-decoration--large { top: -58px; right: -40px; width: 190px; height: 190px; }.hero-decoration--small { right: 118px; bottom: 34px; width: 44px; height: 44px; background: rgba(185,207,231,.25); }
.profile-main { position: relative; z-index: 1; display: grid; grid-template-columns: 64px minmax(0,1fr); align-items: center; gap: 13px; min-height: 76px; }
.avatar-wrap { display: grid; width: 64px; height: 64px; place-items: center; overflow: hidden; border: 4px solid rgba(255,255,255,.84); border-radius: 50%; color: #FFF; box-shadow: 0 9px 22px rgba(79,102,128,.14); box-sizing: border-box; }.avatar-image { width: 100%; height: 100%; }.avatar-text { font-size: 23px; font-weight: 760; }
.profile-copy { min-width: 0; }.name-row { display: flex; min-width: 0; align-items: center; gap: 5px; }.profile-name { overflow: hidden; color: #202831; font-size: 20px; font-weight: 760; text-overflow: ellipsis; white-space: nowrap; }
.identity-row { display: flex; align-items: center; gap: 6px; margin-top: 7px; }.level-tag, .account-role { padding: 4px 7px; border-radius: 7px; font-size: var(--type-micro-size, 11px); line-height: var(--type-micro-line-height, 16px); font-weight: 650; }.level-tag { color: #7C5824; background: #F5E2B9; }.account-role { color: #536A81; background: rgba(255,255,255,.62); }
.account-identity { display: block; margin-top: 6px; overflow: hidden; color: var(--type-secondary-color, #62666F); font-size: var(--type-micro-size, 11px); line-height: var(--type-micro-line-height, 16px); text-overflow: ellipsis; white-space: nowrap; }
.account-notice { position: relative; z-index: 1; display: flex; align-items: flex-start; gap: 7px; margin-top: 12px; padding: 9px 10px; border: 1px solid rgba(201,91,82,.16); border-radius: 11px; color: #873B35; background: rgba(255,255,255,.62); font-size: var(--type-caption-size, 12px); line-height: var(--type-caption-line-height, 18px); }
.profile-metrics { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); margin-top: 19px; }
.profile-metric { position: relative; min-width: 0; padding: 5px 3px; text-align: center; }.profile-metric:not(:last-child)::after { content: ''; position: absolute; top: 9px; right: 0; width: 1px; height: 28px; background: rgba(87,108,130,.13); }
.metric-value, .metric-label { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.metric-value { color: var(--type-title-color, #1B1C20); font-size: var(--type-label-size, 15px); font-weight: 760; font-variant-numeric: tabular-nums; }.metric-unit { margin-left: 2px; font-size: var(--type-micro-size, 11px); font-weight: 620; }.metric-label { margin-top: 5px; color: var(--type-secondary-color, #62666F); font-size: var(--type-caption-size, 12px); line-height: var(--type-caption-line-height, 18px); }
.core-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 14px; }.order-card, .service-card, .function-card, .account-service-card { border-radius: 18px; background: #FFF; box-shadow: 0 8px 24px rgba(48,65,82,.04); }
.order-card, .service-card { padding: 16px; }.card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }.card-heading.static { pointer-events: none; }.card-title, .card-subtitle { display: block; }.card-title { color: var(--type-title-color, #1B1C20); font-size: var(--type-card-title-size, 16px); line-height: var(--type-card-title-line-height, 24px); font-weight: 740; }.card-subtitle { margin-top: 4px; color: var(--type-muted-color, #969AA3); font-size: var(--type-micro-size, 11px); }.heading-link, .collapse-button { display: flex; align-items: center; gap: 2px; color: var(--type-secondary-color, #62666F); font-size: var(--type-caption-size, 12px); line-height: var(--type-caption-line-height, 18px); }
.card-title { position: relative; padding-left: 10px; }.card-title::before { content: ''; position: absolute; top: 3px; bottom: 3px; left: 0; width: 3px; border-radius: 2px; background: #D7192D; }
.heading-link, .collapse-button { min-height: 30px; padding: 0 2px 0 8px; }
.order-status-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); margin-top: 17px; padding: 15px 0 3px; border-top: 1px solid #EFF1F3; }.order-status { position: relative; display: flex; min-width: 0; min-height: 62px; align-items: center; justify-content: center; flex-direction: column; gap: 8px; color: var(--type-secondary-color, #62666F); font-size: var(--type-caption-size, 12px); line-height: var(--type-caption-line-height, 18px); }.order-status:not(:last-child)::after { content: ''; position: absolute; top: 10px; right: 0; width: 1px; height: 34px; background: #F0F1F3; }.status-icon-wrap { position: relative; display: grid; width: 32px; height: 32px; place-items: center; color: #3F4853; }.order-status.has-count .status-icon-wrap { color: #D7192D; }.status-badge { position: absolute; top: -3px; right: -4px; display: inline-flex; min-width: 18px; height: 18px; align-items: center; justify-content: center; padding: 0 4px; border: 2px solid #FFF; border-radius: 10px; color: #FFF; background: #D7192D; box-sizing: border-box; font-size: 10px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.service-links { margin-top: 10px; }.service-link { display: grid; grid-template-columns: 30px minmax(0,1fr) 16px; align-items: center; gap: 10px; min-height: 62px; border-top: 1px solid #EFF0F2; }.service-link-icon { display: grid; width: 30px; height: 30px; place-items: center; color: var(--icon-primary, #303238); }.service-link-copy { min-width: 0; }.service-link-copy text { display: block; }.service-link-copy text:first-child { color: var(--type-title-color, #1B1C20); font-size: var(--type-body-small-size, 13px); line-height: var(--type-body-small-line-height, 20px); font-weight: 650; }.service-link-copy text:last-child { margin-top: 2px; overflow: hidden; color: var(--type-muted-color, #969AA3); font-size: var(--type-micro-size, 11px); line-height: var(--type-micro-line-height, 16px); text-overflow: ellipsis; white-space: nowrap; }
.function-card, .account-service-card { padding: 16px; }.function-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); row-gap: 10px; margin-top: 17px; padding-top: 13px; border-top: 1px solid #EFF1F3; }.function-item { position: relative; display: flex; min-width: 0; min-height: 68px; align-items: center; justify-content: center; flex-direction: column; gap: 8px; color: var(--type-secondary-color, #62666F); font-size: var(--type-caption-size, 12px); line-height: var(--type-caption-line-height, 18px); text-align: center; }.function-icon { display: grid; width: 38px; height: 34px; place-items: center; color: #414A55; }.function-icon.primary { color: #D7192D; }
.account-service-card { margin-bottom: 4px; }.updating-text { color: var(--type-muted-color, #969AA3); font-size: var(--type-micro-size, 11px); }.account-service-grid { display: grid; grid-template-columns: 1fr; margin-top: 11px; }.account-service-item { display: grid; grid-template-columns: 30px minmax(0,1fr) 16px; align-items: center; gap: 10px; min-height: 62px; border-top: 1px solid #EFF0F2; }.account-service-icon { display: grid; width: 30px; height: 30px; place-items: center; color: var(--icon-primary, #303238); }.account-service-copy { min-width: 0; }.account-service-copy text { display: block; }.account-service-copy text:first-child { color: var(--type-title-color, #1B1C20); font-size: var(--type-body-small-size, 13px); font-weight: 650; }.account-service-copy text:last-child { margin-top: 2px; color: var(--type-muted-color, #969AA3); font-size: var(--type-micro-size, 11px); }
.item--pressed { opacity: .65; }.function-card, .function-grid { transition: opacity .18s ease, transform .18s ease; }
@media screen and (min-width: 600px) {
  .tab-page { padding-right: 22px; padding-left: 22px; }.profile-hero { margin-right: -22px; margin-left: -22px; padding-right: 28px; padding-left: 28px; }.core-grid { gap: 14px; }.function-grid { grid-template-columns: repeat(6,minmax(0,1fr)); row-gap: 12px; }.service-links { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 1px; margin-top: 14px; background: #EFF0F2; }.service-link { padding: 0 12px; border-top: 0; background: #FFF; }.account-service-grid { grid-template-columns: repeat(3,minmax(0,1fr)); gap: 1px; background: #EFF0F2; }.account-service-item { padding: 0 11px; border-top: 0; background: #FFF; }
}
@media screen and (min-width: 820px) {
  .tab-page { padding: 0 28px 34px; }.profile-hero { margin: 0; padding: 18px 28px 26px; }.profile-main { grid-template-columns: 72px minmax(0,1fr); }.avatar-wrap { width: 72px; height: 72px; }.profile-metrics { max-width: 690px; margin-top: 22px; }.core-grid { margin-top: 16px; }.order-card, .service-card, .function-card, .account-service-card { padding: 20px 22px; }.function-grid { grid-template-columns: repeat(8,minmax(0,1fr)); }.function-item { min-height: 72px; }.order-status { min-height: 68px; }.status-icon-wrap { width: 36px; height: 36px; }
}
@media screen and (max-width: 374px) {
  .tab-page { padding-right: 11px; padding-left: 11px; }.profile-hero { margin-right: -11px; margin-left: -11px; padding: 10px 14px 20px; }.profile-main { grid-template-columns: 58px minmax(0,1fr); }.avatar-wrap { width: 58px; height: 58px; }.profile-name { font-size: 18px; }.metric-value { font-size: 13px; }.order-card, .service-card, .function-card, .account-service-card { padding: 14px; }.function-grid { row-gap: 18px; }.function-icon { width: 36px; height: 32px; }
}
</style>
