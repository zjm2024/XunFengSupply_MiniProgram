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
    const msg = err?.errMsg || '网络连接失败'
    const isTimeout = msg.includes('timeout')
    const isCancel = msg.includes('cancel')

    if (isCancel) {
      return new AppError('请求已取消', ErrorKind.CANCELLED, { cause: err })
    }
    if (isTimeout) {
      return new AppError('请求超时，请稍后重试', ErrorKind.TIMEOUT, { retryable: true, cause: err })
    }
    return new AppError('网络连接失败，请检查网络', ErrorKind.NETWORK, { retryable: true, cause: err })
  }

  /**
   * 静态工厂：从 HTTP 响应创建
   * @param {number} statusCode
   * @param {*} data
   * @returns {AppError}
   */
  static fromHttpStatus(statusCode, data) {
    const serverMessage = data?.message
    const serverErrorCode = data?.errorCode
    const traceId = data?.traceId

    switch (statusCode) {
      case 401:
        return new AppError(serverMessage || '登录已过期，请重新登录', ErrorKind.AUTH, {
          httpStatus: statusCode,
          code: 401,
          errorCode: serverErrorCode,
          traceId,
          retryable: false,
        })
      case 403:
        // 区分冻结和普通权限不足需要根据业务码判断
        return new AppError(serverMessage || '无权限访问', ErrorKind.PERMISSION, {
          httpStatus: statusCode,
          code: 403,
          errorCode: serverErrorCode,
          traceId,
          retryable: false,
        })
      case 400:
      case 409:
      case 422:
        return new AppError(serverMessage || '请求参数或业务状态不正确', ErrorKind.BUSINESS, {
          httpStatus: statusCode,
          code: data?.code ?? statusCode,
          errorCode: serverErrorCode,
          traceId,
          retryable: false,
        })
      case 404:
        return new AppError(serverMessage || '请求的资源不存在', serverErrorCode ? ErrorKind.BUSINESS : ErrorKind.HTTP, {
          httpStatus: statusCode,
          code: data?.code ?? 404,
          errorCode: serverErrorCode,
          traceId,
          retryable: false,
        })
      case 429:
        return new AppError(serverMessage || '操作过于频繁，请稍后再试', ErrorKind.HTTP, {
          httpStatus: statusCode,
          code: data?.code ?? 429,
          errorCode: serverErrorCode,
          traceId,
          retryable: true,
        })
      default:
        if (statusCode >= 500) {
          return new AppError('服务器繁忙，请稍后重试', ErrorKind.HTTP, {
            httpStatus: statusCode,
            code: statusCode,
            retryable: true,
          })
        }
        return new AppError(`请求失败(${statusCode})`, ErrorKind.HTTP, {
          httpStatus: statusCode,
          code: statusCode,
          retryable: false,
        })
    }
  }

  /**
   * 静态工厂：从业务响应创建
   * @param {*} responseData - 后端返回的完整响应
   * @returns {AppError}
   */
  static fromBusinessResponse(responseData) {
    const code = responseData?.code
    const message = responseData?.message || '操作失败'
    const traceId = responseData?.traceId

    // 认证相关
    if (code === 401) {
      return new AppError(message || '登录已过期', ErrorKind.AUTH, {
        code,
        traceId,
        retryable: false,
      })
    }

    // 权限/冻结 - 需要进一步区分
    if (code === 403) {
      return new AppError(message || '无权限访问', ErrorKind.PERMISSION, {
        code,
        traceId,
        retryable: false,
      })
    }

    // 其他业务错误
    return new AppError(message, ErrorKind.BUSINESS, {
      code,
      errorCode: responseData?.errorCode,
      traceId,
      retryable: false,
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
export function getErrorMessage(error, fallback = '操作失败') {
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
