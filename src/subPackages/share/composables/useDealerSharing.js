import { reactive } from 'vue'
import * as api from '../api/dealerShareApi.js'
import { createShareIntentStore, newShareRequestId } from '../model/dealerShareIntent.js'

/** 分享页面独立状态，敏感URI仅在内存；生命周期变化使迟到响应失效。 */
export function useDealerSharing(getIdentity, options = {}) {
  const remote = options.api || api
  const state = reactive({ capabilities: null, records: [], loading: false, busy: false, failed: false,
    historyFailed: false, actionFailed: false, capabilitiesError: null, historyError: null, actionError: null,
    qr: null, title: '', pendingCreate: false, page: 0, total: 0 })
  let epoch = 0, active = true, disposed = false
  const revokes = new Map(), stores = new Map()
  /** 每次请求捕获账号上下文，不把Token作为存储键或页面数据。 */
  function context() {
    const identity = getIdentity()
    return { identity, key: [identity.dealerId, identity.userId, identity.sessionVersion].join(':'), epoch }
  }
  /** 主体/账号/会话变更及页面隐藏后的响应均不可写入当前界面。 */
  function current(c) { return !disposed && active && c.epoch === epoch && c.key === context().key }
  /** 当前账号仅恢复安全的创建意图，不恢复URI或二维码。 */
  function intent(c) {
    const key = [c.identity.dealerId, c.identity.userId].join(':')
    if (!stores.has(key)) stores.set(key, createShareIntentStore(c.identity, options.storage))
    return stores.get(key)
  }
  /** 刷新能力和历史；历史无权限不连带关闭已授权的公共入口。 */
  async function load(append = false) {
    if (disposed || !active || state.busy || state.loading) return
    if (append && (state.page < 1 || state.page >= 10000 || state.page * 20 >= state.total)) return
    const c = context()
    state.loading = true; state.failed = false; state.historyFailed = false
    state.capabilitiesError = null; state.historyError = null
    if (!append) { state.capabilities = null; state.records = []; state.page = 0; state.total = 0 }
    try {
      if (!append && options.loadCapabilities !== false) {
        // 本地写入意图异常不能阻断额度和只读记录查询。
        try {
          const pending = intent(c).read()
          if (current(c)) { state.pendingCreate = !!pending; if (pending) state.title = pending.title }
        } catch { if (current(c)) state.pendingCreate = false }
        try {
          const capabilities = await remote.getDealerShareCapabilities()
          if (!current(c)) return
          state.capabilities = capabilities
        } catch (error) {
          if (!current(c)) return
          state.failed = true; state.capabilitiesError = error
        }
      }
      if (c.identity.canView && options.loadRecords !== false) {
        try {
          const query = { pageNum: append ? state.page + 1 : 1 }
          if (options.recordFilter) query.filter = options.recordFilter()
          const page = await remote.getDealerShareRecords(query)
          if (!current(c)) return
          state.records = append ? [...state.records, ...page.items].filter((row, index, rows) => rows.findIndex(other => other.shareLinkId === row.shareLinkId) === index) : page.items
          state.page = page.pageNum; state.total = page.totalCount
        } catch (error) { if (current(c)) { state.historyFailed = true; state.historyError = error; if (!append) state.records = [] } }
      }
    }
    finally { if (current(c)) state.loading = false }
  }
  /** 在同一生命周期内执行一次按钮动作，异常不记录敏感响应。 */
  async function action(work) {
    if (state.busy || !active || disposed) return
    const c = context(); state.busy = true; state.actionFailed = false; state.actionError = null
    try { await work(c) } catch (error) { if (current(c)) { state.actionFailed = true; state.actionError = error } }
    finally { if (current(c)) state.busy = false }
  }
  /** 生成结果未知继续保存原请求键；有效成功响应后才清理。 */
  async function create() {
    await action(async c => {
      const store = intent(c), pending = store.begin(state.title)
      state.title = pending.title; state.pendingCreate = true
      const result = await remote.createDealerRetailShare(pending)
      if (!current(c)) return
      store.complete(); state.pendingCreate = false
      state.qr = result.url ? { url: result.url, title: result.record.title, expiresAt: result.record.expiresAt, retail: true } : null
      state.records = [result.record, ...state.records.filter(row => row.shareLinkId !== result.record.shareLinkId)]
    })
    if (active && !state.busy && !state.actionFailed) await load()
  }
  /** 统一公开地址每次从已登录独立端点获取，不携带经销商参数。 */
  async function publicStock() {
    await action(async c => {
      const result = await remote.getDealerPublicStockEntry()
      if (current(c)) state.qr = { url: result.url, title: '', expiresAt: result.expiresAt || null, retail: false }
    })
  }
  /** 历史记录不含Token，必须调用专用重显端点取得当前有效原码。 */
  async function reveal(row) {
    await action(async c => {
      const result = await remote.revealDealerShare({ shareLinkId: row.shareLinkId })
      if (!current(c)) return
      state.qr = result.url ? { url: result.url, title: result.record.title, expiresAt: result.record.expiresAt, retail: true } : null
      state.records = state.records.map(item => item.shareLinkId === row.shareLinkId ? result.record : item)
    })
  }
  /** 固定审核原因和原版本/请求键使未知撤销响应可安全重试。 */
  async function revoke(row) {
    await action(async c => {
      let request = revokes.get(row.shareLinkId)
      if (!request) {
        request = { shareLinkId: row.shareLinkId, expectedVersion: row.version, clientRequestId: newShareRequestId(), reason: '经销商主动撤销' }
        revokes.set(row.shareLinkId, request)
      }
      const record = await remote.revokeDealerShare(request)
      if (!current(c)) return
      revokes.delete(row.shareLinkId); state.qr = null
      state.records = state.records.map(item => item.shareLinkId === row.shareLinkId ? record : item)
    })
    if (active && !state.busy && !state.actionFailed) await load()
  }
  /** 隐藏、退出或切号即时清敏感数据，不取消已经送达服务端的幂等请求。 */
  function deactivate() {
    active = false; epoch++; state.qr = null; state.capabilities = null
    state.records = []; state.loading = false; state.busy = false; state.title = ''
    state.pendingCreate = false; state.failed = false; state.actionFailed = false; revokes.clear()
    state.historyFailed = false; state.capabilitiesError = null; state.historyError = null; state.actionError = null
  }
  /** 页面回到前台必须重新读取权限和状态。 */
  function activate() { if (disposed) return; active = true; return load() }
  /** 卸载后所有迟到响应只丢弃，不把URL写到别的账号。 */
  function dispose() { deactivate(); disposed = true; revokes.clear(); stores.clear() }
  return { state, load, create, publicStock, reveal, revoke, deactivate, activate, dispose }
}
