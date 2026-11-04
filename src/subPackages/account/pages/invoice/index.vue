<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('account.titles.invoice')" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="12px var(--page-padding-x, 12px) 24px">
        <view class="invoice-page">
          <view class="summary-card">
            <view class="summary-copy">
              <text class="summary-label">{{ t('account.invoice.availableAmount') }}</text>
              <text class="summary-amount">—</text>
              <text class="summary-status">{{ t('account.invoice.coming') }}</text>
            </view>
            <view class="summary-actions">
              <button class="button button-primary" disabled>{{ t('account.invoice.apply') }}</button>
              <button class="button button-outline" disabled>{{ t('account.invoice.titleManage') }}</button>
            </view>
          </view>

          <view class="tabs" role="tablist">
            <view
              class="tab-item"
              :class="{ active: activeTab === 'application' }"
              role="tab"
              :aria-selected="activeTab === 'application'"
              @tap="activeTab = 'application'"
            >{{ t('account.invoice.titles') }}</view>
            <view
              class="tab-item"
              :class="{ active: activeTab === 'archive' }"
              role="tab"
              :aria-selected="activeTab === 'archive'"
              @tap="activeTab = 'archive'"
            >{{ t('account.invoice.records') }}</view>
          </view>

          <view class="record-list">
            <AppPageState
              state="empty"
              :title="activeTab === 'application' ? t('account.invoice.titlePreparing') : t('account.invoice.emptyRecords')"
              compact
            >
              <template #illustration>
                <AppSvgIllustration name="no-revenue" size="sm" />
              </template>
            </AppPageState>
          </view>

          <AppListGroup class="help-list" compact>
            <AppListItem :label="t('account.invoice.contactHint')" icon="profile-help" @tap="goToHelp" />
          </AppListGroup>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref } from 'vue'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppListGroup from '@/shared/ui/AppListGroup/AppListGroup.vue'
import AppListItem from '@/shared/ui/AppListItem/AppListItem.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const activeTab = ref('application')
/** 打开发票问题帮助页。 */
function goToHelp() { return navigator.navigateTo(routes.content.help()) }
</script>

<style lang="scss" scoped>
.invoice-page { width: 100%; max-width: var(--content-max-width, 1120px); min-height: 100%; margin: 0 auto; padding-bottom: env(safe-area-inset-bottom); }
.summary-card, .tabs, .record-list { border-radius: var(--radius-card, 14px); background: #FFF; box-shadow: 0 2px 12px rgba(0,0,0,.04); }
.summary-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; }
.summary-copy { min-width: 0; }
.summary-label { display: block; color: #888; font-size: var(--type-caption-size, 12px); }
.summary-amount { display: block; margin-top: 4px; color: var(--primary-color, #D7192D); font-size: var(--type-page-title-size, 20px); font-weight: var(--font-weight-bold, 700); }
.summary-status { display: block; margin-top: 4px; color: #999; font-size: var(--type-caption-size, 12px); }
.summary-actions { display: flex; flex: 0 0 auto; gap: 7px; }
.button { min-height:var(--list-action-height,32px); margin: 0; padding: 0 12px; border: 1px solid transparent; border-radius:var(--list-action-radius,8px);font-size:var(--list-action-font-size,12px);line-height: 30px; }
.button-primary { color: #FFF; background: var(--primary-color, #D7192D); }
.button-outline { border-color: var(--primary-color, #D7192D); color: var(--primary-color, #D7192D); background: #FFF; }
.button[disabled] { opacity: .48; }
.tabs { display: flex; margin-top: 12px; overflow: hidden; }
.tab-item { position: relative; flex: 1; padding: 13px 0; color: #666; font-size: var(--type-body-size, 14px); text-align: center; }
.tab-item.active { color: var(--primary-color, #D7192D); font-weight: var(--font-weight-semibold, 600); }
.tab-item.active::after { position: absolute; right: 20%; bottom: 0; left: 20%; height: 2px; background: var(--primary-color, #D7192D); content: ''; }
.record-list { overflow: hidden; margin-top: 8px; border-radius: var(--radius-card, 14px); background: #FFF; box-shadow: 0 2px 12px rgba(0,0,0,.04); }
.record-list :deep(.state-empty) { min-height: 196px; padding: 24px 12px; }
.record-list :deep(.state-title) { margin-bottom: 0; color: #888; font-size: var(--type-card-title-size, 16px); font-weight: var(--font-weight-regular, 400); }
.record-list :deep(.illustration) { width: 56px; height: 56px; margin-bottom: 8px; }
.record-list :deep(.app-svg-illustration) { width: 56px; height: 56px; }
.help-list { margin-top: 12px; }
@media screen and (max-width: 360px) {
  .summary-card { align-items: flex-start; flex-direction: column; }
}
@media screen and (min-width: 720px) {
  .invoice-page { max-width: var(--content-max-width, 1120px); }
  .summary-card { padding: 18px 22px; border-radius: var(--radius-feature, 18px); }
  .summary-label { font-size: var(--type-body-small-size, 13px); }
  .summary-amount { font-size: var(--type-display-size, 28px); }
  .summary-status { font-size: var(--type-caption-size, 12px); }
  .summary-actions { gap: 10px; }
  .button { min-height: 40px; padding: 0 18px; font-size: var(--type-body-small-size, 13px); line-height: 38px; }
  .tabs, .record-list, .help-list { width: 100%; margin-right: auto; margin-left: auto; }
  .tabs { margin-top: 16px; }
  .tab-item { padding: 15px 0; font-size: var(--type-label-size, 15px); }
  .record-list { min-height: 240px; margin-top: 8px; }
  .record-list :deep(.state-empty) { min-height: 240px; padding: 28px 20px; }
  .record-list :deep(.illustration), .record-list :deep(.app-svg-illustration) { width: 64px; height: 64px; }
  .record-list :deep(.illustration) { margin-bottom: 10px; }
  .record-list :deep(.state-title) { font-size: var(--type-card-title-size, 16px); }
  .help-list { margin-top: 16px; }
}

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.summary-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
</style>
