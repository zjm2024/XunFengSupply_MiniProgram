<template>
  <view class="page">
    <app-header :show-back="true" :title="t('content.titles.manualDetail')" @back="goBack" />
    <scroll-view class="page-scroll" scroll-y>
      <AppPageState page-loading v-if="loading" state="loading" />
      <view v-else-if="errorText" class="state-box" @click="loadDetail">
        <text class="state-title">{{ errorText }}</text>
        <text>{{ t('content.manual.retry') }}</text>
      </view>
      <view v-else class="content">
        <view class="manual-layout">
          <view class="poster-area">
            <view
              class="cover-frame"
              role="button"
              tabindex="0"
              :aria-label="t('content.titles.manualPreview')"
              @click="previewCover"
              @keydown.enter.prevent="previewCover"
              @keydown.space.prevent="previewCover"
            >
              <AppProductImage class="cover" :src="detail.coverUrl" mode="widthFix" :fallback-icon-size="42" />
            </view>
          </view>
          <view class="manual-info">
            <text class="manual-title">{{ detail.title || t('content.manual.untitled') }}</text>
            <view class="manual-properties">
              <view class="manual-property">
                <text class="manual-label">{{ t('content.manual.updatedLabel') }}</text>
                <text class="manual-value manual-meta">{{ detail.date || t('content.manual.noDate') }}</text>
              </view>
              <view v-if="detail.fileUrl" class="manual-property">
                <text class="manual-label">{{ t('content.manual.previewModeLabel') }}</text>
                <text class="manual-value">{{ t('content.manual.pdfPreviewMode') }}</text>
              </view>
            </view>

            <AppButton v-if="detail.fileUrl" class="download-button" block @tap="openFile">
              <AppIcon name="book-open" :size="18" />
              <text>{{ t('content.manual.openPdf') }}</text>
            </AppButton>
            <text v-else class="empty-content">{{ t('content.manual.emptyAttachment') }}</text>
          </view>
        </view>

        <view v-if="contentLoading || hasDescription" class="manual-body-section">
          <view v-if="contentLoading" class="article-body-state" :aria-label="t('content.manual.bodyLoadingLabel')">
            <view class="article-body-spinner" />
            <text>{{ t('content.manual.bodyLoading') }}</text>
          </view>
          <view v-else class="article-body">
            <rich-text :nodes="detail.content" />
          </view>
        </view>
      </view>
    </scroll-view>
    <AppImageViewer v-model="coverViewerVisible" :images="coverViewerImages" />
  </view>
</template>

<script setup>
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/content/i18n/register.js'
import { computed, ref } from 'vue'
import { onBackPress, onHide, onLoad } from '@dcloudio/uni-app'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppImageViewer from '@/shared/ui/AppImageViewer/AppImageViewer.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import { getManualDetail } from '../../api/manual.js'
import { navigator } from '@/app/navigation/navigator.js'
import { handoffManualPdfSource, discardManualPdfSource } from '@/shared/services/manualPdfSource.js'
import { routes } from '@/app/config/routes.js'
import { cacheRichTextImages } from '@/shared/utils/resourceCache.js'

const imagePlaceholder = '/static/images/image-placeholder.svg'

const manualId = ref('')
const loading = ref(true)
const contentLoading = ref(false)
const loadFailure = ref(null)
const errorText = computed(() => loadFailure.value?.message
  || (loadFailure.value?.messageKey ? t(loadFailure.value.messageKey) : ''))
const detail = ref({})
const coverViewerVisible = ref(false)
const coverViewerImages = computed(() => {
  const url = String(detail.value?.coverUrl || '').trim()
  return url ? [url] : []
})

function previewCover() {
  if (coverViewerImages.value.length) coverViewerVisible.value = true
}

onHide(() => { coverViewerVisible.value = false })
onBackPress(() => {
  if (!coverViewerVisible.value) return false
  coverViewerVisible.value = false
  return true
})
/** 仅判断显示价值，不修改原正文；空HTML不占位，纯图片正文仍展示。 */
const hasDescription = computed(() => hasVisibleDescription(detail.value?.content))

function hasVisibleDescription(value) {
  if (Array.isArray(value)) return value.some(hasVisibleDescription)
  if (value && typeof value === 'object') {
    const tag = String(value.name || value.type || '').toLowerCase()
    if (tag === 'script' || tag === 'style') return false
    if (['img', 'video', 'audio'].includes(tag)) return true
    return hasVisibleDescription(value.text) || hasVisibleDescription(value.children)
  }
  const html = String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  if (/<(?:img|video|audio)\b/i.test(html)) return true
  return Boolean(html.replace(/<[^>]*>/g, '')
    .replace(/&(?:nbsp|ensp|emsp|thinsp);|&#(?:0*(?:160|32)|x0*(?:a0|20));/gi, '')
    .replace(/[\s\u200B-\u200D\uFEFF]/g, ''))
}

onLoad((options = {}) => {
  manualId.value = String(options.manualId || '')
  loadDetail()
})

/** 读取原手册与正文资源，仅本地化页面错误。 */
async function loadDetail() {
  if (!manualId.value) {
    loadFailure.value = { messageKey: 'content.manual.missingId' }
    loading.value = false
    return
  }

  loading.value = true
  loadFailure.value = null
  try {
    const result = await getManualDetail(manualId.value)
    // APP 端先等待正文图片缓存，避免 rich-text 首次渲染错误占位图。
    detail.value = result ? { ...result, content: '' } : result
    if (result) void cacheDetailResources(result)
    if (!detail.value) loadFailure.value = { messageKey: 'content.manual.missing' }
  } catch (error) {
    console.error('[ManualDetail] 手册详情加载失败:', error)
    loadFailure.value = error?.message ? error : { messageKey: 'content.manual.loadFailed' }
  } finally {
    loading.value = false
  }
}

async function cacheDetailResources(result) {
  contentLoading.value = true
  try {
    const content = Array.isArray(result.content)
      ? result.content
      : await cacheRichTextImages(result.content, { fallbackUrl: imagePlaceholder })
    if (detail.value?.id !== result.id) return
    detail.value = { ...detail.value, content }
  } catch (error) {
    console.warn('[ManualDetail] 正文图片缓存失败:', error)
    if (detail.value?.id === result.id) detail.value = { ...detail.value, content: result.content }
  } finally {
    if (detail.value?.id === result.id) contentLoading.value = false
  }
}

/** 复用详情已取得的附件地址，再沿统一路由进入阅读器。 */
async function openFile() {
  const url = detail.value?.fileUrl
  const id = detail.value?.id || manualId.value
  if (!url) {
    uni.showToast({ title: t('content.manual.noPdf'), icon: 'none' })
    return
  }
  if (!id) {
    uni.showToast({ title: t('content.manual.missingId'), icon: 'none' })
    return
  }

  handoffManualPdfSource(id, url)
  const target = routes.content.manualPdfPreview(id)
  const navigated = await navigator.navigateTo(target)
  if (!navigated) {
    discardManualPdfSource(id)
    console.warn('[ManualDetail] PDF 预览页导航失败:', { id, target })
    uni.showToast({ title: t('content.manual.openFailed'), icon: 'none' })
  }
}

function goBack() { navigator.back() }
</script>

<style lang="scss" scoped>
.page { display: flex; height: 100vh; height: 100dvh; overflow: hidden; flex-direction: column; background: var(--surface-page, #F4F5F8); }
.page-scroll { flex: 1; height: 0; min-height: 0; }
.content { width: 100%; max-width: 1120px; margin: 0 auto; padding: 24px var(--page-content-gutter, 16px) calc(32px + env(safe-area-inset-bottom)); box-sizing: border-box; }
/* 平板采用一体式双栏，封面高度由图片自身比例决定。 */
.manual-layout { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); align-items: stretch; overflow: hidden; border-radius: var(--radius-feature, 18px); background: var(--surface-card, #FFF); }
.poster-area { --product-image-background: transparent; display: flex; min-width: 0; align-items: center; justify-content: center; padding: 48px 32px; background: #F7F8FA; }
.cover-frame { width: 100%; max-width: 340px; cursor: zoom-in; }
/* widthFix完整展示原图，圆角与阴影贴合实际图片边界。 */
.cover { display: block; width: 100%; height: auto; overflow: hidden; border-radius: 10px; background: transparent; box-shadow: 0 12px 28px rgba(17, 18, 22, .10); }
.manual-info { display: flex; min-width: 0; flex-direction: column; align-items: stretch; justify-content: center; gap: 28px; padding: 48px 40px; box-sizing: border-box; background: var(--surface-card, #FFF); }
.manual-title { display: block; max-width: 100%; color: var(--text-primary, #1B1C20); font-size: var(--type-heading-size, 24px); font-weight: var(--font-weight-bold, 700); line-height: 1.45; word-break: break-word; overflow-wrap: anywhere; }
.manual-properties { display: flex; flex-direction: column; gap: 16px; width: 100%; padding-top: 20px; border-top: 1px solid var(--border-color, #E5E7EB); }
.manual-property { display: flex; min-width: 0; justify-content: space-between; align-items: baseline; gap: 16px; font-size: var(--type-body-size, 14px); line-height: 22px; }
.manual-label { flex-shrink: 0; color: var(--type-secondary-color, #737A84); }
.manual-value { min-width: 0; color: var(--text-primary, #1B1C20); font-weight: var(--font-weight-semibold, 600); text-align: right; word-break: break-word; overflow-wrap: anywhere; }
.manual-info .download-button { width: 100%; max-width: none; margin-top: 4px; }
.manual-body-section { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--border-color, #E5E7EB); }
.article-body { color: var(--text-primary, #1B1C20); font-size: var(--type-body-size, 14px); line-height: 1.9; word-break: break-word; overflow-wrap: anywhere; }
.article-body-state { display: flex; min-height: 64px; align-items: center; justify-content: center; gap: 10px; color: var(--type-secondary-color, #737A84); font-size: var(--type-body-size, 14px); }
.article-body-spinner { width: 18px; height: 18px; flex-shrink: 0; box-sizing: border-box; border: 2px solid var(--border-color, #E5E7EB); border-top-color: var(--primary-color, #D7192D); border-radius: 50%; animation: manual-body-spin .8s linear infinite; }
@keyframes manual-body-spin { to { transform: rotate(360deg); } }
.article-body :deep(img) { display: block; max-width: 100%; height: auto; margin: 18px auto; }
.article-body :deep(p) { margin: 0 0 14px; line-height: 1.9; }
.article-body :deep(h1), .article-body :deep(h2), .article-body :deep(h3) { margin: 22px 0 12px; color: var(--text-primary, #1B1C20); font-weight: var(--font-weight-bold, 700); line-height: 1.45; }
.empty-content { display: block; max-width: 100%; color: var(--type-secondary-color, #737A84); font-size: var(--type-body-small-size, 13px); line-height: 22px; }
.state-box { display: flex; min-height: 70vh; align-items: center; justify-content: center; flex-direction: column; gap: 9px; padding: 24px; box-sizing: border-box; color: var(--type-secondary-color, #737A84); font-size: var(--type-body-small-size, 13px); text-align: center; }
.state-title { color: var(--text-primary, #1B1C20); font-size: var(--type-card-title-size, 16px); font-weight: var(--font-weight-semibold, 600); }
@media (max-width: 699px) {
  .content { max-width: 480px; padding-top: 16px; padding-bottom: calc(24px + env(safe-area-inset-bottom)); }
  .manual-layout { display: flex; flex-direction: column; align-items: stretch; gap: 24px; overflow: visible; border-radius: 0; background: transparent; }
  .poster-area { padding: 8px 0; background: transparent; }
  .cover-frame { max-width: 220px; }
  .manual-info { gap: 20px; padding: 24px; border-radius: var(--radius-feature, 18px); }
  .manual-title { font-size: var(--type-section-title-size, 20px); line-height: 1.45; }
}
@media (prefers-reduced-motion: reduce) { .article-body-spinner { animation: none; } }
</style>
