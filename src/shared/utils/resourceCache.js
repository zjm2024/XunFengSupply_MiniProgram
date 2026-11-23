/**
 * 远程图片/PDF 的本地缓存工具。
 * H5 使用浏览器自身缓存；小程序/App 下载后保存到本地，避免重复下载大文件。
 */
const CACHE_PREFIX = 'remote-resource-cache:v1:'
const inflight = new Map()
const loadedImages = new Map()
const MAX_LOADED_IMAGES = 256
let webResourcePlatform
const DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000
const FILE_MAX_AGE = 7 * DEFAULT_MAX_AGE
const downloadQueue = []
const downloadJobs = new Map()
const ACTIVE_DOWNLOAD_GRACE_MS = 120
let activeDownloads = 0
let activeSaves = 0
let cacheGeneration = 0
const resourceIndex = new Map()
let resourceIndexLoaded = false
let maintenanceTimer = null
let maintenanceRunning = false
let maintenanceRequested = false
let clearing = null
const pendingDeletes = new Map()
const MAX_FILE_BYTES = 32 * 1024 * 1024
const MAX_CACHE_BYTES = 128 * 1024 * 1024
const MAX_SAVED_RESOURCES = 500

/** 图片和普通文件共用四个下载槽；消费者共同持有，最后一个离开时才撤销。 */
function scheduleDownload(action, key, consumer) {
  return new Promise(resolve => {
    const job = { action, key, resolve, consumers: new Set(), persistent: !consumer, state: 'queued', cancelled: false }
    if (consumer) job.consumers.add(consumer)
    downloadJobs.set(key, job)
    downloadQueue.push(job)
    pumpDownloads()
  })
}

function jobPriority(job) {
  return Math.min(job.persistent ? 2 : Infinity, ...[...job.consumers].map(owner => owner.priority))
}

function pumpDownloads() {
  // 当前屏任务等待时，优先释放已无使用者的宽限任务，避免复用窗口阻塞新视口。
  if (activeDownloads >= 4 && downloadQueue.some(job => jobPriority(job) === 0)) {
    for (const job of downloadJobs.values()) {
      if (job.state !== 'downloading' || job.cancelled || job.persistent || job.consumers.size || !job.abort) continue
      clearTimeout(job.abortTimer)
      job.cancelled = true
      job.abort()
    }
  }
  while (activeDownloads < 4 && downloadQueue.length) {
    let index = 0
    for (let candidate = 1; candidate < downloadQueue.length; candidate++) {
      if (jobPriority(downloadQueue[candidate]) < jobPriority(downloadQueue[index])) index = candidate
    }
    const job = downloadQueue.splice(index, 1)[0]
    job.state = 'downloading'
    activeDownloads++
    Promise.resolve().then(() => job.cancelled ? null : job.action(job)).then(job.resolve, () => job.resolve(null))
      .finally(() => { clearTimeout(job.abortTimer); activeDownloads--; job.state = 'saving'; pumpDownloads() })
  }
}

/** 组件持有可释放的订阅；原getCachedResource调用仍按原Promise契约执行。 */
export function requestCachedResource(url, options = {}) {
  const consumer = { priority: Number(options.priority) || 0, released: false }
  const key = cacheKey(String(url || '').trim(), options.kind || 'resource')
  const promise = getCachedResource(url, { ...options, consumer })
  return {
    promise,
    setPriority(priority) { consumer.priority = priority; pumpDownloads() },
    release() {
      if (consumer.released) return
      consumer.released = true
      const job = downloadJobs.get(key)
      if (!job || !job.consumers.delete(consumer) || job.persistent || job.consumers.size) return
      if (job.state === 'queued') {
        const index = downloadQueue.indexOf(job)
        if (index >= 0) downloadQueue.splice(index, 1)
        job.cancelled = true
        job.resolve(null)
      } else if (job.state === 'downloading' && job.abort) {
        // 已开始的下载给短暂反向滚动留复用机会，排队任务仍立即撤销。
        job.abortTimer = setTimeout(() => {
          if (job.persistent || job.consumers.size || job.state !== 'downloading') return
          job.cancelled = true
          job.abort()
        }, ACTIVE_DOWNLOAD_GRACE_MS)
      }
    },
  }
}

export const RESOURCE_CACHE_PREFIX = CACHE_PREFIX

/** APP-VUE也可能有DOM，优先使用uni运行平台，不能因此跳过原生文件缓存。 */
export function isWebResourcePlatform() {
  if (webResourcePlatform !== undefined) return webResourcePlatform
  try {
    const platform = typeof uni !== 'undefined'
      ? (uni.getAppBaseInfo?.()?.uniPlatform || uni.getSystemInfoSync?.()?.uniPlatform) : ''
    if (platform) {
      webResourcePlatform = platform === 'web' || platform === 'h5'
      return webResourcePlatform
    }
  } catch (_) { /* 旧运行时仍可按原生plus与DOM能力判断。 */ }
  return typeof plus === 'undefined' && typeof window !== 'undefined' && typeof document !== 'undefined'
}

/** 只记住本进程真正显示成功的精确图片地址，不合并签名或业务版本参数。 */
export function hasLoadedImage(url) {
  const key = String(url || '').trim()
  const at = loadedImages.get(key)
  if (at !== undefined && Date.now() - at < DEFAULT_MAX_AGE) return true
  loadedImages.delete(key)
  return false
}

export function markImageLoaded(url) {
  const key = String(url || '').trim()
  if (!key) return
  loadedImages.delete(key)
  loadedImages.set(key, Date.now())
  if (loadedImages.size > MAX_LOADED_IMAGES) loadedImages.delete(loadedImages.keys().next().value)
}

export function forgetLoadedImage(url) { loadedImages.delete(String(url || '').trim()) }

/** 图片解码失败时只移除仍指向该旧文件的索引，不误删并发写入的新缓存。 */
export function invalidateCachedResource(url, { kind = 'image', localPath } = {}) {
  forgetLoadedImage(url)
  forgetLoadedImage(localPath)
  if (!localPath || !isRemoteUrl(url) || isWebResourcePlatform()) return
  const key = cacheKey(url, kind)
  try {
    const record = uni.getStorageSync(key)
    if (record?.localPath === localPath) {
      void deleteCacheRecord(key, record)
    }
  } catch (error) { console.warn('[ResourceCache] 移除失效缓存索引失败:', error) }
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

/** 缓存维护放在下载/保存结束后，分批读旧索引；不在每张图显示前扫描全库。 */
function scheduleResourceMaintenance() {
  maintenanceRequested = true
  if (clearing || maintenanceTimer || maintenanceRunning) return
  maintenanceTimer = setTimeout(() => { maintenanceTimer = null; void maintainResourceCache() }, 100)
}

async function maintainResourceCache() {
  if (clearing || inflight.size || activeDownloads || downloadQueue.length) { scheduleResourceMaintenance(); return }
  maintenanceRunning = true; maintenanceRequested = false
  const generation = cacheGeneration
  try {
    if (!resourceIndexLoaded) {
      const keys = (uni.getStorageInfoSync?.()?.keys || []).filter(key => key.startsWith(CACHE_PREFIX))
      for (let index = 0; index < keys.length; index += 1) {
        while (inflight.size && generation === cacheGeneration) await new Promise(resolve => setTimeout(resolve, 100))
        if (generation !== cacheGeneration) return
        if (!resourceIndex.has(keys[index])) {
          const record = uni.getStorageSync(keys[index])
          if (record?.localPath) resourceIndex.set(keys[index], record)
        }
        if (index % 16 === 15) await new Promise(resolve => setTimeout(resolve, 0))
      }
      if (generation !== cacheGeneration) return
      resourceIndexLoaded = true
    }
    if (generation !== cacheGeneration) return
    const entries = [...resourceIndex.entries()].sort((a, b) =>
      (Number(a[1].savedAt) || Number(a[1].expiresAt) - FILE_MAX_AGE) - (Number(b[1].savedAt) || Number(b[1].expiresAt) - FILE_MAX_AGE))
    let totalBytes = entries.reduce((sum, [, record]) => sum + (Number(record.size) || 0), 0)
    let removed = 0
    for (const [key, record] of entries) {
      if (generation !== cacheGeneration) return
      if (inflight.size || activeDownloads) { maintenanceRequested = true; break }
      if (inflight.has(key)) continue
      if (!Number.isFinite(record.size) || record.size < 0) {
        record.size = await getFileSize(record.localPath, true)
        if (generation !== cacheGeneration) return
        if (record.size != null) {
          if (uni.getStorageSync(key)?.localPath !== record.localPath || inflight.has(key)) { maintenanceRequested = true; continue }
          totalBytes += record.size
          uni.setStorageSync(key, record)
        }
      }
      if (record.size != null && !record.deletePending && Number(record.expiresAt) > Date.now()
        && resourceIndex.size <= MAX_SAVED_RESOURCES && totalBytes <= MAX_CACHE_BYTES && record.size <= MAX_FILE_BYTES) continue
      // 只删仍属于旧索引的文件，其他实例已经换路径时保留新结果。
      const current = uni.getStorageSync(key)
      if (current?.localPath && current.localPath !== record.localPath) { resourceIndex.set(key, current); continue }
      if (await deleteCacheRecord(key, current || record)) totalBytes -= Number(record.size) || 0
      removed += 1
      if (removed % 16 === 0) await new Promise(resolve => setTimeout(resolve, 0))
    }
  } catch (error) { console.warn('[ResourceCache] 清理过期文件失败:', error) }
  finally {
    maintenanceRunning = false
    if (maintenanceRequested) scheduleResourceMaintenance()
  }
}

function readCachedPath(key) {
  if (clearing) return ''
  if (!resourceIndexLoaded) scheduleResourceMaintenance()
  try {
    const record = uni.getStorageSync(key)
    if (record?.localPath && !record.deletePending && Number(record.expiresAt) > Date.now()) return record.localPath
    if (record?.localPath) void deleteCacheRecord(key, record)
  } catch (error) {
    console.warn('[ResourceCache] 读取缓存失败:', error)
  }
  return ''
}

function saveCachedPath(key, localPath, maxAge, size) {
  try {
    const record = {
      localPath,
      size,
      savedAt: Date.now(),
      expiresAt: Date.now() + Math.max(Number(maxAge) || FILE_MAX_AGE, 60 * 1000),
    }
    uni.setStorageSync(key, record)
    resourceIndex.set(key, record)
    scheduleResourceMaintenance()
    return true
  } catch (error) {
    console.warn('[ResourceCache] 保存缓存索引失败:', error)
    return false
  }
}

/** 读取已经持久化的本地资源路径，供 PDF 直接打开时复用。 */
export function getCachedResourcePath(url, options = {}) {
  const sourceUrl = String(url || '').trim()
  if (!sourceUrl || !isRemoteUrl(sourceUrl) || isWebResourcePlatform()) return ''
  return readCachedPath(cacheKey(sourceUrl, options.kind || 'resource'))
}

/** 获取远程资源的本地缓存路径；失败时回退原始 URL。 */
export function getCachedResource(url, options = {}) {
  const sourceUrl = String(url || '').trim()
  if (!sourceUrl || !isRemoteUrl(sourceUrl) || isWebResourcePlatform()) return Promise.resolve(sourceUrl)

  if (options.consumer?.released) return Promise.resolve('')
  if (clearing) return clearing.then(() => getCachedResource(sourceUrl, options))
  const kind = options.kind || 'resource'
  const key = cacheKey(sourceUrl, kind)
  const cachedPath = readCachedPath(key)
  if (cachedPath) return Promise.resolve(cachedPath)
  if (inflight.has(key)) {
    const job = downloadJobs.get(key)
    if (job?.cancelled) return inflight.get(key).then(() => getCachedResource(sourceUrl, options))
    if (job) {
      clearTimeout(job.abortTimer)
      if (options.consumer) job.consumers.add(options.consumer)
      else job.persistent = true
    }
    return inflight.get(key)
  }

  const generation = cacheGeneration
  const deletion = pendingDeletes.get(key)
  if (deletion) return deletion.then(success => success ? getCachedResource(sourceUrl, options) : sourceUrl)
  // 网络槽在下载完成后释放，持久保存不再阻塞下一张图片的下载。
  const request = scheduleDownload(job => new Promise(resolve => {
    if (generation !== cacheGeneration) { resolve(null); return }
    let settled = false
    const finish = result => { if (!settled) { settled = true; resolve(result) } }
    const task = uni.downloadFile({ url: sourceUrl, success: finish, fail: () => finish(null) })
    if (typeof task?.abort === 'function') job.abort = () => {
      try { task.abort(); finish(null) }
      catch (_) { job.cancelled = false } // 原生取消不可用时继续占用原槽，等待真实完成。
    }
  }), key, options.consumer).then(async result => {
    if (generation !== cacheGeneration || !result?.tempFilePath || Number(result.statusCode) < 200 || Number(result.statusCode) >= 300) return sourceUrl
    const size = await getFileSize(result.tempFilePath)
    if (generation !== cacheGeneration) return sourceUrl
    // 大文件或无法确认容量时使用临时文件，本次仍可展示，不写不可控的持久缓存。
    if (size == null || size > MAX_FILE_BYTES) return result.tempFilePath
    return new Promise(resolve => {
      activeSaves++
      const finish = value => { activeSaves--; resolve(value) }
      try { uni.saveFile({
        tempFilePath: result.tempFilePath,
        success: async saved => {
          const localPath = saved?.savedFilePath || result.tempFilePath
          if (generation !== cacheGeneration) {
            await deleteCacheRecord(CACHE_PREFIX + 'cleanup:' + hash(localPath), { localPath, size, expiresAt: 0 })
            finish(sourceUrl)
            return
          }
          if (!saveCachedPath(key, localPath, options.maxAge, size)) {
            // 索引写入失败不把未登记文件当作缓存成功，清理失败保留内存中的精确归属。
            resourceIndex.set(key, { localPath, size, expiresAt: 0, deletePending: true })
            if (!await removeSavedFile(localPath)) scheduleResourceMaintenance()
            else resourceIndex.delete(key)
            finish(sourceUrl)
            return
          }
          finish(localPath)
        },
        fail: () => finish(result.tempFilePath),
      }) } catch (_) { finish(result.tempFilePath) }
    })
  }).then(value => value || sourceUrl).finally(() => {
    if (inflight.get(key) === request) { inflight.delete(key); downloadJobs.delete(key) }
  })

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
  if (!source || !fallbackUrl || isWebResourcePlatform()) return source
  return source.replace(imageSourcePattern, (full, prefix, quote, url) => (
    isRemoteUrl(url) ? `${prefix}${quote}${fallbackUrl}${quote}` : full
  ))
}

/** 下载并替换富文本中的图片地址，失败时保留原始 URL。 */
export async function cacheRichTextImages(content, options = {}) {
  const source = normalizeRichText(typeof content === 'string' ? content : '')
  if (!source || isWebResourcePlatform()) return source

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

/** 仅查询单个文件元数据；旧索引补齐放在空闲维护中。 */
function getFileSize(filePath, saved = false) {
  const method = saved ? uni.getSavedFileInfo : uni.getFileInfo
  if (typeof method !== 'function') return Promise.resolve(null)
  return new Promise(resolve => {
    try {
      method.call(uni, { filePath,
        success: result => resolve(Number.isFinite(result?.size) && result.size >= 0 ? result.size : null),
        fail: () => resolve(null),
      })
    } catch (_) { resolve(null) }
  })
}

function removeSavedFile(localPath) {
  if (!localPath || typeof uni?.removeSavedFile !== 'function') return Promise.resolve(false)
  return new Promise(resolve => {
    try { uni.removeSavedFile({ filePath: localPath, success: () => resolve(true), fail: () => resolve(false) }) }
    catch (_) { resolve(false) }
  })
}

/** 删除前登记不可读状态，失败保留精确路径供下次重试，成功只移除仍匹配的索引。 */
function deleteCacheRecord(key, record) {
  if (pendingDeletes.has(key)) return pendingDeletes.get(key)
  const tombstone = { ...record, deletePending: true }
  try { uni.setStorageSync(key, tombstone); resourceIndex.set(key, tombstone) }
  catch (_) { return Promise.resolve(false) }
  const task = removeSavedFile(record.localPath).then(success => {
    if (!success) return false
    try {
      if (uni.getStorageSync(key)?.localPath === record.localPath) {
        uni.removeStorageSync(key)
        resourceIndex.delete(key)
      }
      return true
    } catch (_) { return false }
  }).finally(() => { if (pendingDeletes.get(key) === task) pendingDeletes.delete(key) })
  pendingDeletes.set(key, task)
  return task
}

/** 合并同时清理；新请求等待清理结束，旧代际下载和保存不能写回。 */
export function clearResourceCache() {
  if (clearing) return clearing
  cacheGeneration += 1
  if (maintenanceTimer) clearTimeout(maintenanceTimer)
  maintenanceTimer = null; maintenanceRequested = false
  resourceIndexLoaded = false
  inflight.clear()
  loadedImages.clear()
  const task = Promise.resolve().then(async () => {
    let count = 0, failedCount = 0
    try {
      uni.setStorageSync('manual-pdf-cache-epoch', String(Date.now()))
      const keys = [...new Set([...(uni.getStorageInfoSync()?.keys || []).filter(key => key.startsWith(CACHE_PREFIX)), ...resourceIndex.keys()])]
      for (let index = 0; index < keys.length; index++) {
        const key = keys[index]
        try {
          const record = uni.getStorageSync(key) || resourceIndex.get(key)
          if (!record?.localPath) { uni.removeStorageSync(key); resourceIndex.delete(key); count++ }
          else if (await deleteCacheRecord(key, record)) count++
          else failedCount++
        } catch (_) { failedCount++ }
        if (index % 16 === 15) await new Promise(resolve => setTimeout(resolve, 0))
      }
    } catch (_) { failedCount++ }
    return { count, failedCount, pendingCount: activeSaves, success: failedCount === 0 && activeSaves === 0 }
  }).finally(() => { if (clearing === task) clearing = null })
  clearing = task
  return task
}
