<!--
  AppLoadMore - 分页加载状态组件
  职责：列表底部的 loading / no-more / retry 状态

  使用方式：
    <AppLoadMore
      :status="loadMoreStatus"
      :hasMore="还有更多"
      @retry="重新加载"
    />
-->
<template>
  <view class="app-load-more" :class="[status, { 'is-hidden': status === 'idle' }]">
    <!-- 加载中 -->
    <view v-if="status === 'loading'" class="load-more-loading">
      <view class="loading-spinner" />
      <text class="loading-text">正在加载...</text>
    </view>

    <!-- 没有更多了 -->
    <view v-else-if="status === 'no-more'" class="load-more-nomore">
      <view class="nomore-line" />
      <text class="nomore-text">— 已经到底了 —</text>
      <view class="nomore-line" />
    </view>

    <!-- 加载失败，可重试 -->
    <view v-else-if="status === 'error'" class="load-more-error" @tap="handleRetry">
      <text class="error-text">加载失败，点击重试</text>
      <text class="retry-icon">↻</text>
    </view>

    <!-- 初始状态（不显示） -->
  </view>
</template>

<script setup>
defineProps({
  /** 加载更多状态: idle | loading | error | no-more */
  status: {
    type: String,
    default: 'idle',
    validator: (v) => ['idle', 'loading', 'error', 'no-more'].includes(v),
  },
})

const emit = defineEmits(['retry'])

function handleRetry() {
  emit('retry')
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variable.scss' as *;

.app-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-6 $space-4;
  min-height: 88rpx;

  &.is-hidden {
    display: none;
  }

  // ==================== 加载中 ====================
  .load-more-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-2;
  }

  .loading-spinner {
    width: 36rpx;
    height: 36rpx;
    border: 3rpx solid $color-gray-200;
    border-top-color: $color-brand-500;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .loading-text {
    font-size: $font-size-caption;
    color: $color-text-disabled;
  }

  // ==================== 没有更多 ====================
  .load-more-nomore {
    display: flex;
    align-items: center;
    gap: $space-3;
    width: 100%;
  }

  .nomore-line {
    flex: 1;
    height: 1rpx;
    background: $color-border-default;
  }

  .nomore-text {
    font-size: $font-size-micro;
    color: $color-text-disabled;
    white-space: nowrap;
  }

  // ==================== 错误重试 ====================
  .load-more-error {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-1;
    padding: $space-3 $space-4;
    background: $color-error-bg;
    border-radius: $radius-control;

    // 触控目标
    min-height: $touch-target-min;

    &:active {
      opacity: 0.8;
    }
  }

  .error-text {
    font-size: $font-size-caption;
    color: $color-error;
  }

  .retry-icon {
    font-size: $font-size-body-m;
    color: $color-error;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
