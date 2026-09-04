<template>
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
          <view class="account-card">
            <view class="account-head">
              <view class="account-info">
                <text class="account-name">{{ dealerName }}</text>
                <text class="account-code">客户编号 {{ dealerCode }}</text>
              </view>
              <status-tag-new type="success" text="账号正常" />
            </view>

            <text class="account-meta">{{ dealerLevel }} · {{ accountType }}</text>

            <view class="account-metrics">
              <view class="metric-item">
                <text class="metric-label">可用授信</text>
                <text class="metric-value">¥{{ formatMoney(creditLimit) }}</text>
              </view>
              <view class="metric-item">
                <text class="metric-label">账户余额</text>
                <text class="metric-value">¥{{ formatMoney(balance) }}</text>
              </view>
            </view>

            <button class="profile-btn" @click="goToProfile">
              <text>账户资料</text>
              <text class="btn-arrow">→</text>
            </button>
          </view>

          <!-- 服务分组列表 -->
          <view class="service-groups">
            <!-- 订单与资金 -->
            <view class="service-card">
              <text class="group-title">订单与资金</text>

              <button class="service-item" @click="goToOrders">
                <view class="service-icon"><text>订</text></view>
                <text class="service-label">订单中心</text>
                <text class="service-hint">3 个待处理</text>
                <text class="item-arrow">→</text>
              </button>

              <button class="service-item" @click="goToRecharge">
                <view class="service-icon"><text>充</text></view>
                <text class="service-label">充值中心</text>
                <text class="item-arrow">→</text>
              </button>

              <button class="service-item" @click="goToBill">
                <view class="service-icon"><text>账</text></view>
                <text class="service-label">对账账单</text>
                <text class="service-hint">08/25 到期</text>
                <text class="item-arrow">→</text>
              </button>

              <button class="service-item" @click="goToFundFlow">
                <view class="service-icon"><text>流</text></view>
                <text class="service-label">资金流水</text>
                <text class="item-arrow">→</text>
              </button>
            </view>

            <!-- 服务与凭证 -->
            <view class="service-card">
              <text class="group-title">服务与凭证</text>

              <button class="service-item" @click="goToAfterSales">
                <view class="service-icon"><text>售</text></view>
                <text class="service-label">售后服务</text>
                <text class="item-arrow">→</text>
              </button>

              <button class="service-item" @click="goToInvoice">
                <view class="service-icon"><text>票</text></view>
                <text class="service-label">发票中心</text>
                <text class="item-arrow">→</text>
              </button>

              <button class="service-item" @click="goToAddress">
                <view class="service-icon"><text>址</text></view>
                <text class="service-label">收货地址</text>
                <text class="item-arrow">→</text>
              </button>

              <button class="service-item" @click="goToVoucher">
                <view class="service-icon"><text>凭</text></view>
                <text class="service-label">对公凭证</text>
                <text class="item-arrow">→</text>
              </button>
            </view>

            <!-- 账号与系统 -->
            <view class="service-card">
              <text class="group-title">账号与系统</text>

              <button class="service-item" @click="goToMessages">
                <view class="service-icon"><text>信</text></view>
                <text class="service-label">消息中心</text>
                <text class="service-hint">4 条未读</text>
                <text class="item-arrow">→</text>
              </button>

              <button class="service-item" @click="goToSubAccount">
                <view class="service-icon"><text>子</text></view>
                <text class="service-label">子账号管理</text>
                <text class="item-arrow">→</text>
              </button>

              <button class="service-item" @click="goToSecurity">
                <view class="service-icon"><text>安</text></view>
                <text class="service-label">安全设置</text>
                <text class="item-arrow">→</text>
              </button>

              <button class="service-item" @click="goToLanguage">
                <view class="service-icon"><text>言</text></view>
                <text class="service-label">语言设置</text>
                <text class="item-arrow">→</text>
              </button>
            </view>

            <!-- 系统服务 -->
            <view class="service-card">
              <text class="group-title">系统服务</text>

              <button class="service-item" @click="goToHelp">
                <view class="service-icon"><text>帮</text></view>
                <text class="service-label">帮助中心</text>
                <text class="item-arrow">→</text>
              </button>

              <button class="service-item" @click="goToAbout">
                <view class="service-icon"><text>关</text></view>
                <text class="service-label">关于薰风</text>
                <text class="item-arrow">→</text>
              </button>

              <button class="service-item is-danger" @click="handleLogout">
                <view class="service-icon danger"><text>退</text></view>
                <text class="service-label danger-text">退出登录</text>
                <text class="item-arrow">→</text>
              </button>
            </view>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/store/modules/user.js'
import statusTagNew from '@/components/StatusTag/StatusTag.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import appHeader from '@/components/AppHeader/AppHeader.vue'
import AppContent from '@/components/AppContent/AppContent.vue'
import { safeNavigateTo, safeReLaunch } from '@/utils/routeGuard.js'

const userStore = useUserStore()

// Mock 数据
const dealerName = ref('华东体育用品经销商')
const dealerCode = ref('XF-310082')
const dealerLevel = ref('B 类客户')
const accountType = ref('主账号')
const creditLimit = ref(168000)
const balance = ref(26800)

function formatMoney(value) {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 页面导航方法 - 使用统一导航
function goToMessages() { safeNavigateTo('/pages/message/index') }
function goToProfile() { safeNavigateTo('/pages/account/profile') }
function goToOrders() { safeNavigateTo('/pages/order/index') }
function goToRecharge() { safeNavigateTo('/pages/recharge/index') }
function goToBill() { safeNavigateTo('/pages/bill/index') }
function goToFundFlow() { safeNavigateTo('/pages/fund-flow/index') }
function goToAfterSales() { safeNavigateTo('/pages/aftersales/index') }
function goToInvoice() { safeNavigateTo('/pages/invoice/index') }
function goToAddress() { safeNavigateTo('/pages/address/index') }
function goToVoucher() { safeNavigateTo('/pages/voucher/index') }
function goToSubAccount() { safeNavigateTo('/pages/sub-account/index') }
function goToSecurity() { safeNavigateTo('/pages/security/index') }
function goToLanguage() { safeNavigateTo('/pages/language/index') }
function goToHelp() { safeNavigateTo('/pages/help/index') }
function goToAbout() { safeNavigateTo('/pages/about/index') }

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出当前账号吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout().then(() => {
          safeReLaunch('/subPackages/authSub/login')
        })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.center-content {
  padding-bottom: env(safe-area-inset-bottom);
}

/* ========== 账户卡片 ========== */
.account-card {
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 16px;
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
  color: #111216;
  display: block;
  margin-bottom: 3px;
}

.account-code {
  color: #5E626B;
  font-size: 13px; /* 稳定 px */
  display: block;
}

.account-meta {
  display: block;
  color: #5E626B;
  font-size: 13px;
  margin-top: 7px;
}

.account-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: #F7F7F8;
  margin: 16px 0 8px;
  border-radius: 6px;
  overflow: hidden;
}

.metric-item {
  background: white;
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
  color: #5E626B;
  font-size: 12px; /* 稳定 px */
}

.metric-value {
  display: block;
  margin-top: 3px;
  font-size: 20px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  font-variant-numeric: tabular-nums;
}

.profile-btn {
  width: 100%;
  min-height: 42px; /* 稳定 px */
  border: none;
  border-top: 1px solid #EFEFF1;
  background: white;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0 0;
  font-size: 14px;
  color: #5E626B;

  &:active {
    opacity: 0.7;
  }
}

.btn-arrow {
  color: #989BA3;
}

/* ========== 服务分组 ========== */
.service-groups {
  display: grid;
  gap: 12px;
}

.service-card {
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 12px;
  overflow: hidden;
  padding-top: 10px;
}

.group-title {
  font-size: 13px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  margin: 0 14px 8px;
  display: block;
}

.service-item {
  width: 100%;
  min-height: 54px; /* 稳定 px */
  display: grid;
  grid-template-columns: 28px 1fr auto 18px;
  align-items: center;
  gap: 8px;
  text-align: left;
  border: none;
  border-top: 1px solid #EFEFF1;
  background: white;
  padding: 0 14px;

  &:active {
    background: #FCFCFD;
  }

  &.is-danger {
    .danger-text {
      color: #B42318;
    }
  }
}

.service-icon {
  width: 24px;
  height: 24px;
  border: 1px solid #DEDFE3;
  border-radius: 7px;
  display: grid;
  place-items: center;
  color: #5E626B;
  font-size: 11px; /* 稳定 px */
  font-weight: 600;

  &.danger {
    border-color: #FDECEA;
    background: #FDECEA;
    color: #B42318;
  }
}

.service-label {
  font-size: 15px; /* 稳定 px */
  color: #111216;
}

.service-hint {
  color: #989BA3;
  font-size: 12px; /* 稳定 px */
  font-weight: 400;
}

.item-arrow {
  color: #989BA3;
  font-style: normal;
  text-align: right;
}
</style>
