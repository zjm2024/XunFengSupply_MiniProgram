/**
 * 商品相关接口 - 分类、列表、搜索、详情、SKU库存
 *
 * 后端映射：
 *   Module: MallProduct
 *   - Mini.ProductController → GetProductList / GetProductDetail / GetCategoryTree
 *
 * ⚠️ 参数由页面层构建 PascalCase 实体，API 层直接透传
 */

import { dispatch } from './base.js'

function normalizeCategory(item) {
  const children = Array.isArray(item?.children) ? item.children.map(normalizeCategory) : []
  return {
    ...item,
    id: item?.categoryId,
    name: item?.categoryName || '',
    children,
  }
}

function normalizeProduct(item) {
  const minPrice = item?.minCurrentPrice
  return {
    ...item,
    id: item?.productId,
    name: item?.productName || '',
    code: item?.productCode || '',
    image: item?.imageUrl || '',
    price: minPrice == null ? 0 : Number(minPrice),
    stock: Number(item?.totalEffectiveStock || 0),
    moq: Number(item?.minOrderQty || 0),
  }
}

function toProductListQuery(params = {}) {
  return {
    pageNum: params.pageNum ?? params.PageNum ?? params.page ?? 1,
    pageSize: params.pageSize ?? params.PageSize ?? 20,
    categoryId: params.categoryId ?? params.CategoryId ?? null,
    keyword: params.keyword ?? params.Keyword ?? null,
    skuCode: params.skuCode ?? params.SkuCode ?? null,
    status: params.status ?? params.Status ?? null,
    sourceStatus: params.sourceStatus ?? params.SourceStatus ?? null,
    yearName: params.yearName ?? params.YearName ?? null,
    hasImage: params.hasImage ?? params.HasImage ?? null,
    stockFilter: params.stockFilter ?? params.StockFilter ?? null,
    sortField: params.sortField ?? params.SortField ?? null,
    sortOrder: params.sortOrder ?? params.SortOrder ?? null,
    startTime: params.startTime ?? params.StartTime ?? null,
    endTime: params.endTime ?? params.EndTime ?? null,
    updateStartTime: params.updateStartTime ?? params.UpdateStartTime ?? null,
    updateEndTime: params.updateEndTime ?? params.UpdateEndTime ?? null,
  }
}

// ==================== 商品分类接口 ====================

/**
 * 获取商品分类树
 * @returns {Promise<Array>} 分类树结构
 */
export function getCategoryList() {
  return dispatch('MallProduct', 'Mini.ProductController', 'GetCategoryTree', {})
    .then(list => (Array.isArray(list) ? list.map(normalizeCategory) : []))
}

// ==================== 商品列表接口 ====================

/**
 * 获取商品列表（分页）
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {number} [params.PageNum=1] - 页码（从1开始）
 * @param {number} [params.PageSize=20] - 每页条数
 * @param {number} [params.CategoryId] - 分类ID筛选
 * @param {string} [params.Keyword] - 商品名称/编码模糊搜索
 * @returns {Promise<{ items: Array, totalCount: number, pageNum: number, pageSize: number }>}
 */
export function getGoodsList(params) {
  return dispatch('MallProduct', 'Mini.ProductController', 'GetProductList', toProductListQuery(params))
    .then(result => ({
      ...result,
      items: Array.isArray(result?.items) ? result.items.map(normalizeProduct) : [],
    }))
}

/**
 * 搜索商品（复用 GetProductList，传入 Keyword 参数）
 * @param {string} keyword - 搜索关键词
 * @param {Object} [params={}] - 其他查询参数（PascalCase）
 * @returns {Promise<{ items: Array, totalCount: number }>}
 */
export function searchGoods(keyword, params = {}) {
  return getGoodsList({ ...params, Keyword: keyword })
}

// ==================== 商品详情接口 ====================

/**
 * 获取商品详情（含SKU列表、当前经销商价格和库存）
 * ⚠️ CustomerId 由后端从登录用户身份获取，禁止前端传入
 * @param {number} productId - 商品SPU ID
 * @returns {Promise<Object>} 商品详情
 */
export function getGoodsDetail(productId) {
  return dispatch('MallProduct', 'Mini.ProductController', 'GetProductDetail', { productId })
    .then(item => (item ? {
      ...item,
      id: item.productId,
      name: item.productName || '',
      code: item.productCode || '',
      image: item.imageUrl || '',
    } : item))
}

/**
 * 获取商品分类树（别名，与 getCategoryList 相同）
 * @returns {Promise<Array>}
 */
export function getCategoryTree() {
  return getCategoryList()
}

// ==================== 向后兼容方法（旧调用名） ====================

/**
 * 获取补货推荐清单
 * ⚠️ 后端未实现补货清单接口
 */
export function getReplenishList() {
  return Promise.reject(new Error('补货清单功能尚未实现'))
}

/**
 * 将补货清单加入购物车
 * ⚠️ 后端未实现
 */
export function addReplenishToCart(items) {
  return Promise.reject(new Error('补货清单加购功能尚未实现'))
}

/**
 * 获取商品所有SKU列表及库存
 * ⚠️ 后端未实现独立 SKU 列表接口，可通过 getGoodsDetail 获取
 */
export function getGoodsSkuList(goodsId) {
  return Promise.reject(new Error('SKU列表功能尚未实现，请使用 getGoodsDetail 获取'))
}

/**
 * 查询SKU实时库存
 * ⚠️ 后端未实现独立库存查询接口，可通过 getGoodsDetail 获取
 */
export function getSkuStock(goodsId, skuId) {
  return Promise.reject(new Error('SKU库存查询功能尚未实现'))
}
