<script setup>
import { getCurrentInstance } from 'vue'
import { notificationAppShow, notificationAppHide } from './shared/services/notificationLifecycle.js'
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { STARTUP_CONFIG } from './app/config/startupConfig.js'
import { APP_SURFACE } from './app/config/shareSurface.js'
import { isSurfaceRouteAllowed } from './app/navigation/routeGuard.js'
import { navigator } from './app/navigation/navigator.js'
// #ifdef H5
import { installSurfaceRouterGuard } from './app/navigation/surfaceBrowserGuard.js'
const h5Router = getCurrentInstance()?.appContext.app.router
if (h5Router) installSurfaceRouterGuard(h5Router, APP_SURFACE)
// #endif

/**
 * App 启动时执行
 * 
 * 核心原则：
 * - App.vue 不执行常规 launchGuard
 * - App.vue 仅负责构建表面的深链隔离
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
  ensureSurfaceRoute()
  notificationAppShow()
})

onHide(() => {
  console.log('[App] Hide')
  notificationAppHide()
})

/** 禁止通过浏览器深链进入另一构建表面的页面。 */
function ensureSurfaceRoute() {
  const pages = getCurrentPages()
  const current = pages?.[pages.length - 1]
  const path = current ? `/${current.route}` : ''
  if (!path || isSurfaceRouteAllowed(path)) return
  navigator.reLaunch(APP_SURFACE.entry)
}
</script>

<style lang="scss">
/* 全局样式引入 */
@use './shared/styles/variable.scss';
@use './shared/styles/reset.scss';
@use './shared/styles/responsive.scss';

.empty-data-surface {
  border-color: transparent !important;
  background: transparent !important;
  box-shadow: none !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}
</style>
