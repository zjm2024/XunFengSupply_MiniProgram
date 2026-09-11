﻿<template>
  <AppPageShell>
    <template #header>
      <app-header
        title="经销商中心"
        :show-back="true"
        :show-message="true"
        :unread-count="4"
        @message="goToMessages"
      />
    </template>

    <template #content>
      <AppContent>
        <view class="center-content">
          <!-- 账户概览卡片 -->
          <AppCard class="account-card" padding="lg">
            <view class="account-head">
              <view class="account-info">
                <text class="account-name">{{ dealerName }}</text>
                <text class="account-code">客户编号 {{ dealerCode }}</text>
              </view>
            <status-tag-new
              :type="userStore.isAccountNormal ? 'success' : 'danger'"
              :text="userStore.isAccountNormal ? '账号正常' : '账号冻结'"
            />
            </view>

            <text class="account-meta">{{ dealerLevel }} · {{ accountType }}</text>

            <view class="account-metrics">
              <view class="metric-item">
                <text class="metric-label">主体可用授信</text>
                <text class="metric-value">¥{{ formatMoney(finance.credit.availableAmount) }}</text>
              </view>
              <view class="metric-item">
                <text class="metric-label">主体可用余额</text>
                <text class="metric-value">¥{{ formatMoney(finance.subjectAvailableBalance) }}</text>
              </view>
              <view class="metric-item">
                <text class="metric-label">当前账户可用</text>
                <text class="metric-value">¥{{ formatMoney(finance.currentAccount?.availableBalance || 0) }}</text>
              </view>
              <view class="metric-item">
                <text class="metric-label">当前账户冻结</text>
                <text class="metric-value">¥{{ formatMoney(finance.currentAccount?.frozenBalance || 0) }}</text>
              </view>
            </view>

            <view class="credit-summary">
              <text>授信总额 ¥{{ formatMoney(finance.credit.totalAmount) }}</text>
              <text>已用 ¥{{ formatMoney(finance.credit.usedAmount) }}</text>
              <text>冻结 ¥{{ formatMoney(finance.credit.frozenAmount) }}</text>
            </view>

            <view class="profile-btn" hover-class="profile-btn-pressed" @tap="goToProfile">
              <view class="profile-label">
                <AppIcon name="user" :size="20" :stroke-width="1.8" />
                <text>账户资料</text>
              </view>
              <AppIcon name="chevron-right" :size="20" color="var(--icon-muted)" />
            </view>
          </AppCard>

          <!-- 服务分组列表 -->
          <view class="service-groups">
            <AppListGroup v-for="group in serviceGroups" :key="group.title" :title="group.title">
              <AppListItem
                v-for="item in group.items"
                :key="item.label"
                :label="item.label"
                :value="item.value || ''"
                :icon="item.icon"
                :danger="item.danger || false"
                @tap="item.action"
              />
            </AppListGroup>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '@/shared/session/userStore.js'
import statusTagNew from '@/shared/ui/StatusTag/StatusTag.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppCard from '@/shared/ui/AppCard/AppCard.vue'
import AppListGroup from '@/shared/ui/AppListGroup/AppListGroup.vue'
import AppListItem from '@/shared/ui/AppListItem/AppListItem.vue'
import AppIcon from '../../../../shared/ui/AppIcon/AppIcon.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { getDealerFinanceContext } from '@/shared/api/dealerFinance.js'

const userStore = useUserStore()

const finance = ref(userStore.financeContext)
const dealerName = computed(() => userStore.displayName)
const dealerCode = computed(() => userStore.dealerId || userStore.userId || '-')
const dealerLevel = computed(() => userStore.creditLevel || '经销商账户')
const accountType = computed(() => userStore.isMainAccount ? '主账号' : '子账号')

onMounted(async () => {
  try {
    const context = await getDealerFinanceContext()
    finance.value = context
    userStore.updateFinanceContext(context)
  } catch (error) {
    console.error('[AccountCenter] 加载财务上下文失败:', error)
  }
})

function formatMoney(value) {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 页面导航方法 - 使用 routes 工厂模式
function goToMessages() { navigator.navigateTo(routes.content.messages()) }
function goToProfile() { navigator.navigateTo(routes.account.profile()) }
function goToOrders() { navigator.navigateTo(routes.order.list()) }
function goToRecharge() { navigator.navigateTo(routes.account.recharge()) }
function goToBill() { navigator.navigateTo(routes.account.billList()) }
function goToFundFlow() { navigator.navigateTo(routes.account.fundFlow()) }
function goToAfterSales() { navigator.navigateTo(routes.order.afterSaleList()) }
function goToInvoice() { navigator.navigateTo(routes.account.invoice()) }
function goToAddress() { navigator.navigateTo(routes.account.address()) }
function goToVoucher() { navigator.navigateTo(routes.account.voucher()) }
function goToSubAccount() { navigator.navigateTo(routes.account.subAccount()) }
function goToSecurity() { navigator.navigateTo(routes.account.security()) }
function goToLanguage() { navigator.navigateTo(routes.account.language()) }
function goToHelp() { navigator.navigateTo(routes.content.help()) }
function goToAbout() { navigator.navigateTo(routes.content.about()) }

const serviceGroups = [
  {
    title: '订单与资金',
    items: [
      { label: '订单中心', icon: 'order', value: '3 个待处理', action: goToOrders },
      { label: '充值中心', icon: 'wallet', action: goToRecharge },
      { label: '对账账单', icon: 'receipt', value: '08/25 到期', action: goToBill },
      { label: '资金流水', icon: 'history', action: goToFundFlow },
    ],
  },
  {
    title: '服务与凭证',
    items: [
      { label: '售后服务', icon: 'service', action: goToAfterSales },
      { label: '发票中心', icon: 'invoice', action: goToInvoice },
      { label: '收货地址', icon: 'map-pin', action: goToAddress },
      { label: '对公凭证', icon: 'upload', action: goToVoucher },
    ],
  },
  {
    title: '账号与消息',
    items: [
      { label: '消息中心', icon: 'message', value: '4 条未读', action: goToMessages },
      { label: '子账号管理', icon: 'users', action: goToSubAccount },
      { label: '安全设置', icon: 'shield', action: goToSecurity },
      { label: '语言设置', icon: 'globe', action: goToLanguage },
    ],
  },
  {
    title: '系统服务',
    items: [
      { label: '帮助中心', icon: 'help', action: goToHelp },
      { label: '关于薰风', icon: 'info', action: goToAbout },
      { label: '退出登录', icon: 'logout', danger: true, action: handleLogout },
    ],
  },
]

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出当前账号吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout().then(() => {
          navigator.reLaunch(routes.auth.login())
        })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.center-content {
  padding-top: 12px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

/* ========== 账户卡片 ========== */
.account-card {
  margin-bottom: 20px;
}

.account-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
}

.account-info {
  flex: 1;
}

.account-name {
  font-size: 18px; /* 稳定 px */
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  margin-bottom: 3px;
}

.account-code {
  color: var(--text-secondary);
  font-size: 13px; /* 稳定 px */
  display: block;
}

.account-meta {
  display: block;
  color: var(--text-secondary);
  font-size: 13px;
  margin-top: 7px;
}

.account-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--divider-color);
  margin: 16px 0 8px;
  border-radius: var(--radius-control);
  overflow: hidden;
}

.metric-item {
  background: var(--surface-subtle);
  padding: 12px 0;
  text-align: center;

  &:nth-child(2) {
    padding-left: 16px;
  }

  &:first-child {
    padding-right: 16px;
  }
}

.metric-label {
  display: block;
  color: var(--text-secondary);
  font-size: 12px; /* 稳定 px */
}

.metric-value {
  display: block;
  margin-top: 3px;
  font-size: 20px; /* 稳定 px */
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.credit-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 8px 0 12px;
  color: var(--text-secondary);
  font-size: 12px;
}

.profile-btn {
  min-height: 48px;
  margin-top: 8px;
  border-top: 1px solid var(--divider-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  color: var(--text-secondary);
}

.profile-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--font-size-md);
}

.profile-btn-pressed { opacity: 0.65; }

/* ========== 服务分组 ========== */
.service-groups {
  display: grid;
  gap: 20px;
}

@media screen and (min-width: 600px) {
  .service-groups {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media screen and (min-width: 840px) {
  .center-content {
    display: grid;
    grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
    align-items: start;
    gap: 24px;
    padding-top: 20px;
  }

  .account-card {
    position: sticky;
    top: 0;
    margin-bottom: 0;
  }
}
</style>
