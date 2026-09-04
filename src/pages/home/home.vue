<!--
  ⚠️ [DEAD CODE] 此页面已废弃，将被删除！

  旧版经销商工作台首页（原主包 Tab 页面）
  替代者：pages/home/index.vue（V2 双入口首页）

  废弃原因：
  - 不在 pages.json 中注册
  - V2 架构改为无 TabBar 双入口设计
  - 新版首页路径：/pages/home/index

  当前状态：DEAD — 无任何活跃引用，等待物理删除
  计划删除版本：阶段1完成后
-->
<template>
  <view class="home-page">
    <!-- 顶部区域：经销商信息 + 消息入口 -->
    <view class="header-section">
      <view class="user-info">
        <image class="avatar" :src="userStore.dealerInfo.avatar || '/static/images/default-avatar.png'" mode="aspectFill" />
        <view class="info-text">
          <text class="store-name">{{ userStore.displayName }}</text>
          <text class="credit-tag">{{ userStore.creditLevel || '标准经销商' }}</text>
        </view>
      </view>
      <!-- 消息通知入口 -->
      <view class="message-entry" @click="goToMessages">
        <uni-icons type="notification" size="24" color="#333" />
        <view v-if="messageStore.hasUnread" class="unread-badge">
          {{ messageStore.unreadText }}
        </view>
      </view>
    </view>

    <!-- 授信额度卡片 -->
    <view class="credit-card">
      <view class="credit-header">
        <text class="credit-title">授信额度</text>
        <text class="credit-level">{{ userStore.creditLevel }}</text>
      </view>
      <view class="credit-amount">
        <text class="available">¥{{ (userStore.availableCreditLimit / 100).toFixed(2) }}</text>
        <text class="total">/ ¥{{ (userStore.totalCreditLimit / 100).toFixed(2) }}</text>
      </view>
      <view class="credit-progress">
        <view 
          class="progress-bar" 
          :style="{ width: creditPercent + '%' }"
        ></view>
      </view>
      <view class="credit-info-row">
        <text>信誉分: {{ userStore.creditScore }}</text>
        <text class="go-settlement" @click="goToSettlement">去对账</text>
      </view>
    </view>

    <!-- 快捷功能入口 -->
    <view class="quick-actions">
      <view class="action-item" @click="goToReplenish">
        <view class="action-icon replenish-icon">📋</view>
        <text class="action-text">补货清单</text>
      </view>
      <view class="action-item" @click="goToOrders">
        <view class="action-icon order-icon">📦</view>
        <text class="action-text">我的订单</text>
      </view>
      <view class="action-item" @click="goToAfterSale">
        <view class="action-icon after-sale-icon">🔄</view>
        <text class="action-text">售后申请</text>
      </view>
      <view class="action-item" v-if="userStore.isMainAccount" @click="goToSubAccount">
        <view class="action-icon account-icon">👥</view>
        <text class="action-text">子账号</text>
      </view>
    </view>

    <!-- 待处理事项 -->
    <view class="pending-section">
      <view class="section-header">
        <text class="section-title">待处理事项</text>
      </view>
      <view class="pending-list">
        <view class="pending-item" v-for="(item, index) in pendingList" :key="index" @click="handlePendingClick(item)">
          <view class="pending-icon">{{ item.icon }}</view>
          <view class="pending-content">
            <text class="pending-title">{{ item.title }}</text>
            <text class="pending-desc">{{ item.desc }}</text>
          </view>
          <view class="pending-count" v-if="item.count > 0">
            {{ item.count }}
          </view>
        </view>
      </view>
    </view>

    <!-- 公告区域 -->
    <view class="notice-section" v-if="latestNotice">
      <view class="notice-header">
        <uni-icons type="sound" size="16" color="#C41E3A" />
        <text class="notice-label">公告</text>
      </view>
      <text class="notice-text">{{ latestNotice }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/modules/user.js'
import { useMessageStore } from '../../store/modules/message.js'

const userStore = useUserStore()
const messageStore = useMessageStore()

// 最新公告
const latestNotice = ref('')

// 待处理事项列表
const pendingList = ref([
  { icon: '💰', title: '待付款', desc: '有订单等待付款', type: 'payment', count: 0 },
  { icon: '🚚', title: '待收货', desc: '商品正在配送中', type: 'shipped', count: 0 },
  { icon: '🔄', title: '售后中', desc: '售后订单处理中', type: 'afterSale', count: 0 }
])

// 授信额度使用百分比
const creditPercent = computed(() => {
  if (!userStore.totalCreditLimit) return 0
  return Math.round((userStore.usedCreditLimit / userStore.totalCreditLimit) * 100)
})

// 页面显示时刷新数据
onShow(async () => {
  await refreshData()
})

/**
 * 刷新首页数据
 * TODO: 调用接口获取授信额度、待处理数量、最新公告
 */
async function refreshData() {
  // TODO: getSettlementOverview() - 获取授信额度概览
  // TODO: getOrderCount() - 获取各状态订单数
  // TODO: getUnreadCount() - 获取未读消息数
  // TODO: getMessageList({ type: 99, pageSize: 1 }) - 获取最新公告
}

// ==================== 页面跳转方法 ====================

function goToMessages() {
  uni.navigateTo({
    url: '/subPackages/systemSub/messageList'
  })
}

function goToReplenish() {
  uni.navigateTo({
    url: '/subPackages/goodsSub/replenishList'
  })
}

function goToOrders() {
  uni.switchTab({
    url: '/pages/orderList/orderList' // 或跳转分包的orderList
  })
  // 实际应使用分包路径
  uni.navigateTo({
    url: '/subPackages/orderSub/orderList'
  })
}

function goToAfterSale() {
  uni.navigateTo({
    url: '/subPackages/afterSaleSub/applyAfterSale'
  })
}

function goToSubAccount() {
  uni.navigateTo({
    url: '/subPackages/accountSub/subAccountManage'
  })
}

function goToSettlement() {
  uni.navigateTo({
    url: '/subPackages/settlementSub/billList'
  })
}

function handlePendingClick(item) {
  const routes = {
    payment: '/subPackages/orderSub/orderList?status=1',
    shipped: '/subPackages/orderSub/orderList?status=3',
    afterSale: '/subPackages/afterSaleSub/afterSaleList'
  }
  if (routes[item.type]) {
    uni.navigateTo({ url: routes[item.type] })
  }
}
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background-color: var(--bg-color);
  padding-bottom: env(safe-area-inset-bottom);
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 32rpx 24rpx;
  background: linear-gradient(135deg, #C41E3A 0%, #E8445A 100%);
  
  .user-info {
    display: flex;
    align-items: center;
    
    .avatar {
      width: 96rpx;
      height: 96rpx;
      border-radius: 50%;
      border: 4rpx solid rgba(255,255,255,0.3);
    }
    
    .info-text {
      margin-left: 20rpx;
      
      .store-name {
        display: block;
        font-size: 32rpx;
        font-weight: 600;
        color: #fff;
      }
      
      .credit-tag {
        display: inline-block;
        font-size: 22rpx;
        color: rgba(255,255,255,0.8);
        background: rgba(255,255,255,0.15);
        padding: 2rpx 12rpx;
        border-radius: 20rpx;
        margin-top: 6rpx;
      }
    }
  }
  
  .message-entry {
    position: relative;
    padding: 12rpx;
    
    .unread-badge {
      position: absolute;
      top: 0;
      right: 0;
      min-width: 32rpx;
      height: 32rpx;
      line-height: 32rpx;
      text-align: center;
      font-size: 20rpx;
      color: #fff;
      background: #F56C6C;
      border-radius: 16rpx;
      padding: 0 8rpx;
    }
  }
}

.credit-card {
  margin: -40rpx 24rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(196, 30, 58, 0.1);
  
  .credit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
    
    .credit-title {
      font-size: 28rpx;
      color: var(--text-secondary);
    }
    
    .credit-level {
      font-size: 26rpx;
      color: var(--primary-color);
      font-weight: 600;
    }
  }
  
  .credit-amount {
    margin-bottom: 16rpx;
    
    .available {
      font-size: 48rpx;
      font-weight: 700;
      color: var(--primary-color);
    }
    
    .total {
      font-size: 28rpx;
      color: var(--text-placeholder);
    }
  }
  
  .credit-progress {
    height: 12rpx;
    background: #F0F0F0;
    border-radius: 6rpx;
    overflow: hidden;
    margin-bottom: 16rpx;
    
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #C41E3A, #E8445A);
      border-radius: 6rpx;
      transition: width 0.3s ease;
    }
  }
  
  .credit-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 24rpx;
    color: var(--text-secondary);
    
    .go-settlement {
      color: var(--primary-color);
      font-weight: 500;
    }
  }
}

.quick-actions {
  display: flex;
  justify-content: space-around;
  background: #fff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 32rpx 16rpx;
  
  .action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .action-icon {
      width: 88rpx;
      height: 88rpx;
      border-radius: 20rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40rpx;
      margin-bottom: 12rpx;
    }
    
    .replenish-icon { background: rgba(196, 30, 58, 0.08); }
    .order-icon { background: rgba(64, 158, 255, 0.08); }
    .after-sale-icon { background: rgba(230, 162, 60, 0.08); }
    .account-icon { background: rgba(103, 194, 58, 0.08); }
    
    .action-text {
      font-size: 24rpx;
      color: var(--text-primary);
    }
  }
}

.pending-section {
  background: #fff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  overflow: hidden;
  
  .section-header {
    padding: 24rpx 32rpx;
    border-bottom: 1rpx solid var(--border-color);
    
    .section-title {
      font-size: 30rpx;
      font-weight: 600;
      color: var(--text-primary);
    }
  }
  
  .pending-list {
    .pending-item {
      display: flex;
      align-items: center;
      padding: 28rpx 32rpx;
      border-bottom: 1rpx solid var(--border-color);
      
      &:last-child {
        border-bottom: none;
      }
      
      .pending-icon {
        font-size: 40rpx;
        margin-right: 20rpx;
      }
      
      .pending-content {
        flex: 1;
        
        .pending-title {
          display: block;
          font-size: 28rpx;
          color: var(--text-primary);
          margin-bottom: 4rpx;
        }
        
        .pending-desc {
          font-size: 24rpx;
          color: var(--text-placeholder);
        }
      }
      
      .pending-count {
        min-width: 36rpx;
        height: 36rpx;
        line-height: 36rpx;
        text-align: center;
        font-size: 22rpx;
        color: #fff;
        background: var(--primary-color);
        border-radius: 18rpx;
        padding: 0 10rpx;
      }
    }
  }
}

.notice-section {
  display: flex;
  align-items: center;
  background: #fff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx 32rpx;
  
  .notice-header {
    display: flex;
    align-items: center;
    margin-right: 16rpx;
    flex-shrink: 0;
    
    .notice-label {
      font-size: 26rpx;
      color: var(--primary-color);
      font-weight: 600;
      margin-left: 8rpx;
    }
  }
  
  .notice-text {
    font-size: 26rpx;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
