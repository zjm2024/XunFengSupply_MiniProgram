/**
 * @file 统一网络请求模块 - 唯一请求入口
 * @description
 * 所有接口调用统一通过此模块发起。
 *
 * 核心能力：
 * 1. 唯一 dispatch() 入口，走 /api/dispatch 动态调度
 * 2. 标准 AppError 错误对象
 * 3. 401 single-flight：并发401只处理一次
 * 4. Loading 引用计数：避免并发请求提前关闭
 * 5. 统一 Token 注入、请求头、错误分类
 * 6. 401 登录态统一清理（当前 Mini 后端未提供 RefreshToken 端点）
 * 7. authStrategy 支持：auto（默认）| passive
 *
 * ⚠️ 这是唯一的请求实现。utils/request.js 已废弃，请勿使用。
 */

import { AppError, ErrorKind } from './appError.js'
import { useUserStore } from '../session/userStore.js'

// ==================== 配置 ====================

/** 基础域名 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

/** 统一调度入口 */
const DISPATCH_URL = import.meta.env.VITE_DISPATCH_URL || ''

/** 默认超时时间(ms) */
const DEFAULT_TIMEOUT = 30000

/** 无需 Token 的公开方法名白名单 */
const PUBLIC_METHODS = new Set([
  'Login',
  'AutoLogin',
])

// ==================== Loading 引用计数 ====================

let _loadingCount = 0

function _showLoading(text = '加载中...') {
  if (_loadingCount === 0) {
    uni.showLoading({ title: text, mask: true })
  }
  _loadingCount++
}

function _hideLoading() {
  _loadingCount--
  if (_loadingCount <= 0) {
    _loadingCount = 0
    uni.hideLoading()
  }
}

// ==================== 401 处理 ====================

/** 并发 401 只执行一次登出清理。 */
let _unauthorizedPromise = null

/**
 * 处理 401 未授权（auto 模式）
 *
 * 处理流程：
 * 当前 XunFeng.Api.Mini 没有 RefreshToken 调度端点。收到 401 后只清理
 * 本地登录态，由路由守卫/页面决定何时进入登录页，禁止请求不存在的
 * Mini.AuthController.RefreshToken。
 *
 * 注意：此函数不执行 uni.reLaunch，不显示弹窗
 * 路由决策由调用方（页面）决定
 *
 * @returns {Promise<boolean>} 固定返回 false（当前不支持无感续期）
 */
async function handleUnauthorized() {
  if (_unauthorizedPromise) return _unauthorizedPromise

  _unauthorizedPromise = (async () => {
    try {
      await useUserStore().logout()
    } catch (e) {
      console.error('[Request] 清理失效登录态失败:', e)
    } finally {
      _unauthorizedPromise = null
    }
    return false
  })()

  return _unauthorizedPromise
}

// ==================== Token 获取 ====================

/**
 * 获取当前 Token
 * @returns {string}
 */
function getToken() {
  const userStore = useUserStore()
  return userStore.token || ''
}

// ==================== 核心请求方法 ====================

/**
 * 核心请求函数
 *
 * @param {Object} config - 请求配置
 * @param {string} config.url - 请求地址
 * @param {'GET'|'POST'|'PUT'|'DELETE'} [config.method='POST'] - 请求方式
 * @param {Object} [config.data={}] - 请求数据
 * @param {Object} [config.header={}] - 自定义请求头
 * @param {boolean} [config.showLoading=false] - 是否显示全局Loading（默认关闭，交给页面骨架）
 * @param {string} [config.loadingText='加载中...'] - Loading文案
 * @param {number} [config.timeout=30000] - 超时时间
 * @param {boolean} [config.rawResponse=false] - 是否返回完整响应（含code/message/traceId）
 * @param {boolean} [config.anonymous=false] - 匿名请求，不读取也不发送 Token
 * @param {'auto'|'passive'} [config.authStrategy='auto'] - 401 处理策略
 *   - auto: 清理失效登录态（不弹窗不跳转）
 *   - passive: 直接 reject AppError(AUTH)，不做任何处理
 * @param {number} [config.retryCount=0] - 当前重试次数（内部使用）
 * @returns {Promise<*>} 业务数据或完整响应（取决于 rawResponse）
 * @throws {AppError} 标准错误对象
 */
export function request(config) {
  const {
    url,
    method = 'POST',
    data = {},
    header = {},
    showLoading: shouldShowLoading = false,
    loadingText = '加载中...',
    timeout = DEFAULT_TIMEOUT,
    rawResponse = false,
    anonymous = false,
    authStrategy = 'auto',
    retryCount = 0,
  } = config

  // Loading 引用计数
  if (shouldShowLoading) {
    _showLoading(loadingText)
  }

  // 构建完整URL
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`

  // 合并请求头
  const token = anonymous ? '' : getToken()
  const mergeHeader = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...header,
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method,
      data,
      header: mergeHeader,
      timeout,

      success(res) {
        const { statusCode, data: responseData } = res

        // HTTP 层成功 (2xx)
        if (statusCode >= 200 && statusCode < 300) {
          /** @type {{ code: number, message?: string, data?: any, traceId?: string }} */
          const result = responseData || {}

          // 业务码判断：200-299 为成功
          if (result.code >= 200 && result.code < 300) {
            // 默认返回 data 字段；rawResponse 时返回完整响应
            resolve(rawResponse ? result : (result.data !== undefined ? result.data : result))
            return
          }

          // 业务码 401
          if (result.code === 401) {
            if (authStrategy === 'passive') {
              // passive 模式：直接 reject，不做任何处理
              reject(AppError.fromBusinessResponse(result))
            } else {
              // auto 模式：异步清理失效登录态
              handleUnauthorized()
              reject(AppError.fromBusinessResponse(result))
            }
            return
          }

          // 业务码 403 → 权限/冻结
          if (result.code === 403) {
            reject(AppError.fromBusinessResponse(result))
            return
          }

          // 其他业务错误
          reject(AppError.fromBusinessResponse(result))
          return
        }

        // HTTP 401
        if (statusCode === 401) {
          if (authStrategy === 'passive') {
            // passive 模式：直接 reject，不做任何处理
            reject(AppError.fromHttpStatus(statusCode, responseData))
          } else {
            // auto 模式：异步清理失效登录态
            handleUnauthorized()
            reject(AppError.fromHttpStatus(statusCode, responseData))
          }
          return
        }

        // HTTP 403
        if (statusCode === 403) {
          reject(AppError.fromHttpStatus(statusCode, responseData))
          return
        }

        // HTTP 5xx / 其他
        reject(AppError.fromHttpStatus(statusCode, responseData))
      },

      fail(err) {
        reject(AppError.fromUniFail(err))
      },

      complete() {
        if (shouldShowLoading) {
          _hideLoading()
        }
      },
    })
  })
}

// ============================================
// 核心 API：dispatch 动态调度请求
// ============================================

/**
 * 统一动态调度请求函数
 *
 * @param {string} module - 模块名（如 MallDealer、MallProduct）
 * @param {string} className - 控制器类名（含 Mini. 前缀）
 * @param {string} method - 方法名（如 Login）
 * @param {Object} [params={}] - 方法参数
 * @param {Object} [options={}] - 额外选项
 * @param {boolean} [options.showLoading=false] - 是否显示Loading
 * @param {string} [options.loadingText] - Loading文案
 * @param {number} [options.timeout] - 超时
 * @param {boolean} [options.rawResponse=false] - 返回完整响应
 * @param {boolean} [options.anonymous=false] - 匿名接口，不携带 Authorization
 * @param {'auto'|'passive'} [options.authStrategy='auto'] - 401 处理策略
 * @returns {Promise<*>} 业务数据
 * @throws {AppError}
 *
 * @example
 * // 登录（公开接口，不需要Token）
 * const res = await dispatch('MallDealer', 'Mini.LoginController', 'Login', { username, password })
 *
 * // 获取商品列表（需要Token）
 * const list = await dispatch('MallProduct', 'Mini.ProductController', 'GetProductList', { pageNum, pageSize })
 *
 * // 启动阶段使用 passive 模式
 * const ctx = await dispatch('MallDealer', 'Mini.ProfileController', 'GetBootstrapContext', {}, { authStrategy: 'passive' })
 */
export async function dispatch(module, className, method, params = {}, options = {}) {
  const isPublic = options.anonymous === true || PUBLIC_METHODS.has(method)

  return request({
    url: DISPATCH_URL,
    method: 'POST',
    data: { module, class: className, method, params },
    showLoading: options.showLoading ?? false,
    loadingText: options.loadingText || '加载中...',
    timeout: options.timeout || DEFAULT_TIMEOUT,
    rawResponse: options.rawResponse || false,
    authStrategy: options.authStrategy || 'auto',
    // 公开接口完全不读取/发送 Authorization，避免空 Bearer 头干扰认证中间件。
    anonymous: isPublic,
  })
}

// ============================================
// 快捷方法（保留用于非 dispatch 的简单接口）
// ============================================

/**
 * GET 请求
 * @param {string} url
 * @param {Object} [params={}]
 * @param {Object} [options={}]
 * @returns {Promise<*>}
 */
export function get(url, params = {}, options = {}) {
  return request({ url, method: 'GET', data: params, ...options })
}

/**
 * POST 请求
 * @param {string} url
 * @param {Object} [data={}]
 * @param {Object} [options={}]
 * @returns {Promise<*>}
 */
export function post(url, data = {}, options = {}) {
  return request({ url, method: 'POST', data, ...options })
}

/**
 * PUT 请求
 * @param {string} url
 * @param {Object} [data={}]
 * @param {Object} [options={}]
 * @returns {Promise<*>}
 */
export function put(url, data = {}, options = {}) {
  return request({ url, method: 'PUT', data, ...options })
}

/**
 * DELETE 请求
 * @param {string} url
 * @param {Object} [params={}]
 * @param {Object} [options={}]
 * @returns {Promise<*>}
 */
export function del(url, params = {}, options = {}) {
  return request({ url, method: 'DELETE', data: params, ...options })
}

// ============================================
// 文件上传
// ============================================

/**
 * 文件上传
 *
 * @param {Object} config
 * @param {string} config.url - 上传地址
 * @param {string} config.filePath - 文件路径
 * @param {string} [config.name='file'] - 字段名
 * @param {Object} [config.formData={}] - 额外表单数据
 * @param {boolean} [config.showLoading=true] - 是否显示Loading
 * @returns {Promise<*>} 上传结果
 * @throws {AppError}
 */
export function uploadFile(config) {
  const {
    url,
    filePath,
    name = 'file',
    formData = {},
    showLoading: shouldShowLoading = true,
  } = config

  if (shouldShowLoading) {
    _showLoading('上传中...')
  }

  const token = getToken()
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: fullUrl,
      filePath,
      name,
      formData,
      header: token ? { Authorization: `Bearer ${token}` } : {},

      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(res.data)
            if (result.code >= 200 && result.code < 300) {
              resolve(result.data)
            } else {
              reject(AppError.fromBusinessResponse(result))
            }
          } catch (e) {
            reject(new AppError('上传响应解析失败', ErrorKind.UNKNOWN, { cause: e }))
          }
        } else {
          reject(AppError.fromHttpStatus(res.statusCode, null))
        }
      },

      fail(err) {
        reject(AppError.fromUniFail(err))
      },

      complete() {
        if (shouldShowLoading) {
          _hideLoading()
        }
      },
    })
  })
}

// ============================================
// 导出说明
// ============================================
// 所有函数已通过 export function 直接导出，无需重复 export {}
// 导出列表: request, dispatch, get, post, put, del, uploadFile
