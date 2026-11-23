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
  <view class="app-load-more" :class="[displayStatus, { 'is-hidden': displayStatus === 'idle' }]">
    <!-- 加载中 -->
    <view v-if="displayStatus === 'loading'" class="load-more-loading">
      <view class="loading-spinner" aria-hidden="true">
        <view
          v-for="blade in 12"
          :key="blade"
          class="loading-spinner__blade"
          :style="{ transform: 'rotate(' + ((blade - 1) * 30) + 'deg)', animationDelay: ((blade - 1) / 12 - 1) + 's' }"
        />
      </view>
      <text class="loading-text">{{ t('common.ui.loadingMore') }}</text>
    </view>

    <!-- 没有更多了 -->
    <view v-else-if="displayStatus === 'no-more'" class="load-more-nomore">
      <view class="nomore-line" />
      <text class="nomore-text">{{ t('common.ui.noMore') }}</text>
      <view class="nomore-line" />
    </view>

    <!-- 加载失败，可重试 -->
    <view v-else-if="displayStatus === 'error'" class="load-more-error" @tap="handleRetry">
      <text class="error-text">{{ t('common.ui.loadMoreFailed') }}</text>
      <text class="retry-icon">↻</text>
    </view>

    <!-- 初始状态（不显示） -->
  </view>
</template>

<script setup>
import { PAGINATION_FEEDBACK_MIN_MS } from '@/shared/utils/refreshAnimation.js'
import { ref, watch, onBeforeUnmount } from 'vue'
import { t } from '@/shared/i18n/index.js'
const props = defineProps({
  /** 加载更多状态: idle | loading | error | no-more */
  status: {
    type: String,
    default: 'idle',
    validator: (v) => ['idle', 'loading', 'error', 'no-more'].includes(v),
  },
})

const emit = defineEmits(['retry'])
const displayStatus = ref(props.status)
let loadingStartedAt = Date.now()
let feedbackTimer = null
/** 分页结果由统一等待入口发布；底部反馈使用同一最短时长，不增加第二轮等待。 */
watch(() => props.status, status => {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  if (status === 'loading') {
    if (displayStatus.value !== 'loading') loadingStartedAt = Date.now()
    displayStatus.value = status
    return
  }
  const remaining = displayStatus.value === 'loading' ? Math.max(0, PAGINATION_FEEDBACK_MIN_MS - (Date.now() - loadingStartedAt)) : 0
  if (remaining) feedbackTimer = setTimeout(() => { displayStatus.value = props.status; feedbackTimer = null }, remaining)
  else displayStatus.value = status
}, { immediate: true, flush: 'sync' })
onBeforeUnmount(() => { if (feedbackTimer) clearTimeout(feedbackTimer) })

function handleRetry() {
  if (displayStatus.value === 'error') emit('retry')
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variable.scss' as *;

.app-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  // 提前预留底部空间，触底时不再突然增高，把加载图标推到可视区外。
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 10px $space-4;
  min-height: 64px;

  &.is-hidden {
    visibility: hidden;
    pointer-events: none;
  }

  // ==================== 加载中 ====================
  .load-more-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-2;
  }

  // 固定视觉尺寸，花瓣逐次明暗变化，不随平板宽度放大。
  .loading-spinner {
    position: relative;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  .loading-spinner__blade {
    position: absolute;
    top: 1px;
    left: 9px;
    width: 2px;
    height: 5px;
    border-radius: 1px;
    background: #8C9199;
    transform-origin: 1px 9px;
    opacity: 0.16;
    animation: loading-petal-fade 0.8s linear infinite;
  }

  .loading-text {
    font-size: $font-size-caption;
    color: $color-text-secondary;
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
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-1;
    padding: $space-3 $space-4;
    background: #F2F3F5;
    border-radius: $radius-control;

    // 触控目标
    min-height: $touch-target-min;

    &:active {
      opacity: 0.8;
    }
  }

  .error-text {
    font-size: $font-size-caption;
    color: #6B7280;
  }

  .retry-icon {
    font-size: $font-size-body-m;
    color: #6B7280;
  }
}

@keyframes loading-petal-fade {
  0% { opacity: 1; }
  100% { opacity: 0.16; }
}
</style>
