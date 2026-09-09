<!--
  AppStatusBarSpacer - 状态栏高度占位组件
  职责：为固定顶部导航栏提供状态栏高度的占位空间

  使用方式：
    <AppStatusBarSpacer />
    或
    <AppStatusBarSpacer :extra="8" />  -- 额外高度（px）
-->
<template>
  <view class="status-bar-spacer" :style="spacerStyle" aria-hidden="true" />
</template>

<script setup>
import { computed } from 'vue'
import { useResponsive } from '../../composables/useResponsive.js'

const props = defineProps({
  // 额外高度（px）
  extra: {
    type: Number,
    default: 0
  }
})

const { layout, safeArea } = useResponsive()

const nativeTopInset = computed(() => {
  let inset = 0
  // #ifndef H5
  inset = Math.max(
    Number(layout.value.statusBarHeight) || 0,
    Number(safeArea.value.top) || 0,
  )
  // #endif
  return inset
})

const spacerStyle = computed(() => {
  const extra = Math.max(Number(props.extra) || 0, 0)
  let height = `${nativeTopInset.value + extra}px`

  // H5 没有原生状态栏，只保留浏览器安全区和调用方要求的额外间距。
  // #ifdef H5
  height = `calc(${extra}px + env(safe-area-inset-top))`
  // #endif

  return { height }
})
</script>

<style scoped>
.status-bar-spacer {
  width: 100%;
  flex-shrink: 0;
}
</style>
