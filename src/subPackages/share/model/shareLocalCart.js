import storage from '@/shared/utils/storage.js'

const SCHEMA_VERSION = 1
const KEY_PREFIX = 'share_cart_v1:'
const MAX_LINES = 100
const MAX_QUANTITY = 9999
const MAX_SKU_ID = '9223372036854775807'

/** 验证字符串ID，避免将长整型编号转成有损的Number。 */
function isSkuId(value) {
  return typeof value === 'string'
    && /^[1-9]\d{0,18}$/.test(value)
    && (value.length < MAX_SKU_ID.length || value <= MAX_SKU_ID)
}

/** 只复制购物意向白名单字段，价格、凭证及收件资料不进入草稿。 */
function normalizeItem(item) {
  if (!item || !isSkuId(item.skuId)
    || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY
    || typeof item.selected !== 'boolean') {
    throw new TypeError('Invalid share cart item.')
  }
  return { skuId: item.skuId, quantity: item.quantity, selected: item.selected }
}

/** 校验UTC绝对时间；本地期限仅用于清理，不能作为服务端授权。 */
function parseUtc(value) {
  if (typeof value !== 'string' || !/Z$/.test(value)) throw new TypeError('UTC timestamp required.')
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw new TypeError('Invalid UTC timestamp.')
  return timestamp
}

/** 为一个公开分享与非敏感浏览器草稿定位创建独立缓存键。 */
export function getShareCartStorageKey(shareId, draftId) {
  if (!isSkuId(shareId) || typeof draftId !== 'string' || !/^[a-f0-9]{32}$/.test(draftId)) {
    throw new TypeError('Invalid share cart namespace.')
  }
  return KEY_PREFIX + shareId + ':' + draftId
}

/**
 * 管理浏览器本地分享购物车，不读写普通采购购物车或调用业务API。
 * 初始化须先取得服务端有效分享状态；跨标签页采用最后写入草稿，不承诺事务合并。
 */
export function createShareLocalCart({
  shareId,
  draftId,
  expiresAtUtc,
  serverNowUtc,
  storageAdapter = storage,
  clock = () => Date.now(),
  eventTarget = typeof window === 'undefined' ? null : window,
}) {
  const key = getShareCartStorageKey(shareId, draftId)
  const allowedExpiry = parseUtc(expiresAtUtc)
  const serverStart = parseUtc(serverNowUtc)
  const localStart = clock()
  const listeners = new Set()
  let latestNow = serverStart
  let items = []
  let revision = 0
  let expiry = allowedExpiry
  let updatedAt = serverStart
  let closed = false
  let disposed = false
  let persistenceAvailable = true
  let listening = false
  let reason = null

  /** 用本次服务器时间和非递减本地耗时清理缓存，页面恢复时仍须重新请求授权。 */
  function now() {
    latestNow = Math.max(latestNow, serverStart + Math.max(0, clock() - localStart))
    return latestNow
  }

  /** 删除仅当前分享草稿；失败交由状态提示，不清空其他业务缓存。 */
  function removeStored() {
    try {
      if (storageAdapter.remove(key) !== true) persistenceAvailable = false
    } catch {
      persistenceAvailable = false
    }
  }

  /** 输出独立副本，防止调用方通过返回引用写入未校验字段。 */
  function snapshot() {
    return {
      items: items.map(item => ({ ...item })),
      localCartRevision: revision,
      expiresAtUtc: new Date(expiry).toISOString(),
      canEdit: !closed && !disposed,
      persistenceAvailable,
      invalidReason: reason,
    }
  }

  /** 通知页面清除旧预览，事件中不传凭证或收件数据。 */
  function notify() {
    const state = snapshot()
    listeners.forEach(listener => listener(state))
  }

  /** 对服务端已确认的失效状态关闭本实例并清理草稿。 */
  function invalidate(invalidReason = 'unavailable') {
    if (disposed || closed) return snapshot()
    items = []
    revision += 1
    closed = true
    reason = invalidReason
    removeStored()
    notify()
    return snapshot()
  }

  /** 截止时关闭本地编辑；禁止本地加购和刷新延长有效期。 */
  function checkExpiry() {
    if (!closed && now() >= expiry) invalidate('expired')
    return !closed && !disposed
  }

  /** 只持久化白名单草稿，写入失败后保留当前内存选购并尝试删除旧副本。 */
  function persist(previousRecord) {
    const record = {
      schemaVersion: SCHEMA_VERSION,
      shareId,
      draftId,
      expiresAtUtc: new Date(expiry).toISOString(),
      updatedAtUtc: new Date(updatedAt).toISOString(),
      localCartRevision: revision,
      items: items.map(item => ({ ...item })),
    }
    if (previousRecord && JSON.stringify(previousRecord) === JSON.stringify(record)) return
    try {
      if (storageAdapter.set(key, record) === true) return
    } catch {
      // 存储被禁用或配额不足时，当前选购仍可留在内存完成结算。
    }
    persistenceAvailable = false
    removeStored()
  }

  /** 恢复并清洗同命名空间草稿；损坏或未知版本数据直接丢弃。 */
  function restore() {
    if (!checkExpiry() || !persistenceAvailable) return snapshot()
    let record
    try {
      record = storageAdapter.get(key, null)
      if (record == null) {
        items = []
        revision = 0
        return snapshot()
      }
      if (record.schemaVersion !== SCHEMA_VERSION || record.shareId !== shareId || record.draftId !== draftId
        || !Array.isArray(record.items) || record.items.length > MAX_LINES
        || !Number.isSafeInteger(record.localCartRevision) || record.localCartRevision < 0
        || record.localCartRevision >= Number.MAX_SAFE_INTEGER) {
        throw new TypeError('Invalid share cart draft.')
      }
      const restoredExpiry = parseUtc(record.expiresAtUtc)
      const restoredUpdatedAt = parseUtc(record.updatedAtUtc)
      const restoredItems = record.items.map(normalizeItem)
      if (new Set(restoredItems.map(item => item.skuId)).size !== restoredItems.length) {
        throw new TypeError('Duplicate SKU in share cart.')
      }
      expiry = Math.min(expiry, restoredExpiry)
      if (!checkExpiry()) return snapshot()
      items = restoredItems
      revision = record.localCartRevision
      updatedAt = Math.min(restoredUpdatedAt, now())
      persist(record)
    } catch {
      items = []
      revision = 0
      removeStored()
    }
    return snapshot()
  }

  /** 修改商品前吸收其他标签页的最近草稿，不把本地修订号当服务端锁。 */
  function beginEdit() {
    if (!checkExpiry()) throw new Error('Share cart is unavailable.')
    if (persistenceAvailable) restore()
    if (!checkExpiry()) throw new Error('Share cart is unavailable.')
  }

  /** 更新SKU数量与选择，额外字段不会被保存；数量上限仍需服务端独立校验。 */
  function setItem(item) {
    const nextItem = normalizeItem(item)
    beginEdit()
    const index = items.findIndex(current => current.skuId === nextItem.skuId)
    if (index < 0 && items.length >= MAX_LINES) throw new RangeError('Share cart line limit exceeded.')
    if (index < 0) items.push(nextItem)
    else items[index] = nextItem
    revision += 1
    updatedAt = now()
    persist()
    notify()
    return snapshot()
  }

  /** 删除当前草稿中的单个SKU。 */
  function removeItem(skuId) {
    if (!isSkuId(skuId)) throw new TypeError('Invalid SKU.')
    beginEdit()
    items = items.filter(item => item.skuId !== skuId)
    revision += 1
    updatedAt = now()
    persist()
    notify()
    return snapshot()
  }

  /** 清空选购而不改变服务端分享状态。 */
  function clear() {
    beginEdit()
    items = []
    revision += 1
    updatedAt = now()
    persist()
    notify()
    return snapshot()
  }

  /** 获取规范化勾选商品，用于独立预览API；不包含价格或身份。 */
  function getCheckoutItems() {
    if (!checkExpiry()) return []
    return items.filter(item => item.selected).map(item => ({ skuId: item.skuId, quantity: item.quantity }))
  }

  /** 接收同源标签页草稿变化；忽略其他分享和其他业务存储。 */
  function handleStorage(event) {
    if (disposed || closed || !persistenceAvailable) return
    const fullKey = (storageAdapter.prefix || '') + key
    if (event.key !== null && event.key !== fullKey) return
    restore()
    notify()
  }

  /** 注册草稿变化回调以使页面旧预览失效，返回解除订阅函数。 */
  function subscribe(listener) {
    if (typeof listener !== 'function' || disposed) throw new TypeError('Active listener required.')
    listeners.add(listener)
    if (!listening && eventTarget?.addEventListener) {
      eventTarget.addEventListener('storage', handleStorage)
      listening = true
    }
    return () => listeners.delete(listener)
  }

  /** 页面卸载时取消事件监听，不删除仍有效的本地草稿。 */
  function dispose() {
    if (listening) eventTarget.removeEventListener('storage', handleStorage)
    listeners.clear()
    disposed = true
  }

  restore()

  return {
    /** 读取经过到期检查的本地状态副本。 */
    getSnapshot() {
      checkExpiry()
      return snapshot()
    },
    refresh: restore,
    setItem,
    removeItem,
    clear,
    invalidate,
    getCheckoutItems,
    subscribe,
    dispose,
  }
}
