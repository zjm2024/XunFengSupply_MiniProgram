﻿﻿﻿﻿<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('account.titles.invoice')" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 28px">
        <view class="invoice-page">
          <view class="invoice-hero">
            <view class="hero-top">
              <view class="hero-icon"><AppIcon name="invoice" :size="27" color="#D7192D" /></view>
              <text class="readiness-tag">{{ t('account.invoice.preparing') }}</text>
            </view>
            <text class="hero-kicker">{{ t('account.invoice.kicker') }}</text>
            <text class="hero-title">{{ t('account.invoice.hero') }}</text>
            <text class="hero-desc">{{ t('account.invoice.heroHint') }}</text>
            <view class="hero-actions">
              <button class="hero-button primary" @tap="viewCompletedOrders">{{ t('account.invoice.viewCompleted') }}</button>
              <button class="hero-button ghost" @tap="showPreparing">{{ t('account.invoice.instructions') }}</button>
            </view>
          </view>

          <view class="capability-grid">
            <view v-for="item in capabilities" :key="item.icon" class="capability-card">
              <view class="capability-icon"><AppIcon :name="item.icon" :size="20" /></view>
              <text class="capability-title">{{ item.title }}</text>
              <text class="capability-desc">{{ item.description }}</text>
            </view>
          </view>

          <view class="workspace-card">
            <view class="workspace-head">
              <view>
                <text class="section-title">{{ t('account.invoice.workspace') }}</text>
                <text class="section-desc">{{ t('account.invoice.workspaceHint') }}</text>
              </view>
              <text class="workspace-state">{{ t('account.invoice.coming') }}</text>
            </view>

            <view class="segment-control">
              <view class="segment-item" :class="{ active: activeTab === 'title' }" @tap="activeTab = 'title'">{{ t('account.invoice.titles') }}</view>
              <view class="segment-item" :class="{ active: activeTab === 'record' }" @tap="activeTab = 'record'">{{ t('account.invoice.records') }}</view>
            </view>

            <view v-if="activeTab === 'title'" class="empty-panel">
              <AppSvgIllustration class="inline-empty-illustration" name="no-revenue" size="sm" />
              <text class="empty-title">{{ t('account.invoice.titlePreparing') }}</text>
              <text class="empty-desc">{{ t('account.invoice.titleHint') }}</text>
              <button class="disabled-action" @tap="showPreparing">{{ t('account.invoice.addTitle') }}</button>
            </view>

            <view v-else class="empty-panel">
              <AppSvgIllustration class="inline-empty-illustration" name="no-revenue" size="sm" />
              <text class="empty-title">{{ t('account.invoice.emptyRecords') }}</text>
              <text class="empty-desc">{{ t('account.invoice.recordsHint') }}</text>
              <button class="disabled-action" @tap="viewCompletedOrders">{{ t('account.invoice.viewRelated') }}</button>
            </view>
          </view>

          <view class="guide-card">
            <view class="section-heading">
              <text class="section-title">{{ t('account.invoice.expectedProcess') }}</text>
              <text class="section-desc">{{ t('account.invoice.amountHint') }}</text>
            </view>
            <view class="guide-steps">
              <view v-for="(step, index) in guideSteps" :key="index" class="guide-step">
                <view class="step-number">{{ String(index + 1).padStart(2, '0') }}</view>
                <view class="step-copy"><text>{{ step.title }}</text><text>{{ step.description }}</text></view>
                <AppIcon v-if="index < guideSteps.length - 1" class="step-arrow" name="chevron-right" :size="16" color="#B1B5BB" />
              </view>
            </view>
          </view>

          <view class="notice-card">
            <AppIcon name="info" :size="18" color="#626A74" />
            <text>{{ t('account.invoice.contactHint') }}</text>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import { computed, ref } from 'vue'
import { ORDER_STATUS } from '@/app/config/constant.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'

const activeTab = ref('title')
const capabilities = computed(() => [
  { icon: 'dealer', title: t('account.invoice.companyTitle'), description: t('account.invoice.companyTitleHint') },
  { icon: 'order', title: t('account.invoice.linkOrders'), description: t('account.invoice.linkOrdersHint') },
  { icon: 'download', title: t('account.invoice.archive'), description: t('account.invoice.archiveHint') },
])
const guideSteps = computed(() => [
  { title: t('account.invoice.selectOrder'), description: t('account.invoice.selectOrderHint') },
  { title: t('account.invoice.confirmTitle'), description: t('account.invoice.confirmTitleHint') },
  { title: t('account.invoice.submit'), description: t('account.invoice.submitHint') },
  { title: t('account.invoice.archive'), description: t('account.invoice.archiveStepHint') },
])

function viewCompletedOrders() {
  navigator.navigateTo(routes.order.list({ status: ORDER_STATUS.COMPLETED }))
}

/** 保留服务准备中的原提示及按钮，不新增开票写入。 */
function showPreparing() {
  openAppDialog({
    title: t('account.invoice.modalTitle'),
    description: t('account.invoice.modalContent'),
    showCancel: false,
    confirmText: t('account.invoice.gotIt'),
  })
}
</script>

<style lang="scss" scoped>
.invoice-page { width: 100%; max-width: 1160px; margin: 0 auto; padding-bottom: env(safe-area-inset-bottom); }
.invoice-hero { padding: 20px; border-top: 3px solid #D7192D; border-radius: 20px; color: #20242A; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.hero-top { display: flex; align-items: center; justify-content: space-between; }
.hero-icon { display: grid; width: 48px; height: 48px; place-items: center; color: #D7192D; }
.readiness-tag { padding: 6px 9px; border: 1px solid #F1D8DB; border-radius: 999px; color: #A82A37; background: #FFF7F8; font-size: 9px; }
.hero-kicker, .hero-title, .hero-desc { display: block; }
.hero-kicker { margin-top: 17px; color: #D7192D; font-size: 8px; font-weight: 720; letter-spacing: 1.8px; }
.hero-title { margin-top: 7px; font-size: 21px; font-weight: 750; }
.hero-desc { max-width: 620px; margin-top: 8px; color: #858B94; font-size: 10px; line-height: 1.65; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 19px; }
.hero-button { display: inline-flex; width: auto; height: 38px; align-items: center; justify-content: center; margin: 0; padding: 0 16px; border-radius: 11px; font-size: 11px; line-height: 1; }
.hero-button::after { border: 0; }
.hero-button.primary { border: 1px solid #D7192D; color: #FFF; background: #D7192D; }
.hero-button.ghost { border: 1px solid #E6BCC1; color: #A82734; background: #FFF; }
.capability-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 9px; margin-top: 13px; }
.capability-card { min-width: 0; padding: 14px 10px; border-radius: 16px; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); text-align: center; }
.capability-icon { display: grid; width: 38px; height: 38px; margin: 0 auto; place-items: center; border-radius: 12px; color: #55616E; background: #EFF2F4; }
.capability-title, .capability-desc { display: block; }
.capability-title { margin-top: 9px; color: #292E35; font-size: 11px; font-weight: 680; }
.capability-desc { display: none; margin-top: 5px; color: #969BA3; font-size: 9px; line-height: 1.45; }
.workspace-card, .guide-card { margin-top: 15px; padding: 17px; border-radius: 19px; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.workspace-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.section-title, .section-desc { display: block; }
.section-title { color: #22262C; font-size: 16px; font-weight: 730; }
.section-desc { margin-top: 5px; color: #989DA5; font-size: 9px; line-height: 1.5; }
.workspace-state { flex: none; padding: 5px 8px; border-radius: 999px; color: #646C76; background: #EFF1F3; font-size: 9px; }
.segment-control { display: grid; grid-template-columns: repeat(2,1fr); gap: 5px; margin-top: 16px; padding: 4px; border-radius: 12px; background: #F0F2F4; }
.segment-item { display: flex; height: 35px; align-items: center; justify-content: center; border-radius: 9px; color: #777E87; font-size: 11px; }
.segment-item.active { color: #262B32; background: #FFF; box-shadow: 0 3px 9px rgba(27,32,39,.07); font-weight: 660; }
.empty-panel { display: flex; min-height: 235px; flex-direction: column; align-items: center; justify-content: center; padding: 22px 12px 8px; text-align: center; }
.inline-empty-illustration { width: 132px; height: 132px; }
.empty-title, .empty-desc { display: block; }
.empty-title { margin-top: 14px; color: #292E35; font-size: 14px; font-weight: 690; }
.empty-desc { max-width: 430px; margin-top: 7px; color: #969BA3; font-size: 10px; line-height: 1.65; }
.disabled-action { display: inline-flex; width: auto; height: 36px; align-items: center; justify-content: center; margin: 16px 0 0; padding: 0 16px; border: 1px solid #DDE0E3; border-radius: 11px; color: #555D67; background: #FFF; font-size: 11px; line-height: 1; }
.disabled-action::after { border: 0; }
.section-heading { margin-bottom: 15px; }
.guide-steps { display: grid; grid-template-columns: 1fr; }
.guide-step { position: relative; display: grid; grid-template-columns: 38px minmax(0,1fr); align-items: center; gap: 11px; min-height: 65px; border-bottom: 1px solid #EEF0F2; }
.guide-step:last-child { border-bottom: 0; }
.step-number { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 11px; color: #555F6B; background: #EFF2F4; font-size: 9px; font-weight: 720; }
.step-copy text { display: block; }.step-copy text:first-child { color: #2A2F36; font-size: 12px; font-weight: 660; }.step-copy text:last-child { margin-top: 4px; color: #969BA3; font-size: 9px; line-height: 1.45; }
.step-arrow { display: none; }
.notice-card { display: flex; align-items: flex-start; gap: 9px; margin-top: 14px; padding: 13px 14px; border-radius: 14px; color: #707780; background: rgba(255,255,255,.56); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); font-size: 9px; line-height: 1.65; }
@media screen and (min-width: 720px) {
  .invoice-hero { padding: 24px; }.capability-grid { gap: 14px; }.capability-card { padding: 17px; text-align: left; }.capability-icon { margin: 0; }.capability-desc { display: block; }
  .workspace-card, .guide-card { padding: 21px; }
  .guide-steps { grid-template-columns: repeat(4,minmax(0,1fr)); gap: 13px; }
  .guide-step { grid-template-columns: 38px minmax(0,1fr) 16px; min-height: 82px; padding-right: 5px; border-right: 1px solid #EEF0F2; border-bottom: 0; }
  .guide-step:last-child { border-right: 0; }.step-arrow { display: block; }
}
</style>
