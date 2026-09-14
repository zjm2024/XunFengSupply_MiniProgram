<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="设置" :show-back="true" :show-shadow="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="settings-content">
          <AppListGroup title="账户与安全" description="核心设置">
            <AppListItem
              label="账户资料"
              description="查看和维护当前账户信息"
              icon="user"
              @tap="goToProfile"
            />
            <AppListItem
              label="安全设置"
              description="登录密码与账户安全"
              icon="shield"
              @tap="goToSecurity"
            />
          </AppListGroup>

          <AppListGroup title="支持与信息">
            <AppListItem
              label="帮助中心"
              description="采购、支付与售后常见问题"
              icon="help"
              @tap="goToHelp"
            />
            <AppListItem
              label="关于我们"
              value="V 1.0.0"
              icon="info"
              @tap="goToAbout"
            />
          </AppListGroup>

          <!-- 退出登录 -->
          <view class="logout-wrap">
            <button class="logout-btn" @tap="handleLogout">退出登录</button>
          </view>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppListGroup from '@/shared/ui/AppListGroup/AppListGroup.vue'
import AppListItem from '@/shared/ui/AppListItem/AppListItem.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useUserStore } from '@/shared/session/userStore.js'

const userStore = useUserStore()

function goToProfile() {
  navigator.navigateTo(routes.account.profile())
}

function goToSecurity() {
  navigator.navigateTo(routes.account.security())
}

function goToHelp() {
  navigator.navigateTo(routes.content.help())
}

function goToAbout() {
  navigator.navigateTo(routes.content.about())
}

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
.settings-content {
  display: grid;
  gap: 18px;
  padding-top: 10px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.logout-wrap {
  margin-top: 4px;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  background: var(--surface-card, #FFFFFF);
  border: 1px solid var(--divider-color, #ECEEF2);
  border-radius: 14px;
  color: var(--danger-color, #B42318);
  font-size: 15px;
  font-weight: 600;
}

.logout-btn:active {
  opacity: 0.65;
}

.bottom-spacer {
  height: 24px;
}
</style>
