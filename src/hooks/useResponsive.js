/**
 * 响应式布局 Hook V2 - 统一设备适配系统
 *
 * 三档断点：
 *   Compact  : < 600px  → 手机单栏
 *   Medium   : 600-839px → iPad 竖屏，内容居中 max-width 720px
 *   Expanded : >= 840px → iPad 横屏/大屏，max-width 1120px
 *
 * 功能：
 *   - 获取 windowWidth/Height、statusBarHeight、safeAreaInsets
 *   - 微信端获取 getMenuButtonBoundingClientRect（胶囊按钮）
 *   - 监听 uni.onWindowResize，支持旋转/分屏/尺寸变化
 *   - 页面卸载时自动清理监听
 *   - 禁止 iPad 上简单放大 rpx 字号（使用稳定 px/token）
 *
 * 使用方式：
 *   import { useResponsive } from '@/hooks/useResponsive.js'
 *   const { layout, breakpoint, safeArea, menuButton } = useResponsive()
 */

import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

// ==================== 响应式断点常量 ====================

/** 断点阈值（CSS px） */
export const BREAKPOINTS = {
  COMPACT: 600,   // 手机单栏
  MEDIUM: 840,    // iPad 竖屏
}

/** 断点名称 */
export const BreakpointType = {
  COMPACT: 'compact',
  MEDIUM: 'medium',
  EXPANDED: 'expanded',
}

/** 内容最大宽度 */
export const CONTENT_MAX_WIDTH = {
  portrait: 720,   // iPad 竖屏
  landscape: 1120, // iPad 横屏/大屏
}

// ==================== 全局单例状态 ====================

let _isInit = false
const _listeners = new Set()

/** 全局响应式状态（所有组件共享同一份系统信息） */
const state = reactive({
  windowWidth: 375,
  windowHeight: 812,
  // H5 没有原生状态栏，默认必须为 0；APP/小程序初始化时读取真实值。
  statusBarHeight: 0,
  safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  // 微信胶囊按钮信息
  menuButton: null,
  // 像素比
  pixelRatio: 2,
})

/**
 * 初始化系统信息（只执行一次）
 */
function initSystemInfo() {
  if (_isInit) return
  _isInit = true

  try {
    const sysInfo = uni.getSystemInfoSync()
    state.windowWidth = sysInfo.windowWidth || 375
    state.windowHeight = sysInfo.windowHeight || 812
    state.statusBarHeight = Number(sysInfo.statusBarHeight) || 0
    state.pixelRatio = sysInfo.pixelRatio || 2
    state.safeAreaInsets = sysInfo.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 }

    // #ifdef MP-WEIXIN
    try {
      const btn = uni.getMenuButtonBoundingClientRect()
      if (btn && btn.width > 0 && btn.height > 0) {
        state.menuButton = {
          width: btn.width,
          height: btn.height,
          top: btn.top,
          right: state.windowWidth - btn.right,
          bottom: btn.bottom,
          left: btn.left,
        }
      }
    } catch (e) {
      console.warn('[useResponsive] 获取胶囊按钮信息失败', e)
    }
    // #endif

    console.log('[useResponsive] 初始化完成', {
      windowSize: `${state.windowWidth}x${state.windowHeight}`,
      statusBarHeight: state.statusBarHeight,
      hasMenuButton: !!state.menuButton,
      safeArea: state.safeAreaInsets,
    })
  } catch (e) {
    console.error('[useResponsive] 获取系统信息失败', e)
  }
}

/**
 * 监听窗口尺寸变化
 */
function startResizeListener() {
  // #ifdef H5
  if (typeof window !== 'undefined') {
    _resizeHandler()
    window.addEventListener('resize', _resizeHandler)
  }
  // #endif

  // #ifdef APP-PLUS || MP-WEIXIN
  try {
    uni.onWindowResize(_resizeHandler)
  } catch (e) {
    // 某些平台可能不支持
  }
  // #endif
}

function stopResizeListener() {
  // #ifdef H5
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', _resizeHandler)
  }
  // #endif

  // #ifdef APP-PLUS || MP-WEIXIN
  try {
    uni.offWindowResize(_resizeHandler)
  } catch (e) {}
  // #endif
}

function _resizeHandler(resizeInfo) {
  try {
    // H5: 从 window 获取；小程序/App: 从参数获取
    let newWidth, newHeight
    if (typeof window !== 'undefined' && window.innerWidth) {
      newWidth = window.innerWidth
      newHeight = window.innerHeight
    } else if (resizeInfo && resizeInfo.size) {
      newWidth = resizeInfo.size.windowWidth
      newHeight = resizeInfo.size.windowHeight
    } else {
      // 回退：重新调用 getSystemInfoSync
      const sysInfo = uni.getSystemInfoSync()
      newWidth = sysInfo.windowWidth
      newHeight = sysInfo.windowHeight
    }

    if (newWidth && newHeight) {
      state.windowWidth = newWidth
      state.windowHeight = newHeight
      // 同时更新安全区
      const sysInfo = uni.getSystemInfoSync()
      state.statusBarHeight = Number(sysInfo.statusBarHeight) || 0
      state.safeAreaInsets = sysInfo.safeAreaInsets || state.safeAreaInsets
    }
  } catch (e) {
    // 静默处理
  }
}

// ==================== 主 Hook ====================

/**
 * 响应式布局 Hook
 *
 * @param {Object} [options={}] 配置选项
 * @param {boolean} [options.autoInit=true] 是否自动初始化
 * @returns {Object} 响应式布局信息
 */
export function useResponsive(options = {}) {
  const { autoInit = true } = options

  if (autoInit) {
    initSystemInfo()
  }

  // ====== 计算属性：断点判断 ======

  /** 当前断点类型 */
  const breakpoint = computed(() => {
    if (state.windowWidth < BREAKPOINTS.COMPACT) return BreakpointType.COMPACT
    if (state.windowWidth < BREAKPOINTS.MEDIUM) return BreakpointType.MEDIUM
    return BreakpointType.EXPANDED
  })

  /** 是否为手机（Compact） */
  const isPhone = computed(() => breakpoint.value === BreakpointType.COMPACT)

  /** 是否为平板竖屏（Medium） */
  const isTabletPortrait = computed(() => breakpoint.value === BreakpointType.MEDIUM)

  /** 是否为大屏/横屏（Expanded） */
  const isTabletLandscape = computed(() => breakpoint.value === BreakpointType.EXPANDED)

  /** 是否为平板（Medium + Expanded） */
  const isTablet = computed(() => breakpoint.value !== BreakpointType.COMPACT)

  /** 是否为横屏 */
  const isLandscape = computed(() => state.windowWidth > state.windowHeight)

  // ====== 计算属性：布局参数 ======

  /** 内容区最大宽度 */
  const contentMaxWidth = computed(() => {
    if (breakpoint.value === BreakpointType.COMPACT) return '100%'
    if (breakpoint.value === BreakpointType.MEDIUM) return `${CONTENT_MAX_WIDTH.portrait}px`
    return `${CONTENT_MAX_WIDTH.landscape}px`
  })

  /** 页面水平内边距（使用稳定的 px 值，非 rpx） */
  const pagePaddingX = computed(() => {
    return isPhone.value ? '16px' : '24px'
  })

  /** 内容区是否居中 */
  const shouldCenterContent = computed(() => breakpoint.value !== BreakpointType.COMPACT)

  // ====== 导出完整状态 ======

  const layout = computed(() => ({
    windowWidth: state.windowWidth,
    windowHeight: state.windowHeight,
    statusBarHeight: state.statusBarHeight,
    pixelRatio: state.pixelRatio,
    breakpoint: breakpoint.value,
    isPhone: isPhone.value,
    isTablet: isTablet.value,
    isTabletPortrait: isTabletPortrait.value,
    isTabletLandscape: isTabletLandscape?.value ?? false,
    isLandscape: isLandscape.value,
    contentMaxWidth: contentMaxWidth.value,
    pagePaddingX: pagePaddingX.value,
    shouldCenterContent: shouldCenterContent.value,
  }))

  const safeArea = computed(() => ({ ...state.safeAreaInsets }))

  const menuButton = computed(() => state.menuButton ? { ...state.menuButton } : null)

  // ====== 生命周期管理 ======

  // 标记此 hook 已激活（用于清理）
  let isActive = false

  onMounted(() => {
    if (!isActive) {
      isActive = true
      _listeners.add(_resizeHandler)
      startResizeListener()
    }
  })

  onUnmounted(() => {
    if (isActive) {
      isActive = false
      _listeners.delete(_resizeHandler)
      // 只有当没有其他组件在监听时才停止
      if (_listeners.size === 0) {
        stopResizeListener()
      }
    }
  })

  return {
    // 响应式状态
    layout,
    breakpoint,
    safeArea,
    menuButton,

    // 便捷布尔值
    isPhone,
    isTablet,
    isTabletPortrait,
    isTabletLandscape: isTabletLandscape ?? computed(() => false),
    isLandscape,

    // 布局参数
    contentMaxWidth,
    pagePaddingX,
    shouldCenterContent,

    // 原始状态引用（高级用法）
    rawState: state,

    // 常量导出
    BREAKPOINTS,
    BreakpointType,
    CONTENT_MAX_WIDTH,
  }
}

export default useResponsive
