import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import { loadPageSetup } from './helpers/sfcHarness.js'

/** 使用真实内容资源，替换 PDF SDK 与浏览器绘制边界。 */
function messages(locale) {
  return JSON.parse(fs.readFileSync(`src/subPackages/content/i18n/${locale}.json`, 'utf8')).pdfViewer
}

/** 创建仅实现阅读器所需能力的 DOM 元素，检查 canvas 身份与占位更新。 */
function element(tag = 'div') {
  return { tagName: tag.toUpperCase(), style: {}, dataset: {}, children: [], clientWidth: 400, scrollTop: 123,
    classList: { toggle: vi.fn() }, addEventListener: vi.fn(), setAttribute: vi.fn(), getContext: () => ({}),
    appendChild(child) { this.children.push(child) }, replaceChildren(...items) { this.children = items } }
}

/** 执行真实 viewer.js；所有 PDF 请求均由可计数的 fetch 替身处理。 */
function viewer({ response, pending } = {}) {
  const elements = Object.fromEntries(['pages', 'progressText', 'errorBox', 'backButton', 'title'].map(id => [id, element()]))
  const document = { documentElement: {}, body: element(), getElementById: id => elements[id],
    querySelector: () => elements.title, createElement: element,
    querySelectorAll: () => elements.pages.children.flatMap(page => page.children).filter(item => item.dataset.viewerMessage) }
  const payload = locale => ({ type: 'pdf-viewer-locale', locale, messages: messages(locale) })
  const url = 'https://example.test/signed.pdf?token=original&expires=123'
  const events = {}
  const window = { location: { origin: 'https://app.test', search: '?url=' + encodeURIComponent(url) + '&ui=' + encodeURIComponent(JSON.stringify(payload('en-US'))) },
    devicePixelRatio: 1, addEventListener: (name, callback) => { events[name] = callback } }
  const Observer = class { observe() {} unobserve() {} }
  window.IntersectionObserver = Observer
  window.parent = {}
  const page = { getViewport: ({ scale }) => ({ width: 300 * scale, height: 400 * scale }), render: vi.fn(() => ({ promise: Promise.resolve() })) }
  const pdf = { numPages: 2, getPage: vi.fn(async () => page) }
  const pdfjs = { GlobalWorkerOptions: {}, PDFDataRangeTransport: class { constructor(length) { this.length = length } },
    getDocument: vi.fn(() => ({ promise: Promise.resolve(pdf) })) }
  const fetch = vi.fn(() => pending || Promise.resolve(response || { status: 206, headers: { get: () => 'bytes 0-3/1000' },
    arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer }))
  const source = fs.readFileSync('src/subPackages/content/static/pdf-viewer/viewer.js', 'utf8').replace(/^import \* as pdfjsLib from '\.\/pdfjs\.js'\s*/, '')
  const exported = new Function('pdfjsLib', 'window', 'document', 'fetch', 'IntersectionObserver', source + '\nreturn { renderPage, pageStates, fetchRange };')(pdfjs, window, document, fetch, Observer)
  return { ...exported, elements, document, window, events, payload, fetch, pdfjs, pdf, url }
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('独立 PDF 阅读器语言更新', () => {
  it('原地更新标题、页数和未加载占位，保留canvas/位置且不重新请求PDF', async () => {
    const view = viewer()
    await vi.waitFor(() => expect(view.elements.progressText.textContent).toBe('2 pages'))
    await view.renderPage(1)
    const canvas = view.pageStates.get(1).element.children[0]
    view.window.setPdfViewerLocale(view.payload('zh-CN'))
    expect(view.document.title).toBe('产品手册')
    expect(view.elements.progressText.textContent).toBe('2 页')
    expect(view.pageStates.get(2).element.children[0].textContent).toBe('滑动到此处时加载本页')
    expect(view.pageStates.get(1).element.children[0]).toBe(canvas)
    expect(view.elements.pages.scrollTop).toBe(123)
    expect(view.fetch).toHaveBeenCalledTimes(1)
    expect(view.fetch).toHaveBeenCalledWith(view.url, { headers: { Range: 'bytes=0-262143' }, cache: 'no-store', signal: undefined })
    expect(view.pdfjs.getDocument).toHaveBeenCalledTimes(1)
    expect(view.pdfjs.getDocument.mock.calls[0][0]).toMatchObject({ disableRange: false, disableStream: true, disableAutoFetch: true, rangeChunkSize: 262144 })
  })

  it('只接受同源父窗体的语言消息，外部消息不能改显示资源', async () => {
    const view = viewer()
    await vi.waitFor(() => expect(view.pdfjs.getDocument).toHaveBeenCalledTimes(1))
    view.events.message({ source: {}, origin: 'https://app.test', data: view.payload('zh-CN') })
    view.events.message({ source: view.window.parent, origin: 'https://elsewhere.test', data: view.payload('zh-CN') })
    expect(view.document.title).toBe('Product manual')
    view.events.message({ source: view.window.parent, origin: 'https://app.test', data: view.payload('zh-CN') })
    expect(view.document.title).toBe('产品手册')
    expect(view.fetch).toHaveBeenCalledTimes(1)
  })

  it('不支持 Range 的服务器仍被拒绝，语言更新不启动整文件回退', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const view = viewer({ response: { status: 200, headers: { get: () => null } } })
    await vi.waitFor(() => expect(view.elements.errorBox.textContent).toContain('Unable to preview the PDF'))
    view.window.setPdfViewerLocale(view.payload('zh-CN'))
    expect(view.elements.errorBox.textContent).toContain('PDF 预览失败')
    expect(view.elements.errorBox.textContent).not.toMatch(/CORS|Range|七牛/)
    expect(view.fetch).toHaveBeenCalledTimes(1)
    expect(view.pdfjs.getDocument).not.toHaveBeenCalled()
  })

  it('宿主同步已有原生子窗体，保留签名URL且不重载详情或替换viewer src', async () => {
    vi.useFakeTimers()
    const runtime = await import('@/shared/i18n/index.js')
    runtime.setLocale('zh-CN')
    await import('@/subPackages/content/i18n/register.js')
    const vue = await import('vue')
    const native = { evalJS: vi.fn(), setStyle: vi.fn() }
    const otherNative = { evalJS: vi.fn(), setStyle: vi.fn() }
    let current = native
    vi.stubGlobal('getCurrentPages', () => [{ $getAppWebview: () => ({ children: () => [current] }) }])
    const getManualDetail = vi.fn().mockResolvedValue({ fileUrl: 'https://example.test/a.pdf?token=keep&expires=123' })
    let unload
    const page = await loadPageSetup('subPackages/content/pages/manual/pdf-preview.vue', async id => {
      if (id === 'vue') return vue
      if (id === '@dcloudio/uni-app') return { onLoad: () => {}, onReady: () => {}, onUnload: callback => { unload = callback } }
      if (id.includes('i18n/index')) return runtime
      if (id.includes('useResponsive')) return { useResponsive: () => ({ layout: vue.ref({ windowHeight: 800 }), safeArea: vue.ref({}) }) }
      if (id.includes('api/manual')) return { getManualDetail }
      if (id.includes('navigator')) return { navigator: { back: vi.fn() } }
      return { default: {} }
    })
    try {
      page.bindings.manualId.value = '77'
      await page.bindings.loadDetail()
      await vue.nextTick()
      const src = page.bindings.viewerUrl.value
      const query = new URL(src, 'https://app.test').searchParams
      expect(query.get('url')).toBe('https://example.test/a.pdf?token=keep&expires=123')
      expect(JSON.parse(query.get('ui')).messages.title).toBe('产品手册')
      current = otherNative
      runtime.setLocale('en-US')
      await vue.nextTick()
      expect(native.evalJS.mock.calls.at(-1)[0]).toContain('Product manual')
      expect(otherNative.evalJS).not.toHaveBeenCalled()
      expect(getManualDetail).toHaveBeenCalledTimes(1)
      expect(page.bindings.viewerUrl.value).toBe(src)
    } finally { unload(); page.stop(); runtime.setLocale('zh-CN'); vi.clearAllTimers() }
  })
})
