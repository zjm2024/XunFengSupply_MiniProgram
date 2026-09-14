<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="editingId ? '编辑收货地址' : '新增收货地址'" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 30px">
        <view class="form-page">
          <view class="intro-card">
            <view class="intro-icon"><AppIcon name="location" :size="21" /></view>
            <view>
              <text class="intro-title">配送信息</text>
              <text class="intro-desc">请填写真实有效的信息，用于物流配送和订单地址快照</text>
            </view>
          </view>

          <view v-if="loading" class="loading-card">
            <text>正在读取地址…</text>
          </view>

          <view v-else class="form-card">
            <view class="field-grid">
              <label class="field-item">
                <text class="field-label">收货人</text>
                <input v-model="form.name" class="field-input" maxlength="30" placeholder="请输入姓名" @input="clearError" />
              </label>
              <label class="field-item">
                <text class="field-label">联系电话</text>
                <input v-model="form.phone" class="field-input" type="text" maxlength="20" placeholder="请输入手机号或座机" @input="clearError" />
              </label>
            </view>

            <view class="field-item">
              <text class="field-label">所在地区</text>
              <AreaCascadePicker
                v-model="regionValue"
                :error="Boolean(formError && !hasRegion)"
                @confirm="clearError"
              />
            </view>

            <label class="field-item">
              <text class="field-label">详细地址</text>
              <textarea
                v-model="form.detail"
                class="detail-input"
                maxlength="120"
                placeholder="街道、门牌号、楼栋、房间号等"
                @input="clearError"
              />
              <text class="field-help">建议精确到门牌号，避免影响配送</text>
            </label>

            <view class="default-row">
              <view class="default-copy">
                <text class="default-title">设为默认地址</text>
                <text class="default-desc">确认订单时优先带入该地址</text>
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

    <template #footer>
      <FixedActionBar>
        <button class="save-btn" :disabled="saving || loading" @tap="saveAddress">
          {{ saving ? '保存中…' : '保存地址' }}
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
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

const editingId = ref(0)
const loading = ref(false)
const saving = ref(false)
const formError = ref('')

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

async function initializeForm() {
  loading.value = true
  try {
    const addresses = await getAddressList()
    if (!editingId.value) {
      form.isDefault = addresses.length === 0
      return
    }
    const current = addresses.find(item => Number(item.id) === editingId.value)
    if (!current) throw new Error('该收货地址不存在或已删除')
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
    formError.value = error?.message || '地址读取失败，请返回重试'
  } finally {
    loading.value = false
  }
}

function clearError() {
  if (formError.value) formError.value = ''
}

function validateForm() {
  if (!form.name.trim()) return '请输入收货人姓名'
  if (!form.phone.trim()) return '请输入联系电话'
  if (!/^[0-9+()\-\s]{6,20}$/.test(form.phone.trim())) return '请输入正确的联系电话'
  if (!hasRegion.value) return '请选择所在地区'
  if (!form.detail.trim()) return '请输入详细地址'
  return ''
}

async function saveAddress() {
  const validationMessage = validateForm()
  if (validationMessage) {
    formError.value = validationMessage
    uni.showToast({ title: validationMessage, icon: 'none' })
    return
  }

  formError.value = ''
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
    uni.showToast({ title: editingId.value ? '地址已更新' : '地址已新增', icon: 'success' })
    if (openerChannel && pages.length > 1) {
      await navigator.back()
    } else {
      await navigator.redirectTo(routes.account.address())
    }
  } catch (error) {
    formError.value = error?.message || '地址保存失败，请检查后重试'
    uni.showToast({ title: formError.value, icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.form-page { width: 100%; max-width: 820px; margin: 0 auto; }
.intro-card { display: flex; align-items: center; gap: 13px; margin-bottom: 14px; padding: 15px 16px; border: 1px solid #E4E8EC; border-radius: 16px; background: #F7F9FA; }
.intro-icon { display: grid; width: 42px; height: 42px; flex: 0 0 42px; place-items: center; border-radius: 13px; color: #50657A; background: #FFFFFF; box-shadow: 0 4px 12px rgba(31, 41, 55, .05); }
.intro-title, .intro-desc { display: block; }
.intro-title { color: #17191D; font-size: 15px; font-weight: 700; }
.intro-desc { margin-top: 4px; color: #757A83; font-size: 12px; line-height: 18px; }
.loading-card, .form-card { border: 1px solid #E8E9EC; border-radius: 18px; background: #FFFFFF; box-shadow: 0 8px 26px rgba(17, 24, 39, .045); }
.loading-card { padding: 48px 20px; color: #777B84; font-size: 14px; text-align: center; }
.form-card { display: flex; flex-direction: column; gap: 18px; padding: 18px 16px; }
.field-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
.field-item { display: block; }
.field-label { display: block; margin-bottom: 8px; color: #34363C; font-size: 13px; font-weight: 650; }
.field-input, .detail-input { width: 100%; border: 1px solid #DEE1E6; border-radius: 12px; color: #111216; background: #FAFAFB; box-sizing: border-box; font-size: 14px; transition: border-color .18s ease, background .18s ease; }
.field-input { height: 48px; padding: 0 13px; }
.detail-input { height: 112px; padding: 12px 13px; line-height: 21px; }
.field-help { display: block; margin-top: 7px; color: #969AA3; font-size: 11px; }
.default-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 14px; border: 1px solid #ECEDEF; border-radius: 13px; background: #F8F8F9; }
.default-copy { min-width: 0; }
.default-title, .default-desc { display: block; }
.default-title { color: #22242A; font-size: 14px; font-weight: 650; }
.default-desc { margin-top: 4px; color: #8A8D94; font-size: 11px; }
.form-error { display: flex; align-items: flex-start; gap: 7px; padding: 11px 12px; border: 1px solid #F1D7D4; border-radius: 11px; color: #9B2C25; background: #FFF8F7; font-size: 12px; line-height: 18px; }
.save-btn { display: flex; width: min(100%, 460px); height: 48px; align-items: center; justify-content: center; margin: 0; border: 0; border-radius: 13px; color: #FFFFFF; background: #D7192D; font-size: 15px; font-weight: 700; box-shadow: 0 8px 20px rgba(215, 25, 45, .18); }
.save-btn::after { border: 0; }
.save-btn[disabled] { color: #A8ABB2; background: #E7E8EB; box-shadow: none; }
@media screen and (min-width: 700px) {
  .form-page { padding-top: 8px; }
  .form-card { padding: 24px; gap: 22px; }
  .field-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
  .detail-input { height: 132px; }
}
</style>
