﻿<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('account.titles.subAccounts')" :show-back="true" />
    </template>

    <template #content>
      <AppContent
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="handleRefresh"
        @refresherrestore="handleRefresherRestore"
        @refresherabort="handleRefresherRestore"
        @scrolltolower="loadMore"
      >
        <view class="content">
          <!-- 加载中状态 -->
          <AppPageState
            v-if="loading && accountList.length === 0"
            state="loading"
          />

          <!-- 空状态 -->
          <AppPageState
            v-else-if="!loading && accountList.length === 0"
            state="empty"
            :title="t('account.subAccounts.empty')"
            :description="t('account.subAccounts.emptyHint')"
          />

          <template v-else>
            <!-- 账户统计 -->
            <view class="stats-card">
              <text class="stats-title">{{ t('account.subAccounts.overview') }}</text>
              <view class="stats-grid">
                <view class="stat-item">
                  <text class="stat-value">{{ totalCount }}</text>
                  <text class="stat-label">{{ t('account.subAccounts.total') }}</text>
                </view>
                <view class="stat-item">
                  <text class="stat-value">{{ activeCount }}</text>
                  <text class="stat-label">已激活</text>
                </view>
                <view class="stat-item">
                  <text class="stat-value">{{ inactiveCount }}</text>
                  <text class="stat-label">已停用</text>
                </view>
              </view>
            </view>

            <!-- 子账户列表 -->
            <view class="section-card">
              <text class="section-title">{{ t('account.subAccounts.list') }}</text>

              <view v-for="item in accountList" :key="item.id" class="account-item">
                <view class="account-main">
                  <view class="account-header">
                    <view class="avatar-wrapper">
                      <text class="avatar-text">{{ item.name ? item.name.charAt(0) : '?' }}</text>
                    </view>
                    <view class="account-info">
                      <text class="account-name">{{ item.name || item.username }}</text>
                      <text class="account-role">{{ item.username }}</text>
                    </view>
                    <StatusTag
                      :type="item.status === 'active' ? 'success' : 'default'"
                      :text="item.status === 'active' ? '正常' : '停用'"
                    />
                  </view>

                  <view class="account-details">
                    <view class="detail-row">
                      <text class="detail-label">{{ t('account.subAccounts.username') }}</text>
                      <text class="detail-value">{{ item.username }}</text>
                    </view>
                    <view v-if="item.phone" class="detail-row">
                      <text class="detail-label">{{ t('account.subAccounts.phone') }}</text>
                      <text class="detail-value">{{ item.phone }}</text>
                    </view>
                    <view class="detail-row">
                      <text class="detail-label">{{ t('account.subAccounts.permissions') }}</text>
                      <view class="permission-tags">
                        <text
                          v-for="perm in item.permissions"
                          :key="perm"
                          class="permission-tag"
                        >{{ permissionLabel(perm) }}</text>
                      </view>
                    </view>
                    <view class="detail-row">
                      <text class="detail-label">{{ t('account.subAccounts.createdAt') }}</text>
                      <text class="detail-value">{{ item.createdAt || '—' }}</text>
                    </view>
                  </view>
                </view>

                <view class="account-actions">
                  <button class="action-btn" :disabled="isReadOnly" @click="editAccount(item)">{{ t('account.subAccounts.edit') }}</button>
                  <button
                    v-if="item.status === 'active'"
                    class="action-btn warning"
                    :disabled="isReadOnly"
                    @click="toggleStatus(item)"
                  >{{ t('account.subAccounts.disable') }}</button>
                  <button
                    v-else
                    class="action-btn success"
                    :disabled="isReadOnly"
                    @click="toggleStatus(item)"
                  >{{ t('account.subAccounts.enable') }}</button>
                </view>
              </view>
            </view>
            <AppLoadMore :status="loadMoreStatus" @retry="loadMore" />
          </template>

          <!-- 新增按钮 -->
          <text v-if="isReadOnly" class="readonly-hint">{{ t('account.subAccounts.readonly') }}</text>
          <button class="add-btn" :disabled="isReadOnly" @click="addAccount">
            <text class="add-icon">+</text>
            <text>{{ t('account.subAccounts.add') }}</text>
          </button>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import { getSubAccountList, toggleSubAccountStatus } from '../../api/subAccount.js'
import { routes } from '@/app/config/routes.js'
import { navigator } from '@/app/navigation/navigator.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'

const accountList = ref([])
const userStore = useUserStore()
const loading = ref(false)
const isRefreshing = ref(false)

const totalCount = ref(0)
const activeCount = computed(() => accountList.value.filter(a => a.status === 'active').length)
const inactiveCount = computed(() => accountList.value.filter(a => a.status === 'inactive').length)
const isReadOnly = computed(() => userStore.isFrozen)
const pageNum = ref(1)
const pageSize = 20
const hasMore = ref(true)
const loadingMore = ref(false)
const loadMoreError = ref(false)
const loadMoreStatus = computed(() => {
  if (loadMoreError.value) return 'error'
  if (loadingMore.value) return 'loading'
  if (!hasMore.value) return 'no-more'
  return 'idle'
})

onShow(() => {
  loadSubAccounts()
})

/**
 * 加载子账号列表
 */
async function loadSubAccounts({ reset = true } = {}) {
  if (reset) {
    loading.value = true
    pageNum.value = 1
    accountList.value = []
    totalCount.value = 0
    hasMore.value = true
    loadMoreError.value = false
  } else {
    if (loading.value || loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    pageNum.value += 1
    loadMoreError.value = false
  }
  try {
    const result = await getSubAccountList({ pageNum: pageNum.value, pageSize })
    const items = result.items || []
    accountList.value = reset ? items : [...accountList.value, ...items]
    totalCount.value = Number(result.totalCount || accountList.value.length)
    hasMore.value = accountList.value.length < totalCount.value
    loadMoreError.value = false
  } catch (err) {
    if (!reset) {
      pageNum.value = Math.max(1, pageNum.value - 1)
      loadMoreError.value = true
    }
    console.error('[SubAccount] 加载子账号列表失败:', err)
    if (reset) uni.showToast({ title: t('account.subAccounts.loadFailed'), icon: 'none' })
  } finally {
    if (reset) loading.value = false
    else loadingMore.value = false
  }
}

function loadMore() {
  loadSubAccounts({ reset: false })
}

async function handleRefresh() {
  if (isRefreshing.value) return
  const startedAt = Date.now()
  isRefreshing.value = true
  try {
    await loadSubAccounts()
  } finally {
    await waitForRefreshAnimation(startedAt)
    isRefreshing.value = false
  }
}

function handleRefresherRestore() {
  if (!loading.value) isRefreshing.value = false
}

/** 仅翻译已知权限的显示名称，未知权限码原样返回。 */
function permissionLabel(code) {
  return {
    ORDER_VIEW: t('account.permissions.viewOrders'),
    ORDER_CREATE: t('account.permissions.createOrders'),
    BALANCE_VIEW: t('account.permissions.balance'),
    INVENTORY_VIEW: t('account.permissions.viewInventory'),
    SUB_ACCOUNT_MANAGE: t('account.permissions.manageAccounts'),
    COMBINATION_PAY_PARTICIPATE: t('account.permissions.combinedPayment'),
    PUBLIC_STOCK_SHARE: t('account.permissions.publicStockShare'),
    RETAIL_SHARE_CREATE: t('account.permissions.retailShareCreate'),
    RETAIL_SHARE_VIEW: t('account.permissions.retailShareView'),
    RETAIL_SHARE_REVOKE: t('account.permissions.retailShareRevoke'),
  }[code] || code
}

/**
 * 跳转到新增子账户页面
 */
function addAccount() {
  if (isReadOnly.value) return
  navigator.navigateTo(routes.account.subAccountForm())
}

/**
 * 跳转到编辑子账户页面
 */
function editAccount(account) {
  if (isReadOnly.value) return
  navigator.navigateTo(routes.account.subAccountForm({
    accountId: account.id,
    username: account.username,
    realName: account.name !== account.username ? account.name : '',
    mobile: account.phone || '',
    status: account.status,
    permissions: JSON.stringify(account.permissions || []),
    version: account.version == null ? '' : String(account.version),
    shareVersion: account.shareVersion || '',
  }))
}

/**
 * 切换子账号状态（启用/停用）
 */
async function toggleStatus(account) {
  if (isReadOnly.value) return
  const action = account.status === 'active' ? 'disable' : 'enable'
  if (!await openAppDialog({
    confirmText: t('common.confirm'),
    cancelText: t('common.cancel'),
    title: t('account.subAccounts.confirmAction', { action: t('account.subAccounts.' + action) }),
    description: t('account.subAccounts.actionContent', { action: t('account.subAccounts.' + action), name: account.name || account.username }),
  })) return
  try {
    await toggleSubAccountStatus({ subAccountId: account.id, active: account.status !== 'active' })
    uni.showToast({ title: t('account.subAccounts.' + action + 'Success'), icon: 'success' })
    await loadSubAccounts()
  } catch (err) {
    console.error('[SubAccount] 切换状态失败:', err)
    uni.showToast({ title: err.message || t('account.subAccounts.retryFailed'), icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.content {
}

/* 统计卡片 */
.stats-card,
.section-card {
  background: var(--glass-card-background, rgba(255,255,255,.74));
  border-radius: var(--radius-card, 14px);
  padding: var(--module-padding, 16px);
  margin-bottom: 12px;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

.stats-title,
.section-title {
  font-size: var(--type-card-title-size, 16px);
  font-weight: var(--font-weight-semibold, 600);
  color: #111216;
  display: block;
  margin-bottom: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-item {
  background: #F7F7F8;
  border-radius: var(--radius-small, 8px);
  padding: 12px;
  text-align: center;
}

.stat-value {
  font-size: var(--type-heading-size, 24px);
  font-weight: var(--font-weight-bold, 700);
  color: #D7192D;
  display: block;
  line-height: 1.2;
}

.stat-label {
  font-size: var(--type-caption-size, 12px);
  color: #5E626B;
  display: block;
  margin-top: 4px;
}

/* 账户列表 */
.account-item {
  padding: 14px 0;
  border-bottom: 1px solid #F5F5F6;

  &:last-of-type {
    border-bottom: none;
  }
}

.account-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.avatar-wrapper {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #D7192D, #E8384F);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: var(--type-card-title-size, 16px);
  font-weight: var(--font-weight-semibold, 600);
  color: white;
}

.account-info {
  flex: 1;
}

.account-name {
  font-size: var(--type-label-size, 15px);
  font-weight: var(--font-weight-semibold, 600);
  color: #111216;
  display: block;
}

.account-role {
  font-size: var(--type-caption-size, 12px);
  color: #5E626B;
  display: block;
  margin-top: 2px;
}

.account-details {
  padding-left: 48px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  padding: 4px 0;

  &:first-child {
    padding-top: 0;
  }
}

.detail-label {
  width: 80px;
  padding-right: 8px;
  box-sizing: border-box;
  font-size: var(--type-body-small-size, 13px);
  color: #5E626B;
  flex-shrink: 0;
}

.detail-value {
  font-size: var(--type-body-small-size, 13px);
  color: #111216;
}

.permission-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.permission-tag {
  padding: 2px 7px;
  background: #FEF3F4;
  color: #D7192D;
  font-size: var(--type-caption-size, 12px);
  border-radius: 4px;
}

.account-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #F5F5F6;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 10px;
  background: transparent;
  border: none;
  color: #5E626B;
  font-size: var(--type-body-small-size, 13px);

  &.warning { color: #F59E0B; }
  &.success { color: #059669; }
  &.danger { color: #B42318; }

  &:active { opacity: 0.7; }
}

.action-btn[disabled],
.add-btn[disabled] {
  opacity: 0.45;
}

.readonly-hint {
  display: block;
  margin: 14px 4px 0;
  color: #B76500;
  font-size: var(--type-caption-size, 12px);
  line-height: 18px;
}

/* 新增按钮 */
.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 44px;
  margin-top: 12px;
  background: transparent;
  border: 1px dashed #DEDFE3;
  border-radius: 8px;
  color: #5E626B;
  font-size: var(--type-body-size, 14px);

  &:active {
    background: rgba(0, 0, 0, 0.02);
  }
}

.add-icon {
  font-size: var(--type-section-title-size, 18px);
  font-weight: var(--font-weight-regular, 400);
}

.bottom-spacer {
  height: 24px;
}

/* 金额按实际可用宽度缩字，父布局允许收缩。 */
.account-details, .detail-value { min-width: 0; }
.balance-values { display: flex; flex: 1; flex-wrap: wrap; gap: 4px 10px; }
.balance-values .amount-text { font-size: inherit; }

/* 列表行内操作统一尺寸，底栏/表单主操作不应用此规则。 */
.action-btn,.empty-action{min-width:var(--list-action-min-width,72px);height:var(--list-action-height,32px);min-height:var(--list-action-height,32px);padding:0 10px;border-radius:var(--list-action-radius,8px);font-size:var(--list-action-font-size,12px);line-height: 20px;box-sizing:border-box;}

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.stats-card, .section-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
</style>
