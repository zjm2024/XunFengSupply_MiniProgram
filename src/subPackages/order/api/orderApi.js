/**
 * 订单相关接口 - 下单、列表、详情、取消、物流、确认收货
 *
 * 后端映射：
 *   Module: MallOrder
 *   - Mini.OrderController     → PreviewOrder / CreateOrder / CancelOrder / GetOrderList / GetOrderDetail / GetOrderCounts / ConfirmReceipt / GetLogistics
 *
 * 约定：
 * - 本文件所有公开方法接收 camelCase 领域对象
 * - 本文件负责转换为后端 PascalCase DTO
 * - 响应统一转换为 camelCase 领域模型
 */
import { dispatch } from '../../../shared/api/dispatchClient.js'

// ==================== 内部工具函数 ====================

/**
 * 数值安全解析
 * @param {*} value
 * @param {number} [fallback=0]
 * @returns {number}
 */
function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * 将后端 PascalCase Order 响应转换为前端 camelCase 领域模型
 * @param {Object} order
 * @returns {Object}
 */
function normalizeOrder(order = {}) {
  if (!order || typeof order !== 'object') return order
  return {
    ...order,
    orderId: order.orderId ?? order.OrderId,
    orderNo: order.orderNo ?? order.OrderNo,
    orderStatus: order.orderStatus ?? order.OrderStatus,
    payableAmount: number(order.payableAmount ?? order.PayableAmount),
    paymentMode: order.paymentMode ?? order.PaymentMode,
    deliveryType: order.deliveryType ?? order.DeliveryType,
    customerRemark: order.customerRemark ?? order.CustomerRemark,
    createdTime: order.createdTime ?? order.CreatedTime,
    itemCount: number(order.itemCount ?? order.ItemCount),
    totalQuantity: number(order.totalQuantity ?? order.TotalQuantity),
    totalAmount: number(order.totalAmount ?? order.TotalAmount),
  }
}

/**
 * 将 camelCase 领域对象转换为 PascalCase Items 数组
 * @param {Array<{skuId: number, quantity: number}>} items
 * @returns {Array<{SkuId: number, Quantity: number}>}
 */
function toPascalCaseItems(items = []) {
  return items
    .filter(item => item && (item.skuId || item.SkuId))
    .map(item => {
      const skuId = Number(item.skuId ?? item.SkuId)
      const rawQty = Number(item.quantity ?? item.Quantity) || 1
      return { SkuId: skuId, Quantity: Math.max(1, rawQty) }
    })
}

/**
 * 预览订单参数转换
 * @param {Object} params - camelCase 参数
 * @returns {Object} PascalCase 参数
 */
function toPreviewOrderPayload(params = {}) {
  return {
    Items: toPascalCaseItems(params.items),
    AddressId: params.addressId ?? params.AddressId ?? null,
    DeliveryType: params.deliveryType ?? params.DeliveryType ?? null,
  }
}

/**
 * 创建订单参数转换
 * @param {Object} params - camelCase 参数
 * @returns {Object} PascalCase 参数
 */
function toCreateOrderPayload(params = {}) {
  return {
    ClientRequestId: params.clientRequestId ?? params.ClientRequestId,
    Items: toPascalCaseItems(params.items),
    AddressId: params.addressId ?? params.AddressId ?? null,
    PaymentMode: params.paymentMode ?? params.PaymentMode ?? null,
    DeliveryType: params.deliveryType ?? params.DeliveryType ?? null,
    CustomerRemark: params.customerRemark ?? params.CustomerRemark ?? null,
  }
}

/**
 * 取消订单参数转换
 * @param {Object} params - camelCase 参数
 * @returns {Object} PascalCase 参数
 */
function toCancelOrderPayload(params = {}) {
  return {
    OrderId: params.orderId ?? params.OrderId,
    ClientRequestId: params.clientRequestId ?? params.ClientRequestId,
    ReasonCode: params.reasonCode ?? params.ReasonCode ?? null,
    Reason: params.reason ?? params.Reason ?? null,
  }
}

/**
 * 确认收货参数转换
 * @param {Object} params - camelCase 参数
 * @returns {Object} PascalCase 参数
 */
function toConfirmReceiptPayload(params = {}) {
  return {
    OrderId: params.orderId ?? params.OrderId,
    ClientRequestId: params.clientRequestId ?? params.ClientRequestId,
  }
}

// ==================== API 方法 ====================

/**
 * 预览订单（服务端重算，不落正式订单）
 * @param {Object} params - camelCase 领域参数
 * @param {Array<{skuId:number, quantity:number}>} params.items - SKU 明细
 * @param {number} [params.addressId] - 收货地址ID
 * @param {number} [params.deliveryType] - 配送方式：1物流 2自提
 * @returns {Promise<Object>} 预览结果含商品明细、金额、库存校验
 */
export function previewOrder(params = {}) {
  return dispatch('MallOrder', 'Mini.OrderController', 'PreviewOrder', toPreviewOrderPayload(params))
    .then(result => {
      if (!result) return result
      return {
        ...result,
        items: Array.isArray(result.items) ? result.items.map(normalizeOrder) :
                Array.isArray(result.Items) ? result.Items.map(normalizeOrder) : [],
      }
    })
}

/**
 * 创建订单（含幂等键、服务端重算、快照保存）
 * @param {Object} params - camelCase 领域参数
 * @param {string} params.clientRequestId - 客户端请求ID（幂等键，必须由客户端生成）
 * @param {Array<{skuId:number, quantity:number}>} params.items - SKU 明细
 * @param {number} [params.addressId] - 收货地址ID
 * @param {number} [params.paymentMode] - 结算模式：1现款 2授信
 * @param {number} [params.deliveryType] - 配送方式：1物流 2自提
 * @param {string} [params.customerRemark] - 客户备注
 * @returns {Promise<{orderId:number, orderNo:string, payableAmount:number, orderStatus:number, idempotent:boolean}>}
 */
export function createOrder(params = {}) {
  return dispatch('MallOrder', 'Mini.OrderController', 'CreateOrder', toCreateOrderPayload(params))
    .then(result => (result ? normalizeOrder(result) : result))
}

// ==================== 订单列表与详情 ====================

/**
 * 获取订单列表（分页，支持状态筛选）
 * @param {Object} params - camelCase 领域参数
 * @param {number} [params.orderStatus] - 订单状态筛选
 * @param {string} [params.keyword] - 关键字搜索（订单号）
 * @param {number} [params.pageNum=1] - 页码
 * @param {number} [params.pageSize=10] - 每页条数
 * @param {string} [params.startTime] - 开始时间
 * @param {string} [params.endTime] - 结束时间
 * @returns {Promise<{items:Array, totalCount:number, pageNum:number, pageSize:number, totalPages:number}>}
 */
export function getOrderList(params = {}) {
  const source = params || {}
  return dispatch('MallOrder', 'Mini.OrderController', 'GetOrderList', {
    OrderStatus: source.orderStatus ?? source.OrderStatus ?? null,
    Keyword: source.keyword ?? source.Keyword ?? null,
    PageNum: source.pageNum ?? source.PageNum ?? source.pageIndex ?? source.PageIndex ?? source.page ?? 1,
    PageSize: source.pageSize ?? source.PageSize ?? 20,
    StartTime: source.startTime ?? source.StartTime ?? null,
    EndTime: source.endTime ?? source.EndTime ?? null,
  }).then(result => {
    if (!result) return { items: [], totalCount: 0, pageNum: 1, pageSize: 20, totalPages: 0 }
    const items = Array.isArray(result.items) ? result.items :
                  Array.isArray(result.Items) ? result.Items : []
    return {
      ...result,
      items: items.map(normalizeOrder),
      totalCount: number(result.totalCount ?? result.TotalCount, items.length),
      pageNum: number(result.pageNum ?? result.PageNum ?? 1, 1),
      pageSize: number(result.pageSize ?? result.PageSize, 20),
      totalPages: number(result.totalPages ?? result.TotalPages, 0),
    }
  })
}

/**
 * 获取订单详情（含归属校验）
 * @param {number} orderId - 订单ID
 * @returns {Promise<Object>} 订单详情含明细、状态日志、发货信息、可执行操作
 */
export function getOrderDetail(orderId) {
  const id = Number(orderId)
  return dispatch('MallOrder', 'Mini.OrderController', 'GetOrderDetail', { OrderId: id })
    .then(result => (result ? normalizeOrder(result) : result))
}

/**
 * 获取各状态订单数量统计
 * @returns {Promise<Object>} 各状态订单数量
 */
export function getOrderCounts() {
  return dispatch('MallOrder', 'Mini.OrderController', 'GetOrderCounts', {})
    .then(result => {
      if (!result) return {}
      return {
        ...result,
        allCount: number(result.allCount ?? result.AllCount),
        pendingReviewCount: number(result.pendingReviewCount ?? result.PendingReviewCount),
        pendingPaymentCount: number(result.pendingPaymentCount ?? result.PendingPaymentCount),
        processingCount: number(result.processingCount ?? result.ProcessingCount),
        shippedCount: number(result.shippedCount ?? result.ShippedCount),
        completedCount: number(result.completedCount ?? result.CompletedCount),
        cancelledCount: number(result.cancelledCount ?? result.CancelledCount),
      }
    })
}

// ==================== 订单操作 ====================

/**
 * 取消订单（待审核/待付款状态可取消）
 * @param {Object} params - camelCase 领域参数
 * @param {number} params.orderId - 订单ID
 * @param {string} params.clientRequestId - 客户端请求ID（幂等键）
 * @param {string} [params.reasonCode] - 取消原因代码
 * @param {string} [params.reason] - 取消原因
 * @returns {Promise<boolean>}
 */
export function cancelOrder(params = {}) {
  return dispatch('MallOrder', 'Mini.OrderController', 'CancelOrder', toCancelOrderPayload(params))
}

/**
 * 确认收货
 * @param {Object} params - camelCase 领域参数
 * @param {number} params.orderId - 订单ID
 * @param {string} [params.clientRequestId] - 客户端请求ID（幂等键）
 * @returns {Promise<boolean>}
 */
export function confirmReceipt(params = {}) {
  return dispatch('MallOrder', 'Mini.OrderController', 'ConfirmReceipt', toConfirmReceiptPayload(params))
}

// ==================== 物流查询 ====================

/**
 * 获取订单物流信息
 * @param {number} orderId - 订单ID
 * @returns {Promise<Array<Object>>} 发货信息列表
 */
export function getOrderLogistics(orderId) {
  const id = Number(orderId)
  return dispatch('MallOrder', 'Mini.OrderController', 'GetLogistics', { OrderId: id })
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
