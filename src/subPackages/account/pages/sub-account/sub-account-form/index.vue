<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="isEdit ? t('account.titles.editSubAccount') : t('account.titles.newSubAccount')" :show-back="true" @back="goBack" />
    </template>

    <template #content>
      <AppContent>
        <view class="form-container">
          <view class="form-card">
            <view class="form-group">
              <text class="form-label">{{ t('account.subAccountForm.username') }}<text class="required">*</text></text>
              <input
                v-model="formData.username"
                class="form-input"
                :placeholder="t('account.subAccountForm.usernameRequired')"
                :disabled="isEdit || isReadOnly"
              />
            </view>

            <view v-if="!isEdit" class="form-group">
              <text class="form-label">{{ t('account.subAccountForm.password') }}<text class="required">*</text></text>
              <input
                v-model="formData.password"
                class="form-input"
                type="password"
                  :placeholder="t('account.subAccountForm.passwordRequired')"
                  password
                  :disabled="isReadOnly"
              />
            </view>

            <view class="form-group">
              <text class="form-label">{{ t('account.subAccountForm.realName') }}</text>
              <input
                v-model="formData.realName"
                  class="form-input"
                  :placeholder="t('account.subAccountForm.realNamePlaceholder')"
                  :disabled="isReadOnly"
              />
            </view>

            <view class="form-group">
              <text class="form-label">{{ t('account.subAccountForm.mobile') }}</text>
              <input
                v-model="formData.mobile"
                class="form-input"
                  type="number"
                  :placeholder="t('account.subAccountForm.mobilePlaceholder')"
                  :disabled="isReadOnly"
              />
            </view>

            <view v-if="isEdit" class="form-group">
              <text class="form-label">{{ t('account.subAccountForm.status') }}</text>
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
              <text class="form-label">{{ t('account.subAccountForm.permissions') }}</text>
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
                {{ isReadOnly ? t('account.subAccountForm.mainFrozen') : t('account.subAccountForm.accountFrozen') }}
              </text>
            </view>
          </view>

          <!-- 底部按钮 -->
          <view class="bottom-actions">
            <button class="submit-btn" @click="submitForm" :disabled="submitting || isReadOnly">
              {{ submitting ? t('account.subAccountForm.submitting') : t('account.subAccountForm.confirm') }}
            </button>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import { computed, ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { createSubAccount, updateSubAccount, toggleSubAccountStatus } from '../../../api/subAccount.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { navigator } from '@/app/navigation/navigator.js'
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

const permissionOptions = computed(() => [
  { code: 'ORDER_VIEW', name: t('account.permissions.viewOrders'), description: t('account.permissions.viewOrdersHint') },
  { code: 'ORDER_CREATE', name: t('account.permissions.createOrders'), description: t('account.permissions.createOrdersHint') },
  { code: 'BALANCE_VIEW', name: t('account.permissions.viewBalance'), description: t('account.permissions.viewBalanceHint') },
  { code: 'INVENTORY_VIEW', name: t('account.permissions.viewInventory'), description: t('account.permissions.viewInventoryHint') },
  { code: 'SUB_ACCOUNT_MANAGE', name: t('account.permissions.manageAccounts'), description: t('account.permissions.manageAccountsHint') },
  { code: 'COMBINATION_PAY_PARTICIPATE', name: t('account.permissions.combinedPayment'), description: t('account.permissions.combinedPaymentHint') },
])

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
  navigator.back()
}

/**
 * 提交表单
 */
async function submitForm() {
  if (isReadOnly.value) return
  // 表单校验
  if (!formData.username.trim()) {
    uni.showToast({ title: t('account.subAccountForm.usernameRequired'), icon: 'none' })
    return
  }

  if (!isEdit.value && !formData.password.trim()) {
    uni.showToast({ title: t('account.subAccountForm.passwordRequired'), icon: 'none' })
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
      uni.showToast({ title: t('account.subAccountForm.saved'), icon: 'success' })
    } else {
      // 创建模式
      await createSubAccount({
        username: formData.username.trim(),
        password: formData.password,
        realName: formData.realName.trim() || null,
        mobile: formData.mobile.trim() || null,
        permissions: formData.permissions,
      })
      uni.showToast({ title: t('account.subAccountForm.created'), icon: 'success' })
    }
    setTimeout(() => {
      navigator.back()
    }, 1000)
  } catch (err) {
    console.error('[SubAccountForm] 提交失败:', err)
    uni.showToast({ title: err.message || t('account.subAccountForm.failed'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>

.form-card {
  background: var(--glass-card-background, rgba(255,255,255,.74));
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
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
  border: 0;
  border-radius: 8px;
  background: rgba(255,255,255,.58);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);

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
