import { onBeforeUnmount, ref, watch } from 'vue'
import { getHome, getHomePreviews } from '../api/homePage.js'
import { getLocale } from '../i18n/index.js'
import { useUserStore } from '../session/userStore.js'

/** 管理首页结构、按需楼层批次与账号切换后的旧响应隔离。 */
export function useHomePage(active) {
  const user = useUserStore()
  const home = ref({ mode: 'default', components: [] })
  const loading = ref(false)
  const sections = ref({})
  let generation = 0, loadedAt = 0, disposed = false, timer = null, refreshing = null
  const pending = new Set()
  const flights = new Set()

  /** 使先前账号和旧布局的响应失效。 */
  function invalidate() {
    generation++
    loadedAt = 0
    home.value = { mode: 'default', components: [] }
    sections.value = {}
    pending.clear()
    clearTimeout(timer)
    timer = null
    refreshing = null
    loading.value = false
  }

  /** 获取布局，失败只影响首页展示，不中断其他Tab。 */
  async function refresh(force = false) {
    if (!active.value || disposed || !user.isLoggedIn) return
    if (!force && (refreshing || loadedAt && Date.now() - loadedAt < 30000)) return refreshing
    const request = ++generation
    loading.value = true
    const task = (async () => {
      try {
        const result = await getHome()
        if (request !== generation || disposed) return
        home.value = result
        sections.value = {}
        pending.clear()
        loadedAt = Date.now()
        result.components?.filter(c => c.componentType === 5).slice(0, 2).forEach(c => requestSection(c.homeComponentId))
      } catch (error) {
        if (request !== generation || disposed) return
        home.value = { mode: 'default', components: [] }
        sections.value = {}
        loadedAt = Date.now()
      } finally {
        if (request === generation) { loading.value = false; refreshing = null }
      }
    })()
    refreshing = task
    return task
  }

  /** 队列合并邻近楼层，限制每批24件且避免重复读取。 */
  function requestSection(id, retry = false) {
    id = String(id)
    if (!active.value || home.value.mode !== 'custom' || !home.value.canPurchase) return
    const previous = sections.value[id]
    if (!retry && previous && previous.state !== 'idle') return
    if (!home.value.components.some(c => c.componentType === 5 && c.homeComponentId === id)) return
    sections.value = { ...sections.value, [id]: { state: 'loading', items: [] } }
    pending.add(id)
    if (!timer) timer = setTimeout(flush, 30)
  }

  /** 使用固定配置和请求代际读取商品，旧响应不能覆盖新首页。 */
  async function flush() {
    timer = null
    if (!active.value || disposed) return
    if (flights.has(generation)) return
    const generationAtStart = generation
    const definition = home.value
    const ids = []
    let count = 0
    for (const id of pending) {
      const component = definition.components.find(c => c.homeComponentId === id)
      if (!component) { pending.delete(id); continue }
      const size = Math.min(8, component.config.previewCount)
      if (ids.length >= 4 || count + size > 24) break
      ids.push(id); count += size; pending.delete(id)
    }
    if (!ids.length) return
    flights.add(generationAtStart)
    try {
      const rows = await getHomePreviews(definition, ids)
      if (generation !== generationAtStart || disposed) return
      const updates = Object.fromEntries(ids.map(id => [id, rows.find(row => row.homeComponentId === id) || { state: 'error', items: [] }]))
      sections.value = { ...sections.value, ...updates }
    } catch (error) {
      if (generation !== generationAtStart || disposed) return
      if (/HOME_(SCOPE_CHANGED|SECTION_UNAVAILABLE)/.test(error.errorCode || '')) {
        home.value = { mode: 'default', components: [] }; sections.value = {}; loadedAt = 0
      } else {
        sections.value = { ...sections.value, ...Object.fromEntries(ids.map(id => [id, { state: 'error', items: [] }])) }
      }
    } finally {
      flights.delete(generationAtStart)
      if (generation === generationAtStart && pending.size && active.value && !disposed) timer = setTimeout(flush, 30)
    }
  }

  watch(active, enabled => {
    if (enabled) { refresh(); if (pending.size && !timer) timer = setTimeout(flush, 30) }
    else { clearTimeout(timer); timer = null }
  }, { immediate: true })
  watch(() => [user.userId, user.dealerId, user.isLoggedIn, user.permissions.join(','), getLocale()], () => { invalidate(); if (active.value) refresh(true) })
  onBeforeUnmount(() => { disposed = true; invalidate() })
  return { home, loading, sections, refresh, requestSection }
}
