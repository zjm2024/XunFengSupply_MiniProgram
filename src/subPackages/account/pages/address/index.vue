﻿<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="selectMode ? t('account.titles.selectAddress') : t('account.titles.address')" :show-back="true" />
    </template>

    <template #content>
      <AppContent
        padding="16px var(--page-padding-x, 16px) 28px"
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="handleRefresh"
        @refresherrestore="handleRefresherRestore"
        @refresherabort="handleRefresherRestore"
        @scrolltolower="loadMore"
      >
        <view class="address-page">
          <view v-if="selectMode" class="select-notice">
            <AppIcon name="location" :size="17" color="#4F6475" />
            <text>{{ t('account.address.selectionHint') }}</text>
          </view>

          <AppPageState
            :state="pageState"
            :title="t('account.address.empty')"
            :description="stateDescription"
            :action-text="pageState === PageStatus.EMPTY ? t('account.address.add') : t('account.address.reload')"
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
                      <text v-if="item.isDefault" class="default-tag">{{ t('account.address.default') }}</text>
                    </view>
                    <text class="address-detail">{{ item.fullAddress }}</text>
                  </view>
                  <AppIcon v-if="selectMode" name="chevron-right" :size="18" color="#A2A5AC" />
                  <button v-else class="manage-btn" :aria-label="t('account.address.manage')" @tap.stop="manageAddress(item)">
                    <AppIcon name="more-v" :size="20" color="#5F646C" />
                  </button>
                </view>
              </view>
              <AppLoadMore :status="loadMoreStatus" @retry="loadMore" />
            </template>
          </AppPageState>
        </view>
      </AppContent>
    </template>

    <template #overlay>
      <ConfirmPopup
        v-model="manageVisible"
        :title="t('account.address.manage')"
        :show-cancel="false"
        :confirm-text="t('common.cancel')"
        @confirm="manageVisible = false"
      >
        <view class="address-actions">
          <button v-for="action in addressActions" :key="action.key"
            class="address-action" :class="{ 'is-danger': action.key === 'delete' }"
            @tap="selectAddressAction(action.key)">{{ action.label }}</button>
        </view>
      </ConfirmPopup>
    </template>

    <template #footer>
      <FixedActionBar v-if="pageState !== PageStatus.EMPTY">
        <button class="add-address-btn" @tap="openAddressForm()">
          <AppIcon name="plus" :size="18" color="#FFFFFF" />
          <text>{{ t('account.address.add') }}</text>
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { deleteAddress, getAddressList, setDefaultAddress } from '../../api/addressApi.js'
import noAddressSvg from '../../../../shared/assets/illustrations/no-address.svg?raw'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'

const addressList = ref([])
const pageState = ref(PageStatus.LOADING)
const loadError = ref(null)
const managedAddress = ref(null)
const manageVisible = ref(false)
const selectMode = ref(false)
const pendingSavedAddressId = ref(0)
const returningSelection = ref(false)
const isRefreshing = ref(false)
const pageNum = ref(1)
const pageSize = 20
const totalCount = ref(0)
const hasMore = ref(true)
const loadingMore = ref(false)
const loadMoreError = ref(false)
const loadMoreStatus = computed(() => {
  if (loadMoreError.value) return 'error'
  if (loadingMore.value) return 'loading'
  if (!hasMore.value) return 'no-more'
  return 'idle'
})

const stateDescription = computed(() => (
  pageState.value === PageStatus.ERROR
    ? (loadError.value?.message || t('account.address.loadFailed'))
    : t('account.address.emptyHint')
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

/** 按原分页参数加载地址，保留错误对象供展示重新取词。 */
async function loadAddresses() {
  pageState.value = PageStatus.LOADING
  loadError.value = null
  pageNum.value = 1
  totalCount.value = 0
  hasMore.value = true
  loadMoreError.value = false
  try {
    const result = await getAddressList({ pageNum: 1, pageSize })
    addressList.value = result.items
    totalCount.value = result.totalCount
    hasMore.value = addressList.value.length < totalCount.value
    pageState.value = addressList.value.length ? PageStatus.CONTENT : PageStatus.EMPTY
  } catch (error) {
    loadError.value = error
    pageState.value = PageStatus.ERROR
  }
}

async function loadMore() {
  if (loadingMore.value || pageState.value === PageStatus.LOADING || !hasMore.value) return
  loadingMore.value = true
  loadMoreError.value = false
  const nextPage = pageNum.value + 1
  try {
    const result = await getAddressList({ pageNum: nextPage, pageSize })
    addressList.value = [...addressList.value, ...result.items]
    pageNum.value = nextPage
    totalCount.value = result.totalCount
    hasMore.value = addressList.value.length < totalCount.value
  } catch (error) {
    loadMoreError.value = true
  } finally {
    loadingMore.value = false
  }
}

async function handleRefresh() {
  if (isRefreshing.value) return
  const startedAt = Date.now()
  isRefreshing.value = true
  try {
    await loadAddresses()
  } finally {
    await waitForRefreshAnimation(startedAt)
    isRefreshing.value = false
  }
}

function handleRefresherRestore() {
  if (pageState.value !== PageStatus.LOADING) isRefreshing.value = false
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

/** 打开地址操作菜单；保留地址对象和操作标识，语言切换不重发请求。 */
function manageAddress(item) {
  managedAddress.value = item
  manageVisible.value = true
}

const addressActions = computed(() => [
  { key: 'edit', label: t('account.address.edit') },
  ...(!managedAddress.value?.isDefault ? [{ key: 'default', label: t('account.address.setDefault') }] : []),
  { key: 'delete', label: t('account.address.delete') },
])

/** 关闭菜单后分发一次用户主动选择的地址操作。 */
function selectAddressAction(key) {
  const item = managedAddress.value
  manageVisible.value = false
  if (!item) return
  if (key === 'edit') openAddressForm(item)
  if (key === 'default') setDefault(item)
  if (key === 'delete') return removeAddress(item)
}

/** 提交用户选择的地址 ID 并刷新地址列表。 */
async function setDefault(item) {
  try {
    await setDefaultAddress(item.id)
    await loadAddresses()
    uni.showToast({ title: t('account.address.defaultSaved'), icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error?.message || t('account.address.defaultFailed'), icon: 'none' })
  }
}

/** 用户确认后删除原地址 ID，取消时不提交。 */
async function removeAddress(item) {
  if (!await openAppDialog({
    confirmText: t('common.confirm'),
    cancelText: t('common.cancel'),
    title: t('account.address.deleteTitle'),
    description: t('account.address.deleteContent', { name: item.name }),
  })) return
  try {
    await deleteAddress(item.id)
    await loadAddresses()
    uni.showToast({ title: t('account.address.deleted'), icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error?.message || t('account.address.deleteFailed'), icon: 'none' })
  }
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
.address-actions { display: grid; gap: 10px; }
.address-action { width: 100%; margin: 0; padding: 12px; border-radius: var(--radius-control); background: var(--surface-subtle); color: var(--type-body-color); font-size: var(--type-body-size); line-height: 1.5; }
.address-action::after { border: 0; }
.address-action.is-danger { color: var(--danger-color); }
@media screen and (min-width: 760px) {
  .address-list { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
}
</style>
