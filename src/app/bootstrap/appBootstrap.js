/**
 * appBootstrap - 冷启动初始化
 *
 * 负责启动所需关键能力：
 * 1. 读取并恢复当前 Token、语言和会话摘要
 * 2. APP 端检查版本（与会话恢复并行）
 * 3. 有 Token 时通过 GetBootstrapContext 恢复/验证会话
 * 4. 区分未登录、待签约、冻结、权限不足和正常账号
 * 5. 解析安全目标路由
 *
 * 使用项目真实基础设施：
 * - 请求：src/app/bootstrap/bootstrapApi.js (getBootstrapContext, checkAppVersion)
 * - 用户状态：src/shared/session/userStore.js
 * - 路由常量：src/app/config/routes.js
 * - 错误对象：src/shared/api/appError.js
 * - 启动配置：src/app/config/startupConfig.js
 *
 * 启动阶段所有请求使用 authStrategy: 'passive'，
 * 401 直接 reject，由调用页面决定怎么处理
 */

import { getBootstrapContext, checkAppVersion } from './bootstrapApi.js'
import { useUserStore } from '../../shared/session/userStore.js'
import storage from '../../shared/utils/storage.js'
import { LOGIN, APPLY_SIGN, ACCOUNT_STATUS, HOME } from '../config/routes.js'
import { AppError, ErrorKind } from '../../shared/api/appError.js'

// ==================== 配置常量 ====================

/** 关键请求超时时间（毫秒） */
const BOOTSTRAP_TIMEOUT = 8000

/**
 * 是否冷启动完成（single-flight 保护）
 * 同一次启动期间多次调用返回同一个进行中的 Promise
 */
let _bootPromise = null
let _isBootstrapped = false

/** 缓存的启动结果 */
let _cachedResult = null

/** 当前请求的 requestTask（用于超时中止） */
let _currentRequestTask = null

// ==================== 公共函数 ====================

/**
 * 执行单次初始化（single-flight）
 * 同一次启动期间多次调用返回同一个 Promise
 *
 * @param {Object} [options] - 配置选项
 * @returns {Promise<BootstrapResult>}
 */
export async function bootstrapOnce(options = {}) {
  // 已完成的直接返回缓存结果
  if (_isBootstrapped) {
    return _cachedResult
  }

  // 正在进行中的返回同一个 Promise
  if (_bootPromise) {
    return _bootPromise
  }

  _bootPromise = _performBootstrap(options)

  try {
    const result = await _bootPromise
    _cachedResult = result
    _isBootstrapped = true
    return result
  } catch (e) {
    throw e
  } finally {
    // settled 后清理 _bootPromise，避免下次重试时返回旧的 Promise
    _bootPromise = null
  }
}

/**
 * 执行实际初始化逻辑
 * @private
 */
async function _performBootstrap(options = {}) {
  const userStore = useUserStore()

  // 步骤 1: 恢复本地登录态
  userStore.restoreLoginState()

  // 步骤 2: 规范化语言设置
  _normalizeLanguage()

  // 步骤 3: 无 Token → 正常结果，目标为登录页
  if (!userStore.token) {
    return {
      status: 'ready',
      targetUrl: _getSafeLoginUrl(),
      reason: 'no_token',
      restoredSession: false
    }
  }

  // 步骤 4: 有 Token → 版本检测 + 会话恢复并行执行
  try {
    const [versionResult, userInfo] = await Promise.all([
      _checkVersionSafe(),
      _fetchBootstrapContext()
    ])

    // 版本检测优先：强制更新 → 阻断
    if (versionResult && versionResult.forceUpdate) {
      return {
        status: 'force-update',
        targetUrl: null,
        reason: 'force_update_required',
        updateInfo: versionResult,
        restoredSession: false
      }
    }

    // 更新 Store 中的用户信息
    userStore.setLoginData({
      token: userStore.token,
      refreshToken: userStore.refreshToken,
      expiresIn: userStore.tokenExpiresIn,
      userInfo: userInfo,
    })

    // 步骤 5: 根据用户状态决定目标路由
    return _resolveTarget(userInfo)

  } catch (error) {
    return _handleBootError(error)
  }
}

/**
 * 获取启动上下文（带超时保护）
 * @private
 */
function _fetchBootstrapContext() {
  return new Promise((resolve, reject) => {
    let isSettled = false

    // 超时保护
    const timer = setTimeout(() => {
      if (isSettled) return
      isSettled = true
      // 尝试中止请求
      if (_currentRequestTask) {
        try { _currentRequestTask.abort() } catch (e) { /* ignore */ }
        _currentRequestTask = null
      }
      reject(new AppError('请求超时，请稍后重试', ErrorKind.TIMEOUT, { retryable: true }))
    }, BOOTSTRAP_TIMEOUT)

    getBootstrapContext({ authStrategy: 'passive', timeout: BOOTSTRAP_TIMEOUT })
      .then((result) => {
        if (isSettled) return // 已超时，忽略迟到响应
        isSettled = true
        clearTimeout(timer)
        _currentRequestTask = null
        resolve(result)
      })
      .catch((err) => {
        if (isSettled) return // 已超时，忽略迟到响应
        isSettled = true
        clearTimeout(timer)
        _currentRequestTask = null
        reject(err)
      })
  })
}

/**
 * 安全执行版本检测（非 APP-PLUS 或失败时返回 null）
 * @private
 */
async function _checkVersionSafe() {
  // #ifdef APP-PLUS
  try {
    const versionInfo = await _getAppVersionInfo()
    if (!versionInfo) return null

    const result = await checkAppVersion(versionInfo)

    // 判断是否需要强制更新
    if (result && result.forceUpdate && result.minSupportedVersionCode > versionInfo.VersionCode) {
      return {
        forceUpdate: true,
        ...result
      }
    }

    return { forceUpdate: false, ...result }
  } catch (e) {
    // 版本检测失败不阻塞启动
    console.warn('[Bootstrap] version check failed:', e)
    return null
  }
  // #endif

  // #ifndef APP-PLUS
  return null
  // #endif
}

/**
 * 获取当前 App 版本信息
 * @private
 */
function _getAppVersionInfo() {
  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    try {
      const versionCode = plus.runtime.versionCode
      const versionName = plus.runtime.version

      if (!versionCode || !versionName) {
        reject(new Error('无法获取版本信息'))
        return
      }

      // 判断平台
      const osName = plus.os.name?.toLowerCase()
      const platform = osName === 'ios' ? 'ios' : 'android'

      resolve({
        Platform: platform,
        VersionCode: versionCode,
        VersionName: versionName,
      })
    } catch (error) {
      reject(error)
    }
  })
  // #endif

  // #ifndef APP-PLUS
  return Promise.resolve(null)
  // #endif
}

/**
 * 根据用户状态解析目标路由
 * @private
 *
 * 响应模型：{ customerId, username, realName, companyName, status, signStatus, isMaster, roles, permissions }
 * 禁止用 userStore.signStatus 默认值代替接口没有返回的字段
 */
function _resolveTarget(userInfo) {
  const userStore = useUserStore()

  // 验证响应完整性：signStatus 必须存在
  if (userInfo.signStatus === undefined || userInfo.signStatus === null) {
    console.error('[Bootstrap] invalid response: signStatus missing')
    return {
      status: 'error',
      targetUrl: null,
      reason: 'invalid_response',
      error: new AppError('响应数据异常', ErrorKind.BUSINESS),
      restoredSession: false
    }
  }

  // 账号冻结/禁用
  if (userInfo.status === 0 || userStore.isFrozen) {
    return {
      status: 'ready',
      targetUrl: ACCOUNT_STATUS,
      reason: 'account_frozen',
      restoredSession: true
    }
  }

  // 更新账号状态
  userStore.setAccountStatus(userInfo.status || 1)

  // 签约状态判断（使用接口返回的真实值，不依赖默认值）
  const signStatus = userInfo.signStatus
  userStore.setSignStatus(signStatus)

  // 未签约 → 进入签约/申请页
  if (signStatus === 0) {
    return {
      status: 'ready',
      targetUrl: APPLY_SIGN,
      reason: 'not_signed',
      restoredSession: true
    }
  }

  // 审核中 → 进入签约状态页
  if (signStatus === 1) {
    return {
      status: 'ready',
      targetUrl: APPLY_SIGN,
      reason: 'sign_pending',
      restoredSession: true
    }
  }

  // 已拒绝 → 进入签约状态页
  if (signStatus === -1) {
    return {
      status: 'ready',
      targetUrl: APPLY_SIGN,
      reason: 'sign_rejected',
      restoredSession: true
    }
  }

  // 已签约 (signStatus === 2) → 首页
  if (signStatus === 2) {
    return {
      status: 'ready',
      targetUrl: _getSafeDeepLink() || HOME,
      reason: 'authenticated',
      restoredSession: true
    }
  }

  // 未知的 signStatus 值 → 错误
  console.error('[Bootstrap] unknown signStatus:', signStatus)
  return {
    status: 'error',
    targetUrl: null,
    reason: 'unknown_sign_status',
    error: new AppError('未知的签约状态', ErrorKind.BUSINESS),
    restoredSession: false
  }
}

/**
 * 处理启动错误
 * @private
 */
function _handleBootError(error) {
  const userStore = useUserStore()

  // 401 → Token 失效，清理登录态，返回 LOGIN
  if (error instanceof AppError && error.kind === ErrorKind.AUTH) {
    userStore.logout()
    return {
      status: 'ready',
      targetUrl: _getSafeLoginUrl(),
      reason: 'token_expired',
      restoredSession: false
    }
  }

  // 启动阶段业务错误（如：经销商账号不存在 NOT_FOUND）
  // 说明 Token 对应用户已被删除/注销，清理登录态并跳转登录页
  if (error instanceof AppError && error.kind === ErrorKind.BUSINESS) {
    const errorCode = error.errorCode || error.code
    const isUserNotFound = errorCode === 'NOT_FOUND' ||
      (error.message && error.message.includes('不存在'))
    if (isUserNotFound) {
      userStore.logout()
      return {
        status: 'ready',
        targetUrl: _getSafeLoginUrl(),
        reason: 'user_not_found',
        restoredSession: false
      }
    }
  }

  // 网络错误/超时
  if (error instanceof AppError &&
    (error.kind === ErrorKind.NETWORK || error.kind === ErrorKind.TIMEOUT)) {
    return {
      status: 'offline',
      targetUrl: null,
      reason: 'network_error',
      error: error,
      restoredSession: false
    }
  }

  // 默认错误
  return {
    status: 'error',
    targetUrl: null,
    reason: 'boot_error',
    error: error,
    restoredSession: false
  }
}

/**
 * 规范化语言设置
 * @private
 */
function _normalizeLanguage() {
  const supported = ['zh-CN', 'en-US']
  const current = storage.get('language', 'zh-CN')

  if (!supported.includes(current)) {
    storage.set('language', 'zh-CN')
  }
}

/**
 * 获取带回跳参数的登录 URL（安全校验）
 * @private
 */
function _getSafeLoginUrl() {
  // 这里可以加入深链恢复逻辑
  return LOGIN
}

/**
 * 获取安全的深链目标
 * @private
 */
function _getSafeDeepLink() {
  // TODO: 实现深链恢复逻辑
  // 仅允许跳转到 pages.json 中已注册的应用内路径
  return null
}

/**
 * 重置启动状态（用于用户点击重试时）
 * 注意：不制造并行请求，只清理状态
 */
export function resetBootstrapState() {
  _bootPromise = null
  _isBootstrapped = false
  _cachedResult = null
  _currentRequestTask = null
}

/**
 * 检查启动是否已完成
 * @returns {boolean}
 */
export function isBootstrapped() {
  return _isBootstrapped
}

// ==================== 类型定义（JSDoc）====================

/**
 * @typedef {Object} BootstrapResult
 * @property {'ready'|'force-update'|'offline'|'error'} status - 启动状态
 * @property {string|null} targetUrl - 跳转目标路由
 * @property {string} reason - 状态原因
 * @property {boolean} restoredSession - 是否恢复了会话
 * @property {AppError|*} [error] - 错误对象（如果发生错误）
 * @property {Object} [updateInfo] - 版本更新信息（force-update 时）
 */
