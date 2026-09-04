<!--
  AppHeader V2 - 统一自定义标题栏

  特性：
  - 状态栏高度自动适配
  - 微信小程序胶囊按钮避让
  - 返回图标使用 SVG（非文本箭头）
  - 标题以屏幕为基准绝对居中，不受左右按钮数量影响
  - 点击区域不小于 44×44px
  - 支持透明/滚动变色模式
  - 集成 safeNavigateBack 统一返回行为

  使用方式：
    <AppHeader
      title="页面标题"
      :show-back="true"
      :show-logo="false"
      :transparent="false"
      :show-shadow="true"
      @back="handleBack"
      @home="goHome"
    />
-->
<template>
  <view
    class="app-header"
    :class="[
      `breakpoint-${layout.breakpoint}`,
      {
        'is-transparent': transparent,
        'has-shadow': showShadow,
        'is-landscape': layout.isLandscape,
      }
    ]"
    :style="headerStyle"
  >
    <!-- 状态栏 -->
    <AppStatusBarSpacer />

    <!-- 导航栏内容 -->
    <view
      class="nav-bar"
      :style="navBarStyle"
    >
      <!-- 左侧区域 -->
      <view class="nav-left">
        <!-- 返回按钮 -->
        <view
          v-if="showBack"
          class="back-btn"
          hover-class="wechat-press"
          :hover-start-time="0"
          :hover-stay-time="80"
          @tap="handleBack"
        >
          <view class="back-icon">
            <view class="arrow-left"></view>
          </view>
        </view>
        <!-- Logo（首页） -->
        <view v-else-if="showLogo" class="logo-btn" hover-class="wechat-press" :hover-start-time="0" :hover-stay-time="80" @tap="handleHome">
          <text class="logo-text">薰风</text>
        </view>
        <!-- 占位 -->
        <view v-else class="placeholder"></view>
      </view>

      <!-- 标题：绝对居中 -->
      <view class="nav-title" v-if="title" :style="titleStyle">
        <text class="title-text">{{ title }}</text>
      </view>

      <!-- 右侧区域：微信端停在胶囊左侧，不进入系统胶囊区域 -->
      <view class="nav-right" :style="rightAreaStyle">
        <!-- 消息入口 -->
        <view v-if="showMessage" class="icon-btn" hover-class="wechat-press" :hover-start-time="0" :hover-stay-time="80" @tap="handleMessage">
          <view class="icon-message">
            <view class="msg-envelope"></view>
            <view v-if="unreadCount > 0" class="unread-dot"></view>
          </view>
        </view>
        <!-- 供应商入口 -->
        <view v-if="showSupplier" class="icon-btn supplier-btn" hover-class="wechat-press" :hover-start-time="0" :hover-stay-time="80" @tap="handleSupplier">
          <text class="supplier-text">供应商</text>
        </view>
        <!-- 语言切换 -->
        <view v-if="showLanguage" class="lang-btn" hover-class="wechat-press" :hover-start-time="0" :hover-stay-time="80" @tap="handleLanguage">
          <text class="lang-text">中/EN</text>
        </view>
        <!-- 购物车 -->
        <view v-if="showCart && cartCount > 0" class="cart-btn" hover-class="wechat-press" :hover-start-time="0" :hover-stay-time="80" @tap="handleCart">
          <view class="cart-icon">
            <view class="cart-body-css"></view>
            <view class="cart-handle-css"></view>
          </view>
          <text class="cart-count">{{ cartCount > 99 ? '99+' : cartCount }}</text>
        </view>
        <!-- 占位 -->
        <view v-if="!showMessage && !showLanguage && !(showCart && cartCount > 0)" class="placeholder"></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useResponsive } from '@/hooks/useResponsive.js'
import { safeNavigateBack } from '@/utils/routeGuard.js'
import AppStatusBarSpacer from '@/components/AppStatusBarSpacer.vue'

const props = defineProps({
  /** 页面标题 */
  title: {
    type: String,
    default: '',
  },
  /** 是否显示返回按钮 */
  showBack: {
    type: Boolean,
    default: false,
  },
  /** 是否显示 Logo（首页用） */
  showLogo: {
    type: Boolean,
    default: false,
  },
  /** 是否显示消息入口 */
  showMessage: {
    type: Boolean,
    default: false,
  },
  /** 未读消息数 */
  unreadCount: {
    type: Number,
    default: 0,
  },
  /** 是否显示语言切换 */
  showLanguage: {
    type: Boolean,
    default: false,
  },
  /** 是否显示供应商入口 */
  showSupplier: {
    type: Boolean,
    default: false,
  },
  /** 是否显示购物车 */
  showCart: {
    type: Boolean,
    default: false,
  },
  /** 购物车数量 */
  cartCount: {
    type: Number,
    default: 0,
  },
  /** 透明背景（用于商品详情等滚动时） */
  transparent: {
    type: Boolean,
    default: false,
  },
  /** 显示底部阴影 */
  showShadow: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['back', 'home', 'message', 'supplier', 'language', 'cart'])

const { layout, safeArea, menuButton } = useResponsive()

/** 状态栏高度和安全区顶部取较大值，兼容刘海、挖孔屏及不同 Android 厂商。 */
const topSafeInset = computed(() => Math.max(
  Number(layout.value.statusBarHeight) || 0,
  Number(safeArea.value.top) || 0,
))

// ==================== 导航栏样式计算 ====================

/** 导航栏高度：默认 44px，微信端需要考虑胶囊按钮 */
const navBarHeight = computed(() => {
  // #ifdef MP-WEIXIN
  if (menuButton.value) {
    // 胶囊按钮高度 + 上下间距
    const btnHeight = menuButton.value.height
    const paddingTop = Math.max(menuButton.value.top - topSafeInset.value, 0)
    const paddingBottom = paddingTop
    return btnHeight + paddingTop + paddingBottom
  }
  // #endif
  return 44 // 默认 44px
})

/**
 * 右侧业务按钮的安全边界。
 * menuButton.left 是胶囊“左边缘的屏幕绝对坐标”，不能拿来当 padding/width。
 * 微信端让业务按钮整体停在胶囊左侧 8px；非微信端保留常规 8px 边距。
 */
const rightAreaStyle = computed(() => {
  // #ifdef MP-WEIXIN
  if (menuButton.value) {
    return {
      right: `calc(100vw - ${menuButton.value.left}px + 8px)`,
    }
  }
  // #endif
  return {
    right: '8px',
  }
})

/**
 * 标题永远以屏幕 50% 为中心。
 * 这里只限制最大宽度，不通过左右按钮“推”标题，所以左右内容变化不会影响中心点。
 */
const titleStyle = computed(() => {
  // #ifdef MP-WEIXIN
  if (menuButton.value) {
    // 右侧胶囊占用区 = 100vw - menuButton.left。
    // 标题左右各留出同等安全区，从而保持屏幕级绝对居中。
    return {
      maxWidth: `calc(100vw - 2 * (100vw - ${menuButton.value.left}px + 8px))`,
    }
  }
  // #endif
  return {
    maxWidth: 'calc(100vw - 120px)',
  }
})

// ==================== 样式对象 ====================

const headerStyle = computed(() => ({
  backgroundColor: props.transparent ? 'transparent' : 'rgba(255, 255, 255, 96%)',
}))

const navBarStyle = computed(() => ({
  height: `${navBarHeight.value}px`,
}))

// ==================== 事件处理 ====================

function handleBack() {
  // 使用统一的 safeNavigateBack
  const navigated = safeNavigateBack()
  if (!navigated) {
    emit('back')
  }
}

function handleHome() {
  emit('home')
}

function handleMessage() {
  emit('message')
}

function handleSupplier() {
  emit('supplier')
}

function handleLanguage() {
  emit('language')
}

function handleCart() {
  emit('cart')
}
</script>

<style lang="scss" scoped>
.app-header {
  position: relative;
  z-index: 100;
  background: rgba(255, 255, 255, 96%);
  flex-shrink: 0;

  &.is-transparent {
    background: transparent;
  }

  &.has-shadow {
    border-bottom: 1rpx solid var(--border-color, #EFEFF1);
  }

  // 横屏时限制最大宽度
  &.is-landscape.breakpoint-expanded .nav-bar {
    max-width: 1366px;
    margin: 0 auto;
  }
}

.nav-bar {
  position: relative; // 锁定标题绝对定位上下文，不能让它相对整个 header（含状态栏）
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}

.nav-left,
.nav-right {
  display: flex;
  align-items: center;
  height: 100%;
}

.nav-left {
  position: relative;
  z-index: 2;
  padding-left: 4px;
}

.nav-right {
  position: absolute;
  z-index: 2;
  top: 0;
  bottom: 0;
  justify-content: flex-end;
}

// ==================== 返回按钮 ====================

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  width: 24px;
  height: 24px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/*
 * 微信原生风格 chevron：
 * 不使用文本字符，避免不同字体/平台字形发生变化。
 * 2px 线宽比原来的 3px 更接近系统返回箭头。
 */
.arrow-left {
  width: 10px;
  height: 10px;
  border-left: 2px solid #000;
  border-bottom: 2px solid #000;
  transform: rotate(45deg);
  margin-left: 4px;
}

// ==================== Logo ====================

.logo-btn {
  min-height: 44px;
  display: flex;
  align-items: center;
  padding-right: 8px;
}

.logo-text {
  font-size: 20px; // 稳定 px 值
  font-weight: 800;
  color: var(--primary-color, #D7192D);
  letter-spacing: -1px;
}

// ==================== 标题（绝对居中）====================

.nav-title {
  position: absolute;
  z-index: 1;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  overflow: hidden;
  pointer-events: none;
}

.title-text {
  display: block;
  font-size: 17px; // 稳定 px 值，iOS 标准导航栏字号
  font-weight: 600;
  color: var(--text-primary, #111216);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// ==================== 图标按钮通用 ====================

.icon-btn {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.placeholder {
  min-width: 44px;
}

/*
 * 小程序原生 hover-class 点击态。
 * 比单纯 :active 在微信 WebView / 小程序触摸链路上更稳定。
 */
.wechat-press {
  opacity: 0.35;
}

// ==================== 消息图标（纯 CSS）====================

.icon-message {
  position: relative;
  width: 22px;
  height: 18px;
}

.msg-envelope {
  width: 100%;
  height: 100%;
  border: 2.5px solid currentColor;
  border-radius: 3px;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: currentColor;
    border-bottom: 0;
  }
}

.unread-dot {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 12px;
  height: 12px;
  background: var(--primary-color, #D7192D);
  border-radius: 50%;
  border: 2px solid white;
}

// ==================== 供应商入口 ====================

.supplier-btn {
  padding: 0 12px;
}

.supplier-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #5E626B);
}

// ==================== 语言切换 ====================

.lang-btn {
  min-height: 44px;
  padding: 0 8px;
  display: flex;
  align-items: center;
}

.lang-text {
  font-size: 13px; // 稳定 px
  font-weight: 600;
  color: var(--text-secondary, #5E626B);
}

// ==================== 购物车图标（纯 CSS）====================

.cart-btn {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.cart-icon {
  position: relative;
  width: 20px;
  height: 18px;
}

.cart-body-css {
  width: 100%;
  height: 12px;
  border: 2.5px solid currentColor;
  border-top: none;
  border-radius: 0 0 5px 5px;
  position: absolute;
  bottom: 0;
}

.cart-handle-css {
  width: 10px;
  height: 2.5px;
  background: currentColor;
  position: absolute;
  top: 3px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 1px;
}

.cart-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary-color, #D7192D);
  min-width: 16px;
  text-align: center;
}
</style>
