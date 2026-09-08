/**
 * 订单相关常量
 */

/**
 * 订单状态枚举
 */
export const ORDER_STATUS = Object.freeze({
  PENDING_REVIEW: 0,    // 待审核
  PENDING_PAYMENT: 1,   // 待付款
  PROCESSING: 2,        // 处理中（已付款/发货中）
  COMPLETED: 3,         // 已完成
  CANCELLED: 4,         // 已取消
  REFUNDED: 5,          // 已退款
})

/**
 * 订单状态展示映射（用于 StatusTag）
 */
export const ORDER_STATUS_MAP = Object.freeze({
  [ORDER_STATUS.PENDING_REVIEW]: {
    text: '待审核',
    type: 'warning',
  },
  [ORDER_STATUS.PENDING_PAYMENT]: {
    text: '待付款',
    type: 'warning',
  },
  [ORDER_STATUS.PROCESSING]: {
    text: '处理中',
    type: 'info',
  },
  [ORDER_STATUS.COMPLETED]: {
    text: '已完成',
    type: 'success',
  },
  [ORDER_STATUS.CANCELLED]: {
    text: '已取消',
    type: 'default',
  },
  [ORDER_STATUS.REFUNDED]: {
    text: '已退款',
    type: 'default',
  },
})
