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
  // 尺寸变体：sm（紧凑）/ md（默认）/ lg（大触控区）
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'minus', 'plus'])

const isMinusDisabled = computed(() => 
  props.disabled || props.modelValue <= props.min
)

const isPlusDisabled = computed(() => 
  props.disabled || props.modelValue >= props.max
)

function handleMinus() {
  if (isMinusDisabled.value) return
  const newValue = Math.max(props.min, props.modelValue - props.step)
  emit('update:modelValue', newValue)
  emit('change', newValue)
  emit('minus', newValue)
}

function handlePlus() {
  if (isPlusDisabled.value) return
  const newValue = Math.min(props.max, props.modelValue + props.step)
  emit('update:modelValue', newValue)
  emit('change', newValue)
  emit('plus', newValue)
}

function handleInput(e) {
  let value = parseInt(e.detail.value) || 0
  value = Math.max(props.min, Math.min(props.max, value))
  emit('update:modelValue', value)
}

function handleBlur(e) {
  let value = parseInt(e.detail.value) || 0
  value = Math.max(props.min, Math.min(props.max, value))
  if (value !== props.modelValue) {
    emit('update:modelValue', value)
    emit('change', value)
  }
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
    .stepper-btn { width: 52rpx; height: 52rpx; border-radius: 12rpx; }
    .btn-text { font-size: 28rpx; }
    .stepper-input, .stepper-output { width: 72rpx; height: 52rpx; font-size: 24rpx; }
  }

  &.size-md {
    /* 默认尺寸 */
    .stepper-btn { width: 64rpx; height: 64rpx; border-radius: 16rpx; }
    .btn-text { font-size: 36rpx; }
    .stepper-input, .stepper-output { width: 88rpx; height: 64rpx; font-size: 28rpx; }
  }

  &.size-lg {
    .stepper-btn { width: 80rpx; height: 80rpx; border-radius: 20rpx; }
    .btn-text { font-size: 44rpx; }
    .stepper-input, .stepper-output { width: 112rpx; height: 80rpx; font-size: 32rpx; }
  }
}

.stepper-btn {
  border: none;
  background: var(--bg-color, #F7F7F8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  
  &:active:not(:disabled) {
    background: var(--border-color, #EFEFF1);
  }
  
  &:disabled {
    opacity: 0.35;
    color: var(--text-placeholder, #C7C9CE);
  }
}

.btn-text {
  line-height: 1;
  color: var(--text-primary, #26282D);
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
  color: var(--text-primary, #111216);
  border: none;
  border-left: 1rpx solid var(--border-color, #DEDFE3);
  border-right: 1rpx solid var(--border-color, #DEDFE3);
  background: transparent;
  font-variant-numeric: tabular-nums;
  
  &:disabled {
    color: var(--text-placeholder, #989BA3);
    background: var(--bg-color, #F7F7F8);
  }
}

.stepper-output {
  text-align: center;
  font-weight: 500;
  color: var(--text-primary, #111216);
  border-left: 1rpx solid var(--border-color, #DEDFE3);
  border-right: 1rpx solid var(--border-color, #DEDFE3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
}
</style>
