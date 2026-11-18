<template>
  <view class="home-product-tile" hover-class="home-product-tile--pressed" :hover-start-time="0" :hover-stay-time="90" @click="$emit('detail', product)">
    <view class="home-product-image">
      <AppProductImage class="home-product-media" :src="product.image" :show-stock-badge="false" :fallback-icon-size="30" />
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
.home-product-tile {
  --product-image-background: var(--surface-card, #fff);
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  background: var(--product-image-background);
  border-radius: var(--radius-card, 16px);
  transition: transform 160ms ease, opacity 160ms ease;
}

.home-product-tile--pressed {
  opacity: .88;
  transform: scale(.985);
}

.home-product-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  box-sizing: border-box;
}

.home-product-media {
  width: 100%;
  height: 100%;
}

.home-product-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 8px 10px 14px;
  text-align: center;
}

.home-product-name {
  display: -webkit-box;
  width: 100%;
  height: 40px;
  overflow: hidden;
  overflow-wrap: anywhere;
  color: var(--text-primary, #1B1C20);
  font-size: var(--type-body-size, 14px);
  font-weight: var(--font-weight-semibold, 600);
  line-height: 20px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.home-product-price {
  max-width: 100%;
  margin-top: auto;
  color: var(--color-brand, #D7192D);
  font-size: var(--type-price-tile-size, 16px);
  font-weight: var(--font-weight-bold, 700);
  line-height: 22px;
}

@media (prefers-reduced-motion: reduce) {
  .home-product-tile { transition: none; }
  .home-product-tile--pressed { transform: none; }
}
</style>
