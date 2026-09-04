<template>
  <AppPageShell>
    <template #header>
      <app-header title="子账户管理" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <!-- 账户统计 -->
          <view class="stats-card">
            <text class="stats-title">账户概览</text>
            <view class="stats-grid">
              <view class="stat-item">
                <text class="stat-value">{{ accountList.length }}</text>
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
                    <text class="avatar-text">{{ item.name.charAt(0) }}</text>
                  </view>
                  <view class="account-info">
                    <text class="account-name">{{ item.name }}</text>
                    <text class="account-role">{{ item.role }}</text>
                  </view>
                  <status-tag-new
                    :type="item.status === 'active' ? 'success' : 'default'"
                    :text="item.status === 'active' ? '正常' : '停用'"
                  />
                </view>

                <view class="account-details">
                  <view class="detail-row">
                    <text class="detail-label">账号</text>
                    <text class="detail-value">{{ item.username }}</text>
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
                <button
                  class="action-btn danger"
                  @click="deleteAccount(item)"
                >删除</button>
              </view>
            </view>

            <!-- 空状态 -->
            <empty-state
              v-if="accountList.length === 0"
              title="暂无子账户"
              description="您可以添加子账户来分配不同权限"
              icon-type="order"
            />

            <button class="add-btn" @click="addAccount">
              <text class="add-icon">+</text>
              <text>新增子账户</text>
            </button>
          </view>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import appHeader from '@/components/AppHeader/AppHeader.vue'
import statusTagNew from '@/components/StatusTag/StatusTag.vue'
import emptyState from '@/components/EmptyState/EmptyState.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppContent from '@/components/AppContent/AppContent.vue'

// Mock 子账户数据
const accountList = ref([
  {
    id: '1',
    name: '李采购',
    role: '采购员',
    username: 'li_caigou',
    status: 'active',
    permissions: ['下单', '查看订单'],
    createdAt: '2026-06-15'
  },
  {
    id: '2',
    name: '王财务',
    role: '财务专员',
    username: 'wang_caiwu',
    status: 'active',
    permissions: ['对账', '发票', '充值'],
    createdAt: '2026-07-01'
  },
  {
    id: '3',
    name: '张仓库',
    role: '仓管员',
    username: 'zhang_cangku',
    status: 'inactive',
    permissions: ['查看订单', '收货确认'],
    createdAt: '2026-05-20'
  }
])

const activeCount = computed(() => accountList.value.filter(a => a.status === 'active').length)
const inactiveCount = computed(() => accountList.value.filter(a => a.status === 'inactive').length)

function addAccount() {
  uni.showToast({ title: '跳转至添加子账户', icon: 'none' })
}

function editAccount(item) {
  uni.showToast({ title: `编辑：${item.name}`, icon: 'none' })
}

function toggleStatus(item) {
  const action = item.status === 'active' ? '停用' : '启用'
  uni.showModal({
    title: `确认${action}`,
    content: `确定要${action} ${item.name} 的账户吗？`,
    success: (res) => {
      if (res.confirm) {
        item.status = item.status === 'active' ? 'inactive' : 'active'
        uni.showToast({ title: `已${action}`, icon: 'success' })
      }
    }
  })
}

function deleteAccount(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除 ${item.name} 吗？此操作不可恢复。`,
    confirmColor: '#B42318',
    success: (res) => {
      if (res.confirm) {
        accountList.value = accountList.value.filter(a => a.id !== item.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 统计卡片 */
.stats-card, .section-card {
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.stats-title, .section-title {
  font-size: 16px; /* 稳定 px */
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
  font-size: 24px; /* 稳定 px */
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
  width: 40px; /* 稳定 px */
  height: 40px;
  background: linear-gradient(135deg, #D7192D, #E8384F);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 16px; /* 稳定 px */
  font-weight: 600;
  color: white;
}

.account-info {
  flex: 1;
}

.account-name {
  font-size: 15px; /* 稳定 px */
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
  width: 60px; /* 稳定 px */
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
  min-height: 30px; /* 稳定 px */
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

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 44px; /* 稳定 px */
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
  font-size: 18px; /* 稳定 px */
  font-weight: 300;
}

.bottom-spacer {
  height: 24px;
}
</style>
