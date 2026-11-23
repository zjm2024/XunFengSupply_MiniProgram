/** 产品手册专用磁盘分片缓存；不保存发票、私有凭证、会话或业务接口数据。 */
const CHUNK_SIZE = 256 * 1024
const MAX_DOCUMENT_BYTES = 256 * 1024 * 1024
const MAX_TOTAL_BYTES = 512 * 1024 * 1024
const MAX_AGE = 7 * 24 * 60 * 60 * 1000

/** 只合并既有七牛sign/t重签；真实版本参数与域名、手册身份均保留。 */
export function manualCacheKey(url, scope) {
  const parsed = new URL(url, globalThis.location?.href || 'https://local.invalid/')
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^(sign|t)$/i.test(key)) parsed.searchParams.delete(key)
  }
  parsed.hash = ''
  return JSON.stringify([scope, parsed.href])
}

/** IndexedDB事务完成才确认落盘；额度不足或不可用时交由阅读器继续在线阅读。 */
export async function openManualPdfStore(indexedDB = globalThis.indexedDB) {
  if (!indexedDB) return null
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('app-manual-pdf-cache-v1', 1)
    let abandoned = false
    const timer = setTimeout(() => { abandoned = true; reject(new Error('本地PDF缓存打开超时')) }, 1500)
    request.onupgradeneeded = () => {
      const db = request.result
      db.createObjectStore('documents', { keyPath: 'key' })
      db.createObjectStore('chunks', { keyPath: ['key', 'begin'] }).createIndex('document', 'key')
    }
    request.onsuccess = () => { clearTimeout(timer); if (abandoned) request.result.close(); else resolve(request.result) }
    request.onerror = () => { clearTimeout(timer); reject(request.error) }
    request.onblocked = () => { abandoned = true; clearTimeout(timer); reject(new Error('本地PDF缓存被占用')) }
  })
  database.onversionchange = () => database.close()

  function transaction(stores, mode, action) {
    return new Promise((resolve, reject) => {
      const tx = database.transaction(stores, mode)
      let result
      tx.oncomplete = () => resolve(result)
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('本地PDF缓存写入失败'))
      action(tx, value => { result = value })
    })
  }
  return {
    getDocument: key => transaction(['documents'], 'readwrite', (tx, done) => {
      tx.objectStore('documents').get(key).onsuccess = event => {
        const meta = event.target.result
        if (meta) { meta.lastUsedAt = Date.now(); tx.objectStore('documents').put(meta) }
        done(meta)
      }
    }),
    listDocuments: () => transaction(['documents'], 'readonly', (tx, done) => {
      tx.objectStore('documents').getAll().onsuccess = event => done(event.target.result)
    }),
    createDocument: (meta, limit) => transaction(['documents'], 'readwrite', tx => {
      const docs = tx.objectStore('documents')
      docs.getAll().onsuccess = event => {
        const reserved = event.target.result.filter(entry => entry.key !== meta.key).reduce((sum, entry) => sum + entry.length, 0)
        if (reserved + meta.length > limit) tx.abort()
        else docs.put(meta)
      }
    }),
    getChunk: (meta, begin) => transaction(['chunks'], 'readonly', (tx, done) => {
      tx.objectStore('chunks').get([meta.key, begin]).onsuccess = event => {
        const row = event.target.result
        done(row?.generation === meta.generation ? row.bytes : null)
      }
    }),
    putChunk: (meta, begin, bytes) => transaction(['documents', 'chunks'], 'readwrite', (tx, done) => {
      const docs = tx.objectStore('documents'), chunks = tx.objectStore('chunks')
      docs.get(meta.key).onsuccess = event => {
        const current = event.target.result
        // 另一阅读器已换代/清理时，旧下载不能重建旧缓存。
        if (current?.generation !== meta.generation) { done(null); return }
        chunks.get([meta.key, begin]).onsuccess = found => {
          if (!found.target.result) current.cachedBytes += bytes.byteLength
          chunks.put({ key: meta.key, begin, generation: meta.generation, bytes })
          current.lastUsedAt = Date.now()
          current.complete = current.cachedBytes === current.length
          docs.put(current)
          done(current)
        }
      }
    }),
    deleteDocument: key => transaction(['documents', 'chunks'], 'readwrite', tx => {
      tx.objectStore('documents').delete(key)
      const request = tx.objectStore('chunks').index('document').openCursor(IDBKeyRange.only(key))
      request.onsuccess = event => {
        const cursor = event.target.result
        if (cursor) { cursor.delete(); cursor.continue() }
      }
    }),
    close: () => database.close(),
  }
}

/** 可见页按需读取优先，首屏完成后逐块补齐文件；不预绘制全部canvas或拼接整本PDF到内存。 */
export function createManualPdfCache({ url, scope, epoch = '', fetchRange, store = openManualPdfStore(),
  now = Date.now, onState = () => {}, chunkSize = CHUNK_SIZE,
  maxDocumentBytes = MAX_DOCUMENT_BYTES, maxTotalBytes = MAX_TOTAL_BYTES, maxAge = MAX_AGE }) {
  const key = manualCacheKey(url, scope)
  const controller = new AbortController(), inflight = new Map()
  let storage, meta, closed = false, writable = true, foreground = 0, warming
  let length = 0, validator = '', retryPrefetchAfter = 0
  const reads = { cacheHits: 0, localBytes: 0, networkRequests: 0, networkBytes: 0, storageError: '' }
  const ready = Promise.resolve(store).then(async result => {
    storage = result
    if (!storage) { writable = false; reads.storageError = 'Unavailable'; report(); return }
    for (const entry of await storage.listDocuments()) {
      if ((entry.epoch || '') !== epoch || entry.expiresAt <= now()) await storage.deleteDocument(entry.key)
    }
    meta = await storage.getDocument(key)
    if (meta && (meta.expiresAt <= now() || meta.chunkSize !== chunkSize || meta.length > maxDocumentBytes)) {
      await storage.deleteDocument(key); meta = null
    }
    if (meta) { length = meta.length; validator = meta.validator || '' }
    report()
  }).catch(disablePersistence)

  function report() {
    onState({ persistent: Boolean(storage && writable), total: length,
      cachedBytes: meta?.cachedBytes || 0, complete: Boolean(meta?.complete), ...reads })
  }
  function disablePersistence(error) {
    writable = false
    reads.storageError = error?.name || 'StorageError'
    if (error) console.warn('[ManualPdfCache] 本地缓存不可用，继续在线阅读', error.name || 'StorageError')
    report()
  }
  function assertOpen() {
    if (closed) throw new DOMException('阅读器已关闭', 'AbortError')
  }
  async function prepareDocument(result) {
    length = result.contentRange.total
    validator = result.validator || ''
    if (!storage || !writable || length > maxDocumentBytes) { writable = false; report(); return }
    // 按完整文件大小预留预算，避免多本190MB画册无限占用磁盘。
    const documents = (await storage.listDocuments()).sort((a, b) => a.lastUsedAt - b.lastUsedAt)
    let reserved = documents.reduce((sum, entry) => sum + entry.length, 0)
    for (const entry of documents) {
      if (entry.key === key) continue
      if (entry.expiresAt <= now() || reserved + length > maxTotalBytes) {
        await storage.deleteDocument(entry.key); reserved -= entry.length
      }
    }
    if (reserved + length > maxTotalBytes) { writable = false; report(); return }
    assertOpen()
    meta = { key, generation: `${now()}-${Math.random()}`, length, validator, chunkSize,
      cachedBytes: 0, complete: false, epoch, expiresAt: now() + maxAge, lastUsedAt: now() }
    await storage.createDocument(meta, maxTotalBytes)
  }
  async function getChunk(begin) {
    assertOpen()
    if (inflight.has(begin)) return inflight.get(begin)
    const pending = (async () => {
      if (storage && meta) {
        try {
          const bytes = await storage.getChunk(meta, begin)
          if (bytes?.byteLength === Math.min(chunkSize, length - begin)) {
            reads.cacheHits += 1; reads.localBytes += bytes.byteLength; report()
            return bytes
          }
        } catch (error) { disablePersistence(error) }
      }
      assertOpen()
      reads.networkRequests += 1; report()
      const result = await fetchRange(url, begin, length ? Math.min(begin + chunkSize, length) : begin + chunkSize, controller.signal)
      reads.networkBytes += result.bytes.byteLength
      assertOpen()
      if (!length) {
        try { await prepareDocument(result) } catch (error) { disablePersistence(error) }
      }
      // 同一路径在下载中被替换时不能拼成新旧混合文件。
      if (result.contentRange.total !== length || (validator && result.validator && validator !== result.validator)
        || result.bytes.byteLength !== Math.min(chunkSize, length - begin)) {
        if (storage && meta) await storage.deleteDocument(key).catch(() => {})
        throw new Error('PDF文件已变化或分片不完整，请重新打开')
      }
      if (storage && meta && writable) {
        try {
          const saved = await storage.putChunk(meta, begin, result.bytes)
          if (saved) meta = saved
          else writable = false
        } catch (error) { disablePersistence(error) }
      }
      report()
      return result.bytes
    })().finally(() => inflight.delete(begin))
    inflight.set(begin, pending)
    return pending
  }
  async function read(begin, end) {
    foreground += 1
    try {
      await ready; assertOpen()
      const initial = !length ? await getChunk(0) : null
      const stop = Math.min(end, length)
      if (begin < 0 || begin >= stop) throw new Error('PDF读取范围无效')
      const bytes = new Uint8Array(stop - begin)
      for (let start = Math.floor(begin / chunkSize) * chunkSize; start < stop; start += chunkSize) {
        const chunk = start === 0 && initial ? initial : await getChunk(start)
        const from = Math.max(begin, start), to = Math.min(stop, start + chunk.byteLength)
        bytes.set(chunk.subarray(from - start, to - start), from - begin)
      }
      return { bytes, contentRange: { begin, end: stop - 1, total: length } }
    } finally { foreground -= 1 }
  }
  async function prefetch(shouldPause = () => false) {
    await ready
    if (warming) return warming
    if (closed || !storage || !writable || !meta || meta.complete || now() < retryPrefetchAfter) return
    warming = (async () => {
      for (let begin = 0; begin < length; begin += chunkSize) {
        if (closed || !writable || shouldPause()) return
        // 让当前页与跳页网络请求先执行；后台最多一个分片在途。
        while (foreground > 0) {
          await new Promise(resolve => setTimeout(resolve, 50))
          if (closed || shouldPause()) return
        }
        await getChunk(begin)
        await new Promise(resolve => setTimeout(resolve, 20))
      }
    })().catch(error => {
      if (!closed) {
        retryPrefetchAfter = now() + 30000
        console.warn('[ManualPdfCache] 预下载中断，已缓存分片保留', error.name || 'NetworkError')
      }
    }).finally(() => { warming = null })
    return warming
  }
  return { read, prefetch, close() { closed = true; controller.abort(); void ready.then(() => storage?.close?.()) } }
}
