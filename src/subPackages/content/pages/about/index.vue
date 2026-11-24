<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('content.titles.about')" :show-back="true" /></template>
    <template #content>
      <AppContent width-mode="standard">
        <view class="about-app-content">
          <view class="app-brand">
            <view class="app-brand-logo" aria-hidden="true" />
            <text class="app-brand-name">{{ t('content.appAbout.brandName') }}</text>
            <text class="app-brand-slogan">{{ t('content.appAbout.slogan') }}</text>
          </view>

          <AppListGroup>
            <AppListItem :label="t('content.appAbout.checkUpdates')" :description="t('content.appAbout.currentVersion', { version })"
              icon="refresh" :disabled="updateBusy" @tap="checkUpdates" />
            <view v-if="updateMessage" class="update-result" role="status" aria-live="polite">
              <text>{{ updateMessage }}</text>
              <text v-if="availableUpdate?.releaseNotes" class="release-notes">{{ availableUpdate.releaseNotes }}</text>
              <AppButton v-if="availableUpdate" size="sm" :disabled="updateBusy" @tap="startUpdate">{{ t('content.appAbout.install') }}</AppButton>
            </view>
          </AppListGroup>

          <AppListGroup>
            <AppListItem :label="t('content.appAbout.company')" icon="info" @tap="openCompany" />
          </AppListGroup>

          <AppListGroup>
            <AppListItem :label="t('content.appAbout.agreement')" icon="shield" @tap="openAgreement('user')" />
            <AppListItem :label="t('content.appAbout.privacy')" icon="shield" @tap="openAgreement('privacy')" />
          </AppListGroup>

          <view class="app-copyright">
            <text>{{ t('content.appAbout.appName') }}</text>
            <text>{{ t('content.appAbout.copyright', { year }) }}</text>
            <text>{{ t('content.appAbout.rights') }}</text>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/content/i18n/register.js'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppListGroup from '@/shared/ui/AppListGroup/AppListGroup.vue'
import AppListItem from '@/shared/ui/AppListItem/AppListItem.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import { getAppVersionName, getAppVersionInfo } from '@/shared/utils/appVersion.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { createOnlineUpdater } from '@/app/bootstrap/onlineUpdater.js'
import { checkAppUpdate } from '../../api/appInfo.js'

const version = getAppVersionName()
const year = new Date().getFullYear()
const checking = ref(false)
const availableUpdate = ref(null)
const status = ref({ state: 'idle' })
let disposed = false, generation = 0
const updateBusy = computed(() => checking.value || ['downloading', 'installing'].includes(status.value.state))
const updater = createOnlineUpdater(value => { if (!disposed) status.value = value })
const updateMessage = computed(() => {
  if (status.value.key) return t(status.value.key)
  if (status.value.state === 'available') return t('content.appAbout.available', { version: availableUpdate.value?.latestVersionName || availableUpdate.value?.latestVersionCode })
  if (status.value.state === 'downloading') return status.value.progress == null ? t('main.startup.downloading') : t('main.startup.downloadProgress', { progress: status.value.progress })
  if (status.value.state === 'failed') return t('main.startup.' + status.value.code)
  return ['installing', 'installerOpened', 'storeOpened'].includes(status.value.state) ? t('main.startup.' + status.value.state) : ''
})

/** 显式点击才检查；只对原生支持的平台请求真实版本接口，不把失败显示为最新版。 */
async function checkUpdates() {
  if (disposed || updateBusy.value) return
  const platform = typeof plus !== 'undefined' ? plus.os?.name?.toLowerCase() : ''
  if (!['android', 'ios'].includes(platform)) { status.value = { key: 'content.appAbout.nativeOnly' }; return }
  const current = getAppVersionInfo()
  if (!Number.isSafeInteger(current.versionCode) || current.versionCode <= 0 || !current.versionName) {
    status.value = { key: 'content.appAbout.invalidVersion' }; return
  }
  const token = ++generation
  checking.value = true
  availableUpdate.value = null
  status.value = { key: 'content.appAbout.checking' }
  try {
    const result = await checkAppUpdate({ platform, versionCode: current.versionCode, versionName: current.versionName })
    if (disposed || token !== generation) return
    const latest = Number(result?.latestVersionCode)
    if (!Number.isSafeInteger(latest) || latest <= 0) { status.value = { key: 'content.appAbout.invalidResponse' }; return }
    if (latest > current.versionCode) { availableUpdate.value = result; status.value = { state: 'available' } }
    else status.value = { key: 'content.appAbout.upToDate' }
  } catch {
    if (!disposed && token === generation) status.value = { key: 'content.appAbout.checkFailed' }
  } finally { if (!disposed && token === generation) checking.value = false }
}

/** 下载和安装复用已有更新器，只有点击立即更新才交给原生执行。 */
function startUpdate() { if (!disposed && !updateBusy.value && availableUpdate.value) updater.start(availableUpdate.value.downloadUrl) }
function openCompany() { navigator.navigateTo(routes.content.company()) }
function openAgreement(type) { navigator.navigateTo(routes.auth.agreement({ type })) }
onUnload(() => { disposed = true; generation++; updater.dispose() })
</script>

<style lang="scss" scoped>
.about-app-content { display: grid; gap: 16px; padding: 8px 0 24px; }
.app-brand { display: flex; align-items: center; flex-direction: column; padding: 24px 16px 28px; }
.app-brand-logo { width: 80px; height: 80px; background: url("@/static/images/logo.png") center / contain no-repeat; }
.app-brand-name { margin-top: 14px; color: var(--type-title-color, #1b1c20); font-size: var(--type-page-title-size, 20px); line-height: 1.5; font-weight: 600; }
.app-brand-slogan { margin-top: 6px; color: var(--type-secondary-color, #62666f); font-size: var(--type-body-size, 14px); line-height: 1.6; }
.update-result { display: grid; justify-items: start; gap: 12px; padding: 0 16px 16px; color: var(--type-secondary-color, #62666f); font-size: var(--type-body-size, 14px); line-height: 1.7; overflow-wrap: anywhere; }
.release-notes { white-space: pre-wrap; }
.app-copyright { display: grid; gap: 4px; margin-top: 12px; padding: 8px 12px; text-align: center; color: var(--type-secondary-color, #62666f); font-size: var(--type-caption-size, 12px); line-height: 1.7; }
</style>
