﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('account.titles.profile')" :show-back="true" /></template>
    <template #content>
      <AppContent width-mode="standard">
        <view class="account-page profile-page">
          <view v-if="loading && !loaded" class="feedback">{{ t('common.loading') }}</view>
          <view v-else-if="!loaded" class="settings-card feedback"><text>{{ loadError || t('account.profile.loadFailed') }}</text><button class="secondary-button" @tap="loadProfile">{{ t('common.retry') }}</button></view>
          <template v-else>
            <view v-if="loadError" class="feedback error"><text>{{ loadError }}</text><button class="secondary-button" @tap="loadProfile">{{ t('common.retry') }}</button></view>
            <view class="profile-identity">
              <view class="profile-monogram" aria-hidden="true">{{ displayName.slice(0, 1).toUpperCase() }}</view>
              <view class="profile-identity-copy"><text class="profile-name">{{ displayName }}</text><text class="profile-role">{{ t(profile.isMaster ? 'account.center.main' : 'account.center.sub') }}</text></view>
            </view>
            <view class="profile-section">
              <text class="profile-section-label">{{ t('account.profile.myAccount') }}</text>
              <view class="profile-group">
                <button class="profile-row editable" :disabled="saving" @tap="startProfileEdit('realName')"><text class="profile-label">{{ t('account.profile.accountName') }}</text><view class="profile-value-wrap"><text class="profile-value">{{ profile.realName || t('account.profile.notProvided') }}</text><AppIcon name="chevron-right" :size="16" color="#a3a8b0" /></view></button>
                <view class="profile-row"><text class="profile-label">{{ t('account.profile.username') }}</text><text class="profile-value">{{ profile.username }}</text></view>
                <button class="profile-row editable" :disabled="saving" @tap="startProfileEdit('landlinePhone')"><text class="profile-label">{{ t('account.profile.landline') }}</text><view class="profile-value-wrap"><text class="profile-value">{{ profile.landlinePhone || t('account.profile.notProvided') }}</text><AppIcon name="chevron-right" :size="16" color="#a3a8b0" /></view></button>
              </view>
            </view>
            <view class="profile-section">
              <text class="profile-section-label">{{ t('account.profile.dealerSection') }}</text>
              <view class="profile-group">
                <view class="profile-row"><text class="profile-label">{{ t('account.profile.dealerName') }}</text><text class="profile-value">{{ profile.companyName || t('account.profile.notProvided') }}</text></view>
                <button class="profile-row profile-code" :disabled="!profile.dealerCode" :aria-label="t('account.profile.customerId') + ' · ' + t('account.profile.copy')" @tap="copyCode"><text class="profile-label">{{ t('account.profile.customerId') }}</text><text class="profile-value">{{ profile.dealerCode || t('account.profile.notProvided') }}</text></button>
                <view class="profile-row"><text class="profile-label">{{ t('account.profile.grade') }}</text><text class="profile-value">{{ gradeLabel }}</text></view>
              </view>
              <text v-if="profile.dealerCode" class="profile-caption">{{ t('account.profile.copyHint') }}</text>
            </view>
            <view class="profile-section">
              <text class="profile-section-label">{{ t('account.security.account') }}</text>
              <view class="profile-group">
                <view class="profile-row"><text class="profile-label">{{ t('account.security.contactPhone') }}</text><text class="profile-value">{{ profile.mobile || t('account.security.notProvided') }}</text></view>
                <view class="profile-row"><text class="profile-label">{{ t('account.security.contactEmail') }}</text><text class="profile-value">{{ profile.email || t('account.security.notProvided') }}</text></view>
                <button class="profile-row profile-security" :disabled="saving" @tap="goToSecurity"><text class="profile-label">{{ t('account.profile.manageSecurity') }}</text><AppIcon name="chevron-right" :size="16" color="#a3a8b0" /></button>
              </view>
            </view>
            <text v-if="!editField && (saveError || validationKey)" class="feedback error">{{ saveError || t(validationKey) }}</text>
          </template>
        </view>
      </AppContent>
    </template>
    <template #overlay>
      <ConfirmPopup v-model="editVisible" :title="editTitle" :confirm-text="t(saving ? 'account.profile.saving' : 'common.save')" :confirm-disabled="saving" :dismiss-disabled="saving" :close-on-overlay="!saving" @confirm="confirmProfileEdit" @cancel="closeProfileEdit" @close="closeProfileEdit">
        <view class="field profile-edit-field"><input :key="editField" v-model="editValue" class="form-input" :aria-label="editTitle" :maxlength="editField === 'realName' ? 50 : 30" :disabled="saving" :placeholder="t(editField === 'realName' ? 'account.profile.namePlaceholder' : 'account.profile.optional')" autocomplete="off" @confirm="confirmProfileEdit" /></view>
        <text v-if="saveError || validationKey" class="feedback error">{{ saveError || t(validationKey) }}</text>
      </ConfirmPopup>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { t, getLocale } from '@/shared/i18n/index.js'
import '../../i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { getAccountProfile, saveAccountProfile } from '../../api/accountSecurity.js'

const userStore = useUserStore()
const profile = reactive({})
const draft = reactive({ realName: '', landlinePhone: '' })
const original = reactive({ realName: '', landlinePhone: '' })
const loading = ref(false), loaded = ref(false), saving = ref(false)
const loadError = ref(''), saveError = ref(''), validationKey = ref('')
const editField = ref(''), editValue = ref('')
const displayName = computed(() => profile.realName || profile.username || t('account.profile.notProvided'))
/** 等级显示只取后端字典标签，英文缺失回退中文；切换语言不重发请求。 */
const gradeLabel = computed(() => (getLocale() === 'en-US' ? profile.gradeNameEn || profile.gradeName : profile.gradeName) || t('account.profile.notProvided'))
const editTitle = computed(() => t(editField.value === 'landlinePhone' ? 'account.profile.landline' : 'account.profile.accountName'))
const editVisible = computed({ get: () => Boolean(editField.value), set: value => { if (!value) closeProfileEdit() } })
const dirty = computed(() => draft.realName.trim() !== original.realName || draft.landlinePhone.trim() !== original.landlinePhone)
let loadGeneration = 0
onShow(loadProfile)

/** 读取真实资料；刷新失败保留已有内容，不覆盖未保存输入。 */
async function loadProfile() {
  if (loading.value || saving.value) return
  loading.value = true
  const generation = ++loadGeneration
  loadError.value = ''
  try {
    const data = await getAccountProfile()
    if (generation !== loadGeneration) return
    Object.assign(profile, data)
    if (!dirty.value) {
      Object.assign(original, { realName: data.realName || '', landlinePhone: data.landlinePhone || '' })
      Object.assign(draft, original)
    }
    loaded.value = true
  } catch (error) { if (generation === loadGeneration) loadError.value = error?.message || t('account.profile.loadFailed') }
  finally { if (generation === loadGeneration) loading.value = false }
}

/** 成功保存后才更新本地账号姓名，提交字段不包含主体编号或脱敏手机。 */
async function save() {
  if (saving.value || !dirty.value) return
  validationKey.value = ''; saveError.value = ''
  const values = { realName: draft.realName.trim(), landlinePhone: draft.landlinePhone.trim() }
  if (!values.realName || values.realName.length > 50 || values.landlinePhone.length > 30) { validationKey.value = 'account.profile.invalid'; return }
  saving.value = true
  loadGeneration++; loading.value = false
  try {
    if (await saveAccountProfile(values) !== true) throw new Error(t('account.profile.saveFailed'))
    Object.assign(original, values); Object.assign(draft, values); Object.assign(profile, values)
    userStore.updateOwnProfile({ realName: values.realName })
    uni.showToast({ title: t('account.profile.saved'), icon: 'success' })
    return true
  } catch (error) { saveError.value = error?.message || t('account.profile.saveFailed') }
  finally { saving.value = false }
}

/** 复制完整经销商编号，不使用内部账号主键充当编号。 */
function copyCode() {
  if (!profile.dealerCode) return
  uni.setClipboardData({ data: profile.dealerCode, showToast: false,
    success: () => uni.showToast({ title: t('account.profile.copied'), icon: 'none' }),
    fail: () => uni.showToast({ title: t('account.profile.copyFailed'), icon: 'none' }) })
}

/** 单项点击才进入编辑，保存仍提交接口允许的两个资料字段。 */
function startProfileEdit(field) {
  if (saving.value || !['realName', 'landlinePhone'].includes(field)) return
  Object.assign(draft, original)
  saveError.value = ''; validationKey.value = ''
  editField.value = field; editValue.value = draft[field]
}

/** 取消只放弃本次资料草稿；提交中的请求继续由原保存流程处理。 */
function closeProfileEdit() {
  if (saving.value) return
  editField.value = ''; editValue.value = ''
  Object.assign(draft, original)
  saveError.value = ''; validationKey.value = ''
}

/** 无变化直接关层，失败保留输入，确认成功后才更新只读信息行。 */
async function confirmProfileEdit() {
  if (saving.value || !editField.value) return
  draft[editField.value] = editValue.value
  if (!dirty.value) { closeProfileEdit(); return }
  if (await save()) closeProfileEdit()
}

/** 编辑内容离开前使用统一确认框，确认后进入安全设置。 */
async function goToSecurity() {
  if (saving.value) return
  if (dirty.value && !await openAppDialog({ title: t('common.tip'), description: t('common.unsavedChanges') })) return
  navigator.navigateTo(routes.account.security())
}
</script>

<style scoped lang="scss">
@use '../../styles/accountSettings.scss';
</style>
