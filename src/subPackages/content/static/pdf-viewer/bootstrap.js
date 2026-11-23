import { openPagePreviewCache } from './pagePreviewCache.js'

const params = new URLSearchParams(location.search)
const eligible = params.get('cache') === 'manual' && params.get('manualId') && params.get('url')
  && params.get('private') !== '1' && params.get('document') !== '1'
let bootClosed = false, bootStore = null
window.addEventListener('pagehide', () => { bootClosed = true; bootStore?.close() })
let messages = {}
try { messages = JSON.parse(params.get('ui') || '{}').messages || {} } catch (_) { /* 正式阅读器保留原错误提示。 */ }
const text = (key, values = {}) => String(messages[key] || key).replace(/\{(\w+)\}/g, (all, name) => values[name] ?? all)
const pages = document.getElementById('pages')

/** 本地页面启动不依赖PDF.js/worker，先呈现已经准备好的画面。 */
function setupShell() {
  document.body.classList.toggle('is-embedded', params.get('embedded') === '1')
  document.body.classList.toggle('is-native', params.get('native') === '1')
  for (const edge of ['top', 'bottom']) document.body.style.setProperty('--viewer-safe-' + edge, Math.max(0, Math.min(200, Number(params.get(edge === 'top' ? 'insetTop' : 'insetBottom')) || 0)) + 'px')
  document.querySelector('.viewer-title').textContent = text('title')
  document.title = text('title')
}

/** 完整逐页缓存直接展示图片；损坏或缺页才回退原PDF阅读流程。 */
async function showPreparedPages(store) {
  const first = await store.load(1)
  if (!first) { await store.invalidate(); return false }
  const started = 0, slots = new Map(), listeners = [], urls = new Set()
  let observer, disposed = false, fallbackStarted = false
  const state = { mode: 'prepared-pages', complete: true, readyPages: store.meta.readyPages,
    pageCount: store.meta.pageCount, localPageReads: 0, resourceRequests: 0, firstPageMs: null }
  window.pdfPreviewState = state
  function listen(target, name, handler) { target.addEventListener(name, handler); listeners.push(() => target.removeEventListener(name, handler)) }
  function localize(payload) {
    if (payload?.type === 'pdf-viewer-locale' && payload.messages) messages = payload.messages
    document.title = text('title'); document.querySelector('.viewer-title').textContent = text('title')
    document.getElementById('progressText').textContent = text('previewReadyShort')
    const status = document.getElementById('cacheStatus'); status.hidden = false
    status.textContent = text('previewReady', { count: state.pageCount })
    const original = document.getElementById('originalButton'); original.hidden = false; original.textContent = text('previewOriginal')
    document.getElementById('backButton').setAttribute('aria-label', text('back'))
    document.getElementById('embeddedBackButton').textContent = text('back')
  }
  function dispose() {
    disposed = true; observer?.disconnect(); listeners.forEach(remove => remove())
    urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); store.close()
  }
  async function fallback() {
    if (disposed || fallbackStarted) return
    fallbackStarted = true
    await store.invalidate().catch(() => {})
    dispose(); pages.replaceChildren(); window.pdfPreviewState = null
    let recovered = null
    try { recovered = await openPagePreviewCache({ url: params.get('url'), scope: params.get('manualId'), epoch: params.get('cacheEpoch') || '' }) } catch (_) { /* 原件仍可在线读取。 */ }
    if (bootClosed) { recovered?.close(); return }
    bootStore = recovered
    window.manualPreviewBoot = Promise.resolve({ store: recovered, cached: false })
    await import('./viewer.js')
  }
  function sizeSlots() {
    const width = Math.max(1, pages.clientWidth - 16)
    for (const slot of slots.values()) {
      slot.element.style.width = width + 'px'
      slot.element.style.height = Math.floor(Math.max(1, width - 32) * slot.height / slot.width) + 32 + 'px'
    }
  }
  async function loadPage(number, known) {
    const slot = slots.get(number)
    if (!slot || slot.loading || slot.loaded || disposed) return
    slot.loading = true
    try {
      const saved = known || await store.load(number)
      if (!saved) throw new Error('已缓存页面缺失')
      if (disposed) return
      const url = URL.createObjectURL(saved.blob); urls.add(url)
      const image = document.createElement('img')
      image.alt = text('previewPage', { page: number }); image.decoding = 'async'
      image.onload = () => {
        if (disposed) return
        slot.loaded = true; state.localPageReads += 1
        if (number === 1) state.firstPageMs = performance.now() - started
        showVisible()
      }
      image.onerror = () => { void fallback() }
      image.src = url; slot.url = url; slot.element.replaceChildren(image)
    } catch (_) { void fallback() }
    finally { slot.loading = false }
  }
  function showVisible() {
    const bounds = pages.getBoundingClientRect(), height = bounds.bottom - bounds.top
    for (const [number, slot] of slots) {
      const rect = slot.element.getBoundingClientRect()
      if (rect.bottom >= bounds.top - height && rect.top <= bounds.bottom + height) void loadPage(number)
      else if (slot.loaded && (rect.bottom < bounds.top - height * 3 || rect.top > bounds.bottom + height * 3)) {
        slot.element.replaceChildren(); URL.revokeObjectURL(slot.url); urls.delete(slot.url); slot.loaded = false; slot.url = null
      }
    }
  }
  for (let number = 1; number <= state.pageCount; number += 1) {
    const info = store.meta.pages[number]
    if (!info) { await fallback(); return true }
    const element = document.createElement('section'); element.className = 'pdf-page'; element.dataset.page = String(number)
    slots.set(number, { element, width: info.width, height: info.height, loaded: false, loading: false })
    pages.appendChild(element)
  }
  sizeSlots(); localize()
  await loadPage(1, first)
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(showVisible, { root: pages, rootMargin: '100% 0px' })
    slots.forEach(slot => observer.observe(slot.element))
  }
  function back() {
    if (params.get('embedded') !== '1') history.back()
    else if (window.parent !== window) window.parent.postMessage({ type: 'pdf-viewer-back' }, location.origin)
    else window.uni?.postMessage({ data: { type: 'pdf-viewer-back' } })
  }
  listen(document.getElementById('backButton'), 'click', back)
  listen(document.getElementById('embeddedBackButton'), 'click', back)
  listen(document.getElementById('originalButton'), 'click', () => {
    const next = new URL(location.href); next.searchParams.set('original', '1'); location.replace(next.href)
  })
  listen(pages, 'scroll', showVisible)
  listen(window, 'resize', () => { sizeSlots(); showVisible() })
  listen(window, 'message', event => {
    if (event.source === window.parent && event.origin === location.origin && event.data?.type === 'pdf-viewer-locale') localize(event.data)
  })
  listen(window, 'pagehide', dispose)
  window.setPdfViewerLocale = localize
  window.setPdfViewerInsets = insets => { for (const edge of ['top', 'bottom']) document.body.style.setProperty('--viewer-safe-' + edge, Math.max(0, Math.min(200, Number(insets[edge]) || 0)) + 'px') }
  return true
}

async function boot() {
  if (!eligible) return null
  setupShell()
  try {
    const store = await openPagePreviewCache({ url: params.get('url'), scope: params.get('manualId'), epoch: params.get('cacheEpoch') || '' })
    bootStore = store
    if (bootClosed) { store?.close(); return { cached: true } }
    if (store?.meta?.complete && params.get('original') !== '1') {
      return { store, cached: await showPreparedPages(store) }
    }
    return { store, cached: false }
  } catch (error) {
    console.warn('[PdfPreview] 本地页面不可用，继续原PDF阅读', error.name || 'StorageError')
    return null
  }
}
window.manualPreviewBoot = boot()
window.manualPreviewBoot.then(context => { if (!bootClosed && !context?.cached) return import('./viewer.js') }).catch(error => {
  console.error('[PdfPreview] 阅读器启动失败', error)
  const box = document.getElementById('errorBox'); box.hidden = false; box.textContent = text('previewFailed')
})
