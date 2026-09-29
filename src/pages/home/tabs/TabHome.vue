<template>
  <view class="home-tab tab-page">
    <view class="feature-strip">
      <view v-for="feature in features" :key="feature.label" class="feature-item">
        <AppIcon :name="feature.icon" :size="18" />
        <text>{{ feature.label }}</text>
      </view>
    </view>
    <view class="entry-grid card-wrap">
      <view class="entry-card card-left order-card" hover-class="card--pressed" @click="openCategory">
        <view class="entry-copy">
          <view class="entry-kicker">PURCHASE</view>
          <text class="entry-title">商品下单</text>
          <text class="entry-description">浏览商品目录，按分类、SKU 或名称快速完成批量采购。</text>
          <view class="entry-action entry-action--primary">
            <text>立即选购</text>
            <AppIcon name="arrow-right" :size="17" />
          </view>
        </view>
        <view class="entry-visual order-visual">
          <view class="visual-ring visual-ring--large"></view>
          <view class="visual-ring visual-ring--small"></view>
          <view class="visual-icon"><AppIcon name="product" :size="54" /></view>
        </view>
      </view>

      <view class="entry-card news-card" hover-class="card--pressed" @click="openNewsList">
        <view class="entry-copy">
          <view class="entry-kicker entry-kicker--muted">NEWS</view>
          <text class="entry-title">新闻资讯</text>
          <text class="entry-description">查看品牌动态、政策公告与行业资讯，及时掌握最新消息。</text>
          <view class="entry-action entry-action--secondary">
            <text>进入资讯</text>
            <AppIcon name="arrow-right" :size="17" />
          </view>
        </view>
        <view class="entry-visual news-visual">
          <view class="visual-ring visual-ring--large"></view>
          <view class="visual-ring visual-ring--small"></view>
          <view class="visual-icon"><AppIcon name="news" :size="54" /></view>
        </view>
      </view>

      <view class="entry-card manual-card" hover-class="card--pressed" @click="openManualList">
        <view class="entry-copy">
          <view class="entry-kicker entry-kicker--manual">MANUAL</view>
          <text class="entry-title">产品手册</text>
          <text class="entry-description">浏览产品电子手册、参数资料与最新产品信息。</text>
          <view class="entry-action entry-action--manual">
            <text>查看手册</text>
            <AppIcon name="arrow-right" :size="17" />
          </view>
        </view>
        <view class="entry-visual manual-visual">
          <view class="visual-ring visual-ring--large"></view>
          <view class="visual-ring visual-ring--small"></view>
          <view class="visual-icon"><AppIcon name="invoice" :size="54" /></view>
        </view>
      </view>
    </view>



  </view>
</template>

<script setup>
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'

defineProps({ active: { type: Boolean, default: false } })

const emit = defineEmits(['select-tab'])

const features = Object.freeze([
  { label: '批量采购', icon: 'batch-order' },
  { label: 'SKU 快速检索', icon: 'search' },
  { label: '库存实时同步', icon: 'inventory' },
  { label: '品牌政策公告', icon: 'announcement' },
])

function openCategory() {
  emit('select-tab', 'category')
}

async function openNewsList() {
  await navigator.navigateTo(routes.content.news())
}

async function openManualList() {
  await navigator.navigateTo(routes.content.manual())
}
</script>

<style lang="scss" scoped>
.tab-page {
  width: 100%;
  min-height: 100%;
  margin: 0 auto;
  padding: 18px 24px 18px;
  box-sizing: border-box;
}

.entry-card,
.feature-strip {
  background: var(--glass-card-background, rgba(255, 255, 255, 0.74));
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55, 65, 80, 0.07));
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
}

.entry-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }

.entry-card {
  position: relative;
  display: flex;
  min-height: 214px;
  overflow: hidden;
  padding: 22px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-sizing: border-box;
  border-radius: 24px;
  transition: transform 160ms ease, opacity 160ms ease;
}

.order-card {
  background: radial-gradient(circle at 88% 12%, rgba(238, 57, 74, 0.18), transparent 34%), linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(255, 236, 239, 0.9));
}

.news-card {
  background: radial-gradient(circle at 92% 8%, rgba(115, 120, 132, 0.11), transparent 34%), linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(247, 248, 250, 0.92));
}

.manual-card {
  background: radial-gradient(circle at 92% 8%, rgba(55, 107, 185, 0.14), transparent 34%), linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.94));
}

.entry-copy {
  position: relative;
  z-index: 2;
  display: flex;
  min-width: 0;
  max-width: 62%;
  align-items: flex-start;
  flex-direction: column;
}

.entry-kicker { margin-bottom: 7px; color: var(--color-brand, #d7192d); font-size: 10px; font-weight: 800; letter-spacing: 1.6px; }
.entry-kicker--muted { color: #747984; }
.entry-kicker--manual { color: #2C63B6; }
.entry-title { font-size: 23px; font-weight: 780; line-height: 1.2; }
.entry-description { margin-top: 10px; color: var(--color-text-secondary, #666a73); font-size: 13px; line-height: 1.7; }

.entry-action,
.feature-item { display: flex; align-items: center; }

.entry-action { min-height: 40px; margin-top: 18px; padding: 0 18px; gap: 8px; border-radius: 13px; font-size: 13px; font-weight: 700; }
.entry-action--primary { color: #fff; background: linear-gradient(100deg, #f04a59, #d7192d 66%, #bd1325); box-shadow: 0 10px 22px rgba(215, 25, 45, 0.2); }
.entry-action--secondary { color: var(--color-brand, #d7192d); border: 1px solid rgba(215, 25, 45, 0.24); background: rgba(255, 255, 255, 0.62); }
.entry-action--manual { color: #2C63B6; border: 1px solid rgba(44, 99, 182, 0.25); background: rgba(255, 255, 255, 0.68); }

.entry-visual {
  position: relative;
  display: grid;
  place-items: center;
  width: 112px;
  height: 132px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 28px;
}

.order-visual { color: #fff; background: linear-gradient(145deg, rgba(255, 255, 255, 0.82), rgba(255, 207, 214, 0.78)); }
.news-visual { color: #62666f; background: linear-gradient(145deg, #f8f9fb, #e9ecf1); }
.manual-visual { color: #2C63B6; background: linear-gradient(145deg, #F3F7FF, #DCE8FF); }

.visual-icon {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 82px;
  height: 82px;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 14px 28px rgba(31, 33, 40, 0.1);
}

.order-visual .visual-icon { background: linear-gradient(145deg, #f04a59, #d7192d 62%, #b91224); box-shadow: 0 16px 30px rgba(215, 25, 45, 0.25); }
.manual-visual .visual-icon { color: #2C63B6; box-shadow: 0 16px 30px rgba(44, 99, 182, 0.16); }
.visual-ring { position: absolute; border: 1px solid rgba(215, 25, 45, 0.12); border-radius: 50%; }
.visual-ring--large { top: -34px; right: -36px; width: 112px; height: 112px; }
.visual-ring--small { bottom: -20px; left: -18px; width: 58px; height: 58px; }

.feature-strip { display: none; margin-bottom: 18px; padding: 12px 18px; justify-content: space-around; border-radius: 18px; }
.feature-item { gap: 8px; color: #676b74; font-size: 12px; }
.feature-item :deep(.app-icon) { color: var(--color-brand, #d7192d); }

.copyright { padding: 26px 0 2px; color: #a1a2a8; font-size: 11px; text-align: center; }
.card--pressed { opacity: 0.9; transform: scale(0.985); }

@media screen and (min-width: 768px) {
  .tab-page { padding: 18px 24px 18px; }
  .home-search-entry { min-height: 52px; margin-bottom: 18px; padding-left: 18px; }
  .feature-strip { display: flex; }
  .entry-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .entry-card { min-height: 230px; padding: 26px; }
  .news-card .entry-copy { max-width: 58%; }
  .manual-card .entry-copy { max-width: 58%; }
}

@media screen and (min-width: 1200px) {
  .entry-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 24px; }
  .card-left { grid-row: 1 / span 2; }
  .entry-card { min-height: 0; }
}

@media screen and (min-width: 1100px) {
  .entry-visual { width: 132px; height: 146px; }
  .order-card .entry-copy { max-width: 68%; }
}

@media screen and (max-width: 374px) {
  .entry-card { min-height: 196px; padding: 17px 14px; }
  .entry-title { font-size: 20px; }
  .entry-description { font-size: 11px; }
  .entry-visual { width: 88px; height: 116px; }
  .visual-icon { width: 64px; height: 64px; }
}
</style>
