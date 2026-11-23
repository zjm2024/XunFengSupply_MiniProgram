import { manualCacheKey } from './pdfCache.js'

const MAX_AGE = 7 * 86400000
const MAX_DOCUMENT_BYTES = 128 * 1048576
const MAX_TOTAL_BYTES = 256 * 1048576

/** 保存可直接显示的手册逐页预览；与PDF字节缓存分离，不保存私有凭证。 */
export async function openPagePreviewCache({ url, scope, epoch = '', indexedDB = globalThis.indexedDB }) {
  if (!indexedDB) return null
  const key = manualCacheKey(url, scope + ':page-preview-v1')
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('app-manual-page-previews-v1', 1)
    let abandoned = false
    const timer = setTimeout(() => { abandoned = true; reject(new Error('页面缓存打开超时')) }, 3000)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('documents', { keyPath: 'key' })
      request.result.createObjectStore('pages', { keyPath: ['key', 'pageNumber'] }).createIndex('document', 'key')
    }
    request.onsuccess = () => { clearTimeout(timer); if (abandoned) request.result.close(); else resolve(request.result) }
    request.onerror = () => { clearTimeout(timer); reject(request.error) }
    request.onblocked = () => { abandoned = true; clearTimeout(timer); reject(new Error('页面缓存被占用')) }
  })
  db.onversionchange = () => db.close()
  function transaction(stores, mode, action) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode)
      let result, failure
      tx.oncomplete = () => resolve(result)
      tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('页面缓存写入失败'))
      action(tx, value => { result = value }, error => { failure = error; tx.abort() })
    })
  }
  const list = () => transaction(['documents'], 'readonly', (tx, done) => {
    tx.objectStore('documents').getAll().onsuccess = event => done(event.target.result)
  })
  const remove = documentKey => transaction(['documents', 'pages'], 'readwrite', tx => {
    tx.objectStore('documents').delete(documentKey)
    const cursor = tx.objectStore('pages').index('document').openCursor(IDBKeyRange.only(documentKey))
    cursor.onsuccess = event => { const row = event.target.result; if (row) { row.delete(); row.continue() } }
  })
  let meta, closed = false
  try {
    for (const row of await list()) if (row.epoch !== epoch || row.expiresAt <= Date.now()) await remove(row.key)
    meta = await transaction(['documents'], 'readwrite', (tx, done) => {
      const store = tx.objectStore('documents')
      store.get(key).onsuccess = event => {
        const row = event.target.result
        if (row) { row.lastUsedAt = Date.now(); store.put(row) }
        done(row || null)
      }
    })
  } catch (error) { db.close(); throw error }
  function assertOpen() { if (closed) throw new DOMException('阅读器已关闭', 'AbortError') }
  return {
    get meta() { return meta },
    async prepare(pageCount) {
      assertOpen()
      if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 1000) throw new Error('手册页数超出本地准备范围')
      if (meta?.pageCount === pageCount) return meta
      if (meta) await remove(key)
      meta = { key, epoch, generation: Date.now() + '-' + Math.random(), pageCount, pages: {}, readyPages: 0,
        bytes: 0, complete: false, expiresAt: Date.now() + MAX_AGE, lastUsedAt: Date.now() }
      await transaction(['documents'], 'readwrite', tx => tx.objectStore('documents').put(meta))
      return meta
    },
    async load(pageNumber) {
      assertOpen()
      if (!meta?.pages[pageNumber]) return null
      return transaction(['pages'], 'readonly', (tx, done) => {
        tx.objectStore('pages').get([key, pageNumber]).onsuccess = event => {
          const row = event.target.result
          done(row?.generation === meta.generation && row.blob?.size > 0 ? row : null)
        }
      })
    },
    async save(pageNumber, blob, width, height) {
      assertOpen()
      if (!meta || !blob?.size || blob.type !== 'image/jpeg' || pageNumber < 1 || pageNumber > meta.pageCount) throw new Error('页面预览无效')
      const documents = (await list()).sort((a, b) => a.lastUsedAt - b.lastUsedAt)
      let total = documents.reduce((sum, row) => sum + row.bytes, 0)
      for (const row of documents) {
        if (total + blob.size <= MAX_TOTAL_BYTES) break
        if (row.key !== key) { await remove(row.key); total -= row.bytes }
      }
      assertOpen()
      const saved = await transaction(['documents', 'pages'], 'readwrite', (tx, done, fail) => {
        const docs = tx.objectStore('documents'), pages = tx.objectStore('pages')
        docs.get(key).onsuccess = event => {
          const current = event.target.result
          if (current?.generation !== meta.generation) { fail(new Error('页面缓存已换代')); return }
          const old = current.pages[pageNumber]
          const delta = blob.size - (old?.size || 0)
          docs.getAll().onsuccess = all => {
            if (current.bytes + delta > MAX_DOCUMENT_BYTES || all.target.result.reduce((sum, row) => sum + row.bytes, 0) + delta > MAX_TOTAL_BYTES) {
              fail(new DOMException('页面缓存空间不足', 'QuotaExceededError')); return
            }
            pages.put({ key, pageNumber, generation: current.generation, blob, width, height })
            if (!old) current.readyPages += 1
            current.pages[pageNumber] = { width, height, size: blob.size }
            current.bytes += delta; current.complete = current.readyPages === current.pageCount; current.lastUsedAt = Date.now()
            docs.put(current); done(current)
          }
        }
      })
      meta = saved
      return meta
    },
    async invalidate() { if (!closed) { await remove(key); meta = null } },
    close() { closed = true; db.close() },
  }
}

/** 单张预览画布编码后立即释放，不在内存保存整本画册的全部canvas。 */
export function encodePreviewCanvas(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob?.size ? resolve(blob) : reject(new Error('页面预览编码失败')), 'image/jpeg', 0.86))
}

/** 固定预览清晰度与单页内存上限，高清原件仍可另行打开。 */
export function previewScale(width, height) {
  return Math.min(1600 / width, 2048 / height, Math.sqrt(3500000 / (width * height)))
}

/** 顺序准备全部页；暂停/退出保留已保存页面，下次只补剩余部分。 */
export function createPagePreparer({ store, pageCount, render, shouldPause = () => false, onProgress = () => {} }) {
  let closed = false, pending
  async function warm() {
    if (closed) return false
    if (pending) return pending
    pending = (async () => {
      await store.prepare(pageCount)
      onProgress({ ...store.meta, available: true })
      for (let number = 1; number <= pageCount; number += 1) {
        if (closed || shouldPause()) return false
        if (await store.load(number)) continue
        const page = await render(number)
        if (closed) return false
        await store.save(number, page.blob, page.width, page.height)
        onProgress({ ...store.meta, available: true })
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      return Boolean(store.meta.complete)
    })().catch(error => {
      if (!closed) onProgress({ pageCount, readyPages: 0, complete: false, ...store.meta, available: false, error: error.name || 'PreviewError' })
      return false
    }).finally(() => { pending = null })
    return pending
  }
  return { warm, close() { closed = true } }
}
