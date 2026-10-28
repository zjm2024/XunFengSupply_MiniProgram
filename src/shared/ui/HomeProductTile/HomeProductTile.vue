<template>
  <view class="home-product-tile">
    <AppProductCard :product="product" variant="tile" :show-image-stock-badge="false" @click="$emit('detail', product)" />
    <text v-if="product.badge" class="home-product-badge">{{ product.badge }}</text>
    <view v-if="canPurchase" class="home-product-buy" role="button" :aria-label="t('common.homePage.buy')" hover-class="home-product-buy--pressed" @click.stop="$emit('buy', product)"><AppIcon name="cart" :size="17" /></view>
  </view>
</template>
<script setup>
import { t } from '@/shared/i18n/index.js'
import AppProductCard from '../AppProductCard/AppProductCard.vue'
import AppIcon from '../AppIcon/AppIcon.vue'
defineProps({ product: { type: Object, required: true }, canPurchase: Boolean })
defineEmits(['detail','buy'])
</script>
<style scoped>
.home-product-tile{position:relative;min-width:0;height:100%}.home-product-badge{position:absolute;top:8px;left:8px;max-width:80%;padding:3px 6px;background:#fff3ec;color:#a46a4c;font-size:10px;border-radius:4px}.home-product-buy{position:absolute;bottom:10px;right:9px;display:flex;align-items:center;justify-content:center;width:30px;height:30px;background:var(--color-brand-soft,#f9ece9);color:var(--color-brand,#a82624);border-radius:50%}.home-product-buy--pressed{opacity:.6}.home-product-tile :deep(.app-product-card__stock){padding-right:30px}.home-product-tile :deep(.app-product-card__body){padding-bottom:16px}
</style>
