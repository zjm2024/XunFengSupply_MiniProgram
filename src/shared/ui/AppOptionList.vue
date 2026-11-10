<template>
  <view class="app-options">
    <button
      v-for="option in options"
      :key="option.value"
      class="app-option"
      :class="{ 'is-selected': modelValue === option.value }"
      :aria-pressed="modelValue === option.value"
      :disabled="disabled || option.disabled"
      @tap="$emit('update:modelValue', option.value)"
    >
      <view class="app-option-copy">
        <view class="app-option-heading">
          <text class="app-option-label">{{ option.label }}</text>
          <text v-if="option.meta" class="app-option-secondary">{{ option.meta }}</text>
        </view>
        <text v-if="option.description" class="app-option-detail">{{ option.description }}</text>
      </view>
      <view class="app-option-indicator" aria-hidden="true" />
    </button>
  </view>
</template>

<script setup>
defineProps({
  options: { type: Array, required: true },
  modelValue: { type: [String, Number], default: null },
  disabled: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.app-options { display: grid; gap: 8px; }
.app-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  margin: 0;
  padding: 12px;
  box-sizing: border-box;
  border: 1px solid #e2e5ea;
  border-radius: var(--radius-control, 10px);
  background: var(--modal-surface, #fff);
  color: var(--text-primary, #1b1c20);
  line-height: 1.5;
  text-align: left;
  white-space: normal;
}
.app-option::after { border: 0; }
.app-option.is-selected { border-color: var(--color-primary, #d7192d); background: #f4f5f8; }
.app-option-copy { flex: 1; min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
.app-option-heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; }
.app-option-label { font-size: var(--type-body-size, 14px); font-weight: var(--font-weight-semibold, 600); }
.app-option-secondary, .app-option-detail {
  color: var(--type-secondary-color, #62666f);
  font-size: var(--type-body-small-size, 13px);
}
.app-option-detail { display: block; margin-top: 4px; }
.app-option-indicator {
  flex: none;
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border: 1px solid #c9cdd4;
  border-radius: 50%;
}
.is-selected .app-option-indicator {
  border: 5px solid var(--color-primary, #d7192d);
  background: #fff;
}
</style>
