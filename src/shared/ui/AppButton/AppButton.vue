<template>
  <button
    class="app-button"
    :class="[`variant-${variant}`, `size-${size}`, { block, loading }]"
    :disabled="disabled || loading"
    @tap="$emit('tap', $event)"
  >
    <view v-if="loading" class="loading-dot" aria-hidden="true" />
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: value => ['primary', 'secondary', 'ghost', 'danger'].includes(value),
  },
  size: {
    type: String,
    default: 'md',
    validator: value => ['sm', 'md'].includes(value),
  },
  block: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

defineEmits(['tap'])
</script>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: var(--radius-control, 10px);
  font-size: 15px;
  font-weight: var(--font-weight-semibold, 600);
  transition: opacity var(--transition-fast, 120ms) ease;
}

.app-button::after { display: none; }
.app-button.size-sm { height: var(--control-height-compact, 40px); font-size: 14px; }
.app-button.size-md { height: var(--control-height, 48px); }
.app-button.block { width: 100%; }
.app-button:active:not([disabled]) { opacity: 0.82; }
.app-button[disabled] { opacity: 0.45; }
.variant-primary { color: #FFFFFF; background: var(--primary-color, #D7192D); }
.variant-secondary { color: var(--text-primary, #1B1C20); background: #FFFFFF; border-color: var(--border-color, #D9DCE2); }
.variant-ghost { color: var(--primary-color, #D7192D); background: transparent; }
.variant-danger { color: #FFFFFF; background: var(--danger-color, #B42318); }

.loading-dot {
  width: 6px;
  height: 6px;
  margin-right: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 0.8s ease-in-out infinite alternate;
}

@keyframes pulse { to { opacity: 0.25; } }
</style>
