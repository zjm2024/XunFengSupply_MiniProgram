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
              label="消息通知"
              description="管理订单、审核、账单和公告提醒"
              icon="bell"
              @tap="goToNotificationSettings"
            />
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

          <AppListGroup title="通用设置">
            <AppListItem
              label="清除缓存"
              description="清理图片、资讯附件和搜索历史等临时数据"
              :value="cacheSummary.label"
              icon="trash"
              @tap="handleClearCache"
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
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppListGroup from '@/shared/ui/AppListGroup/AppListGroup.vue'
import AppListItem from '@/shared/ui/AppListItem/AppListItem.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { clearAppCache, getCacheSummary } from '@/shared/utils/cacheManager.js'

const userStore = useUserStore()
const cacheSummary = ref(getCacheSummary())

onShow(() => {
  cacheSummary.value = getCacheSummary()
})

function goToProfile() {
  navigator.navigateTo(routes.account.profile())
}

function goToSecurity() {
  navigator.navigateTo(routes.account.security())
}

function goToNotificationSettings() {
  navigator.navigateTo(routes.account.notificationSettings())
}

function goToHelp() {
  navigator.navigateTo(routes.content.help())
}

function goToAbout() {
  navigator.navigateTo(routes.content.about())
}

function handleClearCache() {
  uni.showModal({
    title: '清除缓存',
    content: '将清理图片、资讯附件和搜索历史等临时数据，不会退出登录，也不会删除购物车、待付款订单和通知设置。确定继续吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await clearAppCache()
        cacheSummary.value = getCacheSummary()
        uni.showToast({ title: '缓存已清除', icon: 'success' })
      } catch (error) {
        console.error('[Settings] 清除缓存失败:', error)
        uni.showToast({ title: '清除失败，请稍后重试', icon: 'none' })
      }
    },
  })
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
