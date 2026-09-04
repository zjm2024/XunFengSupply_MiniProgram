<!--
  ⚠️ [DEAD CODE] 此页面已废弃，将被删除！

  旧版个人中心页面（原主包 Tab 页面）
  替代者：pages/dealer-center/index.vue（V2 经销商中心）

  废弃原因：
  - 不在 pages.json 中注册
  - V2 架构改为经销商中心设计
  - 新版经销商中心路径：/pages/dealer-center/index

  当前状态：DEAD — 无任何活跃引用，等待物理删除
  计划删除版本：阶段1完成后
-->
<template>
  <view class="mine-page">
    <!-- 用户信息头部 -->
    <view class="profile-header">
      <view class="profile-bg"></view>
      <view class="profile-content">
        <image class="avatar" :src="userStore.dealerInfo.avatar || '/static/images/default-avatar.png'" mode="aspectFill" />
        <view class="profile-info">
          <view class="name-row">
            <text class="name">{{ userStore.displayName }}</text>
            <view class="role-tag">{{ roleLabel }}</view>
          </view>
          <text class="phone">{{ userStore.dealerInfo.contactPhone || '未绑定手机' }}</text>
        </view>
        <view class="settings-btn" @click="goToSettings">
          <uni-icons type="gear" size="24" color="#fff" />
        </view>
      </view>
    </view>

    <!-- 授信信息卡片 -->
    <view class="credit-info-card">
      <view class="info-item">
        <text class="label">信誉分</text>
        <view class="value-row">
          <text class="score" :class="getScoreClass(userStore.creditScore)">{{ userStore.creditScore }}</text>
          <text class="level">{{ userStore.creditLevel || '标准经销商' }}</text>
        </view>
      </view>
      <view class="divider"></view>
      <view class="info-item">
        <text class="label">授信额度</text>
        <text class="value">¥{{ (userStore.totalCreditLimit / 100).toFixed(2) }}</text>
      </view>
      <view class="divider"></view>
      <view class="info-item">
        <text class="label">可用额度</text>
        <text class="value available">¥{{ (userStore.availableCreditLimit / 100).toFixed(2) }}</text>
      </view>
    </view>

    <!-- 功能菜单列表 -->
    <view class="menu-section">
      <!-- 订单相关 -->
      <view class="menu-group">
        <view class="menu-item" @click="goToPage('/subPackages/orderSub/orderList')">
          <view class="menu-icon-wrap order-icon"><uni-icons type="list" size="20" /></view>
          <text class="menu-text">我的订单</text>
          <uni-icons type="right" size="16" color="#CCC" />
        </view>
        <view class="menu-item" @click="goToPage('/subPackages/settlementSub/billList')">
          <view class="menu-icon-wrap bill-icon"><uni-icons type="wallet" size="20" /></view>
          <text class="menu-text">月度账单</text>
          <uni-icons type="right" size="16" color="#CCC" />
        </view>
        <view class="menu-item" @click="goToPage('/subPackages/afterSaleSub/afterSaleList')">
          <view class="menu-icon-wrap after-sale-icon"><uni-icons type="loop" size="20" /></view>
          <text class="menu-text">售后记录</text>
          <uni-icons type="right" size="16" color="#CCC" />
        </view>
      </view>

      <!-- 账号管理 -->
      <view class="menu-group">
        <view class="menu-item" v-if="userStore.isMainAccount" @click="goToPage('/subPackages/accountSub/subAccountManage')">
          <view class="menu-icon-wrap account-icon"><uni-icons type="personadd" size="20" /></view>
          <text class="menu-text">子账号管理</text>
          <uni-icons type="right" size="16" color="#CCC" />
        </view>
        <view class="menu-item" @click="goToPage('/subPackages/authSub/applySign')">
          <view class="menu-icon-wrap qual-icon"><uni-icons type="paperplane" size="20" /></view>
          <text class="menu-text">资质管理</text>
          <status-tag :status="signStatusTag" />
          <uni-icons type="right" size="16" color="#CCC" />
        </view>
        <view class="menu-item" @click="contactService">
          <view class="menu-icon-wrap service-icon"><uni-icons type="headphones" size="20" /></view>
          <text class="menu-text">联系客服</text>
          <uni-icons type="right" size="16" color="#CCC" />
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="menu-group">
        <view class="menu-item logout-item" @click="handleLogout">
          <text class="logout-text">退出登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/modules/user.js'
import statusTag from '../../components/status-tag/status-tag.vue'

const userStore = useUserStore()

// 角色标签文本
const roleLabel = computed(() => {
  const map = {
    admin: '总店管理员',
    salesman: '业务员',
    finance: '财务人员'
  }
  return map[userStore.role] || ''
})

// 签约状态标签
const signStatusTag = computed(() => ({
  value: userStore.signStatus,
  label: ['', '审核中', '已签约', ''][userStore.signStatus + 1] || '未签约',
  color: ['#909399', '#FF9800', '#67C23A', '#F56C6C'][userStore.signStatus + 1] || '#909399'
}))

onShow(() => {
  // TODO: 刷新用户信息、授信额度等
})

/**
 * 根据信誉分返回样式类名
 */
function getScoreClass(score) {
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}

/**
 * 页面跳转
 */
function goToPage(url) {
  uni.navigateTo({ url })
}

/**
 * 设置页
 */
function goToSettings() {
  // TODO: 跳转设置页面
  uni.showToast({ title: '开发中', icon: 'none' })
}

/**
 * 联系客服
 */
function contactService() {
  // TODO: 拨打客服电话或打开在线客服
  uni.showModal({
    title: '联系客服',
    content: '客服电话：400-XXX-XXXX\n工作时间：周一至周五 9:00-18:00',
    showCancel: false
  })
}

/**
 * 退出登录
 */
function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    confirmColor: '#C41E3A',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({ url: '/subPackages/authSub/login' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.mine-page {
  min-height: 100vh;
  background: var(--bg-color);
  padding-bottom: env(safe-area-inset-bottom);
}

.profile-header {
  position: relative;
  padding: 0 32rpx 40rpx;
  
  .profile-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 300rpx;
    background: linear-gradient(135deg, #C41E3A 0%, #9A1729 100%);
    border-radius: 0 0 40rpx 40rpx;
  }
  
  .profile-content {
    position: relative;
    display: flex;
    align-items: center;
    padding-top: 80rpx;
    
    .avatar {
      width: 120rpx;
      height: 120rpx;
      border-radius: 50%;
      border: 4rpx solid rgba(255,255,255,0.3);
    }
    
    .profile-info {
      flex: 1;
      margin-left: 24rpx;
      
      .name-row {
        display: flex;
        align-items: center;
        
        .name {
          font-size: 36rpx;
          font-weight: 700;
          color: #fff;
        }
        
        .role-tag {
          font-size: 20rpx;
          color: #fff;
          background: rgba(255,255,255,0.2);
          padding: 2rpx 12rpx;
          border-radius: 16rpx;
          margin-left: 12rpx;
        }
      }
      
      .phone {
        display: block;
        font-size: 26rpx;
        color: rgba(255,255,255,0.7);
        margin-top: 8rpx;
      }
    }
    
    .settings-btn {
      padding: 12rpx;
    }
  }
}

.credit-info-card {
  display: flex;
  margin: -30rpx 24rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
  
  .info-item {
    flex: 1;
    padding: 28rpx 16rpx;
    text-align: center;
    
    .label {
      display: block;
      font-size: 24rpx;
      color: var(--text-secondary);
      margin-bottom: 10rpx;
    }
    
    .value {
      font-size: 32rpx;
      font-weight: 700;
      color: var(--text-primary);
      
      &.available {
        color: var(--primary-color);
      }
    }
    
    .value-row {
      display: flex;
      align-items: center;
      justify-content: center;
      
      .score {
        font-size: 36rpx;
        font-weight: 700;
        
        &.high { color: #67C23A; }
        &.medium { color: #E6A23C; }
        &.low { color: #F56C6C; }
      }
      
      .level {
        font-size: 22rpx;
        color: var(--text-secondary);
        background: var(--bg-color);
        padding: 2rpx 12rpx;
        border-radius: 16rpx;
        margin-left: 10rpx;
      }
    }
  }
  
  .divider {
    width: 1rpx;
    background: var(--border-color);
    align-self: stretch;
    margin: 20rpx 0;
  }
}

.menu-section {
  .menu-group {
    background: #fff;
    margin: 0 24rpx 20rpx;
    border-radius: 16rpx;
    overflow: hidden;
    
    .menu-item {
      display: flex;
      align-items: center;
      padding: 28rpx 32rpx;
      border-bottom: 1rpx solid var(--border-color);
      
      &:last-child {
        border-bottom: none;
      }
      
      .menu-icon-wrap {
        width: 64rpx;
        height: 64rpx;
        border-radius: 14rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 20rpx;
        
        &.order-icon { background: rgba(64, 158, 255, 0.08); color: #409EFF; }
        &.bill-icon { background: rgba(230, 162, 60, 0.08); color: #E6A23C; }
        &.after-sale-icon { background: rgba(196, 30, 58, 0.08); color: #C41E3A; }
        &.account-icon { background: rgba(103, 194, 58, 0.08); color: #67C23A; }
        &.qual-icon { background: rgba(144, 147, 153, 0.08); color: #909399; }
        &.service-icon { background: rgba(255, 152, 0, 0.08); color: #FF9800; }
      }
      
      .menu-text {
        flex: 1;
        font-size: 30rpx;
        color: var(--text-primary);
      }
      
      &.logout-item {
        justify-content: center;
        
        .logout-text {
          color: #F56C6C;
          font-size: 30rpx;
        }
      }
    }
  }
}
</style>
