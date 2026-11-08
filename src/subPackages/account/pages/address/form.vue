<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="editingId ? t('account.titles.editAddress') : t('account.titles.newAddress')" :show-back="true" />
    </template>

    <template #content>
      <AppContent width-mode="standard" padding="16px var(--page-padding-x, 16px) 30px">
        <view class="form-page">
          <view v-if="!loading" class="parse-card">
            <label>
              <text class="field-label">{{ t('account.addressForm.parseTitle') }}</text>
              <textarea
                v-model="addressText"
                class="parse-input"
                maxlength="1000"
                :placeholder="t('account.addressForm.parsePlaceholder')"
                @input="onAddressTextInput"
              />
            </label>
            <view class="parse-actions">
              <text class="parse-message">{{ t('account.addressForm.' + parseMessage) }}</text>
              <AppButton size="sm" :loading="parsing" :disabled="saving || !addressText.trim()" @tap="applyParsedAddress">
                {{ t('account.addressForm.parseAction') }}
              </AppButton>
            </view>
          </view>

          <view v-if="loading" class="loading-card">
            <text>{{ t('account.addressForm.loading') }}</text>
          </view>

          <view v-else class="form-card">
            <view class="field-grid">
              <label class="field-item">
                <text class="field-label">{{ t('account.addressForm.name') }}</text>
                <input v-model="form.name" class="field-input" maxlength="50" :placeholder="t('account.addressForm.namePlaceholder')" @input="clearError" />
              </label>
              <label class="field-item">
                <text class="field-label">{{ t('account.addressForm.phone') }}</text>
                <input v-model="form.phone" class="field-input" type="text" maxlength="30" :placeholder="t('account.addressForm.phonePlaceholder')" @input="clearError" />
              </label>
            </view>

            <view class="field-item">
              <text class="field-label">{{ t('account.addressForm.region') }}</text>
              <AreaCascadePicker
                v-model="regionValue"
                :disabled="parsing"
                :error="Boolean(formError && !hasRegion)"
                @open="regionPickerVisible = true"
              />
            </view>

            <label class="field-item">
              <text class="field-label">{{ t('account.addressForm.detail') }}</text>
              <textarea
                v-model="form.detail"
                class="detail-input"
                maxlength="300"
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
      <FixedActionBar width-mode="standard">
        <button class="save-btn" :disabled="saving || loading || parsing" @tap="saveAddress">
          {{ saving ? t('account.addressForm.saving') : t('account.addressForm.save') }}
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { AppError, ErrorKind } from '@/shared/api/appError.js'
import { getAreaChildren, ROOT_AREA_CODE } from '@/shared/api/area.js'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { createAddress, getAddressList, parseAddress, updateAddress } from '../../api/addressApi.js'
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
const addressText = ref('')
const parsing = ref(false)
const parseMessage = ref('parseHint')
let draftRevision = 0

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
const emptyRegion = () => ({
  provinceCode: '',
  province: '',
  cityCode: '',
  city: '',
  districtCode: '',
  district: '',
})
const regionValue = ref(emptyRegion())
const hasRegion = computed(() => Boolean(regionValue.value.province && regionValue.value.city))

onLoad(async (options = {}) => {
  editingId.value = Number(options.addressId) || 0
  await initializeForm()
})
onBeforeUnmount(() => { draftRevision += 1 })

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
  draftRevision += 1
  if (formError.value) formFailure.value = null
}

function onAddressTextInput() {
  draftRevision += 1
  parseMessage.value = 'parseHint'
}

function matchArea(areas, name) {
  if (!name) return null
  const exact = areas.find(area => area.name === name)
  if (exact) return exact
  const shortName = value => value.replace(/[省市区县]$/, '')
  const matches = areas.filter(area => shortName(area.name) === name || area.name === shortName(name))
  return matches.length === 1 ? matches[0] : null
}

async function resolveParsedRegion({ province, city, district }) {
  if (!province || !district) return null
  const matchedProvince = matchArea(await getAreaChildren(ROOT_AREA_CODE), province)
  if (!matchedProvince) return null

  const cities = await getAreaChildren(matchedProvince.code)
  let matchedCity = matchArea(cities, city)
  if (!matchedCity && (!city || matchArea([matchedProvince], city)) && cities.length === 1
    && ['110000', '120000', '310000', '500000'].includes(matchedProvince.code)) {
    matchedCity = cities[0]
  }
  if (!matchedCity) return null

  const matchedDistrict = matchArea(await getAreaChildren(matchedCity.code), district)
  if (!matchedDistrict) return null
  return {
    provinceCode: matchedProvince.code, province: matchedProvince.name,
    cityCode: matchedCity.code, city: matchedCity.name,
    districtCode: matchedDistrict.code, district: matchedDistrict.name,
  }
}

async function applyParsedAddress() {
  const input = addressText.value.trim()
  if (!input || parsing.value || loading.value || saving.value || regionPickerVisible.value) return
  const revision = draftRevision
  parsing.value = true
  parseMessage.value = 'parseHint'
  try {
    uni.hideKeyboard?.()
    const candidate = await parseAddress(input)
    if (revision !== draftRevision) return
    const hasLocation = Boolean(candidate.province || candidate.city || candidate.district || candidate.detail)
    if (!candidate.name && !candidate.phone && !hasLocation) {
      parseMessage.value = 'parseFailed'
      return
    }
    const matchedRegion = await resolveParsedRegion(candidate)
    if (revision !== draftRevision) return

    if (candidate.name) form.name = candidate.name
    if (candidate.phone) form.phone = candidate.phone
    if (hasLocation) {
      // 地址变化时省市区和街道一起更新，避免把新街道保存到旧地区。
      regionValue.value = matchedRegion || emptyRegion()
      form.detail = candidate.detail
    }
    formFailure.value = null
    parseMessage.value = candidate.isComplete && matchedRegion ? 'parseSuccess' : 'parsePartial'
  } catch {
    if (revision === draftRevision) parseMessage.value = 'parseFailed'
  } finally {
    parsing.value = false
  }
}

/** 创建可随语言重新取词的本地错误，保留后端原始错误。 */
function localFormError(key) {
  return new AppError('', ErrorKind.UNKNOWN, { messageKey: 'account.addressForm.' + key })
}

/** 校验地址草稿，不改变地区代码和用户输入。 */
function validateForm() {
  if (!form.name.trim()) return localFormError('nameRequired')
  if (!form.phone.trim()) return localFormError('phoneRequired')
  if (!/^[0-9+()\-\s]{6,30}$/.test(form.phone.trim())) return localFormError('phoneInvalid')
  if (!hasRegion.value) return localFormError('regionRequired')
  if (!form.detail.trim()) return localFormError('detailRequired')
  return ''
}

/** 按原地址契约保存一次草稿并完整处理结果。 */
async function saveAddress() {
  if (saving.value || loading.value || parsing.value) return
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
.form-page { width: 100%; }
.parse-card { margin-bottom: 14px; padding: 16px; }
.parse-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; }
.parse-message { flex: 1; min-width: 0; color: var(--type-secondary-color); font-size: var(--type-body-small-size); line-height: 18px; }
.parse-actions :deep(.app-button) { flex-shrink: 0; margin: 0; }
.parse-card, .loading-card, .form-card { border-radius: var(--radius-card); }
.loading-card { padding: 48px 20px; color: var(--type-secondary-color); font-size: var(--type-body-size); text-align: center; }
.form-card { display: flex; flex-direction: column; gap: var(--spacing-base, 16px); padding: var(--module-padding, 16px); }
.field-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
.field-item { display: block; }
.field-label { display: block; margin-bottom: 8px; color: var(--type-body-color); font-size: var(--type-body-small-size); font-weight: var(--font-weight-semibold, 600); }
.field-input, .detail-input, .parse-input { width: 100%; border: 1px solid var(--color-border); border-radius: var(--radius-control); color: var(--type-body-color); background: var(--surface-subtle); box-sizing: border-box; font-size: var(--type-body-size); }
.field-input { height: 48px; padding: 0 13px; }
.detail-input { height: 112px; padding: 12px 13px; line-height: 21px; }
.parse-input { height: 84px; padding: 10px 13px; line-height: 21px; }
.field-help { display: block; margin-top: 7px; color: var(--type-muted-color); font-size: var(--type-micro-size); }
.default-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 14px; border-radius: var(--radius-control); background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.default-copy { min-width: 0; }
.default-title, .default-desc { display: block; }
.default-title { color: var(--type-body-color); font-size: var(--type-body-size); font-weight: var(--font-weight-semibold, 600); }
.default-desc { margin-top: 4px; color: var(--type-muted-color); font-size: var(--type-micro-size); }
.form-error { display: flex; align-items: flex-start; gap: 7px; padding: 11px 12px; border: 1px solid var(--danger-light); border-radius: var(--radius-control); color: var(--danger-color); background: var(--danger-light); font-size: var(--type-body-small-size); line-height: 18px; }
.save-btn { display: flex; width: min(100%, 460px); height: 48px; align-items: center; justify-content: center; margin: 0 auto; border: 0; border-radius: var(--radius-card); color: #FFFFFF; background: var(--color-brand); font-size: var(--type-button-size); font-weight: var(--font-weight-bold, 700); }
.save-btn::after { border: 0; }
.save-btn[disabled] { color: var(--text-disabled); background: var(--surface-subtle); }
@media screen and (min-width: 700px) {
  .parse-card { padding: 18px 24px; }
  .form-card { padding: 24px; gap: 22px; }
  .field-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
  .detail-input { height: 132px; }
}

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.parse-card, .loading-card, .form-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
</style>
