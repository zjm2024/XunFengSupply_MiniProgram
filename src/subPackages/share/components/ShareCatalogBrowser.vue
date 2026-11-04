<template>
  <view class="catalog-browser" :class="{ 'category-mode': mode === 'categories' }">
    <AppCategoryBrowser v-if="mode === 'categories'" :categories="navigation" :loading="loading" :failed="failed" :refreshing="refreshing" :show-price="showPrice" :load-products="loadProducts" @refresh="emit('refresh')" @product="emit('product', $event)" @category="emit('results', $event)" />
    <AppContent v-else padding="16px var(--page-padding-x,16px) 28px" :scroll-top="scrollTop" :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="emit('refresh')" @scrolltolower="emit('more')">
      <ProductSearchLanding v-if="mode === 'search'" :recommendations="SEARCH_RECOMMENDATIONS" @search="emit('search', $event)" />
      <view v-else class="results-content">
        <AppPageState :state="pageState" :title="emptyTitle" icon-type="product">
          <view class="results-grid"><AppProductCard v-for="item in cards" :key="item.productId" :product="item" :show-price="showPrice" :show-stock="false" :show-image-stock-badge="false" @click="emit('product', item.productId)"><template #stock><view class="stock-indicator" :class="'stock-' + item.stockState"><view class="stock-dot" /><text>{{ t('share.stock.' + item.stockState) }}</text></view></template></AppProductCard></view>
        </AppPageState>
        <AppLoadMore v-if="cards.length" :status="loadStatus" @retry="emit('more')" />
      </view>
    </AppContent>
  </view>
</template>
<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import AppCategoryBrowser from '@/shared/ui/AppCategoryBrowser/AppCategoryBrowser.vue'
import { categoryTree } from '@/shared/model/categoryTree.js'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppProductCard from '@/shared/ui/AppProductCard/AppProductCard.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { SEARCH_RECOMMENDATIONS } from '@/subPackages/commerce/model/productSearchRecommendations.js'
import ProductSearchLanding from '@/subPackages/commerce/components/ProductSearchLanding/ProductSearchLanding.vue'
import { t } from '@/shared/i18n/index.js'
/** 共享分类及查询展示，只接收安全商品字段，不读取经销商会话或调用接口。 */
const props = defineProps({ mode: { type: String, default: 'categories' }, categories: { type: Array, default: () => [] }, products: { type: Array, default: () => [] }, categoryId: { type: [String, Number], default: null }, keyword: { type: String, default: '' }, total: { type: Number, default: 0 }, loading: Boolean, refreshing: Boolean, hasMore: Boolean, hasImage: Boolean, failed: Boolean, showPrice: Boolean, loadProducts: { type: Function, required: true } })
const emit = defineEmits(['category', 'product', 'more', 'refresh', 'search', 'results'])
const navigation = computed(() => categoryTree(props.categories))
const categoryName = computed(() => props.categories.find(item => String(item.categoryId) === String(props.categoryId))?.name || '全部分类')
const cards = computed(() => props.products.map(item => ({ ...item, name: item.productName, code: item.productCode, image: item.imageUrl, price: item.fromPrice, hasPriceRange: false })))
const pageState = computed(() => props.failed ? 'error' : props.loading && !cards.value.length ? 'loading' : !cards.value.length ? 'empty' : 'content')
const emptyTitle = computed(() => props.failed ? '暂时无法读取，请下拉重试' : '暂无相关商品')
const loadStatus = computed(() => props.loading ? 'loading' : props.hasMore ? 'idle' : 'no-more')
const scrollTop = ref(0)
/** 分类切换复位滚动，不改变已提交的查询条件。 */
watch(() => [props.categoryId, props.keyword, props.hasImage], async () => { scrollTop.value = 1; await nextTick(); scrollTop.value = 0 })
/** 公开三态映射统一状态标签，不伪造库存数量。 */
function stockType(state) { return state === 'IN_STOCK' ? 'success' : state === 'LOW_STOCK' ? 'warning' : 'default' }
</script>
<style scoped>
.catalog-browser{display:flex;flex:1;height:100%;min-height:0;overflow:hidden;flex-direction:column;width:100%;box-sizing:border-box}.catalog-browser :deep(.app-content){flex:1;min-height:0}.catalog-browser :deep(.content-scroll){min-height:0}.results-content{width:100%;max-width:1200px;margin:0 auto;box-sizing:border-box;min-width:0}.results-grid{min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:14px}.results-grid :deep(.app-product-card--row){width:100%;max-width:100%;aspect-ratio:auto}.results-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0 16px;font-size:15px;font-weight:600}.result-count{font-size:12px;font-weight:400;color:var(--text-secondary,#737a84)}
@media(min-width:600px){.results-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:1024px){.results-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
.stock-indicator{display:inline-flex;align-self:flex-start;align-items:center;flex:none;gap:5px;max-width:100%;min-height:22px;margin-top:5px;padding:2px 7px;box-sizing:border-box;border-radius:6px;font-size:11px;font-weight:500;line-height:18px;color:#747b86;background:#f3f4f6}.stock-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex:none}.stock-IN_STOCK{color:#168252;background:#edf8f2}.stock-LOW_STOCK{color:#a76813;background:#fff6e8}</style>
