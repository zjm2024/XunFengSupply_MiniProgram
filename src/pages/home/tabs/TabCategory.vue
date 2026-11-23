<template><AppCategoryBrowser ref="categoryBrowser" :refreshing="refreshing" :active="active" :categories="categoryTree" :loading="loading" :failed="failed && !categoryTree.length" :empty-title="scopeEmpty ? t('main.category.scopeEmpty') : ''" :load-products="getGoodsList" @refresh="handleRefresh" @product="openProduct" @category="openCategory" /></template>
<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppCategoryBrowser from '@/shared/ui/AppCategoryBrowser/AppCategoryBrowser.vue'
import { t, getLocale } from '@/shared/i18n/index.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { getNavigationCategoryList, getGoodsList, getEmptyProductScope } from '@/shared/api/product.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'
const props = defineProps({ active: { type: Boolean, default: false } })
const categoryTree = ref([]), loading = ref(false), failed = ref(false)
const scopeEmpty = ref(false)
const user = useUserStore()
const categoryBrowser = ref(null)
const refreshing = ref(false)
let refreshGeneration = 0
let categoryRequest = null
let generation = 0
let loadedAt = 0
// 分类沿用首页布局的五分钟有效期，主体或权限变化立即失效。
const CATEGORY_MAX_AGE = 5 * 60 * 1000
/** 导航页独立读取主体权限分类，失败不回退到公共分类树。 */
function loadCategories(force = false) {
  if (categoryRequest) return categoryRequest
  if (!force && loadedAt && Date.now() - loadedAt < CATEGORY_MAX_AGE) return Promise.resolve(false)
  const request = ++generation
  loading.value = true
  failed.value = false
  const task = (async () => {
    try {
      const result = await getNavigationCategoryList()
      if (request !== generation) return false
      const next = Array.isArray(result) ? result.filter(item => item?.id != null && item?.name) : []
      if (JSON.stringify(next) !== JSON.stringify(categoryTree.value)) categoryTree.value = next
      loadedAt = Date.now()
      scopeEmpty.value = false
      if (!categoryTree.value.length) {
        const empty = await getEmptyProductScope().catch(() => false)
        if (request !== generation) return false
        scopeEmpty.value = empty === true
      }
      return true
    } catch {
      if (request !== generation) return false
      failed.value = true
      return false
    } finally {
      if (request === generation) loading.value = false
    }
  })().finally(() => { if (categoryRequest === task) categoryRequest = null })
  categoryRequest = task
  return task
}

/** 主动刷新拥有完整收尾；树未变化也重新读取当前商品预览，保留原浏览位置。 */
async function handleRefresh() {
  if (refreshing.value) return
  const refresh = ++refreshGeneration
  const previousTree = categoryTree.value
  const startedAt = Date.now()
  refreshing.value = true
  await nextTick()
  try {
    const success = await loadCategories(true)
    if (!success || refresh !== refreshGeneration) return
    await nextTick()
    await categoryBrowser.value?.refreshPreviews(previousTree === categoryTree.value)
  } finally {
    await waitForRefreshAnimation(startedAt)
    if (refresh === refreshGeneration) refreshing.value = false
  }
}
/** 经销商商品跳转继续使用原路由。 */
function openProduct(id) { return navigator.navigateTo(routes.commerce.productDetail(id)) }
/** 分类列表继续使用经销商目录筛选。 */
function openCategory(id) { return navigator.navigateTo(routes.commerce.productList({ categoryId: id })) }
watch(() => props.active, value => { if (value) loadCategories() }, { immediate: true })
/** 从详情返回时按有效期重新验证；已知身份和权限变化立即失效。 */
onShow(() => { if (props.active) loadCategories() })
watch(() => JSON.stringify([user.userId, user.dealerId, user.isLoggedIn, user.permissions, user.isMainAccount, user.accountStatus, user.dealerStatus, getLocale()]), () => {
  generation += 1
  refreshGeneration += 1
  refreshing.value = false
  categoryRequest = null
  loadedAt = 0
  loading.value = false
  categoryTree.value = []
  scopeEmpty.value = false
  if (props.active && user.userId) loadCategories()
})
onBeforeUnmount(() => { generation += 1; refreshGeneration += 1; refreshing.value = false })
</script>
