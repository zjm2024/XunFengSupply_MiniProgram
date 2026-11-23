<template>
  <AppPageShell>
    <template #header>
      <AppHeader v-if="showHostHeader" :title="pageTitle" :show-back="true" @back="goBack" />
    </template>
    <template #content>
      <view class="pdf-page">
        <view v-if="loading" class="state-box">
          <text class="state-title">{{ t('content.manual.preparingPdf') }}</text>
          <text>{{ t('content.manual.pdfHint') }}</text>
        </view>
        <view v-else-if="errorText" class="state-box" @click="loadDetail">
          <text class="state-title">{{ errorText }}</text>
          <text>{{ t('content.manual.retry') }}</text>
        </view>
        <web-view
          v-else-if="viewerUrl"
          ref="viewerComponent"
          class="pdf-viewer"
          :src="viewerUrl"
          @load="handleViewerLoad"
          @message="handleViewerMessage"
        />
      </view>
    </template>
  </AppPageShell>
</template>

<script setup>
import { getLocale, t } from '@/shared/i18n/index.js'
import '@/subPackages/content/i18n/register.js'
import { computed, nextTick, ref, watch } from 'vue'
import { onLoad, onReady, onUnload } from '@dcloudio/uni-app'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { useResponsive } from '@/shared/composables/useResponsive.js'
import { getManualDetail } from '../../api/manual.js'
import { takeManualPdfSource } from '@/shared/services/manualPdfSource.js'
import { getInvoiceDetail } from '@/shared/api/invoice.js'
import { getWithdrawalReceipt } from '@/shared/api/withdrawal.js'

const invoiceId = ref('')
const withdrawalId = ref('')
const pageTitle = computed(() => t(withdrawalId.value ? 'content.titles.withdrawalReceiptPreview'
  : invoiceId.value ? 'content.titles.invoicePreview' : 'content.titles.manualPreview'))
let receiptBase64 = ''
let active = true
let inheritedSourceInUse = false
const manualId = ref('')
const loading = ref(true)
const loadFailure = ref(null)
const errorText = computed(() => loadFailure.value?.message
  || (loadFailure.value?.messageKey ? t(loadFailure.value.messageKey) : ''))
const viewerUrl = ref('')
const viewerComponent = ref(null)
let nativeReader = false
// #ifdef APP-PLUS
nativeReader = true
// #endif
// 原生PDF自带同窗体导航；准备中或失败时仍由统一AppHeader提供返回。
const showHostHeader = computed(() => !nativeReader || loading.value || !!errorText.value || !viewerUrl.value)
const viewerMessageKeys = ['title', 'back', 'preparing', 'failed', 'previewFailed', 'rangeRequired',
  'rangeInvalid', 'rangeLength', 'lazyPage', 'pageFailed', 'relayout', 'missingUrl', 'checkingRange', 'pages',
  'cacheProgress', 'cacheComplete', 'cacheUnavailable', 'cacheShortProgress', 'cacheShortComplete', 'cacheShortOnline', 'previewReadyShort', 'previewReady', 'previewOriginal', 'previewPage', 'previewPartial', 'previewPrepared', 'previewPreparing', 'previewPartialShort', 'previewPreparingShort']

const { layout, safeArea } = useResponsive()

// APP-VUE的PDF是独立原生子窗体，标题/返回由阅读器同层承载。
let nativePdfWebview = null
let nativeLayoutTimer = null
let nativeLayoutAttempts = 0

/** 原生窗体铺满页面，阅读器在同一层内处理状态栏与底部安全区。 */
function viewerInsets() {
  return { top: Math.max(Number(layout.value.statusBarHeight) || 0, Number(safeArea.value.top) || 0),
    bottom: Math.max(Number(safeArea.value.bottom) || 0, 0) }
}

function nativeViewerQuery() {
  if (!nativeReader) return ''
  const insets = viewerInsets()
  return `&native=1&insetTop=${insets.top}&insetBottom=${insets.bottom}`
}

onLoad((options = {}) => {
  invoiceId.value = String(options.invoiceId || '')
  withdrawalId.value = String(options.withdrawalId || '')
  // #ifdef H5
  if (typeof window !== 'undefined') window.addEventListener('message', handleViewerWindowMessage)
  // #endif
  manualId.value = String(options.manualId || '')
  loadDetail()
})

onReady(() => {
  // 原生 web-view 的子窗体创建晚于 Vue 页面 ready，需要再次校准位置。
  scheduleNativePdfLayout()
})

/** 优先使用本次详情导航交接的链接，直接进入/刷新时才查询附件接口。 */
async function loadDetail(refreshSource = false) {
  if (!manualId.value && !invoiceId.value && !withdrawalId.value) {
    loadFailure.value = { messageKey: 'content.manual.missingId' }
    loading.value = false
    return
  }

  loading.value = true
  loadFailure.value = null
  viewerUrl.value = ''
  resetNativePdfWebview()
  try {
    if (withdrawalId.value) {
      const data = await getWithdrawalReceipt(withdrawalId.value)
      if (!active) return
      if (!data) {
        loadFailure.value = { messageKey: 'content.manual.noPdf' }
        return
      }
      // #ifdef MP-WEIXIN
      await openMiniReceipt(data)
      if (active) navigator.back()
      // #endif
      // #ifndef MP-WEIXIN
      receiptBase64 = data
      viewerUrl.value = '/subPackages/content/static/pdf-viewer/index.html?embedded=1&private=1&ui='
        + encodeURIComponent(JSON.stringify(viewerLanguagePayload())) + nativeViewerQuery()
      // #endif
      return
    }

    const inheritedUrl = !invoiceId.value && refreshSource !== true ? takeManualPdfSource(manualId.value) : ''
    inheritedSourceInUse = Boolean(inheritedUrl)
    const detail = invoiceId.value
      ? await getInvoiceDetail(invoiceId.value)
      : inheritedUrl ? { fileUrl: inheritedUrl } : await getManualDetail(manualId.value)
    if (!active) return
    if (!detail?.fileUrl || (invoiceId.value && detail.status !== 2)) {
      loadFailure.value = { messageKey: 'content.manual.noPdf' }
      return
    }

    // 只有产品手册启用持久文件缓存；发票/私有凭证仍按原权限及加载路径处理。
    const cacheQuery = !invoiceId.value && manualId.value
      ? '&cache=manual&manualId=' + encodeURIComponent(manualId.value)
        + '&cacheEpoch=' + encodeURIComponent(typeof uni !== 'undefined' ? uni.getStorageSync?.('manual-pdf-cache-epoch') || '' : '') : ''
    viewerUrl.value = '/subPackages/content/static/pdf-viewer/index.html?embedded=1&url=' + encodeURIComponent(detail.fileUrl)
      + '&ui=' + encodeURIComponent(JSON.stringify(viewerLanguagePayload())) + nativeViewerQuery() + cacheQuery
  } catch (error) {
    console.error('[ManualPdfPreview] 加载 PDF 地址失败:', error)
    loadFailure.value = error?.message ? error : { messageKey: 'content.manual.pdfFailed' }
  } finally {
    loading.value = false
    scheduleNativePdfLayout()
  }
}

/** 继承地址被资源服务器拒绝时只刷新一次，禁止反复重建阅读器。 */
function refreshInheritedSource() {
  if (!active || !manualId.value || invoiceId.value || withdrawalId.value || !inheritedSourceInUse) return
  inheritedSourceInUse = false
  void loadDetail(true)
}

let navigatingBack = false
async function goBack() {
  if (navigatingBack) return
  navigatingBack = true
  try { await navigator.back() } finally { navigatingBack = false }
}

/** 原生阅读器只回传返回意图，业务导航仍由统一 navigator 执行。 */
function handleViewerMessage(event) {
  if (!active) return
  const data = event.detail?.data
  const messages = Array.isArray(data) ? data : [data]
  if (messages.some(message => message?.type === 'pdf-viewer-private-ready')) sendPrivateReceipt()
  if (messages.some(message => message?.type === 'pdf-source-expired')) refreshInheritedSource()
  if (messages.some(message => message?.type === 'pdf-viewer-back')) void goBack()
}

// #ifdef MP-WEIXIN
/** 通过小程序原生PDF预览打开凭证并清理临时文件。 */
async function openMiniReceipt(data) {
  const fs = uni.getFileSystemManager()
  const filePath = wx.env.USER_DATA_PATH + '/withdrawal-' + Date.now() + '.pdf'
  try {
    await new Promise((resolve, reject) => fs.writeFile({ filePath, data, encoding: 'base64', success: resolve, fail: reject }))
    await new Promise((resolve, reject) => uni.openDocument({ filePath, fileType: 'pdf', showMenu: false, success: resolve, fail: reject }))
  } finally {
    fs.unlink({ filePath, fail: () => {} })
  }
}
// #endif

/** 向当前本地阅读器发送凭证字节，不写入路由或公开URL。 */
function sendPrivateReceipt() {
  if (!receiptBase64) return
  // #ifdef H5
  const iframe = viewerFrame()
  if (iframe?.contentWindow) iframe.contentWindow.postMessage({ type: 'pdf-viewer-private', data: receiptBase64 }, window.location.origin)
  // #endif
  // #ifdef APP-PLUS
  nativePdfWebview?.evalJS?.('window.openPrivatePdf?.(' + JSON.stringify(receiptBase64) + ')')
  // #endif
}

// #ifdef H5
/** 获取当前页面的嵌入阅读器，兼容 uni-app 返回原生元素或组件实例。 */
function viewerFrame() {
  const element = viewerComponent.value?.$el || viewerComponent.value
  if (element?.tagName === 'IFRAME') return element
  return element?.querySelector?.('iframe') || document.querySelector('iframe[src*="pdf-viewer/index.html?embedded=1"]')
}

/** 同源且来自当前阅读器的消息才能传递凭证或触发宿主返回。 */
function handleViewerWindowMessage(event) {
  if (!active || event.origin !== window.location.origin || event.source !== viewerFrame()?.contentWindow) return
  if (event.data?.type === 'pdf-source-expired') refreshInheritedSource()
  if (event.data?.type === 'pdf-viewer-private-ready') sendPrivateReceipt()
  if (event.data?.type === 'pdf-viewer-back') void goBack()
}
// #endif

/** 从 content JSON 取出独立阅读器文案，不向 HTML 传递会话或修改附件签名地址。 */
function viewerLanguagePayload() {
  return { type: 'pdf-viewer-locale', locale: getLocale(),
    messages: { ...Object.fromEntries(viewerMessageKeys.map(key => [key, t('content.pdfViewer.' + key)])), title: pageTitle.value } }
}

/** 阅读器加载完成后同步语言和原生位置，已加载文档不重建。 */
function handleViewerLoad() {
  syncViewerLanguage()
  sendPrivateReceipt()
  scheduleNativePdfLayout()
}

/** 只更新已有阅读器显示文字，保留 PDF、页码、滚动位置和 Range 请求。 */
function syncViewerLanguage() {
  if (!viewerUrl.value) return
  const payload = viewerLanguagePayload()
  // #ifdef APP-PLUS
  try {
    nativePdfWebview?.evalJS?.('window.setPdfViewerLocale?.(' + JSON.stringify(payload) + ')')
  } catch (error) {
    console.warn('[ManualPdfPreview] 同步阅读器语言失败:', error)
  }
  // #endif
  // #ifdef H5
  const element = viewerComponent.value?.$el
  const iframe = element?.tagName === 'IFRAME' ? element : element?.querySelector?.('iframe')
  if (iframe?.contentWindow && typeof window !== 'undefined') {
    iframe.contentWindow.postMessage(payload, window.location.origin)
  }
  // #endif
}

watch(getLocale, syncViewerLanguage)

/** 等待本页 PDF 子窗体创建后同步显示资源并校准布局。 */
function scheduleNativePdfLayout() {
  // #ifdef APP-PLUS
  if (!viewerUrl.value) return
  if (nativeLayoutTimer) clearTimeout(nativeLayoutTimer)
  nativeLayoutAttempts = 0

  const tryLayout = () => {
    const webview = findNativePdfWebview()
    if (webview) {
      nativePdfWebview = webview
      syncViewerLanguage()
      sendPrivateReceipt()
      applyNativePdfLayout()
      return
    }

    nativeLayoutAttempts += 1
    if (nativeLayoutAttempts < 20) {
      nativeLayoutTimer = setTimeout(tryLayout, 100)
    }
  }

  nextTick(tryLayout)
  // #endif
}

function findNativePdfWebview() {
  // #ifdef APP-PLUS
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const currentWebview = currentPage?.$getAppWebview?.()
  const children = currentWebview?.children?.() || []
  // 当前页面可能残留过上一次 PDF 子窗体，最后创建的才是本次页面实例。
  return children[children.length - 1] || null
  // #endif
  return null
}

function applyNativePdfLayout() {
  // #ifdef APP-PLUS
  if (!nativePdfWebview) return

  // 标题和返回放入原生阅读器，不依赖跨窗体z-index或延迟缩小子窗体。
  nativePdfWebview.setStyle({
    top: '0px',
    height: '100%',
    width: '100%',
    left: '0px',
    background: '#f3f4f6',
  })
  nativePdfWebview.evalJS?.('window.setPdfViewerInsets?.(' + JSON.stringify(viewerInsets()) + ')')

  // 给 iOS WKWebView 一个明确的 resize 事件，触发 PDF canvas 按新宽度重绘。
  setTimeout(() => {
    try {
      nativePdfWebview?.evalJS?.("window.dispatchEvent(new Event('resize'))")
    } catch (error) {
      console.warn('[ManualPdfPreview] 同步 PDF 横竖屏尺寸失败:', error)
    }
  }, 120)
  // #endif
}

function resetNativePdfWebview() {
  // #ifdef APP-PLUS
  if (nativeLayoutTimer) {
    clearTimeout(nativeLayoutTimer)
    nativeLayoutTimer = null
  }
  nativePdfWebview = null
  nativeLayoutAttempts = 0
  // #endif
}

watch([layout, safeArea], () => {
  // 横竖屏或 iPad 分屏变化时，重新计算原生 PDF 子窗体尺寸。
  if (viewerUrl.value) {
    if (nativePdfWebview) applyNativePdfLayout()
    else scheduleNativePdfLayout()
  }
}, { deep: true })

onUnload(() => {
  active = false
  receiptBase64 = ''
  // #ifdef H5
  if (typeof window !== 'undefined') window.removeEventListener('message', handleViewerWindowMessage)
  // #endif
  resetNativePdfWebview()
})
</script>

<style lang="scss" scoped>
.pdf-page { display: flex; width: 100%; height: 100%; min-height: 0; overflow: hidden; flex-direction: column; background: #f3f4f6; }
.pdf-viewer { flex: 1; width: 100%; min-height: 0; }
.state-box { display: flex; min-height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 10px; padding: 24px; box-sizing: border-box; color: #8b919b; font-size: var(--type-body-small-size, 13px); text-align: center; }
.state-title { color: #25282e; font-size: var(--type-card-title-size, 16px); font-weight: var(--font-weight-bold, 700); }
</style>
