/**
 * 商品接口与页面模型适配。
 *
 * 页面只消费本文件输出的 camelCase 展示模型。这里同时兼容：
 * 1. 当前 Mini API 的扁平商品 DTO；
 * 2. 旧版 ProductService 返回的 { product, prices, currentPrice } 结构。
 */
import { dispatch } from '../../../shared/api/dispatchClient.js'

const DEFAULT_IMAGE = '/static/images/default-product.png'

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function firstDefined(source, keys, fallback = undefined) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) return source[key]
  }
  return fallback
}

function toArray(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (_) {
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }
}

function normalizeImages(source) {
  const candidates = [
    ...toArray(firstDefined(source, ['images', 'imageUrls', 'imagesJson'], [])),
    firstDefined(source, ['imageUrl', 'image', 'coverUrl']),
  ].filter(Boolean)
  return [...new Set(candidates.length ? candidates : [DEFAULT_IMAGE])]
}

function normalizeSku(item, product) {
  const rawStock = firstDefined(item, ['effectiveStock', 'displayStock', 'stockQuantity', 'stock', 'availableStock'], null)
  const stockKnown = rawStock !== null && rawStock !== ''
  const stock = number(rawStock)
  const purchaseFlag = firstDefined(item, ['canPurchase', 'can_purchase'], true)
  const minOrderQty = Math.max(1, number(firstDefined(item, ['minOrderQty', 'minQuantity'], product.moq), product.moq))
  return {
    ...item,
    skuId: firstDefined(item, ['skuId', 'id', 'productSkuId']),
    skuCode: firstDefined(item, ['skuCode', 'code', 'erpSku'], ''),
    barcode: firstDefined(item, ['barcode', 'barCode'], ''),
    colorId: firstDefined(item, ['colorId']) ?? null,
    colorName: firstDefined(item, ['colorName'], null),
    sizeValueId: firstDefined(item, ['sizeValueId']) ?? null,
    sizeName: firstDefined(item, ['sizeName'], null),
    specName: firstDefined(item, ['specName', 'specDesc', 'skuName', 'specificationName', 'specValue'], ''),
    image: firstDefined(item, ['imageUrl', 'image'], product.image),
    price: number(firstDefined(item, ['currentPrice', 'price', 'salePrice'], product.price)),
    listPrice: number(firstDefined(item, ['listPrice', 'standardPrice'])),
    basePrice: number(firstDefined(item, ['basePrice', 'base_price'])),
    stock,
    stockKnown,
    minOrderQty,
    canPurchase: purchaseFlag !== false && (!stockKnown || stock >= minOrderQty),
  }
}

export function normalizeProduct(item = {}, extra = {}) {
  const source = item?.product || item || {}
  const prices = Array.isArray(item?.prices) ? item.prices : []
  const currentPrice = firstDefined(item, ['currentPrice'], firstDefined(source, ['currentPrice', 'minCurrentPrice', 'basePrice', 'price'], 0))
  const priceRule = prices.find(rule => number(rule.price) === number(currentPrice)) || prices[0]
  const images = normalizeImages(source)
  const rawProductStock = firstDefined(source, ['totalEffectiveStock', 'stockQuantity', 'stock', 'availableStock'], null)
  const productStockKnown = rawProductStock !== null && rawProductStock !== ''
  const product = {
    ...source,
    ...extra,
    productId: firstDefined(source, ['productId', 'id']),
    name: firstDefined(source, ['productName', 'name'], ''),
    code: firstDefined(source, ['productCode', 'code'], ''),
    erpSku: firstDefined(source, ['erpSku', 'skuCode'], ''),
    barcode: firstDefined(source, ['barcode', 'barCode'], ''),
    image: images[0],
    images,
    price: number(currentPrice),
    stock: productStockKnown ? number(rawProductStock) : null,
    stockKnown: productStockKnown,
    moq: Math.max(1, number(firstDefined(source, ['minOrderQty', 'minQuantity'], priceRule?.minQuantity ?? 1), 1)),
    unit: firstDefined(source, ['unit', 'unitName'], '件'),
    categoryName: firstDefined(item, ['categoryName'], firstDefined(source, ['categoryName'], '')),
    description: firstDefined(source, ['description', 'detailHtml', 'productDescription'], ''),
  }
  const skuSource = firstDefined(item, ['skus', 'skuList'], firstDefined(source, ['skus', 'skuList'], []))
  product.skus = Array.isArray(skuSource) ? skuSource.map(sku => normalizeSku(sku, product)) : []
  if (!product.stockKnown && product.skus.some(sku => sku.stockKnown)) {
    product.stock = product.skus.reduce((sum, sku) => sum + (sku.stockKnown ? sku.stock : 0), 0)
    product.stockKnown = true
  }
  return product
}

function normalizeCategory(item = {}) {
  const children = Array.isArray(item.children) ? item.children.map(normalizeCategory) : []
  return {
    ...item,
    id: firstDefined(item, ['categoryId', 'id']),
    name: firstDefined(item, ['categoryName', 'name'], ''),
    children,
  }
}

function toProductListQuery(params = {}) {
  const pageNum = params.pageNum ?? params.PageNum ?? params.page ?? 1
  return {
    pageNum,
    page: pageNum,
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
  }
}

export function getCategoryList() {
  return dispatch('MallProduct', 'Mini.ProductController', 'GetCategoryTree', {})
    .then(list => (Array.isArray(list) ? list.map(normalizeCategory) : []))
}

export function getGoodsList(params = {}) {
  return dispatch('MallProduct', 'Mini.ProductController', 'GetProductList', toProductListQuery(params))
    .then(result => {
      const items = Array.isArray(result?.items) ? result.items : []
      return {
        ...result,
        items: items.map(item => normalizeProduct(item)),
        totalCount: number(result?.totalCount, items.length),
        pageNum: number(firstDefined(result, ['pageNum', 'page'], 1), 1),
        pageSize: number(result?.pageSize, 20),
      }
    })
}

export function searchGoods(keyword, params = {}) {
  return getGoodsList({ ...params, keyword })
}

export function getGoodsDetail(productId) {
  return dispatch('MallProduct', 'Mini.ProductController', 'GetProductDetail', { productId })
    .then(result => (result ? normalizeProduct(result) : null))
}

export function getCategoryTree() {
  return getCategoryList()
}

// 补货清单后端暂未发布接口，待后端契约对齐后实现
// - getReplenishList / addReplenishToCart
// 详见 docs/MINI_API_CONTRACT.md "后端缺口" 章节

export function getGoodsSkuList(goodsId) {
  return getGoodsDetail(goodsId).then(detail => detail?.skus || [])
}

export function getSkuStock(goodsId, skuId) {
  return getGoodsSkuList(goodsId).then(skus => skus.find(sku => String(sku.skuId) === String(skuId))?.stock ?? 0)
}
