import { dispatch } from '@/shared/api/dispatchClient.js'

const CONTROLLER = 'Mini.PublicStockController'
import { publicStockAccessParams } from '../model/publicStockAccess.js'
const OPTIONS = Object.freeze({ anonymous: true, authStrategy: 'passive', timeout: 15000 })
const STATES = new Set(['OUT_OF_STOCK', 'LOW_STOCK', 'IN_STOCK'])

/** 保留Int64十进制字符串，拒绝已丢精度的数字和对象。 */
export function publicStockId(value) {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value <= 0)) return ''
  if (typeof value !== 'number' && typeof value !== 'string') return ''
  const id = String(value)
  return /^[1-9]\d{0,18}$/.test(id) && (id.length < 19 || id <= '9223372036854775807') ? id : ''
}

/** 协议异常不伪装成无库存或空列表。 */
function invalid() { throw new Error('Invalid public stock response') }

/** 显式投影；采购字段即便意外出现也不会进入页面模型。 */
function product(row) {
  const productId = publicStockId(row?.productId)
  const categoryId = publicStockId(row?.categoryId)
  if (!productId || !categoryId || !STATES.has(row?.stockState)) return invalid()
  return { productId, categoryId, productCode: String(row.productCode ?? ''),
    productName: String(row.productName ?? ''), imageUrl: /^https:\/\//i.test(row.imageUrl ?? '') ? row.imageUrl : '',
    stockState: row.stockState }
}

/** 安全规格不保留库存数、条码、价格、仓库或其他扩展字段。 */
function sku(row) {
  const skuId = publicStockId(row?.skuId)
  if (!skuId || !STATES.has(row?.stockState)) return invalid()
  return { skuId, skuCode: String(row.skuCode ?? ''), specDesc: String(row.specDesc ?? ''), stockState: row.stockState }
}

/** 按固定分页契约规范化，拒绝危险或自相矛盾计数。 */
function page(data, map) {
  if (!Array.isArray(data?.items) || !Number.isSafeInteger(data.totalCount) || data.totalCount < 0
    || !Number.isInteger(data.pageNum) || data.pageNum < 1
    || !Number.isInteger(data.pageSize) || data.pageSize < 1 || data.pageSize > 50
    || data.items.length > data.pageSize) return invalid()
  return { items: data.items.map(map), totalCount: data.totalCount, pageNum: data.pageNum, pageSize: data.pageSize }
}

/** 页面仅构造camelCase领域查询，API负责PascalCase契约与技术上限。 */
function paging(params) {
  const number = (value, fallback, max) => Number.isInteger(Number(value)) ? Math.max(1, Math.min(max, Number(value))) : fallback
  return { PageNum: number(params.pageNum, 1, 10000), PageSize: number(params.pageSize, 20, 50) }
}

/** 共用平台范围，无dealerId或token，失败不触发经销商登录清理。 */
export async function getPublicStockCategories() {
  const data = await dispatch('MallProduct', CONTROLLER, 'GetCategories', publicStockAccessParams(), OPTIONS)
  if (!Array.isArray(data)) return invalid()
  return data.map(row => {
    const categoryId = publicStockId(row?.categoryId)
    if (!categoryId) return invalid()
    return { categoryId, name: String(row.name ?? ''), ...(row.parentId == null ? {} : { parentId: String(row.parentId) === '0' ? '0' : publicStockId(row.parentId) }) }
  })
}

/** 独立匿名列表，不调用原ProductController或价格接口。 */
export async function getPublicStockList(params = {}) {
  const categoryId = params.categoryId == null ? null : publicStockId(params.categoryId)
  if (categoryId === '') return invalid()
  const data = await dispatch('MallProduct', CONTROLLER, 'GetList', {
    ...paging(params), ...publicStockAccessParams(), ...(params.hasImage === true ? { HasImage: true } : {}), CategoryId: categoryId, Keyword: String(params.keyword ?? '').trim().slice(0, 60),
  }, OPTIONS)
  return page(data, product)
}

/** 每次详情从后端复核范围，页面ID不是任何下单授权。 */
export async function getPublicStockDetail(params = {}) {
  const productId = publicStockId(params.productId)
  if (!productId) return invalid()
  const data = await dispatch('MallProduct', CONTROLLER, 'GetDetail', { ...paging(params), ...publicStockAccessParams(), ProductId: productId }, OPTIONS)
  const header = product(data?.product)
  if (header.productId !== productId) return invalid()
  return { product: header, skus: page(data?.skus, sku) }
}
