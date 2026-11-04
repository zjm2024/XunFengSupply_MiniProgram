<!--
  AppContent - 统一内容区组件

  职责：提供统一的滚动容器、最大宽度限制、页面边距和响应式模式

  特性：
  - flex:1 + min-height:0 自动填充 AppPageShell 剩余高度
  - 内置 scroll-view，无需每个页面计算高度
  - 响应式 max-width：手机 100% / iPad 竖屏 720px / iPad 横屏 1120px
  - 平板端自动居中并增加水平边距
  - 支持自定义滚动事件
  - width-mode="standard"：使用新增地址页的 820px 标准内容框

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
        :scroll-top="scrollTop"
        :scroll-with-animation="scrollWithAnimation"
        :refresher-enabled="refresherEnabled"
        :refresher-triggered="refresherTriggered"
        :refresher-background="refresherBackground"
        :refresher-default-style="refreshIndicatorStyle"
        :refresher-threshold="48"
        @scroll="handleScroll"
        @scrolltolower="emit('scrolltolower')"
        @refresherrefresh="emit('refresherrefresh')"
        @refresherrestore="emit('refresherrestore')"
        @refresherabort="emit('refresherabort')"
        ref="scrollViewRef"
      >
        <!-- #ifdef H5 -->
          <template #refresher><view class="compact-refresher"><view class="compact-refresher-icon" :class="{ 'is-refreshing': refresherTriggered }"><AppIcon name="refresh" :size="20" color="#737A84" /></view></view></template>
          <!-- #endif -->
        <view class="content-body" :style="{ padding: padding }">
          <view v-if="widthMode === 'standard' && !noMaxWidth" class="page-content-frame"><slot></slot></view>
          <slot v-else></slot>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
/** H5自定义刷新头，原生App/小程序使用原生指示器以兼容编译。 */
let refreshIndicatorStyle = 'black'
// #ifdef H5
refreshIndicatorStyle = 'none'
// #endif
import { computed } from 'vue'
import { useResponsive } from '../../composables/useResponsive.js'
import AppIcon from '../AppIcon/AppIcon.vue'

const props = defineProps({
  /** 标准业务页共用内容框；默认保持现有响应式容器行为。 */
  widthMode: { type: String, default: 'responsive' },
  /** 可选的程序化滚动目标；未传入时沿用原生滚动行为。 */
  scrollTop: { type: Number, default: undefined },
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
  refresherEnabled: {
    type: Boolean,
    default: false,
  },
  refresherTriggered: {
    type: Boolean,
    default: false,
  },
  refresherBackground: {
    type: String,
    default: 'transparent',
  },
})

const emit = defineEmits(['scroll', 'scrolltolower', 'refresherrefresh', 'refresherrestore', 'refresherabort'])

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
  // 默认：使用 CSS px 保持 H5、iOS、Android、平板端尺寸稳定
  return `16px ${pagePaddingX.value}`
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
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-refresher-indicator {
  position: absolute;
  z-index: 3;
  top: 10px;
  left: 50%;
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #FFF;
  transform: translateX(-50%);
  animation: app-refresher-spin 900ms linear infinite;
}

@keyframes app-refresher-spin {
  to { transform: translateX(-50%) rotate(360deg); }
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

/* 原生H5刷新头按拖动距离设置内联高度，限制占位避免大幅下拉推走页面。 */
:deep(.uni-scroll-view-refresher){max-height:56px!important;overflow:hidden;background:transparent!important}
.compact-refresher{height:48px;display:flex;align-items:center;justify-content:center;background:transparent;pointer-events:none}
.compact-refresher-icon{display:flex;align-items:center;justify-content:center;width:28px;height:28px;color:#737a84}
.compact-refresher-icon.is-refreshing{animation:compact-refresher-spin .9s linear infinite}
@keyframes compact-refresher-spin{to{transform:rotate(360deg)}}
</style>
