<!--
  AppPageState - 统一页面状态容器
  职责：管理 empty / error / offline / 首屏 loading 状态展示

  使用方式：
    <AppPageState
      :state="pageStatus"
      title="自定义标题"
      description="描述文字"
      actionText="按钮文案"
      iconType="空状态图标类型"
      :fullscreen="是否全屏"
      @retry="重试事件"
    >
      <template #skeleton>自定义骨架屏</template>
      <template #default>正常内容</template>
    </AppPageState>
-->
<template>
  <view class="app-page-state" :class="[`state-${state}`, { 'is-fullscreen': fullscreen, 'is-compact': compact }]">
    <!-- 首屏加载：骨架屏 -->
    <view v-if="state === 'loading'" class="state-loading">
      <slot name="skeleton">
        <view class="default-skeleton">
          <view class="skeleton-line skeleton-title" />
          <view class="skeleton-line skeleton-subtitle" />
          <view class="skeleton-cards">
            <view v-for="i in 3" :key="i" class="skeleton-card">
              <view class="skeleton-block skeleton-img" />
              <view class="skeleton-lines">
                <view class="skeleton-line skeleton-text" />
                <view class="skeleton-line skeleton-text short" />
                <view class="skeleton-line skeleton-text long" />
              </view>
            </view>
          </view>
        </view>
      </slot>
    </view>

    <!-- 空数据状态 -->
    <view v-else-if="state === 'empty'" class="state-empty">
      <view class="illustration">
        <slot name="illustration">
          <view class="icon-placeholder" :class="`icon-${iconType}`">
            <!-- 纯 CSS 线性图标，非 Emoji -->
            <view class="css-icon css-icon-{{ iconType }}">
              <view v-if="iconType === 'cart'" class="icon-cart-svg"><view class="cart-body" /><view class="cart-handle" /><view class="cart-wheel cart-wheel-l" /><view class="cart-wheel cart-wheel-r" /></view>
              <view v-else-if="iconType === 'order'" class="icon-order-svg"><view class="order-doc" /><view class="order-lines" /></view>
              <view v-else-if="iconType === 'message'" class="icon-message-svg"><view class="msg-bubble" /><view class="msg-tail" /></view>
              <view v-else-if="iconType === 'search'" class="icon-search-svg"><view class="search-circle" /><view class="search-handle" /></view>
              <view v-else-if="iconType === 'product'" class="icon-product-svg"><view class="product-box" /><view class="product-lid" /></view>
              <view v-else-if="iconType === 'favorite'" class="icon-favorite-svg"><view class="fav-heart" /></view>
              <view v-else-if="iconType === 'address'" class="icon-address-svg"><view class="addr-pin" /><view class="addr-base" /></view>
              <view v-else-if="iconType === 'voucher'" class="icon-voucher-svg"><view class="voucher-ticket" /><view class="voucher-hole" /></view>
              <view v-else class="icon-default-svg"><view class="default-inbox" /><view class="default-line" /></view>
            </view>
          </view>
        </slot>
      </view>
      <text class="state-title">{{ displayTitle }}</text>
      <text v-if="displayDescription" class="state-desc">{{ displayDescription }}</text>
      <view v-if="actionText || $slots.actions" class="state-actions">
        <slot name="actions">
          <button
            v-if="actionText"
            class="action-btn primary"
            @tap="handleAction"
          >{{ actionText }}</button>
        </slot>
      </view>
      <slot name="extra" />
    </view>

    <!-- 错误状态 -->
    <view v-else-if="state === 'error'" class="state-error">
      <view class="illustration">
        <slot name="errorIllustration">
          <view class="icon-placeholder icon-error">
            <view class="css-icon icon-error-svg">
              <view class="error-circle" />
              <view class="error-mark">!</view>
            </view>
          </view>
        </slot>
      </view>
      <text class="state-title">{{ displayTitle }}</text>
      <text v-if="displayDescription" class="state-desc">{{ displayDescription }}</text>
      <text v-if="hasStaleContent" class="stale-hint">显示之前加载的内容</text>
      <view class="state-actions">
        <slot name="actions">
          <button
            v-if="actionText"
            class="action-btn primary"
            @tap="handleRetry"
          >{{ actionText }}</button>
          <button
            v-if="secondaryActionText"
            class="action-btn secondary"
            @tap="handleSecondaryAction"
          >{{ secondaryActionText }}</button>
        </slot>
      </view>
    </view>

    <!-- 离线状态 -->
    <view v-else-if="state === 'offline'" class="state-offline">
      <view class="illustration">
        <view class="icon-placeholder icon-offline">
          <view class="css-icon icon-offline-svg">
            <view class="offline-cloud" />
            <view class="offline-slash" />
            <view class="offline-dots">
              <view class="dot dot-1" />
              <view class="dot dot-2" />
              <view class="dot dot-3" />
            </view>
          </view>
        </view>
      </view>
      <text class="state-title">{{ displayTitle }}</text>
      <text v-if="displayDescription" class="state-desc">{{ displayDescription }}</text>
      <view class="state-actions">
        <button
          v-if="actionText"
          class="action-btn primary"
          @tap="handleRetry"
        >{{ actionText }}</button>
      </view>
    </view>

    <!-- 正常内容 -->
    <view v-else-if="state === 'content'" class="state-content">
      <slot />
    </view>

    <!-- idle 状态：不渲染任何内容 -->
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { PageStatus, DEFAULT_MESSAGES, EmptyType } from '../../model/pageState.js'

const props = defineProps({
  /** 当前页面状态 */
  state: {
    type: String,
    default: PageStatus.IDLE,
    validator: (v) => Object.values(PageStatus).includes(v),
  },
  /** 标题（覆盖默认） */
  title: {
    type: String,
    default: '',
  },
  /** 描述文字 */
  description: {
    type: String,
    default: '',
  },
  /** 主操作按钮文案 */
  actionText: {
    type: String,
    default: '',
  },
  /** 次要操作按钮文案 */
  secondaryActionText: {
    type: String,
    default: '',
  },
  /** 空状态图标类型 */
  iconType: {
    type: String,
    default: EmptyType.DEFAULT,
  },
  /** 是否全屏模式 */
  fullscreen: {
    type: Boolean,
    default: false,
  },
  /** 紧凑模式（减少内边距） */
  compact: {
    type: Boolean,
    default: false,
  },
  /** 错误时是否有旧内容可显示 */
  hasStaleContent: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['retry', 'action', 'secondary-action'])

// ==================== 计算属性 ====================

/** 显示标题 */
const displayTitle = computed(() => props.title || DEFAULT_MESSAGES[props.state]?.title || '')

/** 显示描述 */
const displayDescription = computed(() => props.description || DEFAULT_MESSAGES[props.state]?.description || '')

// 注意：图标已改为纯 CSS 实现（见模板中的 css-icon），不再使用 Unicode 符号
// EmptyType 仍导出供外部判断使用

// ==================== 事件处理 ====================

function handleRetry() {
  emit('retry')
}

function handleAction() {
  emit('action')
}

function handleSecondaryAction() {
  emit('secondary-action')
}
</script>

<script>
export default {
  options: { styleIsolation: 'shared' }
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variable.scss' as *;

.app-page-state {
  &.is-fullscreen {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  &.is-compact {
    padding: 24rpx 0;
  }

  // ==================== 骨架屏样式 ====================
  .state-loading {
    padding: $space-4;
  }

  .default-skeleton {
    .skeleton-line {
      height: 32rpx;
      background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
      border-radius: $radius-tag;
      margin-bottom: $space-2;

      &.skeleton-title {
        width: 40%;
        height: 48rpx;
        margin-bottom: $space-4;
      }

      &.skeleton-subtitle {
        width: 25%;
        height: 28rpx;
        margin-bottom: $space-6;
      }

      &.skeleton-text {
        width: 100%;

        &.short { width: 60%; }
        &.long { width: 85%; }
      }
    }

    .skeleton-cards {
      display: flex;
      flex-direction: column;
      gap: $space-4;
    }

    .skeleton-card {
      display: flex;
      gap: $space-3;
      padding: $space-3;
      background: $color-bg-card;
      border-radius: $radius-card;
    }

    .skeleton-block {
      &.skeleton-img {
        width: 180rpx;
        height: 180rpx;
        flex-shrink: 0;
        border-radius: $radius-control;
      }
    }

    .skeleton-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: $space-2;
    }
  }

  // ==================== 空状态/错误/离线通用布局 ====================
  .state-empty,
  .state-error,
  .state-offline {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 96rpx $space-6;
    min-height: 400rpx;
  }

  .is-fullscreen & {
    min-height: 100vh;
  }

  .is-compact & {
    padding: $space-6 $space-4;
    min-height: 300rpx;
  }

  // 插图区域
  .illustration {
    margin-bottom: $space-5;
  }

  .icon-placeholder {
    width: 160rpx;
    height: 160rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-feature;

    // CSS 图标容器
    .css-icon {
      width: 80rpx;
      height: 80rpx;
      position: relative;
    }

    // SVG 插图样式（更大尺寸）
    &.icon-svg {
      width: 360rpx;
      height: 360rpx;
      background: transparent;
      border-radius: 0;

      .css-icon {
        width: 100%;
        height: 100%;
      }
    }

    // 各状态图标色彩
    &.icon-default { background: $color-gray-50; color: $color-gray-400; }
    &.icon-cart { background: #FDECEA; color: $color-error; }
    &.icon-order { background: #EAF2FF; color: $color-info; }
    &.icon-message { background: #FFF4E5; color: $color-warning; }
    &.icon-search { background: #F7F7F8; color: $color-gray-400; }
    &.icon-product { background: #F7F7F8; color: $color-gray-400; }
    &.icon-favorite { background: #FDECEA; color: $color-brand-500; }
    &.icon-address { background: #EAF2FF; color: $color-info; }
    &.icon-voucher { background: #EAF7F0; color: $color-success; }

    // 特殊状态图标
    &.icon-error {
      width: 120rpx;
      height: 120rpx;
      border-radius: 50%;
      background: $color-error-bg;
      color: $color-error;
    }

    &.icon-offline {
      background: $color-gray-50;
      color: $color-gray-400;
    }
  }

  // 文案
  .state-title {
    font-size: $font-size-h3;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
    text-align: center;
    margin-bottom: $space-1;
    line-height: $line-height-h3;
  }

  .state-desc {
    font-size: $font-size-body-m;
    color: $color-text-secondary;
    text-align: center;
    line-height: $line-height-body-m;
    max-width: 480rpx;
  }

  // 旧数据提示
  .stale-hint {
    font-size: $font-size-caption;
    color: $color-warning;
    background: $color-warning-bg;
    padding: $space-1 $space-3;
    border-radius: $radius-tag;
    margin-top: $space-3;
  }

  // 操作按钮区域
  .state-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-3;
    margin-top: $space-6;
    width: 100%;
    max-width: 400rpx;
  }

  .action-btn {
    width: 100%;
    height: $touch-target-min;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-body-m;
    font-weight: $font-weight-medium;
    border-radius: $radius-control;
    border: none;
    line-height: 1;
    transition: all $duration-normal $easing-standard;

    // 触控目标不小于 44x44px
    min-width: $touch-target-min;
    min-height: $touch-target-min;

    &.primary {
      background: $color-action-primary;
      color: #FFFFFF;

      &:active {
        background: $color-action-primary-pressed;
      }
    }

    &.secondary {
      background: transparent;
      color: $color-action-primary;
      border: 2rpx solid $color-action-primary;

      &:active {
        background: rgba(215, 25, 45, 0.05);
      }
    }
  }

  // ==================== 内容状态 ====================
  .state-content {
    // 内容由 slot 提供，此处仅做容器
  }
}

// ==================== 骨架屏动画 ====================
@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

// ==================== CSS 线性图标（非 Emoji） ====================

// 通用：图标线条基础样式
.css-icon {
  > view {
    position: absolute;
    box-sizing: border-box;
  }
}

// 默认图标（收件箱）
.icon-default-svg {
  width: 72rpx;
  height: 56rpx;
  .default-inbox {
    width: 64rpx;
  height: 40rpx;
  border: 4rpx solid currentColor;
    border-radius: 6rpx;
    top: 16rpx;
    left: 4rpx;
  }
  .default-line {
    width: 20rpx;
    height: 4rpx;
    background: currentColor;
    top: 6rpx;
    left: 26rpx;
    border-radius: 2rpx;
  }
}

// 购物车
.icon-cart-svg {
  width: 68rpx;
  height: 60rpx;
  .cart-body {
    width: 48rpx;
    height: 32rpx;
    border: 3.5rpx solid currentColor;
    border-top: none;
    border-radius: 0 0 8rpx 8rpx;
    top: 20rpx;
    left: 10rpx;
  }
  .cart-handle {
    width: 20rpx;
    height: 4rpx;
    background: currentColor;
    top: 18rpx;
    left: 24rpx;
    border-radius: 2rpx;
  }
  .cart-wheel {
    width: 12rpx;
    height: 12rpx;
    border: 3.5rpx solid currentColor;
    border-radius: 50%;
    bottom: 4rpx;
    &.cart-wheel-l { left: 14rpx; }
    &.cart-wheel-r { right: 14rpx; }
  }
}

// 订单/文档
.icon-order-svg {
  width: 56rpx;
  height: 68rpx;
  .order-doc {
    width: 44rpx;
    height: 56rpx;
    border: 3.5rpx solid currentColor;
    border-radius: 4rpx;
    top: 6rpx;
    left: 6rpx;
  }
  .order-lines {
    width: 28rpx;
    height: 3.5rpx;
    background: currentColor;
    border-radius: 2rpx;
    top: 20rpx;
    left: 14rpx;
    box-shadow: 0 10rpx 0 currentColor, 0 20rpx 0 currentColor;
  }
}

// 消息气泡
.icon-message-svg {
  width: 64rpx;
  height: 52rpx;
  .msg-bubble {
    width: 48rpx;
    height: 36rpx;
    border: 3.5rpx solid currentColor;
    border-radius: 16rpx;
    top: 4rpx;
    left: 8rpx;
  }
  .msg-tail {
    width: 0;
    height: 0;
    border-left: 10rpx solid transparent;
    border-top: 12rpx solid currentColor;
    top: 34rpx;
    left: 8rpx;
  }
}

// 搜索
.icon-search-svg {
  width: 60rpx;
  height: 60rpx;
  .search-circle {
    width: 32rpx;
    height: 32rpx;
    border: 3.5rpx solid currentColor;
    border-radius: 50%;
    top: 4rpx;
    left: 8rpx;
  }
  .search-handle {
    width: 16rpx;
    height: 4rpx;
    background: currentColor;
    border-radius: 2rpx;
    transform: rotate(45deg);
    top: 36rpx;
    left: 38rpx;
  }
}

// 商品盒子
.icon-product-svg {
  width: 60rpx;
  height: 56rpx;
  .product-box {
    width: 46rpx;
    height: 36rpx;
    border: 3.5rpx solid currentColor;
    border-radius: 4rpx;
    top: 16rpx;
    left: 7rpx;
  }
  .product-lid {
    width: 24rpx;
    height: 4rpx;
    background: currentColor;
    border-radius: 2rpx;
    top: 12rpx;
    left: 18rpx;
  }
}

// 收藏心形
.icon-favorite-svg {
  width: 60rpx;
  height: 56rpx;
  .fav-heart {
    width: 52rpx;
    height: 46rpx;
    background: currentColor;
    clip-path: path('M26 44 C26 44 8 28 8 16 C8 6 16 0 26 10 C36 0 44 6 44 16 C44 28 26 44 26 44 Z');
    top: 4rpx;
    left: 4rpx;
    opacity: 0.85;
  }
}

// 地址定位
.icon-address-svg {
  width: 48rpx;
  height: 64rpx;
  .addr-pin {
    width: 28rpx;
    height: 28rpx;
    border: 3.5rpx solid currentColor;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    top: 4rpx;
    left: 10rpx;
  }
  .addr-base {
    width: 20rpx;
    height: 4rpx;
    background: currentColor;
    border-radius: 2rpx;
    bottom: 8rpx;
    left: 14rpx;
  }
}

// 代金券
.icon-voucher-svg {
  width: 64rpx;
  height: 44rpx;
  .voucher-ticket {
    width: 56rpx;
    height: 36rpx;
    border: 3.5rpx solid currentColor;
    border-radius: 4rpx;
    top: 4rpx;
    left: 4rpx;
  }
  .voucher-hole {
    width: 10rpx;
    height: 10rpx;
    border-radius: 50%;
    border: 3.5rpx solid $color-gray-50;
    background: currentColor;
    top: 15rpx;
    left: -2rpx;
    box-shadow: 58rpx 0 0 currentColor;
  }
}

// 错误图标
.icon-error-svg {
  width: 100%;
  height: 100%;
  .error-circle {
    width: 100%;
    height: 100%;
    border: 4rpx solid currentColor;
    border-radius: 50%;
    top: 0;
    left: 0;
  }
  .error-mark {
    font-size: 48rpx;
    font-weight: 700;
    color: currentColor;
    line-height: 1;
    text-align: center;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}

// 离线图标
.icon-offline-svg {
  width: 80rpx;
  height: 56rpx;
  .offline-cloud {
    width: 56rpx;
    height: 32rpx;
    border: 3.5rpx solid currentColor;
    border-bottom: none;
    border-radius: 16rpx 16rpx 0 0;
    top: 16rpx;
    left: 12rpx;
  }
  .offline-slash {
    width: 40rpx;
    height: 4rpx;
    background: currentColor;
    border-radius: 2rpx;
    transform: rotate(25deg);
    top: 30rpx;
    left: 22rpx;
  }
  .offline-dots {
    .dot {
      width: 6rpx;
      height: 6rpx;
      border-radius: 50%;
      background: currentColor;
      bottom: 6rpx;
      &.dot-1 { left: 22rpx; opacity: 0.5; }
      &.dot-2 { left: 37rpx; opacity: 0.75; }
      &.dot-3 { left: 52rpx; }
    }
  }
}
</style>
