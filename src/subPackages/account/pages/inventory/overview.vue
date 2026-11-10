<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('account.inventory.overview')" :show-back="true" /></template>
    <template #content>
      <AppContent padding="16px var(--page-padding-x,16px) 32px" :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="refresh">
        <view class="inventory-wrap">
          <AppPageState :state="pageState" :description="loadError" @retry="loadData" @action="loadData">
            <view class="overview-hero">
              <text class="hero-label">{{ t('account.inventory.quantityTotal') }}</text>
              <text class="hero-number">{{ qty(overview.onHandQuantity) }}</text>
              <view class="hero-stats"><text>{{ t('account.inventory.productTotal') }} <text>{{ qty(overview.productCount) }}</text></text><text>{{ t('account.inventory.skuVariants') }} <text>{{ qty(overview.skuCount) }}</text></text></view>
            </view>
            <view class="metrics">
              <view class="metric primary" @tap="openInventory('available')"><text>{{ t('account.inventory.currentAvailable') }}</text><text>{{ qty(overview.availableQuantity) }}</text></view>
              <view class="metric"><text>{{ t('account.inventory.reserved') }}</text><text>{{ qty(overview.reservedQuantity) }}</text></view>
              <view class="metric"><text>{{ t('account.inventory.unavailableTotal') }}</text><text>{{ qty(overview.unavailableQuantity) }}</text></view>
            </view>
            <view class="overview-tools">
              <AppButton @tap="openInventory('all')">{{ t('account.inventory.list') }}</AppButton>
              <AppButton variant="secondary" @tap="openLedger">{{ t('account.inventory.ledger') }}</AppButton>
            </view>
            <view class="section-card">
              <view class="section-head"><text class="section-title">{{ t('account.inventory.stockHealth') }}</text><text class="muted">SKU</text></view>
              <view class="distribution-row" @tap="openInventory('available')"><text>{{ t('account.inventory.availableSku') }}</text><text>{{ qty(overview.availableSkuCount) }} <AppIcon name="chevron-right" :size="14" /></text></view>
              <view class="distribution-row" @tap="openInventory('low')"><view><text>{{ t('account.inventory.low') }}</text><text class="muted">{{ t('account.inventory.lowHint') }}</text></view><text class="warning">{{ qty(overview.lowStockSkuCount) }} <AppIcon name="chevron-right" :size="14" /></text></view>
              <view class="distribution-row" @tap="openInventory('out')"><text>{{ t('account.inventory.outSku') }}</text><text>{{ qty(overview.outOfStockSkuCount) }} <AppIcon name="chevron-right" :size="14" /></text></view>
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
async function refresh() { if (refreshing.value) return; refreshing.value = true; try { await loadData() } finally { if (!disposed) refreshing.value = false } }
/** Open a server-side inventory subset. */
function openInventory(stockStatus) { return navigator.navigateTo(routes.account.inventory({ stockStatus })) }
/** Open all inventory activity. */
function openLedger() { return navigator.navigateTo(routes.account.inventoryLedger()) }
/** Display quantities without converting mixed product units into money. */
function qty(value) { return Number(value || 0).toLocaleString('zh-CN') }
</script>
<style lang="scss" scoped>
@import './inventory.scss';
.overview-hero { padding: 23px 22px; border-radius: var(--radius-feature, 18px); color: #fff; background: linear-gradient(120deg,#AA1527,#D9293B); }
.hero-label { display: block; font-size: var(--type-body-small-size, 13px); opacity: .8; }
.hero-number { display: block; margin: 10px 0 20px; font-size: var(--type-display-size, 28px); font-weight: var(--font-weight-bold, 700); font-variant-numeric: tabular-nums; }
.hero-stats { display: flex; gap: 30px; font-size: var(--type-caption-size, 12px); opacity: .9; }
.hero-stats text text { margin-left: 8px; font-size: var(--type-label-size, 15px); font-weight: var(--font-weight-semibold, 600); }
.metrics { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; margin-top: 12px; }
.metric { padding: 16px 10px; border-radius: var(--radius-card, 14px); background: #fff; }
.metric text { display: block; color: #8A929D; font-size: var(--type-caption-size, 12px); line-height: 1.6; }
.metric > text:first-child { min-height: 32px; }
.metric text:last-child { margin-top: 6px; color: #333C48; font-size: var(--type-page-title-size, 20px); font-weight: var(--font-weight-semibold, 600); overflow-wrap: anywhere; }
.metric.primary text:last-child { color: #D7192D; }
.distribution-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 55px; border-bottom: 1px solid #F0F2F5; color: #444D59; font-size: var(--type-body-small-size, 13px); }
.distribution-row:last-child { border: 0; }
.distribution-row > text:last-child { font-size: var(--type-card-title-size, 16px); font-weight: var(--font-weight-semibold, 600); }
.distribution-row view text { display: block; }
.warning { color: #C08326; }
.overview-tools { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 12px 0; }
.overview-tools :deep(.app-button) { width: 100%; min-width: 0; margin: 0; padding-inline: 8px; box-sizing: border-box; }
@media screen and (min-width:720px) { .metric { padding: 20px; } .overview-hero { padding: 30px; } }

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.section-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
</style>
