/**
 * 结算对账相关接口 - 月度对账、结算账单、导出凭证、赊账还款
 *
 * 后端映射：
 *   Module: MallOrder
 *   - Mini.InvoiceController → ApplyInvoice
 *
 * ⚠️ 参数由页面层构建 PascalCase 实体，API 层直接透传
 */

import { dispatch } from '../../../shared/api/dispatchClient.js'

// ==================== 发票接口（后端已实现） ====================

/**
 * 申请发票
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {number} params.OrderId - 订单ID
 * @param {number} params.InvoiceType - 发票类型（1普通, 2专用）
 * @param {string} [params.Title] - 发票抬头
 * @param {string} [params.TaxNo] - 税号
 * @returns {Promise<boolean>}
 * @remarks 后端当前固定返回"发票暂未开放"业务错误
 */
export function applyInvoice(params) {
  return dispatch('MallOrder', 'Mini.InvoiceController', 'ApplyInvoice', params)
}

// ==================== 以下接口后端尚未实现，保留占位 ====================

/**
 * 获取月度结算账单列表
 * ⚠️ 后端未实现
 */
export function getBillList(params) {
  return Promise.reject(new Error('账单列表功能尚未实现'))
}

/**
 * 获取账单详情
 * ⚠️ 后端未实现
 */
export function getBillDetail(billId) {
  return Promise.reject(new Error('账单详情功能尚未实现'))
}

/**
 * 获取账单关联的订单明细列表
 * ⚠️ 后端未实现
 */
export function getBillOrderItems(billId, params) {
  return Promise.reject(new Error('账单订单明细功能尚未实现'))
}

/**
 * 支付/结清账单
 * ⚠️ 后端未实现
 */
export function payBill(billId, data) {
  return Promise.reject(new Error('账单支付功能尚未实现'))
}

/**
 * 授信赊账还款
 * ⚠️ 后端未实现
 */
export function repayCredit(billId, data) {
  return Promise.reject(new Error('赊账还款功能尚未实现'))
}

/**
 * 导出账单PDF凭证
 * ⚠️ 后端未实现
 */
export function exportBillVoucher(billId) {
  return Promise.reject(new Error('导出账单功能尚未实现'))
}

/**
 * 获取账单下载链接
 * ⚠️ 后端未实现
 */
export function getBillDownloadUrl(billId) {
  return Promise.reject(new Error('账单下载功能尚未实现'))
}

/**
 * 获取经销商结算概览
 * ⚠️ 后端未实现
 */
export function getSettlementOverview() {
  return Promise.reject(new Error('结算概览功能尚未实现'))
}

/**
 * 获取授信额度使用情况
 * ⚠️ 后端未实现
 */
export function getCreditInfo() {
  return Promise.reject(new Error('授信额度功能尚未实现'))
}
