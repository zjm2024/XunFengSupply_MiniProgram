﻿﻿﻿﻿<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="发票中心" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 28px">
        <view class="invoice-page">
          <view class="invoice-hero">
            <view class="hero-top">
              <view class="hero-icon"><AppIcon name="invoice" :size="27" color="#D7192D" /></view>
              <text class="readiness-tag">服务准备中</text>
            </view>
            <text class="hero-kicker">BUSINESS INVOICE</text>
            <text class="hero-title">企业采购开票，一处管理</text>
            <text class="hero-desc">后续可按已完成采购订单申请电子发票，并统一维护企业抬头与归档记录。</text>
            <view class="hero-actions">
              <button class="hero-button primary" @tap="viewCompletedOrders">查看已完成订单</button>
              <button class="hero-button ghost" @tap="showPreparing">了解开票说明</button>
            </view>
          </view>

          <view class="capability-grid">
            <view v-for="item in capabilities" :key="item.title" class="capability-card">
              <view class="capability-icon"><AppIcon :name="item.icon" :size="20" /></view>
              <text class="capability-title">{{ item.title }}</text>
              <text class="capability-desc">{{ item.description }}</text>
            </view>
          </view>

          <view class="workspace-card">
            <view class="workspace-head">
              <view>
                <text class="section-title">开票工作台</text>
                <text class="section-desc">抬头与历史记录将在服务开放后同步展示</text>
              </view>
              <text class="workspace-state">即将开放</text>
            </view>

            <view class="segment-control">
              <view class="segment-item" :class="{ active: activeTab === 'title' }" @tap="activeTab = 'title'">发票抬头</view>
              <view class="segment-item" :class="{ active: activeTab === 'record' }" @tap="activeTab = 'record'">开票记录</view>
            </view>

            <view v-if="activeTab === 'title'" class="empty-panel">
              <AppSvgIllustration class="inline-empty-illustration" name="no-revenue" size="sm" />
              <text class="empty-title">企业抬头功能准备中</text>
              <text class="empty-desc">开放后可维护企业名称、税号、开户行和收票信息，并设置默认开票抬头。</text>
              <button class="disabled-action" @tap="showPreparing">新增发票抬头</button>
            </view>

            <view v-else class="empty-panel">
              <AppSvgIllustration class="inline-empty-illustration" name="no-revenue" size="sm" />
              <text class="empty-title">暂无可展示的开票记录</text>
              <text class="empty-desc">发票服务开放后，申请进度、发票号码和电子文件会统一保存在这里。</text>
              <button class="disabled-action" @tap="viewCompletedOrders">查看可关联订单</button>
            </view>
          </view>

          <view class="guide-card">
            <view class="section-heading">
              <text class="section-title">预计开票流程</text>
              <text class="section-desc">所有开票金额以订单实际结算金额为准</text>
            </view>
            <view class="guide-steps">
              <view v-for="(step, index) in guideSteps" :key="step.title" class="guide-step">
                <view class="step-number">{{ String(index + 1).padStart(2, '0') }}</view>
                <view class="step-copy"><text>{{ step.title }}</text><text>{{ step.description }}</text></view>
                <AppIcon v-if="index < guideSteps.length - 1" class="step-arrow" name="chevron-right" :size="16" color="#B1B5BB" />
              </view>
            </view>
          </view>

          <view class="notice-card">
            <AppIcon name="info" :size="18" color="#626A74" />
            <text>当前后端发票服务尚未开放，因此本页不提供不可用的模拟新增、删除或下载操作；接口上线后可直接在此工作台接入。</text>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref } from 'vue'
import { ORDER_STATUS } from '@/app/config/constant.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'

const activeTab = ref('title')
const capabilities = [
  { icon: 'dealer', title: '企业抬头', description: '统一维护企业税务与收票资料' },
  { icon: 'order', title: '订单关联', description: '按已完成采购订单申请开票' },
  { icon: 'download', title: '电子归档', description: '集中下载并留存电子发票' },
]
const guideSteps = [
  { title: '选择订单', description: '选择已完成且符合开票条件的采购订单' },
  { title: '确认抬头', description: '核对企业名称、税号与接收信息' },
  { title: '提交申请', description: '按实际结算金额生成开票申请' },
  { title: '电子归档', description: '开票完成后下载并保存电子文件' },
]

function viewCompletedOrders() {
  navigator.navigateTo(routes.order.list({ status: ORDER_STATUS.COMPLETED }))
}

function showPreparing() {
  uni.showModal({
    title: '发票服务准备中',
    content: '当前系统正在完善企业抬头、订单关联与电子发票归档能力，开放后将在本页面提供完整操作。',
    showCancel: false,
    confirmText: '我知道了',
  })
}
</script>

<style lang="scss" scoped>
.invoice-page { width: 100%; max-width: 1160px; margin: 0 auto; padding-bottom: env(safe-area-inset-bottom); }
.invoice-hero { padding: 20px; border: 1px solid #E5E7EA; border-top: 3px solid #D7192D; border-radius: 20px; color: #20242A; background: #FFF; box-shadow: 0 10px 28px rgba(24,29,36,.05); }
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
.capability-card { min-width: 0; padding: 14px 10px; border: 1px solid #E5E7EA; border-radius: 16px; background: #FFF; box-shadow: 0 8px 22px rgba(24,29,36,.035); text-align: center; }
.capability-icon { display: grid; width: 38px; height: 38px; margin: 0 auto; place-items: center; border-radius: 12px; color: #55616E; background: #EFF2F4; }
.capability-title, .capability-desc { display: block; }
.capability-title { margin-top: 9px; color: #292E35; font-size: 11px; font-weight: 680; }
.capability-desc { display: none; margin-top: 5px; color: #969BA3; font-size: 9px; line-height: 1.45; }
.workspace-card, .guide-card { margin-top: 15px; padding: 17px; border: 1px solid #E5E7EA; border-radius: 19px; background: #FFF; box-shadow: 0 9px 26px rgba(25,30,37,.04); }
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
.notice-card { display: flex; align-items: flex-start; gap: 9px; margin-top: 14px; padding: 13px 14px; border: 1px solid #E5E7EA; border-radius: 14px; color: #707780; background: #F7F8F9; font-size: 9px; line-height: 1.65; }
@media screen and (min-width: 720px) {
  .invoice-hero { padding: 24px; }.capability-grid { gap: 14px; }.capability-card { padding: 17px; text-align: left; }.capability-icon { margin: 0; }.capability-desc { display: block; }
  .workspace-card, .guide-card { padding: 21px; }
  .guide-steps { grid-template-columns: repeat(4,minmax(0,1fr)); gap: 13px; }
  .guide-step { grid-template-columns: 38px minmax(0,1fr) 16px; min-height: 82px; padding-right: 5px; border-right: 1px solid #EEF0F2; border-bottom: 0; }
  .guide-step:last-child { border-right: 0; }.step-arrow { display: block; }
}
</style>
