<template>
  <view class="app-product-image">
    <image
      v-if="hasUsableImage"
      class="app-product-image__source"
      :src="displaySrc"
      :mode="mode"
      :lazy-load="lazyLoad"
      @error="handleImageError"
    />
    <view v-else class="app-product-image__fallback">
      <AppIcon name="image" :size="fallbackIconSize" :stroke-width="1.6" />
    </view>
    <text v-if="isOutOfStock" class="app-product-image__stock-badge">暂无库存</text>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AppIcon from '../AppIcon/AppIcon.vue'
import { getCachedResource, getCachedResourcePath } from '@/shared/utils/resourceCache.js'

const props = defineProps({
  src: { type: String, default: '' },
  mode: { type: String, default: 'aspectFit' },
  lazyLoad: { type: Boolean, default: false },
  stock: { type: [Number, String], default: undefined },
  showStockBadge: { type: Boolean, default: true },
  fallbackIconSize: { type: Number, default: 28 },
})

const imageFailed = ref(false)
const displaySrc = ref('')
let cacheRequestId = 0
const hasUsableImage = computed(() => Boolean(displaySrc.value?.trim()) && !imageFailed.value)
const hasKnownStock = computed(() => props.stock !== undefined && props.stock !== null && props.stock !== '')
const isOutOfStock = computed(() => (
  props.showStockBadge
  && hasKnownStock.value
  && Number(props.stock) <= 0
))

watch(() => props.src, async (source) => {
  const requestId = ++cacheRequestId
  const remoteUrl = String(source || '').trim()
  imageFailed.value = false
  displaySrc.value = getCachedResourcePath(remoteUrl, { kind: 'image' }) || remoteUrl
  if (!remoteUrl) return

  const cachedUrl = await getCachedResource(remoteUrl, { kind: 'image' })
  if (requestId === cacheRequestId && cachedUrl) displaySrc.value = cachedUrl
}, { immediate: true })

function handleImageError() {
  imageFailed.value = true
}
</script>

<style lang="scss" scoped>
.app-product-image {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  box-sizing: border-box;
  background: #f5f6f7;
}

.app-product-image__source,
.app-product-image__fallback {
  width: 100%;
  height: 100%;
}

.app-product-image__source {
  display: block;
}

.app-product-image__fallback {
  display: grid;
  place-items: center;
  color: #b6b9c0;
  background: #f3f4f5;
}

.app-product-image__stock-badge {
  position: absolute;
  z-index: 2;
  top: 6px;
  right: 6px;
  padding: 4px 7px;
  border-radius: 10px;
  color: #fff;
  font-size: 8px;
  font-weight: 650;
  line-height: 1;
  background: rgba(65, 68, 75, 0.72);
}
</style>
