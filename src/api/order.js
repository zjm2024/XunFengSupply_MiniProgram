/**
 * 订单相关接口 - 下单、列表、详情、取消、物流、确认收货
 *
 * 所有接口走统一 /api/dispatch 动态调度。
 *
 * 后端映射：
 *   Module: MallOrder
 *   - Mini.OrderController     → PreviewOrder / CreateOrder / CancelOrder / GetOrderDetail / GetOrderList / GetOrderCounts / ConfirmReceipt / GetLogistics
 *   - Mini.LogisticsController → GetLogistics（兼容旧调用）
 *
 * ⚠️ 参数由页面层构建 PascalCase 实体，API 层直接透传
 */

import { dispatch } from './base.js'

// ==================== 预览与下单 ====================

/**
 * 预览订单（服务端重算，不落正式订单）
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {Array<{SkuId:number, Quantity:number}>} params.Items - SKU 明细
 * @param {number} [params.AddressId] - 收货地址ID
 * @param {number} [params.DeliveryType] - 配送方式：1物流 2自提
 * @returns {Promise<Object>} 预览结果含商品明细、金额、库存校验
 */
export function previewOrder(params) {
  return dispatch('MallOrder', 'Mini.OrderController', 'PreviewOrder', params)
}

/**
 * 创建订单（含幂等键、服务端重算、快照保存）
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {string} params.ClientRequestId - 客户端请求ID（幂等键，必须由客户端生成）
 * @param {Array<{SkuId:number, Quantity:number}>} params.Items - SKU 明细
 * @param {number} [params.AddressId] - 收货地址ID
 * @param {number} [params.PaymentMode] - 结算模式：1现款 2授信
 * @param {number} [params.DeliveryType] - 配送方式：1物流 2自提
 * @param {string} [params.CustomerRemark] - 客户备注
 * @returns {Promise<{orderId:number, orderNo:string, payableAmount:number, orderStatus:number, idempotent:boolean}>}
 */
export function createOrder(params) {
  return dispatch('MallOrder', 'Mini.OrderController', 'CreateOrder', params)
}

// ==================== 订单列表与详情 ====================

/**
 * 获取订单列表（分页，支持状态筛选）
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {number} [params.OrderStatus] - 订单状态筛选
 * @param {string} [params.Keyword] - 关键字搜索（订单号）
 * @param {number} [params.PageNum=1] - 页码
 * @param {number} [params.PageSize=10] - 每页条数
 * @param {string} [params.StartTime] - 开始时间
 * @param {string} [params.EndTime] - 结束时间
 * @returns {Promise<{items:Array, totalCount:number, pageNum:number, pageSize:number, totalPages:number}>}
 */
export function getOrderList(params) {
  const source = params || {}
  return dispatch('MallOrder', 'Mini.OrderController', 'GetOrderList', {
    orderStatus: source.orderStatus ?? source.OrderStatus ?? null,
    keyword: source.keyword ?? source.Keyword ?? null,
    pageNum: source.pageNum ?? source.PageNum ?? source.pageIndex ?? source.PageIndex ?? source.page ?? 1,
    pageSize: source.pageSize ?? source.PageSize ?? 20,
    startTime: source.startTime ?? source.StartTime ?? null,
    endTime: source.endTime ?? source.EndTime ?? null,
  })
}

/**
 * 获取订单详情（含归属校验）
 * @param {number} orderId - 订单ID
 * @returns {Promise<Object>} 订单详情含明细、状态日志、发货信息、可执行操作
 */
export function getOrderDetail(orderId) {
  return dispatch('MallOrder', 'Mini.OrderController', 'GetOrderDetail', { orderId })
}

/**
 * 获取各状态订单数量统计
 * @returns {Promise<Object>} 各状态订单数量
 */
export function getOrderCounts() {
  return dispatch('MallOrder', 'Mini.OrderController', 'GetOrderCounts', {})
}

// ==================== 订单操作 ====================

/**
 * 取消订单（待审核/待付款状态可取消）
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {number} params.OrderId - 订单ID
 * @param {string} params.ClientRequestId - 客户端请求ID（幂等键）
 * @param {string} [params.ReasonCode] - 取消原因代码
 * @param {string} [params.Reason] - 取消原因
 * @returns {Promise<boolean>}
 */
export function cancelOrder(params) {
  return dispatch('MallOrder', 'Mini.OrderController', 'CancelOrder', params)
}

/**
 * 确认收货
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {number} params.OrderId - 订单ID
 * @param {string} [params.ClientRequestId] - 客户端请求ID（幂等键）
 * @returns {Promise<boolean>}
 */
export function confirmReceipt(params) {
  return dispatch('MallOrder', 'Mini.OrderController', 'ConfirmReceipt', params)
}

// ==================== 物流查询 ====================

/**
 * 获取订单物流信息
 * @param {number} orderId - 订单ID
 * @returns {Promise<Array<Object>>} 发货信息列表
 */
export function getOrderLogistics(orderId) {
  return dispatch('MallOrder', 'Mini.OrderController', 'GetLogistics', { orderId })
}

/**
 * 生成幂等键（客户端请求ID）
 * 格式：mini-{timestamp}-{random}
 * @returns {string}
 */
export function generateClientRequestId() {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `mini-${timestamp}-${random}`
}
