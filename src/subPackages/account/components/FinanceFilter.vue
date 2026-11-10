<template>
  <button class="finance-filter-trigger" :aria-label="items[currentIndex]?.label" @tap="$emit('open')">
    <view class="finance-filter">
      <text>{{ items[currentIndex]?.label }}</text>
      <AppIcon name="chevron-down" :size="14" />
    </view>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'

const props = defineProps({
  items: { type: Array, required: true },
  modelValue: { type: [Number, String], default: '' },
})
const emit = defineEmits(['open'])
const currentIndex = computed(() => Math.max(0, props.items.findIndex(item => item.value === props.modelValue)))

/** 保留现有业务筛选值，包括数字零。 */
function select(event) {
  const item = props.items[Number(event.detail.value)]
  if (item) emit('change', item.value)
}
</script>

<style scoped>
.finance-filter-trigger { margin: 0; padding: 0; background: transparent; text-align: left; line-height: 1.4; }
.finance-filter-trigger::after { border: 0; }
.finance-filter {
  display: flex;
  align-items: center;
  gap: 7px;
  box-sizing: border-box;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: var(--radius-control, 10px);
  background: var(--glass-card-background, #fff);
  color: var(--type-body-color, #1b1c20);
  font-size: var(--type-body-size, 14px);
  line-height: 1.4;
  overflow-wrap: anywhere;
}
</style>
