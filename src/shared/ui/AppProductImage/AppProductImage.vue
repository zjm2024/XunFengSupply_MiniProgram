<template>
  <view class="app-product-image">
    <image
      v-if="hasImageSource && !imageFailed"
      class="app-product-image__source"
      :class="{ 'is-loading': isLoading }"
      :src="displaySrc"
      :mode="mode"
      :lazy-load="lazyLoad"
      @load="handleImageLoad"
      @error="handleImageError"
    />
    <view
      v-if="hasImageRequest && !imageFailed && isLoading"
      class="app-product-image__loading"
      aria-label="图片加载中"
    >
      <view class="app-product-image__spinner" />
      <text class="app-product-image__loading-text">图片加载中</text>
    </view>
    <view v-if="!hasImageSource || imageFailed" class="app-product-image__fallback">
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
const isLoading = ref(false)
const displaySrc = ref('')
let cacheRequestId = 0
const hasImageSource = computed(() => Boolean(displaySrc.value?.trim()))
const hasImageRequest = computed(() => Boolean(String(props.src || '').trim()))
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
  isLoading.value = Boolean(remoteUrl)
  const cachedPath = getCachedResourcePath(remoteUrl, { kind: 'image' })
  // APP 端不要在本地缓存完成前直接渲染远程地址，否则原生 image 会先进入失败态，
  // 用户看到的是“图片不可用”，而不是加载中的状态。
  const isRemote = /^https?:\/\//i.test(remoteUrl)
  const isH5 = typeof window !== 'undefined' && typeof document !== 'undefined'
  displaySrc.value = cachedPath || (isRemote && !isH5 ? '' : remoteUrl)
  if (!remoteUrl) {
    isLoading.value = false
    return
  }

  const cachedUrl = await getCachedResource(remoteUrl, { kind: 'image' })
  if (requestId === cacheRequestId && cachedUrl) displaySrc.value = cachedUrl
}, { immediate: true })

/** 图片加载成功。 */
function handleImageLoad() {
  isLoading.value = false
  imageFailed.value = false
}

/** 图片加载失败。 */
function handleImageError() {
  imageFailed.value = true
  isLoading.value = false
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
  transition: opacity 160ms ease;

  &.is-loading {
    opacity: 0;
  }
}

.app-product-image__loading {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  gap: 8px;
  background: #f3f4f5;
}

.app-product-image__spinner {
  width: 30rpx;
  height: 30rpx;
  border: 3rpx solid #e4e6ea;
  border-top-color: var(--brand-primary, #d7192d);
  border-radius: 50%;
  animation: app-product-image-spin 0.8s linear infinite;
}

.app-product-image__loading-text {
  color: #969aa3;
  font-size: 12px;
  line-height: 18px;
}

.app-product-image__fallback {
  display: grid;
  place-items: center;
  color: #b6b9c0;
  background: #f3f4f5;
}

@keyframes app-product-image-spin {
  to { transform: rotate(360deg); }
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
