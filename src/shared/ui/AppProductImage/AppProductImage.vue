<template>
  <view class="app-product-image" :class="{ 'is-out-of-stock': isUnavailable }">
    <image
      v-if="hasImageSource && !imageFailed"
      :key="displaySrc"
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
    <view v-if="!hasImageRequest || imageFailed" class="app-product-image__fallback">
      <AppIcon name="image" :size="fallbackIconSize" :stroke-width="1.6" />
    </view>
    <text v-if="showStockBadge && isUnavailable" class="app-product-image__stock-badge">{{ t('common.productCard.stockEmpty') }}</text>
  </view>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { t } from '@/shared/i18n/index.js'
import { isProductOutOfStock } from '@/shared/utils/productAvailability.js'
import AppIcon from '../AppIcon/AppIcon.vue'
import { useImageVisibility } from '@/shared/composables/useImageVisibility.js'
import { requestCachedResource, getCachedResourcePath, isWebResourcePlatform, hasLoadedImage, markImageLoaded, invalidateCachedResource } from '@/shared/utils/resourceCache.js'

const props = defineProps({
  src: { type: String, default: '' },
  mode: { type: String, default: 'aspectFit' },
  lazyLoad: { type: Boolean, default: true },
  stock: { type: [Number, String], default: undefined },
  unavailable: { type: Boolean, default: false },
  showStockBadge: { type: Boolean, default: true },
  fallbackIconSize: { type: Number, default: 28 },
})

const imageFailed = ref(false)
const isLoading = ref(false)
const displaySrc = ref('')
let cacheRequestId = 0
let alternateSource = null
let resourceRequest = null
const canRequest = useImageVisibility(() => props.lazyLoad !== false, '.app-product-image')
const hasImageSource = computed(() => Boolean(displaySrc.value?.trim()))
const hasImageRequest = computed(() => Boolean(String(props.src || '').trim()))
const isUnavailable = computed(() => props.unavailable || isProductOutOfStock({ stock: props.stock }))

watch(() => canRequest.priority?.value, value => resourceRequest?.setPriority(value ?? 0))

watch([() => props.src, () => canRequest.value], ([source, visible]) => {
  resourceRequest?.release()
  resourceRequest = null
  const requestId = ++cacheRequestId
  const remoteUrl = String(source || '').trim()
  const cachedPath = getCachedResourcePath(remoteUrl, { kind: 'image' })
  const isRemote = /^https?:\/\//i.test(remoteUrl)
  const isWeb = isWebResourcePlatform()
  imageFailed.value = false
  isLoading.value = isRemote && !cachedPath && (!isWeb || !hasLoadedImage(remoteUrl))
  displaySrc.value = cachedPath || (isRemote && !isWeb ? '' : remoteUrl)
  alternateSource = cachedPath ? remoteUrl : null
  if (isRemote && !cachedPath && !visible) { displaySrc.value = ''; isLoading.value = false; return }
  if (remoteUrl && !cachedPath) {
    resourceRequest = requestCachedResource(remoteUrl, { kind: 'image', priority: canRequest.priority?.value ?? 0 })
    const pending = resourceRequest.promise.catch(() => remoteUrl)
    alternateSource = pending
    void pending.then(path => {
      if (requestId === cacheRequestId && !displaySrc.value) displaySrc.value = path
    })
  }
}, { immediate: true })
onBeforeUnmount(() => { cacheRequestId += 1; resourceRequest?.release() })

/** 图片加载成功。 */
function handleImageLoad() {
  markImageLoaded(props.src)
  markImageLoaded(displaySrc.value)
  isLoading.value = false
  imageFailed.value = false
}

/** 图片加载失败。 */
async function handleImageError() {
  const requestId = cacheRequestId
  const failedSource = displaySrc.value
  const alternate = alternateSource
  alternateSource = null
  invalidateCachedResource(props.src, { kind: 'image', localPath: failedSource })
  imageFailed.value = true
  isLoading.value = false
  const nextSource = await alternate
  if (requestId !== cacheRequestId) return
  if (nextSource && nextSource !== failedSource) {
    displaySrc.value = nextSource
    imageFailed.value = false
    isLoading.value = true
  }
}
</script>

<style lang="scss" scoped>
.app-product-image {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  box-sizing: border-box;
  background: var(--product-image-background, #f5f6f7);
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
  background: var(--product-image-background, #f3f4f5);
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
  font-size: var(--type-caption-size, 12px);
  line-height: 18px;
}

.app-product-image__fallback {
  display: grid;
  place-items: center;
  color: #b6b9c0;
  background: var(--product-image-background, #f3f4f5);
}

@keyframes app-product-image-spin {
  to { transform: rotate(360deg); }
}

.app-product-image__stock-badge {
  position: absolute;
  z-index: 2;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 5px 3px;
  text-align: center;
  box-sizing: border-box;
  color: #fff;
  font-size: var(--type-caption-size, 12px);
  font-weight: var(--font-weight-semibold, 600);
  line-height: 1;
  background: rgba(65, 68, 75, 0.72);
}
.app-product-image.is-out-of-stock .app-product-image__source {
  filter: grayscale(1);
  opacity: 0.55;
}
</style>
