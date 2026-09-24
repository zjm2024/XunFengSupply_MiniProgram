<template>
  <view class="page">
    <app-header :show-back="true" title="手册详情" @back="goBack" />
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

        <view class="article-body">
          <rich-text v-if="detail.content" :nodes="detail.content" />
          <text v-else class="empty-content">暂无正文，请打开附件查看</text>
        </view>

        <button v-if="detail.fileUrl" class="download-button" @click="openFile">
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
import { cacheRichTextImages, getCachedResource, getCachedResourcePath } from '@/shared/utils/resourceCache.js'

const imagePlaceholder = '/static/images/image-placeholder.svg'

const manualId = ref('')
const loading = ref(true)
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
    detail.value = result
    if (result) void cacheDetailResources(result).catch(error => console.warn('[ManualDetail] 图片缓存失败:', error))
    if (!detail.value) errorText.value = '手册不存在或已下架'
  } catch (error) {
    console.error('[ManualDetail] 手册详情加载失败:', error)
    errorText.value = error?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

/** 先显示远程内容，再后台缓存封面和正文图片，避免大图阻塞详情首屏。 */
async function cacheDetailResources(result) {
  const [coverUrl, content] = await Promise.all([
    getCachedResource(result.coverUrl, { kind: 'image' }),
    cacheRichTextImages(result.content, { fallbackUrl: imagePlaceholder }),
  ])
  if (detail.value?.id !== result.id) return
  detail.value = { ...detail.value, coverUrl, content }
}

function openFile() {
  const url = detail.value?.fileUrl
  if (!url) return

  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifdef APP-PLUS
  const cachedPath = getCachedResourcePath(url, { kind: 'pdf' })
  if (cachedPath) {
    openLocalFile(cachedPath)
    return
  }

  // 优先交给系统 PDF/浏览器直接打开；同时后台缓存，避免用户先看到下载按钮。
  if (typeof plus !== 'undefined' && typeof plus.runtime?.openURL === 'function') {
    plus.runtime.openURL(url, () => openLocalFileAfterDownload(url))
    void getCachedResource(url, { kind: 'pdf', maxAge: 7 * 24 * 60 * 60 * 1000 })
    return
  }

  openLocalFileAfterDownload(url)
  // #endif
}

function openLocalFileAfterDownload(url) {
  uni.showLoading({ title: '准备预览...' })
  getCachedResource(url, { kind: 'pdf', maxAge: 7 * 24 * 60 * 60 * 1000 }).then(openLocalFile).catch(() => {
    uni.showToast({ title: '手册打开失败', icon: 'none' })
  }).finally(() => {
    uni.hideLoading()
  })
}

function openLocalFile(filePath) {
  if (!filePath) {
    uni.showToast({ title: '手册打开失败', icon: 'none' })
    return
  }
  uni.openDocument({
    filePath,
    showMenu: true,
    fail: () => uni.showToast({ title: '暂不支持预览该文件', icon: 'none' }),
  })
}

function goBack() { navigator.back() }
</script>

<style lang="scss" scoped>
.page { display: flex; height: 100vh; height: 100dvh; overflow: hidden; flex-direction: column; background: #F4F5F7; }
.page-scroll { flex: 1; min-height: 0; }
.content { min-height: calc(100% - 24px); margin: 12px; padding: 26px 22px calc(52px + env(safe-area-inset-bottom)); box-sizing: border-box; border-radius: 20px; background: #FFF; box-shadow: 0 8px 28px rgba(31,35,41,.045); }
.cover { display: block; width: 100%; height: 360px; margin-bottom: 22px; border-radius: 14px; background: #EEF0F3; }
.manual-title { display: block; color: #17191E; font-size: 24px; font-weight: 800; line-height: 1.4; }
.manual-meta { display: block; margin-top: 9px; color: #8A919C; font-size: 12px; }
.article-body { margin-top: 24px; color: #292C33; font-size: 15px; line-height: 1.9; word-break: break-word; }
.article-body :deep(img) { display: block; width: 100%; height: auto; margin: 18px 0; border-radius: 10px; }
.article-body :deep(p) { margin: 0 0 14px; line-height: 1.9; }
.article-body :deep(h1), .article-body :deep(h2), .article-body :deep(h3) { margin: 22px 0 12px; color: #17191E; font-weight: 800; line-height: 1.45; }
.empty-content { display: block; color: #94979F; font-size: 13px; text-align: center; }
.download-button { display: flex; min-height: 46px; align-items: center; justify-content: center; gap: 8px; margin-top: 28px; border: 0; border-radius: 12px; color: #FFF; background: #D7192D; font-size: 14px; font-weight: 700; }
.download-button::after { border: 0; }
.state-box { display: flex; min-height: 70vh; align-items: center; justify-content: center; flex-direction: column; gap: 9px; color: #94979F; font-size: 13px; text-align: center; }
.state-title { color: #454850; font-size: 16px; font-weight: 700; }
</style>
