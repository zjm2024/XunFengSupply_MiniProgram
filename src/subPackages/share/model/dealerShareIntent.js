import storage from '@/shared/utils/storage.js'
import { AppError, ErrorKind } from '@/shared/api/appError.js'
import { shareId } from './dealerShareValues.js'
/** 创建幂等标识不是访问凭证；浏览器无crypto时也不用于签名或授权。 */
export function newShareRequestId() {
  return 'share_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 14) + '_' + Math.random().toString(36).slice(2, 14)
}
/** 仅持久化所属账号的待确认写请求，不保存URL、Token、价格或收件资料。 */
export function createShareIntentStore(identity, cache = storage) {
  const dealerId = shareId(identity?.dealerId), userId = shareId(identity?.userId)
  if (!dealerId || !userId) throw new AppError('', ErrorKind.BUSINESS, { errorCode:'DEALER_SHARE_ACCOUNT_INVALID', messageKey:'share.dealer.accountInvalid', retryable:false })
  const key = 'dealer_share_intent:' + dealerId + ':' + userId
  let memory = null, completedKey = null
  /** 缓存不可信，丢弃额外字段并在24小时后放弃自动恢复。 */
  function read() {
    const row = memory || cache.get(key)
    if (!row || row.clientRequestId === completedKey || !/^[A-Za-z0-9_-]{16,64}$/.test(row.clientRequestId ?? '') || typeof row.title !== 'string'
      || row.title.length > 60 || /[\u0000-\u001f\u007f]/.test(row.title)
      || !Number.isSafeInteger(row.createdAt) || row.createdAt > Date.now() || Date.now() - row.createdAt > 86400000) return null
    memory = { clientRequestId: row.clientRequestId, title: row.title, createdAt: row.createdAt }
    return { ...memory }
  }
  /** 首次写入前生成原键，之后即便结果未知也不能自动换键。 */
  function begin(title) {
    const existing = read()
    if (existing) return existing
    const value = String(title ?? '').trim().normalize('NFC')
    if (value.length > 60 || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('Invalid sharing title')
    memory = { clientRequestId: newShareRequestId(), title: value, createdAt: Date.now() }
    cache.set(key, { ...memory })
    return { ...memory }
  }
  /** 只在已得到有效成功响应后清理，重试永远回原记录。 */
  function complete() { completedKey = read()?.clientRequestId || completedKey; memory = null; cache.remove(key) }
  return { read, begin, complete }
}
