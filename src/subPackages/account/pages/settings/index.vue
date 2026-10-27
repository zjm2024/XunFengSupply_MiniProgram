<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('account.settings.title')" :show-back="true" :show-shadow="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="settings-content">
          <AppListGroup :title="t('account.settings.general')">
            <AppListItem
              :label="t('account.settings.language')"
              :description="t('account.settings.languageHint')"
              :value="languageLabel"
              icon="settings"
              @tap="goToLanguage"
            />
            <AppListItem
              :label="t('account.settings.clearCache')"
              :description="t('account.settings.cacheHint')"
              :value="cacheLabel"
              icon="trash"
              @tap="handleClearCache"
            />
          </AppListGroup>

          <AppListGroup :title="t('account.settings.accountSecurity')" :description="t('account.settings.core')">
            <AppListItem
              :label="t('account.settings.profile')"
              :description="t('account.settings.profileHint')"
              icon="user"
              @tap="goToProfile"
            />
            <AppListItem
              :label="t('account.settings.security')"
              :description="t('account.settings.securityHint')"
              icon="shield"
              @tap="goToSecurity"
            />
          </AppListGroup>

          <AppListGroup :title="t('account.settings.support')">
            <AppListItem
              :label="t('account.settings.notifications')"
              :description="t('account.settings.notificationsHint')"
              icon="bell"
              @tap="goToNotificationSettings"
            />
            <AppListItem
              :label="t('account.settings.help')"
              :description="t('account.settings.helpHint')"
              icon="help"
              @tap="goToHelp"
            />
            <AppListItem
              :label="t('account.settings.about')"
              value="V 1.0.0"
              icon="info"
              @tap="goToAbout"
            />
          </AppListGroup>

          <!-- 退出登录 -->
          <view class="logout-wrap">
            <button class="logout-btn" @tap="handleLogout">{{ t('account.settings.logout') }}</button>
          </view>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { locale, t } from '@/shared/i18n/index.js'
import '../../i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppListGroup from '@/shared/ui/AppListGroup/AppListGroup.vue'
import AppListItem from '@/shared/ui/AppListItem/AppListItem.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { clearAppCache, getCacheSummary } from '@/shared/utils/cacheManager.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'

const userStore = useUserStore()
const cacheSummary = ref(getCacheSummary())
const cacheLabel = computed(() => cacheSummary.value.count > 0
  ? t('account.settings.cacheSummary', { count: cacheSummary.value.count })
  : t('account.settings.cacheEmpty'))
const languageLabel = computed(() => locale.value === 'en-US'
  ? t('account.language.en') : t('account.language.zh'))

/** 前往既有语言页，不通过重启或重新创建当前页面切换语言。 */
function goToLanguage() {
  navigator.navigateTo(routes.account.language())
}

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

async function handleClearCache() {
  if (!await openAppDialog({
    confirmText: t('common.confirm'),
    cancelText: t('common.cancel'),
    title: t('account.settings.clearCache'),
    description: t('account.settings.cacheConfirm'),
  })) return
  try {
    await clearAppCache()
    cacheSummary.value = getCacheSummary()
    uni.showToast({ title: t('account.settings.cacheCleared'), icon: 'success' })
  } catch (error) {
    console.error('[Settings] 清除缓存失败:', error)
    uni.showToast({ title: t('account.settings.cacheFailed'), icon: 'none' })
  }
}

/** 确认后完成本地会话清理，再返回登录页。 */
async function handleLogout() {
  if (!await openAppDialog({
    confirmText: t('common.confirm'),
    cancelText: t('common.cancel'),
    title: t('account.settings.logoutTitle'),
    description: t('account.settings.logoutConfirm'),
  })) return
  await userStore.logout()
  await navigator.reLaunch(routes.auth.login())
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
