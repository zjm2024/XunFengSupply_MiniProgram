<template><AppCategoryBrowser :active="active" :categories="categoryTree" :loading="loading" :failed="failed" :empty-title="scopeEmpty ? t('main.category.scopeEmpty') : ''" :load-products="getGoodsList" @refresh="loadCategories" @product="openProduct" @category="openCategory" /></template>
<script setup>
import { ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppCategoryBrowser from '@/shared/ui/AppCategoryBrowser/AppCategoryBrowser.vue'
import { t } from '@/shared/i18n/index.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { getNavigationCategoryList, getGoodsList, getEmptyProductScope } from '@/shared/api/product.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
const props = defineProps({ active: { type: Boolean, default: false } })
const categoryTree = ref([]), loading = ref(false), failed = ref(false)
const scopeEmpty = ref(false)
const user = useUserStore()
let generation = 0
/** 导航页独立读取主体权限分类，失败不回退到公共分类树。 */
async function loadCategories() {
  if (loading.value) return
  const request = ++generation
  loading.value = true
  failed.value = false
  categoryTree.value = []
  scopeEmpty.value = false
  try {
    const result = await getNavigationCategoryList()
    if (request !== generation) return
    categoryTree.value = Array.isArray(result) ? result.filter(item => item?.id != null && item?.name) : []
    if (!categoryTree.value.length) {
      const empty = await getEmptyProductScope().catch(() => false)
      if (request === generation) scopeEmpty.value = empty === true
    }
  } catch {
    if (request !== generation) return
    failed.value = true
    categoryTree.value = []
  } finally { if (request === generation) loading.value = false }
}
/** 经销商商品跳转继续使用原路由。 */
function openProduct(id) { return navigator.navigateTo(routes.commerce.productDetail(id)) }
/** 分类列表继续使用经销商目录筛选。 */
function openCategory(id) { return navigator.navigateTo(routes.commerce.productList({ categoryId: id })) }
watch(() => props.active, value => { if (value) loadCategories() }, { immediate: true })
/** 从其他页面返回时重新读取，使后台权限变更在下次进入时生效。 */
onShow(() => { if (props.active) loadCategories() })
watch(() => [user.userId, user.dealerId], () => {
  generation += 1
  loading.value = false
  categoryTree.value = []
  scopeEmpty.value = false
  if (props.active && user.userId) loadCategories()
})
</script>
