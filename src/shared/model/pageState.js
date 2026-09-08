/**
 * @file 页面状态枚举与常量
 * @description
 * 统一页面数据加载状态，避免用 data.length === 0 同时推断"空"和"失败"
 *
 * 状态流转：
 *   idle → loading → content | empty | error
 *   content → refreshing → content | error (保留旧内容 = hasStaleContent)
 *   content → loadingMore → content | error (分页追加失败)
 *   any → offline (网络断开)
 */

// ==================== 页面状态枚举 ====================

/** @enum {string} */
export const PageStatus = {
  /** 空闲 - 未开始加载 */
  IDLE: 'idle',
  /** 加载中 - 首屏加载（显示骨架屏） */
  LOADING: 'loading',
  /** 有内容 - 正常状态 */
  CONTENT: 'content',
  /** 空数据 - 请求成功但无数据 */
  EMPTY: 'empty',
  /** 错误 - 请求失败 */
  ERROR: 'error',
  /** 离线 - 网络不可用 */
  OFFLINE: 'offline',
}

// ==================== 状态查询辅助函数 ====================

/**
 * 是否为加载中状态（首屏或刷新）
 * @param {string} status
 * @returns {boolean}
 */
export function isLoading(status) {
  return status === PageStatus.LOADING
}

/**
 * 是否为可交互状态（有内容或空数据）
 * @param {string} status
 * @returns {boolean}
 */
export function isInteractive(status) {
  return status === PageStatus.CONTENT || status === PageStatus.EMPTY
}

/**
 * 是否为终端状态（不需要进一步操作）
 * @param {string} status
 * @returns {boolean}
 */
export function isTerminal(status) {
  return status === PageStatus.CONTENT || status === PageStatus.EMPTY || status === PageStatus.OFFLINE
}

/**
 * 是否为错误状态（可重试）
 * @param {string} status
 * @returns {boolean}
 */
export function isError(status) {
  return status === PageStatus.ERROR
}

// ==================== 默认文案配置 ====================

/** 各状态的默认展示文案 */
export const DEFAULT_MESSAGES = {
  [PageStatus.EMPTY]: {
    title: '暂无数据',
    description: '当前没有相关内容',
    actionText: '重新加载',
  },
  [PageStatus.ERROR]: {
    title: '加载失败',
    description: '网络异常，请检查后重试',
    actionText: '点击重试',
  },
  [PageStatus.OFFLINE]: {
    title: '网络不可用',
    description: '请检查网络连接后重试',
    actionText: '重试',
  },
}

// ==================== 空状态类型图标映射 ====================

/**
 * 空状态场景类型
 * 用于选择对应的空状态插图/图标
 */
export const EmptyType = {
  /** 通用 */
  DEFAULT: 'default',
  /** 购物车 */
  CART: 'cart',
  /** 订单 */
  ORDER: 'order',
  /** 消息/通知 */
  MESSAGE: 'message',
  /** 搜索结果 */
  SEARCH: 'search',
  /** 商品列表 */
  PRODUCT: 'product',
  /** 收藏 */
  FAVORITE: 'favorite',
  /** 地址 */
  ADDRESS: 'address',
  /** 优惠券/代金券 */
  VOUCHER: 'voucher',
}
