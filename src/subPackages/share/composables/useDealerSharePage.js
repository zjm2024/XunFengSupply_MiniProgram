import { computed, ref, watch } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { useUserStore } from '@/shared/session/userStore.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'
import { useDealerSharing } from './useDealerSharing.js'
import { dealerShareErrorMessage } from '../model/dealerShareError.js'

/** 发行页面共用身份、刷新和离页清理，所有二维码仅保留在当前可见页面内存。 */
export function useDealerSharePage(options = {}) {
  const user = useUserStore(), isRefreshing = ref(false)
  let sessionVersion = 0, visible = false, disposeWeb = null
  const controller = useDealerSharing(() => ({ dealerId: user.dealerId, userId: user.userId,
    canView: user.hasPermission('RETAIL_SHARE_VIEW'), sessionVersion }), options)
  const { state } = controller
  const capabilitiesErrorMessage = computed(() => dealerShareErrorMessage(state.capabilitiesError))
  const historyErrorMessage = computed(() => dealerShareErrorMessage(state.historyError))
  const actionErrorMessage = computed(() => dealerShareErrorMessage(state.actionError, 'share.dealer.actionFailed'))
  /** 下拉刷新沿用项目动画，操作中不伪造刷新成功。 */
  async function handleRefresh() {
    if (isRefreshing.value || state.busy || state.loading) return
    const startedAt = Date.now(); isRefreshing.value = true
    try { await controller.load() } finally { await waitForRefreshAnimation(startedAt); isRefreshing.value = false }
  }
  /** 滚动容器恢复时结束已完成的刷新。 */
  function handleRefresherRestore() { if (!state.loading) isRefreshing.value = false }
  /** 筛选变化丢弃旧请求，重新读取第一页，避免迟到响应污染当前状态。 */
  function reloadRecords() { controller.deactivate(); if (visible && user.isLogin) controller.activate() }
  watch(() => [user.userId, user.dealerId, user.token, user.permissions.join('|')], () => { sessionVersion++; reloadRecords() })
  onShow(() => {
    visible = true; controller.activate()
    // #ifdef H5
    if (!disposeWeb && typeof document !== 'undefined') {
      const visibility = () => { if (!visible) return; if (document.hidden) controller.deactivate(); else controller.activate() }
      const pageHide = () => { if (visible) controller.deactivate() }
      const pageShow = () => { if (visible && !document.hidden) controller.activate() }
      const escape = event => { if (event.key === 'Escape') state.qr = null }
      document.addEventListener('visibilitychange', visibility); document.addEventListener('keydown', escape)
      window.addEventListener('pagehide', pageHide); window.addEventListener('pageshow', pageShow)
      disposeWeb = () => { document.removeEventListener('visibilitychange', visibility); document.removeEventListener('keydown', escape); window.removeEventListener('pagehide', pageHide); window.removeEventListener('pageshow', pageShow) }
    }
    // #endif
  })
  onHide(() => { visible = false; controller.deactivate(); isRefreshing.value = false })
  onUnload(() => { visible = false; disposeWeb?.(); controller.dispose() })
  return { user, controller, state, isRefreshing, capabilitiesErrorMessage, historyErrorMessage, actionErrorMessage, handleRefresh, handleRefresherRestore, reloadRecords }
}
