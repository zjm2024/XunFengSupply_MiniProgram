<!--
  透明状态栏占位组件。
  只负责占据系统状态栏/刘海/挖孔区域的高度，不设置背景、边距、定位或层级。

  用法：放在自定义页面或自定义 Header 的第一个元素。
  <AppStatusBarSpacer />
-->
<template>
  <view
    class="app-status-bar-spacer"
    :style="{ height: topSafeInset + 'px' }"
    aria-hidden="true"
  ></view>
</template>

<script setup>
import { computed } from 'vue'
import { useResponsive } from '@/hooks/useResponsive.js'

const { layout, safeArea } = useResponsive()

// 不同平台返回字段略有差异，取状态栏高度与安全区顶部的较大值最稳妥。
const topSafeInset = computed(() => Math.max(
  Number(layout.value.statusBarHeight) || 0,
  Number(safeArea.value.top) || 0,
))
</script>

<style scoped>
.app-status-bar-spacer {
  display: block;
  width: 100%;
  min-height: env(safe-area-inset-top);
  flex-shrink: 0;
  box-sizing: border-box;
  background: transparent;
  pointer-events: none;
}
</style>
