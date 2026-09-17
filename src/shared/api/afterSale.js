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
    afterSaleType: numberOf(pick(source, 'afterSaleType', 'AfterSaleType', 0)),
    status: numberOf(pick(source, 'status', 'Status', 0)),
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

function toApplyAfterSalePayload(params = {}) {
  return {
    OrderId: params.orderId ?? params.OrderId,
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
