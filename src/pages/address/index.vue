<template>
  <AppPageShell>
    <template #header>
      <app-header title="收货地址" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <!-- 地址列表 -->
          <view class="address-list">
            <view v-for="item in addressList" :key="item.id" class="address-card">
              <view class="card-main" @click="selectAddress(item)">
                <view class="card-header">
                  <text class="contact-name">{{ item.name }}</text>
                  <text class="contact-phone">{{ item.phone }}</text>
                  <status-tag-new
                    v-if="item.isDefault"
                    type="success"
                    text="默认"
                  />
                </view>
                <view class="address-detail">
                  <text class="region">{{ item.province }} {{ item.city }} {{ item.district }}</text>
                  <text class="detail-text">{{ item.detail }}</text>
                </view>
                <view v-if="item.tag" class="address-tag">
                  <text class="tag-text">{{ item.tag }}</text>
                </view>
              </view>

              <view class="card-actions">
                <button class="action-btn" @click="editAddress(item)">编辑</button>
                <button class="action-btn danger" @click="deleteAddress(item)">删除</button>
                <button
                  v-if="!item.isDefault"
                  class="action-btn"
                  @click="setDefault(item)"
                >设为默认</button>
              </view>
            </view>

            <!-- 空状态 -->
            <empty-state
              v-if="addressList.length === 0"
              title="暂无收货地址"
              description="请添加您的收货地址"
              icon-type="order"
            />
          </view>

          <!-- 添加地址按钮 -->
          <button class="add-address-btn" @click="addAddress">
            <text class="btn-icon">+</text>
            <text>新增收货地址</text>
          </button>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref } from 'vue'
import appHeader from '@/components/AppHeader/AppHeader.vue'
import statusTagNew from '@/components/StatusTag/StatusTag.vue'
import emptyState from '@/components/EmptyState/EmptyState.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppContent from '@/components/AppContent/AppContent.vue'

// Mock 地址数据
const addressList = ref([
  {
    id: '1',
    name: '张经理',
    phone: '138****8888',
    province: '广东省',
    city: '广州市',
    district: '天河区',
    detail: '体育西路XXX号薰风体育大厦12楼1201室',
    tag: '公司',
    isDefault: true
  },
  {
    id: '2',
    name: '李主管',
    phone: '139****6666',
    province: '广东省',
    city: '深圳市',
    district: '南山区',
    detail: '科技园XXX路创新大厦A座808',
    tag: '仓库',
    isDefault: false
  },
  {
    id: '3',
    name: '王店长',
    phone: '137****9999',
    province: '浙江省',
    city: '杭州市',
    district: '西湖区',
    detail: '文三路XXX号数码港B栋2楼',
    tag: '',
    isDefault: false
  }
])

function selectAddress(item) {
  // 如果是从结算页跳转过来的，选择后返回
  const pages = getCurrentPages()
  const prevPage = pages[pages.length - 2]
  if (prevPage && prevPage.route?.includes('checkout')) {
    uni.$emit('addressSelected', item)
    uni.navigateBack()
  }
}

function addAddress() {
  uni.showToast({ title: '跳转至添加地址', icon: 'none' })
}

function editAddress(item) {
  uni.showToast({ title: `编辑地址：${item.name}`, icon: 'none' })
}

function setDefault(item) {
  addressList.value.forEach(addr => { addr.isDefault = addr.id === item.id })
  uni.showToast({ title: '已设为默认地址', icon: 'success' })
}

function deleteAddress(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除 ${item.name} 的地址吗？`,
    success: (res) => {
      if (res.confirm) {
        addressList.value = addressList.value.filter(addr => addr.id !== item.id)
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

.address-list {
  display: grid;
  gap: 12px;
}

.address-card {
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  overflow: hidden;

  &.is-default {
    border-color: rgba(215, 25, 45, 0.3);
  }
}

.card-main {
  padding: 14px;

  &:active {
    background: rgba(0, 0, 0, 0.02);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.contact-name {
  font-size: 16px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
}

.contact-phone {
  font-size: 14px;
  color: #5E626B;
}

.address-detail {
  padding-left: 2px;
}

.region {
  font-size: 14px;
  color: #111216;
  display: block;
  line-height: 1.5;
}

.detail-text {
  font-size: 14px;
  color: #5E626B;
  display: block;
  line-height: 1.5;
  margin-top: 2px;
}

.address-tag {
  margin-top: 8px;
}

.tag-text {
  display: inline-block;
  padding: 2px 8px;
  background: #FEF3F4;
  color: #D7192D;
  font-size: 11px;
  border-radius: 4px;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid #F5F5F6;
}

.action-btn {
  min-height: 30px; /* 稳定 px */
  padding: 0 10px;
  background: transparent;
  border: none;
  color: #5E626B;
  font-size: 13px;

  &.danger {
    color: #B42318;
  }

  &:active {
    opacity: 0.7;
  }
}

.add-address-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px; /* 稳定 px */
  width: 100%;
  height: 48px; /* 稳定 px */
  margin-top: 16px;
  background: white;
  border: 1px dashed #DEDFE3;
  border-radius: 10px;
  color: #5E626B;
  font-size: 15px;

  &:active {
    background: rgba(0, 0, 0, 0.02);
  }
}

.btn-icon {
  font-size: 20px; /* 稳定 px */
  font-weight: 300;
}

.bottom-spacer {
  height: 24px;
}
</style>
