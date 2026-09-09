﻿<!--
  售后进度列表页面（分包：afterSaleSub）
  对应业务流程节点：
  售后闭环 → 查看售后审核进度、退货退款/换货补发结果
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="售后记录" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="after-sale-list-page">
          <!-- 状态Tab -->
          <scroll-view class="status-tabs" scroll-x>
            <view 
              class="tab-item" 
              :class="{ active: currentStatus === '' }"
              @click="switchStatus('')"
            >全部</view>
            <view 
              class="tab-item" 
              v-for="(tab, index) in statusTabs" 
              :key="index"
              :class="{ active: currentStatus === tab.value }"
              @click="switchStatus(tab.value)"
            >{{ tab.label }}</view>
          </scroll-view>

          <!-- 售后列表 -->
          <scroll-view class="list-wrapper" scroll-y @scrolltolower="loadMore">
            <view class="as-list">
              <view 
                class="as-card" 
                v-for="item in asList" 
                :key="item.afterSaleId"
                @click="goToDetail(item.afterSaleId)"
              >
                <!-- 卡片头部 -->
                <view class="card-header">
                  <view class="header-left">
                    <text class="type-tag" :class="'type-' + item.type">{{ getTypeLabel(item.type) }}</text>
                    <text class="as-no">NO.{{ item.afterSaleNo }}</text>
                  </view>
                  <status-tag :type="getAfterSaleStatusType(item.status)" :text="getStatusDesc(item.status)" />
                </view>

                <!-- 商品信息 -->
                <view class="goods-info">
                  <AppProductImage class="goods-img" :src="item.goodsImage" mode="aspectFill" />
                  <view class="goods-detail">
                    <text class="goods-name">{{ item.goodsName }}</text>
                    <text class="apply-reason">原因: {{ item.reason }}</text>
                  </view>
                </view>

                <!-- 进度条 -->
                <view class="progress-bar-wrap" v-if="item.status !== -1 && item.status !== 4">
                  <view class="progress-track">
                    <view 
                      class="progress-fill" 
                      :style="{ width: getProgressPercent(item.status) + '%' }"
                    ></view>
                  </view>
                  <text class="progress-text">{{ getStatusDesc(item.status) }}</text>
                </view>

                <!-- 底部信息 -->
                <view class="card-footer">
                  <text class="apply-time">申请时间: {{ item.createTime }}</text>
                  <view class="actions" v-if="getActions(item.status).length > 0">
                    <button 
                      v-for="action in getActions(item.status)" 
                      :key="action.key"
                      class="action-btn"
                      :class="action.type"
                      @click.stop="handleAction(action.key, item)"
                    >{{ action.label }}</button>
                  </view>
                </view>
              </view>
            </view>

            <AppPageState v-if="!loading && asList.length === 0" state="empty" title="暂无售后记录">
              <template #illustration>
                <AppSvgIllustration :svg="noOrderSvg" size="lg" />
              </template>
            </AppPageState>

            <view class="load-more" v-if="asList.length > 0">
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
// TODO: 接入后端售后列表接口后可启用
// import { getAfterSaleList, cancelAfterSale } from '../../api/afterSaleApi.js'
import statusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import noOrderSvg from '../../../../shared/assets/illustrations/no-order.svg?raw'

const statusTabs = reactive([
  { value: 0, label: '待审核' },
  { value: 1, label: '已通过' },
  { value: 3, label: '待退货' },
  { value: 4, label: '已完成' }
])

const currentStatus = ref('')
const asList = ref([])
const loading = ref(false)
const hasMore = ref(true)

onShow(() => {
  loadAsList()
})

function switchStatus(status) {
  currentStatus.value = status
  asList.value = []
  hasMore.value = true
  loadAsList()
}

// TODO: 待接入后端售后列表接口（getAfterSaleList）
function loadAsList() {}
function loadMore() {}

function goToDetail(afterSaleId) {
  // 可扩展为售后详情页
  uni.showToast({ title: '详情页开发中', icon: 'none' })
}

function getTypeLabel(type) {
  const map = { 1: '退货退款', 2: '换货补发', 3: '仅退款' }
  return map[type] || ''
}

function getProgressPercent(status) {
  const map = { 0: 25, 1: 50, 3: 75 }
  return map[status] || 0
}

function getStatusDesc(status) {
  const map = {
    0: '等待品牌方审核',
    1: '审核通过，等待处理',
    3: '请尽快寄回商品'
  }
  return map[status] || ''
}

function getAfterSaleStatusType(status) {
  const map = {
    0: 'warning',
    1: 'info',
    3: 'warning',
    4: 'success',
    '-1': 'error'
  }
  return map[status] || 'default'
}

function getActions(status) {
  const actionMap = {
    0: [{ key: 'cancel', label: '取消申请', type: 'default' }],
    3: [{ key: 'fillLogistics', label: '填写物流', type: 'primary' }]
  }
  return actionMap[status] || []
}

function handleAction(key, item) {
  switch (key) {
    case 'cancel':
      uni.showModal({
        title: '提示',
        content: '确定取消该售后申请吗？',
        success: async (res) => {
          if (res.confirm) {
            // await cancelAfterSale(item.afterSaleId)
            uni.showToast({ title: '已取消', icon: 'success' })
            loadAsList()
          }
        }
      })
      break
    case 'fillLogistics':
      uni.showToast({ title: '填写物流信息开发中', icon: 'none' })
      break
  }
}
</script>

<style lang="scss" scoped>
.after-sale-list-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color);
}

.status-tabs {
  display: flex;
  white-space: nowrap;
  background: #fff;
  padding: 0 8rpx;
  flex-shrink: 0;
  
  .tab-item {
    display: inline-flex;
    align-items: center;
    padding: 24rpx 28rpx;
    font-size: 28rpx;
    color: var(--text-secondary);
    position: relative;
    
    &.active {
      color: var(--primary-color);
      font-weight: 600;
      
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 40rpx;
        height: 4rpx;
        background: var(--primary-color);
        border-radius: 2rpx;
      }
    }
  }
}

.list-wrapper {
  flex: 1;
  padding: 16rpx 24rpx;
}

.as-list {
  .as-card {
    background: #fff;
    border-radius: 12rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20rpx;
      
      .header-left {
        display: flex;
        align-items: center;
        
        .type-tag {
          font-size: 22rpx;
          color: #fff;
          padding: 2rpx 12rpx;
          border-radius: 4rpx;
          margin-right: 12rpx;
          
          &.type-1 { background: #E6A23C; }
          &.type-2 { background: #409EFF; }
          &.type-3 { background: #67C23A; }
        }
        
        .as-no {
          font-size: 22rpx;
          color: var(--text-placeholder);
        }
      }
    }
    
    .goods-info {
      display: flex;
      margin-bottom: 16rpx;
      
      .goods-img {
        width: 140rpx;
        height: 140rpx;
        border-radius: 8rpx;
        flex-shrink: 0;
      }
      
      .goods-detail {
        margin-left: 16rpx;
        
        .goods-name {
          display: block;
          font-size: 26rpx;
          color: var(--text-primary);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .apply-reason {
          display: block;
          font-size: 22rpx;
          color: var(--text-placeholder);
          margin-top: 8rpx;
        }
      }
    }
    
    .progress-bar-wrap {
      margin-bottom: 16rpx;
      
      .progress-track {
        height: 8rpx;
        background: #F0F0F0;
        border-radius: 4rpx;
        overflow: hidden;
        margin-bottom: 8rpx;
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #C41E3A, #E8445A);
          border-radius: 4rpx;
          transition: width 0.3s ease;
        }
      }
      
      .progress-text {
        font-size: 22rpx;
        color: var(--text-secondary);
      }
    }
    
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16rpx;
      border-top: 1rpx solid var(--border-color);
      
      .apply-time {
        font-size: 22rpx;
        color: var(--text-placeholder);
      }
      
      .actions {
        display: flex;
        gap: 12rpx;
        
        .action-btn {
          min-width: 140rpx;
          height: 54rpx;
          line-height: 54rpx;
          font-size: 24rpx;
          border-radius: 27rpx;
          border: none;
          padding: 0 16rpx;
          
          &.primary {
            background: var(--primary-color);
            color: #fff;
          }
          
          &.default {
            background: transparent;
            color: var(--text-secondary);
            border: 1rpx solid var(--border-color);
          }
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
