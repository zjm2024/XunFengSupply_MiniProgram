<template><AppCategoryBrowser :active="active" :categories="categoryTree" :loading="loading" :failed="failed" :load-products="getGoodsList" @refresh="loadCategories" @product="openProduct" @category="openCategory" /></template>
<script setup>
import { ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppCategoryBrowser from '@/shared/ui/AppCategoryBrowser/AppCategoryBrowser.vue'
import { getNavigationCategoryList, getGoodsList } from '@/shared/api/product.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
const props = defineProps({ active: { type: Boolean, default: false } })
const categoryTree = ref([]), loading = ref(false), failed = ref(false)
/** 导航页独立读取主体权限分类，失败不回退到公共分类树。 */
async function loadCategories() {
  if (loading.value) return
  loading.value = true
  failed.value = false
  categoryTree.value = []
  try {
    const result = await getNavigationCategoryList()
    categoryTree.value = Array.isArray(result) ? result.filter(item => item?.id != null && item?.name) : []
  } catch {
    failed.value = true
    categoryTree.value = []
  } finally { loading.value = false }
}
/** 经销商商品跳转继续使用原路由。 */
function openProduct(id) { return navigator.navigateTo(routes.commerce.productDetail(id)) }
/** 分类列表继续使用经销商目录筛选。 */
function openCategory(id) { return navigator.navigateTo(routes.commerce.productList({ categoryId: id })) }
watch(() => props.active, value => { if (value) loadCategories() }, { immediate: true })
/** 从其他页面返回时重新读取，使后台权限变更在下次进入时生效。 */
onShow(() => { if (props.active) loadCategories() })
</script>
