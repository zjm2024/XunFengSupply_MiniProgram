<template>
  <view class="home-tab tab-page">
    <view class="feature-strip">
      <view v-for="feature in features" :key="feature.icon" class="feature-item">
        <AppIcon :name="feature.icon" :size="18" />
        <text>{{ feature.label }}</text>
      </view>
    </view>
    <view class="entry-grid card-wrap">
      <view class="entry-card card-left order-card" hover-class="card--pressed" @click="openCategory">
        <view class="entry-copy">
          <text class="entry-title">{{ t('main.home.purchase') }}</text>
          <text class="entry-description">{{ t('main.home.purchaseDescription') }}</text>
          <view class="entry-action entry-action--primary">
            <text>{{ t('main.home.shop') }}</text>
            <AppIcon name="arrow-right" :size="18" />
          </view>
        </view>
        <view class="entry-visual order-visual">
          <AppIcon name="product" :size="36" />
        </view>
      </view>

      <view class="entry-card news-card" hover-class="card--pressed" @click="openNewsList">
        <view class="entry-copy">
          <text class="entry-title">{{ t('main.home.news') }}</text>
          <text class="entry-description">{{ t('main.home.newsDescription') }}</text>
          <view class="entry-action entry-action--secondary">
            <text>{{ t('main.home.readNews') }}</text>
            <AppIcon name="arrow-right" :size="18" />
          </view>
        </view>
        <view class="entry-visual">
          <AppIcon name="news" :size="28" />
        </view>
      </view>

      <view class="entry-card manual-card" hover-class="card--pressed" @click="openManualList">
        <view class="entry-copy">
          <text class="entry-title">{{ t('main.home.manual') }}</text>
          <text class="entry-description">{{ t('main.home.manualDescription') }}</text>
          <view class="entry-action entry-action--secondary">
            <text>{{ t('main.home.readManual') }}</text>
            <AppIcon name="arrow-right" :size="18" />
          </view>
        </view>
        <view class="entry-visual">
          <AppIcon name="invoice" :size="28" />
        </view>
      </view>
    </view>



  </view>
</template>

<script setup>
import { computed } from 'vue'
import { t } from '@/shared/i18n/index.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'

defineProps({ active: { type: Boolean, default: false } })

const emit = defineEmits(['select-tab'])

const features = computed(() => [
  { label: t('main.home.bulk'), icon: 'batch-order' },
  { label: t('main.home.sku'), icon: 'search' },
  { label: t('main.home.inventory'), icon: 'inventory' },
  { label: t('main.home.announcements'), icon: 'announcement' },
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
  padding: var(--spacing-md, 12px) var(--page-padding-x, 16px) var(--spacing-lg, 24px);
  box-sizing: border-box;
}

.entry-card,
.feature-strip {
  background: var(--surface-card, #FFF);
  box-shadow: var(--shadow-sm);
}

.entry-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--module-gap, 12px); }

.entry-card {
  position: relative;
  display: flex;
  min-height: 128px;
  overflow: hidden;
  padding: var(--module-padding, 16px);
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-sizing: border-box;
  border-radius: var(--radius-card, 16px);
  transition: transform 160ms ease, opacity 160ms ease;
}

.order-card { min-height: 168px; }

.entry-copy {
  position: relative;
  z-index: 2;
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: flex-start;
  flex-direction: column;
}

.entry-title { font-size: var(--type-card-title-size, 16px); font-weight: var(--font-weight-bold, 700); line-height: 1.4; }
.order-card .entry-title { font-size: var(--type-page-title-size, 20px); }
.entry-description { margin-top: var(--spacing-xs, 4px); color: var(--type-secondary-color, #62666F); font-size: var(--type-body-small-size, 13px); line-height: 1.55; }

.entry-action,
.feature-item { display: flex; align-items: center; }

.entry-action { margin-top: var(--spacing-sm, 8px); gap: var(--spacing-xs, 4px); font-size: var(--type-body-small-size, 13px); font-weight: var(--font-weight-semibold, 600); }
.entry-action--primary { min-height: var(--touch-target-min, 44px); margin-top: var(--spacing-md, 12px); padding: 0 var(--spacing-base, 16px); border-radius: var(--radius-control, 12px); color: #FFF; background: var(--color-brand, #D7192D); }
.entry-action--secondary { min-height: 24px; color: var(--type-title-color, #1B1C20); }

.entry-visual {
  position: relative;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: var(--radius-control, 12px);
  color: var(--icon-secondary, #62666F);
  background: var(--surface-subtle, #F7F8FA);
}

.order-visual { width: 72px; height: 72px; color: var(--color-brand, #D7192D); background: var(--color-brand-soft, #FFF1F2); }

.feature-strip { display: none; margin-bottom: 18px; padding: 12px 18px; justify-content: space-around; border-radius: var(--radius-feature, 18px); }
.feature-item { gap: 8px; color: #676b74; font-size: var(--type-caption-size, 12px); }
.feature-item :deep(.app-icon) { color: var(--color-brand, #d7192d); }

.copyright { padding: 26px 0 2px; color: #a1a2a8; font-size: var(--type-caption-size, 12px); text-align: center; }
.card--pressed { opacity: 0.9; transform: scale(0.985); }

@media screen and (min-width: 768px) {
  .home-search-entry { min-height: 52px; margin-bottom: 18px; padding-left: 18px; }
  .feature-strip { display: flex; }
  .entry-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .entry-card { min-height: 156px; }
}

@media screen and (min-width: 1200px) {
  .entry-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 24px; }
  .card-left { grid-row: 1 / span 2; }
  .entry-card { min-height: 0; }
}

</style>
