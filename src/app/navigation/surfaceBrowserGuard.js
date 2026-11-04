import { publicShareUrl } from '../config/sharePublicRoutes.js'
import { isSurfaceRouteAllowed } from './routeGuard.js'
import { shareEntryGate } from './shareEntryGate.js'

/** 在 UniApp 初始化和浏览器历史导航之前校验构建表面，阻止越界页面挂载。 */
export function installSurfaceBrowserGuard(win, surface, gate = shareEntryGate) {
  /** 根入口交给 startup；其他地址必须属于当前构建表面。 */
  function isAllowed() {
    const route = win.location.hash.slice(1)
    if (surface.mode === 'share-h5') {
      return gate.allows(route) && (route.startsWith('/s/') || isSurfaceRouteAllowed(route, surface))
    }
    return !route || route === '/' || isSurfaceRouteAllowed(route, surface)
  }

  /** 首次打开时同步清除越界路由，保留部署路径和站点查询参数。 */
  function replaceEntry() {
    win.history.replaceState(null, '', win.location.pathname + win.location.search + '#' + surface.entry)
  }

  /** 地址栏修改和前进后退跨越表面时，重载到入口，避免保留旧页面实例。 */
  function onHistoryChange(event) {
    if (isAllowed()) return
    event.stopImmediatePropagation()
    replaceEntry()
    win.location.reload()
  }

  // 原始分享码先交给 shareLanding 捕获，不能在这里丢弃访客凭据。
  if (!isAllowed()) replaceEntry()
  win.addEventListener('hashchange', onHistoryChange, true)
  win.addEventListener('popstate', onHistoryChange, true)

  /** 移除监听，供测试与宿主生命周期释放使用。 */
  return function dispose() {
    win.removeEventListener('hashchange', onHistoryChange, true)
    win.removeEventListener('popstate', onHistoryChange, true)
  }
}

/** 守卫 UniApp H5 Router 的程序导航与历史跳转，在目标组件挂载前拒绝跨表面路由。 */
export function installSurfaceRouterGuard(router, surface, gate = shareEntryGate) {
  const stopCanonical = router.afterEach?.((to, from, failure) => {
    if (failure || surface.mode !== 'share-h5' || typeof window === 'undefined') return
    const route = to.fullPath || to.path, target = publicShareUrl(route)
    if (target !== route) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + '#' + target)
  })
  const stopGuard = router.beforeEach(to => isSurfaceRouteAllowed(to.path, surface)
    && (surface.mode !== 'share-h5' || gate.allows(to.fullPath || to.path))
    ? true
    : { path: surface.entry, replace: true })
  return () => { stopGuard?.(); stopCanonical?.() }
}
