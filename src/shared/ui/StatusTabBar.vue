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
    <view class="status-tab-track">
      <view
        v-for="item in items"
        :key="String(getItemValue(item))"
        class="status-tab-item"
        :class="{ active: isActive(getItemValue(item)) }"
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

const activeIndex = computed(() => Math.max(0, props.items.findIndex(item => getItemValue(item) === props.modelValue)))
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

/* 淘宝式顶部状态导航：保留页面底色，每个状态独立成胶囊按钮。 */
.status-tab-track {
  position: relative;
  display: flex;
  min-width: max-content;
  margin: 0 auto;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  box-sizing: border-box;
  background: transparent;
}

.status-tab-item {
  position: relative;
  z-index: 1;
  display: inline-flex;
  height: 29px;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0 13px;
  border-radius: 7px;
  color: #737983;
  background: rgba(255, 255, 255, .86);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  transition: color .16s ease, background .16s ease, border-color .16s ease, transform .16s ease;
}

.status-tab-item.active { color: #FFF; background: var(--color-brand, #D7192D); font-weight: 750; }
.status-tab-item:active { transform: scale(.96); }

@media screen and (max-width: 380px) {
  .status-tab-track { gap: 6px; }
  .status-tab-item { padding-right: 10px; padding-left: 10px; font-size: 11px; }
}
</style>
