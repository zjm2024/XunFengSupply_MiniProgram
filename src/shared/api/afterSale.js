/**
 * 售后相关接口。
 * 页面层统一使用 camelCase，本文件负责与后端 PascalCase DTO 互转。
 */
import { dispatch } from './dispatchClient.js'

const CONTROLLER = 'Mini.AfterSaleController'

function pick(source, camelKey, pascalKey, fallback = undefined) {
  return source?.[camelKey] ?? source?.[pascalKey] ?? fallback
}

function numberOf(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeAfterSaleItem(source = {}) {
  return {
    afterSaleId: numberOf(pick(source, 'afterSaleId', 'AfterSaleId', 0)),
    afterSaleNo: String(pick(source, 'afterSaleNo', 'AfterSaleNo', '') || ''),
    orderId: numberOf(pick(source, 'orderId', 'OrderId', 0)),
    orderNo: String(pick(source, 'orderNo', 'OrderNo', '') || ''),
    sourceType: numberOf(pick(source, 'sourceType', 'SourceType', 0)),
    pricingStatus: numberOf(pick(source, 'pricingStatus', 'PricingStatus', Number(pick(source, 'orderId', 'OrderId', 0)) > 0 ? 1 : 0)),
    workflowVersion: numberOf(pick(source, 'workflowVersion', 'WorkflowVersion', 1)),
    inventoryStatus: numberOf(pick(source, 'inventoryStatus', 'InventoryStatus', 0)),
    erpSubmissionStatus: numberOf(pick(source, 'erpSubmissionStatus', 'ErpSubmissionStatus', 0)),
    erpReviewStatus: numberOf(pick(source, 'erpReviewStatus', 'ErpReviewStatus', 0)),
    receiptStatus: numberOf(pick(source, 'receiptStatus', 'ReceiptStatus', 0)),
    pricingVersion: numberOf(pick(source, 'pricingVersion', 'PricingVersion', 0)),
    afterSaleType: numberOf(pick(source, 'afterSaleType', 'AfterSaleType', 0)),
    status: numberOf(pick(source, 'status', 'Status', 0)),
    statusName: String(pick(source, 'statusName', 'StatusName', '') || ''),
    statusNameEn: String(pick(source, 'statusNameEn', 'StatusNameEn', '') || ''),
    reason: String(pick(source, 'reason', 'Reason', '') || ''),
    refundAmount: numberOf(pick(source, 'refundAmount', 'RefundAmount', 0)),
    returnCarrierCode: String(pick(source, 'returnCarrierCode', 'ReturnCarrierCode', '') || ''),
    returnTrackingNo: String(pick(source, 'returnTrackingNo', 'ReturnTrackingNo', '') || ''),
    createdAt: pick(source, 'createdAt', 'CreatedAt', null),
    auditedAt: pick(source, 'auditedAt', 'AuditedAt', null),
    completedAt: pick(source, 'completedAt', 'CompletedAt', null),
    firstItemImageUrl: String(pick(source, 'firstItemImageUrl', 'FirstItemImageUrl', '') || ''),
    firstItemProductName: String(pick(source, 'firstItemProductName', 'FirstItemProductName', '') || ''),
    itemCount: numberOf(pick(source, 'itemCount', 'ItemCount', 0)),
  }
}

/** 仅发送已填写的物流单号，空值保持旧申请契约。 */
function optionalExpressNo(params) {
  const value = String(params.expressNo ?? params.ExpressNo ?? '').trim()
  return value ? { ExpressNo: value } : {}
}

function toApplyAfterSalePayload(params = {}) {
  return {
    OrderId: params.orderId ?? params.OrderId,
    ...optionalExpressNo(params),
    AfterSaleType: params.afterSaleType ?? params.AfterSaleType,
    ReasonCode: params.reasonCode ?? params.ReasonCode ?? null,
    Reason: params.reason ?? params.Reason ?? null,
    Items: (params.items ?? params.Items ?? []).map(item => ({
      OrderItemId: item.orderItemId ?? item.OrderItemId,
      Quantity: item.quantity ?? item.Quantity,
    })),
    ClientRequestId: params.clientRequestId ?? params.ClientRequestId ?? null,
  }
}

export function applyAfterSale(params = {}) {
  return dispatch('MallOrder', CONTROLLER, 'ApplyAfterSale', toApplyAfterSalePayload(params))
    .then(normalizeAfterSaleItem)
}

/** 获取当前主体的售后详情，集中适配商品、审核说明和时间字段。 */
export function getAfterSaleDetail(afterSaleId) {
  return dispatch('MallOrder', CONTROLLER, 'GetAfterSaleDetail', { AfterSaleId: Number(afterSaleId) }).then(source => {
    if (!source) return null
    return {
      ...normalizeAfterSaleItem(source),
      auditRemark: String(pick(source, 'auditRemark', 'AuditRemark', '') || ''),
      receivedAt: pick(source, 'receivedAt', 'ReceivedAt', null),
      refundStatus: numberOf(pick(source, 'refundStatus', 'RefundStatus', 0)),
      items: (pick(source, 'items', 'Items', []) || []).map(item => ({
        afterSaleItemId: numberOf(pick(item, 'afterSaleItemId', 'AfterSaleItemId', 0)),
        orderItemId: numberOf(pick(item, 'orderItemId', 'OrderItemId', 0)),
        productName: String(pick(item, 'productName', 'ProductName', '') || ''),
        skuName: String(pick(item, 'skuName', 'SkuName', '') || ''),
        imageUrl: String(pick(item, 'imageUrl', 'ImageUrl', '') || ''),
        applyQuantity: numberOf(pick(item, 'applyQuantity', 'ApplyQuantity', 0)),
        receivedQuantity: numberOf(pick(item, 'receivedQuantity', 'ReceivedQuantity', 0)),
        refundAmount: numberOf(pick(item, 'refundAmount', 'RefundAmount', 0)),
      })),
    }
  })
}

export function getAfterSaleableItems(orderId) {
  return dispatch('MallOrder', CONTROLLER, 'GetAfterSaleableItems', { OrderId: Number(orderId) }).then(result => {
    const items = Array.isArray(result) ? result : []
    return items.map(source => ({
      orderItemId: numberOf(pick(source, 'orderItemId', 'OrderItemId', 0)),
      productName: String(pick(source, 'productName', 'ProductName', '') || ''),
      skuName: String(pick(source, 'skuName', 'SkuName', '') || ''),
      imageUrl: String(pick(source, 'imageUrl', 'ImageUrl', '') || ''),
      availableQuantity: numberOf(pick(source, 'applyQuantity', 'ApplyQuantity', 0)),
      refundAmount: numberOf(pick(source, 'refundAmount', 'RefundAmount', 0)),
    }))
  })
}

/** 提交经销商自有库存售后，退款账户与SKU由后端校验，库存归属由服务端解析。 */
export function applyInventoryAfterSale(params = {}) {
  const payload = {
    RefundAccountId: Number(params.refundAccountId ?? params.RefundAccountId ?? 0),
    ...optionalExpressNo(params),
    ClientRequestId: params.clientRequestId ?? params.ClientRequestId ?? '',
    Reason: params.reason ?? params.Reason ?? '',
    Items: (params.items ?? params.Items ?? []).map(item => ({
      SkuId: Number(item.skuId ?? item.SkuId ?? 0),
      Quantity: Number(item.quantity ?? item.Quantity ?? 0),
    })),
  }
  return dispatch('MallOrder', CONTROLLER, 'ApplyInventoryAfterSale', payload).then(normalizeAfterSaleItem)
}

export function getAfterSaleList(params = {}) {
  return dispatch('MallOrder', CONTROLLER, 'GetAfterSaleList', {
    Status: params.status ?? params.Status ?? null,
    PageNum: params.pageNum ?? params.PageNum ?? 1,
    PageSize: params.pageSize ?? params.PageSize ?? 20,
  }).then(result => {
    const rawItems = pick(result, 'items', 'Items', [])
    const items = Array.isArray(rawItems) ? rawItems.map(normalizeAfterSaleItem) : []
    return {
      items,
      totalCount: numberOf(pick(result, 'totalCount', 'TotalCount', items.length)),
      pageNum: numberOf(pick(result, 'pageNum', 'PageNum', 1)) || 1,
      pageSize: numberOf(pick(result, 'pageSize', 'PageSize', 20)) || 20,
    }
  })
}

export function getAfterSaleCount() {
  return dispatch('MallOrder', CONTROLLER, 'GetAfterSaleCount', {}).then(result => ({
    total: numberOf(pick(result, 'total', 'Total', 0)),
    pendingReview: numberOf(pick(result, 'pendingReview', 'PendingReview', 0)),
    pendingReturn: numberOf(pick(result, 'pendingReturn', 'PendingReturn', 0)),
    returning: numberOf(pick(result, 'returning', 'Returning', 0)),
    refunding: numberOf(pick(result, 'refunding', 'Refunding', 0)),
    completed: numberOf(pick(result, 'completed', 'Completed', 0)),
    rejected: numberOf(pick(result, 'rejected', 'Rejected', 0)),
  }))
}

/** 售后物流复用下单页现有可用承运商接口，提交稳定编码、界面只展示名称。 */
export function getAfterSaleCarriers() {
  return dispatch('MallOrder', 'Mini.OrderController', 'GetExpressCompanies', {}).then(result =>
    (Array.isArray(result) ? result : []).map(item => ({
      code: String(pick(item, 'code', 'Code', '') || ''),
      name: String(pick(item, 'name', 'Name', '') || ''),
    })).filter(item => item.code && item.name))
}

export function cancelAfterSale(params = {}) {
  return dispatch('MallOrder', CONTROLLER, 'CancelAfterSale', {
    AfterSaleId: params.afterSaleId ?? params.AfterSaleId,
    Reason: params.reason ?? params.Reason ?? null,
  })
}

export function submitReturnLogistics(params = {}) {
  return dispatch('MallOrder', CONTROLLER, 'SubmitReturnLogistics', {
    AfterSaleId: params.afterSaleId ?? params.AfterSaleId,
    CarrierCode: params.carrierCode ?? params.CarrierCode,
    TrackingNo: params.trackingNo ?? params.TrackingNo,
  })
}
