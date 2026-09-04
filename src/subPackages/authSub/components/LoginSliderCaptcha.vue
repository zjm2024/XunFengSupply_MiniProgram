<template>
  <view class="slider-captcha">
    <view class="puzzle-stage">
      <image v-if="hasChallenge" class="puzzle-background" :src="challenge.backgroundImageBase64" mode="scaleToFill" />
      <image
        v-if="hasChallenge"
        class="puzzle-piece"
        :src="challenge.pieceImageBase64"
        mode="scaleToFill"
        :style="pieceStyle"
      />
      <view v-if="loading || !hasChallenge" class="stage-placeholder">
        <text>{{ loading ? '正在生成验证码…' : '验证码加载失败' }}</text>
      </view>
      <view class="refresh-button" @click.stop="emit('refresh')">
        <AppIcon name="refresh" :size="18" color="#FFFFFF" />
      </view>
    </view>

    <view
      class="slider-track"
      :class="{ dragging, verifying, verified, disabled: isDisabled }"
      @touchstart.stop.prevent="startDrag"
      @touchmove.stop.prevent="moveDrag"
      @touchend.stop.prevent="finishDrag"
      @touchcancel.stop.prevent="cancelDrag"
      @mousedown.stop.prevent="startDrag"
      @mousemove.stop.prevent="moveDrag"
      @mouseup.stop.prevent="finishDrag"
      @mouseleave="finishDrag"
    >
      <view class="slider-progress" :style="progressStyle"></view>
      <text class="slider-label">{{ sliderLabel }}</text>
      <view class="slider-thumb" :style="thumbStyle">
        <AppIcon :name="verified ? 'check' : 'arrow-right'" :size="22" color="#FFFFFF" />
      </view>
    </view>

    <text v-if="errorText" class="captcha-error">{{ errorText }}</text>
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  challenge: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  verifying: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  errorText: { type: String, default: '' },
})

const emit = defineEmits(['refresh', 'verify'])
const componentProxy = getCurrentInstance()?.proxy
const dragging = ref(false)
const submitted = ref(false)
const dragX = ref(0)
const trackWidth = ref(0)
const thumbWidth = ref(48)
let startClientX = 0
let startDragX = 0

const maxDragX = computed(() => Math.max(trackWidth.value - thumbWidth.value, 0))
const hasChallenge = computed(() => Boolean(
  props.challenge?.captchaId
    && props.challenge?.backgroundImageBase64
    && props.challenge?.pieceImageBase64,
))
const isDisabled = computed(() => (
  props.loading || props.verifying || props.verified || !hasChallenge.value
))

const sourcePieceX = computed(() => {
  if (!props.challenge || maxDragX.value <= 0) return 0
  const sourceMax = props.challenge.imageWidth - props.challenge.pieceSize
  return Math.round((dragX.value / maxDragX.value) * sourceMax)
})

const pieceStyle = computed(() => {
  if (!props.challenge) return {}
  return {
    left: `${(sourcePieceX.value / props.challenge.imageWidth) * 100}%`,
    top: `${(props.challenge.pieceY / props.challenge.imageHeight) * 100}%`,
    width: `${(props.challenge.pieceSize / props.challenge.imageWidth) * 100}%`,
    height: `${(props.challenge.pieceSize / props.challenge.imageHeight) * 100}%`,
  }
})

// 成功后不能继续停留在用户松手的位置：滑块归位到最右侧、进度完整铺满。
const visualDragX = computed(() => (props.verified ? maxDragX.value : dragX.value))
const thumbStyle = computed(() => ({ transform: `translateX(${visualDragX.value}px)` }))
const progressStyle = computed(() => ({
  width: props.verified ? '100%' : `${dragX.value + thumbWidth.value / 2}px`,
}))
const sliderLabel = computed(() => {
  if (props.verified) return '验证通过'
  if (props.verifying) return '正在验证…'
  return dragging.value ? '移到缺口后松开' : '按住滑块向右拖动'
})

watch(
  () => props.challenge?.captchaId,
  async () => {
    resetSlider()
    await nextTick()
    measureTrack()
  },
  { immediate: true },
)

watch(
  () => props.verifying,
  (value, previousValue) => {
    if (previousValue && !value && !props.verified) resetSlider()
  },
)

function measureTrack() {
  const query = uni.createSelectorQuery().in(componentProxy)
  query.select('.slider-track').boundingClientRect()
  query.select('.slider-thumb').boundingClientRect()
  query.exec((rects) => {
    if (rects?.[0]?.width) trackWidth.value = rects[0].width
    if (rects?.[1]?.width) thumbWidth.value = rects[1].width
  })
}

function getClientX(event) {
  return event?.touches?.[0]?.clientX
    ?? event?.changedTouches?.[0]?.clientX
    ?? event?.clientX
    ?? 0
}

function startDrag(event) {
  if (isDisabled.value || submitted.value) return
  if (!trackWidth.value) measureTrack()
  dragging.value = true
  startClientX = getClientX(event)
  startDragX = dragX.value
}

function moveDrag(event) {
  if (!dragging.value || isDisabled.value) return
  const distance = getClientX(event) - startClientX
  dragX.value = Math.min(Math.max(startDragX + distance, 0), maxDragX.value)
}

function finishDrag(event) {
  if (!dragging.value) return
  moveDrag(event)
  dragging.value = false

  if (dragX.value < 4 || submitted.value) {
    dragX.value = 0
    return
  }

  submitted.value = true
  emit('verify', sourcePieceX.value)
}

function cancelDrag() {
  dragging.value = false
  submitted.value = false
  dragX.value = 0
}

function resetSlider() {
  dragging.value = false
  submitted.value = false
  dragX.value = 0
}
</script>

<style lang="scss" scoped>
.slider-captcha { width: 100%; }

.puzzle-stage {
  position: relative;
  width: 100%;
  height: 0;
  padding-top: 50%;
  overflow: hidden;
  background: $color-gray-100;
  border: 2rpx solid $color-border-default;
  border-radius: $radius-control;
}

.puzzle-background,
.stage-placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.puzzle-piece {
  position: absolute;
  z-index: 2;
  filter: drop-shadow(0 4rpx 8rpx rgba(17, 18, 22, 0.28));
  will-change: left;
}

.stage-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-text-secondary;
  font-size: $font-size-caption;
}

.refresh-button {
  position: absolute;
  top: $space-2;
  right: $space-2;
  z-index: 3;
  width: $touch-target-min;
  height: $touch-target-min;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 18, 22, 0.5);
  border-radius: $radius-full;
}

.slider-track {
  position: relative;
  height: $control-height;
  margin-top: $space-3;
  overflow: hidden;
  background: $color-gray-100;
  border: 2rpx solid $color-border-default;
  border-radius: $radius-control;
  box-sizing: border-box;
  touch-action: none;
  user-select: none;
}

.slider-progress {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: $color-brand-50;
  border-right: 2rpx solid $color-brand-300;
}

.slider-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  pointer-events: none;
  color: $color-text-secondary;
  font-size: $font-size-caption;
}

.slider-thumb {
  position: absolute;
  top: -2rpx;
  left: -2rpx;
  z-index: 2;
  width: $control-height;
  height: $control-height;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $color-action-primary;
  border-radius: $radius-control;
  box-shadow: 0 4rpx 12rpx rgba(151, 14, 29, 0.2);
  will-change: transform;
}

.slider-track.dragging .slider-thumb { background: $color-action-primary-pressed; }
.slider-track.verifying { opacity: 0.72; }

.slider-track.verified {
  background: $color-success;
  border-color: $color-success;

  .slider-progress {
    background: $color-success;
    border-right: 0;
    transition: width 280ms $easing-standard;
  }

  .slider-thumb {
    background: #117344;
    border-color: #117344;
    box-shadow: none;
    transition: transform 280ms $easing-standard;
  }

  .slider-label {
    color: $color-gray-0;
    font-weight: $font-weight-semibold;
  }
}

.slider-track.disabled:not(.verified) { opacity: 0.65; }

.captcha-error {
  display: block;
  margin-top: $space-2;
  font-size: $font-size-caption;
  line-height: $line-height-caption;
}

.captcha-error { color: $color-error; }
</style>
