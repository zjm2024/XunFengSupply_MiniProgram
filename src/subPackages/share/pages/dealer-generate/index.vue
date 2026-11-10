<template>
  <AppPageShell class="share-issuer-page">
    <template #header><AppHeader :title="t('share.dealer.generateTitle')" :show-back="true" /></template>
    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 28px" :refresher-enabled="true" :refresher-triggered="isRefreshing" @refresherrefresh="handleRefresh" @refresherrestore="handleRefresherRestore" @refresherabort="handleRefresherRestore">
        <view class="generate-page">
          <AppPageState v-if="state.loading && !state.capabilities && !isRefreshing" state="loading" compact />
          <AppPageState v-else-if="state.failed && !state.capabilities" state="error" :title="t('share.dealer.loadFailed')" :description="capabilitiesErrorMessage" :action-text="t('share.stock.retry')" compact @retry="controller.load()" />
          <template v-else>
            <AppCard padding="md"><view class="quota-summary"><text>{{ t('share.dealer.quotaLabel') }}</text><text class="quota-value">{{ state.capabilities?.todayCreatedCount ?? '—' }}<text class="quota-total"> / {{ state.capabilities?.dailyCreateLimit ?? '—' }}</text></text></view><text class="remaining">{{ t('share.dealer.remainingCount', { count: state.capabilities?.remainingCreateCount ?? '—' }) }}</text></AppCard>
            <template v-if="state.qr"><ShareQrPanel :entry="state.qr" @close="state.qr = null" @invalid="invalidQr" /><AppButton block variant="secondary" @tap="startAnother">{{ t('share.dealer.createAnother') }}</AppButton></template>
            <AppListGroup v-else>
              <view class="title-field"><view class="field-heading"><text>{{ t('share.dealer.titleLabel') }}</text><text class="field-optional">{{ t('share.dealer.optional') }}</text></view><input :placeholder-style="$inputPlaceholderStyle" v-model="state.title" class="title-input" maxlength="60" :disabled="state.busy || state.pendingCreate" :placeholder="t('share.dealer.titlePlaceholder')" :aria-label="t('share.dealer.titleLabel')" /><view class="field-meta"><text>{{ t('share.dealer.validity') }}</text><text>{{ state.title.length }}/60</text></view></view>
              <ShareAvailability v-if="state.pendingCreate" :message="t('share.dealer.pending')" />
              <ShareAvailability v-else-if="state.capabilities && !state.capabilities.canCreateRetailShare" :message="dealerShareReason(state.capabilities.retailDisabledReasons)" />
            </AppListGroup>
            <AppListGroup><AppListItem :label="t('share.dealer.history')" icon="receipt" @tap="openRecords" /></AppListGroup>
          </template>
          <ShareAvailability v-if="state.actionFailed" :message="actionErrorMessage" />
        </view>
      </AppContent>
    </template>
    <template v-if="!state.qr" #footer><FixedActionBar width-mode="standard"><AppButton block :loading="state.busy" :disabled="state.loading || state.failed || (!state.pendingCreate && !state.capabilities?.canCreateRetailShare)" @tap="controller.create">{{ t(state.pendingCreate ? 'share.dealer.retryCreate' : 'share.dealer.create') }}</AppButton></FixedActionBar></template>
  </AppPageShell>
</template>
<script setup>
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppCard from '@/shared/ui/AppCard/AppCard.vue'
import AppListGroup from '@/shared/ui/AppListGroup/AppListGroup.vue'
import AppListItem from '@/shared/ui/AppListItem/AppListItem.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { t } from '@/shared/i18n/index.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import ShareQrPanel from '../../components/ShareQrPanel.vue'
import ShareAvailability from '../../components/ShareAvailability.vue'
import { useDealerSharePage } from '../../composables/useDealerSharePage.js'
import { dealerShareReason } from '../../model/dealerShareReason.js'
import { registerShareLocales } from '../../i18n/register.js'
registerShareLocales()
const { controller, state, isRefreshing, capabilitiesErrorMessage, actionErrorMessage, handleRefresh, handleRefresherRestore } = useDealerSharePage({ loadRecords: false })
/** 只有再次明确提交才创建下一条，不通过重置按钮扣额度。 */
function startAnother() { state.qr = null; state.title = '' }
/** 打开完整分享记录列表。 */
function openRecords() { navigator.navigateTo(routes.share.records()) }
/** 编码失败清除敏感内容，保留服务端实际创建事实。 */
function invalidQr() { state.qr = null; state.actionFailed = true }
</script>
<style scoped lang="scss">
@import "../../styles/dealerSharingScroll.scss";
.generate-page{--glass-card-shadow:none}
.generate-page{display:flex;flex-direction:column;gap:16px;width:100%;max-width:720px;margin:0 auto}.quota-summary{display:flex;align-items:center;justify-content:space-between;gap:16px;color:var(--text-primary);font-size:var(--font-size-body,14px);line-height: 28px}.quota-value{font-size: var(--type-heading-size, 24px);font-weight: var(--font-weight-bold, 700);font-variant-numeric:tabular-nums}.quota-total{font-size: var(--type-body-size, 14px);font-weight: var(--font-weight-regular, 400);color:var(--text-secondary)}.remaining{display:block;margin-top:4px;color:var(--text-secondary);font-size:var(--font-size-caption,12px);line-height: 20px}.title-field{padding:16px}.field-heading,.field-meta{display:flex;justify-content:space-between;gap:12px}.field-heading{margin-bottom:12px;color:var(--text-primary);font-size:var(--font-size-body,14px);line-height: 24px}.field-optional,.field-meta{color:var(--text-tertiary);font-size:var(--font-size-caption,12px);line-height: 20px}.title-input{box-sizing:border-box;width:100%;height:48px;padding:0 12px;border:1px solid var(--border-color);border-radius:var(--radius-control,10px);background:var(--surface-subtle);color:var(--text-primary);font-size:var(--font-size-body,14px)}.field-meta{margin-top:8px}
</style>
