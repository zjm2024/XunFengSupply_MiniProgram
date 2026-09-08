/**
 * 结算相关接口
 * 对应后端：XunFeng.Module.MallOrder/Controllers/Mini/OrderController.cs
 *
 * 接口列表：
 * - PreviewOrder: 预览订单（计算金额、库存、配送）
 * - CreateOrder: 创建订单
 *
 * ⚠️ 严格遵守 API 协议：
 * 1. API 层只做 params 透传，不做 PascalCase 映射
 * 2. 页面层负责构建 PascalCase 参数实体
 * 3. 所有请求走 dispatch() 动态调度
 */

import { dispatch } from '../../../shared/api/dispatchClient.js'

/**
 * 生成客户端请求 ID（幂等键）
 * @returns {string}
 */
export function generateClientRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * 预览订单
 * 在提交订单前调用，获取服务端计算的金额、库存、配送结果
 *
 * @param {Object} params - PascalCase 实体，由页面层构建
 * @returns {Promise<Object>} 预览结果
 */
export function previewOrder(params) {
  return dispatch('MallOrder', 'Mini.OrderController', 'PreviewOrder', params || {})
}

/**
 * 创建订单
 *
 * @param {Object} params - PascalCase 实体，由页面层构建
 * @returns {Promise<Object>} 创建结果，包含 OrderId
 */
export function createOrder(params) {
  return dispatch('MallOrder', 'Mini.OrderController', 'CreateOrder', params || {})
}
