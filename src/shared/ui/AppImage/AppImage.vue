<!--
  AppImage - 统一图片组件
  职责：提供统一的图片加载、错误占位、懒加载能力

  使用方式：
    <AppImage
      src="https://example.com/image.jpg"
      mode="aspectFill"
      :width="120"
      :height="120"
      radius="8"
    />
-->
<template>
  <view class="app-image-wrapper" :style="wrapperStyle">
    <image
      v-if="displaySrc && !hasError"
      :key="displaySrc"
      class="app-image"
      :class="{ 'is-loading': isLoading }"
      :src="displaySrc"
      :mode="mode"
      :lazy-load="lazyLoad"
      :show-menu-by-longpress="showMenuByLongpress"
      @load="handleLoad"
      @error="handleError"
    />
    <view v-if="!hasSource || hasError" class="app-image-error" :style="errorStyle">
      <AppIcon name="image" :size="errorIconSize" color="currentColor" />
    </view>
    <view v-if="hasSource && isLoading && !hasError" class="app-image-loading">
      <view class="loading-spinner" />
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import AppIcon from '../AppIcon/AppIcon.vue'
import { useImageVisibility } from '@/shared/composables/useImageVisibility.js'
import { requestCachedResource, getCachedResourcePath, isWebResourcePlatform, hasLoadedImage, markImageLoaded, invalidateCachedResource } from '@/shared/utils/resourceCache.js'

const props = defineProps({
  // 图片地址
  src: {
    type: String,
    default: ''
  },
  // 图片裁剪模式
  mode: {
    type: String,
    default: 'aspectFill'
  },
  // 宽度（单位 rpx 或 px）
  width: {
    type: [Number, String],
    default: 120
  },
  // 高度（单位 rpx 或 px）
  height: {
    type: [Number, String],
    default: 120
  },
  // 圆角（单位 rpx 或 px）
  radius: {
    type: [Number, String],
    default: 0
  },
  // 是否懒加载
  lazyLoad: {
    type: Boolean,
    default: true
  },
  // 是否显示长按菜单
  showMenuByLongpress: {
    type: Boolean,
    default: false
  },
  // 错误状态图标大小
  errorIconSize: {
    type: Number,
    default: 32
  }
})

const emit = defineEmits(['load', 'error'])

const isLoading = ref(true)
const hasError = ref(false)
const displaySrc = ref('')
let sourceVersion = 0
let alternateSource = null
let resourceRequest = null
const canRequest = useImageVisibility(() => props.lazyLoad !== false, '.app-image-wrapper')
const hasSource = computed(() => Boolean(String(props.src || '').trim()))

// 规范化尺寸单位
const normalizeSize = (value) => {
  if (typeof value === 'number') {
    return `${value}rpx`
  }
  const str = String(value)
  if (/^\d+$/.test(str)) {
    return `${str}rpx`
  }
  return str
}

const wrapperStyle = computed(() => ({
  width: normalizeSize(props.width),
  height: normalizeSize(props.height),
  borderRadius: normalizeSize(props.radius)
}))

const errorStyle = computed(() => ({
  width: normalizeSize(props.width),
  height: normalizeSize(props.height),
  borderRadius: normalizeSize(props.radius)
}))

function handleLoad(event) {
  markImageLoaded(props.src)
  markImageLoaded(displaySrc.value)
  isLoading.value = false
  hasError.value = false
  emit('load', event)
}

async function handleError(event) {
  const version = sourceVersion
  const failedSource = displaySrc.value
  invalidateCachedResource(props.src, { kind: 'image', localPath: failedSource })
  const alternate = alternateSource
  alternateSource = null
  isLoading.value = false
  hasError.value = true

  // 缓存失效时试原图；原图直连失败时，仍可尝试已下载的副本。
  const nextSource = await alternate
  if (version !== sourceVersion) return
  if (nextSource && nextSource !== failedSource) {
    displaySrc.value = nextSource
    hasError.value = false
    isLoading.value = true
    return
  }
  emit('error', event)
}

watch(() => canRequest.priority?.value, value => resourceRequest?.setPriority(value ?? 0))

watch([() => props.src, () => canRequest.value], ([source, visible]) => {
  resourceRequest?.release()
  resourceRequest = null
  const version = ++sourceVersion
  const original = String(source || '').trim()
  const cached = getCachedResourcePath(original, { kind: 'image' })
  const remote = /^https?:\/\//i.test(original)
  const isWeb = isWebResourcePlatform()
  // 命中本地文件或已显示过的同图不再透明/转圈；首次下载仍保留加载反馈。
  isLoading.value = remote && !cached && (!isWeb || !hasLoadedImage(original))
  hasError.value = false
  displaySrc.value = cached || (remote && !isWeb ? '' : original)
  alternateSource = cached ? original : null
  if (remote && !cached && !visible) { displaySrc.value = ''; isLoading.value = false; return }
  if (original && !cached) {
    resourceRequest = requestCachedResource(original, { kind: 'image', priority: canRequest.priority?.value ?? 0 })
    const pending = resourceRequest.promise.catch(() => original)
    alternateSource = pending
    void pending.then(path => {
      if (version === sourceVersion && !displaySrc.value) displaySrc.value = path
    })
  }
}, { immediate: true })
onBeforeUnmount(() => { sourceVersion += 1; resourceRequest?.release() })
</script>

<style lang="scss" scoped>
.app-image-wrapper {
  position: relative;
  overflow: hidden;
  background: var(--app-image-background, var(--surface-page, #F4F5F8));
  flex-shrink: 0;
}

.app-image {
  width: 100%;
  height: 100%;
  display: block;

  &.is-loading {
    opacity: 0;
  }
}

.app-image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-image-background, var(--surface-page, #F4F5F8));
  color: var(--text-tertiary, #9DA1A8);
}

.app-image-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 32rpx;
  height: 32rpx;
  border: 3rpx solid var(--divider-color, #ECEEF2);
  border-top-color: var(--brand-primary, #D7192D);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
