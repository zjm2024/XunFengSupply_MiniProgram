<template>
  <view class="fixed-action-bar" :style="barStyle">
    <view class="action-content">
      <slot></slot>
    </view>
    <!-- 安全区域 -->
    <view class="safe-area-bottom"></view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  // 背景色
  bgColor: {
    type: String,
    default: 'rgba(255, 255, 255, 98%)'
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

// 安全区高度
const safeBottom = ref(0)

onMounted(() => {
  try {
    const sysInfo = uni.getSystemInfoSync()
    safeBottom.value = sysInfo.safeAreaInsets?.bottom || 0
  } catch (e) {
    safeBottom.value = 24 // 默认值
  }
})

const barStyle = computed(() => ({
  backgroundColor: props.bgColor,
  borderTop: props.showBorder ? `1rpx solid var(--border-color, #EFEFF1)` : 'none'
}))
</script>

<style lang="scss" scoped>
.fixed-action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  box-shadow: 0 -8rpx 32rpx rgba(17, 18, 22, 0.07);
}

.action-content {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 32rpx 0;
}

.safe-area-bottom {
  height: env(safe-area-inset-bottom);
  min-height: 24rpx;
}
</style>
