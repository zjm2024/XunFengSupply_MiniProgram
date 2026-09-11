﻿﻿﻿﻿﻿<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="子账户管理" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
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
            title="暂无子账户"
            description="您可以添加子账户来分配不同权限"
          />

          <template v-else>
            <!-- 账户统计 -->
            <view class="stats-card">
              <text class="stats-title">账户概览</text>
              <view class="stats-grid">
                <view class="stat-item">
                  <text class="stat-value">{{ totalCount }}</text>
                  <text class="stat-label">总账户数</text>
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
              <text class="section-title">子账户列表</text>

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
                      <text class="detail-label">账号</text>
                      <text class="detail-value">{{ item.username }}</text>
                    </view>
                    <view v-if="item.phone" class="detail-row">
                      <text class="detail-label">手机</text>
                      <text class="detail-value">{{ item.phone }}</text>
                    </view>
                    <view class="detail-row">
                      <text class="detail-label">权限</text>
                      <view class="permission-tags">
                        <text
                          v-for="perm in item.permissions"
                          :key="perm"
                          class="permission-tag"
                        >{{ perm }}</text>
                      </view>
                    </view>
                    <view class="detail-row">
                      <text class="detail-label">创建时间</text>
                      <text class="detail-value">{{ item.createdAt }}</text>
                    </view>
                  </view>
                </view>

                <view class="account-actions">
                  <button class="action-btn" @click="editAccount(item)">编辑</button>
                  <button
                    v-if="item.status === 'active'"
                    class="action-btn warning"
                    @click="toggleStatus(item)"
                  >停用</button>
                  <button
                    v-else
                    class="action-btn success"
                    @click="toggleStatus(item)"
                  >启用</button>
                </view>
              </view>
            </view>
          </template>

          <!-- 新增按钮 -->
          <button class="add-btn" @click="addAccount">
            <text class="add-icon">+</text>
            <text>新增子账户</text>
          </button>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { getSubAccountList, toggleSubAccountStatus } from '../../api/subAccount.js'
import { SUB_ACCOUNT_FORM } from '@/app/config/routes.js'

const accountList = ref([])
const loading = ref(false)

const totalCount = computed(() => accountList.value.length)
const activeCount = computed(() => accountList.value.filter(a => a.status === 'active').length)
const inactiveCount = computed(() => accountList.value.filter(a => a.status === 'inactive').length)

onMounted(() => {
  loadSubAccounts()
})

/**
 * 加载子账号列表
 */
async function loadSubAccounts() {
  loading.value = true
  try {
    const result = await getSubAccountList({ pageNum: 1, pageSize: 50 })
    accountList.value = result.items || []
  } catch (err) {
    console.error('[SubAccount] 加载子账号列表失败:', err)
    uni.showToast({ title: '加载失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 跳转到新增子账户页面
 */
function addAccount() {
  uni.navigateTo({
    url: SUB_ACCOUNT_FORM,
  })
}

/**
 * 跳转到编辑子账户页面
 */
function editAccount(account) {
  const params = new URLSearchParams({
    accountId: account.id,
    username: account.username,
    realName: account.name !== account.username ? account.name : '',
    mobile: account.phone || '',
    status: account.status,
  }).toString()
  uni.navigateTo({
    url: `${SUB_ACCOUNT_FORM}?${params}`,
  })
}

/**
 * 切换子账号状态（启用/停用）
 */
async function toggleStatus(account) {
  const action = account.status === 'active' ? '停用' : '启用'
  uni.showModal({
    title: `确认${action}`,
    content: `确定要${action} ${account.name || account.username} 的账户吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await toggleSubAccountStatus({
            subAccountId: account.id,
            active: account.status !== 'active',
          })
          uni.showToast({ title: `已${action}`, icon: 'success' })
          await loadSubAccounts()
        } catch (err) {
          console.error('[SubAccount] 切换状态失败:', err)
          uni.showToast({ title: err.message || '操作失败，请重试', icon: 'none' })
        }
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.content {
}

/* 统计卡片 */
.stats-card,
.section-card {
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.stats-title,
.section-title {
  font-size: 16px;
  font-weight: 600;
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
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #D7192D;
  display: block;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
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
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.account-info {
  flex: 1;
}

.account-name {
  font-size: 15px;
  font-weight: 600;
  color: #111216;
  display: block;
}

.account-role {
  font-size: 12px;
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
  width: 60px;
  font-size: 13px;
  color: #5E626B;
  flex-shrink: 0;
}

.detail-value {
  font-size: 13px;
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
  font-size: 11px;
  border-radius: 4px;
}

.account-actions {
  display: flex;
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
  font-size: 13px;

  &.warning { color: #F59E0B; }
  &.success { color: #059669; }
  &.danger { color: #B42318; }

  &:active { opacity: 0.7; }
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
  font-size: 14px;

  &:active {
    background: rgba(0, 0, 0, 0.02);
  }
}

.add-icon {
  font-size: 18px;
  font-weight: 300;
}

.bottom-spacer {
  height: 24px;
}
</style>
