<template>
  <AppPageShell>
    <template #header>
      <app-header title="售后服务" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <!-- Tab 切换 -->
          <scroll-view class="segment-tabs" scroll-x>
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="tab-btn"
              :class="{ 'is-active': activeTab === tab.key }"
              @click="activeTab = tab.key"
            >{{ tab.label }}</button>
          </scroll-view>

          <!-- 售后列表 -->
          <view class="list">
            <view v-for="item in filteredList" :key="item.id" class="card">
              <!-- 卡片头部 -->
              <view class="card-header">
                <text class="order-no">{{ item.orderNo }}</text>
                <status-tag-new :type="getStatusType(item.status)" :text="item.statusText" />
              </view>

              <!-- 商品信息 -->
              <view class="card-body">
                <image class="product-image" :src="item.image" mode="aspectFill" />
                <view class="product-info">
                  <text class="product-name">{{ item.productName }}</text>
                  <text class="sku-info">{{ item.skuInfo }}</text>
                  <text class="quantity">数量：{{ item.quantity }}</text>
                </view>
              </view>

              <!-- 售后信息 -->
              <view class="card-detail">
                <view class="detail-row">
                  <text class="detail-label">售后类型</text>
                  <text class="detail-value">{{ item.type }}</text>
                </view>
                <view class="detail-row">
                  <text class="detail-label">申请时间</text>
                  <text class="detail-value">{{ item.applyTime }}</text>
                </view>
                <view v-if="item.reason" class="detail-row">
                  <text class="detail-label">原因说明</text>
                  <text class="detail-value reason">{{ item.reason }}</text>
                </view>
              </view>

              <!-- 操作按钮 -->
              <view class="card-footer">
                <button v-if="item.status === 'pending'" class="action-btn" @click="cancelApply(item)">取消申请</button>
                <button class="action-btn btn-primary" @click="viewDetail(item)">查看详情</button>
              </view>
            </view>

            <!-- 空状态 -->
            <empty-state
              v-if="filteredList.length === 0"
              title="暂无售后记录"
              description="您的售后申请将显示在这里"
              icon-type="order"
            />
          </view>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>

    <template #footer>
      <fixed-action-bar>
        <button class="apply-btn" @click="applyAfterSales">申请售后</button>
      </fixed-action-bar>
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
import fixedActionBar from '@/components/FixedActionBar/FixedActionBar.vue'

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '处理中' },
  { key: 'approved', label: '已通过' },
  { key: 'completed', label: '已完成' },
  { key: 'rejected', label: '已拒绝' }
]

const activeTab = ref('all')

// Mock 售后数据
const list = ref([
  {
    id: '1',
    orderNo: 'PO20260810001',
    status: 'pending',
    statusText: '处理中',
    productName: '薰风专业比赛服 T-100',
    image: '/static/images/jersey-red.png',
    skuInfo: '红色 / XL',
    quantity: 10,
    type: '退货退款',
    applyTime: '2026-08-10 14:30',
    reason: '尺码不符，需要更换为L码'
  },
  {
    id: '2',
    orderNo: 'PO20260805003',
    status: 'approved',
    statusText: '已通过',
    productName: '薰风疾影 9000 羽毛球拍',
    image: '/static/images/jersey-model.png',
    skuInfo: '3U-G5 / 蓝色',
    quantity: 2,
    type: '换货',
    applyTime: '2026-08-05 10:15',
    reason: '收到商品有瑕疵'
  },
  {
    id: '3',
    orderNo: 'PO20260728012',
    status: 'completed',
    statusText: '已完成',
    productName: '薰风羽毛球 YS-99',
    image: '/static/images/product-racket.png',
    skuInfo: '12只装 / 比赛级',
    quantity: 5,
    type: '退款',
    applyTime: '2026-07-28 09:00',
    reason: ''
  }
])

const filteredList = computed(() => {
  if (activeTab.value === 'all') return list.value
  return list.value.filter(item => item.status === activeTab.value)
})

function getStatusType(status) {
  const map = {
    pending: 'warning',
    approved: 'info',
    completed: 'success',
    rejected: 'error'
  }
  return map[status] || 'default'
}

function viewDetail(item) {
  uni.showToast({ title: `查看售后单 ${item.orderNo}`, icon: 'none' })
}

function cancelApply(item) {
  uni.showModal({
    title: '确认取消',
    content: '确定要取消该售后申请吗？',
    success: (res) => {
      if (res.confirm) {
        list.value = list.value.filter(i => i.id !== item.id)
        uni.showToast({ title: '已取消申请', icon: 'success' })
      }
    }
  })
}

function applyAfterSales() {
  uni.showToast({ title: '跳转至申请售后页面', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

.segment-tabs {
  display: flex;
  gap: 18px;
  border-bottom: 1px solid #EFEFF1;
  margin-bottom: 16px;
  white-space: nowrap;
}

.tab-btn {
  min-height: 42px; /* 稳定 px */
  padding: 0;
  white-space: nowrap;
  border: none;
  background: transparent;
  color: #5E626B;
  font-size: 14px;

  &.is-active {
    color: #D7192D;
    border-bottom: 2px solid #D7192D;
    font-weight: 650;
  }
}

.list {
  display: grid;
  gap: 12px;
}

.card {
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #EFEFF1;
}

.order-no {
  font-size: 14px;
  color: #111216;
  font-weight: 500;
}

.card-body {
  display: grid;
  grid-template-columns: 64px 1fr; /* 稳定 px */
  gap: 10px;
  padding: 12px;
}

.product-image {
  width: 64px; /* 稳定 px */
  height: 64px;
  border-radius: 7px;
  object-fit: cover;
}

.product-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.product-name {
  font-size: 14px;
  color: #111216;
  line-height: 1.45;
  display: block;
}

.sku-info, .quantity {
  color: #5E626B;
  font-size: 12px;
  margin-top: 2px;
  display: block;
}

.card-detail {
  padding: 0 12px 12px;
  border-top: 1px solid #F5F5F6;
  margin-top: 8px;
  padding-top: 10px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 6px 0;

  &:first-child {
    padding-top: 0;
  }
}

.detail-label {
  font-size: 13px;
  color: #5E626B;
  flex-shrink: 0;
}

.detail-value {
  font-size: 13px;
  color: #111216;
  text-align: right;
  max-width: 200px; /* 稳定 px */

  &.reason {
    color: #5E626B;
  }
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #EFEFF1;
}

.action-btn {
  min-height: 34px; /* 稳定 px */
  padding: 0 12px;
  border: 1px solid #DEDFE3;
  background: white;
  border-radius: 8px;
  font-size: 13px;
  color: #5E626B;

  &.btn-primary {
    background: #D7192D;
    color: white;
    border-color: #D7192D;
  }

  &:active {
    opacity: 0.8;
  }
}

.bottom-spacer {
  height: 24px;
}

.apply-btn {
  width: 100%;
  height: 48px; /* 稳定 px */
  background: #D7192D;
  color: white;
  font-size: 15px;
  font-weight: 650;
  border: none;
  border-radius: 10px;

  &:active {
    background: #B91224;
  }
}
</style>
