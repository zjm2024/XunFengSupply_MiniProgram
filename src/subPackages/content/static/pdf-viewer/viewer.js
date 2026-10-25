import * as pdfjsLib from './pdfjs.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/subPackages/auth/static/pdf-worker/pdfjsworker.js'

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

/** 从宿主接收 JSON 显示资源；只更新文字，不启动 PDF 或网络流程。 */
function setViewerLocale(payload) {
  if (payload?.type !== 'pdf-viewer-locale' || !payload.messages || typeof payload.messages !== 'object') return
  viewerMessages = Object.fromEntries(Object.entries(payload.messages).filter(([, value]) => typeof value === 'string'))
  document.documentElement.lang = payload.locale === 'en-US' ? 'en-US' : 'zh-CN'
  document.title = viewerText('title')
  const title = document.querySelector('.viewer-title')
  if (title) title.textContent = viewerText('title')
  document.getElementById('backButton')?.setAttribute('aria-label', viewerText('back'))
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
  console.warn('[PdfViewer] Invalid display resource payload', error)
}

document.body.classList.toggle('is-embedded', params.get('embedded') === '1')

document.getElementById('backButton')?.addEventListener('click', () => {
  window.history.back()
})

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
  pageStates.set(pageNumber, { element: section, rendered: false, rendering: false })
  return section
}

/** 按当前容器尺寸绘制单页，保留防重绘门禁和原 canvas 精度。 */
async function renderPage(pageNumber) {
  const state = pageStates.get(pageNumber)
  if (!state || state.rendered || state.rendering || !pdfDocument) return
  state.rendering = true

  try {
    const page = await pdfDocument.getPage(pageNumber)
    const baseViewport = page.getViewport({ scale: 1 })
    const availableWidth = Math.max(280, state.element.clientWidth - 32)
    const scale = availableWidth / baseViewport.width
    const viewport = page.getViewport({ scale })
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { alpha: false })
    canvas.width = Math.floor(viewport.width * ratio)
    canvas.height = Math.floor(viewport.height * ratio)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`
    state.element.replaceChildren(canvas)

    await page.render({
      canvasContext: context,
      viewport: page.getViewport({ scale: scale * ratio }),
    }).promise
    state.rendered = true
  } catch (error) {
    pagePlaceholder(state.element, 'pageFailed')
    console.error(`[PdfViewer] 第 ${pageNumber} 页渲染失败`, error)
  } finally {
    state.rendering = false
  }
}

/** 只在屏幕尺寸变化时重新排版已渲染页面。 */
function rerenderPagesAfterResize() {
  pageStates.forEach((state, pageNumber) => {
    if (!state.rendered) return
    state.rendered = false
    state.element.replaceChildren()
    pagePlaceholder(state.element, 'relayout')
    void renderPage(pageNumber)
  })
}

function handleViewerResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    resizeTimer = null
    rerenderPagesAfterResize()
  }, 160)
}

window.addEventListener('resize', handleViewerResize)
window.addEventListener('orientationchange', handleViewerResize)

function observePages() {
  if (!('IntersectionObserver' in window)) {
    pageStates.forEach((_, pageNumber) => void renderPage(pageNumber))
    return
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const pageNumber = Number(entry.target.dataset.page)
      void renderPage(pageNumber)
      observer.unobserve(entry.target)
    })
  }, { rootMargin: '720px 0px' })

  pageStates.forEach((state) => observer.observe(state.element))
}

/** 检查首分片后按原 Range 配置打开 PDF，并建立分页观察。 */
async function openPdf() {
  if (!pdfUrl) throw viewerError('missingUrl')

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
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    createPageElement(pageNumber)
  }
  setProgressMessage('pages', { count: pdfDocument.numPages })
  observePages()
}

openPdf().catch(showError)
