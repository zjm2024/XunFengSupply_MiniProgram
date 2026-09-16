﻿<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="selectMode ? '选择收货地址' : '收货地址'" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 28px">
        <view class="address-page">
          <view v-if="selectMode" class="select-notice">
            <AppIcon name="location" :size="17" color="#4F6475" />
            <text>选择后将返回确认订单页</text>
          </view>

          <AppPageState
            :state="pageState"
            title="暂无收货地址"
            :description="stateDescription"
            :action-text="pageState === PageStatus.EMPTY ? '新增收货地址' : '重新加载'"
            icon-type="address"
            @retry="loadAddresses"
            @action="pageState === PageStatus.EMPTY ? openAddressForm() : loadAddresses()"
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
                  hover-class="address-card--pressed"
                  @tap="selectAddress(item)"
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
                  <button v-else class="manage-btn" aria-label="管理地址" @tap.stop="manageAddress(item)">
                    <AppIcon name="more-v" :size="20" color="#5F646C" />
                  </button>
                </view>
              </view>
            </template>
          </AppPageState>
        </view>
      </AppContent>
    </template>

    <template #footer>
      <FixedActionBar v-if="pageState !== PageStatus.EMPTY">
        <button class="add-address-btn" @tap="openAddressForm()">
          <AppIcon name="plus" :size="18" color="#FFFFFF" />
          <text>新增收货地址</text>
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { deleteAddress, getAddressList, setDefaultAddress } from '../../api/addressApi.js'
import noAddressSvg from '../../../../shared/assets/illustrations/no-address.svg?raw'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const addressList = ref([])
const pageState = ref(PageStatus.LOADING)
const loadError = ref('')
const selectMode = ref(false)
const pendingSavedAddressId = ref(0)
const returningSelection = ref(false)

const stateDescription = computed(() => (
  pageState.value === PageStatus.ERROR
    ? (loadError.value || '地址加载失败，请稍后重试')
    : '新增地址后即可用于订单配送'
))

onLoad((options = {}) => {
  const mode = String(options.selectMode || '')
  selectMode.value = Boolean(mode) && mode !== '0' && mode !== 'false'
})

onShow(async () => {
  await loadAddresses()
  if (!selectMode.value || !pendingSavedAddressId.value || returningSelection.value) return
  const saved = addressList.value.find(address => Number(address.id) === pendingSavedAddressId.value)
  pendingSavedAddressId.value = 0
  if (saved) await emitSelectedAddress(saved)
})

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

async function selectAddress(item) {
  if (selectMode.value) await emitSelectedAddress(item)
}

async function emitSelectedAddress(item) {
  if (returningSelection.value) return
  returningSelection.value = true
  const pages = getCurrentPages()
  pages[pages.length - 1]?.getOpenerEventChannel?.()?.emit('addressSelected', item)
  await navigator.back()
}

function openAddressForm(item = null) {
  navigator.navigateTo(
    routes.account.addressForm({
      addressId: item?.id || undefined,
      selectMode: selectMode.value ? 1 : undefined,
    }),
    {
      events: {
        addressSaved: async (savedAddress) => {
          if (selectMode.value && savedAddress?.id) {
            pendingSavedAddressId.value = Number(savedAddress.id)
          }
        },
      },
    },
  )
}

function manageAddress(item) {
  const actions = [
    { label: '编辑地址', handler: () => openAddressForm(item) },
    ...(!item.isDefault ? [{ label: '设为默认地址', handler: () => setDefault(item) }] : []),
    { label: '删除地址', handler: () => removeAddress(item) },
  ]
  uni.showActionSheet({
    itemList: actions.map(action => action.label),
    success: result => actions[result.tapIndex]?.handler(),
  })
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
.address-page { width: 100%; max-width: var(--content-max-width, 1120px); margin: 0 auto; }
.select-notice { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 12px 14px; border-radius: var(--radius-card); color: var(--type-secondary-color); background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); font-size: var(--type-body-small-size); }
.address-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.address-card { display: grid; grid-template-columns: 44px minmax(0, 1fr) 38px; gap: 13px; align-items: center; min-height: 94px; padding: 16px; border-radius: var(--radius-card); background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-sizing: border-box; }
.address-card.is-default { background: rgba(255, 255, 255, 0.85); }
.address-card.is-selectable { grid-template-columns: 44px minmax(0, 1fr) 18px; }
.address-card--pressed { opacity: .76; transform: scale(.994); }
.address-marker { display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; border-radius: var(--radius-control); color: var(--type-secondary-color); background: var(--surface-subtle); }
.card-main { min-width: 0; }
.card-header { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.contact-name { color: var(--type-title-color); font-size: var(--type-label-size); font-weight: 700; }
.contact-phone { color: var(--type-secondary-color); font-size: var(--type-body-small-size); }
.default-tag { padding: 2px 8px; border-radius: var(--radius-full); color: var(--type-secondary-color); background: var(--surface-subtle); font-size: var(--type-micro-size); }
.address-detail { display: block; margin-top: 8px; color: var(--type-secondary-color); font-size: var(--type-body-small-size); line-height: 20px; }
.manage-btn { display: flex; width: 38px; height: 38px; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: 50%; background: var(--surface-subtle); }
.manage-btn::after, .add-address-btn::after { border: 0; }
.add-address-btn { display: flex; width: min(100%, 460px); height: 48px; align-items: center; justify-content: center; gap: 8px; margin: 0 auto; border: 0; border-radius: var(--radius-card); color: #FFFFFF; background: var(--color-brand); font-size: var(--type-button-size); font-weight: 700; }
@media screen and (min-width: 760px) {
  .address-list { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
}
</style>
