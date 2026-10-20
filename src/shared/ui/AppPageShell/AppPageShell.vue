<!--
  AppPageShell - 统一页面壳层组件

  职责：管理页面整体布局结构
  - 状态栏安全区
  - 标题栏区域（由 AppHeader 填充）
  - 内容区（由 AppContent 填充，flex:1 + min-height:0 自动填充剩余空间）
  - 底部固定操作栏（可选，由 AppFixedFooter 填充）
  - 页面级覆盖层（用于不受内容滚动区裁剪的抽屉和弹窗）
  - 底部安全区
-->
<template>
  <view class="app-page-shell" :class="[`breakpoint-${layout.breakpoint}`, { 'is-landscape': layout.isLandscape }]">
    <!-- 标题栏插槽 -->
    <view class="shell-header">
      <slot name="header"></slot>
    </view>

    <!-- 内容区：flex:1 + min-height:0 确保正确滚动 -->
    <view class="shell-content-wrapper">
      <slot name="content"></slot>
    </view>

    <!-- 固定底部操作栏（可选） -->
    <view v-if="$slots.footer" class="shell-footer">
      <slot name="footer"></slot>
      <view class="safe-area-spacer" :style="{ height: safeArea.bottom + 'px' }"></view>
    </view>

    <!-- 无 footer 时也需要底部安全区 -->
    <view v-else class="shell-safe-area-bottom" :style="{ height: safeArea.bottom + 'px' }"></view>

    <!-- 页面级覆盖层：位于内容和底栏之上，避免被滚动容器裁剪。 -->
    <view v-if="$slots.overlay" class="shell-overlay">
      <slot name="overlay"></slot>
    </view>
  </view>
</template>

<script setup>
import { useResponsive } from '../../composables/useResponsive.js'

const { layout, safeArea } = useResponsive()
</script>

<style lang="scss" scoped>
.app-page-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  width: 100%;
  background-color: var(--surface-page, #F4F5F8);
  overflow: hidden;
  position: relative;

  &.is-landscape {
    &.breakpoint-expanded {
      max-width: var(--page-shell-max-width, 1366px);
      margin: 0 auto;
      box-shadow: 0 0 32px rgba(17, 18, 22, 0.05);
    }
  }
}

.shell-header {
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

.shell-content-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.shell-footer {
  flex-shrink: 0;
  position: relative;
  z-index: 90;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: var(--shadow-bottom-bar, 0 -4px 16px rgba(17, 18, 22, 0.07));

  .safe-area-spacer {
    min-height: 8px;
    background: transparent;
  }
}

.shell-safe-area-bottom {
  flex-shrink: 0;
  min-height: 8px;
  background: transparent;
}

.shell-overlay {
  position: absolute;
  inset: 0;
  z-index: 200;
  pointer-events: none;
}
</style>
