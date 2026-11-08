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
  background: var(--surface-card, #FFF);
  border-radius: var(--radius-card, 16px);
  box-shadow: var(--shadow-sm);
}

.padding-none { padding: 0; }
.padding-sm { padding: var(--spacing-md, 12px); }
.padding-md { padding: var(--module-padding, 16px); }
.padding-lg { padding: var(--spacing-lg, 24px); }

.interactive:active {
  background: var(--surface-subtle, #FCFCFD);
}

</style>
