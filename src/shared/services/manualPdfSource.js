/** 同次页面导航的手册附件交接；只存内存，不把签名链接写入外层路由、日志或持久存储。 */
const pendingSources = new Map()
const HANDOFF_MAX_AGE = 60 * 1000

/** 详情页把已取得的附件交给下一阅读器；不额外查询接口。 */
export function handoffManualPdfSource(manualId, fileUrl) {
  const id = String(manualId || '')
  if (!id || typeof fileUrl !== 'string' || !/^https?:\/\//i.test(fileUrl)) return
  pendingSources.delete(id)
  pendingSources.set(id, { fileUrl, createdAt: Date.now() })
  if (pendingSources.size > 8) pendingSources.delete(pendingSources.keys().next().value)
}

/** 阅读器一次性取走同一手册的地址；交接超时或已知七牛签名过期时回退接口。 */
export function takeManualPdfSource(manualId) {
  const id = String(manualId || ''), source = pendingSources.get(id)
  pendingSources.delete(id)
  if (!source || Date.now() - source.createdAt > HANDOFF_MAX_AGE) return ''
  // APP逻辑层不依赖DOM或浏览器URL构造器，七牛t为十六进制Unix秒。
  const query = source.fileUrl.split('#')[0]
  const timestamp = /[?&]t=([0-9a-f]+)(?:&|$)/i.exec(query)?.[1]
  if (/[?&]sign=/i.test(query) && timestamp && Number.parseInt(timestamp, 16) * 1000 <= Date.now()) return ''
  return source.fileUrl
}

/** 导航失败时撤回尚未取走的地址。 */
export function discardManualPdfSource(manualId) { pendingSources.delete(String(manualId || '')) }
