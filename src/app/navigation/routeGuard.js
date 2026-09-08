/**
 * @file 路由守卫 - 唯一访问判定入口
 * @description
 * 根据标准化 path 和用户状态返回访问判定，不执行任何导航。
 *
 * 返回结构固定：
 *   { allowed: true, path }
 * 或：
 *   { allowed: false, path, reason, redirectUrl }
 *
 * reason 取值：
 *   NOT_REGISTERED | NOT_LOGGED_IN | NOT_SIGNED | ACCOUNT_FROZEN | MAIN_ACCOUNT_ONLY
 */

import {
  normalizeRoutePath,
  isRegisteredRoute,
  PUBLIC_ROUTES,
  FROZEN_ALLOWED_ROUTES,
  ROUTE_META,
} from '../config/routes.js'

/**
 * 根据标准化 path 和用户快照判断是否允许访问。
 *
 * @param {string} toUrl - 完整的 URL（可包含 query）
 * @param {{ isLogin: boolean, isSigned: boolean, isFrozen: boolean, isMainAccount: boolean }} [userSnapshot]
 * @returns {{ allowed: boolean, path: string, reason?: string, redirectUrl?: string }}
 */
export function canAccess(toUrl, userSnapshot = null) {
  const path = normalizeRoutePath(toUrl)

  // 1. 空路径直接拒绝
  if (!path) {
    return { allowed: false, path, reason: 'NOT_REGISTERED' }
  }

  // 2. 未注册路由拒绝
  if (!isRegisteredRoute(path)) {
    return { allowed: false, path, reason: 'NOT_REGISTERED' }
  }

  // 3. 精确路由公开判定（requireAuth=false）
  const meta = ROUTE_META[path]
  // 如果 meta 未定义但 path 已注册（防卫性）
  if (!meta) {
    return { allowed: true, path }
  }

  // 4. 公开页面直接放行
  if (!meta.requireAuth || PUBLIC_ROUTES.has(path)) {
    return { allowed: true, path }
  }

  // 需要用户状态做后续判断
  const user = userSnapshot || { isLogin: false, isSigned: false, isFrozen: false, isMainAccount: false }

  // 5. 未登录
  if (!user.isLogin) {
    return {
      allowed: false,
      path,
      reason: 'NOT_LOGGED_IN',
      // redirectUrl 由 navigator 用 routes.auth.login({ redirect: 原完整 URL }) 构造
    }
  }

  // 6. 冻结检查
  if (user.isFrozen && !meta.allowFrozen && !FROZEN_ALLOWED_ROUTES.has(path)) {
    return {
      allowed: false,
      path,
      reason: 'ACCOUNT_FROZEN',
    }
  }

  // 7. 签约检查
  if (meta.requireSign && !user.isSigned) {
    return {
      allowed: false,
      path,
      reason: 'NOT_SIGNED',
    }
  }

  // 8. 主账号限制
  if (meta.owner === 'main' && !user.isMainAccount) {
    return {
      allowed: false,
      path,
      reason: 'MAIN_ACCOUNT_ONLY',
    }
  }

  return { allowed: true, path }
}

/**
 * 判断标准化 path 是否属于 PUBLIC_ROUTES。
 * 供 navigator 直接做公开路由快速判定（避免重复实现逻辑）。
 *
 * @param {string} path - 标准化后的路由 path
 * @returns {boolean}
 */
export function isPublicRoute(path) {
  const normalized = normalizeRoutePath(path)
  return PUBLIC_ROUTES.has(normalized)
}

/**
 * 判断标准化 path 是否允许冻结账号访问。
 * @param {string} path
 * @returns {boolean}
 */
export function isFrozenAllowed(path) {
  const normalized = normalizeRoutePath(path)
  const meta = ROUTE_META[normalized]
  if (meta && meta.allowFrozen) return true
  return FROZEN_ALLOWED_ROUTES.has(normalized)
}
