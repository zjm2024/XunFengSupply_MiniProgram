﻿<template>
  <AppPageShell>
    <template #header>
      <app-header title="新闻资讯" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="news-content">
          <!-- Tab 切换 -->
          <scroll-view class="segment-tabs" scroll-x>
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="tab-btn"
              :class="{ 'is-active': activeTab === tab.key }"
              @click="activeTab = tab.key"
            >{{ tab.label }}</button>
          </scroll-view>

          <!-- 头条新闻（仅全部 tab 显示） -->
          <view v-if="activeTab === 'all'" class="news-hero" @click="goToDetail(heroNews)">
            <view class="hero-photo">
              <text class="hero-badge">K-900</text>
            </view>
            <view class="hero-body">
              <text class="hero-tag">产品新闻 · {{ heroNews.date }}</text>
              <text class="hero-title">{{ heroNews.title }}</text>
              <text class="hero-desc">{{ heroNews.desc }}</text>
              <text class="hero-action">阅读全文 →</text>
            </view>
          </view>

          <!-- 新闻列表：使用 AppPageState 统一状态管理 -->
          <app-page-state
            :state="pageStatus.status"
            :has-stale-content="pageStatus.hasStaleContent"
            icon-type="message"
            action-text="重新加载"
            :fullscreen="false"
            @retry="handleRetry"
          >
            <!-- 正常内容 -->
            <view class="news-list">
              <view v-for="item in pageStatus.data" :key="item.id" class="news-item" @click="goToDetail(item)">
                <view class="item-thumb" :class="item.thumbClass"></view>
                <view class="item-info">
                  <text class="item-type">{{ item.type }}</text>
                  <text class="item-title">{{ item.title }}</text>
                  <text class="item-date">{{ item.date }}</text>
                </view>

                <!-- 手册类型显示预览按钮 -->
                <button v-if="item.isManual" class="preview-btn" @click.stop="previewManual(item)">预览</button>
              </view>
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
import { ref, watch } from 'vue'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import { usePageState } from '@/shared/composables/usePageState.js'
import { getNewsList } from '../../api/news.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'product', label: '产品新闻' },
  { key: 'new', label: '上新' },
  { key: 'policy', label: '政策公告' },
  { key: 'settlement', label: '结算通知' }
]

const activeTab = ref('all')

const heroNews = ref({
  id: '1',
  type: '产品新闻',
  date: '2026-08-10',
  title: '2026 秋季新品系列发布',
  desc: '全新比赛级羽毛球与专业装备正式发布，为经销商提供更完整的产品组合。'
})

// 使用 usePageState 管理列表数据加载状态
const pageStatus = usePageState(async ({ page = 1, pageSize = 20 } = {}) => {
  // 后端真实接口：System / Mini.AnnouncementController / GetList
  const res = await getNewsList({
    pageNum: page,
    pageSize,
    type: activeTab.value,
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
}, { autoLoad: true })

// 监听 Tab 切换时重新加载
watch(activeTab, () => {
  pageStatus.refresh()
})

/** 重试加载 */
function handleRetry() {
  pageStatus.retry()
}

// 使用统一导航
function goToDetail(item) {
  if (!item?.id) return
  navigator.navigateTo(routes.content.newsDetail(item.id))
}

/**
 * 手册预览跳转。
 * 注意：item.id 为新闻 ID（newsId），仅在 isManual=true 时代表手册 ID。
 * 预览页本身需通过后端二次校验真实 manualId。
 */
function previewManual(item) {
  if (!item?.isManual || !item.id) {
    uni.showToast({ title: '当前条目不是手册', icon: 'none' })
    return
  }
  navigator.navigateTo(routes.content.manualPreview(item.id))
}
</script>

<style lang="scss" scoped>
.news-content {
  padding-bottom: env(safe-area-inset-bottom);
}

.segment-tabs {
  display: flex;
  gap: 18px;
  border-bottom: 1px solid #EFEFF1;
  margin-bottom: 16px;
  white-space: nowrap;
}

.tab-btn {
  min-height: 42px; /* 稳定 px */
  padding: 0;
  white-space: nowrap;
  border: none;
  background: transparent;
  color: #5E626B;
  font-size: 14px;

  &.is-active {
    color: #D7192D;
    border-bottom: 2px solid #D7192D;
    font-weight: 650;
  }
}

/* 头条 */
.news-hero {
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 14px;

  /* 平板端双栏 */
  @media screen and (min-width: 840px) {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
  }
}

.hero-photo {
  min-height: 220px; /* 稳定 px */
  display: grid;
  place-items: center;
  color: white;
  font-size: 42px; /* 稳定 px */
  font-weight: 800;
  letter-spacing: -2px;
  background: radial-gradient(circle at 65% 55%, #fff 0 7%, transparent 8%), linear-gradient(145deg, #111216 45%, #2c2f34 46% 58%, #9a0f20 59% 61%, #111216 62%);
}

.hero-badge { font-size: 42px; }

.hero-body { padding: 18px; display: flex; flex-direction: column; justify-content: center; }

.hero-tag { color: #D7192D; font-size: 12px; font-weight: 600; }
.hero-title { font-size: 21px; font-weight: 600; color: #111216; margin: 5px 0 8px; line-height: 1.35; }
.hero-desc { color: #5E626B; font-size: 14px; line-height: 1.6; }
.hero-action { color: #D7192D; font-size: 14px; padding: 14px 0 0; border: none; background: transparent; text-align: left; }

/* 列表 */
.news-list { display: grid; gap: 10px; }

.news-item {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 12px;
  align-items: center;
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 12px;
  padding: 10px;

  &.has-manual { grid-template-columns: 48px 1fr auto; }
}

.item-thumb {
  width: 88px;
  height: 72px;
  border-radius: 8px;

  &.red { background: linear-gradient(145deg, #111 35%, #a40f20 36% 42%, #25282e 43%); }
  &.dark { background: linear-gradient(160deg, #111 50%, #d7192d 51% 53%, #333 54%); }
}

.item-info { min-width: 0; }

.item-type { color: #D7192D; font-size: 12px; font-weight: 600; display: block; }
.item-title { font-size: 14px; color: #111216; margin: 4px 0; line-height: 1.45; display: block; }
.item-date { color: #989BA3; font-size: 12px; }

.preview-btn {
  border: none;
  color: #D7192D;
  background: transparent;
  font-size: 14px;
  padding: 8px;

  &:active { opacity: 0.7; }
}

.bottom-spacer { height: 24px; }

/* 新闻骨架屏 */
.news-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0;
}

.skeleton-news-item {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 12px;
  align-items: center;
  background: white;
  border-radius: 12px;
  padding: 10px;

  .skeleton-thumb {
    width: 88px;
    height: 72px;
    background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 8px;
  }

  .skeleton-info {
    display: flex;
    flex-direction: column;
    gap: 8px;

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
</style>
