<template>
  <AppPageShell>
    <template #header>
      <app-header title="安全设置" :show-back="true" />
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
            <text class="group-title">账户安全</text>

            <!-- 修改密码 -->
            <view class="setting-item" @click="changePassword">
              <view class="item-left">
                <text class="item-icon">🔒</text>
                <view class="item-info">
                  <text class="item-name">登录密码</text>
                  <text class="item-desc">定期修改密码可以提高账户安全性</text>
                </view>
              </view>
              <text class="item-arrow">›</text>
            </view>

            <!-- 修改支付密码 -->
            <view class="setting-item" @click="changePayPassword">
              <view class="item-left">
                <text class="item-icon">💳</text>
                <view class="item-info">
                  <text class="item-name">支付密码</text>
                  <text class="item-desc">用于确认付款和资金操作</text>
                </view>
              </view>
              <text class="item-arrow">›</text>
            </view>

            <!-- 手机绑定 -->
            <view class="setting-item">
              <view class="item-left">
                <text class="item-icon">📱</text>
                <view class="item-info">
                  <text class="item-name">手机号码</text>
                  <text class="item-desc">已绑定：138****8888</text>
                </view>
              </view>
              <button class="item-btn" @click="changePhone">更换</button>
            </view>

            <!-- 邮箱绑定 -->
            <view class="setting-item">
              <view class="item-left">
                <text class="item-icon">📧</text>
                <view class="item-info">
                  <text class="item-name">邮箱地址</text>
                  <text class="item-desc">未绑定</text>
                </view>
              </view>
              <button class="item-btn bind" @click="bindEmail">绑定</button>
            </view>
          </view>

          <!-- 登录设备管理 -->
          <view class="settings-group">
            <text class="group-title">登录设备</text>

            <view v-for="device in devices" :key="device.id" class="device-item">
              <view class="device-main">
                <text class="device-icon">{{ device.type === 'phone' ? '📱' : '💻' }}</text>
                <view class="device-info">
                  <text class="device-name">{{ device.name }}</text>
                  <text class="device-detail">{{ device.location }} · {{ device.time }}</text>
                </view>
              </view>
              <view v-if="device.isCurrent" class="current-tag">
                <text>当前设备</text>
              </view>
              <button
                v-else
                class="remove-btn"
                @click="removeDevice(device)"
              >移除</button>
            </view>
          </view>

          <!-- 其他安全选项 -->
          <view class="settings-group">
            <text class="group-title">其他设置</text>

            <view class="setting-item switch-item">
              <view class="item-left">
                <text class="item-icon">🔔</text>
                <text class="item-name">登录通知</text>
              </view>
              <switch :checked="loginNotify" @change="loginNotify = $event.detail.value" color="#D7192D" />
            </view>

            <view class="setting-item switch-item">
              <view class="item-left">
                <text class="item-icon">⏱️</text>
                <text class="item-name">自动退出</text>
              </view>
              <switch :checked="autoLogout" @change="autoLogout = $event.detail.value" color="#D7192D" />
            </view>
          </view>

          <!-- 退出登录按钮 -->
          <button class="logout-btn" @click="handleLogout">退出登录</button>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import appHeader from '@/components/AppHeader/AppHeader.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppContent from '@/components/AppContent/AppContent.vue'

const loginNotify = ref(true)
const autoLogout = ref(false)

// Mock 设备数据
const devices = ref([
  {
    id: '1',
    type: 'phone',
    name: 'iPhone 15 Pro',
    location: '广东广州',
    time: '当前在线',
    isCurrent: true
  },
  {
    id: '2',
    type: 'pc',
    name: 'Chrome 浏览器',
    location: '广东深圳',
    time: '2026-08-09 14:30',
    isCurrent: false
  }
])

// 安全等级计算
const securityLevel = computed(() => {
  let score = 0
  if (true) score++ // 有密码
  if (false) score++ // 无支付密码扣分
  score++ // 已绑定手机

  return score >= 3 ? 'high' : score >= 2 ? 'medium' : 'low'
})

const securityTitle = computed(() => {
  const titles = { high: '账户安全', medium: '安全建议', low: '存在风险' }
  return titles[securityLevel.value]
})

const securityDesc = computed(() => {
  const descs = {
    high: '您的账户安全设置完善，请继续保持良好的安全习惯。',
    medium: '建议您完善安全设置，以提高账户安全性。',
    low: '您的账户存在安全隐患，建议立即进行安全检查。'
  }
  return descs[securityLevel.value]
})

function changePassword() {
  uni.showToast({ title: '跳转至修改密码', icon: 'none' })
}

function changePayPassword() {
  uni.showToast({ title: '跳转至修改支付密码', icon: 'none' })
}

function changePhone() {
  uni.showToast({ title: '跳转至更换手机号', icon: 'none' })
}

function bindEmail() {
  uni.showToast({ title: '跳转至绑定邮箱', icon: 'none' })
}

function removeDevice(device) {
  uni.showModal({
    title: '确认移除',
    content: `确定要移除 ${device.name} 的登录状态吗？`,
    success: (res) => {
      if (res.confirm) {
        devices.value = devices.value.filter(d => d.id !== device.id)
        uni.showToast({ title: '已移除', icon: 'success' })
      }
    }
  })
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出当前账户吗？',
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '已退出登录', icon: 'success' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 安全状态 */
.security-status {
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  padding: 24px 16px;
  text-align: center;
  margin-bottom: 12px;
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
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
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
  width: 100%;
  height: 48px; /* 稳定 px */
  margin-top: 16px;
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 10px;
  color: #B42318;
  font-size: 15px;
  font-weight: 600;

  &:active {
    background: rgba(180, 35, 24, 0.04);
  }
}

.bottom-spacer {
  height: 24px;
}
</style>
