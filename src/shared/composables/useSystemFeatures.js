import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getSystemFeatures } from '../api/systemFeatures.js'
import { useUserStore } from '../session/userStore.js'
import { registerSessionCleanup } from '../session/sessionCleanup.js'

const afterSaleEnabled = ref(false)
let owner = '', generation = 0, refreshing = null

/** 退出、切号时立即失效旧响应，功能策略不持久化缓存。 */
function clearFeatures() { generation++; owner = ''; refreshing = null; afterSaleEnabled.value = false }
registerSessionCleanup('system-features', async () => { clearFeatures() })

/** 页面每次显示校验当前策略，同账号并发读取合并，未知或失败时隐藏新申请入口。 */
export function useSystemFeatures() {
  const user = useUserStore()
  const scope = () => user.isLoggedIn ? String(user.userId) + ':' + String(user.dealerId) + ':' + user.token : ''
  /** 只允许当前登录范围的响应更新共享开关。 */
  async function refreshFeatures() {
    const key = scope()
    if (owner !== key) { clearFeatures(); owner = key }
    if (!key) return false
    if (refreshing) return refreshing
    const request = generation
    const task = (async () => {
      try {
        const result = await getSystemFeatures()
        if (request !== generation || scope() !== key) return false
        afterSaleEnabled.value = result.afterSaleApplicationEnabled
        return afterSaleEnabled.value
      } catch {
        if (request === generation && scope() === key) afterSaleEnabled.value = false
        return false
      } finally { if (request === generation) refreshing = null }
    })()
    refreshing = task
    return task
  }
  watch(scope, () => { refreshFeatures() }, { immediate: true })
  onShow(refreshFeatures)
  return { afterSaleEnabled: computed(() => afterSaleEnabled.value), refreshFeatures }
}
