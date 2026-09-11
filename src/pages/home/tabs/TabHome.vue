<template>
  <view class="home-tab tab-page">
    <view class="entry-grid">
      <view class="entry-card order-card" hover-class="card--pressed" @click="openProductList">
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


    </view>

    <view class="feature-strip">
      <view v-for="feature in features" :key="feature.label" class="feature-item">
        <AppIcon :name="feature.icon" :size="18" />
        <text>{{ feature.label }}</text>
      </view>
    </view>

    <view class="recommend-section">
      <view class="section-heading">
        <view class="section-title-wrap">
          <view class="section-mark"><AppIcon name="sparkles" :size="20" /></view>
          <view class="section-copy">
            <text class="section-title">推荐货品</text>
            <text class="section-subtitle">为经销商精选的热销采购清单</text>
          </view>
        </view>
        <view class="section-link section-link--desktop" @click="openProductList">
          <text>查看更多商品</text>
          <AppIcon name="arrow-right" :size="16" />
        </view>
      </view>

      <view v-if="loading" class="product-grid">
        <view v-for="index in 8" :key="index" class="product-card-skeleton">
          <view class="skeleton-image"></view>
          <view class="skeleton-line skeleton-line--wide"></view>
          <view class="skeleton-line"></view>
        </view>
      </view>

      <view v-else-if="products.length" class="product-grid">
        <AppProductCard
          v-for="product in products"
          :key="product.productId"
          :product="product"
          variant="tile"
          :show-code="false"
          @click="openProduct(product)"
        />
      </view>

      <view v-else class="empty-recommend">
        <view class="empty-illustration">
          <AppSvgIllustration :svg="noSearchResultSvg" size="lg" />
        </view>
        <text>推荐商品正在更新</text>
      </view>

      <view class="section-link section-link--mobile" @click="openProductList">
        <text>查看更多商品</text>
        <AppIcon name="arrow-right" :size="16" />
      </view>
    </view>

    
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { getGoodsList } from '@/subPackages/commerce/api/productApi.js'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductCard from '@/shared/ui/AppProductCard/AppProductCard.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import noSearchResultSvg from '../../../shared/assets/illustrations/no-search-result.svg?raw'

const props = defineProps({ active: { type: Boolean, default: false } })

defineEmits(['select-tab'])

const loading = ref(false)
const loaded = ref(false)
const products = ref([])
const features = Object.freeze([
  { label: '批量采购', icon: 'batch-order' },
  { label: 'SKU 快速检索', icon: 'search' },
  { label: '库存实时同步', icon: 'inventory' },
  { label: '品牌政策公告', icon: 'announcement' },
])

watch(() => props.active, active => {
  if (active && !loaded.value) loadRecommendations()
}, { immediate: true })

async function loadRecommendations() {
  if (loading.value) return
  loading.value = true
  try {
    const result = await getGoodsList({ pageNum: 1, pageSize: 8, hasImage: true })
    products.value = Array.isArray(result?.items) ? result.items.slice(0, 8) : []
    loaded.value = true
  } catch (error) {
    console.warn('[Home] 推荐商品加载失败:', error)
  } finally {
    loading.value = false
  }
}

async function openProduct(product) {
  if (!product?.productId) return
  await navigator.navigateTo(routes.commerce.productDetail(product.productId))
}

async function openProductList() {
  await navigator.navigateTo(routes.commerce.productList())
}
</script>

<style lang="scss" scoped>
.tab-page {
  width: 100%;
  max-width: 1180px;
  min-height: 100%;
  margin: 0 auto;
  padding: 18px 16px calc(80px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.entry-card,
.feature-strip,
.recommend-section {
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 16px 42px rgba(51, 39, 42, 0.065), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
}

.section-mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--color-brand, #d7192d);
  background: rgba(215, 25, 45, 0.08);
}

.section-copy { display: flex; min-width: 0; flex-direction: column; }
.section-subtitle { color: var(--color-text-secondary, #666a73); font-size: 12px; line-height: 1.6; }

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
.entry-title { font-size: 23px; font-weight: 780; line-height: 1.2; }
.entry-description { margin-top: 10px; color: var(--color-text-secondary, #666a73); font-size: 13px; line-height: 1.7; }

.entry-action,
.section-link,
.product-meta,
.section-heading,
.section-title-wrap,
.feature-item { display: flex; align-items: center; }

.entry-action { min-height: 40px; margin-top: 18px; padding: 0 18px; gap: 8px; border-radius: 13px; font-size: 13px; font-weight: 700; }
.entry-action--primary { color: #fff; background: linear-gradient(100deg, #f04a59, #d7192d 66%, #bd1325); box-shadow: 0 10px 22px rgba(215, 25, 45, 0.2); }
.entry-action--secondary { color: var(--color-brand, #d7192d); border: 1px solid rgba(215, 25, 45, 0.24); background: rgba(255, 255, 255, 0.62); }

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
.visual-ring { position: absolute; border: 1px solid rgba(215, 25, 45, 0.12); border-radius: 50%; }
.visual-ring--large { top: -34px; right: -36px; width: 112px; height: 112px; }
.visual-ring--small { bottom: -20px; left: -18px; width: 58px; height: 58px; }

.feature-strip { display: none; margin-top: 18px; padding: 12px 18px; justify-content: space-around; border-radius: 18px; }
.feature-item { gap: 8px; color: #676b74; font-size: 12px; }
.feature-item :deep(.app-icon) { color: var(--color-brand, #d7192d); }

.recommend-section { margin-top: 18px; padding: 18px; border-radius: 24px; }
.section-heading { justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.section-title-wrap { min-width: 0; gap: 10px; }
.section-mark { width: 38px; height: 38px; border-radius: 13px; }
.section-title { font-size: 18px; font-weight: 760; }
.section-link { justify-content: center; gap: 6px; color: var(--color-brand, #d7192d); font-size: 13px; font-weight: 650; }
.section-link--desktop { display: none; }
.section-link--mobile { min-height: 42px; margin-top: 16px; border: 1px solid rgba(215, 25, 45, 0.18); border-radius: 13px; background: rgba(255, 255, 255, 0.62); }

.product-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.empty-recommend { display: flex; min-height: 150px; align-items: center; justify-content: center; flex-direction: column; gap: 10px; color: #9a9da4; font-size: 13px; }
.empty-illustration { margin-bottom: 4px; }
.product-card-skeleton { min-width: 0; min-height: 210px; padding: 10px; box-sizing: border-box; border: 1px solid rgba(17, 18, 22, 0.055); border-radius: 16px; background: #fff; }
.skeleton-image, .skeleton-line { border-radius: 10px; background: linear-gradient(90deg, #f0f1f3, #fafafa, #f0f1f3); background-size: 200% 100%; animation: shimmer 1.4s infinite linear; }
.skeleton-image { width: 100%; aspect-ratio: 1.18 / 1; }
.skeleton-line { width: 54%; height: 9px; margin-top: 8px; }
.skeleton-line--wide { width: 86%; }
.copyright { padding: 26px 0 2px; color: #a1a2a8; font-size: 11px; text-align: center; }
.card--pressed { opacity: 0.9; transform: scale(0.985); }

@keyframes shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }

@media screen and (min-width: 800px) {
  .tab-page { padding: 18px 10px 18px; }
  .home-search-entry { min-height: 52px; margin-bottom: 18px; padding-left: 18px; }
  .feature-strip { display: flex; }
  .entry-grid { grid-template-columns: minmax(0, 58fr) minmax(0, 38fr); }
  .entry-card { min-height: 230px; padding: 26px; }
  .news-card .entry-copy { max-width: 58%; }
  .product-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
  .recommend-section { padding: 22px; }
  .section-link--desktop { display: flex; }
  .section-link--mobile { display: none; }
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
