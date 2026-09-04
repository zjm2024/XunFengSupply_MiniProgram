<template>
  <view class="loading-container">
    <!-- Logo（小尺寸） -->
    <image 
      class="loading-logo" 
      src="/static/images/logo.png" 
      mode="aspectFit"
      alt="薰风logo"
    ></image>
    
    <!-- 加载 spinner -->
    <view class="loading-spinner"></view>
    
    <!-- 加载文案 -->
    <text class="loading-title">{{ title }}</text>
    <text class="loading-tip">{{ tip }}</text>
    
    <!-- Slogan -->
    <text class="loading-slogan">让订货更简单 · 让生意更好做</text>
  </view>
</template>

<script setup>
/**
 * StartupLoading - 加载反馈组件
 * 展示连续的加载反馈和用户可理解的文案
 * 不显示内部技术术语
 */

defineProps({
  title: {
    type: String,
    default: '正在准备您的经销商工作台'
  },
  tip: {
    type: String,
    default: '请稍候，数据加载中...'
  }
})
</script>

<style lang="scss" scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.loading-logo {
  width: 120rpx;
  height: 120rpx;
  filter: drop-shadow(0 16rpx 28rpx rgba(215, 25, 45, 0.1));
}

/* 旋转加载动画 */
.loading-spinner {
  width: 72rpx;
  height: 72rpx;
  margin-top: 48rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(215, 25, 45, 0.12);
  border-top-color: $color-brand-500;
  border-right-color: $color-brand-500;
  animation: startup-spin 0.85s linear infinite;
  box-shadow: 0 16rpx 40rpx rgba(215, 25, 45, 0.08);
}

@keyframes startup-spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-title {
  margin-top: 32rpx;
  font-size: 32rpx;
  font-weight: $font-weight-semibold;
  color: $color-gray-950;
}

.loading-tip {
  margin-top: 12rpx;
  color: $color-gray-400;
  font-size: 26rpx;
}

.loading-slogan {
  position: absolute;
  bottom: 60rpx;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 24rpx;
  color: $color-gray-300;
  letter-spacing: 0.13em;
}
</style>
