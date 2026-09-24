<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="产品手册预览" :show-back="true" @back="goBack" />
    </template>
    <template #content>
      <view class="pdf-page">
        <view v-if="loading" class="state-box">
          <text class="state-title">正在准备 PDF 预览...</text>
          <text>首次打开会按页面分片加载</text>
        </view>
        <view v-else-if="errorText" class="state-box" @click="loadDetail">
          <text class="state-title">{{ errorText }}</text>
          <text>点击重试</text>
        </view>
        <web-view
          v-else-if="viewerUrl"
          class="pdf-viewer"
          :src="viewerUrl"
          @load="scheduleNativePdfLayout"
        />
      </view>
    </template>
  </AppPageShell>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { onLoad, onReady, onUnload } from '@dcloudio/uni-app'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { useResponsive } from '@/shared/composables/useResponsive.js'
import { getManualDetail } from '../../api/manual.js'

const manualId = ref('')
const loading = ref(true)
const errorText = ref('')
const viewerUrl = ref('')

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

async function loadDetail() {
  if (!manualId.value) {
    errorText.value = '缺少手册编号'
    loading.value = false
    return
  }

  loading.value = true
  errorText.value = ''
  viewerUrl.value = ''
  resetNativePdfWebview()
  try {
    const detail = await getManualDetail(manualId.value)
    if (!detail?.fileUrl) {
      errorText.value = '当前手册没有 PDF 附件'
      return
    }

    viewerUrl.value = `/static/pdf-viewer/index.html?embedded=1&url=${encodeURIComponent(detail.fileUrl)}`
  } catch (error) {
    console.error('[ManualPdfPreview] 加载 PDF 地址失败:', error)
    errorText.value = error?.message || 'PDF 预览准备失败'
  } finally {
    loading.value = false
    scheduleNativePdfLayout()
  }
}

function goBack() { navigator.back() }

function scheduleNativePdfLayout() {
  // #ifdef APP-PLUS
  if (!viewerUrl.value) return
  if (nativeLayoutTimer) clearTimeout(nativeLayoutTimer)
  nativeLayoutAttempts = 0

  const tryLayout = () => {
    const webview = findNativePdfWebview()
    if (webview) {
      nativePdfWebview = webview
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
