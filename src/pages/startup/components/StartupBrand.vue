<template>
  <view class="brand-container">
    <!-- Logo -->
    <image 
      class="brand-logo" 
      src="/static/images/logo-v.png" 
      mode="aspectFit"
      alt="薰风logo"
    ></image>
    
    <!-- 品牌名 -->
    <text class="brand-name">薰风</text>
    
    <!-- 副标题 -->
    <text class="brand-subtitle">经销商订货平台</text>
  </view>
</template>

<script setup>
/**
 * StartupBrand - 品牌展示组件
 * 仅负责品牌 Logo、品牌名及副文案展示
 * 不读取 Token、不请求接口、不决定路由
 */
</script>

<style lang="scss" scoped>
.brand-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.brand-logo {
  width: 184rpx;
  height: 184rpx;
  filter: drop-shadow(0 28rpx 44rpx rgba(215, 25, 45, 0.12));
}

.brand-name {
  margin-top: 36rpx;
  font-size: 68rpx;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: $color-gray-950;
}

.brand-subtitle {
  margin-top: 24rpx;
  font-size: 32rpx;
  color: $color-gray-400;
  letter-spacing: 0.04em;
}

/* 小屏幕适配 */
@media (max-height: 600px) {
  .brand-logo {
    width: 140rpx;
    height: 140rpx;
  }
  .brand-name {
    font-size: 56rpx;
    margin-top: 24rpx;
  }
  .brand-subtitle {
    font-size: 28rpx;
    margin-top: 16rpx;
  }
}
</style>
