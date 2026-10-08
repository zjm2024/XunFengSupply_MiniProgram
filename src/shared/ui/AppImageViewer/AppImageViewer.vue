<template>
  <view
    v-if="modelValue"
    class="hv-viewer"
    :style="rootStyle"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
  >
    <!-- ============ 顶部栏 ============ -->
    <view class="hv-toolbar" :style="toolbarStyle">
      <view class="hv-close" @tap.stop="closeViewer">
        <AppIcon name="close" :size="20" color="#FFFFFF" />
      </view>
      <view v-if="imageList.length > 1" class="hv-counter">
        <text>{{ activeIndex + 1 }} / {{ imageList.length }}</text>
      </view>
      <view class="hv-toolbar-spacer"></view>
    </view>

    <!-- ============ 图片舞台 ============ -->
    <view class="hv-stage" :style="stageStyle">
      <swiper
        class="hv-swiper"
        :current="activeIndex"
        :circular="imageList.length > 1"
        :disable-touch="imageList.length <= 1 || scaleFor(activeIndex) > 1.01"
        @change="handleChange"
      >
        <swiper-item v-for="(image, index) in imageList" :key="index">
          <view class="hv-slide">
            <movable-area
              v-if="!failedImages[index]"
              class="hv-movable-area"
              scale-area
            >
              <movable-view
                class="hv-movable"
                :direction="scaleFor(index) > 1.01 ? 'all' : 'none'"
                :scale="true"
                :scale-min="1"
                :scale-max="4"
                :scale-value="scaleFor(index)"
                :out-of-bounds="true"
                :damping="20"
                :friction="2"
                :inertia="true"
                @scale="handleScale(index, $event)"
              >
                <image
                  class="hv-image"
                  :src="image"
                  mode="aspectFit"
                  :show-menu-by-longpress="true"
                  @load="markLoaded(index)"
                  @error="markFailed(index)"
                  @tap.stop="handleImageTap(index)"
                />
              </movable-view>

              <view
                v-if="loadingImages[index] && !failedImages[index]"
                class="hv-loading"
              >
                <view class="hv-spinner"></view>
              </view>
            </movable-area>

            <view v-else class="hv-fallback">
              <AppIcon name="image" :size="44" color="#6D6E73" />
              <text class="hv-fallback-text">图片暂时无法显示</text>
            </view>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <!-- ============ 底部缩略图条 ============ -->
    <view
      v-if="imageList.length > 1"
      class="hv-thumbs"
      :style="thumbBarStyle"
      @touchstart.stop
      @touchmove.stop
      @touchend.stop
    >
      <scroll-view
        class="hv-thumbs-scroll"
        scroll-x
        :scroll-into-view="thumbIntoView"
        :scroll-with-animation="true"
        :show-scrollbar="false"
      >
        <view class="hv-thumbs-inner">
          <view
            v-for="(image, index) in imageList"
            :key="index"
            :id="'hv-thumb-' + index"
            class="hv-thumb"
            :class="{ 'is-active': index === activeIndex }"
            @tap.stop="jumpTo(index)"
          >
            <image class="hv-thumb-img" :src="image" mode="aspectFill" />
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ============ 单图提示 ============ -->
    <view
      v-if="imageList.length === 1"
      class="hv-hint"
      :style="hintStyle"
    >
      <text>双指缩放 · 点击关闭</text>
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
  /** 下滑关闭的位移阈值（px） */
  dismissThreshold: { type: Number, default: 100 },
})

const emit = defineEmits(['update:modelValue', 'change', 'close'])

/* ---------------------------------------------------------------- */
/* 状态                                                              */
/* ---------------------------------------------------------------- */

const activeIndex = ref(0)
const failedImages = ref({})
const loadingImages = ref({})
const imageScales = ref({})

/* 双击检测 */
const lastTapTime = ref(0)
const lastTapIndex = ref(-1)
let singleTapTimer = null

/* 下滑关闭 */
const dragY = ref(0)
const isDragging = ref(false)
const dragStartY = ref(0)
const dragStartTime = ref(0)
const dragDirection = ref(null)   // 'vertical' | 'other' | null

/* ---------------------------------------------------------------- */
/* 计算属性                                                          */
/* ---------------------------------------------------------------- */

const imageList = computed(() =>
  props.images.map(url => String(url || '').trim()).filter(Boolean),
)

const safeAreaInsets = (() => {
  if (typeof uni === 'undefined') return { top: 0, bottom: 0 }
  try {
    const info = uni.getSystemInfoSync()
    return {
      top: Number(info.safeAreaInsets?.top || info.statusBarHeight || 0),
      bottom: Number(info.safeAreaInsets?.bottom || 0),
    }
  } catch (_) {
    return { top: 0, bottom: 0 }
  }
})()

/** 下滑进度（0 = 未拖动，1 = 完全消失） */
const dragProgress = computed(() => {
  if (!isDragging.value || dragY.value <= 0) return 1
  return 1 - Math.min(dragY.value / 320, 1) * 0.55
})

const rootStyle = computed(() => ({
  backgroundColor: `rgba(11, 11, 13, ${dragProgress.value})`,
}))

const toolbarStyle = computed(() => ({
  top: `${Math.max(12, safeAreaInsets.top + 8)}px`,
  opacity: isDragging.value && dragY.value > 16 ? '0' : '1',
  transition: isDragging.value ? 'none' : 'opacity 180ms ease',
}))

const stageStyle = computed(() => {
  if (!isDragging.value || dragY.value <= 0) {
    return {
      transform: 'translateY(0) scale(1)',
      transition: 'transform 260ms cubic-bezier(.2,.8,.2,1)',
    }
  }
  const scale = Math.max(0.88, 1 - dragY.value / 1600)
  return {
    transform: `translateY(${dragY.value}px) scale(${scale})`,
    transition: 'none',
  }
})

const thumbBarStyle = computed(() => ({
  bottom: `${Math.max(14, safeAreaInsets.bottom + 10)}px`,
  opacity: isDragging.value && dragY.value > 16 ? '0' : '1',
  transition: isDragging.value ? 'none' : 'opacity 180ms ease',
}))

const hintStyle = computed(() => ({
  bottom: `${Math.max(18, safeAreaInsets.bottom + 12)}px`,
}))

/** 用于让缩略图自动滚动到当前项 */
const thumbIntoView = computed(() => `hv-thumb-${activeIndex.value}`)

/* ---------------------------------------------------------------- */
/* 工具                                                              */
/* ---------------------------------------------------------------- */

function clampIndex(index) {
  const max = Math.max(0, imageList.value.length - 1)
  return Math.min(Math.max(0, Number(index) || 0), max)
}

function scaleFor(index) {
  return Math.max(1, Number(imageScales.value[index]) || 1)
}

/* ---------------------------------------------------------------- */
/* 图片事件                                                          */
/* ---------------------------------------------------------------- */

function handleChange(e) {
  activeIndex.value = clampIndex(e?.detail?.current)
  emit('change', activeIndex.value)
}

function handleScale(index, e) {
  const s = Math.min(4, Math.max(1, Number(e?.detail?.scale) || 1))
  imageScales.value = { ...imageScales.value, [index]: s }
}

/**
 * 单击 / 双击判定：
 * - 280ms 内同一张图连续两次点击 → 双击，切换 1x / 2x
 * - 否则延时 280ms 后执行单击关闭
 */
function handleImageTap(index) {
  const now = Date.now()

  if (now - lastTapTime.value < 280 && lastTapIndex.value === index) {
    // 双击
    if (singleTapTimer) {
      clearTimeout(singleTapTimer)
      singleTapTimer = null
    }
    const s = scaleFor(index)
    imageScales.value = { ...imageScales.value, [index]: s > 1 ? 1 : 2 }
    lastTapTime.value = 0
    lastTapIndex.value = -1
    return
  }

  lastTapTime.value = now
  lastTapIndex.value = index

  if (singleTapTimer) clearTimeout(singleTapTimer)
  singleTapTimer = setTimeout(() => {
    singleTapTimer = null
    closeViewer()
  }, 280)
}

function markLoaded(index) {
  loadingImages.value = { ...loadingImages.value, [index]: false }
}

function markFailed(index) {
  failedImages.value = { ...failedImages.value, [index]: true }
  loadingImages.value = { ...loadingImages.value, [index]: false }
}

function jumpTo(index) {
  activeIndex.value = clampIndex(index)
}

function closeViewer() {
  emit('update:modelValue', false)
  emit('close')
}

/* ---------------------------------------------------------------- */
/* 下滑关闭手势                                                      */
/* ---------------------------------------------------------------- */

function handleTouchStart(e) {
  // 已放大状态下不处理下滑
  if (scaleFor(activeIndex.value) > 1.01) return

  const touch = e.touches?.[0] || e.changedTouches?.[0]
  if (!touch) return

  dragStartY.value = touch.clientY ?? touch.pageY ?? 0
  dragStartTime.value = Date.now()
  dragDirection.value = null
  dragY.value = 0
  isDragging.value = false
}

function handleTouchMove(e) {
  if (scaleFor(activeIndex.value) > 1.01) return

  const touch = e.touches?.[0]
  if (!touch) return

  const currentY = touch.clientY ?? touch.pageY ?? 0
  const deltaY = currentY - dragStartY.value

  // 首次超过 8px 时确定方向
  if (dragDirection.value === null) {
    if (Math.abs(deltaY) < 8) return
    dragDirection.value = deltaY > 0 ? 'vertical' : 'other'
  }

  // 只处理向下滑
  if (dragDirection.value !== 'vertical') return

  if (deltaY > 0) {
    isDragging.value = true
    // 阻尼系数：手指位移的 0.85 倍
    dragY.value = deltaY * 0.85
  }
}

function handleTouchEnd() {
  if (!isDragging.value) {
    dragDirection.value = null
    return
  }

  const elapsed = Math.max(1, Date.now() - dragStartTime.value)
  const velocity = dragY.value / elapsed
  const shouldClose =
    dragY.value > props.dismissThreshold || velocity > 0.6

  isDragging.value = false

  if (shouldClose) {
    dragY.value = 0
    dragDirection.value = null
    closeViewer()
    return
  }

  // 回弹：交给 CSS transition 处理
  dragY.value = 0
  dragDirection.value = null
}

/* ---------------------------------------------------------------- */
/* 监听                                                              */
/* ---------------------------------------------------------------- */

watch(
  () => props.modelValue,
  visible => {
    if (visible) {
      // 每次打开都重置全部状态
      imageScales.value = {}
      failedImages.value = {}
      loadingImages.value = {}
      loadingImages.value = imageList.value.reduce((acc, _, i) => {
        acc[i] = true
        return acc
      }, {})
      activeIndex.value = clampIndex(props.initialIndex)
      dragY.value = 0
      isDragging.value = false
      dragDirection.value = null
    } else {
      if (singleTapTimer) {
        clearTimeout(singleTapTimer)
        singleTapTimer = null
      }
    }
  },
  { immediate: true },
)

watch(
  () => props.initialIndex,
  () => {
    if (props.modelValue) {
      activeIndex.value = clampIndex(props.initialIndex)
    }
  },
)

watch(
  () => props.images,
  () => {
    activeIndex.value = clampIndex(activeIndex.value)
    failedImages.value = {}
  },
  { deep: true },
)
</script>

<style lang="scss" scoped>
/* ================================================================
   根容器
   ================================================================ */
.hv-viewer {
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
  background: #0b0b0d;
  animation: hv-fade-in 180ms ease-out both;
  touch-action: none;
}

@keyframes hv-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ================================================================
   顶部栏
   ================================================================ */
.hv-toolbar {
  position: absolute;
  z-index: 4;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}

.hv-close,
.hv-toolbar-spacer {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
}

.hv-close {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  pointer-events: auto;

  &:active {
    background: rgba(255, 255, 255, 0.22);
  }
}

.hv-counter {
  padding: 6px 14px;
  border-radius: 16px;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  font-size: 13px;
  line-height: 1.4;
  letter-spacing: 0.02em;
}

/* ================================================================
   图片舞台
   ================================================================ */
.hv-stage {
  width: 100%;
  height: 100%;
  will-change: transform;
}

.hv-swiper,
.hv-slide {
  width: 100%;
  height: 100%;
}

.hv-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 16px 148px;
  box-sizing: border-box;
}

.hv-movable-area,
.hv-movable {
  width: 100%;
  height: 100%;
}

.hv-movable-area {
  overflow: hidden;
}

.hv-movable {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hv-image {
  display: block;
  width: 100%;
  height: 100%;
}

/* ================================================================
   加载态
   ================================================================ */
.hv-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.hv-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2.5px solid rgba(255, 255, 255, 0.18);
  border-top-color: rgba(255, 255, 255, 0.75);
  animation: hv-spin 0.75s linear infinite;
}

@keyframes hv-spin {
  to { transform: rotate(360deg); }
}

/* ================================================================
   失败态
   ================================================================ */
.hv-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.hv-fallback-text {
  color: #8b8c91;
  font-size: 13.5px;
}

/* ================================================================
   底部缩略图条
   ================================================================ */
.hv-thumbs {
  position: absolute;
  z-index: 4;
  left: 0;
  right: 0;
}

.hv-thumbs-scroll {
  width: 100%;
  white-space: nowrap;
}

.hv-thumbs-inner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
}

.hv-thumb {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 7px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  border: 1.5px solid transparent;
  box-sizing: border-box;
  transition:
    border-color 160ms ease,
    transform 160ms ease,
    opacity 160ms ease;
  opacity: 0.5;
}

.hv-thumb.is-active {
  border-color: #ffffff;
  opacity: 1;
  transform: scale(1.06);
}

.hv-thumb-img {
  display: block;
  width: 100%;
  height: 100%;
}

/* ================================================================
   单图提示
   ================================================================ */
.hv-hint {
  position: absolute;
  z-index: 4;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.42);
  font-size: 12px;
  line-height: 1.5;
  pointer-events: none;
  white-space: nowrap;
}

/* ================================================================
   桌面端适配
   ================================================================ */
@media (min-width: 800px) {
  .hv-toolbar {
    left: 26px;
    right: 26px;
  }

  .hv-close,
  .hv-toolbar-spacer {
    width: 42px;
    height: 42px;
    flex-basis: 42px;
  }

  .hv-slide {
    padding: 104px 5vw 156px;
  }

  .hv-image {
    max-width: 1200px;
  }

  .hv-thumb {
    width: 48px;
    height: 48px;
  }
}

/* ================================================================
   无障碍 / 减少动效
   ================================================================ */
@media (prefers-reduced-motion: reduce) {
  .hv-viewer,
  .hv-thumb,
  .hv-spinner {
    animation-duration: 1ms;
    transition-duration: 1ms;
  }
}
</style>