<template>
  <view class="error-container">
    <!-- 图标 -->
    <view class="error-icon" :class="`icon-${mode}`">
      <view class="icon-svg">
        <AppIcon :name="modeIcon" size="56rpx" />
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
import AppIcon from '../../../shared/ui/AppIcon/AppIcon.vue'

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

const modeIcon = computed(() => ({
  error: 'error',
  offline: 'offline',
  'force-update': 'tools',
}[props.mode] || 'error'))

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
