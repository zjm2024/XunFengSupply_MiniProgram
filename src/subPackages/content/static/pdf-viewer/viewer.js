import * as pdfjsLib from './pdfjs.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = '../../../auth/static/pdf-worker/pdfjsworker.js'

const params = new URLSearchParams(window.location.search)
const pdfUrl = params.get('url') || ''
const pagesElement = document.getElementById('pages')
const progressText = document.getElementById('progressText')
const errorBox = document.getElementById('errorBox')
const pageStates = new Map()
let pdfDocument = null
const RANGE_CHUNK_SIZE = 256 * 1024
let resizeTimer = null
let viewerMessages = {}
let progressState = { key: 'preparing', parameters: {} }
let errorState = null
let documentZoom = 1
let renderGeneration = 0
let pageAspectRatio = 1.414
let activeRenders = 0
let renderQueue = []
let pageObserver = null
let scrollTimer = null
let lastLayoutWidth = 0

/** 从宿主接收 JSON 显示资源；只更新文字，不启动 PDF 或网络流程。 */
function setViewerLocale(payload) {
  if (payload?.type !== 'pdf-viewer-locale' || !payload.messages || typeof payload.messages !== 'object') return
  viewerMessages = Object.fromEntries(Object.entries(payload.messages).filter(([, value]) => typeof value === 'string'))
  document.documentElement.lang = payload.locale === 'en-US' ? 'en-US' : 'zh-CN'
  document.title = viewerText('title')
  document.getElementById('zoomOut')?.setAttribute('aria-label', viewerText('zoomOut'))
  document.getElementById('zoomIn')?.setAttribute('aria-label', viewerText('zoomIn'))
  const fit = document.getElementById('zoomFit')
  if (fit) fit.textContent = viewerText('fitWidth')
  const title = document.querySelector('.viewer-title')
  if (title) title.textContent = viewerText('title')
  document.getElementById('backButton')?.setAttribute('aria-label', viewerText('back'))
  const embeddedBack = document.getElementById('embeddedBackButton')
  if (embeddedBack) embeddedBack.textContent = viewerText('back')
  if (progressState) setProgressMessage(progressState.key, progressState.parameters)
  if (errorState && errorBox) errorBox.textContent = viewerText('previewFailed')
  document.querySelectorAll('[data-viewer-message]').forEach(element => {
    element.textContent = viewerText(element.dataset.viewerMessage)
  })
}

/** 插值仅用于本地显示资源，不把词条用作 HTML 或业务字段。 */
function viewerText(key, parameters = {}) {
  return String(viewerMessages[key] || key).replace(/\{(\w+)\}/g, (token, name) =>
    Object.prototype.hasOwnProperty.call(parameters, name) ? String(parameters[name]) : token)
}

/** 保存当前进度资源描述，以便已显示页面随宿主语言重新取词。 */
function setProgressMessage(key, parameters = {}) {
  progressState = { key, parameters }
  if (progressText) progressText.textContent = viewerText(key, parameters)
}

/** 创建范围校验本地错误，显示层只公开可操作的预览提示。 */
function viewerError(key) { return new Error(viewerText(key)) }

/** 创建可原地更新语言的分页占位，不替换已渲染 canvas。 */
function pagePlaceholder(element, key) {
  const placeholder = document.createElement('div')
  placeholder.className = 'page-placeholder'
  placeholder.dataset.viewerMessage = key
  placeholder.textContent = viewerText(key)
  element.replaceChildren(placeholder)
}

window.setPdfViewerLocale = setViewerLocale
window.addEventListener('message', event => {
  if (event.source === window.parent && event.origin === window.location.origin) setViewerLocale(event.data)
})
try {
  setViewerLocale(JSON.parse(params.get('ui') || 'null'))
} catch (error) {
  console.warn('[PdfViewer] 显示资源格式无效', error)
}

document.body.classList.toggle('is-embedded', params.get('embedded') === '1')
document.body.classList.toggle('is-native', params.get('native') === '1')
/** 安全区来自宿主窗口；只更新布局变量，不重载文档或导航。 */
function setViewerInsets(insets = {}) {
  for (const edge of ['top', 'bottom']) {
    const value = Math.max(0, Math.min(200, Number(insets[edge]) || 0))
    document.body.style.setProperty('--viewer-safe-' + edge, value + 'px')
  }
}
window.setPdfViewerInsets = setViewerInsets
if (params.get('native') === '1') setViewerInsets({ top: params.get('insetTop'), bottom: params.get('insetBottom') })
if (params.get('document') === '1') {
  document.body.classList.toggle('is-document', true)
  const toolbar = document.getElementById('zoomToolbar')
  if (toolbar) toolbar.hidden = false
  document.getElementById('zoomOut')?.addEventListener('click', () => setDocumentZoom(documentZoom - .5))
  document.getElementById('zoomIn')?.addEventListener('click', () => setDocumentZoom(documentZoom + .5))
  document.getElementById('zoomFit')?.addEventListener('click', () => setDocumentZoom(1))
}
function setDocumentZoom(value) {
  documentZoom = Math.max(1, Math.min(3, value))
  const label = document.getElementById('zoomLevel')
  if (label) label.textContent = Math.round(documentZoom * 100) + '%'
  updateDocumentWidths()
  rerenderPagesAfterResize()
}
function updateDocumentWidths() {
  if (params.get('document') !== '1') return
  const width = Math.max(1, pagesElement.clientWidth - 16) * documentZoom
  pageStates.forEach(state => { state.element.style.width = width + 'px'; state.element.style.flexShrink = '0' })
}

/** 嵌入阅读器交回宿主统一导航；独立页面才使用浏览器历史。 */
function requestBack() {
  if (params.get('embedded') !== '1') { window.history.back(); return }
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pdf-viewer-back' }, window.location.origin)
  } else {
    window.uni?.postMessage({ data: { type: 'pdf-viewer-back' } })
  }
}
document.getElementById('backButton')?.addEventListener('click', requestBack)
document.getElementById('embeddedBackButton')?.addEventListener('click', requestBack)

/** 显示原始数值下载进度，语言更新不重置该数值。 */
function setProgress(text) {
  progressState = null
  if (progressText) progressText.textContent = text
}

/** 记录原异常并显示用户可操作的本地化预览失败提示。 */
function showError(error) {
  errorState = error
  console.error('[PdfViewer]', error)
  if (errorBox) {
    errorBox.hidden = false
    errorBox.textContent = viewerText('previewFailed')
  }
  setProgressMessage('failed')
}

function parseContentRange(value) {
  const match = /^bytes\s+(\d+)-(\d+)\/(\d+)$/i.exec(String(value || '').trim())
  if (!match) return null
  return {
    begin: Number(match[1]),
    end: Number(match[2]),
    total: Number(match[3]),
  }
}

/** 按原签名地址读取指定分片，严格保留 206、范围与长度校验。 */
async function fetchRange(url, begin, end, signal) {
  const response = await fetch(url, {
    headers: { Range: `bytes=${begin}-${end - 1}` },
    cache: 'no-store',
    signal,
  })
  const contentRange = parseContentRange(response.headers.get('Content-Range'))
  if (response.status !== 206 || !contentRange) {
    throw viewerError('rangeRequired')
  }
  if (contentRange.begin !== begin || contentRange.total <= 0 || contentRange.end < contentRange.begin) {
    throw viewerError('rangeInvalid')
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  const expectedLength = contentRange.end - contentRange.begin + 1
  if (bytes.byteLength !== expectedLength) throw viewerError('rangeLength')
  return { bytes, contentRange }
}

class HttpRangeTransport extends pdfjsLib.PDFDataRangeTransport {
  constructor(url, length, initialData) {
    super(length, initialData, false)
    this.url = url
    this.controllers = new Set()
    this.onError = null
  }

  requestDataRange(begin, end) {
    const controller = new AbortController()
    this.controllers.add(controller)
    fetchRange(this.url, begin, end, controller.signal)
      .then(({ bytes }) => {
        this.onDataRange(begin, bytes)
        this.onDataProgress(Math.min(this.length, begin + bytes.byteLength), this.length)
      })
      .catch(error => this.onError?.(error))
      .finally(() => this.controllers.delete(controller))
  }

  abort() {
    this.controllers.forEach(controller => controller.abort())
    this.controllers.clear()
  }
}

/** 为指定 PDF 页建立懒加载占位及原页码状态。 */
function createPageElement(pageNumber) {
  const section = document.createElement('section')
  section.className = 'pdf-page'
  section.dataset.page = String(pageNumber)
  pagePlaceholder(section, 'lazyPage')
  pagesElement.appendChild(section)
  pageStates.set(pageNumber, { element: section, rendered: false, rendering: false, failed: false, aspectRatio: pageAspectRatio })
  sizePageSlot(pageStates.get(pageNumber))
  return section
}

/** 在绘制前预留整页高度，避免上方页面加载时把正在阅读的内容推走。 */
function sizePageSlot(state) {
  const width = Math.max(1, pagesElement.clientWidth - 16) * (params.get('document') === '1' ? documentZoom : 1)
  state.element.style.width = width + 'px'
  state.element.style.height = Math.floor(Math.max(1, width - 32) * state.aspectRatio) + 32 + 'px'
}

/** 按当前尺寸绘制到离屏 canvas，成功且代际一致后才替换页面。 */
async function renderPage(pageNumber) {
  const state = pageStates.get(pageNumber)
  if (!state || state.rendered || state.rendering || !pdfDocument) return
  state.rendering = true
  const generation = renderGeneration
  try {
    const page = await pdfDocument.getPage(pageNumber)
    if (generation !== renderGeneration) return
    const baseViewport = page.getViewport({ scale: 1 })
    state.aspectRatio = baseViewport.height / baseViewport.width
    sizePageSlot(state)
    const width = parseFloat(state.element.style.width) - 32
    const scale = Math.max(1, width) / baseViewport.width
    const viewport = page.getViewport({ scale })
    // 限制大屏及高像素密度画布，避免同时翻阅时分配过大的位图。
    const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(8000000 / (viewport.width * viewport.height)))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(viewport.width * ratio))
    canvas.height = Math.max(1, Math.floor(viewport.height * ratio))
    canvas.style.width = Math.floor(viewport.width) + 'px'
    canvas.style.height = Math.floor(viewport.height) + 'px'
    state.renderTask = page.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport: page.getViewport({ scale: scale * ratio }) })
    await state.renderTask.promise
    if (generation !== renderGeneration) return
    state.element.replaceChildren(canvas)
    state.rendered = true
    state.failed = false
  } catch (error) {
    if (generation !== renderGeneration) return
    state.failed = true
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.className = 'page-placeholder page-retry'
    retry.dataset.viewerMessage = 'pageFailed'
    retry.textContent = viewerText('pageFailed')
    retry.addEventListener('click', () => {
      state.failed = false
      scheduleVisiblePages()
    })
    state.element.replaceChildren(retry)
    console.error('[PdfViewer] 第 ' + pageNumber + ' 页渲染失败', error)
  } finally {
    state.rendering = false
    state.renderTask = null
  }
}

/** 当前可见页优先，随后预取上下邻页；始终只并发绘制两页。 */
function scheduleVisiblePages() {
  const bounds = pagesElement.getBoundingClientRect?.() || { top: 0, bottom: window.innerHeight || 800 }
  const height = bounds.bottom - bounds.top
  const candidates = []
  pageStates.forEach((state, number) => {
    const rect = state.element.getBoundingClientRect?.() || { top: 0, bottom: 1 }
    if (state.rendered || state.rendering || state.failed || rect.bottom < bounds.top - height || rect.top > bounds.bottom + height) return
    const visible = rect.bottom > bounds.top && rect.top < bounds.bottom
    candidates.push({ number, priority: (visible ? 0 : height * 3) + Math.abs(rect.top - bounds.top) })
  })
  renderQueue = candidates.sort((a, b) => a.priority - b.priority).map(item => item.number)
  pumpRenderQueue()
}

function pumpRenderQueue() {
  while (activeRenders < 2 && renderQueue.length) {
    const number = renderQueue.shift()
    activeRenders += 1
    void renderPage(number).finally(() => {
      activeRenders -= 1
      scheduleVisiblePages()
    })
  }
}

/** 宽度确实变化才重绘；保留旧画布，离屏页等重新进入阅读范围再绘制。 */
function rerenderPagesAfterResize() {
  const width = pagesElement.clientWidth * documentZoom
  if (lastLayoutWidth === width) return
  lastLayoutWidth = width
  renderGeneration += 1
  pageStates.forEach(state => {
    state.rendered = false
    sizePageSlot(state)
  })
  scheduleVisiblePages()
}

function handleViewerResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => { resizeTimer = null; rerenderPagesAfterResize() }, 160)
}
window.addEventListener('resize', handleViewerResize)
window.addEventListener('orientationchange', handleViewerResize)

function observePages() {
  if ('IntersectionObserver' in window) {
    // 持续观察，首次进入范围不再永久退订；布局或失败重试后仍可重新调度。
    pageObserver = new IntersectionObserver(scheduleVisiblePages, { root: pagesElement, rootMargin: '100% 0px' })
    pageStates.forEach(state => pageObserver.observe(state.element))
  }
  pagesElement.addEventListener('scroll', () => {
    if (scrollTimer) return
    scrollTimer = setTimeout(() => { scrollTimer = null; scheduleVisiblePages() }, 50)
  }, { passive: true })
  scheduleVisiblePages()
}

/** 检查首分片后按原 Range 配置打开 PDF，并建立分页观察。 */
async function openPdf() {
  if (!pdfUrl) throw viewerError('missingUrl')

  // 发票等普通文档兼容200响应；手册仍保持分片校验和懒加载。
  if (params.get('document') === '1') {
    pdfDocument = await pdfjsLib.getDocument({ url: pdfUrl, isEvalSupported: false }).promise
    await mountPdfPages()
    return
  }
  setProgressMessage('checkingRange')
  const firstChunk = await fetchRange(pdfUrl, 0, RANGE_CHUNK_SIZE)
  const rangeTransport = new HttpRangeTransport(
    pdfUrl,
    firstChunk.contentRange.total,
    firstChunk.bytes,
  )

  let loadingTask = null
  const rangeError = new Promise((_, reject) => {
    rangeTransport.onError = reject
  })

  loadingTask = pdfjsLib.getDocument({
    range: rangeTransport,
    length: firstChunk.contentRange.total,
    rangeChunkSize: RANGE_CHUNK_SIZE,
    disableRange: false,
    disableStream: true,
    disableAutoFetch: true,
  })
  loadingTask.onProgress = ({ loaded, total }) => {
    if (total) setProgress(`${Math.round((loaded / total) * 100)}%`)
    else setProgress(`${Math.round(loaded / 1024)} KB`)
  }

  pdfDocument = await Promise.race([loadingTask.promise, rangeError])
  await mountPdfPages()
}

/** 根据已加载文档创建懒加载页面。 */
async function mountPdfPages() {
  const firstPage = await pdfDocument.getPage(1)
  const viewport = firstPage.getViewport({ scale: 1 })
  pageAspectRatio = viewport.height / viewport.width
  lastLayoutWidth = pagesElement.clientWidth * documentZoom
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    createPageElement(pageNumber)
  }
  setProgressMessage('pages', { count: pdfDocument.numPages })
  observePages()
}

if (new URLSearchParams(window.location.search).get('private') === '1') {
  let opening = false

  /** 打开由本地父页面通过登录态取得的私有 PDF。 */
  window.openPrivatePdf = async data => {
    if (opening || pdfDocument || typeof data !== 'string' || data.length > 2796204) return
    opening = true
    try {
      const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0))
      pdfDocument = await pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise
      await mountPdfPages()
    } catch (error) { showError(error) }
    finally { opening = false }
  }
  window.addEventListener('message', event => {
    if (event.origin === window.location.origin && event.source === window.parent && event.data?.type === 'pdf-viewer-private') {
      void window.openPrivatePdf(event.data.data)
    }
  })
  if (window.parent !== window) window.parent.postMessage({ type: 'pdf-viewer-private-ready' }, window.location.origin)
} else {
  openPdf().catch(showError)
}
