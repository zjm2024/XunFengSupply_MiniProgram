<template>
  <view class="tab-page">
    <view v-if="loading" class="state-box"><view class="loading-dot"></view><text>正在加载最新资讯...</text></view>

    <view v-else-if="newsItems.length" class="news-grid">
      <view v-for="item in newsItems" :key="item.id" class="large-news-card" hover-class="card--pressed" @click="openNews(item)">
        <view class="large-card-media">
          <AppProductImage
            class="large-card-cover"
            :src="item.coverUrl || item.imageUrl"
            mode="aspectFill"
            lazy-load
            :fallback-icon-size="42"
          />
          <text class="large-card-badge">{{ item.categoryTitle || item.type || '品牌资讯' }}</text>
        </view>
        <view class="large-card-body">
          <text class="large-card-title">{{ item.title }}</text>
          <text v-if="item.summary || item.desc" class="large-card-summary">{{ item.summary || item.desc }}</text>
          <view class="large-card-meta">
            <text>{{ item.date || item.publishedAt || '最新发布' }}</text>
            <text>阅读全文 →</text>
          </view>
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
import { getNewsList } from '@/shared/api/news.js'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import noNotificationSvg from '../../../shared/assets/illustrations/no-notification.svg?raw'

const props = defineProps({ active: { type: Boolean, default: false } })
const newsItems = ref([])
const loading = ref(false)
const initialized = ref(false)

watch(() => props.active, active => {
  if (active && !initialized.value) {
    initialized.value = true
    initializeNews()
  }
}, { immediate: true })

async function initializeNews() {
  await loadNews()
}

async function loadNews() {
  if (loading.value) return
  loading.value = true
  try {
    const result = await getNewsList({
      pageNum: 1,
      pageSize: 7,
    })
    newsItems.value = Array.isArray(result?.items) ? result.items.slice(0, 7) : []
  } catch (error) {
    newsItems.value = []
    console.warn('[HomeNews] 资讯加载失败:', error)
  } finally {
    loading.value = false
  }
}

async function openNews(item) {
  if (item?.id) await navigator.navigateTo(routes.content.newsDetail(item.id))
}

async function openNewsList() {
  await navigator.navigateTo(routes.content.news())
}
</script>

<style lang="scss" scoped>
.tab-page { width: 100%; min-height: 100%; margin: 0 auto; padding: 18px 16px 0; box-sizing: border-box; }
.news-intro { display: flex; flex-direction: column; padding: 8px 2px 10px; }
.news-kicker { color: var(--color-brand, #d7192d); font-size: 10px; font-weight: 800; letter-spacing: 1.8px; }
.news-title { margin-top: 6px; color: #17191e; font-size: 25px; font-weight: 800; line-height: 1.3; }
.news-subtitle { margin-top: 6px; color: #858993; font-size: 12px; line-height: 1.55; }
.news-grid { display: grid; gap: 14px; margin-top: 4px; }
.large-news-card { overflow: hidden; border: 1px solid #E8EBF1; border-radius: 10px; background: #FFFFFF; box-shadow: 0 8px 24px rgba(45,40,42,.055); transition: transform 160ms ease, opacity 160ms ease; }
.large-card-media { position: relative; width: 100%; height: 190px; overflow: hidden; background: #EEF0F3; }
.large-card-cover { display: block; width: 100%; height: 100%; background: #EEF0F3; }
.large-card-badge { position: absolute; left: 14px; top: 14px; padding: 5px 11px; border-radius: 14px; color: #FFFFFF; background: rgba(31,35,41,.68); font-size: 10px; font-weight: 700; }
.large-card-body { display: flex; min-height: 124px; padding: 17px 18px 18px; flex-direction: column; box-sizing: border-box; }
.large-card-title { display: -webkit-box; overflow: hidden; color: #17191E; font-size: 18px; font-weight: 750; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.large-card-summary { display: -webkit-box; overflow: hidden; margin-top: 8px; color: #6F747E; font-size: 13px; line-height: 1.6; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.large-card-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 14px; color: #9699A1; font-size: 11px; }
.large-card-meta text:last-child { color: var(--color-brand, #D7192D); font-weight: 700; }
.page-heading, .filter-row, .news-item, .read-link, .full-page-link { display: flex; align-items: center; }
.page-heading { justify-content: space-between; gap: 18px; padding: 20px; border: 1px solid rgba(255,255,255,.86); border-radius: 24px; background: linear-gradient(145deg, rgba(255,255,255,.94), rgba(244,246,249,.86)); box-shadow: 0 14px 36px rgba(55,40,43,.06); }
.heading-copy { display: flex; min-width: 0; flex-direction: column; }
.page-kicker { color: #6f747e; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; }
.page-title { margin-top: 5px; font-size: 24px; font-weight: 780; }
.page-description { margin-top: 7px; color: #6e7179; font-size: 12px; line-height: 1.6; }
.heading-icon { display: grid; place-items: center; width: 54px; height: 54px; flex-shrink: 0; border-radius: 18px; color: #fff; background: linear-gradient(145deg, #737984, #4d515a); box-shadow: 0 12px 25px rgba(45,48,56,.18); }
.filter-row { gap: 8px; margin-top: 15px; overflow-x: auto; padding-bottom: 3px; }
.filter-pill { flex-shrink: 0; min-height: 34px; padding: 0 16px; border: 1px solid #E5E6EB; border-radius: 17px; color: #666A73; font-size: 12px; line-height: 34px; background: #FFFFFF; }
.filter-pill.is-active { border-color: var(--color-brand, #d7192d); color: #FFFFFF; font-weight: 700; background: var(--color-brand, #d7192d); box-shadow: 0 3px 10px rgba(215,25,45,.22); }
.news-layout { display: grid; gap: 14px; margin-top: 16px; }
.featured-news { display: block; position: relative; overflow: hidden; box-sizing: border-box; border: 1px solid #E8EBF1; border-radius: 20px; background: #FFFFFF; box-shadow: 0 8px 24px rgba(45,40,42,.055); transition: transform 160ms ease, opacity 160ms ease; }
.featured-media { position: relative; width: 100%; height: 190px; overflow: hidden; background: #EEF0F3; }
.featured-cover { display: block; width: 100%; height: 100%; background: #EEF0F3; }
.featured-cover--placeholder { display: grid; place-items: center; color: #FFFFFF; background: linear-gradient(145deg, #EF4656, #C91629); }
.featured-badge { position: absolute; left: 14px; top: 14px; padding: 5px 11px; border-radius: 14px; color: #FFFFFF; background: rgba(31,35,41,.68); font-size: 10px; font-weight: 700; }
.featured-copy, .item-copy { display: flex; min-width: 0; flex-direction: column; }
.featured-copy { padding: 18px 18px 20px; }
.news-type { color: var(--color-brand, #d7192d); font-size: 10px; font-weight: 750; }
.featured-title { display: -webkit-box; overflow: hidden; color: #17191E; font-size: 19px; font-weight: 750; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.featured-summary, .item-summary { display: -webkit-box; overflow: hidden; color: #70757e; font-size: 11px; line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.featured-summary { margin-top: 8px; }
.news-date { margin-top: 7px; color: #9a9ca3; font-size: 10px; }
.read-link { margin-top: 16px; gap: 6px; color: var(--color-brand, #d7192d); font-size: 12px; font-weight: 700; }
.news-list { display: grid; gap: 10px; }
.news-item { min-height: 96px; padding: 13px 14px; gap: 13px; box-sizing: border-box; border: 1px solid #ECEEF2; border-radius: 16px; background: #FFFFFF; box-shadow: 0 5px 16px rgba(45,40,42,.04); transition: transform 160ms ease, opacity 160ms ease; }
.item-icon { display: grid; place-items: center; width: 86px; height: 66px; flex-shrink: 0; border-radius: 10px; color: #FFFFFF; background: linear-gradient(145deg, #EF4656, #C91629); }
.item-cover { width: 86px; height: 66px; flex-shrink: 0; border-radius: 10px; background: #F1F3F6; }
.item-copy { flex: 1; }
.item-title { display: -webkit-box; margin-top: 4px; overflow: hidden; font-size: 13px; font-weight: 680; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.item-summary { margin-top: 4px; -webkit-line-clamp: 1; }
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
  .news-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  .large-card-media { height: 220px; }
  .page-heading { padding: 24px 28px; }
  .news-layout { grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); }
  .featured-news { min-height: 430px; }
  .featured-media { height: 250px; }
  .featured-title { font-size: 22px; }
  .news-list { grid-template-columns: 1fr; }
}
</style>
