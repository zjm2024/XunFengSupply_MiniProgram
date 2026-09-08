<template>
  <view class="page">
    <app-header :show-back="true" :title="'商品目录'" :show-cart="true" :cart-count="cartCount" @back="goBack" @cart="goToCart" />
    <scroll-view class="page-scroll" scroll-y @scrolltolower="loadMore">
      <view class="content">
        <!-- 搜索框 -->
        <view class="search-box">
          <AppIcon class="search-icon" name="search" :size="19" />
          <input
            class="search-input"
            placeholder="搜索商品名称 / SKU / 69码"
            v-model="keyword"
            @confirm="handleSearch"
            confirm-type="search"
          />
        </view>

        <!-- 分类标签 -->
        <scroll-view class="category-pills" scroll-x v-if="categories.length > 0">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="pill-btn"
            :class="{ 'is-active': activeCategoryId === cat.id }"
            @click="handleCategoryChange(cat)"
          >{{ cat.name }}</view>
        </scroll-view>

        <!-- 加载状态 -->
        <view v-if="loading && products.length === 0" class="loading-state">
          <view class="loading-spinner"></view>
          <text class="loading-text">加载中...</text>
        </view>

        <!-- 空状态 -->
        <view v-else-if="!loading && products.length === 0" class="empty-state">
          <AppIcon class="empty-icon" name="category" :size="64" />
          <text class="empty-text">暂无商品</text>
          <text class="empty-subtext">请尝试其他分类或搜索关键词</text>
        </view>

        <!-- 商品网格 -->
        <view v-else class="product-grid">
          <view
            v-for="item in products"
            :key="item.productId"
            class="product-card"
            @click="goToDetail(item)"
          >
            <view class="card-image-wrapper">
              <image class="card-image" :src="item.image || '/static/images/default-product.png'" mode="aspectFill" />
            </view>
            <view class="card-body">
              <text class="card-name">{{ item.name }}</text>
              <text class="card-code" v-if="item.code">{{ item.code }}</text>
              <view class="card-price-row">
                <text class="card-price">¥{{ formatPrice(item.price) }}</text>
                <text class="card-unit">/{{ item.unit || '件' }}</text>
              </view>
              <text class="card-stock" :class="getStockClass(item)">
            {{ getStockText(item) }}<text v-if="item.moq > 0"> · {{ item.moq }}{{ item.unit || '件' }}起订</text>
          </text>
        </view>
      </view>
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
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCart } from '../../composables/useCart.js'
import { navigator } from '../../../../app/navigation/navigator.js'
import { routes } from '../../../../app/config/routes.js'
import { getCategoryList, getGoodsList } from '../../api/productApi.js'
import appHeader from '../../../../shared/ui/AppHeader/AppHeader.vue'
import AppIcon from '../../../../shared/ui/AppIcon/AppIcon.vue'

const { cartStore, loadCart } = useCart()

// 搜索和分类
const keyword = ref('')
const activeCategoryId = ref(null)
const categories = ref([])

// 商品列表
const products = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const hasMore = ref(true)

// 购物车数量
const cartCount = computed(() => cartStore.cartBadgeCount)

// 计算是否还有更多
const canLoadMore = computed(() => hasMore.value && !loading.value)

onMounted(async () => {
  // 加载分类和商品
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
    // dispatch 已在请求层解包 data；这里直接接收分类数组。
    categories.value = [
      { id: null, name: '全部' },
      ...(Array.isArray(list) ? list : [])
    ]
  } catch (err) {
    console.error('[ProductList] 加载分类失败:', err)
    // 接口失败时使用默认分类
    categories.value = [
      { id: null, name: '全部' }
    ]
  }
}

// 加载商品列表
async function loadProducts(isLoadMore = false) {
  if (loading.value) return
  if (isLoadMore && !hasMore.value) return

  loading.value = true

  try {
    const params = {
      pageNum: isLoadMore ? page.value + 1 : 1,
      pageSize: pageSize.value
    }

    // 分类筛选
    if (activeCategoryId.value) {
      params.categoryId = activeCategoryId.value
    }

    // 搜索关键词
    if (keyword.value.trim()) {
      params.keyword = keyword.value.trim()
    }

    const res = await getGoodsList(params)

    if (res) {
      const { items, totalCount } = res

      if (isLoadMore) {
        products.value = [...products.value, ...(items || [])]
        page.value += 1
      } else {
        products.value = items || []
        page.value = 1
      }

      total.value = totalCount || 0
      hasMore.value = products.value.length < total.value
    }
  } catch (err) {
    console.error('[ProductList] 加载商品列表失败:', err)
    if (!isLoadMore) {
      products.value = []
    }
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 加载更多
function loadMore() {
  if (canLoadMore.value) {
    loadProducts(true)
  }
}

// 切换分类
function handleCategoryChange(cat) {
  if (activeCategoryId.value === cat.id) return
  activeCategoryId.value = cat.id
  hasMore.value = true
  loadProducts(false)
}

// 搜索
function handleSearch() {
  hasMore.value = true
  loadProducts(false)
}

// 格式化价格
function formatPrice(price) {
  if (typeof price !== 'number') return '0.00'
  return price.toFixed(2)
}

// 获取库存文本
function getStockText(item) {
  if (item.stock === 0) return '暂无库存'
  if (item.stock < 50) return `仅剩 ${item.stock} ${item.unit || '件'}`
  return '有货'
}

// 获取库存样式类
function getStockClass(item) {
  if (item.stock === 0) return 'stock-empty'
  if (item.stock < 50) return 'stock-low'
  return 'stock-normal'
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
  min-height: 100vh;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
}

.page-scroll {
  flex: 1;
  min-height: 0;
}

.content {
  width: 100%;
  box-sizing: border-box;
  max-width: 1240px;
  margin: 0 auto;
  padding: 16px 14px 28px;
}

.search-box {
  height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(17, 18, 22, 0.06);
  border-radius: 14px;
  box-shadow: 0 4px 18px rgba(17, 18, 22, 0.035);
  margin-bottom: 14px;
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
    font-size: 15px;
    color: #111216;

    &::placeholder {
      color: #a8adb5;
    }
  }
}

.category-pills {
  width: 100%;
  padding-bottom: 18px;
  white-space: nowrap;
}

.pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: top;
  min-height: 34px;
  padding: 0 16px;
  margin-right: 9px;
  box-sizing: border-box;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e8e9ec;
  font-size: 14px;
  font-weight: 500;
  color: #4b4f57;
  white-space: nowrap;
  transition: transform .16s ease, background-color .16s ease, border-color .16s ease;

  &.is-active {
    background: #17191d;
    color: #fff;
    border-color: #17191d;
  }

  &:active {
    transform: scale(.96);
  }
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.product-card {
  min-width: 0;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(17, 18, 22, 0.055);
  box-shadow: 0 5px 20px rgba(17, 18, 22, 0.035);
  transition: transform .16s ease, box-shadow .16s ease;

  &:active {
    transform: scale(.985);
    box-shadow: 0 3px 12px rgba(17, 18, 22, .06);
  }
}

.card-image-wrapper {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f3f4f6;
  overflow: hidden;
}

.card-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
}

.card-body {
  padding: 11px 11px 12px;
}

.card-name {
  display: -webkit-box;
  min-height: 40px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: #191b1f;
}

.card-code {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  line-height: 16px;
  color: #9ca1aa;
}

.card-price-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  margin-top: 10px;
}

.card-price {
  color: #d7192d;
  font-size: 18px;
  line-height: 24px;
  font-weight: 700;
  letter-spacing: -.2px;
}

.card-unit {
  margin-left: 3px;
  color: #7a7f88;
  font-size: 11px;
}

.card-stock {
  display: block;
  min-height: 18px;
  margin-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  line-height: 18px;

  &.stock-normal { color: #259b63; }
  &.stock-low { color: #d58b13; }
  &.stock-empty { color: #a2a6ad; }
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
  padding: 52px 0;
  text-align: center;
}

.empty-icon {
  width: 58px;
  height: 58px;
  color: #c9cdd3;
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
    gap: 14px;
  }
}

@media screen and (min-width: 768px) {
  .content {
    padding: 22px 28px 40px;
  }

  .search-box {
    width: min(620px, 100%);
    height: 48px;
    border-radius: 15px;
    margin-bottom: 16px;
  }

  .pill-btn {
    min-height: 36px;
    padding: 0 18px;
    margin-right: 10px;
  }

  .product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .product-card {
    border-radius: 18px;
  }

  .card-body {
    padding: 14px 14px 15px;
  }

  .card-name {
    min-height: 44px;
    font-size: 15px;
    line-height: 22px;
  }

  .card-price {
    font-size: 20px;
    line-height: 26px;
  }
}

@media screen and (min-width: 768px) and (orientation: landscape) {
  .content {
    max-width: 1180px;
  }

  .search-box {
    width: min(560px, 100%);
  }

  .product-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media screen and (min-width: 1180px) {
  .content {
    padding-left: 36px;
    padding-right: 36px;
  }
}
</style>
