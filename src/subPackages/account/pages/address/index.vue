<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="selectMode ? '选择收货地址' : '收货地址'" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 28px">
        <view class="address-page">
          <view v-if="selectMode" class="select-notice">
            <AppIcon name="location" :size="17" color="#D7192D" />
            <text>请选择本次订单的收货地址</text>
          </view>

          <AppPageState
            :state="pageState"
            title="暂无收货地址"
            :description="stateDescription"
            :action-text="pageState === PageStatus.EMPTY ? '新增收货地址' : '重新加载'"
            icon-type="address"
            @retry="loadAddresses"
            @action="pageState === PageStatus.EMPTY ? openCreateForm() : loadAddresses()"
          >
            <template #illustration>
              <AppSvgIllustration :svg="noAddressSvg" size="lg" />
            </template>

            <template #default>
              <view class="address-list">
                <view
                  v-for="item in addressList"
                  :key="item.id"
                  class="address-card"
                  :class="{ 'is-default': item.isDefault, 'is-selectable': selectMode }"
                  @click="selectAddress(item)"
                >
                  <view class="address-marker">
                    <AppIcon name="location" :size="21" />
                  </view>
                  <view class="card-main">
                    <view class="card-header">
                      <text class="contact-name">{{ item.name }}</text>
                      <text class="contact-phone">{{ item.phone }}</text>
                      <text v-if="item.isDefault" class="default-tag">默认</text>
                    </view>
                    <text class="address-detail">{{ item.fullAddress }}</text>
                  </view>
                  <AppIcon v-if="selectMode" name="chevron-right" :size="18" color="#A2A5AC" />
                  <view v-else class="card-actions" @click.stop>
                    <button class="action-btn" @click="openEditForm(item)">编辑</button>
                    <button v-if="!item.isDefault" class="action-btn" @click="setDefault(item)">设为默认</button>
                    <button class="action-btn danger" @click="removeAddress(item)">删除</button>
                  </view>
                </view>
              </view>
            </template>
          </AppPageState>
        </view>
      </AppContent>
    </template>

    <template #footer>
      <FixedActionBar>
        <button class="add-address-btn" @click="openCreateForm">
          <AppIcon name="plus" :size="18" color="#FFFFFF" />
          <text>新增收货地址</text>
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>

  <view v-if="formVisible" class="form-mask" @click="closeForm">
    <view class="form-panel" @click.stop>
      <view class="form-header">
        <view>
          <text class="form-title">{{ editingId ? '编辑收货地址' : '新增收货地址' }}</text>
          <text class="form-subtitle">用于物流配送及订单地址快照</text>
        </view>
        <button class="close-btn" aria-label="关闭" @click="closeForm">
          <AppIcon name="close" :size="20" />
        </button>
      </view>

      <scroll-view class="form-scroll" scroll-y :show-scrollbar="false">
        <view class="form-body">
          <view class="field-grid">
            <label class="field-item">
              <text class="field-label">收货人</text>
              <input v-model="form.name" class="field-input" maxlength="30" placeholder="请输入姓名" />
            </label>
            <label class="field-item">
              <text class="field-label">联系电话</text>
              <input v-model="form.phone" class="field-input" type="number" maxlength="20" placeholder="请输入手机号或座机" />
            </label>
          </view>

          <picker mode="region" :value="regionValue" @change="handleRegionChange">
            <view class="field-item region-field">
              <text class="field-label">所在地区</text>
              <view class="region-value" :class="{ placeholder: !hasRegion }">
                <text>{{ hasRegion ? regionValue.join(' / ') : '请选择省、市、区' }}</text>
                <AppIcon name="chevron-right" :size="17" color="#999CA3" />
              </view>
            </view>
          </picker>

          <label class="field-item">
            <text class="field-label">详细地址</text>
            <textarea
              v-model="form.detail"
              class="detail-input"
              maxlength="120"
              placeholder="街道、门牌号、楼栋房间等"
            />
          </label>

          <view class="default-row" @click="form.isDefault = !form.isDefault">
            <view>
              <text class="default-title">设为默认地址</text>
              <text class="default-desc">结算时优先使用该地址</text>
            </view>
            <switch :checked="form.isDefault" color="#D7192D" @change="form.isDefault = $event.detail.value" />
          </view>
        </view>
      </scroll-view>

      <view class="form-footer">
        <button class="cancel-btn" :disabled="saving" @click="closeForm">取消</button>
        <button class="save-btn" :disabled="saving" @click="saveAddress">
          {{ saving ? '保存中…' : '保存地址' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import {
  createAddress,
  deleteAddress,
  getAddressList,
  setDefaultAddress,
  updateAddress,
} from '../../api/addressApi.js'
import noAddressSvg from '../../../../shared/assets/illustrations/no-address.svg?raw'
import { navigator } from '@/app/navigation/navigator.js'

const addressList = ref([])
const pageState = ref(PageStatus.LOADING)
const loadError = ref('')
const selectMode = ref(false)
const formVisible = ref(false)
const editingId = ref(0)
const saving = ref(false)

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

const stateDescription = computed(() => (
  pageState.value === PageStatus.ERROR
    ? (loadError.value || '地址加载失败，请稍后重试')
    : '新增地址后即可用于物流配送'
))
const regionValue = computed(() => [form.province, form.city, form.district])
const hasRegion = computed(() => Boolean(form.province && form.city))

onLoad((options = {}) => {
  const mode = String(options.selectMode || '')
  selectMode.value = Boolean(mode) && mode !== '0' && mode !== 'false'
})

onShow(loadAddresses)

async function loadAddresses() {
  pageState.value = PageStatus.LOADING
  loadError.value = ''
  try {
    addressList.value = await getAddressList()
    pageState.value = addressList.value.length ? PageStatus.CONTENT : PageStatus.EMPTY
  } catch (error) {
    loadError.value = error?.message || '地址加载失败，请稍后重试'
    pageState.value = PageStatus.ERROR
  }
}

function selectAddress(item) {
  if (!selectMode.value) return
  emitSelectedAddress(item)
}

function emitSelectedAddress(item) {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  currentPage?.getOpenerEventChannel?.()?.emit('addressSelected', item)
  navigator.back()
}

function resetForm(address = null) {
  Object.assign(form, emptyForm(), address || {})
  editingId.value = Number(address?.id) || 0
}

function openCreateForm() {
  resetForm({ isDefault: addressList.value.length === 0 })
  formVisible.value = true
}

function openEditForm(item) {
  resetForm(item)
  formVisible.value = true
}

function closeForm() {
  if (saving.value) return
  formVisible.value = false
}

function handleRegionChange(event) {
  const values = event.detail?.value || []
  form.province = values[0] || ''
  form.city = values[1] || ''
  form.district = values[2] || ''
}

function validateForm() {
  if (!form.name.trim()) return '请输入收货人姓名'
  if (!form.phone.trim()) return '请输入联系电话'
  if (!hasRegion.value) return '请选择所在地区'
  if (!form.detail.trim()) return '请输入详细地址'
  return ''
}

async function saveAddress() {
  const validationMessage = validateForm()
  if (validationMessage) {
    uni.showToast({ title: validationMessage, icon: 'none' })
    return
  }

  saving.value = true
  try {
    const payload = { ...form, id: editingId.value }
    const savedId = editingId.value
      ? (await updateAddress(payload), editingId.value)
      : Number(await createAddress(payload))
    formVisible.value = false
    await loadAddresses()
    uni.showToast({ title: editingId.value ? '地址已更新' : '地址已新增', icon: 'success' })

    if (selectMode.value && savedId) {
      const saved = addressList.value.find(item => item.id === savedId)
      if (saved) emitSelectedAddress(saved)
    }
  } catch (error) {
    uni.showToast({ title: error?.message || '地址保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function setDefault(item) {
  try {
    await setDefaultAddress(item.id)
    await loadAddresses()
    uni.showToast({ title: '已设为默认地址', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error?.message || '设置失败', icon: 'none' })
  }
}

function removeAddress(item) {
  uni.showModal({
    title: '删除收货地址',
    content: `确认删除 ${item.name} 的收货地址？`,
    success: async (result) => {
      if (!result.confirm) return
      try {
        await deleteAddress(item.id)
        await loadAddresses()
        uni.showToast({ title: '地址已删除', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error?.message || '删除失败', icon: 'none' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.address-page {
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
}

.select-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 11px 13px;
  border: 1px solid #F1D7DB;
  border-radius: 12px;
  color: #8B2433;
  background: #FFF7F8;
  font-size: 13px;
}

.address-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.address-card {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 16px;
  border: 1px solid #E7E8EC;
  border-radius: 16px;
  background: #FFFFFF;
  box-sizing: border-box;

  &.is-default {
    border-color: rgba(215, 25, 45, 0.28);
  }

  &.is-selectable {
    grid-template-columns: 42px minmax(0, 1fr) 18px;
  }
}

.address-marker {
  display: flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #D7192D;
  background: #FFF1F3;
}

.card-main {
  min-width: 0;
}

.card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.contact-name {
  color: #111216;
  font-size: 15px;
  font-weight: 650;
}

.contact-phone {
  color: #656871;
  font-size: 13px;
}

.default-tag {
  padding: 2px 7px;
  border-radius: 999px;
  color: #D7192D;
  background: #FFF0F2;
  font-size: 10px;
}

.address-detail {
  display: block;
  margin-top: 7px;
  color: #4F525A;
  font-size: 13px;
  line-height: 20px;
}

.card-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 2px;
  padding-top: 12px;
  border-top: 1px solid #F0F1F3;
}

.action-btn,
.close-btn,
.cancel-btn,
.save-btn,
.add-address-btn {
  margin: 0;

  &::after {
    border: 0;
  }
}

.action-btn {
  min-height: 32px;
  padding: 0 10px;
  border: 0;
  color: #62656D;
  background: transparent;
  font-size: 12px;

  &.danger {
    color: #B42318;
  }
}

.add-address-btn {
  display: flex;
  width: min(100%, 420px);
  height: 46px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 12px;
  color: #FFFFFF;
  background: #D7192D;
  font-size: 15px;
  font-weight: 650;
}

.form-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-top: env(safe-area-inset-top);
  background: rgba(17, 18, 22, 0.42);
}

.form-panel {
  display: flex;
  width: 100%;
  max-height: min(88vh, 720px);
  flex-direction: column;
  overflow: hidden;
  border-radius: 20px 20px 0 0;
  background: #FFFFFF;
}

.form-header,
.form-footer {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
}

.form-header {
  border-bottom: 1px solid #EFF0F2;
}

.form-title,
.form-subtitle {
  display: block;
}

.form-title {
  color: #111216;
  font-size: 17px;
  font-weight: 650;
}

.form-subtitle {
  margin-top: 3px;
  color: #8A8D94;
  font-size: 11px;
}

.close-btn {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: #555860;
  background: #F4F5F7;
}

.form-scroll {
  min-height: 0;
  flex: 1;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.field-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.field-item {
  display: block;
}

.field-label {
  display: block;
  margin-bottom: 7px;
  color: #34363C;
  font-size: 13px;
  font-weight: 550;
}

.field-input,
.region-value,
.detail-input {
  width: 100%;
  border: 1px solid #E2E4E8;
  border-radius: 11px;
  color: #111216;
  background: #FAFAFB;
  box-sizing: border-box;
  font-size: 14px;
}

.field-input,
.region-value {
  height: 44px;
  padding: 0 12px;
}

.region-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  &.placeholder {
    color: #A2A5AC;
  }
}

.detail-input {
  height: 92px;
  padding: 11px 12px;
  line-height: 20px;
}

.default-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 14px;
  border-radius: 12px;
  background: #F7F8FA;
}

.default-title,
.default-desc {
  display: block;
}

.default-title {
  color: #22242A;
  font-size: 14px;
  font-weight: 550;
}

.default-desc {
  margin-top: 3px;
  color: #8A8D94;
  font-size: 11px;
}

.form-footer {
  border-top: 1px solid #EFF0F2;
  padding-bottom: calc(14px + env(safe-area-inset-bottom));
}

.cancel-btn,
.save-btn {
  height: 44px;
  flex: 1;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 600;
}

.cancel-btn {
  border: 1px solid #DFE1E5;
  color: #555860;
  background: #FFFFFF;
}

.save-btn {
  border: 0;
  color: #FFFFFF;
  background: #D7192D;
}

@media screen and (min-width: 800px) {
  .address-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-mask {
    align-items: center;
    padding: 32px;
  }

  .form-panel {
    max-width: 640px;
    border-radius: 20px;
  }

  .field-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
