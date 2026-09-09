﻿<template>
  <view class="page">
    <AppCatalogHeader
      v-model:keyword="keyword"
      :cart-count="cartCount"
      :total="total"
      :sort-key="sortKey"
      :filter-count="activeFilterCount"
      :auto-focus="searchMode"
      :keyword-committed="keywordCommitted"
      :show-cart="!searchMode"
      :show-tools="showCatalogTools"
      :category-label="activeCategoryPath.length ? activeCategoryPath[activeCategoryPath.length - 1].name : '分类'"
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
    <scroll-view
      class="page-scroll"
      scroll-y
      scroll-with-animation
      :scroll-top="listScrollTop"
      @scroll="handleListScroll"
      @scrolltolower="loadMore"
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
      <view v-if="loading && products.length === 0" class="loading-state">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!loading && products.length === 0" class="empty-state">
        <view class="empty-illustration">
          <AppSvgIllustration :svg="noSearchResultSvg" size="lg" />
        </view>
        <text class="empty-text">{{ searchMode ? '未找到相关商品' : '暂无商品' }}</text>
        <text class="empty-subtext">
          {{ searchMode ? `没有找到“${keyword}”，请更换关键词后重试` : '请尝试其他分类或搜索关键词' }}
        </text>
      </view>

      <!-- 商品网格 -->
      <view v-else class="product-grid">
        <AppProductCard
          v-for="item in products"
          :key="item.productId"
          :product="item"
          @click="goToDetail(item)"
        />
      </view>

      <!-- 加载更多 -->
      <view v-if="loading && products.length > 0" class="load-more">
        <view class="loading-spinner small"></view>
        <text class="load-more-text">加载更多...</text>
      </view>

      <!-- 没有更多了 -->
      <view v-else-if="!hasMore && products.length > 0" class="no-more">
        <text class="no-more-text">— 没有更多了 —</text>
      </view>
      </template>
      </view>
    </scroll-view>

    <view
      class="back-to-top"
      :class="{ 'is-visible': showBackToTop && !showSearchLanding }"
      hover-class="back-to-top--pressed"
      @click="scrollToTop"
    >
      <AppIcon name="chevron-up" :size="19" :stroke-width="2.2" />
      <text class="back-to-top-label">顶部</text>
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
import { ref, computed, watch, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useCart } from '../../composables/useCart.js'
import { navigator } from '../../../../app/navigation/navigator.js'
import { routes } from '../../../../app/config/routes.js'
import { getCategoryList, getGoodsList } from '../../api/productApi.js'
import AppIcon from '../../../../shared/ui/AppIcon/AppIcon.vue'
import AppCatalogHeader from '../../../../shared/ui/AppCatalogHeader/AppCatalogHeader.vue'
import AppProductCard from '../../../../shared/ui/AppProductCard/AppProductCard.vue'
import ProductFilterDrawer from '../../components/ProductFilterDrawer/ProductFilterDrawer.vue'
import ProductSearchLanding from '../../components/ProductSearchLanding/ProductSearchLanding.vue'
import AppSvgIllustration from '../../../../shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import noSearchResultSvg from '../../../../shared/assets/illustrations/no-search-result.svg?raw'

const SORT_QUERY = Object.freeze({
  default: { field: '', order: '', label: '综合排序' },
  latest: { field: 'createdAt', order: 'desc', label: '最新上架' },
  priceAsc: { field: 'price', order: 'asc', label: '价格从低到高' },
  priceDesc: { field: 'price', order: 'desc', label: '价格从高到低' },
  stockDesc: { field: 'stock', order: 'desc', label: '库存从高到低' },
  stockAsc: { field: 'stock', order: 'asc', label: '库存从低到高' },
})

const STOCK_FILTER_LABELS = Object.freeze({
  inStock: '仅看有货',
  lowStock: '库存紧张',
  outOfStock: '暂时缺货',
})

const SEARCH_HISTORY_KEY = 'commerce.product.search.history'
const SEARCH_HISTORY_LIMIT = 10
const SEARCH_RECOMMENDATIONS = Object.freeze([
  '羽毛球拍',
  '比赛羽毛球',
  '运动服套装',
  '羽毛球鞋',
  '训练用球',
  '球拍线',
  '羽毛球包',
  '运动护具',
  '团队采购',
])

const { cartStore, loadCart } = useCart()

const keyword = ref('')
const searchMode = ref(false)
const hasSearched = ref(false)
const keywordCommitted = ref(false)
const searchHistory = ref([])
const activeCategoryId = ref(null)
const categoryTree = ref([])
const activeCategoryPath = ref([])
const stockFilter = ref('')
const sortKey = ref('default')
const filterDrawerVisible = ref(false)

// 商品列表
const products = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const hasMore = ref(true)
const listScrollTop = ref(0)
const showBackToTop = ref(false)
let currentListScrollTop = 0
let productRequestId = 0

// 购物车数量
const cartCount = computed(() => cartStore.cartBadgeCount)

// 计算是否还有更多
const canLoadMore = computed(() => hasMore.value && !loading.value)
const activeSort = computed(() => SORT_QUERY[sortKey.value] || SORT_QUERY.default)
const activeStockFilterLabel = computed(() => STOCK_FILTER_LABELS[stockFilter.value] || '')
const activeFilterCount = computed(() => Number(activeCategoryPath.value.length > 0) + Number(Boolean(stockFilter.value)))
const showSearchLanding = computed(() => searchMode.value && !hasSearched.value)
const showCatalogTools = computed(() => {
  if (showSearchLanding.value) return false
  if (!searchMode.value) return true
  return loading.value || products.value.length > 0
})
const searchRecommendations = computed(() => SEARCH_RECOMMENDATIONS)

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
  loadSearchHistory()
})

onMounted(async () => {
  if (showSearchLanding.value) return
  await Promise.all([
    loadCategories(),
    loadProducts()
  ])
})

onShow(() => {
  loadCart({ silent: true }).catch(() => {})
})

// 加载分类数据
async function loadCategories() {
  try {
    const list = await getCategoryList()
    categoryTree.value = Array.isArray(list) ? list : []
    activeCategoryPath.value = findCategoryPath(categoryTree.value, activeCategoryId.value) || []
  } catch (err) {
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
  const targetPage = isLoadMore ? page.value + 1 : 1
  loading.value = true

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

    const res = await getGoodsList(params)
    if (requestId !== productRequestId) return

    if (res) {
      const { items, totalCount } = res

      if (isLoadMore) {
        products.value = [...products.value, ...(items || [])]
        page.value = targetPage
      } else {
        products.value = items || []
        page.value = 1
      }

      total.value = totalCount || 0
      hasMore.value = products.value.length < total.value
    }
  } catch (err) {
    if (requestId !== productRequestId) return
    console.error('[ProductList] 加载商品列表失败:', err)
    if (!isLoadMore) {
      products.value = []
    }
    uni.showToast({
      title: '加载失败，请重试',
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
    saveSearchKeyword(normalizedKeyword)
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
    const stored = uni.getStorageSync(SEARCH_HISTORY_KEY)
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
    uni.setStorageSync(SEARCH_HISTORY_KEY, nextHistory)
  } catch (_) {}
}

function clearSearchHistory() {
  searchHistory.value = []
  try {
    uni.removeStorageSync(SEARCH_HISTORY_KEY)
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
  scrollToTop()
  loadProducts(false)
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
  if (item && item.productId) {
    navigator.navigateTo(routes.commerce.productDetail(item.productId))
  }
}
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  overflow: hidden;
  background: #f7f8fa;
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

.page-scroll {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  background: #f7f8fa;
}

.scroll-inner {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 14px 14px 28px;
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
  font-size: 9px;
  line-height: 11px;
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
  border-radius: 9px;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
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
    font-size: 13px;
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
  font-size: 13px;
  font-weight: 650;
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
  font-size: 13px;
}

.quick-sort-item.is-active {
  color: #17191d;
  font-weight: 700;
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
  font-size: 6px;
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
  border-radius: 8px;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
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
  border-radius: 17px;
  font-size: 11px;
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
  font-size: 10px;
}

.result-count {
  flex-shrink: 0;
  color: #969aa2;
  font-size: 11px;
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
    font-size: 12px;
  }
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 12px;
}

.loading-state,
.empty-state {
  min-height: 48vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top-color: #d7192d;
  border-radius: 50%;
  animation: spin .8s linear infinite;

  &.small {
    width: 17px;
    height: 17px;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 12px;
  font-size: 14px;
  color: #7b8089;
}

.empty-state {
  width: 100%;
  max-width: 430px;
  min-height: 260px;
  margin: 24px auto 0;
  padding: 42px 28px;
  box-sizing: border-box;
  border-radius: 24px;
  text-align: center;
  background: transparent;
}

.empty-illustration {
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  line-height: 24px;
  color: #555a63;
  font-weight: 600;
}

.empty-subtext {
  margin-top: 6px;
  padding: 0 24px;
  font-size: 13px;
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
  font-size: 12px;
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

  .page-scroll {
    padding: 16px 28px 40px;
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
      font-size: 15px;
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
    font-size: 14px;
  }

  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

}

@media screen and (min-width: 768px) and (orientation: landscape) {
  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
  }
}

@media screen and (min-width: 1180px) {
  .header-content {
    padding-left: 36px;
    padding-right: 36px;
  }

  .page-scroll {
    padding-left: 36px;
    padding-right: 36px;
  }

  .product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
