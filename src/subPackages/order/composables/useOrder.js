/**
 * 下单、订单流程逻辑组合式函数
 * 对应业务流程节点：
 * 1. 购物车&下单结算 → 预览订单 → 创建订单
 * 2. 订单履约发货 → 取消订单、确认收货
 * 3. 缓存待付款订单避免重复提交（幂等键防重）
 */
import { ref } from 'vue'
import { useOrderStore } from '../model/orderStore.js'
import { useUserStore } from '../../../shared/session/userStore.js'
import {
  previewOrder,
  createOrder,
  cancelOrder,
  confirmReceipt,
  getOrderDetail,
  generateClientRequestId,
} from '../api/orderApi.js'
import { ORDER_STATUS, PAYMENT_MODE } from '../../../app/config/constant.js'

export function useOrder() {
  const orderStore = useOrderStore()
  const userStore = useUserStore()
  const submitting = ref(false)

  /**
   * 预览订单（服务端重算，不落正式订单）
   * @param {Object} params - { items, addressId, deliveryType }
   * @returns {Promise<Object|null>} 预览结果或null
   */
  async function previewOrderInfo(params) {
    try {
      const res = await previewOrder(params)
      return res
    } catch (e) {
      uni.showToast({ title: e.message || '预览订单失败', icon: 'none' })
      return null
    }
  }

  /**
   * 创建订单（含幂等键防重提交）
   * @param {Object} params - { items, addressId, paymentMode, deliveryType, customerRemark }
   * @returns {Promise<Object|null>} 订单信息或null
   */
  async function createNewOrder(params) {
    submitting.value = true

    try {
      // 1. 生成幂等键
      const clientRequestId = generateClientRequestId()

      // 2. 调用创建订单接口
      const res = await createOrder({
        ...params,
        clientRequestId,
      })

      // 3. 缓存待付款订单（仅在待支付状态时）
      if (res.orderStatus === ORDER_STATUS.PENDING_PAYMENT) {
        orderStore.setPendingPaymentOrder({
          orderId: res.orderId,
          orderNo: res.orderNo,
          orderStatus: res.orderStatus,
          payableAmount: res.payableAmount,
          paymentMode: params.paymentMode || PAYMENT_MODE.CASH,
        })
      }

      return res
    } catch (e) {
      uni.showToast({ title: e.message || '创建订单失败', icon: 'none' })
      return null
    } finally {
      submitting.value = false
    }
  }

  /**
   * 取消订单（含幂等键）
   * @param {number} orderId
   * @param {string} [reason] - 取消原因
   * @returns {Promise<boolean>}
   */
  async function cancelCurrentOrder(orderId, reason = '') {
    try {
      await cancelOrder({
        orderId,
        clientRequestId: generateClientRequestId(),
        reason,
      })

      // 清除待付款缓存
      orderStore.clearPendingPaymentOrder()
      uni.showToast({ title: '订单已取消', icon: 'success' })
      return true
    } catch (e) {
      uni.showToast({ title: e.message || '取消失败', icon: 'none' })
      return false
    }
  }

  /**
   * 确认收货（含幂等键）
   * @param {number} orderId
   * @returns {Promise<boolean>}
   */
  async function confirmReceiveOrder(orderId) {
    try {
      await confirmReceipt({
        orderId,
        clientRequestId: generateClientRequestId(),
      })
      uni.showToast({ title: '已确认收货', icon: 'success' })
      return true
    } catch (e) {
      uni.showToast({ title: e.message || '操作失败', icon: 'none' })
      return false
    }
  }

  /**
   * 恢复缓存的待付款订单（支付页使用）
   * @returns {Object|null}
   */
  function restorePendingOrder() {
    return orderStore.pendingPaymentOrder
  }

  /**
   * 清除待付款缓存
   */
  function clearPendingCache() {
    orderStore.clearPendingPaymentOrder()
  }

  /**
   * 检查是否有未完成的待付款订单
   */
  function hasPendingPayment() {
    return orderStore.hasPendingPayment
  }

  return {
    submitting,
    previewOrderInfo,
    createNewOrder,
    cancelCurrentOrder,
    confirmReceiveOrder,
    restorePendingOrder,
    clearPendingCache,
    hasPendingPayment,
  }
}
