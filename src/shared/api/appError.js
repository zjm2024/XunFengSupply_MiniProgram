/**
 * @file 标准错误对象
 * @description
 * 统一错误分类，支持：
 * - 用户友好文案（页面展示）
 * - 诊断信息（日志记录，不暴露给用户）
 * - 错误分类（网络/超时/HTTP/业务/鉴权/权限/冻结/取消/未知）
 *
 * 错误层级：
 *   AppError (顶层)
 *   ├── NetworkError    (网络断开、DNS失败)
 *   ├── TimeoutError    (请求超时)
 *   ├── HttpError       (HTTP状态码错误: 4xx/5xx)
 *   ├── BusinessError   (业务码非成功)
 *   │     ├── AuthError       (401 未授权)
 *   │     ├── PermissionError (403 无权限)
 *   │     └── FrozenError     (账号冻结)
 *   └── CancelError    (请求被取消)
 */

import { t } from '../i18n/index.js'

// ==================== 错误类型枚举 ====================

/** @enum {string} */
export const ErrorKind = {
  /** 网络错误：断开、DNS失败、SSL错误 */
  NETWORK: 'network',
  /** 超时 */
  TIMEOUT: 'timeout',
  /** HTTP 层错误 */
  HTTP: 'http',
  /** 业务逻辑错误（后端返回的业务码） */
  BUSINESS: 'business',
  /** 认证失败 / Token 过期 */
  AUTH: 'auth',
  /** 权限不足 */
  PERMISSION: 'permission',
  /** 账号冻结 */
  FROZEN: 'frozen',
  /** 请求被取消 */
  CANCELLED: 'cancelled',
  /** 未知错误 */
  UNKNOWN: 'unknown',
}

// ==================== AppError 类 ====================

/**
 * 标准应用错误
 *
 * @example
 * // 创建业务错误
 * throw new AppError('库存不足', ErrorKind.BUSINESS, {
 *   code: 'INSUFFICIENT_STOCK',
 *   errorCode: 'STOCK_001',
 *   httpStatus: 200,
 * })
 *
 * // 创建网络错误
 * throw new AppError('网络连接失败', ErrorKind.NETWORK, {
 *   cause: originalError,
 * })
 */
export class AppError extends Error {
  /**
   * @param {string} message - 用户友好的错误消息
   * @param {string} kind - 错误类型
   * @param {Object} [options={}] - 额外信息
   * @param {number} [options.httpStatus] - HTTP状态码
   * @param {string|number} [options.code] - 业务错误码
   * @param {string} [options.errorCode] - 后端错误码
   * @param {string} [options.traceId] - 追踪ID
   * @param {boolean} [options.retryable] - 是否可重试
   * @param {Error} [options.cause] - 原始错误
   */
  constructor(message, kind = ErrorKind.UNKNOWN, options = {}) {
    super(message)
    this.name = 'AppError'

    /** @type {string} 错误分类 */
    this.kind = kind

    /** @type {number|undefined} HTTP状态码 */
    this.httpStatus = options.httpStatus

    /** @type {string|number|undefined} 业务码 */
    this.code = options.code

    /** @type {string|undefined} 后端错误码 */
    this.errorCode = options.errorCode

    /** @type {string|undefined} 追踪ID */
    this.traceId = options.traceId

    /** @type {boolean} 是否可重试 */
    this.retryable = options.retryable ?? this._defaultRetryable()

    /** @type {Error|undefined} 原始错误 */
    this.cause = options.cause

    // 本地错误延迟取词；服务端公开 message 保持原样，不按错误码猜译。
    this.messageKey = options.messageKey
    this.messageParameters = options.messageParameters || {}
    if (this.messageKey) {
      Object.defineProperty(this, 'message', {
        configurable: true,
        get: () => t(this.messageKey, this.messageParameters),
      })
    }
  }

  /**
   * 默认是否可重试
   * @private
   */
  _defaultRetryable() {
    switch (this.kind) {
      case ErrorKind.NETWORK:
      case ErrorKind.TIMEOUT:
      case ErrorKind.HTTP: // 仅5xx可重试，4xx在创建时应显式设为false
        return true
      default:
        return false
    }
  }

  /**
   * 转换为日志用的诊断信息（不包含敏感信息）
   * @returns {Object}
   */
  toLogPayload() {
    return {
      name: this.name,
      kind: this.kind,
      message: this.message,
      httpStatus: this.httpStatus,
      code: this.code,
      errorCode: this.errorCode,
      traceId: this.traceId,
      retryable: this.retryable,
      stack: this.stack,
    }
  }

  /**
   * 静态工厂：从 uni.request fail 回调创建
   * @param {{ errMsg: string }} err
   * @returns {AppError}
   */
  static fromUniFail(err) {
    const msg = err?.errMsg || ''
    const key = msg.includes('cancel') ? 'cancelled' : (msg.includes('timeout') ? 'timeout' : 'network')
    const kind = key === 'cancelled' ? ErrorKind.CANCELLED : (key === 'timeout' ? ErrorKind.TIMEOUT : ErrorKind.NETWORK)
    return new AppError('', kind, { cause: err, messageKey: 'common.errors.' + key,
      retryable: key !== 'cancelled' })
  }

  /**
   * 静态工厂：从 HTTP 响应创建
   * @param {number} statusCode
   * @param {*} data
   * @returns {AppError}
   */
  static fromHttpStatus(statusCode, data) {
    const serverMessage = typeof data?.message === 'string' ? data.message : ''
    const serverErrorCode = data?.errorCode
    const options = {
      httpStatus: statusCode,
      code: [400, 404, 409, 422, 429].includes(statusCode) ? (data?.code ?? statusCode) : statusCode,
      errorCode: serverErrorCode,
      traceId: data?.traceId,
      retryable: statusCode >= 500 || statusCode === 429,
    }
    let kind = ErrorKind.HTTP
    let key = 'http'
    switch (statusCode) {
      case 401: kind = ErrorKind.AUTH; key = 'auth'; break
      case 403: kind = ErrorKind.PERMISSION; key = 'permission'; break
      case 400:
      case 409:
      case 422: kind = ErrorKind.BUSINESS; key = 'validation'; break
      case 404: kind = serverErrorCode ? ErrorKind.BUSINESS : ErrorKind.HTTP; key = 'notFound'; break
      case 429: key = 'rateLimited'; break
      default: if (statusCode >= 500) key = 'server'
    }
    return new AppError(serverMessage, kind, {
      ...options,
      messageKey: serverMessage ? undefined : 'common.errors.' + key,
      messageParameters: { status: statusCode },
    })
  }

  /**
   * 静态工厂：从业务响应创建
   * @param {*} responseData - 后端返回的完整响应
   * @returns {AppError}
   */
  static fromBusinessResponse(responseData) {
    const code = responseData?.code
    const message = typeof responseData?.message === 'string' ? responseData.message : ''
    const kind = code === 401 ? ErrorKind.AUTH : (code === 403 ? ErrorKind.PERMISSION : ErrorKind.BUSINESS)
    const key = code === 401 ? 'auth' : (code === 403 ? 'permission' : 'operation')
    return new AppError(message, kind, {
      code,
      errorCode: responseData?.errorCode,
      traceId: responseData?.traceId,
      retryable: false,
      messageKey: message ? undefined : 'common.errors.' + key,
    })
  }
}

// ==================== 便捷导出 ====================

/** 判断是否为 AppError 实例 */
export function isAppError(error) {
  return error instanceof AppError
}

/**
 * 安全获取用户友好消息
 * @param {Error|AppError|string} error
 * @param {string} [fallback='操作失败']
 * @returns {string}
 */
export function getErrorMessage(error, fallback = t('common.errors.operation')) {
  if (isAppError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message || fallback
  }
  if (typeof error === 'string') {
    return error
  }
  return fallback
}
