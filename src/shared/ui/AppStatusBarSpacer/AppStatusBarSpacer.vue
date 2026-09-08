<!--
  AppStatusBarSpacer - 状态栏高度占位组件
  职责：为固定顶部导航栏提供状态栏高度的占位空间

  使用方式：
    <AppStatusBarSpacer />
    或
    <AppStatusBarSpacer :extra="8" />  -- 额外高度（rpx）
-->
<template>
  <view class="status-bar-spacer" :style="spacerStyle" aria-hidden="true" />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  // 额外高度（rpx）
  extra: {
    type: Number,
    default: 0
  }
})

const statusBarHeight = ref(20) // 默认状态栏高度

const spacerStyle = computed(() => ({
  height: `${statusBarHeight.value + props.extra}rpx`
}))

onMounted(() => {
  try {
    const systemInfo = uni.getSystemInfoSync()
    if (systemInfo.statusBarHeight) {
      // px 转 rpx (750 / windowWidth * px)
      const windowWidth = systemInfo.windowWidth || 375
      statusBarHeight.value = Math.round((systemInfo.statusBarHeight * 750) / windowWidth)
    }
  } catch (e) {
    // 使用默认值
  }
})
</script>

<style scoped>
.status-bar-spacer {
  width: 100%;
  flex-shrink: 0;
}
</style>
