<!--
  项目统一线性图标组件。
  使用内联 SVG，避免 emoji、字体缺字和不同平台字形不一致；新增图标只需补充 pathMap。
-->
<template>
  <svg
    class="app-icon"
    :style="iconStyle"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="path in iconPaths" :key="path" :d="path" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
  color: { type: String, default: 'currentColor' },
  strokeWidth: { type: [Number, String], default: 2 },
})

// 图标保持 24×24、圆角描边风格，保证整套 APP 的视觉一致性。
const pathMap = Object.freeze({
  user: [
    'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2',
  ],
  lock: [
    'M7 11V7a5 5 0 0 1 10 0v4',
    'M5 11h14v10H5z',
    'M12 15v2',
  ],
  eye: [
    'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z',
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  ],
  'eye-off': [
    'm3 3 18 18',
    'M10.6 5.2A11.7 11.7 0 0 1 12 5c6.5 0 10 7 10 7a14.5 14.5 0 0 1-2.1 3.1',
    'M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10.7 10.7 0 0 0 3.8-.7',
    'M9.9 9.9a3 3 0 0 0 4.2 4.2',
  ],
  shield: [
    'M12 22c4.5-1.5 8-4 8-9V5l-8-3-8 3v8c0 5 3.5 7.5 8 9Z',
  ],
  'shield-check': [
    'M12 22c4.5-1.5 8-4 8-9V5l-8-3-8 3v8c0 5 3.5 7.5 8 9Z',
    'm9 12 2 2 4-4',
  ],
  'alert-circle': [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
    'M12 8v4',
    'M12 16h.01',
  ],
  close: ['M18 6 6 18', 'm6 6 12 12'],
  refresh: [
    'M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5',
    'M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5',
  ],
  check: ['m5 12 4 4L19 6'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'arrow-right': ['M5 12h14', 'm13 6 6 6-6 6'],
  package: [
    'M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z',
    'm3.3 7 8.7 5 8.7-5',
    'M12 22V12',
  ],
  truck: [
    'M10 17h4V5H2v12h3',
    'M14 8h4l4 4v5h-3',
    'M7 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    'M17 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  ],
  clock: [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
    'M12 6v6l4 2',
  ],
  'triangle-alert': [
    'M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z',
    'M12 9v4',
    'M12 17h.01',
  ],
  help: [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
    'M9.1 9a3 3 0 1 1 4.8 2.4c-1.2.8-1.9 1.3-1.9 2.6',
    'M12 18h.01',
  ],
})

const iconPaths = computed(() => pathMap[props.name] || pathMap.help)
const normalizedSize = computed(() => {
  if (typeof props.size === 'number' || /^\d+(\.\d+)?$/.test(String(props.size))) {
    return `${props.size}px`
  }
  return String(props.size)
})
const iconStyle = computed(() => ({
  width: normalizedSize.value,
  height: normalizedSize.value,
  color: props.color,
}))
</script>

<style scoped>
.app-icon {
  display: block;
  flex: none;
  box-sizing: border-box;
}
</style>
