﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <AppPageShell>
    <template #header>
      <app-header :title="t('account.titles.security')" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <!-- 账户安全状态 -->
          <view class="security-status">
            <view class="status-icon-wrapper" :class="securityLevel">
              <text class="status-icon">{{ securityLevel === 'high' ? '✓' : '!' }}</text>
            </view>
            <text class="status-title">{{ securityTitle }}</text>
            <text class="status-desc">{{ securityDesc }}</text>
          </view>

          <!-- 安全设置项 -->
          <view class="settings-group">
            <text class="group-title">{{ t('account.security.account') }}</text>

            <!-- 修改密码 -->
            <view class="setting-item" @click="changePassword">
              <view class="item-left">
                <text class="item-icon">🔒</text>
                <view class="item-info">
                  <text class="item-name">{{ t('account.security.password') }}</text>
                  <text class="item-desc">{{ t('account.security.passwordHint') }}</text>
                </view>
              </view>
              <text class="item-arrow">›</text>
            </view>

            <!-- 修改支付密码 -->
            <view class="setting-item" @click="changePayPassword">
              <view class="item-left">
                <text class="item-icon">💳</text>
                <view class="item-info">
                  <text class="item-name">{{ t('account.security.payPassword') }}</text>
                  <text class="item-desc">{{ t('account.security.payPasswordHint') }}</text>
                </view>
              </view>
              <text class="item-arrow">›</text>
            </view>

            <!-- 手机绑定 -->
            <view class="setting-item">
              <view class="item-left">
                <text class="item-icon">📱</text>
                <view class="item-info">
                  <text class="item-name">{{ t('account.security.phone') }}</text>
                  <text class="item-desc">{{ t('account.security.boundPhone', { phone: '138****8888' }) }}</text>
                </view>
              </view>
              <button class="item-btn" @click="changePhone">{{ t('account.security.change') }}</button>
            </view>

            <!-- 邮箱绑定 -->
            <view class="setting-item">
              <view class="item-left">
                <text class="item-icon">📧</text>
                <view class="item-info">
                  <text class="item-name">{{ t('account.security.email') }}</text>
                  <text class="item-desc">{{ t('account.security.unbound') }}</text>
                </view>
              </view>
              <button class="item-btn bind" @click="bindEmail">{{ t('account.security.bind') }}</button>
            </view>
          </view>

          <!-- 登录设备管理 -->
          <view class="settings-group">
            <text class="group-title">{{ t('account.security.devices') }}</text>

            <view v-for="device in devices" :key="device.id" class="device-item">
              <view class="device-main">
                <text class="device-icon">{{ device.type === 'phone' ? '📱' : '💻' }}</text>
                <view class="device-info">
                  <text class="device-name">{{ device.name }}</text>
                  <text class="device-detail">{{ device.location }} · {{ device.time }}</text>
                </view>
              </view>
              <view v-if="device.isCurrent" class="current-tag">
                <text>{{ t('account.security.currentDevice') }}</text>
              </view>
              <button
                v-else
                class="remove-btn"
                @click="removeDevice(device)"
              >{{ t('account.security.remove') }}</button>
            </view>
          </view>

          <!-- 其他安全选项 -->
          <view class="settings-group">
            <text class="group-title">{{ t('account.security.other') }}</text>

            <view class="setting-item switch-item">
              <view class="item-left">
                <text class="item-icon">🔔</text>
                <text class="item-name">{{ t('account.security.loginNotify') }}</text>
              </view>
              <switch :checked="loginNotify" @change="loginNotify = $event.detail.value" color="#D7192D" />
            </view>

            <view class="setting-item switch-item">
              <view class="item-left">
                <text class="item-icon">⏱️</text>
                <text class="item-name">{{ t('account.security.autoLogout') }}</text>
              </view>
              <switch :checked="autoLogout" @change="autoLogout = $event.detail.value" color="#D7192D" />
            </view>
          </view>

          <!-- 退出登录按钮 -->
          <button class="logout-btn" @click="handleLogout">{{ t('account.security.logout') }}</button>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import { ref, computed } from 'vue'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'

const loginNotify = ref(true)
const autoLogout = ref(false)

// TODO: 接入后端设备管理接口后替换为 store 数据
const devices = ref([])

// TODO: 接入后端安全等级接口后替换为真实计算逻辑
const securityLevel = computed(() => {
  // 占位逻辑：默认返回中等（待后端契约）
  return 'medium'
})

const securityTitle = computed(() => {
  const titles = { high: t('account.security.account'), medium: t('account.security.suggestion'), low: t('account.security.risk') }
  return titles[securityLevel.value]
})

const securityDesc = computed(() => {
  const descs = {
    high: t('account.security.highDesc'),
    medium: t('account.security.mediumDesc'),
    low: t('account.security.lowDesc')
  }
  return descs[securityLevel.value]
})

/** 显示原有修改登录密码的占位反馈。 */
function changePassword() {
  uni.showToast({ title: t('account.security.passwordPlaceholder'), icon: 'none' })
}

/** 显示原有修改支付密码的占位反馈。 */
function changePayPassword() {
  uni.showToast({ title: t('account.security.payPasswordPlaceholder'), icon: 'none' })
}

/** 显示原有更换手机号码的占位反馈。 */
function changePhone() {
  uni.showToast({ title: t('account.security.phonePlaceholder'), icon: 'none' })
}

/** 显示原有绑定邮箱的占位反馈。 */
function bindEmail() {
  uni.showToast({ title: t('account.security.emailPlaceholder'), icon: 'none' })
}

/** 确认后移除当前页面的设备记录，不改变设备标识。 */
async function removeDevice(device) {
  if (!await openAppDialog({
    confirmText: t('common.confirm'),
    cancelText: t('common.cancel'),
    title: t('account.security.removeConfirm'),
    description: t('account.security.removeContent', { name: device.name }),
  })) return
  devices.value = devices.value.filter(d => d.id !== device.id)
  uni.showToast({ title: t('account.security.removed'), icon: 'success' })
}

/** 保留原有退出占位流程，仅本地化确认与反馈。 */
async function handleLogout() {
  if (!await openAppDialog({
    confirmText: t('common.confirm'),
    cancelText: t('common.cancel'),
    title: t('account.security.logoutConfirm'),
    description: t('account.security.logoutContent'),
  })) return
  uni.showToast({ title: t('account.security.loggedOut'), icon: 'success' })
}
</script>

<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 安全状态 */
.security-status {
  background: var(--glass-card-background, rgba(255,255,255,.74));
  border-radius: 12px;
  padding: 24px 16px;
  text-align: center;
  margin-bottom: 12px;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

.status-icon-wrapper {
  width: 60px; /* 稳定 px */
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;

  &.high {
    background: linear-gradient(135deg, #059669, #10B981);
  }

  &.medium {
    background: linear-gradient(135deg, #F59E0B, #FBBF24);
  }

  &.low {
    background: linear-gradient(135deg, #B42318, #DC2626);
  }
}

.status-icon {
  font-size: 28px; /* 稳定 px */
  color: white;
  font-weight: 700;
}

.status-title {
  font-size: 17px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  display: block;
  margin-bottom: 4px;
}

.status-desc {
  font-size: 13px;
  color: #5E626B;
  display: block;
  line-height: 1.5;
}

/* 设置分组 */
.settings-group {
  background: var(--glass-card-background, rgba(255,255,255,.74));
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

.group-title {
  font-size: 14px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  display: block;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #F5F5F6;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;

  &:not(:last-child) {
    border-bottom: 1px solid #F5F5F6;
  }

  &.switch-item {
    padding: 8px 0;
  }
}

.item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.item-icon {
  font-size: 18px;
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 14px;
  color: #111216;
  display: block;
}

.item-desc {
  font-size: 12px;
  color: #5E626B;
  display: block;
  margin-top: 2px;
}

.item-arrow {
  font-size: 18px;
  color: #989BA5;
}

.item-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px; /* 稳定 px */
  padding: 0 12px;
  background: transparent;
  border: 1px solid #DEDFE3;
  border-radius: 6px;
  font-size: 13px;
  color: #5E626B;

  &.bind {
    background: #D7192D;
    color: white;
    border-color: #D7192D;
  }

  &:active {
    opacity: 0.8;
  }
}

/* 设备列表 */
.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;

  &:not(:last-child) {
    border-bottom: 1px solid #F5F5F6;
  }
}

.device-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.device-icon {
  font-size: 18px;
}

.device-info {
  flex: 1;
}

.device-name {
  font-size: 14px;
  color: #111216;
  display: block;
}

.device-detail {
  font-size: 12px;
  color: #5E626B;
  display: block;
  margin-top: 2px;
}

.current-tag {
  padding: 3px 8px;
  background: #ECFDF5;
  border-radius: 4px;

  text {
    font-size: 11px;
    color: #059669;
  }
}

.remove-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px; /* 稳定 px */
  padding: 0 10px;
  background: transparent;
  border: none;
  color: #B42318;
  font-size: 13px;

  &:active {
    opacity: 0.7;
  }
}

/* 退出按钮 */
.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px; /* 稳定 px */
  margin-top: 16px;
  background: rgba(255,255,255,.68);
  border: 0;
  border-radius: 10px;
  color: #B42318;
  font-size: 15px;
  font-weight: 600;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);

  &:active {
    background: rgba(180, 35, 24, 0.04);
  }
}

.bottom-spacer {
  height: 24px;
}
</style>
