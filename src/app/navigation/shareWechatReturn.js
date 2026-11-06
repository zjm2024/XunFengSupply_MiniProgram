import { publicShareUrl } from '../config/sharePublicRoutes.js'

const KEY = 'share.wechat.return.v1'
const RETURN_TTL = 300000
const CONTEXT = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/
const DRAFT = /^[a-f0-9]{32}$/
let returned = null

/** 只读取分享订单的公开定位，原访客 Cookie 仍由服务端验证。 */
function readLocator(hash) {
  const [path, search] = publicShareUrl(String(hash || '').replace(/^#/, '')).split('?')
  if (!['/shop', '/shop/search'].includes(path)) return null
  const query = new URLSearchParams(search)
  const contextId = query.get('contextId'), draftId = query.get('draftId')
  if (!CONTEXT.test(contextId || '') || !DRAFT.test(draftId || '')) return null
  return { contextId, draftId }
}

/** 授权跳转前保存短期定位。浏览器存储用于微信重新创建页面的回跳。 */
export function rememberWechatReturn(win, authorizationUrl) {
  const url = new URL(authorizationUrl)
  const state = url.searchParams.get('state')
  if (url.origin !== 'https://open.weixin.qq.com' || url.pathname !== '/connect/oauth2/authorize' || !state)
    throw Error('微信授权入口无效')
  const locator = readLocator(win.location.hash)
  if (!locator) throw Error('订单恢复入口无效')
  const value = JSON.stringify({ ...locator, state, until: Date.now() + RETURN_TTL })
  let saved = false
  for (const key of ['sessionStorage', 'localStorage']) {
    try {
      if (!win[key]) continue
      win[key].setItem(KEY, value)
      saved = true
    } catch { /* 另一种浏览器存储仍可支持回跳。 */ }
  }
  if (!saved) throw Error('当前浏览器无法保存订单回跳，请允许网站存储后重试')
}

/** 读取短期记录，只有当前标签页或匹配回跳 state 的浏览器记录可以恢复定位。 */
function readReturn(win, key, state) {
  try {
    const storage = win[key]
    const value = JSON.parse(storage?.getItem(KEY) || 'null')
    const now = Date.now()
    // 兼容部署前已发起的授权，旧记录保存的是完整公开路由。
    const legacyHash = typeof value?.route === 'string' ? value.route.split('#')[1] : ''
    const locator = readLocator(legacyHash) || value
    const valid = locator && CONTEXT.test(locator.contextId || '') && DRAFT.test(locator.draftId || '')
      && value.until > now && value.until <= now + RETURN_TTL
    if (key === 'localStorage' && valid && value.state !== state) return null
    storage?.removeItem(KEY)
    return valid ? { contextId: locator.contextId, draftId: locator.draftId, state: value.state } : null
  } catch { return null }
}

/** 在路由守卫前清掉授权参数。取消或无效授权也应回原订单，只有匹配 state 的 code 才会提交。 */
export function captureWechatReturn(win) {
  const query = new URLSearchParams(win.location.search)
  if (query.get('share_wx') !== '1') return false
  const state = query.get('state')
  const tab = readReturn(win, 'sessionStorage', state)
  const browser = readReturn(win, 'localStorage', state || tab?.state)
  const matched = [tab, browser].find(value => value && value.state === state)
  const locator = matched || tab || readLocator(win.location.hash)
  const code = query.get('code')
  returned = matched && code ? { code, state } : null
  const route = locator ? '#/shop?contextId=' + locator.contextId + '&draftId=' + locator.draftId : '#/shop'
  win.history.replaceState(win.history.state, '', win.location.pathname + route)
  return true
}
/** 单次交给恢复后的原访客付款编排，其他组件不可重放。 */
export function takeWechatReturn(){const value=returned;returned=null;return value}
