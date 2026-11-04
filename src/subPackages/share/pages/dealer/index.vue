<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('share.dealer.title')" :show-back="true" /></template>
    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 28px" :refresher-enabled="true" :refresher-triggered="isRefreshing" @refresherrefresh="handleRefresh" @refresherrestore="handleRefresherRestore" @refresherabort="handleRefresherRestore">
        <view class="share-center">
          <AppPageState v-if="state.loading && !state.capabilities && !isRefreshing" state="loading" compact />
          <AppPageState v-else-if="state.failed && !state.capabilities" state="error" :title="t('share.dealer.loadFailed')" :description="capabilitiesErrorMessage" :action-text="t('share.stock.retry')" compact @retry="controller.load()" />
          <template v-else>
            <AppCard padding="md"><view class="share-stats"><view v-for="metric in metrics" :key="metric.key"><text class="stat-value">{{ state.capabilities?.[metric.key] ?? '—' }}</text><text class="stat-label">{{ metric.label }}</text></view></view></AppCard>
            <AppCard v-if="sharedReason" padding="none"><ShareAvailability :message="sharedReason" /></AppCard>
            <view class="share-entry-grid">
              <AppListGroup>
                <AppListItem :label="t('share.dealer.stockTitle')" icon="box" :clickable="false" :show-arrow="false"><template #value><StatusTag :type="state.capabilities?.canSharePublicStock ? 'success' : 'default'" :text="t(state.capabilities?.canSharePublicStock ? 'share.dealer.available' : 'share.dealer.unavailable')" /></template></AppListItem>
                <view class="share-actions"><AppButton size="sm" variant="secondary" :disabled="blockedStock" :loading="state.busy" @tap="copyPublicLink">{{ t('share.dealer.copy') }}</AppButton><AppButton size="sm" variant="secondary" :disabled="blockedStock" @tap="controller.publicStock()">{{ t('share.dealer.showQr') }}</AppButton></view>
                <ShareAvailability v-if="!sharedReason && state.capabilities && !state.capabilities.canSharePublicStock" :message="reason(state.capabilities.publicStockDisabledReasons)" />
              </AppListGroup>
              <AppListGroup>
                <AppListItem :label="t('share.dealer.retailTitle')" icon="cart" :clickable="false" :show-arrow="false"><template #value><StatusTag :type="state.capabilities?.canCreateRetailShare ? 'success' : 'default'" :text="t(state.capabilities?.canCreateRetailShare ? 'share.dealer.available' : 'share.dealer.unavailable')" /></template></AppListItem>
                <view class="retail-body"><view class="quota-line"><text>{{ t('share.dealer.quotaLabel') }}</text><text><text class="quota-used">{{ state.capabilities?.todayCreatedCount ?? '—' }}</text> / {{ state.capabilities?.dailyCreateLimit ?? '—' }}</text></view><view class="quota-track"><view :style="{ width: quotaPercent + '%' }" /></view><AppButton block :disabled="state.loading || state.busy || (!state.pendingCreate && !state.capabilities?.canCreateRetailShare)" @tap="openGenerate">{{ t('share.dealer.create') }}</AppButton></view>
                <ShareAvailability v-if="!sharedReason && state.capabilities && !state.capabilities.canCreateRetailShare" :message="reason(state.capabilities.retailDisabledReasons)" />
              </AppListGroup>
            </view>
            <AppListGroup><AppListItem :label="t('share.dealer.history')" icon="receipt" @tap="openRecords" /></AppListGroup>
          </template>
          <ShareAvailability v-if="state.actionFailed" :message="actionErrorMessage" />
        </view>
      </AppContent>
    </template>
    <template #overlay><ShareQrPanel :entry="state.qr" modal @close="state.qr = null" @invalid="invalidQr" /></template>
  </AppPageShell>
</template>
<script setup>
import { computed } from 'vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppCard from '@/shared/ui/AppCard/AppCard.vue'
import AppListGroup from '@/shared/ui/AppListGroup/AppListGroup.vue'
import AppListItem from '@/shared/ui/AppListItem/AppListItem.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import { t } from '@/shared/i18n/index.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import ShareQrPanel from '../../components/ShareQrPanel.vue'
import ShareAvailability from '../../components/ShareAvailability.vue'
import { useDealerSharePage } from '../../composables/useDealerSharePage.js'
import { copyShareLink } from '../../model/copyShareLink.js'
import { dealerShareReason } from '../../model/dealerShareReason.js'
import { registerShareLocales } from '../../i18n/register.js'
registerShareLocales()
const { controller, state, isRefreshing, capabilitiesErrorMessage, actionErrorMessage, handleRefresh, handleRefresherRestore } = useDealerSharePage({ loadRecords: false })
const metrics = computed(() => [{ key: 'totalRetailCount', label: t('share.dealer.totalLinks') }, { key: 'totalVisitCount', label: t('share.dealer.totalVisits') }, { key: 'boundOrderCount', label: t('share.dealer.totalOrders') }])
const blockedStock = computed(() => state.busy || state.loading || !state.capabilities?.canSharePublicStock)
const quotaPercent = computed(() => { const c = state.capabilities; return c?.dailyCreateLimit ? Math.min(100, c.todayCreatedCount * 100 / c.dailyCreateLimit) : 0 })
const reason = dealerShareReason
const sharedReason = computed(() => {
  const c = state.capabilities
  if (!c || c.canSharePublicStock || c.canCreateRetailShare) return ''
  const stock = c.publicStockDisabledReasons?.[0], retail = c.retailDisabledReasons?.[0]
  return stock && stock === retail ? reason([stock]) : ''
})
/** 进入生成页可查看真实额度和未确认请求，避免重复扣次。 */
function openGenerate() { navigator.navigateTo(routes.share.generate()) }
/** 使用统一全宽列表进入记录。 */
function openRecords() { navigator.navigateTo(routes.share.records()) }
/** 复制与二维码为两个独立动作，复制不闪现弹窗。 */
async function copyPublicLink() { await controller.publicStock(); if (!state.actionFailed && state.qr) { const entry = state.qr; state.qr = null; await copyShareLink(entry) } }
/** 二维码失败只清当前页数据，不保存无效图。 */
function invalidQr() { state.qr = null; state.actionFailed = true }
</script>
<style scoped>
.share-center{--glass-card-shadow:none}
.share-center{display:flex;flex-direction:column;gap:16px;width:100%;max-width:1120px;margin:0 auto}.share-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;text-align:center}.stat-value,.stat-label{display:block}.stat-value{color:var(--text-primary);font-size:24px;font-weight:700;line-height:32px;font-variant-numeric:tabular-nums}.stat-label{margin-top:4px;color:var(--text-secondary);font-size:var(--font-size-caption,12px);line-height:20px}.share-entry-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}.share-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:4px 16px 16px}.share-actions :deep(.app-button){min-width:0;width:100%;padding:0 8px}.retail-body{padding:4px 16px 16px}.quota-line{display:flex;justify-content:space-between;gap:12px;color:var(--text-secondary);font-size:var(--font-size-caption,12px);line-height:24px}.quota-used{color:var(--text-primary);font-size:16px;font-weight:600}.quota-track{height:4px;overflow:hidden;margin:8px 0 16px;border-radius:4px;background:var(--divider-color)}.quota-track>view{height:100%;background:var(--primary-color)}@media(min-width:600px){.share-entry-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
