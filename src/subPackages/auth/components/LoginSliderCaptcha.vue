<template>
  <view class="slider-captcha">
    <view class="puzzle-stage">
      <image v-if="hasChallenge && !imageLoadFailed" :key="challenge.captchaId + '-background'" class="puzzle-background" :data-captcha-id="challenge.captchaId" @load="handleImageLoad('background', $event)" :src="challenge.backgroundImageBase64" mode="scaleToFill" @error="handleImageError" />
      <image
        v-if="hasChallenge && !imageLoadFailed"
        :key="challenge.captchaId + '-piece'"
        class="puzzle-piece"
        :data-captcha-id="challenge.captchaId"
        @load="handleImageLoad('piece', $event)"
        :src="challenge.pieceImageBase64"
        mode="scaleToFill"
        :style="pieceStyle"
      />
      <view v-if="loading || !imagesReady" class="stage-placeholder">
        <text>{{ stageMessage }}</text>
      </view>
      <view class="refresh-button" :class="{ 'refresh-disabled': loading || verifying }" role="button" :aria-label="t('auth.login.captchaRefresh')" @click.stop="requestRefresh">
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
        <AppIcon :name="verified ? 'check' : 'arrow-right'" :size="24" color="#FFFFFF" />
      </view>
    </view>

    <text v-if="errorText" class="captcha-error">{{ errorText }}</text>
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue'
import AppIcon from '../../../shared/ui/AppIcon/AppIcon.vue'
import { t } from '@/shared/i18n/index.js'
import '../i18n/register.js'

const props = defineProps({
  challenge: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  verifying: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  errorText: { type: String, default: '' },
})

const emit = defineEmits(['refresh', 'verify', 'imageError'])
const componentProxy = getCurrentInstance()?.proxy
const dragging = ref(false)
const submitted = ref(false)
const imageLoadFailed = ref(false)
const backgroundLoaded = ref(false)
const pieceLoaded = ref(false)
const dragX = ref(0)
const trackWidth = ref(0)
const thumbWidth = ref(48)
let startClientX = 0
let startDragX = 0

const maxDragX = computed(() => Math.max(trackWidth.value - thumbWidth.value, 0))
const hasChallenge = computed(() => Boolean(
  props.challenge?.captchaId
    && props.challenge?.backgroundImageBase64
    && props.challenge?.pieceImageBase64
    && Number.isFinite(props.challenge?.imageWidth)
    && Number.isFinite(props.challenge?.imageHeight)
    && Number.isFinite(props.challenge?.pieceSize)
    && Number.isFinite(props.challenge?.pieceY),
))
const imagesReady = computed(() => hasChallenge.value && backgroundLoaded.value && pieceLoaded.value && !imageLoadFailed.value)
const isDisabled = computed(() => (
  props.loading || props.verifying || props.verified || !imagesReady.value
))

const stageMessage = computed(() => {
  if (props.loading) return t('auth.login.captchaGenerating')
  if (imageLoadFailed.value) return t('auth.login.captchaImageError')
  if (hasChallenge.value) return t('auth.login.captchaImageLoading')
  return t('auth.login.captchaLoadError')
})

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
  if (props.verified) return t('auth.login.captchaPassed')
  if (props.verifying) return t('auth.login.captchaVerifying')
  return dragging.value ? t('auth.login.captchaRelease') : t('auth.login.captchaDrag')
})

watch(
  () => props.challenge?.captchaId,
  async () => {
    imageLoadFailed.value = false
    backgroundLoaded.value = false
    pieceLoaded.value = false
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

/** 记录验证码图片加载失败并让父页面提供刷新入口。 */
function handleImageError(event) {
  if (!matchesActiveChallenge(event) || imageLoadFailed.value) return
  imageLoadFailed.value = true
  emit('imageError')
}
/** 图片事件只更新当前挑战，忽略已替换图片的迟到回调。 */
function matchesActiveChallenge(event) {
  const id = event?.currentTarget?.dataset?.captchaId ?? event?.target?.dataset?.captchaId
  return hasChallenge.value && (!id || id === props.challenge.captchaId)
}

/** 背景与拼图都完成加载后才允许拖动，失败时不能被随后到达的load事件恢复。 */
function handleImageLoad(kind, event) {
  if (!matchesActiveChallenge(event) || imageLoadFailed.value) return
  if (kind === 'background') backgroundLoaded.value = true
  if (kind === 'piece') pieceLoaded.value = true
}

/** 仅在不生成、不校验时请求换图。 */
function requestRefresh() {
  if (props.loading || props.verifying) return
  emit('refresh')
}

/** 测量当前设备轨道和滑块尺寸，保持图片坐标换算一致。 */
function measureTrack() {
  const query = uni.createSelectorQuery().in(componentProxy)
  query.select('.slider-track').boundingClientRect()
  query.select('.slider-thumb').boundingClientRect()
  query.exec((rects) => {
    if (rects?.[0]?.width) trackWidth.value = rects[0].width
    if (rects?.[1]?.width) thumbWidth.value = rects[1].width
  })
}

/** 读取触摸或鼠标横坐标。 */
function getClientX(event) {
  return event?.touches?.[0]?.clientX
    ?? event?.changedTouches?.[0]?.clientX
    ?? event?.clientX
    ?? 0
}

/** 仅对已完整加载的当前挑战启动拖动。 */
function startDrag(event) {
  if (isDisabled.value || submitted.value) return
  if (!trackWidth.value) measureTrack()
  dragging.value = true
  startClientX = getClientX(event)
  startDragX = dragX.value
}

/** 限制滑块位移在轨道范围内。 */
function moveDrag(event) {
  if (!dragging.value || isDisabled.value) return
  const distance = getClientX(event) - startClientX
  dragX.value = Math.min(Math.max(startDragX + distance, 0), maxDragX.value)
}

/** 松手提交原图坐标，禁用或图片失败时取消提交。 */
function finishDrag(event) {
  if (!dragging.value) return
  if (isDisabled.value) { cancelDrag(); return }
  moveDrag(event)
  dragging.value = false

  if (dragX.value < 4 || submitted.value) {
    dragX.value = 0
    return
  }

  submitted.value = true
  emit('verify', sourcePieceX.value)
}

/** 取消本次拖动并回到起点。 */
function cancelDrag() {
  dragging.value = false
  submitted.value = false
  dragX.value = 0
}

/** 重置位置和提交状态，保留当前图片加载事实。 */
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
  z-index: 3;
  background: $color-gray-100;
  padding: $space-4;
  box-sizing: border-box;
  text-align: center;
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
  z-index: 4;
  width: $touch-target-min;
  height: $touch-target-min;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 18, 22, 0.5);
  border-radius: $radius-full;
}

.refresh-button.refresh-disabled { opacity: .5; }

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
