import { onBeforeUnmount, ref, watch } from 'vue'
import { getHome, getHomePreviews } from '../api/homePage.js'
import { getLocale } from '../i18n/index.js'
import { useUserStore } from '../session/userStore.js'
import storage from '../utils/storage.js'

const HOME_CACHE_KEY = 'home_layout_cache'
const HOME_CACHE_TTL = 5 * 60 * 1000

/** 管理首页布局缓存、静默刷新、按需楼层批次及账号切换后的旧响应隔离。 */
export function useHomePage(active) {
  const user = useUserStore()
  const home = ref({ mode: 'default', components: [] })
  const loading = ref(false)
  const hasContent = ref(false)
  const sections = ref({})
  let generation = 0, refreshGeneration = 0, loadedAt = 0, disposed = false, timer = null, refreshing = null
  const pending = new Set()
  const flights = new Set()
  const loadingSections = new Set()

  /** 布局按账号、主体、权限、账号状态和语言隔离，不以缓存授予交易权限。 */
  function cacheScope() {
    return JSON.stringify([String(user.userId), String(user.dealerId), user.isLoggedIn,
      [...user.permissions].sort(), user.isMainAccount, user.dealerStatus, user.accountStatus, getLocale()])
  }

  /** 只恢复五分钟内同身份的布局，商品价格和库存不落本地缓存。 */
  function restoreLayout() {
    if (!user.isLoggedIn) return
    const cached = storage.get(HOME_CACHE_KEY)
    if (!cached) return
    const age = Date.now() - cached.savedAt
    const layout = cached.home
    if (cached.version !== 1 || cached.scope !== cacheScope() || !Number.isFinite(age)
      || age < 0 || age >= HOME_CACHE_TTL || !Array.isArray(layout?.components)
      || !['default', 'custom'].includes(layout.mode)) {
      storage.remove(HOME_CACHE_KEY)
      return
    }
    home.value = layout
    hasContent.value = true
  }

  /** 只保存成功获取的布局快照；存储失败由统一存储层降级，不影响页面。 */
  function saveLayout() {
    storage.set(HOME_CACHE_KEY, { version: 1, scope: cacheScope(), savedAt: Date.now(), home: home.value })
  }

  /** 使先前账号和旧布局的响应失效。 */
  function invalidate() {
    generation++
    refreshGeneration++
    loadedAt = 0
    home.value = { mode: 'default', components: [] }
    hasContent.value = false
    sections.value = {}
    pending.clear()
    loadingSections.clear()
    clearTimeout(timer)
    timer = null
    refreshing = null
    loading.value = false
  }

  /** 已有内容时静默刷新；相同布局不替换组件和楼层，网络失败保留当前展示。 */
  async function refresh(force = false) {
    if (!active.value || disposed || !user.isLoggedIn) return
    if (refreshing || !force && loadedAt && Date.now() - loadedAt < 30000) return refreshing
    const request = ++refreshGeneration
    const scope = cacheScope()
    loading.value = true
    const task = (async () => {
      try {
        const result = await getHome()
        if (request !== refreshGeneration || disposed || scope !== cacheScope()) return
        const changed = JSON.stringify(home.value) !== JSON.stringify(result)
        if (changed) {
          generation++
          home.value = result
          sections.value = {}
          pending.clear()
          loadingSections.clear()
          clearTimeout(timer)
          timer = null
        }
        hasContent.value = true
        loadedAt = Date.now()
        saveLayout()
        const floors = result.components?.filter(c => c.componentType === 5) || []
        floors.forEach((component, index) => {
          if (index < 2 || sections.value[component.homeComponentId]) requestSection(component.homeComponentId, true)
        })
      } catch (error) {
        if (request !== refreshGeneration || disposed || scope !== cacheScope()) return
        // 无可用内容时使用原默认首页，有内容时不因网络故障切走页面。
        hasContent.value = true
      } finally {
        if (request === refreshGeneration) { loading.value = false; refreshing = null }
      }
    })()
    refreshing = task
    return task
  }

  /** 队列合并邻近楼层，静默更新已有商品，限制每批24件且避免重复读取。 */
  function requestSection(id, retry = false) {
    id = String(id)
    if (!active.value || home.value.mode !== 'custom' || !home.value.canPurchase) return
    const previous = sections.value[id]
    if (pending.has(id) || loadingSections.has(`${generation}:${id}`) || previous?.state === 'loading') return
    if (!retry && previous && previous.state !== 'idle') return
    if (!home.value.components.some(c => c.componentType === 5 && c.homeComponentId === id)) return
    if (previous?.state !== 'ready') sections.value = { ...sections.value, [id]: { state: 'loading', items: [] } }
    pending.add(id)
    if (!timer) timer = setTimeout(flush, 30)
  }

  /** 使用固定配置和请求代际读取商品，旧响应不能覆盖新首页。 */
  async function flush() {
    timer = null
    if (!active.value || disposed) return
    if (flights.has(generation)) return
    const generationAtStart = generation
    const scope = cacheScope()
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
    ids.forEach(id => loadingSections.add(`${generationAtStart}:${id}`))
    try {
      const rows = await getHomePreviews(definition, ids)
      if (generation !== generationAtStart || disposed || scope !== cacheScope()) return
      const updates = Object.fromEntries(ids.map(id => [id, rows.find(row => row.homeComponentId === id) || { state: 'error', items: [] }]))
      sections.value = { ...sections.value, ...updates }
    } catch (error) {
      if (generation !== generationAtStart || disposed || scope !== cacheScope()) return
      if (/HOME_(SCOPE_CHANGED|SECTION_UNAVAILABLE)/.test(error.errorCode || '')) {
        storage.remove(HOME_CACHE_KEY)
        invalidate()
        hasContent.value = true
      } else {
        const updates = ids.filter(id => sections.value[id]?.state !== 'ready')
          .map(id => [id, { state: 'error', items: [] }])
        sections.value = { ...sections.value, ...Object.fromEntries(updates) }
      }
    } finally {
      flights.delete(generationAtStart)
      ids.forEach(id => loadingSections.delete(`${generationAtStart}:${id}`))
      if (generation === generationAtStart && pending.size && active.value && !disposed) timer = setTimeout(flush, 30)
    }
  }

  restoreLayout()
  watch(active, enabled => {
    if (enabled) { refresh(); if (pending.size && !timer) timer = setTimeout(flush, 30) }
    else { clearTimeout(timer); timer = null }
  }, { immediate: true })
  watch(cacheScope, () => {
    invalidate()
    restoreLayout()
    if (active.value) refresh(true)
  })
  onBeforeUnmount(() => { disposed = true; invalidate() })
  return { home, loading, hasContent, sections, refresh, requestSection }
}
