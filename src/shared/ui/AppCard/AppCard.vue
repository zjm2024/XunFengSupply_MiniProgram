<template>
  <view class="app-card" :class="[`padding-${padding}`, { interactive }]" @tap="handleTap">
    <slot />
  </view>
</template>

<script setup>
const props = defineProps({
  padding: {
    type: String,
    default: 'md',
    validator: value => ['none', 'sm', 'md', 'lg'].includes(value),
  },
  interactive: { type: Boolean, default: false },
})

const emit = defineEmits(['tap'])

function handleTap(event) {
  if (props.interactive) emit('tap', event)
}
</script>

<style scoped>
.app-card {
  width: 100%;
  overflow: hidden;
  color: var(--text-primary, #1B1C20);
  background: var(--surface-card, #FFFFFF);
  border: 1px solid var(--divider-color, #ECEEF2);
  border-radius: var(--radius-base, 14px);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(17, 18, 22, 0.03));
}

.padding-none { padding: 0; }
.padding-sm { padding: 12px; }
.padding-md { padding: 16px; }
.padding-lg { padding: 20px; }

.interactive:active {
  background: var(--surface-subtle, #FCFCFD);
}
</style>
