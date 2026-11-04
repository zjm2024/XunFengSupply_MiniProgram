import { captureWechatReturn } from './shareWechatReturn.js'
import { APP_SURFACE } from '../config/shareSurface.js'
import { STARTUP, PUBLIC_STOCK, PUBLIC_STOCK_DETAIL, SHARE_RETAIL, SHARE_RETAIL_SEARCH, PUBLIC_STOCK_SEARCH, normalizeRoutePath } from '../config/routes.js'

const CODE = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/
const DRAFT = /^[a-f0-9]{32}$/
const ACCESS = /^[A-Za-z0-9_-]{40,2048}$/

/** 解析分享页定位参数；重复参数、原码与其他用途凭据混用一律拒绝。 */
function parseRoute(route) {
  const [pathname, search = ''] = String(route || '').replace(/^#/, '').split('?')
  const query = new URLSearchParams(search)
  const keys = [...query.keys()]
  return { path: normalizeRoutePath(pathname), query, unique: new Set(keys).size === keys.length }
}

/** 判定链接用途与参数结构；只有服务端解密/兑换成功才授予数据访问。 */
export function classifyShareEntry(route) {
  const { path, query, unique } = parseRoute(route)
  if (!unique) return null
  const keys = [...query.keys()]
  if ([PUBLIC_STOCK, PUBLIC_STOCK_SEARCH, PUBLIC_STOCK_DETAIL].includes(path)
    && keys.every(key => ['access', 'expires', ...(path === PUBLIC_STOCK_DETAIL ? ['productId'] : path === PUBLIC_STOCK_SEARCH ? ['categoryId'] : [])].includes(key))
    && (!query.has('categoryId') || /^[1-9]\d{0,18}$/.test(query.get('categoryId') || ''))
    && ACCESS.test(query.get('access') || '') && /^\d{10}$/.test(query.get('expires') || '')
    && (path !== PUBLIC_STOCK_DETAIL || /^[1-9]\d{0,18}$/.test(query.get('productId') || ''))) {
    return { kind: 'stock', access: query.get('access'), expires: query.get('expires') }
  }
  if (String(route).startsWith('/s/') && CODE.test(String(route).slice(3))) return { kind: 'retail' }
  if (path === SHARE_RETAIL && keys.length === 1 && DRAFT.test(query.get('entry') || '')) {
    try {
      const entry = query.get('entry'), value = JSON.parse(window.sessionStorage.getItem('share.pending.' + entry) || 'null')
      if (value && CODE.test(value.token) && value.clientRequestId === entry && value.draftId === entry && value.until > Date.now() && value.until <= Date.now() + 60000) return { kind: 'retail' }
    } catch { /* 缺少本标签页待兑换记录时拒绝入口。 */ }
  }
  if ([SHARE_RETAIL, SHARE_RETAIL_SEARCH].includes(path) && (keys.length === 2 || (path === SHARE_RETAIL_SEARCH && keys.length === 3 && /^[1-9]\d{0,18}$/.test(query.get('categoryId') || '')))  && keys.includes('contextId') && keys.includes('draftId')
    && CODE.test(query.get('contextId') || '') && DRAFT.test(query.get('draftId') || '')) return { kind: 'retail' }
  return null
}

/** 文档内锁定初始链接用途：查询凭据不能跳到下单页，下单上下文不能跳到查询页。 */
export function createShareEntryGate(surface, initialRoute) {
  const entry = classifyShareEntry(initialRoute)
  /** 允许错误入口和同用途内部页面；任何凭据仍需服务端逐次校验。 */
  function allows(route) {
    if (surface.mode !== 'share-h5') return true
    const { path, query, unique } = parseRoute(route)
    if (path === STARTUP) return true
    if (!entry || !unique) return false
    if (entry.kind === 'stock') {
      const target = classifyShareEntry(route)
      return target?.kind === 'stock' && target.access === entry.access && target.expires === entry.expires
    }
    if (String(route).startsWith('/s/')) return CODE.test(String(route).slice(3))
    if (![SHARE_RETAIL, SHARE_RETAIL_SEARCH].includes(path) || [...query.keys()].some(key => !['entry', 'contextId', 'draftId', 'categoryId'].includes(key))) return false
    if (query.has('entry')) return path === SHARE_RETAIL && [...query.keys()].length === 1 && DRAFT.test(query.get('entry') || '')
    return classifyShareEntry(route)?.kind === 'retail'
  }
  return { allows }
}

/** H5首次入口在路由改写前取快照；待兑换入口还需本标签页未过期记录；兑换后需服务端Cookie。 */
if(typeof window!=='undefined' && APP_SURFACE.mode==='share-h5') captureWechatReturn(window)
export const shareEntryGate = typeof window !== 'undefined'
  ? createShareEntryGate({ mode: 'share-h5' }, window.location.hash.slice(1))
  : { allows: () => true }
