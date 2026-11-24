<template>
  <view class="tab-page">
    <view class="about-banner" hover-class="about-banner--pressed" role="button" tabindex="0" :aria-label="t('main.news.aboutTitle')" @click="openAbout" @keydown.enter="openAbout" @keydown.space.prevent="openAbout">
      <text class="about-banner-watermark" aria-hidden="true">KUMPOO</text>
      <view class="about-banner-copy">
        <view class="about-banner-eyebrow"><view class="about-banner-accent" /><text class="about-banner-kicker">BRAND STORY</text></view>
        <text class="about-banner-title">TEAM KUMPOO</text>
        <text class="about-banner-description">{{ t('main.news.aboutDescription') }}</text>
      </view>
      <view class="about-banner-button" aria-hidden="true"><text>{{ t('main.news.aboutAction') }}</text><text class="about-banner-arrow">↗</text></view>
    </view>
    <AppPageState v-if="loading" state="loading" />

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
          <text class="large-card-badge">{{ item.categoryTitle || item.type || t('main.news.brand') }}</text>
        </view>
        <view class="large-card-body">
          <text class="large-card-title">{{ item.title }}</text>
          <text v-if="item.summary || item.desc" class="large-card-summary">{{ item.summary || item.desc }}</text>
          <view class="large-card-meta">
            <text>{{ item.date || item.publishedAt || t('main.news.latest') }}</text>
            <text>{{ t('main.news.read') }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="state-box">
      <view class="state-illustration">
        <AppSvgIllustration :svg="noNotificationSvg" size="lg" />
      </view>
      <text class="state-title">{{ t('main.news.empty') }}</text><text>{{ t('main.news.emptyHint') }}</text>
    </view>

    <view class="full-page-link" @click="openNewsList"><text>{{ t('main.news.more') }}</text><AppIcon name="arrow-right" :size="18" /></view>
  </view>
</template>

<script setup>
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import { t } from '@/shared/i18n/index.js'
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
      pageSize: 8,
    })
    newsItems.value = Array.isArray(result?.items) ? result.items : []
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

/** 资讯品牌入口复用现有关于我们路由和导航守卫。 */
async function openAbout() {
  await navigator.navigateTo(routes.content.about())
}

async function openNewsList() {
  await navigator.navigateTo(routes.content.news())
}
</script>

<style lang="scss" scoped>
.about-banner {
  position: relative;
  overflow: hidden;
  min-height: 144px;
  box-sizing: border-box;
  margin-bottom: 20px;
  padding: 22px 24px;
  border-radius: 16px;
  background: #191a1c;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .045), inset 0 -1px 0 rgba(0, 0, 0, .2);
  color: #fff;
  cursor: pointer;
}
.about-banner--pressed { opacity: .9; }
.about-banner:focus-visible { outline: 2px solid var(--color-brand, #d7192d); outline-offset: 3px; }
.about-banner-watermark { position: absolute; right: -10px; top: 12px; color: #fff; opacity: .04; font-family: 'Arial Black', 'Helvetica Neue', Arial, sans-serif; font-size: 100px; font-weight: 900; font-style: italic; letter-spacing: -6px; line-height: 1; pointer-events: none; }
.about-banner-copy { position: relative; width: calc(100% - 164px); max-width: 500px; }
.about-banner-eyebrow { display: flex; align-items: center; gap: 7px; margin-bottom: 6px; }
.about-banner-accent { width: 4px; height: 4px; flex: none; border-radius: 50%; background: var(--color-brand, #d7192d); }
.about-banner-kicker { color: #a4a7ad; font-size: 10px; line-height: 1.4; letter-spacing: 1.8px; }
.about-banner-title { display: block; font-family: 'Arial Black', 'Helvetica Neue', Arial, sans-serif; font-size: 30px; font-weight: 900; letter-spacing: -.7px; line-height: 1.1; }
.about-banner-description { display: block; margin-top: 8px; font-size: 12px; line-height: 1.6; color: #b8bbc1; }
.about-banner-button { position: absolute; right: 24px; bottom: 22px; display: flex; align-items: center; gap: 10px; min-height: 28px; color: #eeeff1; font-size: 12px; letter-spacing: .4px; }
.about-banner-arrow { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; box-sizing: border-box; border: 1px solid rgba(255, 255, 255, .25); border-radius: 50%; font-size: 17px; font-weight: 400; line-height: 1; }
@media screen and (max-width: 599px) {
  .about-banner { min-height: 160px; padding: 18px 24px; }
  .about-banner-copy { width: 100%; max-width: none; padding-bottom: 36px; }
  .about-banner-title { font-size: 28px; }
  .about-banner-watermark { top: 38px; right: -24px; font-size: 84px; }
  .about-banner-button { bottom: 16px; }
}

.tab-page { width: 100%; min-height: 100%; margin: 0 auto; padding: 18px var(--page-content-gutter, 16px) 0; box-sizing: border-box; }
.news-intro { display: flex; flex-direction: column; padding: 8px 2px 10px; }
.news-kicker { color: var(--color-brand, #d7192d); font-size: var(--type-caption-size, 12px); font-weight: var(--font-weight-bold, 700); letter-spacing: 1.8px; }
.news-title { margin-top: 6px; color: #17191e; font-size: var(--type-heading-size, 24px); font-weight: var(--font-weight-bold, 700); line-height: 1.3; }
.news-subtitle { margin-top: 6px; color: #858993; font-size: var(--type-caption-size, 12px); line-height: 1.55; }
.news-grid { display: grid; gap: 14px; margin-top: 4px; }
.large-news-card { overflow: hidden; border-radius: var(--radius-control, 10px); background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); transition: transform 160ms ease, opacity 160ms ease; }
.large-card-media { position: relative; width: 100%; height: 190px; overflow: hidden; background: #EEF0F3; }
.large-card-cover { display: block; width: 100%; height: 100%; background: #EEF0F3; }
.large-card-badge { position: absolute; left: 14px; top: 14px; padding: 5px 11px; border-radius: var(--radius-card, 14px); color: #FFFFFF; background: rgba(31,35,41,.68); font-size: var(--type-caption-size, 12px); font-weight: var(--font-weight-bold, 700); }
.large-card-body { display: flex; min-height: 124px; padding: 17px 18px 18px; flex-direction: column; box-sizing: border-box; }
.large-card-title { display: -webkit-box; overflow: hidden; color: #17191E; font-size: var(--type-section-title-size, 18px); font-weight: var(--font-weight-bold, 700); line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.large-card-summary { display: -webkit-box; overflow: hidden; margin-top: 8px; color: #6F747E; font-size: var(--type-body-small-size, 13px); line-height: 1.6; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.large-card-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 14px; color: #9699A1; font-size: var(--type-caption-size, 12px); }
.large-card-meta text:last-child { color: var(--color-brand, #D7192D); font-weight: var(--font-weight-bold, 700); }
.page-heading, .filter-row, .news-item, .read-link, .full-page-link { display: flex; align-items: center; }
.page-heading { justify-content: space-between; gap: 18px; padding: 20px; border-radius: var(--radius-feature, 18px); background: linear-gradient(145deg, rgba(255,255,255,.82), rgba(244,246,249,.7)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.heading-copy { display: flex; min-width: 0; flex-direction: column; }
.page-kicker { color: #6f747e; font-size: var(--type-caption-size, 12px); font-weight: var(--font-weight-bold, 700); letter-spacing: 1.4px; }
.page-title { margin-top: 5px; font-size: var(--type-heading-size, 24px); font-weight: var(--font-weight-bold, 700); }
.page-description { margin-top: 7px; color: #6e7179; font-size: var(--type-caption-size, 12px); line-height: 1.6; }
.heading-icon { display: grid; place-items: center; width: 54px; height: 54px; flex-shrink: 0; border-radius: var(--radius-feature, 18px); color: #fff; background: linear-gradient(145deg, #737984, #4d515a); box-shadow: 0 12px 25px rgba(45,48,56,.18); }
.filter-row { gap: 8px; margin-top: 15px; overflow-x: auto; padding-bottom: 3px; }
.filter-pill { flex-shrink: 0; min-height: 34px; padding: 0 16px; border: 1px solid #E5E6EB; border-radius: var(--radius-feature, 18px); color: #666A73; font-size: var(--type-caption-size, 12px); line-height: 34px; background: #FFFFFF; }
.filter-pill.is-active { border-color: var(--color-brand, #d7192d); color: #FFFFFF; font-weight: var(--font-weight-bold, 700); background: var(--color-brand, #d7192d); box-shadow: 0 3px 10px rgba(215,25,45,.22); }
.news-layout { display: grid; gap: 14px; margin-top: 16px; }
.featured-news { display: block; position: relative; overflow: hidden; box-sizing: border-box; border-radius: var(--radius-feature, 18px); background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); transition: transform 160ms ease, opacity 160ms ease; }
.featured-media { position: relative; width: 100%; height: 190px; overflow: hidden; background: #EEF0F3; }
.featured-cover { display: block; width: 100%; height: 100%; background: #EEF0F3; }
.featured-cover--placeholder { display: grid; place-items: center; color: #FFFFFF; background: linear-gradient(145deg, #EF4656, #C91629); }
.featured-badge { position: absolute; left: 14px; top: 14px; padding: 5px 11px; border-radius: var(--radius-card, 14px); color: #FFFFFF; background: rgba(31,35,41,.68); font-size: var(--type-caption-size, 12px); font-weight: var(--font-weight-bold, 700); }
.featured-copy, .item-copy { display: flex; min-width: 0; flex-direction: column; }
.featured-copy { padding: 18px 18px 20px; }
.news-type { color: var(--color-brand, #d7192d); font-size: var(--type-caption-size, 12px); font-weight: var(--font-weight-bold, 700); }
.featured-title { display: -webkit-box; overflow: hidden; color: #17191E; font-size: var(--type-page-title-size, 20px); font-weight: var(--font-weight-bold, 700); line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.featured-summary, .item-summary { display: -webkit-box; overflow: hidden; color: #70757e; font-size: var(--type-caption-size, 12px); line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.featured-summary { margin-top: 8px; }
.news-date { margin-top: 7px; color: #9a9ca3; font-size: var(--type-caption-size, 12px); }
.read-link { margin-top: 16px; gap: 6px; color: var(--color-brand, #d7192d); font-size: var(--type-caption-size, 12px); font-weight: var(--font-weight-bold, 700); }
.news-list { display: grid; gap: 10px; }
.news-item { min-height: 96px; padding: 13px 14px; gap: 13px; box-sizing: border-box; border-radius: var(--radius-feature, 18px); background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); transition: transform 160ms ease, opacity 160ms ease; }
.item-icon { display: grid; place-items: center; width: 86px; height: 66px; flex-shrink: 0; border-radius: var(--radius-control, 10px); color: #FFFFFF; background: linear-gradient(145deg, #EF4656, #C91629); }
.item-cover { width: 86px; height: 66px; flex-shrink: 0; border-radius: var(--radius-control, 10px); background: #F1F3F6; }
.item-copy { flex: 1; }
.item-title { display: -webkit-box; margin-top: 4px; overflow: hidden; font-size: var(--type-card-title-size, 16px); font-weight: var(--font-weight-semibold, 600); line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.item-summary { margin-top: 4px; -webkit-line-clamp: 1; }
.item-arrow { color: #a0a3aa; }
.state-box { display: flex; min-height: 280px; align-items: center; justify-content: center; flex-direction: column; gap: 9px; color: #94979f; font-size: var(--type-caption-size, 12px); }
.state-illustration { margin-bottom: 4px; }
.state-title { color: #454850; font-size: var(--type-card-title-size, 16px); font-weight: var(--font-weight-bold, 700); }

.full-page-link { width: fit-content; min-height: 44px; margin: 18px auto 0; padding: 0 20px; justify-content: center; gap: 7px; border: 1px solid rgba(215,25,45,.18); border-radius: var(--radius-card, 14px); color: var(--color-brand, #d7192d); font-size: var(--type-body-small-size, 13px); font-weight: var(--font-weight-bold, 700); background: rgba(255,255,255,.72); }
.card--pressed { opacity: .9; transform: scale(.985); }

@media screen and (min-width: 800px) {
  .tab-page { padding-bottom: 18px; }
  .news-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  .large-card-media { height: 220px; }
  .page-heading { padding: 24px 28px; }
  .news-layout { grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); }
  .featured-news { min-height: 430px; }
  .featured-media { height: 250px; }
  .featured-title { font-size: var(--type-page-title-size, 20px); }
  .news-list { grid-template-columns: 1fr; }
}

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.large-news-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
</style>
