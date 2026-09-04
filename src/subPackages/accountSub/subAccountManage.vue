<!--
  总店创建业务员子账号+分配权限页面（分包：accountSub）
  对应业务流程节点：
  附属功能 → 总店管理员创建业务员账号、分配权限、启用/禁用/删除
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="子账号管理" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="sub-account-page">
          <!-- 页面副标题 -->
          <view class="page-header">
            <text class="subtitle">创建和管理业务员/财务人员账号</text>
          </view>

          <!-- 子账号列表 -->
          <view class="account-list">
            <view 
              class="account-card" 
              v-for="account in accountList" 
              :key="account.accountId"
            >
              <view class="account-info">
                <view class="avatar-wrap">
                  <text class="avatar-letter">{{ account.name.charAt(0) }}</text>
                </view>
                <view class="info-main">
                  <view class="name-row">
                    <text class="name">{{ account.name }}</text>
                    <view class="role-tag" :class="'role-' + account.role">{{ getRoleLabel(account.role) }}</view>
                  </view>
                  <text class="phone">{{ account.phone }}</text>
                  <view class="permission-tags">
                    <text 
                      class="perm-tag" 
                      v-for="perm in account.permissions.slice(0, 3)" 
                      :key="perm"
                    >{{ getPermLabel(perm) }}</text>
                    <text class="perm-tag more" v-if="account.permissions.length > 3">
                      +{{ account.permissions.length - 3 }}
                    </text>
                  </view>
                </view>
              </view>

              <!-- 状态开关 -->
              <view class="account-status">
                <switch 
                  :checked="account.status === 1" 
                  color="#C41E3A"
                  @change="toggleStatus(account, $event)"
                />
              </view>

              <!-- 操作按钮 -->
              <view class="account-actions">
                <text class="action-link edit" @click="editAccount(account)">编辑权限</text>
                <text class="action-link delete" @click="deleteAccount(account)">删除</text>
              </view>
            </view>
          </view>

          <empty-view v-if="!loading && accountList.length === 0" text="暂无子账号" />

          <!-- 底部占位 -->
          <view style="height: 160rpx;" />
        </view>
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar>
        <button class="add-account-btn" @click="showAddPopup = true">
          <uni-icons type="plusempty" size="18" color="#fff" />
          新建子账号
        </button>
      </FixedActionBar>
    </template>

    <!-- 新增/编辑弹窗 -->
    <uni-popup ref="addPopupRef" type="center">
      <view class="add-popup">
        <text class="popup-title">{{ editingAccount ? '编辑子账号' : '新建子账号' }}</text>
        
        <view class="form-item">
          <text class="label">姓名</text>
          <input class="input" v-model="formData.name" placeholder="真实姓名" />
        </view>
        
        <view class="form-item">
          <text class="label">手机号</text>
          <input class="input" v-model="formData.phone" placeholder="11位手机号" type="number" maxlength="11" />
        </view>
        
        <view class="form-item">
          <text class="label">角色</text>
          <view class="role-options">
            <view 
              class="role-opt" 
              :class="{ active: formData.role === r.value }"
              v-for="r in roleOptions.filter(r => r.value !== 'admin')" 
              :key="r.value"
              @click="formData.role = r.value"
            >{{ r.label }}</view>
          </view>
        </view>
        
        <view class="form-item">
          <text class="label">分配权限</text>
          <view class="perm-grid">
            <view 
              class="perm-item" 
              :class="{ active: formData.permissions.includes(p.value) }"
              v-for="p in availablePermissions" 
              :key="p.value"
              @click="togglePermission(p.value)"
            >{{ p.label }}</view>
          </view>
        </view>
        
        <view class="popup-actions">
          <button class="cancel-btn" @click="closePopup">取消</button>
          <button class="confirm-btn" @click="handleSubmit">{{ editingAccount ? '保存修改' : '确认创建' }}</button>
        </view>
      </view>
    </uni-popup>
  </AppPageShell>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { 
  createSubAccount, 
  getSubAccountList, 
  updateSubAccountPermission, 
  toggleSubAccountStatus,
  deleteSubAccount 
} from '../../api/auth.js'
import { ACCOUNT_ROLE, PERMISSIONS, ROLE_PERMISSION_MAP } from '../../config/permission.js'
import emptyView from '../../components/empty-view/empty-view.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppContent from '@/components/AppContent/AppContent.vue'
import FixedActionBar from '@/components/FixedActionBar/FixedActionBar.vue'

const accountList = ref([])
const loading = ref(false)
const showAddPopup = ref(false)
const addPopupRef = ref(null)
const editingAccount = ref(null)

const roleOptions = [
  { value: 'salesman', label: '业务员' },
  { value: 'finance', label: '财务人员' }
]

const availablePermissions = [
  { value: PERMISSIONS.VIEW_GOODS, label: '浏览商品' },
  { value: PERMISSIONS.VIEW_PRICE, label: '查看价格' },
  { value: PERMISSIONS.CART_MANAGE, label: '购物车管理' },
  { value: PERMISSIONS.ORDER_CREATE, label: '创建订单' },
  { value: PERMISSIONS.ORDER_VIEW, label: '查看订单' },
  { value: PERMISSIONS.PAYMENT_PAY, label: '执行付款' },
  { value: PERMISSIONS.BILL_VIEW, label: '查看账单' },
  { value: PERMISSIONS.AFTER_SALE_APPLY, label: '发起售后' }
]

const formData = reactive({
  name: '',
  phone: '',
  role: 'salesman',
  permissions: []
})

onShow(() => {
  loadAccountList()
})

/**
 * 加载子账号列表
 * TODO: 调用 getSubAccountList() 接口
 */
async function loadAccountList() {
  loading.value = true
  try {
    // const res = await getSubAccountList({ page: 1, pageSize: 50 })
    // accountList.value = res.list
    loading.value = false
  } catch (e) {
    console.error('加载子账号列表失败:', e)
    loading.value = false
  }
}

function getRoleLabel(role) {
  return ACCOUNT_ROLE[role]?.label || role
}

function getPermLabel(perm) {
  const permObj = Object.values(PERMISSIONS).find(v => v === perm)
  // 简化显示
  const map = {
    view_goods: '浏览商品',
    view_price: '查看价格',
    cart_manage: '购物车',
    order_create: '下单',
    order_view: '订单',
    payment_pay: '付款',
    bill_view: '账单',
    after_sale_apply: '售后'
  }
  return map[perm] || perm
}

function togglePermission(value) {
  const idx = formData.permissions.indexOf(value)
  if (idx > -1) {
    formData.permissions.splice(idx, 1)
  } else {
    formData.permissions.push(value)
  }
}

async function toggleStatus(account, e) {
  const newStatus = e.detail.value ? 1 : 0
  try {
    // await toggleSubAccountStatus(account.accountId, newStatus)
    account.status = newStatus
    uni.showToast({ title: newStatus ? '已启用' : '已禁用', icon: 'none' })
  } catch (err) {
    console.error('操作失败:', err)
  }
}

function editAccount(account) {
  editingAccount.value = account
  formData.name = account.name
  formData.phone = account.phone
  formData.role = account.role
  formData.permissions = [...account.permissions]
  showAddPopup.value = true
  addPopupRef.value?.open?.()
}

async function deleteAccount(account) {
  uni.showModal({
    title: '提示',
    content: `确定删除「${account.name}」的账号吗？`,
    confirmColor: '#F56C6C',
    success: async (res) => {
      if (res.confirm) {
        try {
          // await deleteSubAccount(account.accountId)
          accountList.value = accountList.value.filter(a => a.accountId !== account.accountId)
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch (e) {
          console.error('删除失败:', e)
        }
      }
    }
  })
}

function closePopup() {
  showAddPopup.value = false
  addPopupRef.value?.close?.()
  resetForm()
}

function resetForm() {
  formData.name = ''
  formData.phone = ''
  formData.role = 'salesman'
  formData.permissions = []
  editingAccount.value = null
}

/**
 * 提交新建或编辑
 */
async function handleSubmit() {
  if (!formData.name || !formData.phone) {
    uni.showToast({ title: '请填写姓名和手机号', icon: 'none' })
    return
  }
  
  try {
    if (editingAccount.value) {
      // await updateSubAccountPermission(editingAccount.value.accountId, formData.permissions)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      // await createSubAccount({
      //   name: formData.name,
      //   phone: formData.phone,
      //   role: formData.role,
      //   permissions: formData.permissions
      // })
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    
    closePopup()
    loadAccountList()
  } catch (e) {
    console.error('操作失败:', e)
  }
}
</script>

<style lang="scss" scoped>
.sub-account-page {
  min-height: 100%;
  background: var(--bg-color);
}

.page-header {
  margin-bottom: 16rpx;
  
  .subtitle {
    display: block;
    font-size: 24rpx;
    color: var(--text-placeholder);
    padding: 0 8rpx;
  }
}

.account-list {
  .account-card {
    background: #fff;
    border-radius: 12rpx;
    padding: 28rpx;
    margin-bottom: 16rpx;
    
    .account-info {
      display: flex;
      
      .avatar-wrap {
        width: 80rpx;
        height: 80rpx;
        border-radius: 50%;
        background: var(--primary-color);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        
        .avatar-letter {
          font-size: 32rpx;
          color: #fff;
          font-weight: 700;
        }
      }
      
      .info-main {
        flex: 1;
        margin-left: 20rpx;
        
        .name-row {
          display: flex;
          align-items: center;
          margin-bottom: 6rpx;
          
          .name {
            font-size: 30rpx;
            font-weight: 600;
            color: var(--text-primary);
            margin-right: 12rpx;
          }
          
          .role-tag {
            font-size: 20rpx;
            color: #fff;
            padding: 2rpx 12rpx;
            border-radius: 4rpx;
            
            &.role-salesman { background: #409EFF; }
            &.role-finance { background: #67C23A; }
          }
        }
        
        .phone {
          display: block;
          font-size: 24rpx;
          color: var(--text-secondary);
          margin-bottom: 10rpx;
        }
        
        .permission-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8rpx;
          
          .perm-tag {
            font-size: 20rpx;
            color: var(--text-secondary);
            background: var(--bg-color);
            padding: 2rpx 12rpx;
            border-radius: 4rpx;
            
            &.more {
              color: var(--primary-color);
            }
          }
        }
      }
    }
    
    .account-status {
      display: flex;
      justify-content: flex-end;
      margin: 16rpx 0;
    }
    
    .account-actions {
      display: flex;
      justify-content: flex-end;
      gap: 24rpx;
      padding-top: 16rpx;
      border-top: 1rpx solid var(--border-color);
      
      .action-link {
        font-size: 26rpx;
        
        &.edit { color: var(--primary-color); }
        &.delete { color: #F56C6C; }
      }
    }
  }
}

.add-account-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 88rpx;
  background: var(--primary-color);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
}

/* 弹窗样式 */
.add-popup {
  width: 620rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
  
  .popup-title {
    display: block;
    font-size: 34rpx;
    font-weight: 700;
    color: var(--text-primary);
    text-align: center;
    margin-bottom: 32rpx;
  }
  
  .form-item {
    margin-bottom: 24rpx;
    
    .label {
      display: block;
      font-size: 26rpx;
      color: var(--text-primary);
      font-weight: 500;
      margin-bottom: 12rpx;
    }
    
    .input {
      width: 100%;
      height: 76rpx;
      background: var(--bg-color);
      border-radius: 8rpx;
      padding: 0 20rpx;
      font-size: 28rpx;
      box-sizing: border-box;
    }
  }
  
  .role-options {
    display: flex;
    gap: 16rpx;
    
    .role-opt {
      flex: 1;
      height: 72rpx;
      line-height: 72rpx;
      text-align: center;
      background: var(--bg-color);
      border-radius: 8rpx;
      font-size: 26rpx;
      color: var(--text-secondary);
      border: 2rpx solid transparent;
      
      &.active {
        border-color: var(--primary-color);
        color: var(--primary-color);
        background: rgba(196, 30, 58, 0.04);
      }
    }
  }
  
  .perm-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    
    .perm-item {
      padding: 10rpx 20rpx;
      background: var(--bg-color);
      border-radius: 6rpx;
      font-size: 24rpx;
      color: var(--text-secondary);
      border: 2rpx solid transparent;
      
      &.active {
        border-color: var(--primary-color);
        color: var(--primary-color);
        background: rgba(196, 30, 58, 0.04);
      }
    }
  }
  
  .popup-actions {
    display: flex;
    gap: 16rpx;
    margin-top: 32rpx;
    
    .cancel-btn, .confirm-btn {
      flex: 1;
      height: 76rpx;
      line-height: 76rpx;
      border-radius: 38rpx;
      font-size: 28rpx;
      border: none;
    }
    
    .cancel-btn {
      background: var(--bg-color);
      color: var(--text-secondary);
    }
    
    .confirm-btn {
      background: var(--primary-color);
      color: #fff;
    }
  }
}
</style>
