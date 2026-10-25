<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="editingId ? t('account.titles.editAddress') : t('account.titles.newAddress')" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 30px">
        <view class="form-page">
          <view class="intro-card">
            <view class="intro-icon"><AppIcon name="location" :size="21" /></view>
            <view>
              <text class="intro-title">{{ t('account.addressForm.intro') }}</text>
              <text class="intro-desc">{{ t('account.addressForm.introHint') }}</text>
            </view>
          </view>

          <view v-if="loading" class="loading-card">
            <text>{{ t('account.addressForm.loading') }}</text>
          </view>

          <view v-else class="form-card">
            <view class="field-grid">
              <label class="field-item">
                <text class="field-label">{{ t('account.addressForm.name') }}</text>
                <input v-model="form.name" class="field-input" maxlength="30" :placeholder="t('account.addressForm.namePlaceholder')" @input="clearError" />
              </label>
              <label class="field-item">
                <text class="field-label">{{ t('account.addressForm.phone') }}</text>
                <input v-model="form.phone" class="field-input" type="text" maxlength="20" :placeholder="t('account.addressForm.phonePlaceholder')" @input="clearError" />
              </label>
            </view>

            <view class="field-item">
              <text class="field-label">{{ t('account.addressForm.region') }}</text>
              <AreaCascadePicker
                v-model="regionValue"
                :error="Boolean(formError && !hasRegion)"
                @open="regionPickerVisible = true"
              />
            </view>

            <label class="field-item">
              <text class="field-label">{{ t('account.addressForm.detail') }}</text>
              <textarea
                v-model="form.detail"
                class="detail-input"
                maxlength="120"
                :placeholder="t('account.addressForm.detailPlaceholder')"
                @input="clearError"
              />
              <text class="field-help">{{ t('account.addressForm.detailHint') }}</text>
            </label>

            <view class="default-row">
              <view class="default-copy">
                <text class="default-title">{{ t('account.addressForm.default') }}</text>
                <text class="default-desc">{{ t('account.addressForm.defaultHint') }}</text>
              </view>
              <switch :checked="form.isDefault" color="#D7192D" @change="form.isDefault = $event.detail.value" />
            </view>

            <view v-if="formError" class="form-error">
              <AppIcon name="info" :size="16" color="#9B2C25" />
              <text>{{ formError }}</text>
            </view>
          </view>
        </view>
      </AppContent>
    </template>

    <template #overlay>
      <AreaCascadePickerPanel
        v-model:visible="regionPickerVisible"
        v-model="regionValue"
        @confirm="clearError"
      />
    </template>

    <template #footer>
      <FixedActionBar>
        <button class="save-btn" :disabled="saving || loading" @tap="saveAddress">
          {{ saving ? t('account.addressForm.saving') : t('account.addressForm.save') }}
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import { computed, reactive, ref } from 'vue'
import { AppError, ErrorKind } from '@/shared/api/appError.js'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { createAddress, getAddressList, updateAddress } from '../../api/addressApi.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import AreaCascadePicker from '../../../auth/components/AreaCascadePicker/AreaCascadePicker.vue'
import AreaCascadePickerPanel from '../../../auth/components/AreaCascadePicker/AreaCascadePickerPanel.vue'

const editingId = ref(0)
const loading = ref(false)
const saving = ref(false)
const formFailure = ref(null)
const formError = computed(() => formFailure.value?.message || '')
const regionPickerVisible = ref(false)

const emptyForm = () => ({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false,
})
const form = reactive(emptyForm())
const regionValue = ref({
  provinceCode: '',
  province: '',
  cityCode: '',
  city: '',
  districtCode: '',
  district: '',
})
const hasRegion = computed(() => Boolean(regionValue.value.province && regionValue.value.city))

onLoad(async (options = {}) => {
  editingId.value = Number(options.addressId) || 0
  await initializeForm()
})

/** 按原地址 ID 初始化草稿，保留可重新取词的读取错误。 */
async function initializeForm() {
  loading.value = true
  try {
    const addresses = await getAddressList()
    if (!editingId.value) {
      form.isDefault = addresses.length === 0
      return
    }
    const current = addresses.find(item => Number(item.id) === editingId.value)
    if (!current) throw localFormError('missing')
    Object.assign(form, emptyForm(), current)
    regionValue.value = {
      provinceCode: current.provinceCode || '',
      province: current.province || '',
      cityCode: current.cityCode || '',
      city: current.city || '',
      districtCode: current.districtCode || '',
      district: current.district || '',
    }
  } catch (error) {
    formFailure.value = error?.message ? error : localFormError('loadFailed')
  } finally {
    loading.value = false
  }
}

/** 用户编辑时清理表单错误，不重置草稿。 */
function clearError() {
  if (formError.value) formFailure.value = null
}

/** 创建可随语言重新取词的本地错误，保留后端原始错误。 */
function localFormError(key) {
  return new AppError('', ErrorKind.UNKNOWN, { messageKey: 'account.addressForm.' + key })
}

/** 校验地址草稿，不改变地区代码和用户输入。 */
function validateForm() {
  if (!form.name.trim()) return localFormError('nameRequired')
  if (!form.phone.trim()) return localFormError('phoneRequired')
  if (!/^[0-9+()\-\s]{6,20}$/.test(form.phone.trim())) return localFormError('phoneInvalid')
  if (!hasRegion.value) return localFormError('regionRequired')
  if (!form.detail.trim()) return localFormError('detailRequired')
  return ''
}

/** 按原地址契约保存一次草稿并完整处理结果。 */
async function saveAddress() {
  const validationMessage = validateForm()
  if (validationMessage) {
    formFailure.value = validationMessage
    uni.showToast({ title: validationMessage.message, icon: 'none' })
    return
  }

  formFailure.value = null
  saving.value = true
  try {
    uni.hideKeyboard?.()
    const payload = {
      ...form,
      ...regionValue.value,
      id: editingId.value,
    }
    let savedId = editingId.value
    if (editingId.value) {
      await updateAddress(payload)
    } else {
      savedId = await createAddress(payload)
    }

    if (!savedId) {
      const addresses = await getAddressList()
      savedId = addresses.find(item => (
        item.name === form.name.trim()
        && item.phone === form.phone.trim()
        && item.detail === form.detail.trim()
      ))?.id || 0
    }

    const pages = getCurrentPages()
    const openerChannel = pages[pages.length - 1]?.getOpenerEventChannel?.()
    openerChannel?.emit('addressSaved', {
      id: savedId,
      ...payload,
    })
    uni.showToast({ title: editingId.value ? t('account.addressForm.updated') : t('account.addressForm.created'), icon: 'success' })
    if (openerChannel && pages.length > 1) {
      await navigator.back()
    } else {
      await navigator.redirectTo(routes.account.address())
    }
  } catch (error) {
    formFailure.value = error?.message ? error : localFormError('saveFailed')
    uni.showToast({ title: formError.value, icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.form-page { width: 100%; max-width: 820px; margin: 0 auto; }
.intro-card { display: flex; align-items: center; gap: 13px; margin-bottom: 14px; padding: 15px 16px; border-radius: var(--radius-card); background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.intro-icon { display: grid; width: 42px; height: 42px; flex: 0 0 42px; place-items: center; border-radius: var(--radius-control); color: var(--type-secondary-color); background: var(--surface-card); }
.intro-title, .intro-desc { display: block; }
.intro-title { color: var(--type-title-color); font-size: var(--type-label-size); font-weight: 700; }
.intro-desc { margin-top: 4px; color: var(--type-secondary-color); font-size: var(--type-body-small-size); line-height: 18px; }
.loading-card, .form-card { border-radius: var(--radius-card); background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.loading-card { padding: 48px 20px; color: var(--type-secondary-color); font-size: var(--type-body-size); text-align: center; }
.form-card { display: flex; flex-direction: column; gap: 18px; padding: 18px 16px; }
.field-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
.field-item { display: block; }
.field-label { display: block; margin-bottom: 8px; color: var(--type-body-color); font-size: var(--type-body-small-size); font-weight: 650; }
.field-input, .detail-input { width: 100%; border: 1px solid var(--color-border); border-radius: var(--radius-control); color: var(--type-body-color); background: var(--surface-subtle); box-sizing: border-box; font-size: var(--type-body-size); }
.field-input { height: 48px; padding: 0 13px; }
.detail-input { height: 112px; padding: 12px 13px; line-height: 21px; }
.field-help { display: block; margin-top: 7px; color: var(--type-muted-color); font-size: var(--type-micro-size); }
.default-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 14px; border-radius: var(--radius-control); background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.default-copy { min-width: 0; }
.default-title, .default-desc { display: block; }
.default-title { color: var(--type-body-color); font-size: var(--type-body-size); font-weight: 650; }
.default-desc { margin-top: 4px; color: var(--type-muted-color); font-size: var(--type-micro-size); }
.form-error { display: flex; align-items: flex-start; gap: 7px; padding: 11px 12px; border: 1px solid var(--danger-light); border-radius: var(--radius-control); color: var(--danger-color); background: var(--danger-light); font-size: var(--type-body-small-size); line-height: 18px; }
.save-btn { display: flex; width: min(100%, 460px); height: 48px; align-items: center; justify-content: center; margin: 0 auto; border: 0; border-radius: var(--radius-card); color: #FFFFFF; background: var(--color-brand); font-size: var(--type-button-size); font-weight: 700; }
.save-btn::after { border: 0; }
.save-btn[disabled] { color: var(--text-disabled); background: var(--surface-subtle); }
@media screen and (min-width: 700px) {
  .form-card { padding: 24px; gap: 22px; }
  .field-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
  .detail-input { height: 132px; }
}
</style>
