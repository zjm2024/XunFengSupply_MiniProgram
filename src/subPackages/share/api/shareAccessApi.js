import { dispatch } from '@/shared/api/dispatchClient.js'
import { shareId, shareUtc } from '../model/dealerShareValues.js'
const CONTROLLER = 'Mini.ShareAccessController'

/** 令牌/上下文/CSRF均使用唯一32字节编码；定位符本身不授予访问。 */
export function shareAccessCode(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(value) ? value : ''
}
/** 只接受公开安全状态；额外主体、价格、地址和服务端凭据不进入前端模型。 */
export function normalizeShareAccessState(value) {
  const publicShareId = shareId(value?.publicShareId)
  const expiresAtUtc = shareUtc(value?.expiresAtUtc)
  const sessionExpiresAtUtc = shareUtc(value?.sessionExpiresAtUtc)
  const serverNowUtc = shareUtc(value?.serverNowUtc)
  if (!publicShareId || ![1, 2].includes(value?.mode) || typeof value?.isOwner !== 'boolean'
    || (value.mode === 1 && value.isOwner) || !expiresAtUtc || !sessionExpiresAtUtc || !serverNowUtc
    || Date.parse(sessionExpiresAtUtc) > Date.parse(expiresAtUtc)
    || Date.parse(serverNowUtc) >= Date.parse(sessionExpiresAtUtc)) throw new Error('Invalid sharing access response')
  return { publicShareId, mode: value.mode, isOwner: value.isOwner, expiresAtUtc, sessionExpiresAtUtc, serverNowUtc }
}
/** CSRF只由调用页保存在内存；Cookie秘密从不返回给JavaScript。 */
function exchangeResult(value, expectedContext) {
  const contextId = shareAccessCode(value?.contextId), csrfToken = shareAccessCode(value?.csrfToken)
  if (!contextId || !csrfToken || (expectedContext && expectedContext !== contextId)) throw new Error('Invalid sharing access response')
  return { contextId, csrfToken, state: normalizeShareAccessState(value?.state) }
}
/** 选择唯一网络层的HTTPS同源Cookie模式，所有访客401均为passive。 */
function options(header = {}) {
  return { shareSession: true, anonymous: true, authStrategy: 'passive', timeout: 15000, header }
}
/** 兑换只提交原码及稳定请求键；调用者不得在日志、路由或持久缓存保存原码。 */
export async function exchangeShareAccess({ token, clientRequestId } = {}) {
  if (!shareAccessCode(token) || typeof clientRequestId !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(clientRequestId)) throw new TypeError('Invalid sharing exchange input')
  const request = () => dispatch('MallOrder', CONTROLLER, 'Exchange', { Token: token, ClientRequestId: clientRequestId }, options())
  try { return exchangeResult(await request()) } catch (error) {
    // 只对服务端明确的Cookie握手重发原请求；网络未知结果由用户重试。
    if (error?.errorCode !== 'SHARE_ACCESS_COOKIE_REQUIRED') throw error
    return exchangeResult(await request())
  }
}
/** 刷新后只凭上下文+原HttpOnly Cookie恢复CSRF，不能用它恢复其他浏览器的原提交身份。 */
export async function resolveShareAccess({ contextId } = {}) {
  if (!shareAccessCode(contextId)) throw new TypeError('Invalid sharing context')
  return exchangeResult(await dispatch('MallOrder', CONTROLLER, 'Resolve', {}, options({ 'X-Share-Context': contextId })), contextId)
}
/** 读取当前状态，不续期、不自动重发业务写入或清理经销商会话。 */
export async function getShareAccessState({ contextId, csrfToken } = {}) {
  if (!shareAccessCode(contextId) || !shareAccessCode(csrfToken)) throw new TypeError('Invalid sharing context')
  return normalizeShareAccessState(await dispatch('MallOrder', CONTROLLER, 'GetState', {},
    options({ 'X-Share-Context': contextId, 'X-Share-CSRF': csrfToken })))
}

