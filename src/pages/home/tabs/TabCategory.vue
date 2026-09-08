<template>
  <view class="tab-page">
    <view class="page-heading">
      <view class="heading-copy">
        <text class="page-kicker">PRODUCT CATALOG</text>
        <text class="page-title">商品分类</text>
        <text class="page-description">快速检索商品与 SKU，点击商品查看完整规格。</text>
      </view>
      <view class="heading-icon"><AppIcon name="category" :size="28" /></view>
    </view>

    <view class="search-box">
      <AppIcon name="search" :size="19" />
      <input v-model="keyword" class="search-input" placeholder="搜索商品名称 / SKU / 69码" confirm-type="search" @confirm="loadProducts" />
      <view v-if="keyword" class="clear-search" @click="clearSearch"><AppIcon name="close" :size="16" /></view>
    </view>

    <!-- 首次加载中显示 AppLoadMore -->
    <view v-if="loading && !initialized" class="initial-loading">
      <AppLoadMore status="loading" />
    </view>

    <template v-else>
      <scroll-view v-if="categories.length" class="category-scroll" scroll-x :show-scrollbar="false">
        <view class="category-list">
          <view
            v-for="category in categories"
            :key="String(category.id)"
            class="category-pill"
            :class="{ 'is-active': activeCategoryId === category.id }"
            @click="selectCategory(category)"
          >{{ category.name }}</view>
        </view>
      </scroll-view>

      <view v-if="loading" class="state-box">
        <view class="loading-dot"></view>
        <text>正在加载商品目录...</text>
      </view>

      <view v-else-if="products.length" class="product-grid">
        <view v-for="product in products" :key="product.productId" class="product-card" hover-class="card--pressed" @click="openProduct(product)">
          <view class="product-image-wrap"><image class="product-image" :src="product.image || defaultImage" mode="aspectFit" /></view>
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text v-if="product.code" class="product-code">{{ product.code }}</text>
            <view class="price-row"><text class="price">¥{{ formatPrice(product.price) }}</text><text class="unit">/{{ product.unit || '件' }}</text></view>
            <text class="stock" :class="{ 'is-empty': product.stock <= 0 }">{{ product.stock > 0 ? `库存 ${product.stock}` : '暂时缺货' }}</text>
          </view>
        </view>
      </view>

      <view v-else class="state-box">
        <AppIcon name="product" :size="48" />
        <text class="state-title">暂无匹配商品</text>
        <text>请尝试其他分类或关键词</text>
      </view>
    </template>

    <view class="full-page-link" @click="openProductList"><text>打开完整商品目录</text><AppIcon name="arrow-right" :size="17" /></view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { getCategoryList, getGoodsList } from '@/subPackages/commerce/api/productApi.js'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'

const props = defineProps({ active: { type: Boolean, default: false } })
const defaultImage = '/static/images/default-product.png'
const keyword = ref('')
const activeCategoryId = ref(null)
const categories = ref([])
const products = ref([])
const loading = ref(false)
const initialized = ref(false)

watch(() => props.active, active => {
  if (active && !initialized.value) initialize()
}, { immediate: true })

async function initialize() {
  await Promise.all([loadCategories(), loadProducts()])
  initialized.value = true
}

async function loadCategories() {
  try {
    const result = await getCategoryList()
    categories.value = [{ id: null, name: '全部' }, ...(Array.isArray(result) ? result : [])]
  } catch (error) {
    categories.value = [{ id: null, name: '全部' }]
    console.warn('[HomeCategory] 分类加载失败:', error)
  }
}

async function loadProducts() {
  if (loading.value) return
  loading.value = true
  try {
    const result = await getGoodsList({ pageNum: 1, pageSize: 12, categoryId: activeCategoryId.value, keyword: keyword.value.trim() || null })
    products.value = Array.isArray(result?.items) ? result.items.slice(0, 12) : []
  } catch (error) {
    products.value = []
    console.warn('[HomeCategory] 商品加载失败:', error)
  } finally {
    loading.value = false
  }
}

function selectCategory(category) {
  if (activeCategoryId.value === category.id) return
  activeCategoryId.value = category.id
  loadProducts()
}

function clearSearch() {
  keyword.value = ''
  loadProducts()
}

function formatPrice(price) {
  return Number(price || 0).toFixed(2)
}

async function openProduct(product) {
  if (product?.productId) await navigator.navigateTo(routes.commerce.productDetail(product.productId))
}

async function openProductList() {
  await navigator.navigateTo(routes.commerce.productList({ categoryId: activeCategoryId.value, keyword: keyword.value.trim() || undefined }))
}
</script>

<style lang="scss" scoped>
.tab-page { width: 100%; max-width: 1180px; min-height: 100%; margin: 0 auto; padding: 18px 16px calc(80px + env(safe-area-inset-bottom)); box-sizing: border-box; }

.page-heading, .search-box, .price-row, .full-page-link, .category-list { display: flex; align-items: center; }
.page-heading { justify-content: space-between; gap: 18px; padding: 20px; border: 1px solid rgba(255,255,255,.86); border-radius: 24px; background: linear-gradient(145deg, rgba(255,255,255,.93), rgba(255,238,241,.82)); box-shadow: 0 14px 36px rgba(55,40,43,.06); }
.heading-copy { display: flex; min-width: 0; flex-direction: column; }
.page-kicker { color: var(--color-brand, #d7192d); font-size: 10px; font-weight: 800; letter-spacing: 1.4px; }
.page-title { margin-top: 5px; font-size: 24px; font-weight: 780; }
.page-description { margin-top: 7px; color: #6e7179; font-size: 12px; line-height: 1.6; }
.heading-icon { display: grid; place-items: center; width: 54px; height: 54px; flex-shrink: 0; border-radius: 18px; color: #fff; background: linear-gradient(145deg, #ef4656, #cf162a); box-shadow: 0 12px 25px rgba(215,25,45,.2); }
.search-box { min-height: 50px; margin-top: 16px; padding: 0 16px; gap: 10px; border: 1px solid rgba(55,57,64,.07); border-radius: 17px; color: #858891; background: rgba(255,255,255,.78); }
.search-input { min-width: 0; height: 50px; flex: 1; color: #25272d; font-size: 13px; }
.clear-search { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: #f1f2f4; }
.category-scroll { width: 100%; margin-top: 14px; white-space: nowrap; }
.category-list { width: max-content; gap: 9px; padding: 2px 1px; }
.category-pill { padding: 8px 15px; border: 1px solid rgba(55,57,64,.07); border-radius: 15px; color: #666a73; font-size: 12px; background: rgba(255,255,255,.7); }
.category-pill.is-active { border-color: rgba(215,25,45,.14); color: var(--color-brand, #d7192d); font-weight: 700; background: rgba(215,25,45,.09); }
.product-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; margin-top: 16px; }
.product-card { min-width: 0; overflow: hidden; border: 1px solid rgba(255,255,255,.9); border-radius: 19px; background: rgba(255,255,255,.78); box-shadow: 0 12px 28px rgba(45,40,42,.055); transition: transform 160ms ease, opacity 160ms ease; }
.product-image-wrap { width: 100%; aspect-ratio: 1.18; background: linear-gradient(145deg, #fafafa, #eef0f3); }
.product-image { width: 100%; height: 100%; }
.product-info { display: flex; padding: 11px; flex-direction: column; }
.product-name { display: -webkit-box; min-height: 36px; overflow: hidden; font-size: 12px; font-weight: 650; line-height: 18px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.product-code { margin-top: 4px; overflow: hidden; color: #999ca3; font-size: 10px; white-space: nowrap; text-overflow: ellipsis; }
.price-row { margin-top: 8px; align-items: baseline; }
.price { color: var(--color-brand, #d7192d); font-size: 16px; font-weight: 760; }
.unit, .stock { color: #999ca3; font-size: 10px; }
.stock { margin-top: 5px; color: #278652; }
.stock.is-empty { color: #a1a3a9; }
.state-box { display: flex; min-height: 260px; align-items: center; justify-content: center; flex-direction: column; gap: 9px; color: #94979f; font-size: 12px; }
.state-title { color: #454850; font-size: 15px; font-weight: 700; }
.loading-dot { width: 24px; height: 24px; border: 3px solid rgba(215,25,45,.12); border-top-color: var(--color-brand, #d7192d); border-radius: 50%; animation: spin .9s linear infinite; }
.full-page-link { width: fit-content; min-height: 44px; margin: 18px auto 0; padding: 0 20px; justify-content: center; gap: 7px; border: 1px solid rgba(215,25,45,.18); border-radius: 15px; color: var(--color-brand, #d7192d); font-size: 13px; font-weight: 700; background: rgba(255,255,255,.72); }
.card--pressed { opacity: .9; transform: scale(.985); }
.initial-loading { display: flex; justify-content: center; align-items: center; min-height: 200rpx; }
@keyframes spin { to { transform: rotate(360deg); } }
@media screen and (min-width: 800px) {
  .tab-page { padding: 18px 24px 18px; }
  .page-heading { padding: 24px 28px; }
  .product-grid { grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; }
  .product-name { font-size: 13px; }
}
</style>
