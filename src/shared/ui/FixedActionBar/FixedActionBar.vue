<template>
  <view class="fixed-action-bar" :style="barStyle">
    <view class="action-content">
      <slot></slot>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 背景色
  bgColor: {
    type: String,
    default: 'rgba(255, 255, 255, 0.98)'
  },
  // 是否显示顶部边框
  showBorder: {
    type: Boolean,
    default: true
  },
  // 是否居中显示（平板端）
  centered: {
    type: Boolean,
    default: false
  }
})

const barStyle = computed(() => ({
  backgroundColor: props.bgColor,
  borderTop: props.showBorder ? '1px solid var(--divider-color, #ECEEF2)' : 'none'
}))
</script>

<style lang="scss" scoped>
.fixed-action-bar {
  position: relative;
  width: 100%;
  z-index: 1;
  overflow: visible;
}

.action-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  max-width: var(--content-max-width, 1120px);
  min-height: 64px;
  margin: 0 auto;
  padding: 8px var(--page-padding-x, 16px);
  overflow: visible;
}
</style>
