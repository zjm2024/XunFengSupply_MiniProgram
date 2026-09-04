<!--
  AppContent - 统一内容区组件

  职责：提供统一的滚动容器、最大宽度限制、页面边距和响应式模式

  特性：
  - flex:1 + min-height:0 自动填充 AppPageShell 剩余高度
  - 内置 scroll-view，无需每个页面计算高度
  - 响应式 max-width：手机 100% / iPad 竖屏 720px / iPad 横屏 1120px
  - 平板端自动居中并增加水平边距
  - 支持自定义滚动事件

  使用方式：
    <AppContent @scroll="onScroll" :scroll-top="scrollTop">
      <view>业务内容</view>
    </AppContent>
-->
<template>
  <view class="app-content" :class="[`content-${layout.breakpoint}`]">
    <!-- 内容居中容器（平板端生效） -->
    <view class="content-inner" :style="containerStyle">
      <scroll-view
        class="content-scroll"
        scroll-y
        :show-scrollbar="false"
        :enable-back-to-top="true"
        :scroll-into-view="scrollIntoView"
        :scroll-with-animation="scrollWithAnimation"
        @scroll="handleScroll"
        ref="scrollViewRef"
      >
        <view class="content-body" :style="{ padding: padding }">
          <slot></slot>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useResponsive } from '@/hooks/useResponsive.js'

const props = defineProps({
  /** 自定义内边距，格式: '16px' 或 '16px 24px' */
  padding: {
    type: String,
    default: '',
  },
  /** 是否禁用最大宽度限制 */
  noMaxWidth: {
    type: Boolean,
    default: false,
  },
  /** 滚动到指定子元素 id，供长表单定位首个错误项 */
  scrollIntoView: {
    type: String,
    default: '',
  },
  scrollWithAnimation: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['scroll'])

const { layout, contentMaxWidth, pagePaddingX } = useResponsive()

/** 容器样式：最大宽度 + 居中 */
const containerStyle = computed(() => {
  if (props.noMaxWidth) return {}

  const style = {
    maxWidth: contentMaxWidth.value,
  }

  // 平板端居中
  if (layout.value.shouldCenterContent) {
    style.marginLeft = 'auto'
    style.marginRight = 'auto'
  }

  return style
})

/** 实际使用的内边距 */
const padding = computed(() => {
  if (props.padding) return props.padding
  // 默认使用响应式边距
  return `0 ${pagePaddingX.value}`
})

function handleScroll(e) {
  emit('scroll', e)
}
</script>

<style lang="scss" scoped>
.app-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-scroll {
  flex: 1;
  height: 100%;
}

.content-body {
  min-height: 100%;
  box-sizing: border-box;

  // 确保内容不会超出
  max-width: 100%;
}

// 响应式微调
.content-medium .content-inner {
  // iPad 竖屏：稍微增加左右边距
}

.content-expanded .content-inner {
  // iPad 横屏：可以更宽的布局
}
</style>
