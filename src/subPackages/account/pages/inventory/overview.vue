<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('account.inventory.overview')" :show-back="true" /></template>
    <template #content>
      <AppContent width-mode="standard" padding="16px var(--page-padding-x,16px) 32px" :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="refresh" @refresherrestore="restoreRefresh" @refresherabort="restoreRefresh">
        <view class="inventory-wrap">
          <AppPageState :state="pageState" :action-text="pageState === PageStatus.ERROR ? t('account.inventory.reload') : ''" :title="pageState === PageStatus.ERROR ? t('account.inventory.readFailed') : ''" :description="loadError" @retry="loadData" @action="loadData">
            <view class="overview-hero">
              <text class="hero-label">{{ t('account.inventory.quantityTotal') }}</text>
              <text class="hero-number">{{ qty(overview.onHandQuantity) }}</text>
              <view class="hero-stats"><text>{{ t('account.inventory.productTotal') }} <text>{{ qty(overview.productCount) }}</text></text><text>{{ t('account.inventory.skuVariants') }} <text>{{ qty(overview.skuCount) }}</text></text></view>
            </view>
            <view class="metrics">
              <view class="metric primary" role="button" tabindex="0" @keydown.enter="openInventory('available')" hover-class="inventory-pressed" @tap="openInventory('available')"><text>{{ t('account.inventory.currentAvailable') }}</text><text>{{ qty(overview.availableQuantity) }}</text></view>
              <view class="metric"><text>{{ t('account.inventory.reserved') }}</text><text>{{ qty(overview.reservedQuantity) }}</text></view>
              <view class="metric"><text>{{ t('account.inventory.unavailableTotal') }}</text><text>{{ qty(overview.unavailableQuantity) }}</text></view>
            </view>
            <view class="overview-tools">
              <AppButton size="sm" @tap="openInventory('all')">{{ t('account.inventory.list') }}</AppButton>
              <AppButton size="sm" variant="secondary" @tap="openLedger">{{ t('account.inventory.ledger') }}</AppButton>
            </view>
            <view class="section-card">
              <view class="section-head"><text class="section-title">{{ t('account.inventory.stockHealth') }}</text><text class="muted">SKU</text></view>
              <view class="distribution-row" role="button" tabindex="0" hover-class="inventory-pressed" @keydown.enter="openInventory('available')" @tap="openInventory('available')"><text>{{ t('account.inventory.availableSku') }}</text><text>{{ qty(overview.availableSkuCount) }} <AppIcon name="chevron-right" :size="14" /></text></view>
              <view class="distribution-row" role="button" tabindex="0" hover-class="inventory-pressed" @keydown.enter="openInventory('low')" @tap="openInventory('low')"><view><text>{{ t('account.inventory.low') }}</text><text class="muted">{{ t('account.inventory.lowHint') }}</text></view><text class="warning">{{ qty(overview.lowStockSkuCount) }} <AppIcon name="chevron-right" :size="14" /></text></view>
              <view class="distribution-row" role="button" tabindex="0" hover-class="inventory-pressed" @keydown.enter="openInventory('out')" @tap="openInventory('out')"><text>{{ t('account.inventory.outSku') }}</text><text>{{ qty(overview.outOfStockSkuCount) }} <AppIcon name="chevron-right" :size="14" /></text></view>
              <view class="distribution-row"><text>{{ t('account.inventory.reservedSku') }}</text><text>{{ qty(overview.reservedSkuCount) }}</text></view>
            </view>
            <text class="note">{{ t('account.inventory.lastInbound', { date: formatDateTime(overview.lastInboundAt) }) }}</text>
          </AppPageState>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { formatDateTime } from '@/shared/utils/format.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'
import { getDealerInventoryOverview } from '../../api/inventory.js'

const overview = ref({}), pageState = ref(PageStatus.LOADING), failure = ref(null), refreshing = ref(false)
const loadError = computed(() => failure.value?.message || (failure.value ? t('account.inventory.loadFailed') : ''))
let disposed = false, reading = false
onShow(loadData)
onUnload(() => { disposed = true })
/** Read a fresh server aggregate once, including when returning from a return request. */
async function loadData() {
  if (reading || disposed) return
  reading = true; failure.value = null; pageState.value = PageStatus.LOADING
  try { const result = await getDealerInventoryOverview(); if (!disposed) { overview.value = result; pageState.value = PageStatus.CONTENT } }
  catch (error) { if (!disposed) { failure.value = error; pageState.value = PageStatus.ERROR } }
  finally { reading = false }
}
/** Finish the native refresh control after the aggregate request. */
async function refresh() { if (refreshing.value) return; const start=Date.now(); refreshing.value = true; try { await loadData() } finally { await waitForRefreshAnimation(start); if (!disposed) refreshing.value = false } }
/** Restore the native refresher only after the pending request finishes. */
function restoreRefresh() { if (!reading) refreshing.value = false }
/** Open a server-side inventory subset. */
function openInventory(stockStatus) { return navigator.navigateTo(routes.account.inventory({ stockStatus })) }
/** Open all inventory activity. */
function openLedger() { return navigator.navigateTo(routes.account.inventoryLedger()) }
/** Display quantities without converting mixed product units into money. */
function qty(value) { return Number(value || 0).toLocaleString('zh-CN') }
</script>
<style lang="scss" scoped>
@import './inventory.scss';

.overview-hero { padding:24px; border-radius:var(--radius-feature,18px); background:var(--inventory-card); box-shadow:none; }
.hero-label { display:block; color:var(--inventory-muted); font-size:var(--type-body-size,14px); }
.hero-number { display:block; margin:8px 0 20px; color:var(--inventory-ink); font-size:var(--type-display-size,28px); line-height:1.25; font-weight:700; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
.hero-stats { display:flex; flex-wrap:wrap; gap:8px 24px; color:var(--inventory-muted); font-size:var(--type-caption-size,12px); }
.hero-stats text text { margin-left:8px; color:var(--inventory-ink); font-size:var(--type-body-size,14px); font-weight:600; }
.metrics { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:12px; }
.metric { min-width:0; padding:16px 12px; border-radius:var(--radius-card,14px); background:var(--inventory-card); box-shadow:none; }
.metric text { display:block; color:var(--inventory-muted); font-size:var(--type-caption-size,12px); line-height:1.5; }
.metric > text:first-child { min-height:36px; }
.metric text:last-child { margin-top:8px; color:var(--inventory-ink); font-size:var(--type-page-title-size,20px); font-weight:600; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
.metric.primary text:last-child { color:var(--primary-color); }
.overview-tools { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin:20px 0; }
.overview-tools :deep(.app-button) { width:100%; min-width:0; }
.distribution-row { display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:64px; border-bottom:1px solid var(--inventory-divider); color:var(--inventory-ink); font-size:var(--type-body-size,14px); }
.distribution-row:last-child { border:0; }
.distribution-row > text:last-child { display:flex; align-items:center; justify-content:flex-end; gap:12px; flex-shrink:0; font-size:var(--type-card-title-size,16px); font-weight:600; font-variant-numeric:tabular-nums; }
.distribution-row view text { display:block; }
.warning { color:var(--inventory-ink); }
@media (min-width:720px) { .overview-hero { padding:32px; } .metric { padding:20px; } }

</style>
