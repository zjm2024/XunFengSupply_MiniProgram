<template>
  <AppPageShell>
    <template #header>
      <app-header title="发票管理" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <!-- 发票抬头管理 -->
          <view class="section-card">
            <text class="section-title">发票抬头</text>

            <view v-for="item in invoiceList" :key="item.id" class="list-item">
              <view class="item-main">
                <view class="item-header">
                  <text class="company-name">{{ item.companyName }}</text>
                  <status-tag-new
                    v-if="item.isDefault"
                    type="success"
                    text="默认"
                  />
                </view>
                <text class="tax-no">税号：{{ item.taxNo }}</text>
                <text class="address">{{ item.address }}</text>
                <text class="phone">电话：{{ item.phone }}</text>
                <text class="bank-info">{{ item.bankName }} {{ item.bankAccount }}</text>
              </view>
              <view class="item-actions">
                <button
                  v-if="!item.isDefault"
                  class="action-link"
                  @click="setDefault(item)"
                >设为默认</button>
                <button class="action-link" @click="editInvoice(item)">编辑</button>
                <button class="action-link danger" @click="deleteInvoice(item)">删除</button>
              </view>
            </view>

            <!-- 空状态 -->
            <empty-state
              v-if="invoiceList.length === 0"
              title="暂无发票抬头"
              description="请添加您的发票抬头信息"
              icon-type="order"
            />

            <button class="add-btn" @click="addInvoice">
              <text class="add-icon">+</text>
              <text>新增发票抬头</text>
            </button>
          </view>

          <!-- 发票记录 -->
          <view class="section-card">
            <text class="section-title">开票记录</text>

            <view v-for="record in records" :key="record.id" class="record-item">
              <view class="record-header">
                <text class="record-no">{{ record.invoiceNo }}</text>
                <status-tag-new :type="getRecordStatusType(record.status)" :text="record.statusText" />
              </view>
              <view class="record-body">
                <text class="record-order">关联订单：{{ record.orderNo }}</text>
                <text class="record-amount">金额：¥{{ record.amount.toLocaleString() }}</text>
                <text class="record-time">申请时间：{{ record.applyTime }}</text>
              </view>
              <view class="record-footer">
                <button
                  v-if="record.status === 'completed'"
                  class="download-btn"
                  @click="downloadInvoice(record)"
                >下载发票</button>
                <button
                  v-if="record.status === 'rejected'"
                  class="retry-btn"
                  @click="reapply(record)"
                >重新申请</button>
              </view>
            </view>

            <empty-state
              v-if="records.length === 0"
              title="暂无开票记录"
              description="您的发票将显示在这里"
              icon-type="order"
            />
          </view>

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

// Mock 发票抬头数据
const invoiceList = ref([
  {
    id: '1',
    companyName: '广州薰风体育用品有限公司',
    taxNo: '91440101MA59DQXXXX',
    address: '广东省广州市天河区体育西路XXX号',
    phone: '020-88888888',
    bankName: '中国工商银行广州天河支行',
    bankAccount: '622202XXXXXXXXXXXX',
    isDefault: true
  },
  {
    id: '2',
    companyName: '深圳薰风贸易有限公司',
    taxNo: '91440300MA5F8XXXXX',
    address: '广东省深圳市南山区科技园XXX路',
    phone: '0755-66666666',
    bankName: '招商银行深圳南山支行',
    bankAccount: '621483XXXXXXXXXXXX',
    isDefault: false
  }
])

// Mock 开票记录
const records = ref([
  {
    id: '1',
    invoiceNo: 'INV202608100001',
    orderNo: 'PO20260810001',
    amount: 28680,
    status: 'completed',
    statusText: '已开票',
    applyTime: '2026-08-10 15:00'
  },
  {
    id: '2',
    invoiceNo: 'INV202608050002',
    orderNo: 'PO20260805003',
    amount: 18900,
    status: 'pending',
    statusText: '开票中',
    applyTime: '2026-08-05 11:30'
  }
])

function getRecordStatusType(status) {
  const map = {
    pending: 'warning',
    completed: 'success',
    rejected: 'error'
  }
  return map[status] || 'default'
}

function addInvoice() {
  uni.showToast({ title: '跳转至添加发票抬头', icon: 'none' })
}

function editInvoice(item) {
  uni.showToast({ title: `编辑 ${item.companyName}`, icon: 'none' })
}

function setDefault(item) {
  invoiceList.value.forEach(i => { i.isDefault = i.id === item.id })
  uni.showToast({ title: '已设为默认', icon: 'success' })
}

function deleteInvoice(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除 ${item.companyName} 吗？`,
    success: (res) => {
      if (res.confirm) {
        invoiceList.value = invoiceList.value.filter(i => i.id !== item.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    }
  })
}

function downloadInvoice(record) {
  uni.showToast({ title: '正在下载发票...', icon: 'none' })
}

function reapply(record) {
  uni.showToast({ title: '跳转至重新申请', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

.section-card {
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  display: block;
  margin-bottom: 12px;
}

.list-item {
  padding: 12px 0;
  border-bottom: 1px solid #F5F5F6;

  &:last-of-type {
    border-bottom: none;
  }
}

.item-main {
  margin-bottom: 8px;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 6px; /* 稳定 px */
  margin-bottom: 6px;
}

.company-name {
  font-size: 15px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
}

.tax-no, .address, .phone, .bank-info {
  color: #5E626B;
  font-size: 13px;
  display: block;
  line-height: 1.6;
}

.item-actions {
  display: flex;
  gap: 12px;
  padding-top: 6px;
}

.action-link {
  background: transparent;
  border: none;
  color: #D7192D;
  font-size: 13px;
  padding: 0;

  &.danger {
    color: #B42318;
  }

  &:active {
    opacity: 0.7;
  }
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px; /* 稳定 px */
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

/* 开票记录 */
.record-item {
  padding: 12px 0;
  border-bottom: 1px solid #F5F5F6;

  &:last-of-type {
    border-bottom: none;
  }
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.record-no {
  font-size: 14px;
  font-weight: 500;
  color: #111216;
}

.record-body {
  padding-left: 4px;
}

.record-order, .record-amount, .record-time {
  color: #5E626B;
  font-size: 13px;
  display: block;
  line-height: 1.6;
}

.record-amount {
  color: #111216;
  font-weight: 500;
  margin-top: 2px;
}

.record-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #F5F5F6;
}

.download-btn, .retry-btn {
  min-height: 32px; /* 稳定 px */
  padding: 0 12px;
  border: 1px solid #D7192D;
  background: white;
  border-radius: 7px;
  font-size: 13px;
  color: #D7192D;

  &:active {
    background: rgba(215, 25, 45, 0.04);
  }
}

.bottom-spacer {
  height: 24px;
}
</style>
