/**
 * 售后相关接口 - 售后申请、进度查询
 *
 * 后端映射：
 *   Module: MallOrder
 *   - Mini.AfterSaleController → ApplyAfterSale
 *
 * ⚠️ 参数由页面层构建 PascalCase 实体，API 层直接透传
 */

import { dispatch } from './base.js'

// ==================== 售后申请接口 ====================

/**
 * 发起售后申请
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {number} params.OrderId - 订单ID
 * @param {number} params.AfterSaleType - 售后类型
 * @param {string} [params.ReasonCode] - 原因编码
 * @param {string} params.Reason - 申请原因
 * @param {number} params.RefundAmount - 申请退款金额
 * @param {string} [params.ClientRequestId] - 客户端幂等键
 * @returns {Promise<boolean>}
 * @remarks 后端 V1 当前固定返回“售后暂未开放”业务错误
 */
export function applyAfterSale(params) {
  return dispatch('MallOrder', 'Mini.AfterSaleController', 'ApplyAfterSale', params)
}

// 以下接口后端尚未实现，保留占位

/**
 * 获取订单可售后的商品列表
 * ⚠️ 后端未实现
 */
export function getAfterSaleableItems(orderId) {
  return Promise.reject(new Error('可售后商品列表功能尚未实现'))
}

/**
 * 获取售后申请列表（分页）
 * ⚠️ 后端未实现
 */
export function getAfterSaleList(params) {
  return Promise.reject(new Error('售后列表功能尚未实现'))
}

/**
 * 获取各状态售后数量统计
 * ⚠️ 后端未实现
 */
export function getAfterSaleCount() {
  return Promise.reject(new Error('售后统计功能尚未实现'))
}

/**
 * 获取售后详情（含进度时间线）
 * ⚠️ 后端未实现
 */
export function getAfterSaleDetail(afterSaleId) {
  return Promise.reject(new Error('售后详情功能尚未实现'))
}

/**
 * 获取售后处理日志/时间线
 * ⚠️ 后端未实现
 */
export function getAfterSaleTimeline(afterSaleId) {
  return Promise.reject(new Error('售后时间线功能尚未实现'))
}

/**
 * 取消售后申请
 * ⚠️ 后端未实现
 */
export function cancelAfterSale(afterSaleId) {
  return Promise.reject(new Error('取消售后功能尚未实现'))
}

/**
 * 填写退货物流信息
 * ⚠️ 后端未实现
 */
export function submitReturnLogistics(afterSaleId, data) {
  return Promise.reject(new Error('退货物流功能尚未实现'))
}

/**
 * 确认收到换货/补发商品
 * ⚠️ 后端未实现
 */
export function confirmExchangeReceived(afterSaleId) {
  return Promise.reject(new Error('确认换货收货功能尚未实现'))
}

/**
 * 上传售后补充凭证图片
 * ⚠️ 后端未实现
 */
export function uploadAfterSaleEvidence(afterSaleId, images) {
  return Promise.reject(new Error('补充凭证功能尚未实现'))
}
