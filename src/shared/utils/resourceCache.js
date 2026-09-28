/**
 * 远程图片/PDF 的本地缓存工具。
 * H5 使用浏览器自身缓存；小程序/App 下载后保存到本地，避免重复下载大文件。
 */
const CACHE_PREFIX = 'remote-resource-cache:v1:'
const inflight = new Map()
const DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000

export const RESOURCE_CACHE_PREFIX = CACHE_PREFIX

function isH5() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function isRemoteUrl(url) {
  return /^https?:\/\//i.test(String(url || '').trim())
}

function canonicalUrl(url) {
  return String(url || '')
    .trim()
    .replace(/([?&])(?:sign|t)=[^&]*/gi, '$1')
    .replace(/[?&]+$/, '')
    .replace('?&', '?')
}

function hash(value) {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}

function cacheKey(url, kind) {
  return `${CACHE_PREFIX}${kind}:${hash(canonicalUrl(url))}`
}

function readCachedPath(key) {
  try {
    const record = uni.getStorageSync(key)
    if (record?.localPath && Number(record.expiresAt) > Date.now()) return record.localPath
  } catch (error) {
    console.warn('[ResourceCache] 读取缓存失败:', error)
  }
  return ''
}

function saveCachedPath(key, localPath, maxAge) {
  try {
    uni.setStorageSync(key, {
      localPath,
      expiresAt: Date.now() + Math.max(Number(maxAge) || DEFAULT_MAX_AGE, 60 * 1000),
    })
  } catch (error) {
    console.warn('[ResourceCache] 保存缓存索引失败:', error)
  }
}

/** 读取已经持久化的本地资源路径，供 PDF 直接打开时复用。 */
export function getCachedResourcePath(url, options = {}) {
  const sourceUrl = String(url || '').trim()
  if (!sourceUrl || !isRemoteUrl(sourceUrl) || isH5()) return ''
  return readCachedPath(cacheKey(sourceUrl, options.kind || 'resource'))
}

/** 获取远程资源的本地缓存路径；失败时回退原始 URL。 */
export function getCachedResource(url, options = {}) {
  const sourceUrl = String(url || '').trim()
  if (!sourceUrl || !isRemoteUrl(sourceUrl) || isH5()) return Promise.resolve(sourceUrl)

  const kind = options.kind || 'resource'
  const key = cacheKey(sourceUrl, kind)
  const cachedPath = readCachedPath(key)
  if (cachedPath) return Promise.resolve(cachedPath)
  if (inflight.has(key)) return inflight.get(key)

  const request = new Promise((resolve) => {
    uni.downloadFile({
      url: sourceUrl,
      success: (result) => {
        if (Number(result?.statusCode) < 200 || Number(result?.statusCode) >= 300 || !result?.tempFilePath) {
          resolve(sourceUrl)
          return
        }

        uni.saveFile({
          tempFilePath: result.tempFilePath,
          success: (saved) => {
            const localPath = saved?.savedFilePath || result.tempFilePath
            saveCachedPath(key, localPath, options.maxAge)
            resolve(localPath)
          },
          fail: () => resolve(result.tempFilePath),
        })
      },
      fail: () => resolve(sourceUrl),
    })
  }).finally(() => inflight.delete(key))

  inflight.set(key, request)
  return request
}

const imageSourcePattern = /(<img\b[^>]*?\s+src\s*=\s*)(["'])([^"']+)\2/gi

function normalizeRichText(source) {
  return source
    .replace(/\\(["'])/g, '$1')
    .replace(/&quot;/gi, '"')
}

/** 先把富文本图片替换为占位图，避免 APP 首次渲染直接请求失效的第三方地址。 */
export function sanitizeRichTextImages(content, fallbackUrl = '') {
  const source = normalizeRichText(typeof content === 'string' ? content : '')
  if (!source || !fallbackUrl || isH5()) return source
  return source.replace(imageSourcePattern, (full, prefix, quote, url) => (
    isRemoteUrl(url) ? `${prefix}${quote}${fallbackUrl}${quote}` : full
  ))
}

/** 下载并替换富文本中的图片地址，失败时保留原始 URL。 */
export async function cacheRichTextImages(content, options = {}) {
  const source = normalizeRichText(typeof content === 'string' ? content : '')
  if (!source || isH5()) return source

  const matches = [...source.matchAll(imageSourcePattern)]
  const urls = [...new Set(matches.map((match) => match[3]).filter(isRemoteUrl))]
  if (urls.length === 0) return source

  const cached = await Promise.all(urls.map(async (url) => [
    url,
    await getCachedResource(url, { ...options, kind: 'image' }),
  ]))
  const pathMap = new Map(cached)

  return source.replace(imageSourcePattern, (full, prefix, quote, url) => (
    `${prefix}${quote}${pathMap.get(url) === url && options.fallbackUrl ? options.fallbackUrl : (pathMap.get(url) || url)}${quote}`
  ))
}

function removeSavedFile(localPath) {
  if (!localPath || typeof uni === 'undefined' || typeof uni.removeSavedFile !== 'function') return Promise.resolve()
  return new Promise((resolve) => {
    uni.removeSavedFile({ filePath: localPath, complete: resolve })
  })
}

/**
 * 清理远程资源缓存，不触碰登录态、购物车、待付款订单或用户资料。
 * APP 端同时删除资源文件和缓存索引；H5 仅清理可识别的索引数据，浏览器缓存由浏览器管理。
 */
export async function clearResourceCache() {
  let keys = []
  try {
    keys = (uni.getStorageInfoSync()?.keys || []).filter(key => key.startsWith(CACHE_PREFIX))
  } catch (error) {
    console.warn('[ResourceCache] 获取缓存索引失败:', error)
  }

  const localPaths = new Set()
  keys.forEach((key) => {
    try {
      const record = uni.getStorageSync(key)
      if (record?.localPath) localPaths.add(record.localPath)
    } catch (_) {
      // 单条索引异常不影响其余缓存清理。
    }
  })

  await Promise.all([...localPaths].map(removeSavedFile))
  keys.forEach((key) => {
    try { uni.removeStorageSync(key) } catch (_) { /* ignore */ }
  })
  inflight.clear()

  return { count: keys.length }
}
