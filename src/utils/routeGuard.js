/**
 * @file 路由守卫 V2 - 登录、签约、冻结、权限拦截 + 统一导航
 * @description
 * 集中管理所有页面导航的权限检查和统一导航入口。
 *
 * 守卫执行顺序：
 *   1. 公开页（白名单）→ 放行
 *   2. 未登录 → 记录回跳地址，进入登录页
 *   3. 已登录但账号冻结 → 冻结说明页（仅允许访问特定页面）
 *   4. 已登录但未签约且目标页需要签约 → 拦截到经销商中心
 *   5. 权限不足（主账号限制）→ 无权限提示
 *   6. 放行
 *
 * 统一导航（V2 新增）：
 *   - 所有 navigateTo/redirectTo/reLaunch 必须通过 safeNavigateTo/safeRedirectTo/safeReLaunch
 *   - 所有返回必须通过 safeNavigateBack（栈为空时 reLaunch 首页）
 *   - 修正了旧版通过 URL 字符串判断是否使用 reLaunch 的错误逻辑
 *
 * 使用方式：
 *   import { safeNavigateTo, safeNavigateBack, handleAuthError } from '@/utils/routeGuard.js'
 *
 * ⚠️ 当前无 TabBar，禁止使用 switchTab！
 *
 * Skill 标准：api/base.js 为唯一请求入口，401 错误统一走 handleAuthError()
 */

import { useUserStore } from '../store/modules/user.js'
import {
  PUBLIC_ROUTES,
  FROZEN_ALLOWED_ROUTES,
  STARTUP,
  LOGIN,
  HOME,
  ACCOUNT_STATUS,
  DEALER_CENTER,
  getRouteMeta,
} from '../config/routes.js'

// ==================== 状态管理 ====================

/** 是否正在处理未登录跳转（防重复弹窗/跳转） */
let _isHandlingAuth = false

/**
 * 重置守卫状态（用于测试或异常恢复）
 */
export function resetAuthGuard() {
  _isHandlingAuth = false
  _refreshTokenPromise = null
}

// ==================== 核心守卫函数 ====================

/**
 * 检查是否可以访问目标页面
 *
 * @param {string} toUrl - 目标页面路径
 * @param {Object} [options={}] - 选项
 * @returns {{ allowed: boolean, redirectUrl?: string, reason?: string }}
 */
export function canAccess(toUrl, options = {}) {
  const userStore = useUserStore()

  // 1. 白名单检查
  if (isPublicRoute(toUrl)) {
    return { allowed: true }
  }

  // 2. 未登录检查
  if (!userStore.isLogin) {
    return {
      allowed: false,
      redirectUrl: buildLoginUrl(toUrl),
      reason: 'NOT_LOGGED_IN',
    }
  }

  // 3. 冻结账号检查（只能访问特定页面）
  if (userStore.isFrozen && !isFrozenAllowed(toUrl)) {
    return {
      allowed: false,
      redirectUrl: ACCOUNT_STATUS,
      reason: 'ACCOUNT_FROZEN',
    }
  }

  // 4. 签约状态检查（基于 ROUTE_META 元数据）
  const meta = getRouteMeta(toUrl)
  if (meta.requireSign && !userStore.isSigned) {
    // 当前策略：不强制拦截，返回 warning 由调用方决定是否拦截
    // 未来可改为 allowed: false + redirectUrl: DEALER_CENTER
    console.warn(`[RouteGuard] 页面 ${toUrl} 需要签约，当前签约状态:`, userStore.signStatus)
  }

  // 5. 主账号限制检查（基于 ROUTE_META owner 字段）
  if (meta.owner === 'main' && !userStore.isMainAccount) {
    return {
      allowed: false,
      redirectUrl: HOME,
      reason: 'MAIN_ACCOUNT_ONLY',
    }
  }

  return { allowed: true }
}

/**
 * 执行导航并经过守卫检查
 *
 * @param {'navigateTo'|'redirectTo'|'reLaunch'} method - 导航方法
 * @param {string} url - 目标路径
 * @param {Object} [navOptions={}] - uni 导航参数
 * @returns {Promise<boolean>} 是否成功导航
 */
export async function guardedNavigate(method, url, navOptions = {}) {
  const { allowed, redirectUrl, reason } = canAccess(url)

  if (!allowed) {
    if (reason === 'NOT_LOGGED_IN' && !_isHandlingAuth) {
      _isHandlingAuth = true
      // V2 修正：统一使用 redirectTo 跳转登录页（不再错误地根据 URL 字符串判断）
      uni.redirectTo({
        url: redirectUrl,
        fail: () => {
          // redirectTo 失败时降级为 reLaunch（如页面栈限制）
          uni.reLaunch({
            url: redirectUrl,
            fail: (err) => {
              console.error('[RouteGuard] 登录跳转完全失败:', err)
              _isHandlingAuth = false
            },
            complete: () => {
              setTimeout(() => { _isHandlingAuth = false }, 500)
            },
          })
        },
        complete: () => {
          setTimeout(() => { _isHandlingAuth = false }, 500)
        },
      })
    } else if (reason === 'ACCOUNT_FROZEN') {
      // 冻结状态需要关闭所有页面并跳转
      uni.reLaunch({ url: redirectUrl })
    } else if (reason === 'MAIN_ACCOUNT_ONLY') {
      uni.showToast({ title: '仅主账号可操作', icon: 'none' })
    }
    return false
  }

  return new Promise((resolve) => {
    uni[method]({
      url,
      ...navOptions,
      success: () => resolve(true),
      fail: (err) => {
        console.error('[RouteGuard] 导航失败:', method, url, err)
        // V2：navigateTo 失败时自动尝试 redirectTo（处理页面栈超限）
        if (method === 'navigateTo') {
          uni.redirectTo({
            url,
            ...navOptions,
            success: () => resolve(true),
            fail: (err2) => {
              console.error('[RouteGuard] 降级导航也失败:', 'redirectTo', url, err2)
              resolve(false)
            },
          })
        } else {
          resolve(false)
        }
      },
    })
  })
}

// ==================== 401 / Token 过期处理 ====================

/**
 * 处理 401 认证错误
 *
 * 当 api/base.js 拦截器收到 401 时调用此函数：
 *   - 清除登录态，跳转登录页
 *   - Token 刷新功能待后端实现 RefreshToken 接口后启用
 *
 * @returns {Promise<boolean>} 是否成功恢复认证（当前始终返回 false）
 */
export async function handleAuthError() {
  // 防止重复处理
  if (_isHandlingAuth) {
    return false
  }

  _isHandlingAuth = true

  try {
    // 当前策略：直接登出并跳转登录页
    // TODO: 后端实现 RefreshToken 接口后，在此处调用刷新逻辑
    console.warn('[RouteGuard] 401 认证错误，执行登出')
    await forceLogout()
    return false
  } catch (e) {
    console.error('[RouteGuard] handleAuthError 异常:', e)
    return false
  } finally {
    _isHandlingAuth = false
  }
}

/**
 * 强制登出并跳转登录页
 * @private
 */
async function forceLogout() {
  const userStore = useUserStore()
  const currentPages = getCurrentPages()
  const currentPage = currentPages[currentPages.length - 1]
  const currentPath = currentPage ? `/${currentPage.route}` : ''

  // 不在白名单中的页面才跳转（避免登录页无限循环）
  if (!isPublicRoute(currentPath)) {
    await userStore.logout()
    uni.reLaunch({
      url: buildLoginUrl(currentPath),
      fail: () => {
        // 兜底
        uni.reLaunch({ url: LOGIN })
      }
    })
  }
}

// ==================== 便捷导航方法 ====================

/**
 * 安全的 navigateTo（自动经过守卫）
 */
export function safeNavigateTo(url, options = {}) {
  return guardedNavigate('navigateTo', url, options)
}

/**
 * 安全的 redirectTo（自动经过守卫）
 */
export function safeRedirectTo(url, options = {}) {
  return guardedNavigate('redirectTo', url, options)
}

/**
 * 安全的 reLaunch（自动经过守卫）
 */
export function safeReLaunch(url, options = {}) {
  return guardedNavigate('reLaunch', url, options)
}

/**
 * 安全返回（V2 增强）
 *
 * 返回行为：
 *   1. 页面栈足够 → navigateBack
 *   2. 页面栈为空/分享直达 → reLaunch 首页
 *   3. 表单有未保存内容 → 二次确认（需调用方传入 hasUnsavedChanges）
 *   4. 同时支持 Android 硬件返回键
 *
 * @param {number} [delta=1] - 返回层数
 * @param {Object} [options={}] - 选项
 * @param {boolean} [options.hasUnsavedChanges=false] - 是否有未保存内容
 * @returns {boolean} 是否成功发起返回
 */
export function safeNavigateBack(delta = 1, options = {}) {
  const { hasUnsavedChanges = false } = options
  const pages = getCurrentPages()

  // 二次确认未保存内容
  if (hasUnsavedChanges) {
    uni.showModal({
      title: '确认离开',
      content: '当前有未保存的修改，确定要离开吗？',
      confirmText: '离开',
      cancelText: '留下',
      success: (res) => {
        if (res.confirm) {
          doNavigateBack(pages, delta)
        }
      },
    })
    return true // 已处理
  }

  return doNavigateBack(pages, delta)
}

/**
 * 执行实际的返回操作
 * @private
 */
function doNavigateBack(pages, delta) {
  if (pages.length <= delta) {
    // 栈为空或不足：reLaunch 到首页（覆盖分享直达等场景）
    console.log('[RouteGuard] 页面栈不足，reLaunch 首页。当前栈深度:', pages.length)
    uni.reLaunch({
      url: HOME,
      fail: (err) => {
        console.error('[RouteGuard] reLaunch 首页失败:', err)
      },
    })
    return true
  }

  uni.navigateBack({
    delta,
    fail: (err) => {
      console.error('[RouteGuard] navigateBack 失败:', err)
      // 降级：如果 navigateBack 也失败，尝试 reLaunch 首页
      uni.reLaunch({ url: HOME })
    },
  })
  return true
}

/**
 * App 启动时的全局守卫检查
 * 
 * ⚠️ 注意：此函数不再由 App.vue onLaunch 调用
 * 冷启动路由分流已由 pages/startup/index.vue 全权负责
 * 
 * 安全保证（供其他可能的调用场景）：
 * 1. getCurrentPages() 为空时直接放行
 * 2. currentPath 为 STARTUP 时直接放行
 * 3. 不能把空路径自动解释为 HOME
 *
 * @returns {{ passed: boolean, action?: string }}
 */
export function launchGuard() {
  const pages = getCurrentPages()

  // 安全保证 1: getCurrentPages() 为空时直接放行
  if (!pages || pages.length === 0) {
    return { passed: true }
  }

  const currentPage = pages[pages.length - 1]
  const currentPath = currentPage ? `/${currentPage.route}` : ''

  // 安全保证 2: currentPath 为 STARTUP 时直接放行
  if (currentPath === STARTUP) {
    return { passed: true }
  }

  // 安全保证 3: 路径为空时直接放行，不自动解释为需要登录
  if (!currentPath) {
    return { passed: true }
  }

  const { allowed, reason, redirectUrl } = canAccess(currentPath)

  if (!allowed) {
    if (reason === 'NOT_LOGGED_IN' && !isPublicRoute(currentPath)) {
      console.log('[RouteGuard] 启动拦截: 未登录, 当前页:', currentPath)
      return { passed: false, action: 'redirect_to_login', redirectUrl }
    }
    if (reason === 'ACCOUNT_FROZEN') {
      console.log('[RouteGuard] 启动拦截: 账号冻结')
      return { passed: false, action: 'redirect_to_status', redirectUrl }
    }
  }

  return { passed: true }
}

// ==================== 辅助函数 ====================

/**
 * 判断是否为公开路由
 * @param {string} path
 * @returns {boolean}
 */
function isPublicRoute(path) {
  // 精确匹配
  if (PUBLIC_ROUTES.has(path)) return true

  // 前缀匹配（分包下的子页面）
  for (const publicPath of PUBLIC_ROUTES) {
    if (path.startsWith(publicPath + '/')) return true
  }

  return false
}

/**
 * 冻结账号是否允许访问
 * @param {string} path
 * @returns {boolean}
 */
function isFrozenAllowed(path) {
  return FROZEN_ALLOWED_ROUTES.has(path)
}

/**
 * 构建带回跳参数的登录 URL
 * @param {string} targetUrl - 原目标地址
 * @returns {string}
 */
function buildLoginUrl(targetUrl) {
  // 只允许应用内已注册路由作为回跳地址（防止开放重定向）
  const safeTarget = isInternalRoute(targetUrl) ? targetUrl : HOME
  return `${LOGIN}?redirect=${encodeURIComponent(safeTarget)}`
}

/**
 * 检查是否为应用内路由（基础安全校验）
 * @param {string} url
 * @returns {boolean}
 */
function isInternalRoute(url) {
  if (!url || url.startsWith('http') || url.startsWith('//')) return false
  if (url.startsWith('/pages/') || url.startsWith('/subPackages/')) return true
  return false
}
