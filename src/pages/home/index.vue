<template>
  <AppPageShell>
    <!-- 自定义顶部栏 -->
    <template #header>
      <AppStatusBarSpacer />
      <view class="custom-header">
        <!-- 左侧：自有 Logo 图片 -->
        <view class="header-left">
          <image src="/static/images/logo.png" mode="aspectFit" class="logo-img"></image>
        </view>

        <!-- 右侧：图标入口 + 汉堡按钮 -->
        <view class="header-right">
          <!-- 消息图标入口 -->
          <view class="icon-btn" @click="goToMessages">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <!-- 红点提示 -->
            <view class="red-dot" v-if="unreadCount > 0"></view>
          </view>

          <!-- 用户图标入口 -->
          <view class="icon-btn" @click="goToSupplier">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </view>

        </view>
      </view>
    </template>

    <!-- 内容区 -->
    <template #content>
      <view class="home-content">
        <!-- 主功能区域 -->
        <view class="main-actions">
          <!-- 商品下单 - 主入口 -->
          <view class="action-card action-primary" @click="goToCart">
            <view class="action-content">
              <view class="action-text">
                <text class="action-title">商品下单</text>
                <text class="action-subtitle">快速选择商品，加入订货清单</text>
              </view>
              <view class="action-icon-box">
                <svg class="icon-cart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
              </view>
            </view>
            <view class="action-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </view>
            <!-- 装饰图形 -->
            <view class="deco-box deco-box-1"></view>
            <view class="deco-box deco-box-2"></view>
          </view>

          <!-- 新闻资讯 - 次入口 -->
          <view class="action-card action-secondary" @click="goToNews">
            <view class="action-content">
              <view class="action-text">
                <text class="action-title">新闻资讯</text>
                <text class="action-subtitle">查看品牌动态与最新资讯</text>
              </view>
              <view class="action-icon-box">
                <svg class="icon-news" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 002 2z"/>
                  <path d="M7 8h10M7 12h10M7 16h6"/>
                </svg>
              </view>
            </view>
            <view class="action-arrow secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </view>
          </view>
        </view>

        <!-- 底部留白 -->
        <view class="home-footer">
          <text class="footer-text">服务协议 · V1.0.0</text>
        </view>
      </view>
    </template>

    <!-- 抽屉组件 -->
    <view class="drawer-overlay" :class="{ 'show': isDrawerOpen }" @click="closeDrawer"></view>
    <view class="drawer" :class="{ 'open': isDrawerOpen }">
      <view class="drawer-close" @click="closeDrawer">&times;</view>
      <!-- 抽屉里只有两个居中的按钮 -->
      <view class="drawer-btn" @click="goToCart(); closeDrawer()">商品下单</view>
      <view class="drawer-btn" @click="goToNews(); closeDrawer()">新闻资讯</view>
    </view>
  </AppPageShell>
</template>

<script setup>
  import { ref } from 'vue'
  import { safeNavigateTo } from '@/utils/routeGuard.js'
  import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
  import AppStatusBarSpacer from '@/components/AppStatusBarSpacer.vue'

// 控制抽屉展开关闭的状态
  const isDrawerOpen = ref(false)
  const unreadCount = ref(3)

const openDrawer = () => { isDrawerOpen.value = true }
const closeDrawer = () => { isDrawerOpen.value = false }

function goToCart() { safeNavigateTo('/pages/product/list') }
function goToNews() { safeNavigateTo('/pages/news/index') }
function goToMessages() { safeNavigateTo('/pages/message/index') }
function goToSupplier() { safeNavigateTo('/pages/dealer-center/index') }
</script>

<style lang="scss" scoped>
/* 全局背景渐变，消除头部和页面割裂感 */
page {
  background: linear-gradient(180deg, #fff8f6 0%, #ffffff 100%);
  min-height: 100%;
}

/* ========== 自定义顶部栏样式 ========== */
.custom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-4 $page-padding-mobile;
  /* 去掉原来的背景色，改为透明，融入页面渐变 */
  background: transparent; 
  position: relative;
  z-index: 10;
  /* 适配刘海屏和灵动岛 */

  .header-left {
    .logo-img {
      width: 120rpx; /* 根据你的实际Logo比例调整宽度 */
      height: 60rpx;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: $space-4;

    .icon-btn {
      width: 40rpx;
      height: 40rpx;
      color: $color-text-primary;
      position: relative;
      cursor: pointer;

      .icon {
        width: 100%;
        height: 100%;
      }

      .red-dot {
        position: absolute;
        top: -4rpx;
        right: -4rpx;
        width: 16rpx;
        height: 16rpx;
        background: $color-brand-500;
        border-radius: 50%;
        border: 2rpx solid white;
      }
    }

    /* 汉堡按钮 */
    .hamburger-wrap {
      display: flex;
      cursor: pointer;
    }

    .hamburger-icon {
      width: 40rpx;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 6rpx;

      .line {
        width: 100%;
        height: 4rpx;
        background-color: $color-text-primary;
        border-radius: 4rpx;
      }
    }
  }
}

/* 平板及以上隐藏汉堡按钮和抽屉 */
@media screen and (min-width: 768px) {
  .custom-header .hamburger-wrap {
    display: none;
  }
  .drawer {
    display: none;
  }
  .drawer-overlay {
    display: none;
  }
}

/* ========== 基础布局（移动端居中） ========== */
.home-content {
  min-height: 100%;
  padding: $space-6 $page-padding-mobile;
  display: flex;
  flex-direction: column;
  max-width: 750rpx;
  margin: 0 auto;
  background: transparent; /* 与顶层渐变保持一致 */

  /* iPad 及以上大屏：放宽宽度并居中，使用px防止rpx被放大 */
  @media screen and (min-width: 768px) {
    padding: 40px;
    max-width: 1200px;
    margin: 0 auto;
  }
}

/* ========== 主功能区域 ========== */
.main-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $space-4;

  /* iPad 大屏改为双列 Grid 布局 */
  @media screen and (min-width: 768px) {
    display: grid;
    grid-template-columns: 1.2fr 1fr; /* 左侧稍宽，右侧稍窄 */
    grid-template-rows: 1fr;
    gap: 24px;
    padding-top: 40px;
    align-items: stretch;
  }
}

/* ========== 通用卡片样式 ========== */
.action-card {
  position: relative;
  border-radius: 40rpx;
  padding: $space-6;
  overflow: hidden;
  transition: all $duration-normal $easing-standard;
  cursor: pointer;

  &:active {
    transform: scale(0.98);
    opacity: 0.95;
  }

  /* iPad 使用 px 防止内边距过大 */
  @media screen and (min-width: 768px) {
    padding: 40px;
    min-height: 400px;
    border-radius: 24px;
  }
}

.action-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.action-text {
  flex: 1;
  padding-right: 20px; /* 防止文字压到图标 */
}

.action-title {
  display: block;
  font-size: $font-size-h1;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  line-height: 1.2;
  margin-bottom: $space-2;

  /* iPad 强行指定 px 防止字体放大到离谱 */
  @media screen and (min-width: 768px) {
    font-size: 36px;
    margin-bottom: 12px;
    white-space: normal; /* 允许正常换行 */
  }
}

.action-subtitle {
  display: block;
  font-size: $font-size-body-m;
  color: $color-text-secondary;
  line-height: 1.5;

  /* iPad 强制使用 px */
  @media screen and (min-width: 768px) {
    font-size: 16px;
    max-width: 80%; /* 限制换行宽度 */
  }
}

.action-icon-box {
  width: 88rpx;
  height: 88rpx;
  border-radius: $radius-control;
  display: grid;
  place-items: center;
  margin-left: $space-4;

  svg {
    width: 40rpx;
    height: 40rpx;
  }

  /* iPad 图标调整为合理的 px 大小 */
  @media screen and (min-width: 768px) {
    width: 64px;
    height: 64px;
    
    svg {
      width: 32px;
      height: 32px;
    }
  }
}

.action-arrow {
  position: absolute;
  right: $space-6;
  bottom: $space-6;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: grid;
  place-items: center;
  z-index: 2;

  svg {
    width: 24rpx;
    height: 24rpx;
  }

  /* iPad 箭头位置和大小调整 */
  @media screen and (min-width: 768px) {
    width: 48px;
    height: 48px;
    right: 40px;
    bottom: 40px;

    svg {
      width: 20px;
      height: 20px;
    }
  }
}

/* ========== 主入口：商品下单 ========== */
.action-primary {
  background: $color-brand-50;
  min-height: 380rpx;
  box-shadow: 0 4rpx 20rpx rgba(215, 25, 45, 0.04);

  &:active { background: $color-brand-100; }
  .action-title { color: $color-text-primary; }
  .action-subtitle { color: $color-text-secondary; }
  .action-icon-box { background: $color-brand-500; color: $color-gray-0; }
  .action-arrow { background: $color-brand-500; color: $color-gray-0; }

  @media screen and (min-width: 768px) {
    min-height: 100%; /* 撑满双列网格 */
  }
}

/* 装饰性盒子图形 */
.deco-box {
  position: absolute;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.6);
  border: 1rpx solid rgba(215, 25, 45, 0.08);
}

.deco-box-1 {
  width: 120rpx;
  height: 120rpx;
  right: 100rpx;
  bottom: -30rpx;
  transform: rotate(15deg);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 28rpx;
    background: $color-brand-500;
    border-radius: 16rpx 16rpx 0 0;
  }
}

.deco-box-2 {
  width: 80rpx;
  height: 80rpx;
  right: 40rpx;
  bottom: 60rpx;
  transform: rotate(-10deg);
  opacity: 0.5;
}

/* ========== 次入口：新闻资讯 ========== */
.action-secondary {
  background: $color-gray-0;
  border: 1rpx solid $color-gray-200;
  min-height: 360rpx;
  box-shadow: 0 2rpx 12rpx rgba(17, 18, 22, 0.03);

  &:active { background: $color-gray-25; }
  .action-title { font-size: $font-size-h2; color: $color-text-primary; }
  .action-subtitle { color: $color-text-secondary; }
  .action-icon-box { background: $color-gray-50; color: $color-gray-600; }
  .action-arrow { background: $color-gray-50; color: $color-gray-600; }

  /* iPad 端：去掉固定高度，改为撑满 Grid */
  @media screen and (min-width: 768px) {
    min-height: 100%;
    .action-title { font-size: 36px; }
  }
}

/* ========== 底部 ========== */
.home-footer {
  padding: $space-8 0 $space-4;
  text-align: center;
}

.footer-text {
  font-size: $font-size-micro;
  color: $color-text-disabled;
}

/* ========== 抽屉式菜单（同色系渐变背景，与页面融为一体） ========== */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  z-index: 999;
}

.drawer-overlay.show {
  opacity: 1;
  pointer-events: auto;
}

.drawer {
  position: fixed;
  top: 0;
  right: -100%;
  width: 75vw;
  max-width: 350px;
  height: 100vh;
  /* 使用柔和渐变背景，消除生硬纯白 */
  background: linear-gradient(180deg, #fff8f6 0%, #ffffff 60%, #fdf0e5 100%);
  box-shadow: -8rpx 0 30rpx rgba(0,0,0,0.08);
  transition: right 0.3s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: $space-5;
  padding: $space-6;
}

.drawer.open {
  right: 0;
}

.drawer-close {
  position: absolute;
  top: $space-8;
  right: $space-6;
  font-size: 40rpx;
  cursor: pointer;
  color: $color-text-secondary;
}

/* 抽屉里的两个居中按钮 */
.drawer-btn {
  width: 100%;
  padding: $space-5;
  background: rgba(255, 255, 255, 0.9); /* 半透明白，适配渐变背景 */
  border-radius: 40rpx;
  text-align: center;
  font-size: $font-size-h2;
  font-weight: $font-weight-bold;
  color: $color-brand-500;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 4rpx 16rpx rgba(215, 25, 45, 0.05);
}

.drawer-btn:active {
  transform: scale(0.95);
}
</style>
