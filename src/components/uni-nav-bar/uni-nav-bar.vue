<!--
  自定义导航栏组件
  功能：
  - 自定义标题文字
  - 左侧返回按钮（自动判断是否可返回）
  - 右侧自定义操作按钮插槽
  - 适配状态栏高度（App + 微信小程序）
  
  使用场景：
  - TabBar 页面（首页/分类/购物车/我的）- 隐藏返回按钮
  - 登录页面 - 隐藏返回按钮
  - 支付页面等特殊全屏页面
  
  注意：普通子页面建议使用原生导航栏（自带返回按钮），无需引入此组件
-->
<template>
  <view class="uni-nav-bar" :style="{ backgroundColor: bgColor }">
    <view
      class="nav-content"
      :style="{
        paddingTop: statusBarHeight + 'px',
        height: (statusBarHeight + navBarHeight) + 'px'
      }"
    >
      <!-- 左侧区域 -->
      <view class="nav-left">
        <!-- 返回按钮 -->
        <view v-if="showBack" class="back-btn" @click="handleBack">
          <uni-icons type="left" size="20" :color="textColor" />
        </view>
        <!-- 左侧自定义插槽 -->
        <slot name="left"></slot>
      </view>

      <!-- 标题区域 -->
      <view class="nav-title">
        <text class="title-text" :style="{ color: textColor }">{{ title }}</text>
        <slot name="title"></slot>
      </view>

      <!-- 右侧区域 -->
      <view class="nav-right">
        <slot name="right"></slot>
      </view>
    </view>
    
    <!-- 占位元素，防止内容被固定导航栏遮挡 -->
    <view
      class="nav-placeholder"
      :style="{ height: (statusBarHeight + navBarHeight) + 'px' }"
    ></view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  /** 导航栏标题 */
  title: { type: String, default: '' },
  /** 是否显示返回按钮 */
  showBack: { type: Boolean, default: true },
  /** 导航栏背景色 */
  bgColor: { type: String, default: '#C41E3A' },
  /** 文字颜色（标题、返回箭头） */
  textColor: { type: String, default: '#fff' },
  /** 导航栏高度（不含状态栏） */
  navBarHeight: { type: Number, default: 44 }
})

const emit = defineEmits(['back', 'clickLeft'])

// ==================== 状态栏高度 ====================
const statusBarHeight = ref(0)

// #ifdef APP-PLUS
statusBarHeight.value = plus.navigator.getStatusbarHeight()
// #endif

// #ifdef MP-WEIXIN
const sysInfo = uni.getSystemInfoSync()
statusBarHeight.value = sysInfo.statusBarHeight || 0
// #endif

// #ifdef H5
const h5SysInfo = uni.getSystemInfoSync()
statusBarHeight.value = h5SysInfo.statusBarHeight || 0
// #endif

// ==================== 返回操作 ====================

/**
 * 处理返回按钮点击
 * 逻辑：
 * 1. 页面栈有上一页 → navigateBack() 返回
 * 2. 页面栈只有当前页 → 跳转到首页（兜底）
 */
function handleBack() {
  // 触发外部事件（优先）
  emit('back')
  emit('clickLeft')

  const pages = getCurrentPages()
  
  if (pages.length > 1) {
    // 有上一页，正常返回
    uni.navigateBack({
      fail: () => {
        // 返回失败时兜底到首页
        fallbackToHome()
      }
    })
  } else {
    // 没有上一页，返回首页
    fallbackToHome()
  }
}

/**
 * 兜底：返回首页
 */
function fallbackToHome() {
  uni.reLaunch({ url: '/pages/home/index' })
}
</script>

<style lang="scss" scoped>
.uni-nav-bar {
  position: relative;
  
  .nav-content {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    padding: 0 24rpx;
    box-sizing: content-box;
    
    .nav-left {
      width: 160rpx;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      
      .back-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64rpx;
        height: 64rpx;
        margin-left: -16rpx;
        
        /* 扩大点击热区 */
        &::before {
          content: '';
          position: absolute;
          width: 120%;
          height: 120%;
        }
        
        /* 点击反馈效果 */
        &:active {
          opacity: 0.7;
        }
      }
    }
    
    .nav-title {
      flex: 1;
      text-align: center;
      overflow: hidden;
      padding: 0 16rpx;
      
      .title-text {
        font-size: 34rpx;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: block;
      }
    }
    
    .nav-right {
      width: 160rpx;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      flex-shrink: 0;
    }
  }
  
  /* 占位元素 */
  .nav-placeholder {
    flex-shrink: 0;
  }
}
</style>
