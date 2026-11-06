import { publicShareUrl } from '../config/sharePublicRoutes.js'
import { SHARE_RETAIL, routes } from '../config/routes.js'
const CODE = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/
const DRAFT = /^[a-f0-9]{32}$/
const PENDING_PREFIX = 'share.pending.'
const OWNER_PREFIX = 'share.owner.v1.'
/** 早于Uni路由取出fragment原码；原码不放URL或日志，待兑换记录仅在标签页暂存60秒。 */
export function createShareLanding(win, enabled) {
  const pending = new Map(), taken = new Set()
  let installed = false, pendingTimer = null
  /** URL只保留公开定位符和非敏感草稿ID。 */
  function replace(route) { win.history.replaceState(win.history.state, '', win.location.pathname + '#' + publicShareUrl(route)) }
  /** 标签页短期恢复待兑换入口；存储不可用时仍可在当前文档兑换。 */
  function stored(entry, remove = false) {
    try {
      const key = PENDING_PREFIX + entry, raw = win.sessionStorage?.getItem(key)
      if (remove) win.sessionStorage?.removeItem(key)
      const value = raw ? JSON.parse(raw) : null
      return value && CODE.test(value.token) && value.clientRequestId === entry && value.draftId === entry && value.until > Date.now() && value.until <= Date.now() + 60000 ? value : null
    } catch { return null }
  }
  /** 原码无论有效与否立即清址，只有HTTPS分享构建可兑换。 */
  function capture() {
    if (win?.location?.hash && publicShareUrl(win.location.hash.slice(1)) !== win.location.hash.slice(1)) replace(win.location.hash.slice(1))
    if (!win?.location?.hash?.startsWith('#/s/')) return false
    const value = win.location.hash.slice(4)
    clear()
    if (!enabled || win.location.protocol !== 'https:' || !CODE.test(value) || !win.crypto?.getRandomValues) {
      replace(SHARE_RETAIL); return true
    }
    const bytes = new Uint8Array(16)
    try { win.crypto.getRandomValues(bytes) } catch { replace(SHARE_RETAIL); return true }
    const nonce = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
    const intent = { token: value, clientRequestId: nonce, draftId: nonce, until: Date.now() + 60000 }
    pending.set(nonce, intent)
    try { win.sessionStorage?.setItem(PENDING_PREFIX + nonce, JSON.stringify(intent)) } catch { /* 当前文档仍可兑换。 */ }
    if (win.setTimeout) pendingTimer = win.setTimeout(() => { stored(nonce, true); clear() }, 60000)
    replace(routes.share.retail({ entry: nonce }))
    return true
  }
  /** 单次移交给当前页，响应未知时由原页保留原键显式重试。 */
  function take(entry) {
    if (taken.has(entry)) return null
    const value = pending.get(entry) || stored(entry); pending.delete(entry); taken.add(entry)
    return value && value.until > Date.now() ? { token: value.token, clientRequestId: value.clientRequestId, draftId: value.draftId } : null
  }
  /** 只有当前原始入口仍匹配，才能提交规范定位路由，避免迟到响应覆盖新链接。 */
  function accepted(entry, contextId, draftId) {
    if (!CODE.test(contextId) || !DRAFT.test(draftId)) return false
    const current = win.location.hash.slice(1).replace(/^\/shop(?=\?|$)/, SHARE_RETAIL)
    if (entry && current !== routes.share.retail({ entry })) return false
    stored(entry, true)
    replace(routes.share.retail({ contextId, draftId })); return true
  }
  /** 用公开链接摘要在当前标签页保存无凭据订单定位，避免重开链接时创建新访客。 */
  async function linkKey(token) {
    if (!CODE.test(token) || !win.crypto?.subtle || !win.TextEncoder) return ''
    const digest = await win.crypto.subtle.digest('SHA-256', new win.TextEncoder().encode(token))
    return OWNER_PREFIX + [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
  }
  /** 同一浏览器恢复购物草稿定位，重开链接仍由服务端确认期限。 */
  async function restore(token) {
    const key = await linkKey(token)
    if (!key) return null
    try {
      const value = JSON.parse(win.localStorage?.getItem(key) || 'null')
      if (!value || !CODE.test(value.contextId) || !DRAFT.test(value.draftId)
        || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) {
        win.localStorage?.removeItem(key)
        return null
      }
      return { contextId: value.contextId, draftId: value.draftId }
    } catch { return null }
  }
  /** 在链接有效期内记住购物草稿定位，不存原分享码、CSRF或订单数据。 */
  async function remember(token, locator, expiresAtUtc) {
    const key = await linkKey(token)
    const expiresAt = Date.parse(expiresAtUtc)
    if (!key || !CODE.test(locator?.contextId) || !DRAFT.test(locator?.draftId) || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false
    try { win.localStorage?.setItem(key, JSON.stringify({ ...locator, expiresAt })); return true } catch { return false }
  }
  /** 已加载文档再次收到扫码fragment时重新启动，避免Uni复用旧页面实例和旧访客。 */
  function hashChanged(event) {
    if (!win.location.hash.startsWith('#/s/')) return
    event?.stopImmediatePropagation?.()
    clear()
    win.location.reload()
  }
  /** 安装早期捕获；主包仅加载此小型路由适配，不加载零售分包。 */
  function install() {
    if (installed) return
    installed = true
    // 每次文档启动清除过期待兑换原码，不延长刷新期限。
    try {
      const storage = win.sessionStorage
      for (let i = (storage?.length || 0) - 1; i >= 0; i--) {
        const key = storage.key(i)
        if (key?.startsWith(PENDING_PREFIX)) {
          let value; try { value = JSON.parse(storage.getItem(key)) } catch {}
          if (!value || value.until <= Date.now() || value.until > Date.now() + 60000) storage.removeItem(key)
        }
      }
    } catch { /* 禁用存储不阻止当前文档访问。 */ }
    capture()
    const entry = new URLSearchParams(win.location.hash.split('?')[1] || '').get('entry')
    const intent = entry && stored(entry)
    if (intent && pendingTimer === null && win.setTimeout) pendingTimer = win.setTimeout(() => stored(entry, true), Math.max(0, intent.until - Date.now()))
    win.addEventListener('hashchange', hashChanged, true)
    win.addEventListener('pagehide', clear)
  }
  /** 离开文档清除内存；待兑换暂存仅用于原标签页刷新。 */
  function clear() { pending.clear(); if (pendingTimer !== null) win.clearTimeout?.(pendingTimer); pendingTimer = null }
  /** 测试/生命周期释放，只影响本捕获器。 */
  function dispose() {
    clear(); win.removeEventListener('hashchange', hashChanged, true); win.removeEventListener('pagehide', clear); installed = false
  }
  return { capture, take, accepted, restore, remember, install, clear, dispose }
}
