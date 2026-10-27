﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('account.titles.security')" :show-back="true" /></template>
    <template #content>
      <AppContent width-mode="standard">
        <view class="account-page">
          <text v-if="!editing" class="section-hint">{{ t('account.security.intro') }}</text>
          <view v-if="profileLoading && !profileReady" class="feedback">{{ t('common.loading') }}</view>
          <view v-if="profileError" class="settings-card feedback error"><text>{{ profileError }}</text><button class="secondary-button" @tap="loadProfile">{{ t('common.retry') }}</button></view>
          <view v-if="profileReady && !editing" class="settings-card">
            <text class="section-title">{{ t('account.security.account') }}</text>
            <button class="row-action" :disabled="busy" @tap="startEdit('password')"><view class="action-copy"><text>{{ t('account.security.password') }}</text><text>{{ t('account.security.passwordRule') }}</text></view><AppIcon name="chevron-right" :size="17" /></button>
            <button class="row-action" :disabled="busy" @tap="startEdit('mobile')"><view class="action-copy"><text>{{ t('account.security.contactPhone') }}</text><text>{{ profile.mobile || t('account.security.notProvided') }}</text></view><AppIcon name="chevron-right" :size="17" /></button>
            <button class="row-action" :disabled="busy" @tap="startEdit('email')"><view class="action-copy"><text>{{ t('account.security.contactEmail') }}</text><text>{{ profile.email || t('account.security.notProvided') }}</text></view><AppIcon name="chevron-right" :size="17" /></button>
          </view>
          <view v-if="editing" class="settings-card editor-card">
            <text class="section-title">{{ editorTitle }}</text>
            <text class="section-hint">{{ t(editing === 'password' ? 'account.security.passwordRule' : 'account.security.contactHint') }}</text>
            <view v-if="editing !== 'password'" class="field"><text class="field-label">{{ t(editing === 'mobile' ? 'account.security.newPhone' : 'account.security.newEmail') }}</text><input v-model="contactValue" class="form-input" type="text" :maxlength="editing === 'mobile' ? 24 : 100" :disabled="submitting" /></view>
            <view class="field"><text class="field-label">{{ t('account.security.currentPassword') }}</text><PasswordInput :key="editSession + '-current'" v-model="currentPassword" :label="t('account.security.currentPassword')" :show-text="t('account.security.showPassword')" :hide-text="t('account.security.hidePassword')" :disabled="submitting" /></view>
            <template v-if="editing === 'password'">
              <view class="field"><text class="field-label">{{ t('account.security.newPassword') }}</text><PasswordInput :key="editSession + '-new'" v-model="newPassword" :label="t('account.security.newPassword')" :show-text="t('account.security.showPassword')" :hide-text="t('account.security.hidePassword')" :disabled="submitting" /></view>
              <view class="field"><text class="field-label">{{ t('account.security.confirmPassword') }}</text><PasswordInput :key="editSession + '-confirm'" v-model="confirmPassword" :label="t('account.security.confirmPassword')" :show-text="t('account.security.showPassword')" :hide-text="t('account.security.hidePassword')" :disabled="submitting" @confirm="submitEdit" /></view>
            </template>
            <text v-if="validationKey || editError" class="feedback error">{{ validationKey ? t(validationKey) : editError }}</text>
            <view class="form-actions"><button class="secondary-button" :disabled="submitting" @tap="closeEditor">{{ t('common.cancel') }}</button><button class="primary-button" :disabled="submitting" :loading="submitting" @tap="submitEdit">{{ t(submitting ? 'account.profile.saving' : 'common.save') }}</button></view>
          </view>
          <view v-if="!editing" class="settings-card">
            <text class="section-title">{{ t('account.security.authorizedDevices') }}</text>
            <text class="section-hint">{{ t('account.security.deviceHint') }}</text>
            <text v-if="devicesLoading" class="feedback">{{ t('common.loading') }}</text>
            <view v-else-if="devicesError" class="feedback error"><text>{{ devicesError }}</text><button class="secondary-button" @tap="loadDevices">{{ t('common.retry') }}</button></view>
            <text v-else-if="!devices.length" class="feedback">{{ t('account.security.noDevices') }}</text>
            <view v-for="device in devices" :key="device.deviceId" class="device-row">
              <view class="device-copy"><text class="device-name">{{ device.deviceName || t('account.security.unknownDevice') }}</text><text class="device-date">{{ t('account.security.lastUsed', { time: formatDateTime(device.lastLoginTime || device.boundAt) }) }}</text></view>
              <button class="text-action" :disabled="busy" @tap="removeDevice(device)">{{ t(removingDevice === device.deviceId ? 'account.security.removing' : 'account.security.revoke') }}</button>
            </view>
            <text v-if="deviceActionError" class="feedback error">{{ deviceActionError }}</text>
          </view>
          <text v-if="editError && !editing" class="feedback error">{{ editError }}</text>
          <text v-if="logoutError" class="feedback error">{{ logoutError }}</text>
          <button v-if="!editing" class="secondary-button logout-button" :disabled="busy" @tap="handleLogout">{{ t('account.security.logout') }}</button>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '../../i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import PasswordInput from '@/shared/ui/PasswordInput.vue'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { formatDateTime } from '@/shared/utils/format.js'
import { getAccountProfile, saveAccountContact, saveAccountPassword, getAccountDevices, removeAccountDevice } from '../../api/accountSecurity.js'

const userStore = useUserStore()
const profile = reactive({})
const profileLoading = ref(false), profileReady = ref(false), profileError = ref('')
const devices = ref([]), devicesLoading = ref(false), devicesError = ref(''), deviceActionError = ref('')
const editing = ref(''), currentPassword = ref(''), newPassword = ref(''), confirmPassword = ref(''), contactValue = ref('')
const editSession = ref(0), submitting = ref(false), loggingOut = ref(false), removingDevice = ref(null)
const validationKey = ref(''), editError = ref(''), logoutError = ref('')
const busy = computed(() => submitting.value || loggingOut.value || removingDevice.value !== null)
const editorTitle = computed(() => t(editing.value === 'password' ? 'account.security.changePassword' : editing.value === 'mobile' ? 'account.security.editPhone' : 'account.security.editEmail'))
let profileGeneration = 0, devicesGeneration = 0
onShow(() => { loadProfile(); loadDevices() })
onHide(clearSecrets)
onUnload(clearSecrets)

/** 读取当前登录账号资料，错误不伪装为未填写或操作成功。 */
async function loadProfile() {
  if (profileLoading.value || submitting.value) return
  profileLoading.value = true; profileError.value = ''
  const generation = ++profileGeneration
  try { const data = await getAccountProfile(); if (generation === profileGeneration) { Object.assign(profile, data); profileReady.value = true } }
  catch (error) { if (generation === profileGeneration) profileError.value = error?.message || t('account.profile.loadFailed') }
  finally { if (generation === profileGeneration) profileLoading.value = false }
}

/** 读取真实设备授权列表，失败可单独重试。 */
async function loadDevices() {
  if (devicesLoading.value || removingDevice.value !== null) return
  devicesLoading.value = true; devicesError.value = ''
  const generation = ++devicesGeneration
  try { const data = await getAccountDevices(); if (generation === devicesGeneration) devices.value = data }
  catch (error) { if (generation === devicesGeneration) devicesError.value = error?.message || t('account.security.devicesFailed') }
  finally { if (generation === devicesGeneration) devicesLoading.value = false }
}

/** 离开页面清除密码，不持久化、不记录任何密码字段。 */
function clearSecrets() {
  currentPassword.value = ''; newPassword.value = ''; confirmPassword.value = ''; editSession.value++
}

/** 打开当前账号的真实编辑表单，手机不以脱敏值作为默认提交值。 */
function startEdit(kind) {
  if (busy.value || !profileReady.value) return
  clearSecrets(); validationKey.value = ''; editError.value = ''
  contactValue.value = kind === 'email' ? profile.email || '' : ''
  editing.value = kind
}

/** 写请求处理中保留操作，其他时候允许关闭并清除临时字段。 */
function closeEditor() {
  if (submitting.value) return
  clearSecrets(); contactValue.value = ''; editing.value = ''; validationKey.value = ''; editError.value = ''
}

/** 校验并提交一次改密或联系信息修改；语言变化不清表单、不重发。 */
async function submitEdit() {
  if (busy.value || !editing.value) return
  validationKey.value = ''; editError.value = ''
  const kind = editing.value
  const oldPassword = currentPassword.value
  const password = newPassword.value
  const value = kind === 'mobile' ? contactValue.value.trim().replace(/[\s()-]/g, '') : contactValue.value.trim()
  if (!oldPassword) { validationKey.value = 'account.security.passwordRequired'; return }
  if (kind === 'password') {
    if (password.length < 8 || password.length > 64 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) { validationKey.value = 'account.security.passwordRule'; return }
    if (password === oldPassword) { validationKey.value = 'account.security.passwordSame'; return }
    if (password !== confirmPassword.value) { validationKey.value = 'account.security.passwordMismatch'; return }
  } else if (kind === 'mobile' ? !/^\+?[0-9]{6,15}$/.test(value) : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    validationKey.value = kind === 'mobile' ? 'account.security.phoneInvalid' : 'account.security.emailInvalid'; return
  }
  submitting.value = true
  profileGeneration++; profileLoading.value = false
  let savedContact = false
  try {
    if (kind === 'password') {
      if (!await openAppDialog({ title: t('account.security.changePassword'), description: t('account.security.passwordConfirm') })) return
      if (await saveAccountPassword({ oldPassword, newPassword: password }) !== true) throw new Error(t('account.security.saveFailed'))
      clearSecrets(); editing.value = ''
      await userStore.logout()
      await navigator.reLaunch(routes.auth.login())
    } else {
      if (await saveAccountContact({ currentPassword: oldPassword, ...(kind === 'mobile' ? { mobile: value } : { email: value }) }) !== true) throw new Error(t('account.security.saveFailed'))
      savedContact = true
      clearSecrets(); contactValue.value = ''; editing.value = ''
      uni.showToast({ title: t('account.security.contactSaved'), icon: 'success' })
    }
  } catch (error) { editError.value = error?.message || t('account.security.saveFailed') }
  finally { submitting.value = false; clearSecrets() }
  // 写入已成功时只重试读取，不把刷新失败显示成“保存失败”或重发写入。
  if (savedContact) await loadProfile()
}

/** 确认后调用真实解绑接口，成功才移除列表项；不宣称注销既有 JWT 会话。 */
async function removeDevice(device) {
  if (busy.value || !device?.deviceId) return
  removingDevice.value = device.deviceId; deviceActionError.value = ''
  devicesGeneration++; devicesLoading.value = false
  try {
    if (!await openAppDialog({ title: t('account.security.revokeTitle'), description: t('account.security.revokeConfirm', { name: device.deviceName || t('account.security.unknownDevice') }) })) return
    if (await removeAccountDevice(device.deviceId) !== true) throw new Error(t('account.security.removeFailed'))
    devices.value = devices.value.filter(item => item.deviceId !== device.deviceId)
    uni.showToast({ title: t('account.security.authorizationRemoved'), icon: 'success' })
  } catch (error) { deviceActionError.value = error?.message || t('account.security.removeFailed') }
  finally { removingDevice.value = null }
}

/** 使用统一确认框完成真实本地会话清理，再进入登录页。 */
async function handleLogout() {
  if (busy.value) return
  loggingOut.value = true; logoutError.value = ''
  try {
    if (!await openAppDialog({ title: t('account.security.logoutConfirm'), description: t('account.security.logoutContent') })) return
    clearSecrets()
    await userStore.logout()
    await navigator.reLaunch(routes.auth.login())
  } catch (error) { logoutError.value = error?.message || t('account.security.saveFailed') }
  finally { loggingOut.value = false }
}
</script>

<style scoped lang="scss">
@use '../../styles/accountSettings.scss';
</style>
