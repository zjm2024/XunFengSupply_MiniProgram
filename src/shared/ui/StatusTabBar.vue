<template>
  <scroll-view
    class="status-tab-bar"
    scroll-x
    :show-scrollbar="false"
    scroll-with-animation
    :style="{ maxWidth: `${maxWidth}px` }"
    @touchstart.stop="handleTouchStart"
    @touchend.stop="handleTouchEnd"
  >
    <view class="status-tab-track" :style="trackStyle">
      <view class="status-tab-indicator" :style="indicatorStyle" />
      <view
        v-for="item in items"
        :key="String(getItemValue(item))"
        class="status-tab-item"
        :class="{ active: isActive(getItemValue(item)) }"
        :style="itemStyle"
        @tap="select(getItemValue(item))"
      >
        <text>{{ item.label }}</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  modelValue: { type: null, default: null },
  maxWidth: { type: Number, default: 700 },
  itemWidth: { type: Number, default: 88 },
  swipeable: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'change'])
const touchStart = ref({ x: 0, y: 0 })
const gap = 2

const activeIndex = computed(() => Math.max(0, props.items.findIndex(item => getItemValue(item) === props.modelValue)))
const trackStyle = computed(() => ({
  width: `${props.items.length * props.itemWidth + Math.max(props.items.length - 1, 0) * gap + 8}px`,
}))
const itemStyle = computed(() => ({
  width: `${props.itemWidth}px`,
  flexBasis: `${props.itemWidth}px`,
}))
const indicatorStyle = computed(() => ({
  width: `${props.itemWidth}px`,
  transform: `translateX(${4 + activeIndex.value * (props.itemWidth + gap)}px)`,
}))

function isActive(value) {
  return value === props.modelValue
}

function getItemValue(item) {
  return Object.prototype.hasOwnProperty.call(item, 'value') ? item.value : item.key
}

function select(value) {
  if (value === props.modelValue) return
  emit('update:modelValue', value)
  emit('change', value)
}

function handleTouchStart(event) {
  if (!props.swipeable) return
  const touch = event?.touches?.[0] || event?.changedTouches?.[0] || event?.detail?.touches?.[0]
  const point = getPoint(touch)
  if (point) touchStart.value = point
}

function handleTouchEnd(event) {
  if (!props.swipeable) return
  const touch = event?.changedTouches?.[0] || event?.touches?.[0] || event?.detail?.changedTouches?.[0]
  const point = getPoint(touch)
  if (!point) return
  const deltaX = point.x - touchStart.value.x
  const deltaY = point.y - touchStart.value.y
  if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return
  const nextIndex = activeIndex.value + (deltaX < 0 ? 1 : -1)
  if (nextIndex >= 0 && nextIndex < props.items.length) select(getItemValue(props.items[nextIndex]))
}

function getPoint(touch) {
  if (!touch) return null
  const x = Number(touch.clientX ?? touch.pageX ?? touch.x)
  const y = Number(touch.clientY ?? touch.pageY ?? touch.y)
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
}
</script>

<style lang="scss" scoped>
.status-tab-bar { display: block; width: 100%; margin: 0 auto; white-space: nowrap; }
.status-tab-track { position: relative; display: flex; min-width: max-content; margin: 0 auto; align-items: center; gap: 2px; padding: 4px; border: 1px solid #D9DDE2; border-radius: 999px; box-sizing: border-box; background: #E2E5E9; }
.status-tab-indicator { position: absolute; z-index: 0; top: 4px; left: 0; height: 36px; border-radius: 999px; background: #FFF; box-shadow: 0 3px 10px rgba(35, 40, 47, .18); transition: transform .24s cubic-bezier(.2,.8,.2,1); pointer-events: none; }
.status-tab-item { position: relative; z-index: 1; display: inline-flex; height: 36px; align-items: center; justify-content: center; padding: 0; border-radius: 999px; color: #5F6670; background: transparent; font-size: 12px; white-space: nowrap; transition: color .16s ease; }
.status-tab-item.active { color: #171A1F; font-weight: 750; }
@media screen and (max-width: 380px) { .status-tab-item { font-size: 11px; } }
</style>
