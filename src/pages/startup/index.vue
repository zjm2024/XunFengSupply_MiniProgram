<template>
  <view class="startup-page">
    <!-- 背景装饰丝带 -->
    <view class="startup-ribbon"></view>
    
    <!-- 安全区容器 -->
    <view class="startup-safe-area">
      <!-- Brand 品牌展示（仅 brand 模式渲染） -->
      <view 
        v-if="startupConfig.brandEnabled"
        class="scene scene-brand" 
        :class="{ 'scene-hidden': currentScene !== 'brand' }"
      >
        <StartupBrand />
      </view>
      
      <!-- Loading 加载中 -->
      <view 
        class="scene scene-loading" 
        :class="{ 'scene-hidden': currentScene !== 'loading' }"
      >
        <StartupLoading :title="loadingTitle" :tip="loadingTip" />
      </view>
      
      <!-- Error 错误状态 -->
      <view 
        class="scene scene-error" 
        :class="{ 'scene-hidden': !['error', 'offline', 'force-update'].includes(currentScene) }"
      >
        <StartupError
          :mode="errorMode"
          :title="errorTitle"
          :desc="errorDesc"
          :primary-text="errorPrimaryText"
          :secondary-text="errorSecondaryText"
          :show-primary="errorShowPrimary"
          :show-secondary="errorShowSecondary"
          @retry="onRetry"
          @update="onUpdate"
          @secondary="onSecondaryAction"
        />
      </view>
    </view>
  </view>
</template>

<script setup>
/**
 * Startup 启动页
 * 
 * 负责：冷启动编排的唯一决策者
 * 
 * 支持两种模式：
 * - brand: 品牌启动模式，展示品牌 Logo 至少 brandMinDuration 毫秒
 * - fast:  极速启动模式，不展示品牌，快速进入目标页面
 * 
 * 架构约束：
 * - 只有一个冷启动路由 Page
 * - Brand、Loading、Error 同时挂载（brand 模式下），通过 opacity/visibility 控制
 * - 不使用路由切换实现 brand → loading 转场
 * - App.vue 不再参与路由分流决策
 * 
 * 时序要求：
 * - onLoad：立即启动 bootstrapOnce()，不关闭原生 Splash，不开始品牌计时
 * - onReady：关闭原生 Splash，再开始品牌最短可见时间计时
 * - uiReady + brandMinReached + bootCompleted 三个条件满足后才能跳转
 */

import { ref } from 'vue'
import { onLoad, onReady, onUnload, onBackPress } from '@dcloudio/uni-app'
import StartupBrand from './components/StartupBrand.vue'
import StartupLoading from './components/StartupLoading.vue'
import StartupError from './components/StartupError.vue'
import { bootstrapOnce, resetBootstrapState } from '../../app/bootstrap/appBootstrap.js'
import { STARTUP_CONFIG } from '../../app/config/startupConfig.js'
import { sanitizeRedirect, isRegisteredRoute, HOME } from '../../app/config/routes.js'
import { navigator } from '../../app/navigation/navigator.js'

// ==================== 启动配置 ====================

const startupConfig = STARTUP_CONFIG
const pageLoadTime = Date.now()

// ==================== 启动状态机 ====================

/** 当前场景 */
const currentScene = ref('brand')

/** 品牌最短计时是否结束 */
const brandMinReached = ref(false)

/** 初始化是否完成 */
const bootCompleted = ref(false)

/** 初始化结果 */
const bootResult = ref(null)

/** 跳转已执行锁 */
const hasRouted = ref(false)

/** fast 模式：Loading 延迟是否到达 */
const loadingDelayReached = ref(false)

/** 页面是否已卸载 */
const isUnloaded = ref(false)

/** UI 是否就绪（onReady 已执行） */
const uiReady = ref(false)

/** 原生 Splash 是否已关闭 */
const nativeSplashClosed = ref(false)

// ==================== 错误状态 ====================

const errorMode = ref('error')
const errorTitle = ref('')
const errorDesc = ref('')
const errorPrimaryText = ref('重试')
const errorSecondaryText = ref('')
const errorShowPrimary = ref(true)
const errorShowSecondary = ref(false)

// ==================== 加载文案 ====================

const loadingTitle = ref('正在准备您的经销商工作台')
const loadingTip = ref('请稍候，数据加载中...')

// ==================== 计时器 ====================

let _brandTimer = null
let _loadingDelayTimer = null

// ==================== 日志 ====================

function log(message) {
  const elapsed = Date.now() - pageLoadTime
  console.log(`[Startup] ${message} elapsed=${elapsed}ms`)
}

// ==================== 原生 Splash 关闭（防重入）====================

let _closeSplashCalled = false

function closeNativeSplashOnce() {
  if (_closeSplashCalled) return
  _closeSplashCalled = true

  // #ifdef APP-PLUS
  try {
    plus.navigator.closeSplashscreen()
    log('native splash closed')
  } catch (error) {
    console.error('[Startup] close native splash failed', error)
  }
  // #endif
}

// ==================== 生命周期 ====================

onLoad(() => {
  log(`setup mode=${startupConfig.mode}`)
  log('page loaded')

  // onLoad：立即启动 bootstrapOnce()，不关闭原生 Splash，不开始品牌计时
  enterBootstrap()
})

onReady(() => {
  log('page ready')

  // 关闭原生 Splash
  closeNativeSplashOnce()
  nativeSplashClosed.value = true

  // 标记 UI 就绪
  uiReady.value = true

  // 原生 Splash 关闭后，再开始品牌最短可见时间计时
  if (startupConfig.mode === 'brand') {
    startBrandTimer()
  }

  // 如果 bootstrap 已经在等待 UI 就绪，现在可以继续
  if (bootCompleted.value) {
    if (startupConfig.mode === 'fast') {
      coordinateFastStartup()
    } else {
      coordinateBrandStartup()
    }
  }
})

onUnload(() => {
  log('page unloaded')
  isUnloaded.value = true
  _clearAllTimers()
})

// ==================== 入口分发 ====================

/**
 * 进入启动流程
 * brand: 启动 bootstrapOnce()（品牌计时在 onReady 后才开始）
 * fast: 启动 bootstrapOnce() + Loading 延迟计时
 */
function enterBootstrap() {
  if (startupConfig.mode === 'fast') {
    enterFastMode()
  } else {
    enterBrandMode()
  }
}

/**
 * brand 模式入口
 * 并行执行：bootstrapOnce()（品牌计时在 onReady 后开始）
 */
function enterBrandMode() {
  brandMinReached.value = false
  currentScene.value = 'brand'

  // 并行执行初始化
  startBootstrap()
}

/**
 * fast 模式入口
 * 不展示品牌，设置 brandMinReached=true
 * 启动 bootstrapOnce() + Loading 延迟计时
 */
function enterFastMode() {
  // fast 模式下品牌已"到达"（不展示品牌）
  brandMinReached.value = true
  loadingDelayReached.value = false

  // 启动 Loading 延迟计时
  startLoadingDelayTimer()

  // 并行执行初始化
  startBootstrap()
}

// ==================== 计时器管理 ====================

/**
 * 启动品牌最短展示计时
 * 仅在 onReady 后调用
 */
function startBrandTimer() {
  const minDuration = startupConfig.brandMinDuration

  if (minDuration > 0) {
    _brandTimer = setTimeout(() => {
      if (isUnloaded.value) return
      _brandTimer = null
      log(`brand minimum reached elapsed=${minDuration}ms`)
      onBrandMinReached()
    }, minDuration)
  } else {
    // 无延时要求，直接标记到达
    brandMinReached.value = true
  }
}

/**
 * 启动 Loading 延迟计时
 */
function startLoadingDelayTimer() {
  const delay = startupConfig.fastLoadingDelay

  if (delay > 0) {
    _loadingDelayTimer = setTimeout(() => {
      if (isUnloaded.value) return
      _loadingDelayTimer = null
      log(`loading revealed elapsed=${delay}ms`)
      onLoadingDelayReached()
    }, delay)
  } else {
    // delay=0 时立即触发状态协调，避免空白
    onLoadingDelayReached()
  }
}

// ==================== 初始化执行 ====================

/**
 * 执行初始化
 */
async function startBootstrap() {
  log('bootstrap started')

  try {
    const result = await bootstrapOnce()
    if (isUnloaded.value) return

    const elapsed = Date.now() - pageLoadTime
    log(`bootstrap completed elapsed=${elapsed}ms`)

    bootResult.value = result
    bootCompleted.value = true

    // 必须等 UI 就绪后才能执行路由
    if (!uiReady.value) {
      log('bootstrap done, waiting for uiReady')
      return
    }

    // 根据模式协调
    if (startupConfig.mode === 'fast') {
      coordinateFastStartup()
    } else {
      coordinateBrandStartup()
    }

  } catch (err) {
    if (isUnloaded.value) return
    log(`bootstrap error: ${err && err.message ? err.message : 'unknown'}`)

    bootCompleted.value = true
    bootResult.value = {
      status: 'error',
      targetUrl: null,
      reason: 'unexpected_error',
      error: err
    }

    // 必须等 UI 就绪后才能执行路由
    if (!uiReady.value) {
      log('bootstrap error, waiting for uiReady')
      return
    }

    if (startupConfig.mode === 'fast') {
      coordinateFastStartup()
    } else {
      coordinateBrandStartup()
    }
  }
}

// ==================== brand 模式协调 ====================

/**
 * brand 模式协调函数
 * 核心规则：brandMinReached=false 时，无论初始化是否完成，都停留品牌画面
 */
function coordinateBrandStartup() {
  if (isUnloaded.value) return

  // 品牌最短计时未到：停留品牌画面，不得执行路由
  if (!brandMinReached.value) {
    return
  }

  // 品牌计时已到，初始化未完成：切换到 loading
  if (!bootCompleted.value) {
    transitionToLoading()
    return
  }

  // 品牌计时已到，初始化已完成：处理结果
  handleBootstrapResult(bootResult.value)
}

// ==================== fast 模式协调 ====================

/**
 * fast 模式协调函数
 */
function coordinateFastStartup() {
  if (isUnloaded.value) return

  // 初始化在 Loading 延迟内完成：清除延迟计时器，直接处理路由
  if (bootCompleted.value && _loadingDelayTimer) {
    clearTimeout(_loadingDelayTimer)
    _loadingDelayTimer = null
    log('bootstrap before loading delay, skip loading')
    handleBootstrapResult(bootResult.value)
    return
  }

  // 初始化完成且 Loading 已显示：处理路由
  if (bootCompleted.value && loadingDelayReached.value) {
    handleBootstrapResult(bootResult.value)
    return
  }

  // 初始化未完成且 Loading 延迟已到：显示 Loading
  if (!bootCompleted.value && loadingDelayReached.value) {
    transitionToLoading()
    return
  }
}

// ==================== 计时回调 ====================

/**
 * 品牌最短展示时长到达
 */
function onBrandMinReached() {
  if (isUnloaded.value) return
  brandMinReached.value = true
  coordinateBrandStartup()
}

/**
 * fast 模式 Loading 延迟到达
 */
function onLoadingDelayReached() {
  if (isUnloaded.value) return
  loadingDelayReached.value = true
  coordinateFastStartup()
}

// ==================== 场景切换 ====================

/**
 * 切换到 loading 场景
 */
function transitionToLoading() {
  if (isUnloaded.value) return
  currentScene.value = 'loading'
}

/**
 * 处理初始化结果
 */
function handleBootstrapResult(result) {
  if (isUnloaded.value || !result) return

  // 强制更新 → 阻断
  if (result.status === 'force-update') {
    currentScene.value = 'force-update'
    errorMode.value = 'force-update'
    errorTitle.value = '发现新版本'
    errorDesc.value = result.updateInfo?.releaseNotes || '当前版本过低，请更新后继续使用'
    errorPrimaryText.value = '立即更新'
    errorSecondaryText.value = ''
    errorShowPrimary.value = true
    errorShowSecondary.value = false
    return
  }

  // 离线
  if (result.status === 'offline') {
    currentScene.value = 'offline'
    errorMode.value = 'offline'
    errorTitle.value = '网络连接失败'
    errorDesc.value = '请检查您的网络设置后重试'
    errorPrimaryText.value = '重试'
    errorShowPrimary.value = true
    errorShowSecondary.value = false
    return
  }

  // 错误
  if (result.status === 'error') {
    currentScene.value = 'error'
    errorMode.value = 'error'
    errorTitle.value = '加载失败'
    errorDesc.value = '遇到了一个问题，请稍后再试'
    errorPrimaryText.value = '重试'
    errorShowPrimary.value = true
    errorShowSecondary.value = false
    return
  }

  // 准备就绪 → 路由
  if (result.status === 'ready') {
    routeOnce(result.targetUrl)
  }
}

// ==================== 路由跳转 ====================

/**
 * 执行最终路由跳转（只执行一次）
 */
async function routeOnce(targetUrl) {
  if (hasRouted.value || isUnloaded.value) return

  hasRouted.value = true
  currentScene.value = 'routing'

  // 校验目标路径：sanitizeRedirect 校验注册状态与安全
  const safeUrl = sanitizeRedirect(targetUrl, HOME)
  if (!safeUrl || !isRegisteredRoute(safeUrl)) {
    log(`invalid target, entering error state`)
    hasRouted.value = false
    currentScene.value = 'error'
    errorMode.value = 'error'
    errorTitle.value = '跳转失败'
    errorDesc.value = '无法确定目标页面，请重试'
    errorPrimaryText.value = '重试'
    errorShowPrimary.value = true
    errorShowSecondary.value = false
    return
  }

  log(`route once target=${safeUrl}`)

  const success = await navigator.reLaunch(safeUrl)
  if (!success) {
    log('route failed')
    // 失败后释放锁，展示可重试状态
    hasRouted.value = false
    currentScene.value = 'error'
    errorMode.value = 'error'
    errorTitle.value = '跳转失败'
    errorDesc.value = '无法进入目标页面，请重试'
    errorPrimaryText.value = '重试'
    errorShowPrimary.value = true
    errorShowSecondary.value = false
  }
}

// ==================== 重试 ====================

/**
 * 用户点击重试
 */
function onRetry() {
  if (isUnloaded.value) return
  log('retry triggered')

  // 重置 bootstrap 状态
  resetBootstrapState()

  // 重置本地状态
  bootResult.value = null
  bootCompleted.value = false
  hasRouted.value = false
  loadingDelayReached.value = false
  errorShowSecondary.value = false

  // 清除旧计时器
  _clearAllTimers()

  // brand 模式的错误页重试直接进入 loading，不重复播放品牌动画
  // fast 模式重新使用 Loading 延迟阈值
  if (startupConfig.mode === 'fast') {
    // fast 模式：启动 Loading 延迟计时
    startLoadingDelayTimer()
  } else {
    // brand 模式重试：直接进 Loading，不再等 brandMinDuration
    brandMinReached.value = true
    transitionToLoading()
  }

  // 重新启动 bootstrap（single-flight 保护）
  startBootstrap()
}

// ==================== 立即更新 ====================

/**
 * 用户点击立即更新
 */
function onUpdate() {
  if (isUnloaded.value) return
  log('update triggered')

  const result = bootResult.value
  const downloadUrl = result?.updateInfo?.downloadUrl

  if (!downloadUrl) {
    log('no download url available')
    // 展示明确错误，不能重新执行 bootstrap
    currentScene.value = 'error'
    errorMode.value = 'error'
    errorTitle.value = '无法更新'
    errorDesc.value = '下载地址暂不可用，请稍后重试或联系客服'
    errorPrimaryText.value = '重试'
    errorShowPrimary.value = true
    errorShowSecondary.value = false
    return
  }

  // #ifdef APP-PLUS
  try {
    // iOS 打开 App Store URL，Android 使用 plus.runtime.openURL
    const osName = plus.os.name?.toLowerCase()
    if (osName === 'ios') {
      plus.runtime.openURL(downloadUrl)
    } else {
      plus.runtime.openURL(downloadUrl)
    }
    log(`open update url: ${downloadUrl}`)
  } catch (error) {
    console.error('[Startup] open update url failed', error)
    uni.showToast({ title: '打开失败，请手动更新', icon: 'none' })
  }
  // #endif

  // #ifndef APP-PLUS
  // H5 环境下尝试打开链接
  window.open(downloadUrl, '_blank')
  // #endif
}

// ==================== 次按钮 ====================

/**
 * 次按钮点击（退出等）
 */
function onSecondaryAction() {
  if (isUnloaded.value) return
  log('secondary action')
}

// ==================== 资源清理 ====================

/**
 * 清理所有计时器
 */
function _clearAllTimers() {
  if (_brandTimer) {
    clearTimeout(_brandTimer)
    _brandTimer = null
  }
  if (_loadingDelayTimer) {
    clearTimeout(_loadingDelayTimer)
    _loadingDelayTimer = null
  }
}

// ==================== Android 返回键处理 ====================

onBackPress(({ from }) => {
  if (from === 'navigateBack') return false

  const state = currentScene.value

  // brand/loading/routing 状态：阻止返回
  if (['brand', 'loading', 'routing'].includes(state)) {
    return true
  }

  // error/offline 状态：提供退出路径
  if (['error', 'offline'].includes(state)) {
    return false
  }

  // force-update 状态：阻止退出
  if (state === 'force-update') {
    return true
  }

  return false
})
</script>

<style lang="scss" scoped>
/* 
 * 启动页样式
 * - 铺满可用视口
 * - 统一处理安全区
 * - 不可滚动
 */

.startup-page {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: 
    radial-gradient(circle at 76% 22%, rgba(215, 25, 45, 0.055), transparent 30%),
    linear-gradient(180deg, #fff 0%, #fffdfd 100%);
  isolation: isolate;
}

/* 装饰丝带背景 */
.startup-ribbon {
  position: absolute;
  left: -6%;
  right: -6%;
  bottom: 8%;
  height: 34%;
  z-index: 0;
  opacity: 0.95;
  pointer-events: none;
  
  &::before,
  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 68%;
    border-radius: 50% 55% 0 0 / 55% 68% 0 0;
    background: linear-gradient(120deg, rgba(215, 25, 45, 0.02), rgba(215, 25, 45, 0.11));
    transform: rotate(-5deg);
  }
  
  &::after {
    height: 52%;
    opacity: 0.75;
    transform: rotate(4deg) translateY(28%);
    background: repeating-linear-gradient(
      -10deg,
      rgba(215, 25, 45, 0.08) 0 1px,
      transparent 1px 6px
    );
  }
}

/* 安全区容器（所有子组件共用） */
.startup-safe-area {
  position: absolute;
  inset: 0;
  z-index: 1;
  padding:
    env(safe-area-inset-top, 26px)
    env(safe-area-inset-right, 24px)
    env(safe-area-inset-bottom, 24px)
    env(safe-area-inset-left, 24px);
  display: grid;
  place-items: center;
}

/* 场景容器 - 显隐完全交给 class */
.scene {
  grid-area: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  visibility: visible;
  transform: scale(1) translateY(0);
  transition:
    opacity 0.55s ease,
    transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1),
    visibility 0s linear;
  width: 100%;
  height: 100%;
}

.scene-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: scale(0.985) translateY(4px);
  transition:
    opacity 0.55s ease,
    transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1),
    visibility 0s linear 0.55s;
}


</style>
