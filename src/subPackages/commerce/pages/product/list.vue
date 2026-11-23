<template>
  <view class="page">
    <AppCatalogHeader
      v-model:keyword="keyword"
      :cart-count="cartCount"
      :total="total"
      :sort-key="sortKey"
      :filter-count="activeFilterCount"
      :auto-focus="searchMode"
      :placeholder="t('main.search.placeholder')"
      :keyword-committed="keywordCommitted"
      :show-cart="!searchMode"
      :show-tools="showCatalogTools"
      :category-label="activeCategoryPath.length ? activeCategoryPath[activeCategoryPath.length - 1].name : t('commerce.titles.category')"
      :category-active="activeCategoryPath.length > 0"
      :stock-filter-label="activeStockFilterLabel"
      @back="goBack"
      @cart="goToCart"
      @search="handleSearch"
      @clear-keyword="clearKeyword"
      @edit-keyword="startKeywordEditing"
      @sort="handleQuickSort"
      @filter="filterDrawerVisible = true"
      @remove-filter="removeFilter"
      @clear-filters="clearFilters"
    />

    <!-- 可滚动区域：商品列表 -->
    <view class="product-content">
      <view v-if="isRefreshing" class="product-refresher-indicator" :aria-label="t('commerce.catalog.refreshing')">
        <AppIcon name="refresh" :size="20" color="#737A84" />
      </view>
      <scroll-view
        class="page-scroll"
        scroll-y
        scroll-with-animation
        :scroll-top="listScrollTop"
        @scroll="handleListScroll"
        @scrolltolower="loadMore"
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        refresher-background="#F4F5F8"
        refresher-default-style="none"
        @refresherrefresh="handleRefresh"
        @refresherrestore="handleRefresherRestore"
        @refresherabort="handleRefresherRestore"
        enhanced
        enable-back-to-top
      >
        <view class="scroll-inner">
      <ProductSearchLanding
        v-if="showSearchLanding"
        :history="searchHistory"
        :recommendations="searchRecommendations"
        @search="runSuggestedSearch"
        @clear-history="clearSearchHistory"
      />
      <template v-else>
      <!-- 加载状态 -->
      <AppPageState v-if="loading && products.length === 0" state="loading" />

      <!-- 空状态 -->
      <view v-else-if="!loading && products.length === 0" class="empty-state">
        <view class="empty-illustration">
          <AppSvgIllustration :svg="noSearchResultSvg" size="lg" />
        </view>
        <text class="empty-text">{{ scopeEmpty ? t('commerce.catalog.scopeEmpty') : searchMode ? t('commerce.catalog.notFound') : t('commerce.catalog.empty') }}</text>
        <text v-if="!scopeEmpty" class="empty-subtext">
          {{ searchMode ? t('commerce.catalog.notFoundHint', { keyword }) : t('commerce.catalog.emptyHint') }}
        </text>
      </view>

      <!-- 商品网格 -->
      <view v-else class="product-grid">
        <AppProductCard
          v-for="item in products"
          :key="item.productId"
          :id="'catalog-product-' + item.productId"
          :product="item"
          :show-image-stock-badge="false"
          @click="goToDetail(item)"
        />
      </view>

      <AppLoadMore
        v-if="products.length > 0"
        :status="loadMoreStatus"
        @retry="loadMore"
      />
      </template>
        </view>
      </scroll-view>
    </view>

    <view
      class="back-to-top"
      :class="{ 'is-visible': showBackToTop && !showSearchLanding }"
      hover-class="back-to-top--pressed"
      @click="scrollToTop"
    >
      <AppIcon name="chevron-up" :size="20" :stroke-width="2.2" />
      <text class="back-to-top-label">{{ t('commerce.catalog.top') }}</text>
    </view>

    <ProductFilterDrawer
      :visible="filterDrawerVisible"
      :category-tree="categoryTree"
      :category-path="activeCategoryPath"
      :stock-filter="stockFilter"
      :sort-key="sortKey"
      @close="filterDrawerVisible = false"
      @apply="applyFilters"
    />
  </view>
</template>

<script setup>
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import { waitForPaginationResult } from '@/shared/utils/refreshAnimation.js'

import { t, getLocale } from '@/shared/i18n/index.js'
import '@/subPackages/commerce/i18n/register.js'
import { ref, computed, watch, onMounted, getCurrentInstance } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { useCart } from '@/shared/composables/useCart.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { navigator } from '../../../../app/navigation/navigator.js'
import { routes } from '../../../../app/config/routes.js'
import { getEmptyProductScope } from '@/shared/api/product.js'
import { getCategoryList, getGoodsList, getGoodsDetail } from '../../api/productApi.js'
import AppIcon from '../../../../shared/ui/AppIcon/AppIcon.vue'
import AppCatalogHeader from '../../../../shared/ui/AppCatalogHeader/AppCatalogHeader.vue'
import AppProductCard from '../../../../shared/ui/AppProductCard/AppProductCard.vue'
import ProductFilterDrawer from '../../components/ProductFilterDrawer/ProductFilterDrawer.vue'
import ProductSearchLanding from '../../components/ProductSearchLanding/ProductSearchLanding.vue'
import AppSvgIllustration from '../../../../shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppLoadMore from '../../../../shared/ui/AppLoadMore/AppLoadMore.vue'
import noSearchResultSvg from '../../../../shared/assets/illustrations/no-search-result.svg?raw'
import { waitForRefreshAnimation } from '../../../../shared/utils/refreshAnimation.js'
import storage from '@/shared/utils/storage.js'

const SORT_QUERY = Object.freeze({
  default: { field: '', order: '', /** 仅翻译排序显示名。 */ get label() { return t('commerce.catalog.default') } },
  latest: { field: 'createdAt', order: 'desc', /** 仅翻译排序显示名。 */ get label() { return t('commerce.catalog.latest') } },
  priceAsc: { field: 'price', order: 'asc', /** 仅翻译排序显示名。 */ get label() { return t('commerce.catalog.priceAsc') } },
  priceDesc: { field: 'price', order: 'desc', /** 仅翻译排序显示名。 */ get label() { return t('commerce.catalog.priceDesc') } },
  stockDesc: { field: 'stock', order: 'desc', /** 仅翻译排序显示名。 */ get label() { return t('commerce.catalog.stockDesc') } },
  stockAsc: { field: 'stock', order: 'asc', /** 仅翻译排序显示名。 */ get label() { return t('commerce.catalog.stockAsc') } },
})

const STOCK_FILTER_LABELS = Object.freeze({
  /** 仅翻译筛选显示名。 */ get inStock() { return t('commerce.catalog.inStock') },
  /** 仅翻译筛选显示名。 */ get lowStock() { return t('commerce.catalog.lowStock') },
  /** 仅翻译筛选显示名。 */ get outOfStock() { return t('commerce.catalog.outOfStock') },
})

const QUERY_SNAPSHOT_KEY = 'product_query_snapshot'
const QUERY_SNAPSHOT_MAX_AGE = 30 * 60 * 1000
const SEARCH_HISTORY_KEY = 'commerce.product.search.history'
const SEARCH_HISTORY_LIMIT = 10


const { cartStore, loadCart } = useCart()
const user = useUserStore()
const catalogPrincipal = computed(() => `${user.dealerId || ''}.${user.userId || ''}`)

const catalogScope = computed(() => JSON.stringify([String(user.dealerId || ''), String(user.userId || ''),
  [...(user.permissions || [])].sort(), user.isMainAccount, user.accountStatus, user.dealerStatus, getLocale()]))

const keyword = ref('')
const searchMode = ref(false)
const scopeEmpty = ref(false)
const hasSearched = ref(false)
const keywordCommitted = ref(false)
const searchHistory = ref([])
const searchRecommendations = ref([])
const activeCategoryId = ref(null)
const categoryTree = ref([])
const activeCategoryPath = ref([])
const stockFilter = ref('')
const sortKey = ref('default')
const filterDrawerVisible = ref(false)

// 商品列表
const products = ref([])
const loading = ref(false)
const isRefreshing = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const hasMore = ref(true)
const loadMoreError = ref(false)
const listScrollTop = ref(0)
const showBackToTop = ref(false)
let currentListScrollTop = 0
let productRequestId = 0
let categoryRequestId = 0
const catalogInstance = getCurrentInstance()
const PRODUCT_MAX_AGE = 60 * 1000
const verifiedProducts = new Map()
let freshnessRequest = null
let freshnessGeneration = 0
let catalogVisible = true
let lastViewedProductId = null
let nextFreshnessCheck = 0

/** 按实际卡片与滚动容器交集选取当前屏，查询能力不可用时仅校验刚访问的商品。 */
async function visibleProductIds() {
  const fallback = lastViewedProductId == null ? [] : [String(lastViewedProductId)]
  if (!catalogInstance?.proxy || typeof uni?.createSelectorQuery !== 'function') return fallback
  return new Promise(resolve => {
    const query = uni.createSelectorQuery().in(catalogInstance.proxy)
    query.select('.page-scroll').boundingClientRect()
    query.selectAll('.app-product-card').fields({ rect: true, id: true })
    query.exec(([viewport, cards]) => {
      if (!viewport || !Array.isArray(cards)) { resolve(fallback); return }
      resolve([...new Set([...cards.filter(card => card.bottom > viewport.top && card.top < viewport.bottom)
        .map(card => String(card.id || '').replace(/^catalog-product-/, '')), ...fallback])].filter(Boolean))
    })
  })
}

/** 可见商品按ID静默校验，保留原数组顺序、筛选、分页及滚动位置。 */
async function refreshVisibleProducts(force = false) {
  if (!catalogVisible || loading.value || freshnessRequest || !products.value.length) return freshnessRequest
  if (!force && Date.now() < nextFreshnessCheck) return
  nextFreshnessCheck = Date.now() + 5000
  const ticket = freshnessGeneration
  const queryTicket = productRequestId
  const task = (async () => {
    const ids = await visibleProductIds()
    for (const id of ids) {
      if (ticket !== freshnessGeneration || queryTicket !== productRequestId || !catalogVisible) return
      if (Date.now() - (verifiedProducts.get(id) ?? 0) < PRODUCT_MAX_AGE) continue
      try {
        const result = await getGoodsDetail(id)
        if (ticket !== freshnessGeneration || queryTicket !== productRequestId || !catalogVisible) return
        if (!result || String(result.productId) !== id) continue
        const index = products.value.findIndex(item => String(item.productId) === id)
        if (index >= 0) products.value[index] = result
        verifiedProducts.set(id, Date.now())
      } catch (error) {
        if (ticket !== freshnessGeneration || queryTicket !== productRequestId) return
        console.warn('[ProductList] 可见商品校验失败，保留当前展示')
      }
    }
  })().catch(() => { console.warn('[ProductList] 无法读取可见商品，等待下次校验') }).finally(() => { if (freshnessRequest === task) freshnessRequest = null })
  freshnessRequest = task
  return task
}

// 购物车数量
const cartCount = computed(() => cartStore.cartBadgeCount)

// 计算是否还有更多
const canLoadMore = computed(() => hasMore.value && !loading.value)
const loadMoreStatus = computed(() => {
  if (loading.value && products.value.length > 0) return 'loading'
  if (loadMoreError.value) return 'error'
  if (!hasMore.value && products.value.length > 0) return 'no-more'
  return 'idle'
})
const activeSort = computed(() => SORT_QUERY[sortKey.value] || SORT_QUERY.default)
const activeStockFilterLabel = computed(() => STOCK_FILTER_LABELS[stockFilter.value] || '')
const activeFilterCount = computed(() => Number(activeCategoryPath.value.length > 0) + Number(Boolean(stockFilter.value)))
const showSearchLanding = computed(() => searchMode.value && !hasSearched.value)
const showCatalogTools = computed(() => {
  if (showSearchLanding.value) return false
  if (!searchMode.value) return true
  return loading.value || products.value.length > 0
})

watch([showSearchLanding, activeCategoryId, stockFilter], async ([visible, categoryId, stock], _, onCleanup) => {
  if (!visible) return
  let active = true
  onCleanup(() => { active = false })
  searchRecommendations.value = []
  try {
    const { items = [] } = await getGoodsList({ pageNum: 1, pageSize: 8, categoryId, stockFilter: stock || undefined })
    if (!active) return
    const suggestions = new Map()
    for (const item of items) {
      const keyword = String(item.code || '').trim()
      if (!keyword || suggestions.has(keyword)) continue
      suggestions.set(keyword, { keyword, label: String(item.name || '').trim() || keyword })
      if (suggestions.size === 4) break
    }
    searchRecommendations.value = [...suggestions.values()]
  } catch {
    // 推荐为空时仍可直接搜索。
  }
})

watch(keyword, value => {
  if (searchMode.value && hasSearched.value && !value.trim()) {
    resetSearchLanding()
  }
})

onLoad((options = {}) => {
  keyword.value = decodeRouteValue(options.keyword)
  searchMode.value = options.mode === 'search'
  hasSearched.value = !searchMode.value || Boolean(keyword.value.trim())
  keywordCommitted.value = Boolean(keyword.value.trim())
  activeCategoryId.value = options.categoryId ?? null
  // 显式搜索/分类入口优先；普通目录重建时恢复短时筛选，重新读取第一页。
  if (Object.keys(options).length === 0 && user.userId && user.dealerId) {
    const saved = storage.getSnapshot(QUERY_SNAPSHOT_KEY, catalogScope.value, QUERY_SNAPSHOT_MAX_AGE)
    if (saved && typeof saved.keyword === 'string' && saved.keyword.length <= 200
      && ['string', 'number'].includes(typeof saved.categoryId) && SORT_QUERY[saved.sortKey]
      && ['', 'inStock', 'lowStock', 'outOfStock'].includes(saved.stockFilter)) {
      keyword.value = saved.keyword
      activeCategoryId.value = saved.categoryId || null
      sortKey.value = saved.sortKey
      stockFilter.value = saved.stockFilter
      keywordCommitted.value = Boolean(saved.keyword)
    }
  }
  loadSearchHistory()
})

/** 只保存筛选意图，不保存报价、库存、权限、分页数组或已失效主体的数据。 */
function saveQuerySnapshot() {
  if (!user.userId || !user.dealerId || loading.value || !hasSearched.value || searchMode.value) return
  storage.setSnapshot(QUERY_SNAPSHOT_KEY, catalogScope.value, {
    keyword: keyword.value.trim().slice(0, 200), categoryId: activeCategoryId.value ?? '',
    sortKey: sortKey.value, stockFilter: stockFilter.value,
  })
}
onHide(() => { saveQuerySnapshot(); catalogVisible = false; freshnessGeneration++ })
onUnload(() => { catalogVisible = false; freshnessGeneration++; saveQuerySnapshot(); productRequestId++; categoryRequestId++ })

onMounted(async () => {
  if (showSearchLanding.value) return
  await Promise.all([
    loadCategories(),
    loadProducts()
  ])
})

onShow(() => {
  catalogVisible = true
  void refreshVisibleProducts(true)
  loadCart({ silent: true }).catch(() => {})
})

watch(catalogScope, () => {
  freshnessGeneration++
  verifiedProducts.clear()
  productRequestId += 1
  categoryRequestId += 1
  products.value = []
  categoryTree.value = []
  stockFilter.value = ''
  sortKey.value = 'default'
  scrollToTop()
  activeCategoryId.value = null
  activeCategoryPath.value = []
  keyword.value = ''
  scopeEmpty.value = false
  loading.value = false
  total.value = 0
  page.value = 1
  hasMore.value = false
  hasSearched.value = false
  loadSearchHistory()
  if (user.userId && user.dealerId) {
    loadCategories()
    if (!searchMode.value) loadProducts()
  }
})

// 加载分类数据
async function loadCategories() {
  const request = ++categoryRequestId
  try {
    const list = await getCategoryList()
    if (request !== categoryRequestId) return
    categoryTree.value = Array.isArray(list) ? list : []
    activeCategoryPath.value = findCategoryPath(categoryTree.value, activeCategoryId.value) || []
  } catch (err) {
    if (request !== categoryRequestId) return
    console.error('[ProductList] 加载分类失败:', err)
    categoryTree.value = []
    activeCategoryPath.value = []
  }
}

// 加载商品列表
async function loadProducts(isLoadMore = false) {
  if (searchMode.value && !keyword.value.trim()) return
  if (isLoadMore && loading.value) return
  if (isLoadMore && !hasMore.value) return

  const requestId = ++productRequestId
  if (!isLoadMore) scopeEmpty.value = false
  const targetPage = isLoadMore ? page.value + 1 : 1
  loading.value = true
  if (isLoadMore) loadMoreError.value = false

  try {
    const params = {
      pageNum: targetPage,
      pageSize: pageSize.value
    }

    if (activeCategoryId.value !== null && activeCategoryId.value !== '') {
      params.categoryId = activeCategoryId.value
    }

    if (keyword.value.trim()) {
      params.keyword = keyword.value.trim()
    }

    if (stockFilter.value) {
      params.stockFilter = stockFilter.value
    }

    if (activeSort.value.field) {
      params.sortField = activeSort.value.field
      params.sortOrder = activeSort.value.order
    }

    const res = await waitForPaginationResult(getGoodsList(params), isLoadMore)
    if (requestId !== productRequestId) return

    if (res) {
      const { items, totalCount } = res
      for (const item of items || []) verifiedProducts.set(String(item.productId), Date.now())

      if (isLoadMore) {
        products.value = [...products.value, ...(items || [])]
        page.value = targetPage
      } else {
        products.value = items || []
        page.value = 1
        if (!products.value.length) {
          const empty = await getEmptyProductScope().catch(() => false)
          if (requestId !== productRequestId) return
          scopeEmpty.value = empty === true
        }
        if (searchMode.value && params.keyword && products.value.length) saveSearchKeyword(params.keyword)
      }

      total.value = totalCount || 0
      hasMore.value = products.value.length < total.value
      loadMoreError.value = false
    }
  } catch (err) {
    if (requestId !== productRequestId) return
    console.error('[ProductList] 加载商品列表失败:', err)
    if (!isLoadMore) {
      products.value = []
    } else {
      loadMoreError.value = true
    }
    uni.showToast({
      title: t('commerce.catalog.loadFailed'),
      icon: 'none'
    })
  } finally {
    if (requestId === productRequestId) {
      loading.value = false
    }
  }
}

// 加载更多
function loadMore() {
  if (showSearchLanding.value) return
  if (canLoadMore.value) {
    loadProducts(true)
  }
}

// 搜索
async function handleSearch() {
  const normalizedKeyword = keyword.value.trim()
  if (searchMode.value && !normalizedKeyword) {
    resetSearchLanding()
    return
  }

  keyword.value = normalizedKeyword
  keywordCommitted.value = Boolean(normalizedKeyword)
  if (searchMode.value) {
    hasSearched.value = true
  }

  if (!categoryTree.value.length) {
    await loadCategories()
  }
  refreshProducts()
}

function handleListScroll(event) {
  const st = Number(event?.detail?.scrollTop) || 0
  currentListScrollTop = st
  showBackToTop.value = st > 300
  if (!freshnessRequest) void refreshVisibleProducts()
}

function scrollToTop() {
  listScrollTop.value = -1
  setTimeout(() => {
    listScrollTop.value = 0
  }, 0)
}

function clearKeyword() {
  if (!keyword.value) return
  keyword.value = ''
  if (searchMode.value) {
    resetSearchLanding()
    return
  }
  refreshProducts()
}

function startKeywordEditing() {
  keywordCommitted.value = false
}

function runSuggestedSearch(value) {
  keyword.value = String(value || '').trim()
  handleSearch()
}

function loadSearchHistory() {
  try {
    const stored = uni.getStorageSync(`${SEARCH_HISTORY_KEY}.${catalogPrincipal.value}`)
    searchHistory.value = Array.isArray(stored) ? stored.filter(Boolean).slice(0, SEARCH_HISTORY_LIMIT) : []
  } catch (_) {
    searchHistory.value = []
  }
}

function saveSearchKeyword(value) {
  if (!value) return
  const nextHistory = [value, ...searchHistory.value.filter(item => item !== value)].slice(0, SEARCH_HISTORY_LIMIT)
  searchHistory.value = nextHistory
  try {
    uni.setStorageSync(`${SEARCH_HISTORY_KEY}.${catalogPrincipal.value}`, nextHistory)
  } catch (_) {}
}

function clearSearchHistory() {
  searchHistory.value = []
  try {
    uni.removeStorageSync(`${SEARCH_HISTORY_KEY}.${catalogPrincipal.value}`)
  } catch (_) {}
}

function resetSearchLanding() {
  productRequestId += 1
  loading.value = false
  products.value = []
  total.value = 0
  page.value = 1
  hasMore.value = false
  hasSearched.value = false
  keywordCommitted.value = false
  scrollToTop()
}

function handleQuickSort(type) {
  if (type === 'price') {
    sortKey.value = sortKey.value === 'priceAsc' ? 'priceDesc' : 'priceAsc'
  } else if (type === 'stock') {
    sortKey.value = sortKey.value === 'stockDesc' ? 'stockAsc' : 'stockDesc'
  } else {
    sortKey.value = type
  }
  refreshProducts()
}

function applyFilters(filters) {
  activeCategoryPath.value = Array.isArray(filters.categoryPath) ? filters.categoryPath : []
  activeCategoryId.value = activeCategoryPath.value[activeCategoryPath.value.length - 1]?.id ?? null
  stockFilter.value = filters.stockFilter || ''
  sortKey.value = SORT_QUERY[filters.sortKey] ? filters.sortKey : 'default'
  filterDrawerVisible.value = false
  refreshProducts()
}

function removeFilter(type) {
  if (type === 'category') {
    activeCategoryId.value = null
    activeCategoryPath.value = []
  }
  if (type === 'stock') stockFilter.value = ''
  if (type === 'sort') sortKey.value = 'default'
  refreshProducts()
}

function clearFilters() {
  activeCategoryId.value = null
  activeCategoryPath.value = []
  stockFilter.value = ''
  refreshProducts()
}

function refreshProducts() {
  page.value = 1
  hasMore.value = true
  loadMoreError.value = false
  scrollToTop()
  return loadProducts(false)
}

async function handleRefresh() {
  if (isRefreshing.value) return
  const startedAt = Date.now()
  isRefreshing.value = true
  try {
    if (!showSearchLanding.value) await refreshProducts()
  } finally {
    await waitForRefreshAnimation(startedAt)
    isRefreshing.value = false
  }
}

function handleRefresherRestore() {
  if (!loading.value) isRefreshing.value = false
}

function findCategoryPath(nodes, targetId, path = []) {
  if (targetId === null || targetId === undefined || targetId === '') return []
  for (const category of nodes) {
    const nextPath = [...path, category]
    if (String(category.id) === String(targetId)) return nextPath
    const childPath = findCategoryPath(category.children || [], targetId, nextPath)
    if (childPath) return childPath
  }
  return null
}

function decodeRouteValue(value) {
  if (value === undefined || value === null) return ''
  try {
    return decodeURIComponent(String(value))
  } catch (_) {
    return String(value)
  }
}

// 导航方法
function goBack() {
  navigator.back()
}

function goToCart() {
  navigator.navigateTo(routes.commerce.cart())
}

function goToDetail(item) {
  lastViewedProductId = item.productId
  if (item && item.productId) {
    navigator.navigateTo(routes.commerce.productDetail(item.productId))
  }
}
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  overflow: hidden;
  background: var(--surface-page, #F4F5F8);
  display: flex;
  flex-direction: column;
}

.catalog-header {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(17, 18, 22, .045);
  background: #f4f5f7;
}

.header-content {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 8px 12px 10px;
  box-sizing: border-box;
}

.product-content {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.product-refresher-indicator {
  position: absolute;
  z-index: 3;
  top: 10px;
  left: 50%;
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--surface-card, #FFFFFF);
  box-shadow: 0 2px 8px rgba(34, 37, 42, .08);
  transform: translateX(-50%);
  animation: product-refresher-spin 900ms linear infinite;
}

@keyframes product-refresher-spin {
  to { transform: translateX(-50%) rotate(360deg); }
}

.page-scroll {
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  background: var(--surface-page, #F4F5F8);
}

.scroll-inner {
  width: 100%;
  margin: 0 auto;
  padding: 12px var(--page-content-gutter, 16px) 28px;
  box-sizing: border-box;
}

.back-to-top {
  position: fixed;
  z-index: 150;
  right: 18px;
  bottom: calc(22px + env(safe-area-inset-bottom));
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  box-sizing: border-box;
  border: 1px solid rgba(215, 25, 45, .14);
  border-radius: 50%;
  color: #c51b2c;
  background: rgba(255, 255, 255, .94);
  box-shadow: 0 6px 18px rgba(34, 37, 42, .1);
  opacity: 0;
  pointer-events: none;
  transform: translateY(8px) scale(.94);
  transition: opacity .18s ease, transform .18s ease;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.back-to-top.is-visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}

.back-to-top--pressed {
  opacity: .72;
  transform: scale(.95);
}

.back-to-top-label {
  margin-top: 1px;
  font-size: var(--type-caption-size, 12px);
  line-height: 18px;
}

.search-nav,
.catalog-back-button,
.catalog-cart-button,
.search-clear,
.search-submit,
.quick-sort-bar,
.quick-sort-item,
.sort-direction,
.quick-filter-row,
.active-filter-list,
.category-filter-chip,
.active-filter-tag,
.clear-filter-button {
  display: flex;
  align-items: center;
}

.search-nav {
  gap: 9px;
}

.catalog-back-button,
.catalog-cart-button {
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  justify-content: center;
  border-radius: 50%;
  color: #22252a;
  background: #e7e8eb;
}

.catalog-cart-button {
  color: #4f545c;
  background: rgba(231, 232, 235, .78);
}

.header-button--pressed {
  opacity: .66;
  transform: scale(.95);
}

.cart-count-badge {
  position: absolute;
  top: -1px;
  right: -2px;
  display: grid;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  box-sizing: border-box;
  place-items: center;
  border: 2px solid #f4f5f7;
  border-radius: var(--radius-small, 8px);
  color: #fff;
  font-size: var(--badge-font-size, 11px);
  font-weight: var(--font-weight-bold, 700);
  background: #d7192d;
}

.search-box {
  min-width: 0;
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding-left: 14px;
  overflow: hidden;
  background: #e7e8eb;
  border: 1px solid transparent;
  border-radius: 24px;
  box-sizing: border-box;

  .search-icon {
    width: 19px;
    height: 19px;
    color: #8c919b;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: none;
    background: transparent;
    font-size: var(--type-body-small-size, 13px);
    color: #111216;

    &::placeholder {
      color: #a8adb5;
    }
  }
}

.search-clear {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  justify-content: center;
  border-radius: 50%;
  color: #777c85;
  background: rgba(93, 98, 108, .09);
}

.search-submit {
  height: 30px;
  flex-shrink: 0;
  justify-content: center;
  padding: 0 15px;
  border-left: 1px solid rgba(77, 81, 89, .1);
  color: #24272c;
  font-size: var(--type-body-small-size, 13px);
  font-weight: var(--font-weight-semibold, 600);
}

.search-submit--pressed,
.quick-sort-item--pressed {
  opacity: .58;
}

.quick-sort-bar {
  height: 48px;
  justify-content: space-between;
  margin-top: 5px;
}

.quick-sort-item {
  position: relative;
  height: 100%;
  min-width: 54px;
  justify-content: center;
  gap: 3px;
  color: #656a72;
  font-size: var(--type-body-small-size, 13px);
}

.quick-sort-item.is-active {
  color: #17191d;
  font-weight: var(--font-weight-bold, 700);
}

.quick-sort-item.is-active::after {
  position: absolute;
  bottom: 3px;
  left: 50%;
  width: 18px;
  height: 2px;
  border-radius: 2px;
  background: #d7192d;
  content: '';
  transform: translateX(-50%);
}

.sort-direction {
  flex-direction: column;
  color: #afb2b8;
  font-size: var(--sort-glyph-size, 6px);
  line-height: 7px;
}

.sort-direction .is-active {
  color: #d7192d;
}

.filter-entry {
  gap: 5px;
}

.filter-entry.is-active {
  color: #c6192b;
}

.filter-count {
  display: grid;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  box-sizing: border-box;
  place-items: center;
  border-radius: var(--radius-small, 8px);
  color: #fff;
  font-size: var(--badge-font-size, 11px);
  font-weight: var(--font-weight-bold, 700);
  background: #d7192d;
}

.quick-filter-row {
  min-width: 0;
  gap: 10px;
}

.active-filter-scroll {
  min-width: 0;
  flex: 1;
  white-space: nowrap;
}

.active-filter-list {
  width: max-content;
  gap: 8px;
  padding: 1px 0;
}

.category-filter-chip,
.active-filter-tag {
  min-height: 32px;
  box-sizing: border-box;
  border-radius: var(--radius-feature, 18px);
  font-size: var(--type-caption-size, 12px);
  background: #e7e8eb;
}

.category-filter-chip {
  max-width: 180px;
  gap: 5px;
  padding: 0 12px;
  color: #34373d;
}

.category-filter-chip text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.active-filter-tag {
  gap: 5px;
  padding: 0 11px;
  border: 1px solid rgba(215, 25, 45, .1);
  color: #bd1728;
  background: rgba(215, 25, 45, .065);
}

.clear-filter-button {
  min-height: 32px;
  padding: 0 5px;
  color: #858a93;
  font-size: var(--type-caption-size, 12px);
}

.result-count {
  flex-shrink: 0;
  color: #969aa2;
  font-size: var(--type-caption-size, 12px);
  white-space: nowrap;
}

@media screen and (max-width: 380px) {
  .header-content {
    padding-right: 9px;
    padding-left: 9px;
  }

  .search-nav {
    gap: 6px;
  }

  .catalog-back-button,
  .catalog-cart-button {
    width: 40px;
    height: 40px;
  }

  .search-box {
    height: 40px;
    padding-left: 11px;
  }

  .search-submit {
    padding: 0 11px;
  }

  .quick-sort-item {
    min-width: 48px;
    font-size: var(--type-caption-size, 12px);
  }
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 10px;
}

.empty-state {
  min-height: 48vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}







.empty-state {
  width: 100%;
  max-width: 430px;
  min-height: 260px;
  margin: 24px auto 0;
  padding: 42px 28px;
  box-sizing: border-box;
  border-radius: var(--radius-feature, 18px);
  text-align: center;
  background: transparent;
}

.empty-illustration {
  margin-bottom: 16px;
}

.empty-text {
  font-size: var(--type-card-title-size, 16px);
  line-height: 24px;
  color: #555a63;
  font-weight: var(--font-weight-semibold, 600);
}

.empty-subtext {
  margin-top: 6px;
  padding: 0 24px;
  font-size: var(--type-body-small-size, 13px);
  line-height: 20px;
  color: #a2a6ad;
}

.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px 0;
  gap: 8px;
}

.load-more-text,
.no-more-text {
  font-size: var(--type-caption-size, 12px);
  color: #a4a8af;
}

.no-more {
  text-align: center;
  padding: 24px 0 8px;
}

@media screen and (min-width: 600px) {
  .product-grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 14px;
  }

}

@media screen and (min-width: 768px) {
  .header-content {
    padding: 10px 28px 14px;
  }

  .scroll-inner {
    padding-top: 18px;
    padding-bottom: 40px;
  }

  .back-to-top {
    right: 32px;
    bottom: calc(30px + env(safe-area-inset-bottom));
    width: 54px;
    height: 54px;
  }

  .search-box {
    height: 48px;
    border-radius: 25px;

    .search-input {
      font-size: var(--type-label-size, 15px);
    }
  }

  .catalog-back-button,
  .catalog-cart-button {
    width: 48px;
    height: 48px;
  }

  .quick-sort-bar {
    height: 52px;
  }

  .quick-sort-item {
    min-width: 92px;
    font-size: var(--type-body-size, 14px);
  }

  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

}

@media screen and (min-width: 1024px) and (orientation: landscape) {
  .product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }
}

@media screen and (min-width: 1180px) {
  .header-content {
    padding-left: 36px;
    padding-right: 36px;
  }

}
</style>
