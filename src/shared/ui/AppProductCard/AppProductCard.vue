<template>
  <view
    class="app-product-card"
    :class="[`app-product-card--${variant}`, { 'is-out-of-stock': isOutOfStock }]"
    hover-class="app-product-card--pressed"
    @click="emit('click')"
  >
    <view class="app-product-card__image-wrap">
      <AppProductImage
        class="app-product-card__image"
        :src="product.image"
        :stock="hasKnownStock ? product.stock : undefined"
        :unavailable="isOutOfStock"
        :show-stock-badge="showImageStockBadge || isOutOfStock"
        :fallback-icon-size="variant === 'compact' ? 24 : 30"
      />
    </view>

    <view class="app-product-card__body">
      <text class="app-product-card__name">{{ product.name || t('common.productCard.fallbackName') }}</text>
      <text v-if="showCode && product.code" class="app-product-card__code">{{ product.code }}</text>

      <view v-if="props.showPrice !== false" class="app-product-card__price-row">
        <view class="app-product-card__current-price">
          <AmountText class="app-product-card__price" :text="product.hasPriceRange ? t('common.productCard.fromPrice', { price: '¥' + formattedPrice }) : '¥' + formattedPrice" />
          <text v-if="variant !== 'compact' && unitText" class="app-product-card__unit">/{{ unitText }}</text>
        </view>
        <AmountText v-if="priceDisplay.showListPrice" class="app-product-card__list-price" :class="{ 'app-product-card__list-price--strike': priceDisplay.strikeListPrice }" :text="'¥' + priceDisplay.listPrice.toFixed(2)" />
      </view>

      <slot name="stock"><text
        v-if="showStock"
        class="app-product-card__stock"
        :class="`app-product-card__stock--${stockState}`"
      >
        {{ stockText }}<text v-if="minimumOrder > 0 && unitText"> · {{ t('common.productCard.minimum', { count: minimumOrder, unit: unitText }) }}</text>
      </text></slot>
    </view>
  </view>
</template>

<script setup>
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { computed } from 'vue'
import { t } from '@/shared/i18n/index.js'
import { knownProductStock, isProductOutOfStock } from '@/shared/utils/productAvailability.js'
import { getPriceDisplay } from '@/shared/utils/priceDisplay.js'
import AppProductImage from '../AppProductImage/AppProductImage.vue'

const props = defineProps({
  product: {
    type: Object,
    default: () => ({}),
  },
  variant: {
    type: String,
    default: 'row',
    validator: value => ['row', 'tile', 'compact'].includes(value),
  },
  showCode: {
    type: Boolean,
    default: true,
  },
  showPrice: {
    type: Boolean,
    default: true,
  },
  showStock: {
    type: Boolean,
    default: true,
  },
  showImageStockBadge: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['click'])
const priceDisplay = computed(() => getPriceDisplay(props.product))

const formattedPrice = computed(() => {
  const price = Number(props.product.price)
  return Number.isFinite(price) ? price.toFixed(2) : '0.00'
})

const hasKnownStock = computed(() => knownProductStock(props.product) !== null)
const isOutOfStock = computed(() => isProductOutOfStock(props.product))
const stock = computed(() => Number(props.product.stock) || 0)
const minimumOrder = computed(() => Number(props.product.moq) || 0)
const unitText = computed(() => String(
  props.product?.unit
    ?? props.product?.unitName
    ?? props.product?.Unit
    ?? props.product?.UnitName
    ?? props.product?.measureUnit
    ?? props.product?.MeasureUnit
    ?? '',
).trim())
const stockState = computed(() => {
  if (!hasKnownStock.value) return 'unknown'
  if (stock.value <= 0) return 'empty'
  if (stock.value < 50) return 'low'
  return 'normal'
})
const stockText = computed(() => {
  if (!hasKnownStock.value) return t('common.productCard.stockUnknown')
  if (stock.value <= 0) return t('common.productCard.stockEmpty')
  if (stock.value < 50) return t('common.productCard.stockLow', { count: stock.value, unit: unitText.value }).trim()
  return t('common.productCard.stockAvailable')
})
</script>

<style lang="scss" scoped>
.app-product-card {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 12px;
  background: var(--glass-card-background, rgba(255, 255, 255, 0.74));
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55, 65, 80, 0.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
}

.app-product-card--pressed {
  opacity: 0.94;
  transform: scale(0.985);
  box-shadow: 0 3px 12px rgba(17, 18, 22, 0.06);
}

.app-product-card--row {
  display: flex;
  min-height: 144px;
  box-shadow: none;
}

.app-product-card--row.app-product-card--pressed { box-shadow: none; }

.app-product-card--tile {
  display: flex;
  height: 100%;
  flex-direction: column;
}

.app-product-card--compact {
  display: flex;
  min-height: 86px;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.app-product-card__image-wrap {
  flex-shrink: 0;
  padding: 8px;
  box-sizing: border-box;
  overflow: hidden;
  background: #fff;
}

.app-product-card--row .app-product-card__image-wrap {
  width: 38%;
  max-width: 144px;
  aspect-ratio: 1 / 1;
  align-self: center;
  padding: 8px;
}

.app-product-card--tile .app-product-card__image-wrap {
  width: 100%;
  /* 首页商品图统一使用正方形画布，避免不同原图比例造成卡片视觉跳动。 */
  aspect-ratio: 1 / 1;
  background: var(--surface-subtle, #F7F8FA);
}

.app-product-card--compact .app-product-card__image-wrap {
  width: 82px;
  height: 82px;
  padding: 5px;
  align-self: center;
}

.app-product-card__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.app-product-card--row .app-product-card__image { border-radius: var(--radius-small, 8px); }

.app-product-card__body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.app-product-card--row .app-product-card__body {
  padding: 14px 12px 14px 4px;
}

.app-product-card--tile .app-product-card__body {
  padding: 10px;
}

.app-product-card--compact .app-product-card__body {
  padding: 10px 8px 9px 4px;
}

.app-product-card__name {
  display: -webkit-box;
  overflow: hidden;
  color: #202226;
  font-weight: var(--font-weight-semibold, 600);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.app-product-card--row .app-product-card__name {
  min-height: 40px;
  font-size: var(--type-body-size, 14px);
  line-height: 20px;
}

.app-product-card--tile .app-product-card__name {
  min-height: 44px;
  font-size: var(--type-body-size, 14px);
  line-height: var(--type-body-line-height, 22px);
}

.app-product-card--compact .app-product-card__name {
  font-size: var(--type-body-size, 14px);
  line-height: var(--type-body-line-height, 22px);
  -webkit-line-clamp: 2;
}

.app-product-card__code {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: var(--type-muted-color, #6C737F);
  font-size: var(--type-micro-size, 11px);
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-product-card--tile .app-product-card__code {
  margin-top: 3px;
  font-size: var(--type-micro-size, 11px);
  line-height: var(--type-micro-line-height, 16px);
}

.app-product-card__price-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 6px;
}

.app-product-card__price {
  color: var(--color-brand, #d7192d);
  font-size: 18px;
  font-weight: var(--font-weight-bold, 700);
  line-height: 22px;
  letter-spacing: -0.2px;
}

.app-product-card__unit {
  margin-left: 3px;
  color: #7d8188;
  font-size: var(--type-micro-size, 11px);
}

.app-product-card--tile .app-product-card__price-row {
  padding-top: 7px;
}

.app-product-card--tile .app-product-card__price {
  font-size: var(--type-price-tile-size, 16px);
  line-height: var(--type-price-tile-line-height, 22px);
}

.app-product-card--compact .app-product-card__price-row {
  padding-top: 5px;
}

.app-product-card--compact .app-product-card__price {
  color: #1f2126;
  font-size: var(--type-price-compact-size, 15px);
  line-height: var(--type-price-compact-line-height, 20px);
}

.app-product-card--compact :deep(.app-product-image__stock-badge) {
  top: 2px;
  right: 2px;
  padding: 3px 5px;
  font-size: var(--type-caption-size, 12px);
}

.app-product-card--tile .app-product-card__unit {
  font-size: var(--type-micro-size, 11px);
}

.app-product-card__stock {
  display: block;
  min-height: 16px;
  margin-top: 3px;
  overflow: hidden;
  color: #92969d;
  font-size: var(--type-micro-size, 11px);
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-product-card--tile .app-product-card__stock {
  min-height: 16px;
  margin-top: 3px;
  font-size: var(--type-micro-size, 11px);
  line-height: var(--type-micro-line-height, 16px);
}

.app-product-card__stock--normal { color: #858a92; }
.app-product-card__stock--low { color: #ad741d; }
.app-product-card__stock--empty { color: #a2a6ad; }
.app-product-card__stock--unknown { color: #858a92; }

@media screen and (min-width: 768px) {
  .app-product-card--compact {
    min-height: 94px;
  }

  .app-product-card--compact .app-product-card__image-wrap {
    width: 90px;
    height: 90px;
  }

}

/* 金额按实际可用宽度缩字，父布局允许收缩。 */
.app-product-card__price-row { min-width: 0; flex-wrap: wrap; column-gap: 7px; row-gap: 2px; }
.app-product-card__current-price { display: flex; align-items: baseline; min-width: 0; max-width: 100%; }
.app-product-card__list-price { max-width: 100%; color: var(--color-text-secondary, #7d8188); font-size: var(--type-caption-size, 12px); line-height: 18px; }
.app-product-card__list-price--strike :deep(.amount-text__value) { text-decoration: line-through; }
.app-product-card__unit { flex: none; }

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.app-product-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
.app-product-card.is-out-of-stock {
  .app-product-card__name, .app-product-card__code, .app-product-card__price,
  .app-product-card__unit, .app-product-card__stock, .app-product-card__list-price {
    color: var(--color-text-secondary, #737a84);
  }
}
</style>
