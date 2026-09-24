import * as pdfjsLib from './pdfjs.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = './pdfjsworker.js'

const params = new URLSearchParams(window.location.search)
const pdfUrl = params.get('url') || ''
const pagesElement = document.getElementById('pages')
const progressText = document.getElementById('progressText')
const errorBox = document.getElementById('errorBox')
const pageStates = new Map()
let pdfDocument = null
const RANGE_CHUNK_SIZE = 256 * 1024
let resizeTimer = null

document.body.classList.toggle('is-embedded', params.get('embedded') === '1')

document.getElementById('backButton')?.addEventListener('click', () => {
  window.history.back()
})

function setProgress(text) {
  if (progressText) progressText.textContent = text
}

function showError(error) {
  const detail = error?.message || String(error || '')
  console.error('[PdfViewer]', error)
  if (errorBox) {
    errorBox.hidden = false
    errorBox.textContent = `PDF 预览失败：${detail}。请检查文件地址是否有效，以及七牛域名是否支持 CORS 和 Range 分片请求。`
  }
  setProgress('加载失败')
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

async function fetchRange(url, begin, end, signal) {
  const response = await fetch(url, {
    headers: { Range: `bytes=${begin}-${end - 1}` },
    cache: 'no-store',
    signal,
  })
  const contentRange = parseContentRange(response.headers.get('Content-Range'))
  if (response.status !== 206 || !contentRange) {
    throw new Error('PDF 文件服务器未返回 206/Content-Range，已阻止整文件回退')
  }
  if (contentRange.begin !== begin || contentRange.total <= 0 || contentRange.end < contentRange.begin) {
    throw new Error('PDF 分片响应范围无效')
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  const expectedLength = contentRange.end - contentRange.begin + 1
  if (bytes.byteLength !== expectedLength) throw new Error('PDF 分片响应长度不一致')
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

function createPageElement(pageNumber) {
  const section = document.createElement('section')
  section.className = 'pdf-page'
  section.dataset.page = String(pageNumber)
  section.innerHTML = '<div class="page-placeholder">滑动到此处时加载本页</div>'
  pagesElement.appendChild(section)
  pageStates.set(pageNumber, { element: section, rendered: false, rendering: false })
  return section
}

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
    state.element.innerHTML = '<div class="page-placeholder">本页加载失败，请稍后重试</div>'
    console.error(`[PdfViewer] 第 ${pageNumber} 页渲染失败`, error)
  } finally {
    state.rendering = false
  }
}

function rerenderPagesAfterResize() {
  pageStates.forEach((state, pageNumber) => {
    if (!state.rendered) return
    state.rendered = false
    state.element.replaceChildren()
    state.element.innerHTML = '<div class="page-placeholder">正在按当前屏幕重新排版</div>'
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

async function openPdf() {
  if (!pdfUrl) throw new Error('缺少 PDF 地址')

  setProgress('检查分片')
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
  setProgress(`${pdfDocument.numPages} 页`)
  observePages()
}

openPdf().catch(showError)
