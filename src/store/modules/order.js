/**
 * 订单状态管理 - 当前待付款订单缓存
 * 对应业务流程节点：
 * 1. 购物车&下单结算 → 缓存待付款订单避免重复提交
 * 2. 订单履约发货 → 订单详情缓存
 */

import { defineStore } from 'pinia'
import { ORDER_STATUS } from '../../config/constant.js'

export const useOrderStore = defineStore('order', {
  state: () => ({
    // 待付款订单缓存（用于支付页面恢复）
    pendingPaymentOrder: null,

    // 当前正在查看的订单详情缓存
    currentOrderDetail: null,

    // 各状态订单数量统计（与后端 OrderCountsDto 对齐）
    orderCounts: {
      allCount: 0,
      pendingReviewCount: 0,
      pendingPaymentCount: 0,
      processingCount: 0,
      shippedCount: 0,
      completedCount: 0,
      cancelledCount: 0,
    },

    // 加载状态
    loading: false
  }),

  getters: {
    // 是否有待付款订单（订单状态为待支付）
    hasPendingPayment: (state) =>
      state.pendingPaymentOrder !== null &&
      state.pendingPaymentOrder.orderStatus === ORDER_STATUS.PENDING_PAYMENT,

    // 待付款订单ID
    pendingOrderId: (state) =>
      state.pendingPaymentOrder ? state.pendingPaymentOrder.orderId : null,

    // 待付款金额格式化（后端金额为元，直接格式化）
    pendingPaymentAmount: (state) => {
      if (!state.pendingPaymentOrder) return '¥0.00'
      const amount = state.pendingPaymentOrder.payableAmount || 0
      return `¥${Number(amount).toFixed(2)}`
    },
  },

  actions: {
    /**
     * 缓存待付款订单
     * @param {Object} order - 订单信息
     */
    setPendingPaymentOrder(order) {
      this.pendingPaymentOrder = order
    },

    /**
     * 清除待付款订单缓存（支付成功或取消后调用）
     */
    clearPendingPaymentOrder() {
      this.pendingPaymentOrder = null
    },

    /**
     * 更新待付款订单状态（如过期等）
     * @param {Object} updates - 要更新的字段
     */
    updatePendingOrder(updates) {
      if (this.pendingPaymentOrder) {
        this.pendingPaymentOrder = { ...this.pendingPaymentOrder, ...updates }
      }
    },

    /**
     * 缓存当前查看的订单详情
     * @param {Object} detail - 订单详情
     */
    setCurrentOrderDetail(detail) {
      this.currentOrderDetail = detail
    },

    /**
     * 清除当前订单详情缓存
     */
    clearCurrentOrderDetail() {
      this.currentOrderDetail = null
    },

    /**
     * 设置各状态订单数量（与后端 OrderCountsDto 对齐）
     * @param {Object} counts - 数量统计对象
     */
    setOrderCounts(counts) {
      this.orderCounts = { ...this.orderCounts, ...counts }
    },

    /**
     * 设置加载状态
     * @param {boolean} loading
     */
    setLoading(loading) {
      this.loading = loading
    }
  }
})
