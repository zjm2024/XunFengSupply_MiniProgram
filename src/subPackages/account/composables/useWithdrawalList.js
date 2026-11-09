import { computed, ref } from 'vue'
import { t } from '@/shared/i18n/index.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'

/** 提现记录及银行卡列表共用分页、重试和下拉刷新状态。 */
export function useWithdrawalList(request) {
  const items = ref([])
  const loading = ref(false)
  const error = ref('')
  const refreshing = ref(false)
  const total = ref(0)
  const moreStatus = computed(() => loading.value ? 'loading' : error.value ? 'error'
    : items.value.length >= total.value ? 'no-more' : 'idle')
  let page = 0
  let sequence = 0

  /** 加载分页，忽略较新的刷新已替换的旧请求。 */
  async function load(reset = true) {
    if (!reset && loading.value) return
    const current = ++sequence
    const pageNum = reset ? 1 : page + 1
    loading.value = true
    error.value = ''
    try {
      const result = await request({ pageNum })
      if (current !== sequence) return
      items.value = reset ? result.items : [...items.value, ...result.items]
      total.value = result.totalCount
      page = pageNum
    } catch (failure) {
      if (current === sequence) error.value = failure?.message || t('account.withdrawal.loadFailed')
    } finally {
      if (current === sequence) loading.value = false
    }
  }

  /** 触底只读取尚未加载的下一页。 */
  function loadMore() {
    if (!loading.value && items.value.length < total.value) return load(false)
  }

  /** 保持下拉动画并在请求结束后收回指示器。 */
  async function refresh() {
    if (refreshing.value) return
    const startedAt = Date.now()
    refreshing.value = true
    try { await load() }
    finally { await waitForRefreshAnimation(startedAt); refreshing.value = false }
  }

  /** 还原已完成或中止的下拉动画。 */
  function restore() { if (!loading.value) refreshing.value = false }

  return { items, loading, error, refreshing, moreStatus, load, loadMore, refresh, restore }
}
