<template>
  <view class="fixed-action-bar" :style="barStyle">
    <view class="action-content" :style="contentStyle">
      <view v-if="widthMode === 'standard'" class="page-content-frame action-frame"><slot></slot></view>
      <slot v-else></slot>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 与 AppContent 的标准内容框及响应式边距对齐。 */
  widthMode: { type: String, default: 'responsive' },
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
/** 标准模式沿用正文外层限宽，默认不改变既有底栏布局。 */
const contentStyle = computed(() => props.widthMode === 'standard' ? { maxWidth: 'var(--page-container-max-width, 100%)' } : {})
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
.action-frame { display: flex; align-items: center; gap: var(--spacing-sm, 8px); }
</style>
