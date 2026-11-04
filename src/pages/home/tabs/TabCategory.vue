<template><AppCategoryBrowser :active="active" :categories="categoryTree" :loading="loading" :failed="failed" :load-products="getGoodsList" @refresh="loadCategories" @product="openProduct" @category="openCategory" /></template>
<script setup>
import { ref, watch } from 'vue'
import AppCategoryBrowser from '@/shared/ui/AppCategoryBrowser/AppCategoryBrowser.vue'
import { getCategoryList, getGoodsList } from '@/shared/api/product.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
const props = defineProps({ active: { type: Boolean, default: false } })
const categoryTree = ref([]), loading = ref(false), failed = ref(false), initialized = ref(false)
/** 经销商分类仍从原登录接口读取，展示由通用三级组件承载。 */
async function loadCategories() { if (loading.value) return; loading.value = true; failed.value = false; try { const result = await getCategoryList(); categoryTree.value = Array.isArray(result) ? result.filter(item => item?.id != null && item?.name) : [] } catch { failed.value = true; categoryTree.value = [] } finally { loading.value = false; initialized.value = true } }
/** 经销商商品跳转继续使用原路由。 */
function openProduct(id) { return navigator.navigateTo(routes.commerce.productDetail(id)) }
/** 分类列表继续使用经销商目录筛选。 */
function openCategory(id) { return navigator.navigateTo(routes.commerce.productList({ categoryId: id })) }
watch(() => props.active, value => { if (value && !initialized.value) loadCategories() }, { immediate: true })
</script>
