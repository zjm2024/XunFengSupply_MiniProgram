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
                :disabled="isEdit"
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
              />
            </view>

            <view class="form-group">
              <text class="form-label">使用人姓名</text>
              <input
                v-model="formData.realName"
                class="form-input"
                placeholder="请输入使用人姓名"
              />
            </view>

            <view class="form-group">
              <text class="form-label">手机号</text>
              <input
                v-model="formData.mobile"
                class="form-input"
                type="number"
                placeholder="请输入手机号"
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
                  @change="onStatusSwitchChange"
                />
              </view>
            </view>
          </view>

          <!-- 底部按钮 -->
          <view class="bottom-actions">
            <button class="submit-btn" @click="submitForm" :disabled="submitting">
              {{ submitting ? '提交中...' : '确认' }}
            </button>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { createSubAccount, toggleSubAccountStatus } from '../../../api/subAccount.js'

const route = useRoute()
const submitting = ref(false)

// 判断是否为编辑模式
const isEdit = ref(false)
const editingAccountId = ref(null)

const formData = reactive({
  username: '',
  password: '',
  realName: '',
  mobile: '',
  status: 'active',
})

onMounted(() => {
  // 检查是否有传入的编辑数据
  const params = route.query || {}
  if (params.accountId) {
    isEdit.value = true
    editingAccountId.value = Number(params.accountId)
    formData.username = params.username || ''
    formData.realName = params.realName || ''
    formData.mobile = params.mobile || ''
    formData.status = params.status || 'active'
  }
})

/**
 * 开关状态变更
 */
function onStatusSwitchChange(e) {
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
      // 编辑模式：调用切换状态接口
      const originalStatus = route.query.status || 'active'
      if (formData.status !== originalStatus) {
        await toggleSubAccountStatus({
          subAccountId: editingAccountId.value,
          active: formData.status === 'active',
        })
        uni.showToast({ title: formData.status === 'active' ? '已启用' : '已停用', icon: 'success' })
      } else {
        uni.showToast({ title: '未修改任何内容', icon: 'none' })
      }
    } else {
      // 创建模式
      await createSubAccount({
        username: formData.username.trim(),
        password: formData.password,
        realName: formData.realName.trim() || null,
        mobile: formData.mobile.trim() || null,
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
