/**
 * @file 统一导航封装
 * @description
 * 唯一允许直接调用 UniApp 导航 API 的业务文件。
 *
 * 职责：
 *   - 唯一调用 uni.navigateTo / redirectTo / reLaunch / navigateBack
 *   - 调用 routeGuard 做访问判定
 *   - 执行被拒绝后的跳转
 *   - 页面栈不足时安全兜底
 *   - 统一返回 Promise<boolean>
 *
 * 不得：
 *   - 再声明第二个 canAccess / isPublicRoute / isFrozenAllowed
 *   - 再维护 PUBLIC_ROUTES / FROZEN_ALLOWED_ROUTES 列表
 *   - 硬编码业务页面字符串
 *   - 再提供 toProductDetail / toOrderDetail 等第二套业务路由
 */

import {
  HOME,
  LOGIN,
  APPLY_SIGN,
  ACCOUNT_STATUS,
  routes,
} from '../config/routes.js'
import { canAccess, isPublicRoute } from './routeGuard.js'
import { useUserStore } from '../../shared/session/userStore.js'

// ==================== 内部实现 ====================

let _isHandlingAuth = false

/**
 * 获取并缓存用户快照，供 routeGuard 判定使用。
 */
function getUserSnapshot() {
  try {
    const userStore = useUserStore()
    return {
      isLogin: !!userStore.isLogin,
      isSigned: !!userStore.isSigned,
      isFrozen: !!userStore.isFrozen,
      isMainAccount: !!userStore.isMainAccount,
    }
  } catch (e) {
    return { isLogin: false, isSigned: false, isFrozen: false, isMainAccount: false }
  }
}

/**
 * 内部导航调用：先过 routeGuard，再调用 UniApp 导航。
 *
 * @param {'navigateTo'|'redirectTo'|'reLaunch'} method
 * @param {string} url - 已包含 query 的完整 URL
 * @param {object} [options] - UniApp 选项（如 events、success 等），不允许再拼 query
 * @returns {Promise<boolean>}
 */
function guardedNavigate(method, url, options = {}) {
  // 公开路由快速放行（不依赖 Pinia）
  if (isPublicRoute(url)) {
    return doUniNavigate(method, url, options)
  }

  // 调用 routeGuard 获取判定结果
  const user = getUserSnapshot()
  const verdict = canAccess(url, user)

  if (!verdict.allowed) {
    return handleBlocked(method, url, verdict)
  }

  return doUniNavigate(method, url, options)
}

/**
 * 执行 UniApp 导航，并统一返回 Promise<boolean>。
 * navigateTo 失败时会降级到 redirectTo。
 */
function doUniNavigate(method, url, options = {}) {
  // 分离 UniApp 原生选项：白名单保留字段
  const uniOptions = { url }
  // events 透传给 uni.navigateTo
  if (options.events) uniOptions.events = options.events

  if (method === 'navigateTo') {
    return new Promise((resolve) => {
      uni.navigateTo({
        ...uniOptions,
        success: () => resolve(true),
        fail: (err) => {
          console.error('[Navigator] navigateTo 失败，降级到 redirectTo:', url, err)
          uni.redirectTo({
            url,
            success: () => resolve(true),
            fail: (err2) => {
              console.error('[Navigator] redirectTo 也失败:', url, err2)
              resolve(false)
            },
          })
        },
      })
    })
  }

  if (method === 'redirectTo') {
    return new Promise((resolve) => {
      uni.redirectTo({
        ...uniOptions,
        success: () => resolve(true),
        fail: (err) => {
          console.error('[Navigator] redirectTo 失败:', url, err)
          resolve(false)
        },
      })
    })
  }

  if (method === 'reLaunch') {
    return new Promise((resolve) => {
      uni.reLaunch({
        ...uniOptions,
        success: () => resolve(true),
        fail: (err) => {
          console.error('[Navigator] reLaunch 失败:', url, err)
          resolve(false)
        },
      })
    })
  }

  console.error('[Navigator] 未知方法:', method)
  return Promise.resolve(false)
}

/**
 * 处理被 routeGuard 拒绝的导航。
 * 注意：安全 redirect 目标（login / applySign / accountStatus）本身都是公开路由，
 * 所以不会形成无限递归守卫。
 *
 * @returns {Promise<boolean>}
 */
function handleBlocked(method, url, verdict) {
  const { reason, path } = verdict

  if (reason === 'NOT_LOGGED_IN') {
    // 防止重复触发
    if (_isHandlingAuth) return Promise.resolve(false)
    _isHandlingAuth = true

    // 构造完整 redirect URL
    const redirectUrl = routes.auth.login({ redirect: url })

    return new Promise((resolve) => {
      uni.reLaunch({
        url: redirectUrl,
        complete: () => {
          setTimeout(() => { _isHandlingAuth = false }, 500)
        },
        success: () => resolve(false),
        fail: () => {
          // reLaunch login 失败时再尝试 redirectTo
          uni.redirectTo({
            url: redirectUrl,
            success: () => resolve(false),
            fail: () => {
              _isHandlingAuth = false
              resolve(false)
            },
          })
        },
      })
    })
  }

  if (reason === 'NOT_SIGNED') {
    if (_isHandlingAuth) return Promise.resolve(false)
    _isHandlingAuth = true

    return new Promise((resolve) => {
      uni.reLaunch({
        url: routes.auth.applySign(),
        complete: () => {
          setTimeout(() => { _isHandlingAuth = false }, 500)
        },
        success: () => resolve(false),
        fail: () => resolve(false),
      })
    })
  }

  if (reason === 'ACCOUNT_FROZEN') {
    return new Promise((resolve) => {
      uni.reLaunch({
        url: routes.auth.accountStatus(),
        success: () => resolve(false),
        fail: () => resolve(false),
      })
    })
  }

  if (reason === 'MAIN_ACCOUNT_ONLY') {
    console.warn('[Navigator] 非主账号，拒绝访问:', { path })
    return safeBackOrHome().then(() => false)
  }

  if (reason === 'NOT_REGISTERED') {
    console.error('[Navigator] 未注册路由，拒绝导航:', { path })
    return Promise.resolve(false)
  }

  console.warn('[Navigator] 被拒绝导航:', { method, url, reason })
  return Promise.resolve(false)
}

function getCurrentRoute() {
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1]
  return cur ? `/${cur.route}` : HOME
}

/**
 * 安全返回：页面栈足够则 navigateBack，否则按用户状态兜底。
 * 统一返回 Promise<boolean>。
 */
function doNavigateBack(delta = 1) {
  const pages = getCurrentPages()
  if (pages.length > delta) {
    return new Promise((resolve) => {
      uni.navigateBack({
        delta,
        success: () => resolve(true),
        fail: () => {
          // navigateBack 失败时，尝试重定向到上一页面
          const targetPage = pages[pages.length - 1 - delta]
          if (targetPage) {
            const targetUrl = `/${targetPage.route}`
            uni.redirectTo({
              url: targetUrl,
              success: () => resolve(true),
              fail: () => safeBackOrHome().then(resolve),
            })
          } else {
            safeBackOrHome().then(resolve)
          }
        },
      })
    })
  }

  // 页面栈不足：异步兜底
  return safeBackOrHome()
}

/**
 * 按用户状态兜底（未登录 → 登录页；冻结 → 状态页；其他 → 首页）。
 * @returns {Promise<boolean>}
 */
function safeBackOrHome() {
  return new Promise((resolve) => {
    let target
    try {
      const userStore = useUserStore()
      if (!userStore.isLogin) {
        target = routes.auth.login()
      } else if (userStore.isFrozen) {
        target = routes.auth.accountStatus()
      } else {
        target = routes.home()
      }
    } catch (e) {
      target = HOME
    }

    uni.reLaunch({
      url: target,
      success: () => resolve(true),
      fail: () => {
        // 兜底也失败时仍 resolve true（已尽力）
        console.error('[Navigator] safeBackOrHome reLaunch 失败:', target)
        resolve(true)
      },
    })
  })
}

// ==================== 导出 ====================

export const navigator = {
  /**
   * 导航到指定页面（保留页面栈）。
   * url 必须来自 routes 工厂。第二参数只允许 UniApp 导航选项（如 events）。
   * @returns {Promise<boolean>}
   */
  navigateTo(url, options) {
    return guardedNavigate('navigateTo', url, options)
  },

  /**
   * 重定向到指定页面（关闭当前页面）。
   * @returns {Promise<boolean>}
   */
  redirectTo(url) {
    return guardedNavigate('redirectTo', url)
  },

  /**
   * 重启到指定页面（关闭所有页面）。
   * @returns {Promise<boolean>}
   */
  reLaunch(url) {
    return guardedNavigate('reLaunch', url)
  },

  /**
   * 返回上一页。页面栈不足时按用户状态兜底。
   * @param {number} [delta=1]
   * @returns {Promise<boolean>}
   */
  async back(delta = 1) {
    return doNavigateBack(delta)
  },

  /**
   * 带确认的返回（用于未保存内容场景）。
   * @param {{ hasUnsavedChanges?: boolean, delta?: number }} [options]
   * @returns {Promise<boolean>}
   */
  backWithConfirm(options = {}) {
    const { hasUnsavedChanges = false, delta = 1 } = options
    if (hasUnsavedChanges) {
      return new Promise((resolve) => {
        uni.showModal({
          title: '确认离开',
          content: '当前有未保存的修改，确定要离开吗？',
          confirmText: '离开',
          cancelText: '留下',
          success: (res) => {
            if (res.confirm) {
              resolve(doNavigateBack(delta))
            } else {
              resolve(false)
            }
          },
          fail: () => resolve(false),
        })
      })
    }
    return doNavigateBack(delta)
  },

  /**
   * 处理认证错误（401）：退出登录并重启到登录页。
   * @returns {Promise<boolean>}
   */
  async handleAuthError() {
    if (_isHandlingAuth) return false
    _isHandlingAuth = true
    try {
      const userStore = useUserStore()
      await userStore.logout()
      return doUniNavigate('reLaunch', routes.auth.login())
    } catch (e) {
      console.error('[Navigator] handleAuthError 失败:', e)
      return doUniNavigate('reLaunch', LOGIN)
    } finally {
      _isHandlingAuth = false
    }
  },

  /**
   * 重置认证防重标志。
   */
  resetAuthGuard() {
    _isHandlingAuth = false
  },
}
