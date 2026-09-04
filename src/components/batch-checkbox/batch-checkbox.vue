<!--
  购物车批量勾选组件
  用途：购物车批量选择、补货清单批量选择、全选/取消全选
  支持v-model双向绑定
-->
<template>
  <view 
    class="batch-checkbox" 
    :class="{ checked: modelValue, disabled: disabled }"
    @click="toggle"
  >
    <view class="checkbox-inner">
      <uni-icons 
        v-if="modelValue" 
        type="checkmarkempty" 
        size="14" 
        color="#fff" 
      />
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'toggle'])

function toggle() {
  if (props.disabled) return
  const newValue = !props.modelValue
  emit('update:modelValue', newValue)
  emit('toggle', newValue)
}
</script>

<style lang="scss" scoped>
.batch-checkbox {
  .checkbox-inner {
    width: 36rpx;
    height: 36rpx;
    border: 2rpx solid #CCCCCC;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  
  &.checked {
    .checkbox-inner {
      background: var(--primary-color);
      border-color: var(--primary-color);
    }
  }
  
  &.disabled {
    opacity: 0.4;
  }
}
</style>
