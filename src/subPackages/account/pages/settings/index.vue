<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="设置" :show-back="true" :show-shadow="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="settings-content">
          <!-- 账户设置 -->
          <AppListGroup title="账户设置">
            <AppListItem
              label="账户资料"
              icon="user"
              @tap="goToProfile"
            />
            <AppListItem
              label="安全设置"
              icon="shield"
              @tap="goToSecurity"
            />
            <AppListItem
              label="收货地址"
              icon="map-pin"
              @tap="goToAddress"
            />
            <AppListItem
              label="子账号管理"
              icon="users"
              @tap="goToSubAccount"
            />
          </AppListGroup>

          <!-- 应用设置 -->
          <AppListGroup title="应用设置">
            <AppListItem
              label="语言设置"
              value="简体中文"
              icon="globe"
              @tap="goToLanguage"
            />
            <AppListItem
              label="消息通知"
              icon="bell"
              :show-arrow="false"
            >
              <template #action>
                <switch
                  :checked="notifyEnabled"
                  color="#D7192D"
                  @change="toggleNotify"
                />
              </template>
            </AppListItem>
            <AppListItem
              label="深色模式"
              icon="moon"
              :show-arrow="false"
            >
              <template #action>
                <switch
                  :checked="darkModeEnabled"
                  color="#D7192D"
                  @change="toggleDarkMode"
                />
              </template>
            </AppListItem>
          </AppListGroup>

          <!-- 其他 -->
          <AppListGroup title="其他">
            <AppListItem
              label="清除缓存"
              :value="cacheSize"
              icon="trash"
              @tap="clearCache"
            />
            <AppListItem
              label="帮助中心"
              icon="help"
              @tap="goToHelp"
            />
            <AppListItem
              label="关于我们"
              :value="`V ${appVersion}`"
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
import { ref } from 'vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppListGroup from '@/shared/ui/AppListGroup/AppListGroup.vue'
import AppListItem from '@/shared/ui/AppListItem/AppListItem.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useUserStore } from '@/shared/session/userStore.js'

const userStore = useUserStore()

const notifyEnabled = ref(true)
const darkModeEnabled = ref(false)
const cacheSize = ref('2.4 MB')
const appVersion = ref('1.0.0')

function goToProfile() {
  navigator.navigateTo(routes.account.profile())
}

function goToSecurity() {
  navigator.navigateTo(routes.account.security())
}

function goToAddress() {
  navigator.navigateTo(routes.account.address())
}

function goToSubAccount() {
  navigator.navigateTo(routes.account.subAccount())
}

function goToLanguage() {
  navigator.navigateTo(routes.account.language())
}

function goToHelp() {
  navigator.navigateTo(routes.content.help())
}

function goToAbout() {
  navigator.navigateTo(routes.content.about())
}

function toggleNotify(e) {
  notifyEnabled.value = e.detail.value
}

function toggleDarkMode(e) {
  darkModeEnabled.value = e.detail.value
}

function clearCache() {
  uni.showModal({
    title: '清除缓存',
    content: '确定要清除所有缓存数据吗？',
    success: (res) => {
      if (res.confirm) {
        cacheSize.value = '0 MB'
        uni.showToast({ title: '缓存已清除', icon: 'success' })
      }
    }
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
  gap: 20px;
  padding-top: 8px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.logout-wrap {
  margin-top: 4px;
}

.logout-btn {
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
