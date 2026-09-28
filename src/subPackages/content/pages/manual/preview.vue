<template>
  <view class="page">
    <app-header :show-back="true" title="产品手册详情" @back="goBack" />
    <scroll-view class="page-scroll" scroll-y>
      <view v-if="loading" class="state-box"><text>正在加载手册...</text></view>
      <view v-else-if="errorText" class="state-box" @click="loadDetail">
        <text class="state-title">{{ errorText }}</text>
        <text>点击重试</text>
      </view>
      <view v-else class="content">
        <AppProductImage class="cover" :src="detail.coverUrl" mode="aspectFit" :fallback-icon-size="42" />
        <text class="manual-title">{{ detail.title || '未命名手册' }}</text>
        <text class="manual-meta">{{ detail.date ? `更新于 ${detail.date}` : '暂无发布日期' }}</text>

        <view v-if="contentLoading" class="article-body-state" aria-label="正文图片加载中">
          <view class="article-body-spinner" />
          <text>正文图片加载中...</text>
        </view>
        <view v-else class="article-body">
          <rich-text v-if="detail.content" :nodes="detail.content" />
          <text v-else class="empty-content">暂无正文，请打开附件查看</text>
        </view>

        <button v-if="detail.fileUrl" class="download-button" @tap="openFile">
          <AppIcon name="download" :size="17" />
          <text>打开 PDF 手册</text>
        </button>
        <text v-else class="empty-content">当前手册暂无可下载附件</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import { getManualDetail } from '../../api/manual.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { cacheRichTextImages } from '@/shared/utils/resourceCache.js'

const imagePlaceholder = '/static/images/image-placeholder.svg'

const manualId = ref('')
const loading = ref(true)
const contentLoading = ref(false)
const errorText = ref('')
const detail = ref({})

onLoad((options = {}) => {
  manualId.value = String(options.manualId || '')
  loadDetail()
})

async function loadDetail() {
  if (!manualId.value) {
    errorText.value = '缺少手册编号'
    loading.value = false
    return
  }

  loading.value = true
  errorText.value = ''
  try {
    const result = await getManualDetail(manualId.value)
    // APP 端先等待正文图片缓存，避免 rich-text 首次渲染错误占位图。
    detail.value = result ? { ...result, content: '' } : result
    if (result) void cacheDetailResources(result)
    if (!detail.value) errorText.value = '手册不存在或已下架'
  } catch (error) {
    console.error('[ManualDetail] 手册详情加载失败:', error)
    errorText.value = error?.message || '加载失败'
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

async function openFile() {
  const url = detail.value?.fileUrl
  const id = detail.value?.id || manualId.value
  if (!url) {
    uni.showToast({ title: '当前手册没有 PDF 附件', icon: 'none' })
    return
  }
  if (!id) {
    uni.showToast({ title: '缺少手册编号', icon: 'none' })
    return
  }

  const target = routes.content.manualPdfPreview(id)
  const navigated = await navigator.navigateTo(target)
  if (!navigated) {
    console.warn('[ManualDetail] PDF 预览页导航失败:', { id, target })
    uni.showToast({ title: 'PDF 预览页打开失败', icon: 'none' })
  }
}

function goBack() { navigator.back() }
</script>

<style lang="scss" scoped>
.page { display: flex; height: 100vh; height: 100dvh; overflow: hidden; flex-direction: column; background: #F4F5F7; }
.page-scroll { flex: 1; min-height: 0; }
.content { min-height: calc(100% - 24px); margin: 12px; padding: 26px 22px calc(52px + env(safe-area-inset-bottom)); box-sizing: border-box; border-radius: 20px; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.cover { display: block; width: 100%; height: 360px; margin-bottom: 22px; border-radius: 14px; background: #EEF0F3; }
.manual-title { display: block; color: #17191E; font-size: 24px; font-weight: 800; line-height: 1.4; }
.manual-meta { display: block; margin-top: 9px; color: #8A919C; font-size: 12px; }
.article-body { margin-top: 24px; color: #292C33; font-size: 15px; line-height: 1.9; word-break: break-word; }
.article-body-state { display: flex; min-height: 180px; margin-top: 24px; align-items: center; justify-content: center; gap: 10px; color: #969AA3; font-size: 14px; }
.article-body-spinner { width: 18px; height: 18px; border: 2px solid #E5E7EB; border-top-color: #D7192D; border-radius: 50%; animation: manual-body-spin .8s linear infinite; }
@keyframes manual-body-spin { to { transform: rotate(360deg); } }
.article-body :deep(img) { display: block; width: 100%; height: auto; margin: 18px 0; border-radius: 10px; }
.article-body :deep(p) { margin: 0 0 14px; line-height: 1.9; }
.article-body :deep(h1), .article-body :deep(h2), .article-body :deep(h3) { margin: 22px 0 12px; color: #17191E; font-weight: 800; line-height: 1.45; }
.empty-content { display: block; color: #94979F; font-size: 13px; text-align: center; }
.download-button { display: flex; min-height: 46px; align-items: center; justify-content: center; gap: 8px; margin-top: 28px; border: 0; border-radius: 12px; color: #FFF; background: #D7192D; font-size: 14px; font-weight: 700; }
.download-button::after { border: 0; }
.state-box { display: flex; min-height: 70vh; align-items: center; justify-content: center; flex-direction: column; gap: 9px; color: #94979F; font-size: 13px; text-align: center; }
.state-title { color: #454850; font-size: 16px; font-weight: 700; }
</style>
