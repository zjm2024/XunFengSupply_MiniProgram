<!--
  旧页面兼容桥：优先使用 uni-ui 官方完整图标字体，少数官方没有的图标转到 AppIcon。
  新页面请直接使用 AppIcon，避免继续扩展这个兼容层。
-->
<template>
  <AppIcon
    v-if="fallbackName"
    :name="fallbackName"
    :size="size"
    :color="color"
    @click="emit('click', $event)"
  />
  <UniIconsOfficial
    v-else
    :type="type"
    :size="size"
    :color="color"
    @click="emit('click', $event)"
  />
</template>

<script setup>
import { computed } from 'vue'
import UniIconsOfficial from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  type: { type: String, default: '' },
  size: { type: [Number, String], default: 16 },
  color: { type: String, default: '#333333' },
})

const emit = defineEmits(['click'])
const fallbackMap = Object.freeze({
  box: 'package',
  car: 'truck',
  clock: 'clock',
  warning: 'triangle-alert',
})
const fallbackName = computed(() => fallbackMap[props.type] || '')
</script>
