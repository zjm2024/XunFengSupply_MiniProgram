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
  background: var(--glass-card-background, rgba(255, 255, 255, 0.74));
  border-radius: var(--radius-base, 14px);
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55, 65, 80, 0.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}

.padding-none { padding: 0; }
.padding-sm { padding: 12px; }
.padding-md { padding: 16px; }
.padding-lg { padding: 20px; }

.interactive:active {
  background: var(--surface-subtle, #FCFCFD);
}
</style>
