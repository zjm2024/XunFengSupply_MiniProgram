<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="isEdit ? '编辑子账户' : '新增子账户'" :show-back="true" @back="goBack" />
    </template>

    <template #content>
      <AppContent>
        <view class="form-container">
          <view class="form-card">
            <view class="form-group">
              <text class="form-label">登录账号<text class="required">*</text></text>
              <input
                v-model="formData.username"
                class="form-input"
                placeholder="请输入登录账号"
                :disabled="isEdit || isReadOnly"
              />
            </view>

            <view v-if="!isEdit" class="form-group">
              <text class="form-label">密码<text class="required">*</text></text>
              <input
                v-model="formData.password"
                class="form-input"
                type="password"
                  placeholder="请输入密码"
                  password
                  :disabled="isReadOnly"
              />
            </view>

            <view class="form-group">
              <text class="form-label">使用人姓名</text>
              <input
                v-model="formData.realName"
                  class="form-input"
                  placeholder="请输入使用人姓名"
                  :disabled="isReadOnly"
              />
            </view>

            <view class="form-group">
              <text class="form-label">手机号</text>
              <input
                v-model="formData.mobile"
                class="form-input"
                  type="number"
                  placeholder="请输入手机号"
                  :disabled="isReadOnly"
              />
            </view>

            <view v-if="isEdit" class="form-group">
              <text class="form-label">状态</text>
              <view class="status-toggle">
                <text :class="['toggle-text', { active: formData.status === 'active' }]">
                  {{ formData.status === 'active' ? '已启用' : '已停用' }}
                </text>
                <switch
                  :checked="formData.status === 'active'"
                  color="#D7192D"
                  :disabled="isReadOnly"
                  @change="onStatusSwitchChange"
                />
              </view>
            </view>

            <view class="form-group">
              <text class="form-label">账户权限</text>
              <view class="permission-list">
                <view
                  v-for="item in permissionOptions"
                  :key="item.code"
                  class="permission-item"
                  :class="{ disabled: isReadOnly || (isEdit && formData.status !== 'active') }"
                  @tap="togglePermission(item.code)"
                >
                  <checkbox
                    :checked="formData.permissions.includes(item.code)"
                    :disabled="isReadOnly || (isEdit && formData.status !== 'active')"
                    color="#D7192D"
                  />
                  <view>
                    <text class="permission-name">{{ item.name }}</text>
                    <text class="permission-description">{{ item.description }}</text>
                  </view>
                </view>
              </view>
              <text v-if="isReadOnly || (isEdit && formData.status !== 'active')" class="frozen-tip">
                {{ isReadOnly ? '主账户已冻结，当前页面仅可查看' : '冻结账户的权限仅可查看，解冻后才能编辑' }}
              </text>
            </view>
          </view>

          <!-- 底部按钮 -->
          <view class="bottom-actions">
            <button class="submit-btn" @click="submitForm" :disabled="submitting || isReadOnly">
              {{ submitting ? '提交中...' : '确认' }}
            </button>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { createSubAccount, updateSubAccount, toggleSubAccountStatus } from '../../../api/subAccount.js'
import { useUserStore } from '@/shared/session/userStore.js'
const submitting = ref(false)
const userStore = useUserStore()
const isReadOnly = computed(() => userStore.isFrozen)

// 判断是否为编辑模式
const isEdit = ref(false)
const editingAccountId = ref(null)

const formData = reactive({
  username: '',
  password: '',
  realName: '',
  mobile: '',
  status: 'active',
  permissions: [],
})

const permissionOptions = [
  { code: 'ORDER_VIEW', name: '查看订单', description: '查看经销商主体订单' },
  { code: 'ORDER_CREATE', name: '下单', description: '创建并提交订单' },
  { code: 'BALANCE_VIEW', name: '查看余额对账', description: '查看余额、账单和流水' },
  { code: 'SUB_ACCOUNT_MANAGE', name: '管理子账户', description: '保留扩展；主账号始终拥有' },
  { code: 'COMBINATION_PAY_PARTICIPATE', name: '参与组合支付', description: '允许本账户余额被选作资金来源' },
]

let initialStatus = 'active'

onLoad((params = {}) => {
  // 检查是否有传入的编辑数据
  if (params.accountId) {
    isEdit.value = true
    editingAccountId.value = Number(params.accountId)
    formData.username = params.username || ''
    formData.realName = params.realName || ''
    formData.mobile = params.mobile || ''
    formData.status = params.status || 'active'
    initialStatus = formData.status
    const rawPermissions = params.permissions || '[]'
    try {
      formData.permissions = JSON.parse(rawPermissions)
    } catch (error) {
      try { formData.permissions = JSON.parse(decodeURIComponent(rawPermissions)) }
      catch (_) { formData.permissions = [] }
    }
  }
})

function togglePermission(code) {
  if (isReadOnly.value || (isEdit.value && formData.status !== 'active')) return
  const index = formData.permissions.indexOf(code)
  if (index >= 0) formData.permissions.splice(index, 1)
  else formData.permissions.push(code)
}

/**
 * 开关状态变更
 */
function onStatusSwitchChange(e) {
  if (isReadOnly.value) return
  formData.status = e.detail.value ? 'active' : 'inactive'
}

/**
 * 返回上一页
 */
function goBack() {
  uni.navigateBack()
}

/**
 * 提交表单
 */
async function submitForm() {
  if (isReadOnly.value) return
  // 表单校验
  if (!formData.username.trim()) {
    uni.showToast({ title: '请输入登录账号', icon: 'none' })
    return
  }

  if (!isEdit.value && !formData.password.trim()) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    if (isEdit.value) {
      if (formData.status !== initialStatus) {
        await toggleSubAccountStatus({
          subAccountId: editingAccountId.value,
          active: formData.status === 'active',
        })
      }
      if (formData.status === 'active') {
        await updateSubAccount({
          subAccountId: editingAccountId.value,
          realName: formData.realName.trim() || null,
          mobile: formData.mobile.trim() || null,
          permissions: formData.permissions,
        })
      }
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      // 创建模式
      await createSubAccount({
        username: formData.username.trim(),
        password: formData.password,
        realName: formData.realName.trim() || null,
        mobile: formData.mobile.trim() || null,
        permissions: formData.permissions,
      })
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (err) {
    console.error('[SubAccountForm] 提交失败:', err)
    uni.showToast({ title: err.message || '操作失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>

.form-card {
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 12px;
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  display: block;
  font-size: 14px;
  color: #111216;
  margin-bottom: 8px;
  font-weight: 500;
}

.required {
  color: #D7192D;
}

.form-input {
  height: 44px;
  padding: 0 12px;
  border: 1px solid #DEDFE3;
  border-radius: 8px;
  font-size: 14px;
  background: white;

  &:focus {
    border-color: #D7192D;
  }

  &[disabled] {
    background: #F7F7F8;
    color: #999;
  }
}

.status-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
}

.permission-list {
  display: grid;
  gap: 10px;
}

.permission-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
  border: 1px solid #EFEFF1;
  border-radius: 8px;

  &.disabled { opacity: 0.55; }
}

.permission-name,
.permission-description {
  display: block;
}

.permission-name { color: #111216; font-size: 14px; }
.permission-description { margin-top: 2px; color: #777A82; font-size: 12px; }
.frozen-tip { display: block; margin-top: 8px; color: #B76500; font-size: 12px; }

.toggle-text {
  font-size: 14px;
  color: #5E626B;

  &.active {
    color: #059669;
  }
}

.bottom-actions {
  margin-top: 24px;
  padding: 0;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  background: #D7192D;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  border: none;

  &[disabled] {
    opacity: 0.6;
  }

  &:active:not([disabled]) {
    opacity: 0.85;
  }
}
</style>
