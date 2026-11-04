import { dispatch } from '@/shared/api/dispatchClient.js'
import { shareAccessCode } from './shareAccessApi.js'
import { shareId, shareMoney, shareUtc } from '../model/dealerShareValues.js'
/** 独立分享交易会话，不使用经销商JWT或外部订单ID。 */
function options(access) {
  if (!shareAccessCode(access?.contextId) || !shareAccessCode(access?.csrfToken)) throw new TypeError('Invalid share context')
  return { shareSession: true, anonymous: true, authStrategy: 'passive', timeout: 15000,
    header: { 'X-Share-Context': access.contextId, 'X-Share-CSRF': access.csrfToken } }
}
/** 请求仅包含服务端预览定位、内容指纹、修订及稳定幂等键。 */
function intent(value) {
  if (!shareAccessCode(value?.previewId) || !/^[a-f0-9]{64}$/.test(value?.quoteFingerprint || '')
    || !Number.isSafeInteger(value?.localCartRevision) || value.localCartRevision < 0
    || !/^[A-Za-z0-9_-]{16,64}$/.test(value?.clientRequestId || '')) throw new TypeError('Invalid share intent')
  return { PreviewId: value.previewId, QuoteFingerprint: value.quoteFingerprint, LocalCartRevision: value.localCartRevision, ClientRequestId: value.clientRequestId }
}
/** 只返回安全订单号、真实金额与服务端订单、付款和履约状态。 */
function order(value) {
  const orderId = shareId(value?.orderId), payableAmount = shareMoney(value?.payableAmount), paymentExpiresAtUtc = shareUtc(value?.paymentExpiresAtUtc), serverNowUtc = shareUtc(value?.serverNowUtc)
  if (!orderId || !payableAmount || !paymentExpiresAtUtc || !serverNowUtc || typeof value.orderNo !== 'string'
    || ![20,40,60,90,91].includes(value.orderStatus) || !Number.isInteger(value.paymentStatus)) throw new TypeError('Invalid share order')
  return { orderId, orderNo: value.orderNo, payableAmount, paymentExpiresAtUtc, serverNowUtc, orderStatus: value.orderStatus, paymentStatus: value.paymentStatus, fulfillmentStatus: Number.isInteger(value.fulfillmentStatus) ? value.fulfillmentStatus : 0 }
}
/** 原意图重复准备只取同一票据，秘密只在调用闭包中保留。 */
export async function prepareShareOrder(access, value) {
  const row = await dispatch('MallOrder', 'Mini.ShareOrderController', 'Prepare', intent(value), options(access))
  if (!shareAccessCode(row?.submitTicket) || !shareUtc(row?.expiresAtUtc)) throw new TypeError('Invalid share ticket')
  return row.submitTicket
}
/** 网络未知必须复用原请求和票据，不能换键自动再建单。 */
export async function createShareOrder(access, value, ticket) {
  if (!shareAccessCode(ticket)) throw new TypeError('Invalid share ticket')
  return order(await dispatch('MallOrder', 'Mini.ShareOrderController', 'Create', { ...intent(value), SubmitTicket: ticket }, options(access)))
}
/** 当前订单完全由原Cookie绑定，不传客户端订单定位符。 */
export async function getCurrentShareOrder(access) {
  const row = await dispatch('MallOrder', 'Mini.ShareOrderController', 'GetCurrent', {}, options(access))
  if (!Array.isArray(row?.items) || row.items.length > 100) throw new TypeError('Invalid share items')
  return { cancellationState: row.cancellationState, cancellationNo: typeof row.cancellationNo === 'string' ? row.cancellationNo : '', canCancel: row.canCancel === true, refundState: Number(row.refundState || 0), warehouseReleaseState: row.warehouseReleaseState, order: order(row.order), receiver: row.receiverName ? { name: String(row.receiverName), phone: String(row.receiverPhone || ''), address: String(row.receiverAddress || '') } : null, items: row.items.map(item => {
    const skuId = shareId(item.skuId), unitPrice = shareMoney(item.unitPrice), lineAmount = shareMoney(item.lineAmount)
    if (!skuId || !unitPrice || !lineAmount || !Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new TypeError('Invalid share item')
    let spec = ''; try { spec = JSON.parse(item.specSnapshot)?.description || '' } catch { /* 历史快照无规格时回退空文本。 */ }
    return { skuId, imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : '', productName: String(item.productName || ''), specDesc: String(spec), quantity: item.quantity, unitPrice, lineAmount }
  }) }
}

/** 原会话只能取消自己绑定的订单；幂等范围由服务端原订单决定。 */
export function cancelCurrentShareOrder(access) {
  return dispatch('MallOrder','Mini.ShareOrderController','Cancel',{},options(access))
}
