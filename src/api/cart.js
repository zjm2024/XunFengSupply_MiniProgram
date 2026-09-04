/**
 * 购物车相关接口 - 加购、查看、修改数量、删除、批量操作
 *
 * 后端：MallOrder 模块的 Mini.CartController
 * 数据库：mall_order_cart 表
 *
 * ⚠️ dealerId 由后端从登录态获取，禁止前端传入
 * ⚠️ 参数由页面层构建 PascalCase 实体，API 层直接透传
 */

import { dispatch } from './base.js'

// ==================== 购物车基础操作 ====================

/**
 * 获取购物车列表（含选中状态、实时价格和库存计算）
 * @returns {Promise<Object>} 购物车数据 { items, summary }
 */
export function getCartList() {
  return dispatch('MallOrder', 'Mini.CartController', 'GetCart', {})
}

/**
 * 添加商品到购物车（同SKU累加数量）
 * @param {Object} params
 * @param {number} params.skuId - SKU ID
 * @param {number} params.quantity - 数量
 * @returns {Promise<Object>} 购物车项数据
 */
export function addToCart(params) {
  return dispatch('MallOrder', 'Mini.CartController', 'AddToCart', params)
}

/**
 * 修改购物车项数量
 * @param {Object} params
 * @param {number} params.cartItemId - 购物车项 ID
 * @param {number} params.quantity - 数量（必须大于0）
 * @returns {Promise<boolean>}
 */
export function updateQuantity(params) {
  return dispatch('MallOrder', 'Mini.CartController', 'UpdateQuantity', params)
}

/**
 * 批量修改购物车项数量（事务回滚）
 * @param {Object} params
 * @param {Array<{cartItemId: number, quantity: number}>} params.items
 * @returns {Promise<boolean>}
 */
export function batchUpdateQuantity(params) {
  return dispatch('MallOrder', 'Mini.CartController', 'BatchUpdateQuantity', params)
}

/**
 * 删除购物车项（逻辑删除）
 * @param {Object} params
 * @param {Array<number>} params.cartItemIds - 购物车项ID数组
 * @returns {Promise<boolean>}
 */
export function batchRemove(params) {
  return dispatch('MallOrder', 'Mini.CartController', 'RemoveItems', params)
}

/**
 * 选中/取消选中购物车项
 * @param {Object} params
 * @param {Array<number>} params.cartItemIds - 购物车项ID数组
 * @param {boolean} params.selected - 是否选中
 * @returns {Promise<boolean>}
 */
export function batchSelect(params) {
  return dispatch('MallOrder', 'Mini.CartController', 'SelectItems', params)
}

/**
 * 全选/取消全选
 * @param {Object} params
 * @param {boolean} params.selected - 是否全选
 * @returns {Promise<boolean>}
 */
export function selectAll(params) {
  return dispatch('MallOrder', 'Mini.CartController', 'SelectAll', params)
}

/**
 * 清空购物车（逻辑删除）
 * @returns {Promise<boolean>}
 */
export function clearCart() {
  return dispatch('MallOrder', 'Mini.CartController', 'ClearCart', {})
}

/**
 * 获取购物车摘要统计
 * @returns {Promise<Object>} { skuCount, totalQuantity, selectedCount, selectedQuantity, selectedAmount }
 */
export function getCartSummary() {
  return dispatch('MallOrder', 'Mini.CartController', 'GetCartSummary', {})
}
