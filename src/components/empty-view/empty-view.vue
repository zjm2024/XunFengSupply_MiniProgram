<!--
  ⚠️ [DEPRECATED] 此组件已废弃！

  旧版空状态组件（使用 uni-icons）
  替代者：components/AppPageState/AppPageState.vue（统一页面状态容器）

  废弃原因：
  - 功能已被 AppPageState 完全覆盖
  - AppPageState 提供更完整的状态管理（loading/empty/error/offline）

  当前状态：DEPRECATED — 所有引用应迁移到 AppPageState
  计划删除版本：阶段2确认无引用后
-->
<template>
  <view class="empty-view">
    <view class="empty-icon">
      <image v-if="customIcon" :src="customIcon" mode="aspectFit" class="icon-img" />
      <uni-icons v-else type="box" size="80" color="#CCCCCC" />
    </view>
    <text class="empty-text">{{ text }}</text>
    <slot></slot>
  </view>
</template>

<script setup>
defineProps({
  text: { type: String, default: '暂无数据' },
  customIcon: { type: String, default: '' }
})
</script>

<style lang="scss" scoped>
.empty-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
  
  .empty-icon {
    margin-bottom: 24rpx;
    
    .icon-img {
      width: 160rpx;
      height: 160rpx;
    }
  }
  
  .empty-text {
    font-size: 28rpx;
    color: var(--text-placeholder);
  }
}
</style>
