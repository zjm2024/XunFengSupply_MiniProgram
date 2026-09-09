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
      `theme-${theme}`,
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
        <AppBackButton
          v-if="showBack"
          :transparent="transparent"
          :theme="theme"
          @click="handleBack"
        />
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
        <view v-if="showMessage" class="icon-btn" hover-class="header-button--pressed" :hover-start-time="0" :hover-stay-time="80" @tap="handleMessage">
          <AppIcon name="bell" :size="21" />
          <view v-if="unreadCount > 0" class="unread-dot" />
        </view>
        <!-- 供应商入口 -->
        <view v-if="showSupplier" class="icon-btn supplier-btn" hover-class="header-button--pressed" :hover-start-time="0" :hover-stay-time="80" @tap="handleSupplier">
          <text class="supplier-text">供应商</text>
        </view>
        <!-- 语言切换 -->
        <view v-if="showLanguage" class="icon-btn lang-btn" hover-class="header-button--pressed" :hover-start-time="0" :hover-stay-time="80" @tap="handleLanguage">
          <text class="lang-text">中/EN</text>
        </view>
        <!-- 购物车 -->
        <view v-if="showCart && cartCount > 0" class="icon-btn cart-btn" hover-class="header-button--pressed" :hover-start-time="0" :hover-stay-time="80" @tap="handleCart">
          <AppIcon name="cart" :size="21" />
          <text class="cart-count-badge">{{ cartCount > 99 ? '99+' : cartCount }}</text>
        </view>
        <!-- 占位 -->
        <view v-if="!showMessage && !showLanguage && !(showCart && cartCount > 0)" class="placeholder" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useResponsive } from '../../composables/useResponsive.js'
import { navigator } from '../../../app/navigation/navigator.js'
import AppBackButton from '../AppBackButton/AppBackButton.vue'
import AppStatusBarSpacer from '../AppStatusBarSpacer/AppStatusBarSpacer.vue'
import AppIcon from '../AppIcon/AppIcon.vue'

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
  /** 图标与文字明暗；透明图片头部可使用 light */
  theme: {
    type: String,
    default: 'dark',
    validator: value => ['dark', 'light'].includes(value),
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
  return layout.value.isPhone ? 48 : 52
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
      marginRight: `calc(100vw - ${menuButton.value.left}px + 8px)`,
    }
  }
  // #endif
  return {}
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
  backgroundColor: props.transparent ? 'transparent' : '#f7f8fa',
}))

const navBarStyle = computed(() => ({
  height: `${navBarHeight.value}px`,
}))

// ==================== 事件处理 ====================

async function handleBack() {
  // 优先执行统一返回：页面栈足够则返回上一页，否则按用户状态兜底
  try {
    const navigated = await navigator.back()
    if (navigated) return
  } catch (e) {
    console.warn('[AppHeader] navigator.back() 异常:', e)
  }
  // 兜底失败时交给父组件处理（如自定义回退逻辑）
  emit('back')
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

/** App 自定义导航下同步系统状态栏前景色。 */
function applyStatusBarStyle() {
  // #ifdef APP-PLUS
  if (typeof plus !== 'undefined' && plus.navigator) {
    plus.navigator.setStatusBarStyle(props.theme === 'light' ? 'light' : 'dark')
  }
  // #endif
}

onMounted(applyStatusBarStyle)
watch(() => props.theme, applyStatusBarStyle)

// light 通常只用于沉浸页；离开时恢复大多数业务页的深色状态栏。
onUnmounted(() => {
  // #ifdef APP-PLUS
  if (props.theme === 'light' && typeof plus !== 'undefined' && plus.navigator) {
    plus.navigator.setStatusBarStyle('dark')
  }
  // #endif
})
</script>

<style lang="scss" scoped>
.app-header {
  position: relative;
  z-index: 100;
  color: #4f545c;
  background: #f7f8fa;
  flex-shrink: 0;

  &.theme-light {
    color: #FFFFFF;

    .title-text,
    .supplier-text,
    .lang-text {
      color: #FFFFFF;
      text-shadow: 0 1px 4px rgba(17, 18, 22, 0.28);
    }
  }

  &.is-transparent {
    background: transparent;
  }

  &.has-shadow {
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  }

  // 宽屏时居中并限制最大宽度
  &.is-landscape.breakpoint-expanded .nav-bar {
    max-width: 1240px;
    margin: 0 auto;
  }

  @media screen and (min-width: 768px) {
    .nav-bar {
      max-width: 1240px;
      margin: 0 auto;
    }
  }
}

.nav-bar {
  position: relative; // 锁定标题绝对定位上下文，不能让它相对整个 header（含状态栏）
  display: flex;
  align-items: center;
  width: 100%;
  padding: 6px 12px;
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
}

.nav-right {
  position: relative;
  z-index: 2;
  margin-left: auto;
  gap: 4px;
  justify-content: flex-end;
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
  color: var(--text-primary, #1B1C20);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// ==================== 图标按钮通用 ====================

.icon-btn {
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #4f545c;
  background: rgba(231, 232, 235, 0.78);
}

.header-button--pressed {
  opacity: 0.66;
  transform: scale(0.95);
}

.placeholder {
  min-width: 12px;
}

.unread-dot {
  position: absolute;
  top: -1px;
  right: -2px;
  width: 14px;
  height: 14px;
  background: #d7192d;
  border-radius: 50%;
  border: 2px solid #f7f8fa;
}

// ==================== 供应商入口 ====================

.supplier-text {
  font-size: 13px;
  font-weight: 500;
  color: #4f545c;
}

// ==================== 语言切换 ====================

.lang-text {
  font-size: 13px;
  font-weight: 600;
  color: #4f545c;
}

// ==================== 购物车数量徽章 ====================

.cart-btn {
  position: relative;
}

.cart-count-badge {
  position: absolute;
  top: -1px;
  right: -2px;
  display: grid;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  box-sizing: border-box;
  place-items: center;
  border: 2px solid #f7f8fa;
  border-radius: 9px;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  background: #d7192d;
}

// ==================== 响应式适配 ====================

@media screen and (max-width: 380px) {
  .nav-bar {
    padding: 5px 9px;
  }

  .icon-btn {
    width: 40px;
    height: 40px;
  }

  .supplier-text,
  .lang-text {
    font-size: 12px;
  }
}

@media screen and (min-width: 768px) {
  .nav-bar {
    padding: 8px 28px;
  }

  .icon-btn {
    width: 48px;
    height: 48px;
  }
}

@media screen and (min-width: 1180px) {
  .nav-bar {
    padding-right: 36px;
    padding-left: 36px;
  }
}
</style>
