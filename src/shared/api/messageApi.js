import { dispatch } from './dispatchClient.js'
const call = (method, params = {}) => dispatch('MallDealer', 'Mini.MessageController', method, params, { authStrategy: 'passive' })
const pick = (value, camel, pascal, fallback) => value?.[camel] ?? value?.[pascal] ?? fallback
/** Normalize IDs without Number conversion; legacy template params remain display-only metadata. */
export function normalizeMessage(item = {}) {
  let params = pick(item, 'templateParams', 'TemplateParams', {})
  if (typeof params === 'string') { try { params = JSON.parse(params) } catch { params = {} } }
  const orderId = params?.orderId ?? params?.OrderId
  const billId = params?.billId ?? params?.BillId
  return {
    messageId: String(pick(item, 'messageId', 'MessageId', '')),
    title: String(pick(item, 'title', 'Title', '')),
    content: String(pick(item, 'content', 'Content', '')),
    type: Number(pick(item, 'msgType', 'MsgType', 0)),
    isRead: [true, 1, '1'].includes(pick(item, 'isRead', 'IsRead', false)),
    createdAt: pick(item, 'createdAt', 'CreatedAt', ''),
    relatedKind: pick(item, 'targetType', 'TargetType', null) || (orderId ? 'order' : billId ? 'bill' : null),
    relatedId: String(pick(item, 'targetId', 'TargetId', '') || orderId || billId || ''),
    notificationKind: pick(item, 'notificationKind', 'NotificationKind', null),
  }
}
/** Query one server-ordered page, including the combined business filter. */
export async function getMessageList(params = {}) {
  const result = await call('GetMessages', { PageNum: params.pageNum ?? 1, PageSize: params.pageSize ?? 20,
    MsgType: params.msgType ?? null, IsRead: params.isRead ?? null, BusinessOnly: params.businessOnly === true })
  return { items: pick(result, 'items', 'Items', []).map(normalizeMessage), totalCount: Number(pick(result, 'totalCount', 'TotalCount', 0)) }
}
/** Load an owned message directly, including messages older than the first page. */
export async function getMessageDetail(messageId) { return normalizeMessage(await call('GetMessageDetail', { MessageId: String(messageId) })) }
export function getUnreadCount() { return call('GetUnreadCount') }
export async function getUnreadSummary() {
  const result = await call('GetUnreadSummary')
  return { total: Number(pick(result, 'total', 'Total', 0)), byType: pick(result, 'byType', 'ByType', {}), maxMessageId: String(pick(result, 'maxMessageId', 'MaxMessageId', '0')) }
}
export function markAsRead(params) { return call('MarkRead', { MessageId: String(typeof params === 'object' ? params.messageId ?? params.MessageId : params) }) }
export function markAllAsRead(upToMessageId) { return call('MarkAllRead', { UpToMessageId: upToMessageId == null ? null : String(upToMessageId) }) }
