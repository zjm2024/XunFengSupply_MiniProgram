<template>
  <view v-if="modelValue" class="image-viewer" @tap="closeViewer">
    <view class="viewer-toolbar" :style="toolbarStyle">
      <button class="viewer-close" aria-label="关闭图片预览" @tap.stop="closeViewer">
        <AppIcon name="close" :size="22" color="#FFFFFF" />
      </button>
      <text class="viewer-counter">{{ activeIndex + 1 }} / {{ normalizedImages.length }}</text>
      <view class="viewer-toolbar-spacer"></view>
    </view>

    <swiper
      class="viewer-swiper"
      :current="activeIndex"
      :circular="normalizedImages.length > 1"
      :disable-touch="normalizedImages.length <= 1 || activeScale > 1.01"
      @change="handleChange"
    >
      <swiper-item v-for="(image, index) in normalizedImages" :key="`${image}-${index}`">
        <view class="viewer-slide">
          <movable-area v-if="!failedImages[index]" class="viewer-movable-area" scale-area @tap.stop="closeViewer">
            <movable-view
              class="viewer-movable"
              :direction="scaleFor(index) > 1.01 ? 'all' : 'none'"
              :scale="true"
              :scale-min="1"
              :scale-max="4"
              :scale-value="scaleFor(index)"
              :out-of-bounds="true"
              @scale="handleScale(index, $event)"
            >
              <image
                class="viewer-image"
                :src="image"
                mode="aspectFit"
                :show-menu-by-longpress="true"
                @error="markImageFailed(index)"
              />
            </movable-view>
          </movable-area>
          <view v-else class="viewer-fallback">
            <AppIcon name="image" :size="48" color="#6D6E73" />
            <text class="viewer-fallback-text">图片暂时无法显示</text>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <view class="viewer-hint" :style="hintStyle">
      <text>{{ normalizedImages.length > 1 ? '左右滑动 · 双指缩放 · 点击关闭' : '双指缩放 · 点击关闭' }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AppIcon from '../AppIcon/AppIcon.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  images: { type: Array, default: () => [] },
  initialIndex: { type: Number, default: 0 },
})

const emit = defineEmits(['update:modelValue', 'change', 'close'])

const activeIndex = ref(0)
const failedImages = ref({})
const imageScales = ref({})

const normalizedImages = computed(() => props.images
  .map(image => String(image || '').trim())
  .filter(Boolean))

const safeAreaInsets = (() => {
  if (typeof uni === 'undefined') return { top: 0, bottom: 0 }
  try {
    const systemInfo = uni.getSystemInfoSync()
    return {
      top: Number(systemInfo.safeAreaInsets?.top || systemInfo.statusBarHeight || 0),
      bottom: Number(systemInfo.safeAreaInsets?.bottom || 0),
    }
  } catch (_) {
    return { top: 0, bottom: 0 }
  }
})()

const toolbarStyle = computed(() => ({
  top: `${Math.max(12, safeAreaInsets.top + 8)}px`,
}))

const hintStyle = computed(() => ({
  bottom: `${Math.max(18, safeAreaInsets.bottom + 12)}px`,
}))
const activeScale = computed(() => scaleFor(activeIndex.value))

function clampIndex(index) {
  const maxIndex = Math.max(0, normalizedImages.value.length - 1)
  return Math.min(Math.max(0, Number(index) || 0), maxIndex)
}

function syncInitialIndex() {
  activeIndex.value = clampIndex(props.initialIndex)
}

function handleChange(event) {
  activeIndex.value = clampIndex(event?.detail?.current)
  imageScales.value = {}
  emit('change', activeIndex.value)
}

function scaleFor(index) {
  return Math.max(1, Number(imageScales.value[index]) || 1)
}

function handleScale(index, event) {
  const scale = Math.min(4, Math.max(1, Number(event?.detail?.scale) || 1))
  imageScales.value = { ...imageScales.value, [index]: scale }
}

function markImageFailed(index) {
  failedImages.value = { ...failedImages.value, [index]: true }
}

function closeViewer() {
  emit('update:modelValue', false)
  emit('close')
}

watch(
  () => props.modelValue,
  visible => {
    if (visible) {
      imageScales.value = {}
      syncInitialIndex()
    }
  },
  { immediate: true },
)

watch(
  () => props.initialIndex,
  () => {
    if (props.modelValue) syncInitialIndex()
  },
)

watch(
  () => props.images,
  () => {
    failedImages.value = {}
    imageScales.value = {}
    activeIndex.value = clampIndex(activeIndex.value)
  },
  { deep: true },
)
</script>

<style lang="scss" scoped>
.image-viewer {
  position: fixed;
  z-index: 2000;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #0B0B0D;
}

.viewer-toolbar {
  position: absolute;
  z-index: 2;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}

.viewer-close,
.viewer-toolbar-spacer {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
}

.viewer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.12);
  pointer-events: auto;

  &::after {
    border: 0;
  }
}

.viewer-counter {
  min-width: 68px;
  padding: 7px 14px;
  border-radius: 18px;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.12);
  font-size: 14px;
  line-height: 20px;
  text-align: center;
  box-sizing: border-box;
}

.viewer-swiper,
.viewer-slide {
  width: 100%;
  height: 100%;
}

.viewer-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 88px 18px 70px;
  box-sizing: border-box;
}

.viewer-image {
  display: block;
  width: 100%;
  height: 100%;
}

.viewer-movable-area,
.viewer-movable {
  width: 100%;
  height: 100%;
}

.viewer-movable-area {
  overflow: hidden;
}

.viewer-movable {
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #8B8C91;
}

.viewer-fallback-text {
  color: #8B8C91;
  font-size: 14px;
  line-height: 20px;
}

.viewer-hint {
  position: absolute;
  z-index: 2;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.48);
  font-size: 12px;
  line-height: 18px;
  pointer-events: none;
}

@media (min-width: 800px) {
  .viewer-toolbar {
    left: 28px;
    right: 28px;
  }

  .viewer-close,
  .viewer-toolbar-spacer {
    width: 44px;
    height: 44px;
    flex-basis: 44px;
  }

  .viewer-slide {
    padding: 96px 5vw 76px;
  }

  .viewer-image {
    max-width: 1200px;
  }
}
</style>
