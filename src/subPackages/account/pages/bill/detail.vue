﻿﻿﻿﻿<!--
  账单详情+导出PDF凭证页面（分包：settlementSub）
  对应业务流程节点：
  收货对账结算 → 查看账单明细、导出PDF凭证、线上结清恢复授信额度
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="账单详情" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="bill-detail-page" v-if="billInfo.billId">
          <!-- 账单头部 -->
          <view class="bill-header">
            <text class="bill-title">{{ billInfo.year }}年{{ String(billInfo.month).padStart(2, '0') }}月 对账账单</text>
            <status-tag :type="getBillStatusType(billInfo.status)" :text="getBillStatusText(billInfo.status)" />
          </view>

          <!-- 账单汇总 -->
          <view class="summary-card">
            <view class="summary-row main">
              <text class="s-label">账单总额</text>
              <text class="s-value">¥{{ (billInfo.amount / 100).toFixed(2) }}</text>
            </view>
            <view class="summary-rows">
              <view class="summary-row">
                <text class="s-label">已还金额</text>
                <text class="s-value success">- ¥{{ (billInfo.paidAmount / 100).toFixed(2) }}</text>
              </view>
              <view class="summary-row">
                <text class="s-label">待还金额</text>
                <text class="s-value warn">¥{{ ((billInfo.amount - billInfo.paidAmount) / 100).toFixed(2) }}</text>
              </view>
              <view class="summary-row">
                <text class="s-label">关联订单数</text>
                <text class="s-value">{{ billInfo.orderCount }} 笔</text>
              </view>
              <view class="summary-row">
                <text class="s-label">还款截止日</text>
                <text class="s-value" :class="{ overdue: billInfo.status === 3 }">{{ billInfo.dueDate }}</text>
              </view>
            </view>
          </view>

          <!-- 关联订单明细 -->
          <view class="order-items-section">
            <view class="section-title">关联订单明细</view>
            
            <view class="order-item" v-for="item in orderItems" :key="item.orderItemId">
              <view class="order-top">
                <text class="order-no">{{ item.orderNo }}</text>
                <text class="order-date">{{ item.payTime }}</text>
              </view>
              <view class="order-middle">
                <text class="goods-name">{{ item.goodsName }} x{{ item.quantity }}</text>
                <text class="order-amount">¥{{ (item.amount / 100).toFixed(2) }}</text>
              </view>
            </view>
          </view>

          <!-- 底部占位，避免内容被 FixedActionBar 遮挡 -->
          <view style="height: 100rpx;" v-if="[0, 1].includes(billInfo.status) || billInfo.status === 2" />
        </view>

        <!-- 加载中 -->
        <view v-else class="loading-page">
          <text class="loading-text">加载中...</text>
        </view>
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar v-if="billInfo.billId">
        <button class="export-btn" @click="handleExport">
          <AppIcon name="download" :size="16" color="#C41E3A" />
          导出PDF凭证
        </button>
        <button 
          class="pay-btn" 
          v-if="[0, 1].includes(billInfo.status)"
          @click="handlePay"
        >
          立即还款 ¥{{ ((billInfo.amount - billInfo.paidAmount) / 100).toFixed(2) }}
        </button>
        <view class="settled-tag" v-if="billInfo.status === 2">
          <AppIcon name="check" :size="16" color="#67C23A" :stroke-width="2.2" />
          已结清
        </view>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getBillDetail, getBillOrderItems, exportBillVoucher, payBill } from '../../api/settlement.js'
import statusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const billId = ref('')
const billInfo = ref({})
const orderItems = ref([])

onLoad(async (options) => {
  billId.value = options.billId
  await Promise.all([loadBillDetail(), loadOrderItems()])
})

/**
 * 加载账单详情
 * TODO: 调用 getBillDetail(billId.value)
 */
async function loadBillDetail() {
  try {
    // const res = await getBillDetail(billId.value)
    // billInfo.value = res
  } catch (e) {
    console.error('加载账单详情失败:', e)
  }
}

/**
 * 加载关联订单明细
 * TODO: 调用 getBillOrderItems(billId.value)
 */
async function loadOrderItems() {
  try {
    // const res = await getBillOrderItems(billId.value, { page: 1, pageSize: 50 })
    // orderItems.value = res.list
  } catch (e) {
    console.error('加载订单明细失败:', e)
  }
}

/**
 * 导出PDF凭证
 */
async function handleExport() {
  uni.showLoading({ title: '导出中...' })
  try {
    // await exportBillVoucher(billId.value)
    uni.hideLoading()
    uni.showToast({ title: '导出成功，请查看下载文件', icon: 'none' })
  } catch (e) {
    uni.hideLoading()
    console.error('导出失败:', e)
  }
}

/**
 * 还款操作
 */
function getBillStatusType(status) {
  const map = { 0: 'warning', 1: 'info', 2: 'success', 3: 'error' }
  return map[status] || 'default'
}

function getBillStatusText(status) {
  const map = { 0: '待还款', 1: '部分还款', 2: '已结清', 3: '已逾期' }
  return map[status] || '未知'
}

function handlePay() {
  // 账单还款使用 account.billPay，禁止将 billId 传给 order.pay
  navigator.navigateTo(routes.account.billPay(billId.value))
}
</script>

<style lang="scss" scoped>
.bill-detail-page {
  min-height: 100%;
  background: var(--bg-color);
}

.loading-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;

  .loading-text {
    font-size: 28rpx;
    color: var(--text-secondary);
  }
}

.bill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #C41E3A, #9A1729);
  padding: 40rpx 32rpx;
  border-radius: 12rpx;
  margin: 16rpx 24rpx;
  
  .bill-title {
    font-size: 34rpx;
    font-weight: 700;
    color: #fff;
  }
}

.summary-card {
  background: #fff;
  margin: 0 24rpx 24rpx;
  border-radius: 12rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
  
  .summary-row.main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 24rpx;
    border-bottom: 2rpx solid var(--border-color);
    margin-bottom: 16rpx;
    
    .s-label {
      font-size: 28rpx;
      color: var(--text-secondary);
    }
    
    .s-value {
      font-size: 44rpx;
      font-weight: 700;
      color: var(--primary-color);
    }
  }
  
  .summary-rows {
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 12rpx 0;
      
      .s-label {
        font-size: 26rpx;
        color: var(--text-secondary);
      }
      
      .s-value {
        font-size: 26rpx;
        color: var(--text-primary);
        
        &.success { color: #67C23A; }
        &.warn { color: #E6A23C; }
        
        &.overdue { color: #F56C6C; }
      }
    }
  }
}

.order-items-section {
  background: #fff;
  margin: 0 24rpx 24rpx;
  border-radius: 12rpx;
  padding: 28rpx 32rpx;
  
  .section-title {
    font-size: 30rpx;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20rpx;
  }
  
  .order-item {
    padding: 20rpx 0;
    border-bottom: 1rpx solid var(--border-color);
    
    &:last-child { border-bottom: none; }
    
    .order-top {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10rpx;
      
      .order-no {
        font-size: 24rpx;
        color: var(--text-secondary);
      }
      
      .order-date {
        font-size: 24rpx;
        color: var(--text-placeholder);
      }
    }
    
    .order-middle {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .goods-name {
        font-size: 28rpx;
        color: var(--text-primary);
      }
      
      .order-amount {
        font-size: 28rpx;
        font-weight: 600;
        color: var(--primary-color);
      }
    }
  }
}

.export-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  padding: 0 32rpx;
  background: transparent;
  color: var(--primary-color);
  border: 1rpx solid var(--primary-color);
  border-radius: 40rpx;
  font-size: 28rpx;
  flex-shrink: 0;
}

.pay-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  background: var(--primary-color);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 40rpx;
  border: none;
  margin-left: 16rpx;
}

.settled-tag {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  background: rgba(103, 194, 58, 0.08);
  color: #67C23A;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 40rpx;
}
</style>
