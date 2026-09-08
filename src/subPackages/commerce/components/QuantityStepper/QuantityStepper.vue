<template>
  <view class="quantity-stepper" :class="[`size-${size}`, { 'is-disabled': disabled }]">
    <!-- 减少按钮 -->
    <button 
      class="stepper-btn btn-minus" 
      :disabled="isMinusDisabled"
      @click="handleMinus"
    >
      <text class="btn-text">−</text>
    </button>
    
    <!-- 数量显示/输入 -->
    <input
      v-if="allowInput"
      class="stepper-input"
      type="number"
      :value="modelValue"
      :disabled="disabled"
      :placeholder="'0'"
      @input="handleInput"
      @blur="handleBlur"
    />
    <output v-else class="stepper-output">
      {{ modelValue }}
    </output>
    
    <!-- 增加按钮 -->
    <button 
      class="stepper-btn btn-plus" 
      :disabled="isPlusDisabled"
      @click="handlePlus"
    >
      <text class="btn-text">＋</text>
    </button>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // v-model 绑定值
  modelValue: {
    type: Number,
    default: 0
  },
  // 最小值
  min: {
    type: Number,
    default: 0
  },
  // 最大值（库存）
  max: {
    type: Number,
    default: 9999
  },
  // 步进值
  step: {
    type: Number,
    default: 1
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  // 是否允许直接输入
  allowInput: {
    type: Boolean,
    default: false
  },
  // 批量采购场景允许 0 表示未选择；从 0 增加时直接跳到最小起订量
  allowZero: {
    type: Boolean,
    default: false
  },
  // 尺寸变体：sm（紧凑）/ md（默认）/ lg（大触控区）
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'minus', 'plus'])

const isMinusDisabled = computed(() => props.disabled || (
  props.allowZero ? props.modelValue <= 0 : props.modelValue <= props.min
))

const isPlusDisabled = computed(() => 
  props.disabled || props.modelValue >= props.max
)

function handleMinus() {
  if (isMinusDisabled.value) return
  const newValue = props.allowZero && props.modelValue <= props.min
    ? 0
    : Math.max(props.min, props.modelValue - props.step)
  emit('update:modelValue', newValue)
  emit('change', newValue)
  emit('minus', newValue)
}

function handlePlus() {
  if (isPlusDisabled.value) return
  const newValue = props.allowZero && props.modelValue <= 0
    ? Math.min(props.max, props.min)
    : Math.min(props.max, props.modelValue + props.step)
  emit('update:modelValue', newValue)
  emit('change', newValue)
  emit('plus', newValue)
}

function handleInput(e) {
  let value = parseInt(e.detail.value) || 0
  value = normalizeInputValue(value)
  emit('update:modelValue', value)
}

function handleBlur(e) {
  let value = parseInt(e.detail.value) || 0
  value = normalizeInputValue(value)
  if (value !== props.modelValue) {
    emit('update:modelValue', value)
    emit('change', value)
  }
}

function normalizeInputValue(value) {
  if (props.allowZero && value <= 0) return 0
  return Math.max(props.min, Math.min(props.max, value))
}
</script>

<style lang="scss" scoped>
.quantity-stepper {
  display: flex;
  align-items: center;
  
  &.is-disabled {
    opacity: 0.45;
  }

  /* 尺寸变体 */
  &.size-sm {
    .stepper-btn { width: 32px; height: 32px; border-radius: 8px; }
    .btn-text { font-size: 16px; }
    .stepper-input, .stepper-output { width: 40px; height: 32px; font-size: 13px; }
  }

  &.size-md {
    /* 默认尺寸 */
    .stepper-btn { width: 40px; height: 40px; border-radius: var(--radius-control, 10px); }
    .btn-text { font-size: 20px; }
    .stepper-input, .stepper-output { width: 48px; height: 40px; font-size: 14px; }
  }

  &.size-lg {
    .stepper-btn { width: 44px; height: 44px; border-radius: var(--radius-control, 10px); }
    .btn-text { font-size: 22px; }
    .stepper-input, .stepper-output { width: 56px; height: 44px; font-size: 16px; }
  }
}

.stepper-btn {
  border: none;
  background: var(--surface-page, #F4F5F8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  
  &:active:not(:disabled) {
    background: var(--bg-pressed, #ECEEF2);
  }
  
  &:disabled {
    opacity: 0.35;
    color: var(--text-placeholder, #969AA3);
  }
}

.btn-text {
  line-height: 1;
  color: var(--text-primary, #1B1C20);
}

.btn-minus .btn-text {
  font-weight: 400;
}

.btn-plus .btn-text {
  font-weight: 500;
}

.stepper-input {
  text-align: center;
  font-weight: 500;
  color: var(--text-primary, #1B1C20);
  border: none;
  border-left: 1px solid var(--border-color, #D9DCE2);
  border-right: 1px solid var(--border-color, #D9DCE2);
  background: transparent;
  font-variant-numeric: tabular-nums;
  
  &:disabled {
    color: var(--text-placeholder, #969AA3);
    background: var(--surface-page, #F4F5F8);
  }
}

.stepper-output {
  text-align: center;
  font-weight: 500;
  color: var(--text-primary, #1B1C20);
  border-left: 1px solid var(--border-color, #D9DCE2);
  border-right: 1px solid var(--border-color, #D9DCE2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
}
</style>
