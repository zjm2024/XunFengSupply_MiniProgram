import { dispatch } from '@/shared/api/dispatchClient.js'
import { AppError, ErrorKind } from '@/shared/api/appError.js'
import { shareId, shareMoney, shareUtc, shareUrl } from '../model/dealerShareValues.js'
const CONTROLLER = 'Mini.DealerShareController'
const OPTIONS = Object.freeze({ timeout: 15000 })
/** 协议不完整就失败，不伪造可分享或剩余额度。 */
function invalid() { throw new AppError('', ErrorKind.BUSINESS, { errorCode: 'DEALER_SHARE_RESPONSE_INVALID', messageKey: 'share.dealer.invalidResponse' }) }
/** 安全整型计数不能溢出或为负。 */
function count(value) { if (!Number.isSafeInteger(value) || value < 0) return invalid(); return value }
/** 配置与能力严格区分，错误字符串不被强转true。 */
function boolean(value) { if (typeof value !== 'boolean') return invalid(); return value }
/** 拒绝异常原因数据，未知新增安全码由页面显示通用不可用。 */
function reasons(value) {
  if (!Array.isArray(value) || value.some(code => typeof code !== 'string' || !/^[A-Z_]{1,60}$/.test(code))) return invalid()
  return [...value]
}
/** 记录显式投影，额外采购/令牌/地址字段永不进入页面模型。 */
export function normalizeShareRecord(row) {
  const shareLinkId = shareId(row?.shareLinkId), createdByCustomerId = shareId(row?.createdByCustomerId), version = shareId(row?.version)
  const orderId = row?.orderId == null ? null : shareId(row.orderId)
  const maximumOrderAmount = shareMoney(row?.maximumOrderAmount), createdAt = shareUtc(row?.createdAt), expiresAt = shareUtc(row?.expiresAt)
  if (!shareLinkId || !createdByCustomerId || !version || orderId === '' || !maximumOrderAmount || maximumOrderAmount === '0.00'
    || !createdAt || !expiresAt || Date.parse(expiresAt) <= Date.parse(createdAt)
    || ![1, 2, 3, 4, 5, 6].includes(row?.state) || row?.scope !== 1
    || !Number.isInteger(row.maximumItemLines) || row.maximumItemLines < 1 || row.maximumItemLines > 100
    || !Number.isInteger(row.maximumQuantityPerSku) || row.maximumQuantityPerSku < 1 || row.maximumQuantityPerSku > 9999) return invalid()
  return { shareLinkId, createdByCustomerId, version, orderId, maximumOrderAmount, createdAt, expiresAt,
    title: String(row.title ?? ''), state: row.state, scope: row.scope,
    maximumItemLines: row.maximumItemLines, maximumQuantityPerSku: row.maximumQuantityPerSku,
    visitCount: count(row.visitCount), canReveal: boolean(row.canReveal), canRevoke: boolean(row.canRevoke) }
}
/** 显式重显结果只在调用栈/页面内存中保留，不写缓存。 */
function reveal(data) {
  const record = normalizeShareRecord(data?.record)
  const url = data?.url == null ? null : shareUrl(data.url, true)
  if (url === '' || (record.canReveal && !url) || (!record.canReveal && url)) return invalid()
  return { record, url }
}
/** 使用登录请求，不通过公开库存匿名选项获取主/子账号能力。 */
export async function getDealerShareCapabilities() {
  const data = await dispatch('MallOrder', CONTROLLER, 'GetCapabilities', {}, OPTIONS)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data?.businessDate ?? '')) return invalid()
  const result = {
    publicStockShareConfiguredEnabled: boolean(data.publicStockShareConfiguredEnabled), canSharePublicStock: boolean(data.canSharePublicStock),
    publicStockDisabledReasons: reasons(data.publicStockDisabledReasons), retailShareConfiguredEnabled: boolean(data.retailShareConfiguredEnabled),
    canCreateRetailShare: boolean(data.canCreateRetailShare), dailyCreateLimit: count(data.dailyCreateLimit),
    todayCreatedCount: count(data.todayCreatedCount), remainingCreateCount: count(data.remainingCreateCount),
    currentActiveRetailCount: count(data.currentActiveRetailCount), businessDate: data.businessDate, retailDisabledReasons: reasons(data.retailDisabledReasons),
  }
  for (const field of ['totalRetailCount', 'totalVisitCount', 'boundOrderCount']) {
    if (data[field] != null) result[field] = count(data[field])
  }
  if ((result.canSharePublicStock && (!result.publicStockShareConfiguredEnabled || result.publicStockDisabledReasons.length))
    || (result.canCreateRetailShare && (!result.retailShareConfiguredEnabled || !result.remainingCreateCount || result.retailDisabledReasons.length))) return invalid()
  return result
}
/** 每次复制统一公开入口都由服务端复核当前权限和开关。 */
export async function getDealerPublicStockEntry() {
  const data = await dispatch('MallOrder', CONTROLLER, 'GetPublicStockEntry', {}, OPTIONS)
  const url = shareUrl(data?.url)
  if (!url) return invalid()
  const expires = url.match(/&expires=(\d{10})$/)
  return expires ? { url, expiresAt: new Date(Number(expires[1]) * 1000).toISOString() } : { url }
}
/** 请求白名单排除主体、金额及客户端令牌。 */
export async function createDealerRetailShare(params) {
  return reveal(await dispatch('MallOrder', CONTROLLER, 'Create', { ClientRequestId: params.clientRequestId, Title: String(params.title ?? '') }, OPTIONS))
}
/** 稳定分页，不允许通过查询参数指定另一个账号。 */
export async function getDealerShareRecords(params = {}) {
  const pageNum = Math.max(1, Math.min(10000, Number(params.pageNum) || 1))
  const filters = { all: 0, active: 1, ordered: 2, paid: 3, closed: 4 }
  if (params.filter !== undefined && !Object.hasOwn(filters, params.filter)) return invalid()
  const query = { PageNum: Math.trunc(pageNum), PageSize: 20 }
  if (params.filter && params.filter !== 'all') query.Filter = filters[params.filter]
  const data = await dispatch('MallOrder', CONTROLLER, 'GetList', query, OPTIONS)
  if (!Array.isArray(data?.items) || data.items.length > 20 || data.pageNum !== Math.trunc(pageNum) || data.pageSize !== 20) return invalid()
  return { items: data.items.map(normalizeShareRecord), totalCount: count(data.totalCount), pageNum: data.pageNum, pageSize: 20 }
}
/** 只以记录ID重显，URI由服务端原授权恢复，不在前端拼Token。 */
export async function revealDealerShare(params) {
  const shareLinkId = shareId(params.shareLinkId)
  if (!shareLinkId) return invalid()
  return reveal(await dispatch('MallOrder', CONTROLLER, 'Reveal', { ShareLinkId: shareLinkId }, OPTIONS))
}
/** 撤销传精确版本及原请求键，不能作为取消正式订单入口。 */
export async function revokeDealerShare(params) {
  const shareLinkId = shareId(params.shareLinkId), expectedVersion = shareId(params.expectedVersion)
  if (!shareLinkId || !expectedVersion) return invalid()
  return normalizeShareRecord(await dispatch('MallOrder', CONTROLLER, 'Revoke', {
    ShareLinkId: shareLinkId, ExpectedVersion: expectedVersion, ClientRequestId: params.clientRequestId, Reason: String(params.reason ?? ''),
  }, OPTIONS))
}
