﻿<template>
  <view class="page">
    <app-header :show-back="true" :title="'新闻详情'" @back="goBack" />
    <scroll-view class="page-scroll" scroll-y :style="{ height: scrollHeight }">
      <view class="content">
        <view v-if="loading" class="article-state">加载中...</view>
        <view v-else-if="errorText" class="article-state article-state--error" @click="loadDetail">
          {{ errorText }}，点击重试
        </view>
        <view v-else-if="detail">
          <text class="article-title">{{ detail.title }}</text>
          <text class="article-meta">{{ detail.type }} · {{ detail.date }}</text>
          <view class="article-body">
            <rich-text :nodes="detail.content || ''" />
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import { getNewsDetail } from '../../api/news.js'
import { navigator } from '@/app/navigation/navigator.js'

const scrollHeight = ref('calc(100vh - 100px)')
const announcementId = ref(0)
const loading = ref(false)
const errorText = ref('')
const detail = ref(null)

onLoad((options) => {
  announcementId.value = Number(options?.id || 0)
  loadDetail()
})

onMounted(() => {
  try { const s = uni.getSystemInfoSync(); scrollHeight.value = `calc(100vh - ${(s.statusBarHeight||44) + 56}px)` } catch(e){}
})

async function loadDetail() {
  if (!announcementId.value || loading.value) {
    if (!announcementId.value) errorText.value = '公告参数无效'
    return
  }

  loading.value = true
  errorText.value = ''
  try {
    detail.value = await getNewsDetail(announcementId.value)
    if (!detail.value) errorText.value = '公告不存在或已下线'
  } catch (error) {
    console.error('[NewsDetail] 加载公告详情失败:', error)
    errorText.value = error?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goBack() { navigator.back() }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #F7F7F8; }
.page-scroll { flex: 1; }
.content { padding: 32rpx; max-width: 1200rpx; margin: 0 auto; background: white; border-radius: 24rpx; margin-top: 24rpx; }

.article-title { font-size: 42rpx; font-weight: 600; color: #111216; display: block; line-height: 1.4; }
.article-meta { display: block; color: #D7192D; font-size: 24rpx; font-weight: 600; margin-top: 16rpx; }
.article-body { margin-top: 32rpx; }
.article-state { padding: 96rpx 32rpx; color: #989BA3; text-align: center; }
.article-state--error { color: #D7192D; }
.article-text { font-size: 30rpx; color: #26282D; line-height: 1.8; display: block; margin-bottom: 24rpx; }
.article-image { width: 100%; border-radius: 16rpx; margin-bottom: 24rpx; }
</style>
