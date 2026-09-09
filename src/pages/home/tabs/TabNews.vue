<template>
  <view class="tab-page">
    <view class="filter-row">
      <view v-for="filter in filters" :key="filter.key" class="filter-pill" :class="{ 'is-active': activeFilter === filter.key }" @click="selectFilter(filter.key)">
        {{ filter.label }}
      </view>
    </view>

    <view v-if="loading" class="state-box"><view class="loading-dot"></view><text>正在加载最新资讯...</text></view>

    <view v-else-if="newsItems.length" class="news-layout">
      <view class="featured-news" hover-class="card--pressed" @click="openNews(newsItems[0])">
        <view class="featured-icon"><AppIcon name="announcement" :size="34" /></view>
        <view class="featured-copy">
          <text class="news-type">{{ newsItems[0].type || '品牌资讯' }}</text>
          <text class="featured-title">{{ newsItems[0].title }}</text>
          <text class="news-date">{{ newsItems[0].date || '最新发布' }}</text>
          <view class="read-link"><text>阅读全文</text><AppIcon name="arrow-right" :size="16" /></view>
        </view>
      </view>

      <view class="news-list">
        <view v-for="item in newsItems.slice(1)" :key="item.id" class="news-item" hover-class="card--pressed" @click="openNews(item)">
          <view class="item-icon"><AppIcon :name="item.typeCode === 1 ? 'announcement' : 'news'" :size="21" /></view>
          <view class="item-copy"><text class="news-type">{{ item.type || '品牌资讯' }}</text><text class="item-title">{{ item.title }}</text><text class="news-date">{{ item.date }}</text></view>
          <AppIcon class="item-arrow" name="chevron-right" :size="17" />
        </view>
      </view>
    </view>

    <view v-else class="state-box">
      <view class="state-illustration">
        <AppSvgIllustration :svg="noNotificationSvg" size="lg" />
      </view>
      <text class="state-title">暂无最新资讯</text><text>品牌动态发布后将在这里展示</text>
    </view>

    <view class="full-page-link" @click="openNewsList"><text>查看更多资讯</text><AppIcon name="arrow-right" :size="17" /></view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { getNewsList } from '@/subPackages/content/api/news.js'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import noNotificationSvg from '../../../shared/assets/illustrations/no-notification.svg?raw'

const props = defineProps({ active: { type: Boolean, default: false } })
const filters = Object.freeze([
  { key: 'all', label: '全部' },
  { key: 'product', label: '产品新闻' },
  { key: 'new', label: '新品上新' },
  { key: 'policy', label: '政策公告' },
])
const activeFilter = ref('all')
const newsItems = ref([])
const loading = ref(false)
const initialized = ref(false)

watch(() => props.active, active => {
  if (active && !initialized.value) {
    initialized.value = true
    loadNews()
  }
}, { immediate: true })

async function loadNews() {
  if (loading.value) return
  loading.value = true
  try {
    const result = await getNewsList({ pageNum: 1, pageSize: 7, type: activeFilter.value })
    newsItems.value = Array.isArray(result?.items) ? result.items.slice(0, 7) : []
  } catch (error) {
    newsItems.value = []
    console.warn('[HomeNews] 资讯加载失败:', error)
  } finally {
    loading.value = false
  }
}

function selectFilter(key) {
  if (activeFilter.value === key) return
  activeFilter.value = key
  loadNews()
}

async function openNews(item) {
  if (item?.id) await navigator.navigateTo(routes.content.newsDetail(item.id))
}

async function openNewsList() {
  await navigator.navigateTo(routes.content.news())
}
</script>

<style lang="scss" scoped>
.tab-page { width: 100%; max-width: 1180px; min-height: 100%; margin: 0 auto; padding: 18px 16px calc(80px + env(safe-area-inset-bottom)); box-sizing: border-box; }
.page-heading, .filter-row, .featured-news, .news-item, .read-link, .full-page-link { display: flex; align-items: center; }
.page-heading { justify-content: space-between; gap: 18px; padding: 20px; border: 1px solid rgba(255,255,255,.86); border-radius: 24px; background: linear-gradient(145deg, rgba(255,255,255,.94), rgba(244,246,249,.86)); box-shadow: 0 14px 36px rgba(55,40,43,.06); }
.heading-copy { display: flex; min-width: 0; flex-direction: column; }
.page-kicker { color: #6f747e; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; }
.page-title { margin-top: 5px; font-size: 24px; font-weight: 780; }
.page-description { margin-top: 7px; color: #6e7179; font-size: 12px; line-height: 1.6; }
.heading-icon { display: grid; place-items: center; width: 54px; height: 54px; flex-shrink: 0; border-radius: 18px; color: #fff; background: linear-gradient(145deg, #737984, #4d515a); box-shadow: 0 12px 25px rgba(45,48,56,.18); }
.filter-row { gap: 9px; margin-top: 15px; overflow-x: auto; }
.filter-pill { flex-shrink: 0; padding: 8px 15px; border: 1px solid rgba(55,57,64,.07); border-radius: 15px; color: #666a73; font-size: 12px; background: rgba(255,255,255,.7); }
.filter-pill.is-active { border-color: rgba(215,25,45,.14); color: var(--color-brand, #d7192d); font-weight: 700; background: rgba(215,25,45,.09); }
.news-layout { display: grid; gap: 14px; margin-top: 16px; }
.featured-news { position: relative; min-height: 188px; overflow: hidden; padding: 24px; gap: 20px; box-sizing: border-box; border: 1px solid rgba(255,255,255,.9); border-radius: 24px; background: radial-gradient(circle at 94% 10%, rgba(215,25,45,.13), transparent 32%), linear-gradient(145deg, rgba(255,255,255,.94), rgba(255,241,243,.84)); box-shadow: 0 14px 34px rgba(55,40,43,.06); transition: transform 160ms ease, opacity 160ms ease; }
.featured-icon { display: grid; place-items: center; width: 74px; height: 74px; flex-shrink: 0; border-radius: 24px; color: #fff; background: linear-gradient(145deg, #ef4656, #c91629); box-shadow: 0 14px 28px rgba(215,25,45,.2); }
.featured-copy, .item-copy { display: flex; min-width: 0; flex-direction: column; }
.news-type { color: var(--color-brand, #d7192d); font-size: 10px; font-weight: 750; }
.featured-title { display: -webkit-box; margin-top: 7px; overflow: hidden; font-size: 19px; font-weight: 750; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.news-date { margin-top: 7px; color: #9a9ca3; font-size: 10px; }
.read-link { margin-top: 16px; gap: 6px; color: var(--color-brand, #d7192d); font-size: 12px; font-weight: 700; }
.news-list { display: grid; gap: 10px; }
.news-item { min-height: 86px; padding: 13px 14px; gap: 12px; box-sizing: border-box; border: 1px solid rgba(255,255,255,.9); border-radius: 18px; background: rgba(255,255,255,.76); box-shadow: 0 10px 24px rgba(45,40,42,.045); transition: transform 160ms ease, opacity 160ms ease; }
.item-icon { display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; border-radius: 14px; color: #656a74; background: #f1f3f6; }
.item-copy { flex: 1; }
.item-title { display: -webkit-box; margin-top: 4px; overflow: hidden; font-size: 13px; font-weight: 680; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.item-arrow { color: #a0a3aa; }
.state-box { display: flex; min-height: 280px; align-items: center; justify-content: center; flex-direction: column; gap: 9px; color: #94979f; font-size: 12px; }
.state-illustration { margin-bottom: 4px; }
.state-title { color: #454850; font-size: 15px; font-weight: 700; }
.loading-dot { width: 24px; height: 24px; border: 3px solid rgba(215,25,45,.12); border-top-color: var(--color-brand, #d7192d); border-radius: 50%; animation: spin .9s linear infinite; }
.full-page-link { width: fit-content; min-height: 44px; margin: 18px auto 0; padding: 0 20px; justify-content: center; gap: 7px; border: 1px solid rgba(215,25,45,.18); border-radius: 15px; color: var(--color-brand, #d7192d); font-size: 13px; font-weight: 700; background: rgba(255,255,255,.72); }
.card--pressed { opacity: .9; transform: scale(.985); }
@keyframes spin { to { transform: rotate(360deg); } }
@media screen and (min-width: 800px) {
  .tab-page { padding: 18px 24px 18px; }
  .page-heading { padding: 24px 28px; }
  .news-layout { grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); }
  .featured-news { min-height: 306px; align-items: flex-start; flex-direction: column; }
  .featured-icon { width: 82px; height: 82px; }
  .featured-title { font-size: 22px; }
  .news-list { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
</style>
