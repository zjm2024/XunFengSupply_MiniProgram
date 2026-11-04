import { dispatch } from '@/shared/api/dispatchClient.js'
import { shareAccessCode } from './shareAccessApi.js'
import { shareId, shareMoney } from '../model/dealerShareValues.js'

const CONTROLLER = 'Mini.ShareCatalogController'
const STOCK = new Set(['OUT_OF_STOCK', 'LOW_STOCK', 'IN_STOCK'])

/** ID不能被JS数值舍入；金额始终保留精确分字符串。 */
function id(value) { const result = shareId(value); if (!result) throw new TypeError('Invalid sharing catalog id'); return result }
/** 文本仅展示，错误响应不能借此向模型添加凭据或身份。 */
function text(value, maximum = 1000) {
  if (typeof value !== 'string' || value.length > maximum) throw new TypeError('Invalid sharing catalog text')
  return value
}
/** 不接受金额数字、零或超出分的精度。 */
function money(value) {
  const result = shareMoney(value)
  if (!result || !/[1-9]/.test(result)) throw new TypeError('Invalid sharing catalog price')
  return result
}
/** 库存只有三态，不能从任意字段构造数量。 */
function stock(value) { if (!STOCK.has(value)) throw new TypeError('Invalid sharing catalog stock'); return value }
/** 安全SPU白名单，丢弃任何额外采购价、原码和主体。 */
function product(value) {
  return { productId: id(value?.productId), categoryId: id(value?.categoryId),
    productCode: text(value.productCode, 100), productName: text(value.productName, 500),
    imageUrl: value.imageUrl == null ? '' : text(value.imageUrl, 2000),
    fromPrice: money(value.fromPrice), stockState: stock(value.stockState) }
}
/** SKU报价只在内存展示，版本是不可解析的服务端并发凭据。 */
function sku(value) {
  if (typeof value?.priceVersion !== 'string' || !/^[a-fA-F0-9]{64}$/.test(value.priceVersion) || value.minimumQuantity !== 1) throw new TypeError('Invalid sharing SKU quote')
  return { skuId: id(value.skuId), productId: id(value.productId), productName: text(value.productName, 500),
    skuCode: text(value.skuCode, 100), specDesc: text(value.specDesc), imageUrl: value.imageUrl == null ? '' : text(value.imageUrl, 2000),
    colorName: value.colorName == null ? '' : text(value.colorName, 200), sizeName: value.sizeName == null ? '' : text(value.sizeName, 200),
    unitPrice: money(value.unitPrice), priceVersion: value.priceVersion, stockState: stock(value.stockState), minimumQuantity: 1 }
}
/** 总数和分页元数据须与请求一致，缺页不能被当成全部规格。 */
function page(value, request, map) {
  if (!value || !Array.isArray(value.items) || value.items.length > request.PageSize || !Number.isSafeInteger(value.totalCount)
    || value.totalCount < 0 || value.items.length > value.totalCount || value.pageNum !== request.PageNum || value.pageSize !== request.PageSize) throw new TypeError('Invalid sharing catalog page')
  return { items: value.items.map(map), totalCount: value.totalCount, pageNum: value.pageNum, pageSize: value.pageSize }
}
/** 每次从调用者拿独立上下文，不引入全局当前分享，不读取经销商JWT。 */
function options(access) {
  if (!shareAccessCode(access?.contextId) || !shareAccessCode(access?.csrfToken)) throw new TypeError('Invalid sharing context')
  return { shareSession: true, anonymous: true, authStrategy: 'passive', timeout: 15000,
    header: { 'X-Share-Context': access.contextId, 'X-Share-CSRF': access.csrfToken } }
}
/** 有限的服务端固定排序分页，不接受任意SQL或购买数量。 */
function pagination(pageNum, pageSize) {
  if (!Number.isSafeInteger(pageNum) || pageNum < 1 || pageNum > 10000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new TypeError('Invalid sharing catalog page')
  return { PageNum: pageNum, PageSize: pageSize }
}
/** 仅批准可买目录的直接分类。 */
export async function getShareCatalogCategories(access) {
  const rows = await dispatch('MallProduct', CONTROLLER, 'GetCategories', {}, options(access))
  if (!Array.isArray(rows)) throw new TypeError('Invalid sharing categories')
  return rows.map(row => ({ categoryId: id(row?.categoryId), name: text(row.name, 200), ...(row.parentId == null ? {} : { parentId: String(row.parentId) === '0' ? '0' : id(row.parentId) }) }))
}
/** 当前独立零售价起价列表，调用者冒充主体/价格的字段不会入请求。 */
export async function getShareCatalogList({ contextId, csrfToken, categoryId, keyword, hasImage, pageNum = 1, pageSize = 20 } = {}) {
  const request = pagination(pageNum, pageSize)
  if (typeof hasImage === 'boolean') request.HasImage = hasImage
  if (categoryId != null && categoryId !== '') request.CategoryId = id(categoryId)
  if (keyword != null) {
    const normalized = text(keyword, 120).trim().normalize('NFC')
    if (normalized.length > 60 || /[\u0000-\u001f\u007f-\u009f]/.test(normalized)) throw new TypeError('Invalid sharing keyword')
    if (normalized) request.Keyword = normalized
  }
  return page(await dispatch('MallProduct', CONTROLLER, 'GetList', request, options({ contextId, csrfToken })), request, product)
}
/** 详情只展示当前可报价SKU，显式分页。 */
export async function getShareCatalogDetail({ contextId, csrfToken, productId, pageNum = 1, pageSize = 20 } = {}) {
  const request = { ...pagination(pageNum, pageSize), ProductId: id(productId) }
  const value = await dispatch('MallProduct', CONTROLLER, 'GetDetail', request, options({ contextId, csrfToken }))
  const card = product(value?.product)
  if (card.productId !== request.ProductId) throw new TypeError('Invalid sharing catalog product')
  return { unit: value.unit == null ? '' : text(value.unit, 50), description: value.description == null ? '' : text(value.description, 500000), sizeRecommendation: value.sizeRecommendation == null ? '' : text(value.sizeRecommendation, 500000), product: card, skus: page(value.skus, request, sku) }
}
/** 只读购物意向重报价：不提交数量/金额、不写数据库购物车。 */
export async function quoteShareCatalogSelection({ contextId, csrfToken, skuIds } = {}) {
  if (!Array.isArray(skuIds) || skuIds.length < 1 || skuIds.length > 100) throw new TypeError('Invalid sharing selection')
  const requested = new Set(skuIds.map(id))
  const rows = await dispatch('MallProduct', CONTROLLER, 'QuoteSelection', { SkuIds: [...requested] }, options({ contextId, csrfToken }))
  if (!Array.isArray(rows) || rows.length > requested.size) throw new TypeError('Invalid sharing quotes')
  const result = rows.map(sku), seen = new Set()
  for (const row of result) {
    if (!requested.has(row.skuId) || seen.has(row.skuId)) throw new TypeError('Invalid sharing quotes')
    seen.add(row.skuId)
  }
  return result
}

