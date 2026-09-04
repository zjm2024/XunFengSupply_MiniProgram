<!--
  AppNetworkBanner - 网络状态横幅
  职责：显示弱网、离线、恢复在线、刷新失败但有旧数据等网络状态

  使用方式：
    <AppNetworkBanner
      :visible="showBanner"
      type="offline | weak-network | refresh-fail"
      message="提示文案"
      @action="处理操作"
    />
-->
<template>
  <view v-if="visible" class="network-banner" :class="[`type-${type}`]">
    <view class="banner-content">
      <view class="banner-icon" :class="`icon-${type}`">
        <text class="icon-glyph">{{ iconGlyph }}</text>
      </view>
      <text class="banner-message">{{ displayMessage }}</text>
      <button v-if="actionText" class="banner-action" @tap="handleAction">
        {{ actionText }}
      </button>
      <view v-if="closable" class="banner-close" @tap="handleClose">
        <text>×</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 是否可见 */
  visible: {
    type: Boolean,
    default: false,
  },
  /** 横幅类型 */
  type: {
    type: String,
    default: 'offline',
    validator: (v) => ['offline', 'weak-network', 'refresh-fail', 'custom'].includes(v),
  },
  /** 提示消息（覆盖默认） */
  message: {
    type: String,
    default: '',
  },
  /** 操作按钮文字 */
  actionText: {
    type: String,
    default: '',
  },
  /** 是否可关闭 */
  closable: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['action', 'close'])

/** 显示的消息 */
const displayMessage = computed(() => {
  if (props.message) return props.message

  const messages = {
    offline: '当前无网络连接，请检查网络设置',
    'weak-network': '网络信号较弱，部分功能可能受影响',
    'refresh-fail': '刷新失败，显示的可能不是最新数据',
    custom: '',
  }
  return messages[props.type] || ''
})

/** 图标字符 */
const iconGlyph = computed(() => {
  const icons = {
    offline: '~',
    'weak-network': '◕',
    'refresh-fail': '!',
    custom: 'ℹ',
  }
  return icons[props.type] || ''
})

function handleAction() {
  emit('action')
}

function handleClose() {
  emit('close')
}
</script>

<style lang="scss" scoped>
@use '@/styles/variable.scss' as *;

.network-banner {
  // 固定在顶部或作为页面内横幅
  position: relative;
  z-index: $z-sticky;

  .banner-content {
    display: flex;
    align-items: center;
    padding: $space-2 $space-4;
    min-height: 72rpx;
    gap: $space-2;
  }

  // 类型样式
  &.type-offline {
    background: $color-error-bg;

    .banner-message { color: $color-error; }
    .banner-icon { color: $color-error; background: rgba(180, 35, 24, 0.1); }
  }

  &.type-weak-network {
    background: $color-warning-bg;

    .banner-message { color: $color-warning; }
    .banner-icon { color: $color-warning; background: rgba(183, 101, 0, 0.1); }
  }

  &.type-refresh-fail {
    background: #FFF8E6;

    .banner-message { color: #B76500; }
    .banner-icon { color: #B76500; background: rgba(183, 101, 0, 0.08); }
  }

  &.type-custom {
    background: $color-info-bg;

    .banner-message { color: $color-info; }
    .banner-icon { color: $color-info; background: rgba(36, 107, 206, 0.1); }
  }

  // 图标
  .banner-icon {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .icon-glyph {
      font-size: 24rpx;
      font-weight: 700;
      line-height: 1;
    }
  }

  // 消息文本
  .banner-message {
    flex: 1;
    font-size: $font-size-caption;
    line-height: $line-height-caption;
  }

  // 操作按钮
  .banner-action {
    flex-shrink: 0;
    padding: 0 $space-3;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-micro;
    font-weight: $font-weight-medium;
    border-radius: $radius-tag;
    border: none;
    background: transparent;
    color: inherit;
    border: 1rpx solid currentColor;
    min-width: 88rpx;

    &:active {
      opacity: 0.7;
    }
  }

  // 关闭按钮
  .banner-close {
    width: 44rpx;
    height: 44rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-left: $space-1;

    text {
      font-size: 32rpx;
      color: inherit;
      opacity: 0.6;
      line-height: 1;
    }

    &:active {
      opacity: 0.4;
    }
  }
}
</style>
