<template>
  <view v-if="anchor && actions.length" class="action-menu-overlay" @tap="emit('close')">
    <view class="action-menu-panel" :style="positionStyle" role="menu" :aria-label="title" @tap.stop>
      <scroll-view scroll-y :style="{ height: (menuHeight - 8) + 'px' }">
        <button v-for="action in actions" :key="action.key" class="overflow-action" role="menuitem" :disabled="action.disabled || action.type === 'disabled'" @tap="choose(action)">{{ action.label }}</button>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useResponsive } from '../composables/useResponsive.js'

const props = defineProps({ actions: { type: Array, default: () => [] }, anchor: { type: Object, default: null }, title: { type: String, required: true } })
const emit = defineEmits(['select', 'close'])
const { layout, safeArea } = useResponsive()
const menuHeight = computed(() => Math.min(props.actions.length * 52 + 8, 320, Math.max(96, (layout.value.windowHeight || 667) - 100)))
/** 在触发按钮附近选择上下方向，并限制菜单在当前视口安全区域内。 */
const positionStyle = computed(() => {
  const viewportWidth = layout.value.windowWidth || 375, viewportHeight = layout.value.windowHeight || 667
  const width = Math.min(280, viewportWidth - 32), anchor = props.anchor || { left: 16, top: 16, bottom: 60 }
  const bottom = viewportHeight - Math.max(16, safeArea.value?.bottom || 0)
  const top = anchor.bottom + 8 + menuHeight.value <= bottom ? anchor.bottom + 8 : anchor.top - menuHeight.value - 8
  return { width: width + 'px', left: Math.max(16, Math.min(anchor.left, viewportWidth - width - 16)) + 'px', top: Math.max(16, Math.min(top, bottom - menuHeight.value)) + 'px' }
})
/** 点击后立即收起菜单，只提交一次仍可用的动作键。 */
function choose(action) {
  if (action.disabled || action.type === 'disabled') return
  emit('select', action.key)
  emit('close')
}
</script>

<style scoped>
.action-menu-overlay { position: fixed; inset: 0; z-index: 220; pointer-events: auto; background: rgba(17,18,22,.08); }
.action-menu-panel { position: absolute; padding: 4px 8px; border: 1px solid #e8eaee; border-radius: 14px; background: #fff; box-shadow: 0 10px 32px rgba(25,31,40,.18); box-sizing: border-box; }
.overflow-action { display: flex; width: 100%; min-height: 52px; align-items: center; margin: 0; padding: 12px 10px; border: 0; border-bottom: 1px solid #f0f1f4; border-radius: 0; background: #fff; color: #363c45; font-size: 14px; line-height: 21px; white-space: normal; text-align: left; overflow-wrap: anywhere; }
.overflow-action:last-child { border-bottom: 0; }
.overflow-action:disabled { color: #a0a6ae; }
button::after { border: 0; }
</style>
