<template>
  <AppPageShell>
    <template #header>
      <AppCatalogHeader v-model:keyword="keyword" :search-entry="!isSearchPage" @search-entry="openSearchPage()" :keyword-committed="keywordCommitted" :show-cart="false" :show-tools="isSearchPage && browseMode === 'results'" :show-result-count="true" :total="totalCount" :show-sort="false" :filter-count="Number(!!categoryId)+Number(hasImage)" @filter="filterVisible=true"
        :placeholder="t('share.stock.search')" @search="search" @clear-keyword="clearKeyword" @edit-keyword="keywordCommitted = false; browseMode = 'search'" :auto-focus="isSearchPage && browseMode === 'search'" @back="resetQuery" />
    </template>
    <template #content>
      <ShareCatalogBrowser :mode="browseMode" :categories="categories" :products="items" :category-id="categoryId" :keyword="committedKeyword" :has-image="hasImage" :total="totalCount" :loading="loading" :failed="failed" :has-more="hasMore" :refreshing="refreshing" @category="selectCategory" @product="openProduct" @more="more" @refresh="refresh" @search="suggestedSearch" :load-products="loadPreviews" @results="openSearchPage($event)" />
    </template>
    <template #overlay><ShareCatalogFilters v-if="isSearchPage" :visible="filterVisible" :categories="categories" :category-id="categoryId" :has-image="hasImage" @close="filterVisible=false" @apply="applyFilters" /></template>
  </AppPageShell>
</template>
<script setup>
import { ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppCatalogHeader from '@/shared/ui/AppCatalogHeader/AppCatalogHeader.vue'
import ShareCatalogFilters from '../../components/ShareCatalogFilters.vue'
import ShareCatalogBrowser from '../../components/ShareCatalogBrowser.vue'
import { getPublicStockList } from '../../api/publicStockApi.js'
import { t } from '@/shared/i18n/index.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { registerShareLocales } from '../../i18n/register.js'
import { usePublicStockCatalog } from '../../composables/usePublicStockCatalog.js'
import { getPublicStockAccess, setPublicStockAccess } from '../../model/publicStockAccess.js'

registerShareLocales()
const isSearchPage = ref(false)
const browseMode = ref('categories')
const keyword = ref(''), committedKeyword = ref(''), keywordCommitted = ref(false)
const categoryId = ref(null), refreshing = ref(false), hasImage=ref(false), filterVisible=ref(false)
const { categories, items, loading, failed, hasMore, totalCount, load, dispose } = usePublicStockCatalog()
let firstShow = true

/** 分类、分页只使用已提交关键词，共用视图不改变独立接口和凭据。 */
function reload(refreshCategories = false) { return load({ keyword: committedKeyword.value, categoryId: categoryId.value, ...(hasImage.value ? {hasImage:true} : {}) }, { refreshCategories: refreshCategories === true }) }
/** 筛选确认后重置页码并进入真实查询结果。 */
function applyFilters(value){categoryId.value=value.categoryId;hasImage.value=value.hasImage;browseMode.value='results';return reload()}
/** 提交搜索并显示 APP 关键词胶囊，重置分页和右侧滚动。 */
function search() { if (loading.value) return; browseMode.value = 'results'; committedKeyword.value = keyword.value.trim().slice(0, 60); keyword.value = committedKeyword.value; keywordCommitted.value = !!committedKeyword.value; return reload() }
/** 清空关键词后重新加载当前分类。 */
function clearKeyword() { keyword.value = ''; return search() }
/** 顶部返回只重置当前查询，不跨越链接用途。 */
function resetQuery() { if (isSearchPage.value) return navigator.back(); browseMode.value = 'categories'; keyword.value = ''; committedKeyword.value = ''; keywordCommitted.value = false; return reload() }
/** 分类名建议也走当前库存链接查询。 */
function suggestedSearch(value) { keyword.value = value; return search() }
/** 切换独立公开分类，使用原已提交关键词。 */
function selectCategory(id) { if (categoryId.value === id) return; categoryId.value = id; return reload() }
/** 分页沿用原查询条件，不因输入草稿变化提交新条件。 */
function more() { return load({}, { append: true }) }
/** 下拉刷新重新核验分类及授权凭据。 */
async function refresh() { if (refreshing.value) return; refreshing.value = true; try { await reload(true) } finally { refreshing.value = false } }
/** 查询详情保持原 token 和期限，不进入采购商品详情。 */
function openProduct(id) { return navigator.navigateTo(routes.share.publicStockDetail(id, getPublicStockAccess())) }

/** 查询独立页面保留库存链接用途和返回栈。 */
function openSearchPage(id) { return navigator.navigateTo(routes.share.publicStockSearch(getPublicStockAccess(), id)) }
/** 分类预览只调用当前库存链接的独立接口。 */
async function loadPreviews(query) { const page = await getPublicStockList(query); return { ...page, items: page.items.map(item => ({ ...item, name: item.productName, code: item.productCode, image: item.imageUrl })) } }
onLoad(query => { isSearchPage.value = String(getCurrentPages().at(-1)?.route || '').endsWith('/search'); browseMode.value = isSearchPage.value ? (query?.categoryId ? 'results' : 'search') : 'categories'; categoryId.value = query?.categoryId || null; setPublicStockAccess(query?.access, query?.expires); reload(true) })
onShow(() => { if (firstShow) firstShow = false; else reload(true) })
onUnload(dispose)
</script>
