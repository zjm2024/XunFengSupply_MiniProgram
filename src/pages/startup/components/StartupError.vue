<template>
  <view class="error-container">
    <!-- 图标 -->
    <view class="error-icon" :class="`icon-${mode}`">
      <view class="icon-svg">
        <!-- 错误图标 -->
        <svg v-if="mode === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <!-- 离线图标 -->
        <svg v-else-if="mode === 'offline'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
        <!-- 强制更新图标 -->
        <svg v-else-if="mode === 'force-update'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"/>
        </svg>
      </view>
    </view>
    
    <!-- 标题 -->
    <text class="error-title">{{ displayTitle }}</text>
    
    <!-- 说明 -->
    <text class="error-desc">{{ displayDesc }}</text>
    
    <!-- 操作按钮 -->
    <view class="error-actions">
      <!-- 主按钮 -->
      <view 
        class="btn btn-primary" 
        @click="onPrimaryClick"
        v-if="showPrimary"
      >
        <text class="btn-text">{{ primaryText }}</text>
      </view>
      
      <!-- 次按钮 -->
      <view 
        class="btn btn-secondary" 
        @click="$emit('secondary')"
        v-if="showSecondary"
      >
        <text class="btn-text">{{ secondaryText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

/**
 * StartupError - 启动错误/离线/强制更新组件
 * 支持 error、offline、force-update 三种模式
 */

const props = defineProps({
  mode: {
    type: String,
    default: 'error',
    validator: (val) => ['error', 'offline', 'force-update'].includes(val)
  },
  title: String,
  desc: String,
  primaryText: String,
  secondaryText: String,
  showPrimary: {
    type: Boolean,
    default: true
  },
  showSecondary: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['retry', 'update', 'secondary'])

/**
 * 主按钮点击处理
 * force-update 模式 → 触发 update 事件
 * 其他模式 → 触发 retry 事件
 */
function onPrimaryClick() {
  if (props.mode === 'force-update') {
    emit('update')
  } else {
    emit('retry')
  }
}

// 根据模式提供默认文案
const displayTitle = computed(() => {
  if (props.title) return props.title
  switch (props.mode) {
    case 'offline':
      return '网络连接失败'
    case 'force-update':
      return '发现新版本'
    default:
      return '加载失败'
  }
})

const displayDesc = computed(() => {
  if (props.desc) return props.desc
  switch (props.mode) {
    case 'offline':
      return '请检查您的网络设置后重试'
    case 'force-update':
      return '当前版本过低，请更新后继续使用'
    default:
      return '遇到了一个问题，请稍后再试'
  }
})
</script>

<style lang="scss" scoped>
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 64rpx;
}

.error-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
  
  &.icon-error {
    background-color: $color-error-bg;
    color: $color-error;
  }
  
  &.icon-offline {
    background-color: $color-warning-bg;
    color: $color-warning;
  }
  
  &.icon-force-update {
    background-color: $color-info-bg;
    color: $color-info;
  }
  
  .icon-svg {
    width: 56rpx;
    height: 56rpx;
    
    svg {
      width: 100%;
      height: 100%;
    }
  }
}

.error-title {
  font-size: 36rpx;
  font-weight: $font-weight-semibold;
  color: $color-gray-950;
  margin-bottom: 16rpx;
}

.error-desc {
  font-size: 28rpx;
  color: $color-gray-400;
  line-height: 1.5;
  margin-bottom: 60rpx;
}

.error-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.btn {
  width: 100%;
  height: $control-height;
  border-radius: $radius-control;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.btn-primary {
    background-color: $color-brand-500;
    
    .btn-text {
      color: $color-gray-0;
      font-size: $font-size-body-l;
      font-weight: $font-weight-semibold;
    }
    
    &:active {
      background-color: $color-brand-600;
    }
  }
  
  &.btn-secondary {
    background-color: $color-gray-0;
    border: 2rpx solid $color-border-default;
    
    .btn-text {
      color: $color-gray-950;
      font-size: $font-size-body-l;
      font-weight: $font-weight-medium;
    }
    
    &:active {
      background-color: $color-gray-25;
    }
  }
}
</style>
