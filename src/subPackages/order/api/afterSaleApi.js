/**
 * 售后相关接口 - 售后申请、进度查询
 *
 * 后端映射：
 *   Module: MallOrder
 *   - Mini.AfterSaleController → ApplyAfterSale
 *
 * 约定：
 * - 本文件所有公开方法接收 camelCase 领域对象
 * - 本文件负责转换为后端 PascalCase DTO
 */

import { dispatch } from '../../../shared/api/dispatchClient.js'

// ==================== 内部工具函数 ====================

/**
 * 将 camelCase 售后申请参数转换为 PascalCase DTO
 * @param {Object} params - camelCase 参数
 * @returns {Object} PascalCase 参数
 */
function toApplyAfterSalePayload(params = {}) {
  return {
    OrderId: params.orderId ?? params.OrderId,
    AfterSaleType: params.afterSaleType ?? params.AfterSaleType,
    ReasonCode: params.reasonCode ?? params.ReasonCode ?? null,
    Reason: params.reason ?? params.Reason ?? null,
    RefundAmount: params.refundAmount ?? params.RefundAmount ?? null,
    ClientRequestId: params.clientRequestId ?? params.ClientRequestId ?? null,
  }
}

// ==================== 售后申请接口 ====================

/**
 * 发起售后申请
 * @param {Object} params - camelCase 领域参数
 * @param {number} params.orderId - 订单ID
 * @param {number} params.afterSaleType - 售后类型：1仅退款 2退货退款 3换货
 * @param {string} [params.reasonCode] - 原因编码
 * @param {string} params.reason - 申请原因
 * @param {number} [params.refundAmount] - 申请退款金额
 * @param {string} [params.clientRequestId] - 客户端幂等键
 * @returns {Promise<boolean>}
 * @remarks 后端 V1 当前固定返回"售后暂未开放"业务错误
 */
export function applyAfterSale(params = {}) {
  return dispatch('MallOrder', 'Mini.AfterSaleController', 'ApplyAfterSale', toApplyAfterSalePayload(params))
}

// 后端未实现的端点（当前预留，待后端发布契约后实现）：
// - getAfterSaleableItems / getAfterSaleList / getAfterSaleCount
// - getAfterSaleDetail / getAfterSaleTimeline / cancelAfterSale
// - submitReturnLogistics / confirmExchangeReceived / uploadAfterSaleEvidence
// 详见 docs/MINI_API_CONTRACT.md "后端缺口" 章节
