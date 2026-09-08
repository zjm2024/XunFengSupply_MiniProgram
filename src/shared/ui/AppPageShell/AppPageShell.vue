<!--
  AppPageShell - 统一页面壳层组件

  职责：管理页面整体布局结构
  - 状态栏安全区
  - 标题栏区域（由 AppHeader 填充）
  - 内容区（由 AppContent 填充，flex:1 + min-height:0 自动填充剩余空间）
  - 底部固定操作栏（可选，由 AppFixedFooter 填充）
  - 底部安全区

  标准页面结构：
    [AppPageShell]
      [AppHeader title="页面标题" :show-back="true" /]
      [AppContent]
        [AppPageState :state="pageStatus"]
          业务内容
        [/AppPageState]
      [/AppContent]
      [AppFixedFooter] 
        [button]操作按钮[/button]
      [/AppFixedFooter]
    [/AppPageShell]

  关键特性：
  - 使用 flex column 布局，内容区自动填充剩余高度
  - 无需每个页面计算 scroll-view 高度
  - 自动处理状态栏、安全区、底部横条
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
      <!-- 底部安全区 -->
      <view class="safe-area-spacer" :style="{ height: safeArea.bottom + 'px' }"></view>
    </view>

    <!-- 无 footer 时也需要底部安全区 -->
    <view v-else class="shell-safe-area-bottom" :style="{ height: safeArea.bottom + 'px' }"></view>
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

  // 横屏模式：限制最大宽度并居中
  &.is-landscape {
    &.breakpoint-expanded {
      max-width: 1366px;
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
  min-height: 0; // 关键：允许 flex 子项收缩到小于内容高度
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
</style>
