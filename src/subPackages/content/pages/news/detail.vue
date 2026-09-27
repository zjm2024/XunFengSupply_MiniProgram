﻿<template>
  <view class="page">
    <app-header :show-back="true" :title="'新闻详情'" @back="goBack" />
    <scroll-view class="page-scroll" scroll-y>
      <view class="content">
        <view v-if="loading" class="article-state">加载中...</view>
        <view v-else-if="errorText" class="article-state article-state--error" @click="loadDetail">
          {{ errorText }}，点击重试
        </view>
        <view v-else-if="detail">
          <text class="article-category">{{ detail.categoryTitle || detail.type || '品牌资讯' }}</text>
          <text class="article-title">{{ detail.title || '未命名资讯' }}</text>
          <view class="article-meta">
            <text>{{ detail.date || detail.publishedAt || '最新发布' }}</text>
            <text v-if="detail.id">编号 {{ detail.id }}</text>
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
          <view class="article-body">
            <rich-text :nodes="articleNodes" />
          </view>
          <view v-if="detail.articleUrl" class="article-source" @click="copySourceUrl">
            <text class="source-label">原文链接</text>
            <text class="source-url">{{ detail.articleUrl }}</text>
            <text class="source-action">复制</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import { getNewsDetail } from '../../api/news.js'
import { navigator } from '@/app/navigation/navigator.js'
import { cacheRichTextImages, sanitizeRichTextImages } from '@/shared/utils/resourceCache.js'

const imagePlaceholder = '/static/images/image-placeholder.svg'

const articleId = ref('')
const loading = ref(false)
const errorText = ref('')
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

async function loadDetail() {
  if (!articleId.value || loading.value) {
    if (!articleId.value) errorText.value = '新闻参数无效'
    return
  }

  loading.value = true
  errorText.value = ''
  try {
    const result = await getNewsDetail(articleId.value)
    detail.value = result
      ? { ...result, content: sanitizeRichTextImages(result.content, imagePlaceholder) }
      : result
    if (result) void cacheNewsResources(result).catch(error => console.warn('[NewsDetail] 图片缓存失败:', error))
    if (!detail.value) errorText.value = '新闻不存在或已下线'
  } catch (error) {
    console.error('[NewsDetail] 加载公告详情失败:', error)
    errorText.value = error?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function cacheNewsResources(result) {
  const [coverUrl, content] = await Promise.all([
    // 封面由 AppProductImage 负责缓存，这里只处理富文本图片。
    Promise.resolve(result.coverUrl || result.imageUrl || ''),
    cacheRichTextImages(result.content, { fallbackUrl: imagePlaceholder }),
  ])
  if (detail.value?.id !== result.id) return
  // 缓存完成后必须回写正文，否则页面仍会继续使用占位图或远程地址。
  detail.value = { ...detail.value, coverUrl, content }
}

/** 返回资讯列表。 */
function goBack() { navigator.back() }

/** 复制资讯原文链接。 */
function copySourceUrl() {
  if (!detail.value?.articleUrl) return
  uni.setClipboardData({
    data: detail.value.articleUrl,
    success: () => uni.showToast({ title: '链接已复制', icon: 'none' }),
  })
}
</script>

<style lang="scss" scoped>
.page { height: 100vh; height: 100dvh; display: flex; overflow: hidden; flex-direction: column; background: #F4F5F7; }
.page-scroll { flex: 1; min-height: 0; }
.content { min-height: calc(100% - 24rpx); margin: 12rpx; padding: 34rpx 30rpx calc(60rpx + env(safe-area-inset-bottom)); box-sizing: border-box; border-radius: 20rpx; background: #FFFFFF; box-shadow: 0 8rpx 28rpx rgba(31,35,41,.045); }

.article-category { display: block; color: #C61D32; font-size: 24rpx; font-weight: 700; }
.article-title { display: block; margin-top: 18rpx; color: #1B1F24; font-size: 44rpx; font-weight: 800; line-height: 1.35; }
.article-meta { display: flex; justify-content: space-between; gap: 24rpx; margin-top: 18rpx; color: #8A919C; font-size: 24rpx; }
.article-cover { display: block; width: 100%; height: 360rpx; margin-top: 30rpx; border-radius: 18rpx; background: #EEF0F3; }
.article-summary { display: block; margin-top: 28rpx; padding: 22rpx 24rpx; border-left: 6rpx solid #D7192D; border-radius: 0 12rpx 12rpx 0; color: #59616D; background: #F8F9FA; font-size: 28rpx; line-height: 1.7; }
.article-body { margin-top: 34rpx; color: #292C33; font-size: 30rpx; line-height: 1.9; word-break: break-word; }
.article-body :deep(h1), .article-body :deep(h2), .article-body :deep(h3) { margin: 34rpx 0 18rpx; color: #17191E; font-weight: 800; line-height: 1.45; }
.article-body :deep(h1) { font-size: 40rpx; }
.article-body :deep(h2) { font-size: 36rpx; }
.article-body :deep(h3) { font-size: 32rpx; }
.article-body :deep(p) { margin: 0 0 24rpx; color: #292C33; font-size: 30rpx; line-height: 1.9; }
.article-body :deep(strong), .article-body :deep(b) { color: #17191E; font-weight: 800; }
.article-body :deep(a) { color: #C61D32; text-decoration: underline; }
.article-body :deep(ul), .article-body :deep(ol) { margin: 0 0 24rpx; padding-left: 36rpx; }
.article-body :deep(li) { margin-bottom: 12rpx; line-height: 1.8; }
.article-body :deep(blockquote) { margin: 24rpx 0; padding: 18rpx 22rpx; border-left: 6rpx solid #D7192D; border-radius: 0 12rpx 12rpx 0; color: #59616D; background: #F8F9FA; }
.article-body :deep(img) { display: block; width: 100%; height: auto; margin: 24rpx 0; border-radius: 14rpx; }
.article-body :deep(table) { display: block; width: 100%; overflow-x: auto; margin: 24rpx 0; border-collapse: collapse; }
.article-body :deep(th), .article-body :deep(td) { padding: 14rpx; border: 1rpx solid #E5E7EB; text-align: left; }
.article-source { display: flex; align-items: center; gap: 16rpx; margin-top: 42rpx; padding: 22rpx 24rpx; border: 1rpx solid #ECEEF1; border-radius: 14rpx; color: #66707C; background: #FAFBFC; font-size: 24rpx; }
.source-label { flex: none; color: #252A31; font-weight: 700; }
.source-url { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.source-action { flex: none; color: #C61D32; font-weight: 700; }
.article-state { padding: 96rpx 32rpx; color: #989BA3; text-align: center; }
.article-state--error { color: #D7192D; }
.article-text { font-size: 30rpx; color: #26282D; line-height: 1.8; display: block; margin-bottom: 24rpx; }
.article-image { width: 100%; border-radius: 16rpx; margin-bottom: 24rpx; }

@media screen and (min-width: 700px) {
  .content { margin: 24rpx; padding: 42rpx 7vw 72rpx; }
  .article-cover { height: 420rpx; }
}
</style>
