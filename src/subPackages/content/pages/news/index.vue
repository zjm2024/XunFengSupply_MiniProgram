﻿<template>
  <AppPageShell>
    <template #header>
      <app-header title="新闻资讯" :show-back="true" />
    </template>

    <template #content>
      <AppContent
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="handleRefresh"
        @refresherrestore="handleRefresherRestore"
        @refresherabort="handleRefresherRestore"
        @scrolltolower="handleLoadMore"
      >
        <view class="news-content">
          <!-- Tab 切换 -->
          <scroll-view class="segment-tabs" scroll-x>
            <view class="segment-tabs-inner">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                class="tab-btn"
                :class="{ 'is-active': activeTab === tab.key }"
                @click="activeTab = tab.key"
              >{{ tab.label }}</button>
            </view>
          </scroll-view>

          <!-- 新闻列表：使用 AppPageState 统一状态管理 -->
          <app-page-state
            :state="pageStatus.status.value"
            :has-stale-content="pageStatus.hasStaleContent.value"
            icon-type="message"
            action-text="重新加载"
            :fullscreen="false"
            @retry="handleRetry"
          >
            <!-- 正常内容 -->
            <view class="news-list">
              <view v-for="item in listNews" :key="item.id" class="news-item" @click="goToDetail(item)">
                <AppProductImage
                  class="item-thumb"
                  :src="item.coverUrl || item.imageUrl"
                  mode="aspectFill"
                  lazy-load
                  :fallback-icon-size="34"
                />
                <view class="item-info">
                  <view class="item-meta">
                    <text class="item-type">{{ item.categoryTitle || item.type || '品牌资讯' }}</text>
                    <text class="item-date">{{ item.date || item.publishedAt || '最新发布' }}</text>
                  </view>
                  <text class="item-title">{{ item.title }}</text>
                  <text v-if="item.summary || item.desc" class="item-summary">{{ item.summary || item.desc }}</text>
                </view>

              </view>
              <AppLoadMore
                v-if="listNews.length"
                :status="pageStatus.isLoadingMore.value
                  ? 'loading'
                  : (pageStatus.isError.value && pageStatus.hasStaleContent.value
                    ? 'error'
                    : (!pageStatus.hasMore.value ? 'no-more' : 'idle'))"
                @retry="handleLoadMore"
              />
            </view>

            <!-- 骨架屏（loading 状态时显示） -->
            <template #skeleton>
              <view class="news-skeleton">
                <view v-for="i in 4" :key="i" class="skeleton-news-item">
                  <view class="skeleton-thumb" />
                  <view class="skeleton-info">
                    <view class="skeleton-line skeleton-type" />
                    <view class="skeleton-line skeleton-title-sm" />
                    <view class="skeleton-line skeleton-date" />
                  </view>
                </view>
              </view>
            </template>
          </app-page-state>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import { usePageState } from '@/shared/composables/usePageState.js'
import { getNewsCategories, getNewsList } from '../../api/news.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'

const defaultTabs = Object.freeze([
  { key: 'all', label: '全部' },
])

const tabs = ref([...defaultTabs])

const activeTab = ref('all')
const isRefreshing = ref(false)

// 使用 usePageState 管理列表数据加载状态
const pageStatus = usePageState(async ({ page = 1, pageSize = 20 } = {}) => {
  // 后端真实接口：ThirdParty / Mini.NewsController / GetArticles
  const res = await getNewsList({
    pageNum: page,
    pageSize,
    categoryId: activeTab.value === 'all' ? undefined : activeTab.value,
  })

  // 统一分页适配：后端可能返回 { list, total } 或直接返回数组
  if (res && Array.isArray(res.list)) {
    return res.list
  }
  if (res && Array.isArray(res.items)) {
    return res.items
  }
  // 如果本身就是数组（兼容不同后端返回格式）
  if (Array.isArray(res)) return res

  // 空数组
  return []
}, { autoLoad: false })

const listNews = computed(() => pageStatus.data.value || [])

async function loadCategories() {
  try {
    const result = await getNewsCategories()
    const categories = Array.isArray(result?.categories) ? result.categories : []
    tabs.value = [
      ...defaultTabs,
      ...categories
        .filter(item => item?.id && item?.label)
        .map(item => ({ key: item.id, label: item.label })),
    ]
    if (!tabs.value.some(item => item.key === activeTab.value)) {
      activeTab.value = 'all'
    }
  } catch (error) {
    console.warn('[News] 新闻分类加载失败:', error)
  }
}

onMounted(async () => {
  await loadCategories()
  await pageStatus.refresh()
})

// 监听 Tab 切换时重新加载
watch(activeTab, () => {
  pageStatus.refresh()
})

async function handleRefresh() {
  if (isRefreshing.value) return
  const startedAt = Date.now()
  isRefreshing.value = true
  try {
    await pageStatus.refresh()
  } finally {
    await waitForRefreshAnimation(startedAt)
    isRefreshing.value = false
  }
}

function handleRefresherRestore() {
  if (!pageStatus.isRefreshing.value) isRefreshing.value = false
}

function handleLoadMore() {
  pageStatus.loadMore()
}

/** 重试加载 */
function handleRetry() {
  pageStatus.retry()
}

// 使用统一导航
function goToDetail(item) {
  if (!item?.id) return
  navigator.navigateTo(routes.content.newsDetail(item.id))
}

</script>

<style lang="scss" scoped>
.news-content {
  padding: 8px 16px calc(30px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.news-intro {
  display: flex;
  flex-direction: column;
  padding: 8px 2px 18px;
}

.news-kicker { color: #c61d32; font-size: 11px; font-weight: 800; letter-spacing: 2px; }
.news-title { margin-top: 5px; color: #111216; font-size: 26px; font-weight: 800; }
.news-subtitle { margin-top: 5px; color: #858993; font-size: 13px; }

.article-meta, .item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #9699a1;
  font-size: 11px;
}

.article-category, .item-type { color: #c61d32; font-weight: 700; }

.segment-tabs {
  width: 100%;
  padding: 0 2px 4px;
  margin-bottom: 14px;
  white-space: nowrap;
}

.segment-tabs-inner {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  width: max-content;
}

.result-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 22px;
  margin-bottom: 12px;
  color: #9699a1;
  font-size: 12px;
}

.tab-btn {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  margin-right: 6px;
  padding: 0 16px;
  white-space: nowrap;
  border: 1px solid #E5E6EB;
  border-radius: 17px;
  background: #FFFFFF;
  color: #767a84;
  font-size: 13px;
  line-height: 32px;

  &::after { border: 0; }

  &.is-active {
    color: #FFFFFF;
    border-color: #D7192D;
    background: #D7192D;
    box-shadow: 0 3px 10px rgba(215, 25, 45, .22);
    font-weight: 700;
  }
}

/* 列表 */
.news-list { display: grid; gap: 14px; }

.news-item {
  display: block;
  overflow: hidden;
  background: white;
  border: 1px solid #ececef;
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 8px 22px rgba(30, 32, 38, .045);
}

.item-thumb {
  width: 100%;
  height: 190px;
  border-radius: 0;
  display: block;
  background: linear-gradient(135deg, #262a33, #c21e35);
}

.item-thumb :deep(.app-product-image__fallback) { border-radius: inherit; }

.item-info { min-width: 0; padding: 14px 16px 16px; }

.item-title { display: -webkit-box; overflow: hidden; color: #17191e; font-size: 18px; font-weight: 750; margin: 8px 0 6px; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.item-summary { display: -webkit-box; overflow: hidden; color: #6F747E; font-size: 13px; line-height: 1.6; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }

.bottom-spacer { height: 24px; }

/* 新闻骨架屏 */
.news-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0;
}

.skeleton-news-item {
  display: block;
  overflow: hidden;
  background: white;
  border-radius: 20px;

  .skeleton-thumb {
    width: 100%;
    height: 190px;
    background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 8px;
  }

  .skeleton-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px 16px;

    .skeleton-line {
      height: 14px;
      background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
      border-radius: 4px;

      &.skeleton-type { width: 30%; }
      &.skeleton-title-sm { width: 85%; }
      &.skeleton-date { width: 45%; }
    }
  }
}

@media screen and (min-width: 700px) {
  .news-content { padding-left: 24px; padding-right: 24px; }
  .news-item {
    display: flex;
    align-items: stretch;
    gap: 16px;
    padding: 16px;
  }
  .item-thumb, .skeleton-thumb {
    width: 200px;
    height: 120px;
    flex: 0 0 200px;
    border-radius: 8px;
  }
  .item-info { flex: 1; padding: 0; }
}
</style>
