﻿<template>
  <view class="page">
    <app-header :show-back="true" :title="t('content.titles.newsDetail')" @back="goBack" />
    <scroll-view class="page-scroll" scroll-y>
      <view class="content">
        <view v-if="loading" class="article-state">{{ t('content.news.loading') }}</view>
        <view v-else-if="errorText" class="article-state article-state--error" @click="loadDetail">
          {{ errorText }} · {{ t('content.news.retry') }}
        </view>
        <view v-else-if="detail">
          <text class="article-category">{{ detail.categoryTitle || detail.type || t('content.news.categoryFallback') }}</text>
          <text class="article-title">{{ detail.title || t('content.news.untitled') }}</text>
          <view class="article-meta">
            <text>{{ detail.date || detail.publishedAt || t('content.news.latest') }}</text>
            <text v-if="detail.id">{{ t('content.news.reference', { id: detail.id }) }}</text>
          </view>
          <AppProductImage
            class="article-cover"
            :src="detail.coverUrl || detail.imageUrl"
            mode="aspectFill"
            :fallback-icon-size="46"
          />
          <text v-if="detail.summary || detail.desc" class="article-summary">
            {{ detail.summary || detail.desc }}
          </text>
          <view v-if="articleContentLoading" class="article-body-state" :aria-label="t('content.news.bodyLoadingLabel')">
            <view class="article-body-spinner" />
            <text>{{ t('content.news.bodyLoading') }}</text>
          </view>
          <view v-else class="article-body">
            <rich-text :nodes="articleNodes" />
          </view>
          <view v-if="detail.articleUrl" class="article-source" @click="copySourceUrl">
            <text class="source-label">{{ t('content.news.source') }}</text>
            <text class="source-url">{{ detail.articleUrl }}</text>
            <text class="source-action">{{ t('content.news.copy') }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/content/i18n/register.js'
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import { getNewsDetail } from '../../api/news.js'
import { navigator } from '@/app/navigation/navigator.js'
import { cacheRichTextImages } from '@/shared/utils/resourceCache.js'

const imagePlaceholder = '/static/images/image-placeholder.svg'

const articleId = ref('')
const loading = ref(false)
const articleContentLoading = ref(false)
const loadFailure = ref(null)
const errorText = computed(() => loadFailure.value?.message
  || (loadFailure.value?.messageKey ? t(loadFailure.value.messageKey) : ''))
const detail = ref(null)
const articleNodes = computed(() => {
  const content = detail.value?.content
  if (Array.isArray(content)) return content
  return typeof content === 'string' ? content.trim() : ''
})

onLoad((options) => {
  articleId.value = String(options?.id || '')
  loadDetail()
})

/** 按原文章 ID 读取内容，保留本地错误键和远端原始消息。 */
async function loadDetail() {
  if (!articleId.value || loading.value) {
    if (!articleId.value) loadFailure.value = { messageKey: 'content.news.invalid' }
    return
  }

  loading.value = true
  loadFailure.value = null
  try {
    const result = await getNewsDetail(articleId.value)
    // 先展示文章元信息；正文图片全部缓存完成后再交给 rich-text 渲染，
    // 避免 APP 端首次渲染远程地址或错误占位图。
    detail.value = result ? { ...result, content: '' } : result
    if (result) void cacheNewsResources(result)
    if (!detail.value) loadFailure.value = { messageKey: 'content.news.missing' }
  } catch (error) {
    console.error('[NewsDetail] 加载公告详情失败:', error)
    loadFailure.value = error?.message ? error : { messageKey: 'content.news.loadFailed' }
  } finally {
    loading.value = false
  }
}

async function cacheNewsResources(result) {
  articleContentLoading.value = true
  try {
    // 封面由 AppProductImage 负责缓存，这里只处理富文本图片。
    const content = Array.isArray(result.content)
      ? result.content
      : await cacheRichTextImages(result.content, { fallbackUrl: imagePlaceholder })
    if (detail.value?.id !== result.id) return
    // 缓存完成后必须回写正文，否则页面仍会继续使用远程地址或占位图。
    detail.value = { ...detail.value, content }
  } catch (error) {
    console.warn('[NewsDetail] 正文图片缓存失败:', error)
    if (detail.value?.id === result.id) detail.value = { ...detail.value, content: result.content }
  } finally {
    if (detail.value?.id === result.id) articleContentLoading.value = false
  }
}

/** 返回资讯列表。 */
function goBack() { navigator.back() }

/** 复制资讯原文链接。 */
function copySourceUrl() {
  if (!detail.value?.articleUrl) return
  uni.setClipboardData({
    data: detail.value.articleUrl,
    success: () => uni.showToast({ title: t('content.news.copied'), icon: 'none' }),
  })
}
</script>

<style lang="scss" scoped>
.page { height: 100vh; height: 100dvh; display: flex; overflow: hidden; flex-direction: column; background: #F4F5F7; }
.page-scroll { flex: 1; min-height: 0; }
.content { min-height: calc(100% - 24rpx); margin: 12rpx; padding: 34rpx 30rpx calc(60rpx + env(safe-area-inset-bottom)); box-sizing: border-box; border-radius: 20rpx; background: rgba(255,255,255,.74); box-shadow: 0 10px 28px rgba(55,65,80,.07); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }

.article-category { display: block; color: #C61D32; font-size: 12px; font-weight: 700; }
.article-title { display: block; margin-top: 18rpx; color: #1B1F24; font-size: 22px; font-weight: 800; line-height: 1.35; }
.article-meta { display: flex; justify-content: space-between; gap: 24rpx; margin-top: 18rpx; color: #8A919C; font-size: 12px; }
.article-cover { display: block; width: 100%; height: 360rpx; margin-top: 30rpx; border-radius: 18rpx; background: #EEF0F3; }
.article-summary { display: block; margin-top: 28rpx; padding: 22rpx 24rpx; border-left: 6rpx solid #D7192D; border-radius: 0 12rpx 12rpx 0; color: #59616D; background: #F8F9FA; font-size: 14px; line-height: 1.7; }
.article-body { margin-top: 34rpx; color: #292C33; font-size: 15px; line-height: 1.9; word-break: break-word; }
.article-body-state { display: flex; min-height: 180px; margin-top: 34px; align-items: center; justify-content: center; gap: 10px; color: #969AA3; font-size: 14px; }
.article-body-spinner { width: 18px; height: 18px; border: 2px solid #E5E7EB; border-top-color: #D7192D; border-radius: 50%; animation: article-body-spin .8s linear infinite; }
@keyframes article-body-spin { to { transform: rotate(360deg); } }
.article-body :deep(h1), .article-body :deep(h2), .article-body :deep(h3) { margin: 34rpx 0 18rpx; color: #17191E; font-weight: 800; line-height: 1.45; }
.article-body :deep(h1) { font-size: 20px; }
.article-body :deep(h2) { font-size: 18px; }
.article-body :deep(h3) { font-size: 16px; }
.article-body :deep(p) { margin: 0 0 24rpx; color: #292C33; font-size: 15px; line-height: 1.9; }
.article-body :deep(strong), .article-body :deep(b) { color: #17191E; font-weight: 800; }
.article-body :deep(a) { color: #C61D32; text-decoration: underline; }
.article-body :deep(ul), .article-body :deep(ol) { margin: 0 0 24rpx; padding-left: 36rpx; }
.article-body :deep(li) { margin-bottom: 12rpx; line-height: 1.8; }
.article-body :deep(blockquote) { margin: 24rpx 0; padding: 18rpx 22rpx; border-left: 6rpx solid #D7192D; border-radius: 0 12rpx 12rpx 0; color: #59616D; background: #F8F9FA; }
.article-body :deep(img) { display: block; width: 100%; height: auto; margin: 24rpx 0; border-radius: 14rpx; }
.article-body :deep(table) { display: block; width: 100%; overflow-x: auto; margin: 24rpx 0; border-collapse: collapse; }
.article-body :deep(th), .article-body :deep(td) { padding: 14rpx; border: 1rpx solid #E5E7EB; text-align: left; }
.article-source { display: flex; align-items: center; gap: 16rpx; margin-top: 42rpx; padding: 22rpx 24rpx; border: 1rpx solid #ECEEF1; border-radius: 14rpx; color: #66707C; background: #FAFBFC; font-size: 12px; }
.source-label { flex: none; color: #252A31; font-weight: 700; }
.source-url { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.source-action { flex: none; color: #C61D32; font-weight: 700; }
.article-state { padding: 96rpx 32rpx; color: #989BA3; text-align: center; }
.article-state--error { color: #D7192D; }
.article-text { font-size: 15px; color: #26282D; line-height: 1.8; display: block; margin-bottom: 24rpx; }
.article-image { width: 100%; border-radius: 16rpx; margin-bottom: 24rpx; }

@media screen and (min-width: 700px) {
  .content { margin: 24rpx; padding: 42rpx 7vw 72rpx; }
  .article-cover { height: 420rpx; }
}
</style>
