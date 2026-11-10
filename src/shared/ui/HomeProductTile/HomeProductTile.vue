<template>
  <view class="home-product-tile" hover-class="home-product-tile--pressed" @click="$emit('detail', product)">
    <view class="home-product-image">
      <AppProductImage :src="product.image" :show-stock-badge="false" :fallback-icon-size="30" />
    </view>
    <view class="home-product-copy">
      <view class="home-product-name">{{ product.name || t('common.productCard.fallbackName') }}</view>
      <AmountText class="home-product-price" :text="product.hasPriceRange ? t('common.productCard.fromPrice', { price: priceText }) : priceText" />
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { t } from '@/shared/i18n/index.js'
import AppProductImage from '../AppProductImage/AppProductImage.vue'
import AmountText from '../AmountText/AmountText.vue'
const props = defineProps({ product: { type: Object, required: true }, canPurchase: Boolean })
defineEmits(['detail', 'buy'])
const priceText = computed(() => '¥' + Number(props.product.price || 0).toFixed(2))
</script>

<style scoped>
.home-product-tile { min-width: 0; height: 100%; overflow: hidden; background: var(--surface-card, #FFFFFF); border-radius: var(--radius-card, 16px); box-shadow: 0 2px 8px rgba(28,33,42,.035); }
.home-product-tile--pressed { opacity: .85; }
.home-product-image { width: 100%; aspect-ratio: 1 / 1; padding: 6px; box-sizing: border-box; background: var(--surface-subtle, #F7F8FA); }
.home-product-image :deep(.app-product-image) { width: 100%; height: 100%; }
.home-product-copy { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 10px 12px 12px; }
.home-product-name { display: block; width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--text-primary, #1B1C20); font-size: var(--type-body-size, 14px); line-height: 20px; font-weight: 500; }
.home-product-price { max-width: 100%; color: var(--primary-color, #D7192D); font-size: var(--type-money-size, 18px); line-height: 24px; font-weight: 700; }
@media (min-width: 600px) { .home-product-name { display: -webkit-box; white-space: normal; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 2; } }
@media (max-width: 599px) {
  .home-product-name { font-size: var(--type-body-small-size, 13px); line-height: 18px; }
  .home-product-price { font-size: var(--type-price-tile-size, 16px); line-height: 22px; }
  .home-product-copy { gap: 4px; }
}
</style>
