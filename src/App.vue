<template>
  <view id="app">
    <router-view />
  </view>
</template>

<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { STARTUP_CONFIG } from './config/startup.js'

/**
 * App 启动时执行
 * 
 * 核心原则：
 * - App.vue 不执行 launchGuard
 * - App.vue 不执行 uni.reLaunch
 * - App.vue 不负责登录页、首页、签约页的冷启动分流
 * - 冷启动最终路由只能由 pages/startup/index.vue 决定
 * - restoreLoginState 已由 useAppBootstrap 调用，此处不重复
 * 
 * 可保留：日志、主题、语言、网络监听等不产生路由跳转的全局初始化
 */
onLaunch(() => {
  console.log('[App] Launch, startup mode:', STARTUP_CONFIG.mode)

  // 注意：此处不执行 launchGuard，不执行 uni.reLaunch
  // 冷启动路由决策全权由 startup 页面负责
})

/**
 * App 从后台切到前台时触发
 * 
 * 注意：不重新跑完整 bootstrap
 * 不重复播放品牌启动，不重复执行完整初始化
 */
onShow(() => {
  console.log('[App] Show')
})

onHide(() => {
  console.log('[App] Hide')
})
</script>

<style lang="scss">
/* 全局样式引入 */
@import './styles/reset.scss';
/* variable.scss 中的 CSS 变量已内联定义在下方 page {} 中 */

/* 全局主题色变量 - 基于 DESIGN_SYSTEM.md V2 色阶 */
page {
  --primary-color: #D7192D;
  --primary-light: #F58A93;
  --primary-dark: #B91224;
  --success-color: #168A52;
  --warning-color: #B76500;
  --danger-color: #B42318;
  --text-primary: #111216;
  --text-secondary: #5E626B;
  --text-placeholder: #989BA3;
  --bg-color: #F7F7F8;
  --border-color: #DEDFE3;
  --white: #FFFFFF;

  font-size: 28rpx;
  color: var(--text-primary);
  background-color: var(--bg-color);
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif;
}
</style>
