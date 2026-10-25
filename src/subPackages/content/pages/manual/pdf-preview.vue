<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('content.titles.manualPreview')" :show-back="true" @back="goBack" />
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

const manualId = ref('')
const loading = ref(true)
const loadFailure = ref(null)
const errorText = computed(() => loadFailure.value?.message
  || (loadFailure.value?.messageKey ? t(loadFailure.value.messageKey) : ''))
const viewerUrl = ref('')
const viewerComponent = ref(null)
const viewerMessageKeys = ['title', 'back', 'preparing', 'failed', 'previewFailed', 'rangeRequired',
  'rangeInvalid', 'rangeLength', 'lazyPage', 'pageFailed', 'relayout', 'missingUrl', 'checkingRange', 'pages']

const { layout, safeArea } = useResponsive()

// APP-VUE 中的 web-view 是原生子窗体，必须在渲染完成后调整到 AppHeader 下方。
let nativePdfWebview = null
let nativeLayoutTimer = null
let nativeLayoutAttempts = 0

const headerHeight = () => {
  const topInset = Math.max(
    Number(layout.value.statusBarHeight) || 0,
    Number(safeArea.value.top) || 0,
  )
  const navBarHeight = layout.value.isPhone ? 48 : 52
  return topInset + navBarHeight
}

const bottomSafeHeight = () => Math.max(Number(safeArea.value.bottom) || 0, 8)

onLoad((options = {}) => {
  manualId.value = String(options.manualId || '')
  loadDetail()
})

onReady(() => {
  // 原生 web-view 的子窗体创建晚于 Vue 页面 ready，需要再次校准位置。
  scheduleNativePdfLayout()
})

/** 读取原 PDF 附件地址，保留原生布局与加载流程。 */
async function loadDetail() {
  if (!manualId.value) {
    loadFailure.value = { messageKey: 'content.manual.missingId' }
    loading.value = false
    return
  }

  loading.value = true
  loadFailure.value = null
  viewerUrl.value = ''
  resetNativePdfWebview()
  try {
    const detail = await getManualDetail(manualId.value)
    if (!detail?.fileUrl) {
      loadFailure.value = { messageKey: 'content.manual.noPdf' }
      return
    }

    viewerUrl.value = `/subPackages/content/static/pdf-viewer/index.html?embedded=1&url=${encodeURIComponent(detail.fileUrl)}&ui=${encodeURIComponent(JSON.stringify(viewerLanguagePayload()))}`
  } catch (error) {
    console.error('[ManualPdfPreview] 加载 PDF 地址失败:', error)
    loadFailure.value = error?.message ? error : { messageKey: 'content.manual.pdfFailed' }
  } finally {
    loading.value = false
    scheduleNativePdfLayout()
  }
}

function goBack() { navigator.back() }

/** 从 content JSON 取出独立阅读器文案，不向 HTML 传递会话或修改附件签名地址。 */
function viewerLanguagePayload() {
  return { type: 'pdf-viewer-locale', locale: getLocale(),
    messages: Object.fromEntries(viewerMessageKeys.map(key => [key, t('content.pdfViewer.' + key)])) }
}

/** 阅读器加载完成后同步语言和原生位置，已加载文档不重建。 */
function handleViewerLoad() {
  syncViewerLanguage()
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

  const top = headerHeight()
  const bottom = bottomSafeHeight()
  const height = Math.max(1, (Number(layout.value.windowHeight) || 0) - top - bottom)

  nativePdfWebview.setStyle({
    top: `${top}px`,
    height: `${height}px`,
    width: '100%',
    left: '0px',
    background: '#f3f4f6',
  })

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
  resetNativePdfWebview()
})
</script>

<style lang="scss" scoped>
.pdf-page { display: flex; width: 100%; height: 100%; min-height: 0; overflow: hidden; flex-direction: column; background: #f3f4f6; }
.pdf-viewer { flex: 1; width: 100%; min-height: 0; }
.state-box { display: flex; min-height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 10px; padding: 24px; box-sizing: border-box; color: #8b919b; font-size: 13px; text-align: center; }
.state-title { color: #25282e; font-size: 16px; font-weight: 700; }
</style>
