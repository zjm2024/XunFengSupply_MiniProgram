<template>
  <view
    class="app-product-card"
    :class="`app-product-card--${variant}`"
    hover-class="app-product-card--pressed"
    @click="emit('click')"
  >
    <view class="app-product-card__image-wrap">
      <image
        class="app-product-card__image"
        :src="product.image || defaultImage"
        mode="aspectFit"
      />
    </view>

    <view class="app-product-card__body">
      <text class="app-product-card__name">{{ product.name || '薰风精选商品' }}</text>
      <text v-if="showCode && product.code" class="app-product-card__code">{{ product.code }}</text>

      <view class="app-product-card__price-row">
        <text class="app-product-card__price">¥{{ formattedPrice }}</text>
        <text class="app-product-card__unit">/{{ product.unit || '件' }}</text>
      </view>

      <text
        v-if="showStock"
        class="app-product-card__stock"
        :class="`app-product-card__stock--${stockState}`"
      >
        {{ stockText }}<text v-if="minimumOrder > 0"> · {{ minimumOrder }}{{ product.unit || '件' }}起订</text>
      </text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  product: {
    type: Object,
    default: () => ({}),
  },
  variant: {
    type: String,
    default: 'row',
    validator: value => ['row', 'tile'].includes(value),
  },
  showCode: {
    type: Boolean,
    default: true,
  },
  showStock: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['click'])
const defaultImage = '/static/images/default-product.png'

const formattedPrice = computed(() => {
  const price = Number(props.product.price)
  return Number.isFinite(price) ? price.toFixed(2) : '0.00'
})

const stock = computed(() => Number(props.product.stock) || 0)
const minimumOrder = computed(() => Number(props.product.moq) || 0)
const stockState = computed(() => {
  if (stock.value <= 0) return 'empty'
  if (stock.value < 50) return 'low'
  return 'normal'
})
const stockText = computed(() => {
  if (stock.value <= 0) return '暂无库存'
  if (stock.value < 50) return `仅剩 ${stock.value} ${props.product.unit || '件'}`
  return '库存充足'
})
</script>

<style lang="scss" scoped>
.app-product-card {
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid rgba(17, 18, 22, 0.055);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 5px 20px rgba(17, 18, 22, 0.035);
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
}

.app-product-card--pressed {
  opacity: 0.94;
  transform: scale(0.985);
  box-shadow: 0 3px 12px rgba(17, 18, 22, 0.06);
}

.app-product-card--row {
  display: flex;
  min-height: 156px;
  aspect-ratio: 2.2 / 1;
}

.app-product-card--tile {
  display: flex;
  height: 100%;
  flex-direction: column;
}

.app-product-card__image-wrap {
  flex-shrink: 0;
  padding: 8px;
  box-sizing: border-box;
  overflow: hidden;
  background: #fff;
}

.app-product-card--row .app-product-card__image-wrap {
  width: 41.5%;
  aspect-ratio: 1 / 1;
  align-self: center;
}

.app-product-card--tile .app-product-card__image-wrap {
  width: 100%;
  aspect-ratio: 1.18 / 1;
  border-bottom: 1px solid rgba(17, 18, 22, 0.04);
}

.app-product-card__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.app-product-card__body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.app-product-card--row .app-product-card__body {
  padding: 12px 14px 12px 5px;
}

.app-product-card--tile .app-product-card__body {
  padding: 10px;
}

.app-product-card__name {
  display: -webkit-box;
  overflow: hidden;
  color: #191b1f;
  font-weight: 600;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.app-product-card--row .app-product-card__name {
  font-size: 14px;
  line-height: 20px;
}

.app-product-card--tile .app-product-card__name {
  min-height: 36px;
  font-size: 12px;
  line-height: 18px;
}

.app-product-card__code {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  color: #9ca1aa;
  font-size: 11px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-product-card--tile .app-product-card__code {
  margin-top: 3px;
  font-size: 10px;
  line-height: 15px;
}

.app-product-card__price-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 8px;
}

.app-product-card__price {
  color: var(--color-brand, #d7192d);
  font-size: 18px;
  font-weight: 700;
  line-height: 24px;
  letter-spacing: -0.2px;
}

.app-product-card__unit {
  margin-left: 3px;
  color: #7a7f88;
  font-size: 11px;
}

.app-product-card--tile .app-product-card__price-row {
  padding-top: 7px;
}

.app-product-card--tile .app-product-card__price {
  font-size: 16px;
  line-height: 22px;
}

.app-product-card--tile .app-product-card__unit {
  font-size: 10px;
}

.app-product-card__stock {
  display: block;
  min-height: 18px;
  margin-top: 5px;
  overflow: hidden;
  font-size: 11px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-product-card--tile .app-product-card__stock {
  min-height: 16px;
  margin-top: 3px;
  font-size: 10px;
  line-height: 16px;
}

.app-product-card__stock--normal { color: #259b63; }
.app-product-card__stock--low { color: #d58b13; }
.app-product-card__stock--empty { color: #a2a6ad; }

@media screen and (min-width: 600px) and (max-width: 767px) {
  .app-product-card--row {
    height: 190px;
    min-height: 190px;
    aspect-ratio: auto;
  }

  .app-product-card--row .app-product-card__image-wrap {
    width: 190px;
    height: 190px;
  }
}

@media screen and (min-width: 768px) {
  .app-product-card--row {
    height: auto;
    min-height: 160px;
    aspect-ratio: 2.2 / 1;
    border-radius: 18px;
  }

  .app-product-card--row .app-product-card__image-wrap {
    width: 41.5%;
    height: auto;
  }

  .app-product-card--row .app-product-card__name {
    min-height: 44px;
    font-size: 15px;
    line-height: 22px;
  }

  .app-product-card--row .app-product-card__price-row {
    padding-top: 12px;
  }

  .app-product-card--row .app-product-card__price {
    font-size: 20px;
    line-height: 26px;
  }

  .app-product-card--tile .app-product-card__name {
    font-size: 13px;
  }
}
</style>
