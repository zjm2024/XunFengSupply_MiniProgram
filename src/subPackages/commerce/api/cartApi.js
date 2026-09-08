/**
 * Mini SKU 级购物车 API 层。
 *
 * 路由：Module = MallOrder，Class = Mini.CartController
 * 身份由后端 HttpIdentityService 从登录态取得 dealer_id，前端禁止传入。
 *
 * 约定：
 * - 本文件所有公开方法接收 camelCase 领域对象
 * - 本文件负责转换为后端 PascalCase DTO
 * - 调用方（调度器、页面）不得构造 PascalCase DTO
 */
import { dispatch } from '../../../shared/api/dispatchClient.js'

// ==================== JSDoc 类型定义 ====================

/**
 * @typedef {Object} CartItemInput
 * @property {number} cartItemId - 购物车项 ID
 * @property {number} quantity - 数量（正整数）
 */

/**
 * @typedef {Object} SelectItemsInput
 * @property {number[]} cartItemIds - 购物车项 ID 数组
 * @property {boolean} selected - 目标选中状态
 */

/**
 * @typedef {Object} CartItemDomain
 * @property {number} cartItemId
 * @property {number} productId
 * @property {number} skuId
 * @property {string} name
 * @property {string} skuName
 * @property {string} code
 * @property {string} image
 * @property {string} unit
 * @property {number} price
 * @property {number} quantity
 * @property {number} stock
 * @property {boolean} selected
 * @property {number} subtotal
 * @property {number} minOrderQty
 * @property {boolean} canPurchase
 * @property {string|null} invalidReason
 */

/**
 * @typedef {Object} CartSummary
 * @property {number} productCount
 * @property {number} skuCount
 * @property {number} selectedCount
 * @property {number} totalQuantity
 * @property {number} selectedQuantity
 * @property {number} totalAmount
 * @property {number} selectedAmount
 */

/**
 * @typedef {Object} CartResult
 * @property {CartItemDomain[]} items
 * @property {CartSummary} summary
 */

/** 购物车能力标记 */
export const cartCapabilities = Object.freeze({
  sku: true,
  updateQuantity: true,
  remove: true,
  remoteSelection: true,
  batchUpdate: true,
  clear: true,
})

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
 * 将后端 DTO 转换为前端领域模型
 * @param {Object} item
 * @returns {CartItemDomain}
 */
function normalizeCartItem(item = {}) {
  const price = number(
    item.currentPrice ?? item.CurrentPrice ?? item.current_price ?? item.unitPrice ?? item.UnitPrice ?? item.price ?? item.Price,
  )
  const quantity = Math.max(0, number(item.quantity ?? item.Quantity))
  const selected = item.isSelected ?? item.IsSelected ?? item.selected ?? item.is_selected
  return {
    cartItemId: item.cartItemId ?? item.CartItemId ?? item.cart_id ?? item.id,
    productId: item.productId ?? item.ProductId ?? item.product_id,
    skuId: item.skuId ?? item.SkuId ?? item.sku_id,
    name: item.productName ?? item.ProductName ?? item.product_name ?? '',
    skuName: item.skuName ?? item.SkuName ?? item.sku_name ?? '',
    code: item.productCode ?? item.ProductCode ?? item.product_code ?? '',
    image: item.imageUrl ?? item.ImageUrl ?? item.image_url ?? item.image ?? '/static/images/default-product.png',
    unit: item.unit ?? item.Unit ?? '件',
    price,
    quantity,
    stock: number(item.displayStock ?? item.DisplayStock ?? item.display_stock ?? item.stock ?? item.Stock, Number.MAX_SAFE_INTEGER),
    selected: selected === undefined ? true : Boolean(selected),
    subtotal: number(item.subTotal ?? item.SubTotal ?? item.subtotal, price * quantity),
    minOrderQty: Math.max(1, number(item.minOrderQty ?? item.MinOrderQty ?? item.min_order_qty, 1)),
    canPurchase: item.canPurchase ?? item.CanPurchase ?? item.can_purchase ?? true,
    invalidReason: item.invalidReason ?? item.InvalidReason ?? item.invalid_reason ?? null,
  }
}

/**
 * 计算购物车汇总
 * @param {CartItemDomain[]} items
 * @returns {CartSummary}
 */
function buildSummary(items) {
  const selected = items.filter(item => item.selected !== false && item.canPurchase !== false)
  const round2 = value => Math.round((value + Number.EPSILON) * 100) / 100
  return {
    productCount: items.length,
    skuCount: items.length,
    selectedCount: selected.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    selectedQuantity: selected.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: round2(items.reduce((sum, item) => sum + item.price * item.quantity, 0)),
    selectedAmount: round2(selected.reduce((sum, item) => sum + item.price * item.quantity, 0)),
  }
}

// ==================== API 方法 ====================

/**
 * 获取购物车全量列表
 * @returns {Promise<CartResult>}
 */
export function getCartList() {
  return dispatch('MallOrder', 'Mini.CartController', 'GetCart', {})
    .then(result => {
      const source = Array.isArray(result?.items) ? result.items : (result?.Items || [])
      const summary = result?.summary || result?.Summary || buildSummary(source.map(normalizeCartItem))
      return { items: source.map(normalizeCartItem), summary }
    })
}

/**
 * 加购 SKU 到购物车
 * @param {{skuId: number, quantity: number}} params
 * @returns {Promise<CartItemDomain|null>}
 */
export function addToCart(params = {}) {
  const skuId = Number(params.skuId)
  const quantity = Math.max(1, Number(params.quantity) || 1)
  if (!skuId) return Promise.reject(new Error('缺少有效的 SKU ID'))
  return dispatch('MallOrder', 'Mini.CartController', 'AddToCart', {
    SkuId: skuId,
    Quantity: quantity,
    ...(params.clientRequestId ? { ClientRequestId: params.clientRequestId } : {}),
  })
}

/**
 * 单请求批量加购。批量采购页只能调用该接口，禁止前端循环发送 AddToCart。
 * @param {{items: Array<{skuId:number, quantity:number}>, clientRequestId?: string}} params
 * @returns {Promise<object>}
 */
export function batchAddToCart(params = {}) {
  const source = Array.isArray(params.items) ? params.items : []
  const items = source
    .map(item => ({
      SkuId: Number(item.skuId),
      Quantity: Number(item.quantity),
    }))
    .filter(item => item.SkuId > 0 && item.Quantity > 0)

  if (items.length === 0) return Promise.reject(new Error('请选择需要采购的商品规格'))
  if (items.length > 50) return Promise.reject(new Error('单次批量采购最多选择 50 个规格'))

  return dispatch('MallOrder', 'Mini.CartController', 'BatchAddToCart', {
    Items: items,
    ...(params.clientRequestId ? { ClientRequestId: params.clientRequestId } : {}),
  })
}

/**
 * 批量更新购物车项数量（API 层负责 PascalCase 转换）
 * @param {CartItemInput[]} items - camelCase 领域对象数组
 *   @param {number} items[].cartItemId
 *   @param {number} items[].quantity
 * @returns {Promise<void>}
 */
export function batchUpdateQuantity(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return Promise.reject(new Error('批量修改数量需要至少一条变更'))
  }
  const payload = items.map(item => ({
    CartItemId: Number(item.cartItemId),
    Quantity: Math.max(1, Number(item.quantity) || 1),
  }))
  return dispatch('MallOrder', 'Mini.CartController', 'BatchUpdateQuantity', { Items: payload })
}

/**
 * 删除购物车项
 * @param {number[]} cartItemIds - 购物车项 ID 数组
 * @returns {Promise<void>}
 */
export function removeItems(cartItemIds = []) {
  const ids = (Array.isArray(cartItemIds) ? cartItemIds : [cartItemIds])
    .map(Number)
    .filter(Boolean)
  if (ids.length === 0) return Promise.reject(new Error('请选择需要删除的商品'))
  return dispatch('MallOrder', 'Mini.CartController', 'RemoveItems', { CartItemIds: ids })
}

/**
 * 设置购物车项选中状态
 * @param {SelectItemsInput} params
 * @returns {Promise<void>}
 */
export function selectItems(params = {}) {
  const ids = (Array.isArray(params.cartItemIds) ? params.cartItemIds : params.cartItemIds ? [params.cartItemIds] : [])
    .map(Number)
    .filter(Boolean)
  if (ids.length === 0) return Promise.reject(new Error('请选择需要变更状态的商品'))
  return dispatch('MallOrder', 'Mini.CartController', 'SelectItems', {
    CartItemIds: ids,
    Selected: params.selected !== false,
  })
}

/**
 * 全选/取消全选
 * @param {boolean} selected
 * @returns {Promise<void>}
 */
export function selectAll(selected = true) {
  return dispatch('MallOrder', 'Mini.CartController', 'SelectAll', { Selected: Boolean(selected) })
}

/**
 * 清空购物车
 * @returns {Promise<void>}
 */
export function clearCart() {
  return dispatch('MallOrder', 'Mini.CartController', 'ClearCart', {})
}

/**
 * 获取购物车汇总
 * @returns {Promise<CartSummary>}
 */
export function getCartSummary() {
  return dispatch('MallOrder', 'Mini.CartController', 'GetCartSummary', {})
    .then(result => result || buildSummary([]))
}
