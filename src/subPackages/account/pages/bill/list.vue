﻿﻿<!--
  月度对账账单列表页面（分包：settlementSub）
  对应业务流程节点：
  收货对账结算 → 月度账单列表查看
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="月度账单" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="bill-list-page">
          <!-- 月份选择器 -->
          <view class="month-picker">
            <picker mode="date" fields="month" :value="currentMonth" @change="onMonthChange">
              <view class="picker-trigger">
                <text class="month-text">{{ formatMonthDisplay(currentMonth) }}</text>
                <AppIcon name="chevron-down" :size="14" color="#666" />
              </view>
            </picker>
          </view>

          <!-- 结算概览卡片 -->
          <view class="overview-card">
            <view class="overview-item">
              <text class="ov-label">本月应付</text>
              <text class="ov-value primary">¥{{ (overview.totalAmount / 100).toFixed(2) }}</text>
            </view>
            <view class="overview-divider"></view>
            <view class="overview-item">
              <text class="ov-label">已结清</text>
              <text class="ov-value success">¥{{ (overview.settledAmount / 100).toFixed(2) }}</text>
            </view>
            <view class="overview-divider"></view>
            <view class="overview-item">
              <text class="ov-label">待结算</text>
              <text class="ov-value warn">¥{{ ((overview.totalAmount - overview.settledAmount) / 100).toFixed(2) }}</text>
            </view>
          </view>

          <!-- 账单列表 -->
          <scroll-view class="list-wrapper" scroll-y @scrolltolower="loadMore">
            <view class="bill-list">
              <view 
                class="bill-card" 
                v-for="bill in billList" 
                :key="bill.billId"
                @click="goToDetail(bill.billId)"
              >
                <view class="card-header">
                  <view class="bill-info">
                    <text class="bill-month">{{ bill.year }}年{{ String(bill.month).padStart(2, '0') }}月账单</text>
                    <text class="bill-no">NO.{{ bill.billNo }}</text>
                  </view>
                  <status-tag :type="getBillStatusType(bill.status)" :text="getBillStatusText(bill.status)" />
                </view>

                <view class="card-body">
                  <view class="bill-row">
                    <text class="row-label">订单数</text>
                    <text class="row-value">{{ bill.orderCount }}笔</text>
                  </view>
                  <view class="bill-row">
                    <text class="row-label">账单金额</text>
                    <text class="row-value amount">¥{{ (bill.amount / 100).toFixed(2) }}</text>
                  </view>
                  <view class="bill-row">
                    <text class="row-label">已还金额</text>
                    <text class="row-value">¥{{ (bill.paidAmount / 100).toFixed(2) }}</text>
                  </view>
                  <view class="bill-row">
                    <text class="row-label">还款截止</text>
                    <text class="row-value" :class="{ overdue: isOverdue(bill) }">{{ bill.dueDate }}</text>
                  </view>
                </view>

                <!-- 操作按钮 -->
                <view class="card-actions" v-if="bill.status !== 2">
                  <button 
                    class="action-btn primary"
                    v-if="[0, 1].includes(bill.status)"
                    @click.stop="handlePay(bill)"
                  >去还款</button>
                  <button 
                    class="action-btn default"
                    v-if="bill.status === 2"
                    @click.stop="handleExport(bill)"
                  >导出凭证</button>
                </view>
              </view>
            </view>

            <AppPageState v-if="!loading && billList.length === 0" state="empty" title="暂无账单记录">
              <template #illustration>
                <AppSvgIllustration :svg="noRevenueSvg" size="lg" />
              </template>
            </AppPageState>

            <view class="load-more" v-if="billList.length > 0">
              <text v-if="hasMore">加载中...</text>
              <text v-else class="no-more">— 已经到底了 —</text>
            </view>
          </scroll-view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getBillList, payBill, exportBillVoucher } from '../../api/settlement.js'
import statusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import noRevenueSvg from '../../../../shared/assets/illustrations/no-revenue.svg?raw'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const currentMonth = ref('')
const billList = ref([])
const loading = ref(false)
const hasMore = ref(true)
const overview = reactive({
  totalAmount: 0,
  settledAmount: 0
})

// 初始化当前月份
const now = new Date()
currentMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

onShow(() => {
  loadBillList()
})

function onMonthChange(e) {
  currentMonth.value = e.detail.value
  loadBillList()
}

function formatMonthDisplay(monthStr) {
  if (!monthStr) return ''
  const [y, m] = monthStr.split('-')
  return `${y}年${m}月`
}

/**
 * 加载账单列表
 * TODO: 调用 getBillList({ year, month }) 接口
 */
async function loadBillList() {
  loading.value = true
  try {
    // const [y, m] = currentMonth.value.split('-')
    // const res = await getBillList({ year: parseInt(y), month: parseInt(m) })
    // billList.value = res.list
    // Object.assign(overview, res.overview)
    loading.value = false
  } catch (e) {
    console.error('加载账单失败:', e)
    loading.value = false
  }
}

function loadMore() {}

function goToDetail(billId) {
  navigator.navigateTo(routes.account.billDetail(billId))
}

function getBillStatusType(status) {
  const map = { 0: 'warning', 1: 'info', 2: 'success', 3: 'error' }
  return map[status] || 'default'
}

function getBillStatusText(status) {
  const map = { 0: '待还款', 1: '部分还款', 2: '已结清', 3: '已逾期' }
  return map[status] || '未知'
}

function isOverdue(bill) {
  return bill.status === 3
}

async function handlePay(bill) {
  navigator.navigateTo(routes.order.pay(bill.billId))
}

async function handleExport(bill) {
  try {
    // await exportBillVoucher(bill.billId)
    uni.showToast({ title: '导出成功', icon: 'success' })
  } catch (e) {
    console.error('导出失败:', e)
  }
}
</script>

<style lang="scss" scoped>
.bill-list-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color);
}

.month-picker {
  background: #fff;
  padding: 20rpx 32rpx;
  text-align: center;
  
  .picker-trigger {
    display: inline-flex;
    align-items: center;
    
    .month-text {
      font-size: 30rpx;
      font-weight: 600;
      color: var(--text-primary);
      margin-right: 8rpx;
    }
  }
}

.overview-card {
  display: flex;
  background: #fff;
  margin: 16rpx 24rpx;
  border-radius: 12rpx;
  padding: 28rpx 16rpx;
  
  .overview-item {
    flex: 1;
    text-align: center;
    
    .ov-label {
      display: block;
      font-size: 24rpx;
      color: var(--text-secondary);
      margin-bottom: 8rpx;
    }
    
    .ov-value {
      font-size: 32rpx;
      font-weight: 700;
      
      &.primary { color: var(--primary-color); }
      &.success { color: #67C23A; }
      &.warn { color: #E6A23C; }
    }
  }
  
  .overview-divider {
    width: 1rpx;
    background: var(--border-color);
    align-self: stretch;
    margin: 8rpx 0;
  }
}

.list-wrapper {
  flex: 1;
  padding: 16rpx 24rpx;
}

.bill-list {
  .bill-card {
    background: #fff;
    border-radius: 12rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20rpx;
      
      .bill-info {
        .bill-month {
          display: block;
          font-size: 30rpx;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .bill-no {
          display: block;
          font-size: 22rpx;
          color: var(--text-placeholder);
          margin-top: 4rpx;
        }
      }
    }
    
    .card-body {
      .bill-row {
        display: flex;
        justify-content: space-between;
        padding: 10rpx 0;
        
        .row-label {
          font-size: 26rpx;
          color: var(--text-secondary);
        }
        
        .row-value {
          font-size: 26rpx;
          color: var(--text-primary);
          
          &.amount {
            font-weight: 700;
            color: var(--primary-color);
          }
          
          &.overdue {
            color: #F56C6C;
          }
        }
      }
    }
    
    .card-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 20rpx;
      padding-top: 16rpx;
      border-top: 1rpx solid var(--border-color);
      
      .action-btn {
        min-width: 160rpx;
        height: 60rpx;
        line-height: 60rpx;
        font-size: 26rpx;
        border-radius: 30rpx;
        border: none;
        
        &.primary {
          background: var(--primary-color);
          color: #fff;
        }
        
        &.default {
          background: transparent;
          color: var(--text-primary);
          border: 1rpx solid var(--border-color);
        }
      }
    }
  }
}

.load-more {
  text-align: center;
  padding: 24rpx 0;
  font-size: 24rpx;
  color: var(--text-placeholder);
  
  .no-more { color: #CCC; }
}
</style>
