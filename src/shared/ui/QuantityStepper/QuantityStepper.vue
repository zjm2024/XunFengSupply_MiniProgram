<template>
  <view class="quantity-stepper" :class="[`size-${size}`, { 'is-disabled': disabled }]">
    <button class="stepper-button" :disabled="minusDisabled" aria-label="减少数量" @tap="decrease">
      <text class="stepper-symbol">−</text>
    </button>
    <input
      v-if="allowInput"
      class="stepper-value"
      type="number"
      :value="modelValue"
      :disabled="disabled"
      @input="handleInput"
      @blur="handleBlur"
    />
    <text v-else class="stepper-value">{{ modelValue }}</text>
    <button class="stepper-button" :disabled="plusDisabled" aria-label="增加数量" @tap="increase">
      <text class="stepper-symbol">＋</text>
    </button>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 9999 },
  step: { type: Number, default: 1 },
  disabled: { type: Boolean, default: false },
  allowInput: { type: Boolean, default: false },
  allowZero: { type: Boolean, default: false },
  size: { type: String, default: 'md', validator: value => ['sm', 'md', 'lg'].includes(value) },
})

const emit = defineEmits(['update:modelValue', 'change', 'minus', 'plus'])
const minusDisabled = computed(() => props.disabled || (props.allowZero ? props.modelValue <= 0 : props.modelValue <= props.min))
const plusDisabled = computed(() => props.disabled || props.modelValue >= props.max)

/** 将任意输入限制为当前数量控件允许的整数。 */
function normalize(value) {
  const parsed = Math.floor(Number(value)) || 0
  if (props.allowZero && parsed <= 0) return 0
  return Math.max(props.min, Math.min(props.max, parsed))
}

/** 减少一个步长，并同时发出双向绑定与业务事件。 */
function decrease() {
  if (minusDisabled.value) return
  const next = props.allowZero && props.modelValue <= props.min
    ? 0
    : Math.max(props.min, props.modelValue - props.step)
  emit('update:modelValue', next)
  emit('change', next)
  emit('minus', next)
}

/** 增加一个步长，并同时发出双向绑定与业务事件。 */
function increase() {
  if (plusDisabled.value) return
  const next = props.allowZero && props.modelValue <= 0
    ? Math.min(props.max, props.min)
    : Math.min(props.max, props.modelValue + props.step)
  emit('update:modelValue', next)
  emit('change', next)
  emit('plus', next)
}

/** 输入过程中只更新受控值，失焦时再发出最终 change 事件。 */
function handleInput(event) {
  emit('update:modelValue', normalize(event.detail.value))
}

/** 直接输入结束后提交规范化整数。 */
function handleBlur(event) {
  const next = normalize(event.detail.value)
  emit('update:modelValue', next)
  emit('change', next)
}
</script>

<style lang="scss" scoped>
.quantity-stepper {
  display: flex;
  align-items: center;

  &.is-disabled { opacity: .45; }
  &.size-sm {
    .stepper-button { width: 32px; height: 32px; border-radius: 8px; }
    .stepper-symbol { font-size: 16px; }
    .stepper-value { width: 40px; height: 32px; font-size: 13px; }
  }
  &.size-md {
    .stepper-button { width: 40px; height: 40px; border-radius: var(--radius-control, 10px); }
    .stepper-symbol { font-size: 20px; }
    .stepper-value { width: 48px; height: 40px; font-size: 14px; }
  }
  &.size-lg {
    .stepper-button { width: 44px; height: 44px; border-radius: var(--radius-control, 10px); }
    .stepper-symbol { font-size: 22px; }
    .stepper-value { width: 56px; height: 44px; font-size: 16px; }
  }
}

.stepper-button {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--text-primary, #1b1c20);
  background: var(--surface-page, #f4f5f8);

  &::after { border: 0; }
  &:active:not(:disabled) { background: var(--bg-pressed, #eceef2); }
  &:disabled {
    color: var(--text-placeholder, #969aa3);
    opacity: .35;
    pointer-events: none;
  }
}

.stepper-symbol { color: inherit; line-height: 1; }
.stepper-value {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 0;
  border-right: 1px solid var(--border-color, #d9dce2);
  border-left: 1px solid var(--border-color, #d9dce2);
  color: var(--text-primary, #1b1c20);
  background: transparent;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  text-align: center;
}
</style>
