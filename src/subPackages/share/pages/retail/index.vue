<template>
  <AppPageShell>
    <template #header>
      <view v-if="!isSearchPage && state.view === 'catalog'"><AppStatusBarSpacer /><HomeTopBar active-tab="category" @search="openSearchPage()" /></view>
      <AppCatalogHeader v-else-if="state.view === 'catalog'" v-model:keyword="keyword" :search-entry="!isSearchPage" @search-entry="openSearchPage()" :keyword-committed="browseMode === 'results' && !!state.query.keyword" :auto-focus="isSearchPage && browseMode === 'search'" :show-tools="isSearchPage && browseMode === 'results'" :show-result-count="true" :total="state.total" :show-sort="false" :filter-count="Number(!!state.query.categoryId)+Number(!!state.query.hasImage)" @filter="filterVisible=true" :show-cart="isSearchPage" :cart-count="itemCount" :placeholder="t('share.retail.search')" @edit-keyword="browseMode = 'search'" @search="search" @clear-keyword="clearSearch" @back="leave" @cart="controller.basket()" />
      <AppHeader v-else show-back custom-back :title="state.view === 'cart' ? '购物车' : state.view === 'checkout' ? '确认订单' : state.view === 'order' ? '订单详情' : '商品详情'" :show-cart="false" :cart-count="itemCount" :show-language="false" @back="leave" @cart="controller.basket()" />
    </template>
    <template #content>
      <ShareCatalogBrowser v-if="['catalog','loading'].includes(state.phase) && state.view === 'catalog'" :mode="browseMode" :categories="state.categories" :products="state.products" :total="state.total" :category-id="state.query.categoryId" :keyword="state.query.keyword" :has-image="!!state.query.hasImage" :loading="state.busy" :refreshing="refreshing" :has-more="state.products.length < state.total" :failed="!!state.error" show-price :load-products="loadPreviews" @product="controller.detail" @more="more" @refresh="refresh" @search="suggestedSearch" @results="openSearchPage($event)" />
      <AppContent v-else :padding="['cart','checkout'].includes(state.view) ? '16px var(--page-padding-x,16px) 24px' : '0'" no-max-width :refresher-enabled="state.view !== 'checkout'" :refresher-triggered="refreshing" @refresherrefresh="refresh" @scrolltolower="more">
        <AppPageState :state="pageStatus" :title="state.error ? t('share.retail.errors.' + state.error) : t('share.retail.unavailable')" :action-text="['retry','limited'].includes(state.error) ? t('share.retail.retry') : ''" @retry="controller.resume()">
          <ShareOrderDetail v-if="state.phase === 'bound' && state.order" :detail="state.order" :busy="state.busy" :payment="state.payment" @pay="controller.pay()" @query="controller.paymentQuery()" @refresh="controller.resume()" />
          <view v-else-if="state.phase === 'bound'" class="share-cart"><AppPageState state="empty" title="该分享已生成订单" description="仅原下单浏览器可查看订单详情" /></view>
          <ShareCheckoutForm ref="checkoutForm" v-else-if="state.view === 'checkout'" :state="state.checkout" :load-areas="controller.checkoutAreas" :items="checkoutItems" :request-preview="controller.checkoutPreview" @preview="controller.checkoutPreview" @create="controller.checkoutSubmit" @changed="controller.checkoutChanged" @back="controller.back()" />
          <ShareProductDetail v-else-if="state.view === 'detail' && state.detail" :product="state.detail.product" :skus="state.detail.skus.items" :total="state.detail.skus.totalCount" :loading="state.busy" :has-more="state.detail.skus.items.length < state.detail.skus.totalCount" :description="state.detail.description" :size-recommendation="state.detail.sizeRecommendation" :unit="state.detail.unit" show-price purchasable :selected-sku-id="initialSkuId" :category-name="detailCategoryName" @select="chooseSku" @more="more" @preview="previewImages" />
          <ShareCartPanel v-else-if="state.view === 'cart'" :rows="cartRows" :busy="state.busy" @edit="controller.edit" @remove="removeItem" @browse="controller.back()" @product="controller.detail" @checkout="controller.checkout()" />

        </AppPageState>
      </AppContent>
    </template>
    <template v-if="hasFooter" #footer>
      <FixedActionBar>
        <ShareCartFooter v-if="state.view === 'cart'" :rows="cartRows" :busy="state.busy" @edit="controller.edit" @checkout="controller.checkout()" />
        <ShareCheckoutFooter v-else-if="state.view === 'checkout'" :state="state.checkout" :items="checkoutItems" @pay="checkoutForm?.pay()" />
        <AppButton v-else-if="state.view === 'detail'" block class="add-button" :disabled="state.busy || !purchaseProduct?.skus.some(sku => sku.canPurchase)" @tap="chooseSku()">加入购物车</AppButton>
        <template v-else><AppButton variant="secondary" @tap="controller.back()">继续选购</AppButton><text class="cart-selection">已选 {{ selectedCount }} 件</text><AppButton :disabled="state.busy || !selectedCount" @tap="controller.checkout()">结算</AppButton></template>
      </FixedActionBar>
    </template>
    <template #overlay>
      <ShareCatalogFilters v-if="isSearchPage && state.view === 'catalog'" :visible="filterVisible" :categories="state.categories" :category-id="state.query.categoryId" :has-image="!!state.query.hasImage" @close="filterVisible=false" @apply="applyFilters" />
      <ShareOverlayPortal :visible="viewerVisible"><AppImageViewer v-model="viewerVisible" :images="viewerImages" :initial-index="viewerIndex" /></ShareOverlayPortal>
      <view v-if="showFloatingCart" class="floating-cart" :class="{ 'above-footer': hasFooter }"><AppCartButton :count="itemCount" :disabled="state.busy" @tap="controller.basket()" /></view>
      <ShareOverlayPortal :visible="sheetVisible"><SingleSkuPurchaseSheet v-if="purchaseProduct && state.view === 'detail'" v-model:visible="sheetVisible" :product="purchaseProduct" :initial-sku-id="initialSkuId" :show-batch="false" stock-state-only :has-more="state.detail.skus.items.length < state.detail.skus.totalCount" :loading-more="state.busy" :submitting="state.busy" @more="more" @confirm="addSelection" /></ShareOverlayPortal>
    </template>
  </AppPageShell>
</template>
<script setup>
import { computed, shallowRef, ref, watch } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppImageViewer from '@/shared/ui/AppImageViewer/AppImageViewer.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppCatalogHeader from '@/shared/ui/AppCatalogHeader/AppCatalogHeader.vue'
import ShareCatalogFilters from '../../components/ShareCatalogFilters.vue'
import ShareOverlayPortal from '../../components/ShareOverlayPortal.vue'
import ShareCatalogBrowser from '../../components/ShareCatalogBrowser.vue'
import { selectionAmount } from '../../model/shareOrderPresentation.js'
import ShareCartFooter from '../../components/ShareCartFooter.vue'
import ShareCheckoutFooter from '../../components/ShareCheckoutFooter.vue'
import ShareCartPanel from '../../components/ShareCartPanel.vue'
import ShareOrderDetail from '../../components/ShareOrderDetail.vue'
import ShareCheckoutForm from '../../components/ShareCheckoutForm.vue'
import ShareProductDetail from '../../components/ShareProductDetail.vue'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { APP_SURFACE } from '@/app/config/shareSurface.js'
import { shareLanding } from '@/app/navigation/shareLandingBoot.js'
import { locale, t } from '@/shared/i18n/index.js'
import { registerShareLocales } from '../../i18n/register.js'
import { createShareRetail } from '../../composables/createShareRetail.js'
import AppCartButton from '@/shared/ui/AppCartButton/AppCartButton.vue'
import HomeTopBar from '@/pages/home/components/HomeTopBar.vue'
import AppStatusBarSpacer from '@/shared/ui/AppStatusBarSpacer/AppStatusBarSpacer.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppCard from '@/shared/ui/AppCard/AppCard.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import QuantityStepper from '@/shared/ui/QuantityStepper/QuantityStepper.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import SingleSkuPurchaseSheet from '@/subPackages/commerce/components/SingleSkuPurchaseSheet/SingleSkuPurchaseSheet.vue'
import { sharePurchaseProduct } from '../../model/sharePurchasePresentation.js'
registerShareLocales()
const viewerVisible = ref(false), viewerImages = ref([]), viewerIndex = ref(0)
/** 图片预览复用经销商查看器，在页面覆盖层承载。 */
function previewImages(value) { viewerImages.value = value.images; viewerIndex.value = value.index; viewerVisible.value = true }
const checkoutForm=ref(null)
const state = shallowRef({ phase: 'loading', view: 'catalog', query: {}, products: [], categories: [], quotes: [] })
const isSearchPage = ref(false), sheetVisible = ref(false), initialSkuId = ref(null)
const refreshing = ref(false), browseMode = ref('categories')
const keyword = ref(''), filterVisible=ref(false)
// 分享正式建单后接独立公众号JSAPI付款，账务事实由服务端回查。
const queryOnly = false, checkoutEnabled = true
const controller = createShareRetail({ landing: shareLanding, enabled: APP_SURFACE.mode === 'share-h5', queryOnly, checkoutEnabled, onChange: value => { state.value = value } })
const itemCount = computed(() => state.value.cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0)
const hasFooter = computed(() => state.value.phase === 'catalog' && ['detail','cart','checkout'].includes(state.value.view))
const showFloatingCart = computed(() => state.value.phase === 'catalog' && !['cart','checkout'].includes(state.value.view) && !(isSearchPage.value && state.value.view === 'catalog') && !sheetVisible.value && !viewerVisible.value)
const detailCategoryName = computed(() => state.value.categories.find(item => item.categoryId === state.value.detail?.product.categoryId)?.name || '')
const purchaseProduct = computed(() => sharePurchaseProduct(state.value.detail))
const pageStatus = computed(() => state.value.phase === 'loading' || (state.value.view === 'detail' && state.value.busy && !state.value.detail) ? 'loading' : !['catalog','bound'].includes(state.value.phase) || state.value.error ? 'error' : 'content')
const selectedCount = computed(() => (state.value.cart?.items || []).filter(item => item.selected).reduce((sum,item) => sum + item.quantity, 0))
const cartRows = computed(() => (state.value.cart?.items || []).map(item => ({ ...item, quote: state.value.quotes.find(row => row.skuId === item.skuId) })))
const checkoutItems=computed(()=>cartRows.value.filter(item=>item.selected&&item.quote).map(item=>({...item.quote,quantity:item.quantity,lineAmount:selectionAmount([{...item,selected:true}])})))
let firstShow = true, active = true
/** 根据当前视图刷新独立数据，不跨到经销商页面。 */
async function refresh() {
 if (refreshing.value || state.value.busy) return
 refreshing.value = true
 try {
  if (state.value.error || state.value.phase !== 'catalog') await controller.resume()
  else if (state.value.view === 'detail' && state.value.detail) await controller.detail(state.value.detail.product.productId)
  else if (state.value.view === 'cart') await controller.basket()
  else await controller.catalog(state.value.query)
 } finally { refreshing.value = false }
}
/** 商品搜索仅缩小当前分享目录，不传主体或金额。 */
function search() { if (state.value.busy) return; browseMode.value = 'results'; return controller.catalog({ ...state.value.query, keyword: keyword.value.trim(), categoryId: state.value.query.categoryId }) }
/** 分享筛选复用经销商抽屉，只传入已支持的接口条件。 */
function applyFilters(value){browseMode.value='results';return controller.catalog({keyword:state.value.query.keyword,...value})}
/** 搜索建议复用项目查询结果布局。 */
function suggestedSearch(value) { keyword.value = value; return search() }
/** 触底按当前视图加载后续商品或规格。 */
function more() { if (state.value.busy) return; if (state.value.view === 'detail' && state.value.detail?.skus.items.length < state.value.detail?.skus.totalCount) return controller.detail(state.value.detail.product.productId, true); if (state.value.view === 'catalog' && state.value.products.length < state.value.total) return controller.catalog({}, true) }
/** 清除搜索同样走独立目录。 */
function clearSearch() { keyword.value = ''; return search() }
/** 分类来自已批准目录。 */
function filter(categoryId) { return controller.catalog({ keyword: keyword.value, categoryId }) }
/** 加购不占库存，只保存本机意向。 */
function addSelection({ sku, quantity }) {
 if (controller.add(sku.skuId, quantity)) { initialSkuId.value = sku.skuId; sheetVisible.value = false; uni.showToast({ title: t('share.retail.added'), icon: 'none' }) }
 else uni.showToast({ title: '暂时无法加入，请检查数量或刷新商品', icon: 'none' })
}
/** 同一个通用规格弹层用于入口和具体规格行。 */
function chooseSku(id) { if (typeof id === 'string') initialSkuId.value = id; sheetVisible.value = true }
/** 页面隐藏或切换立即清除弹层，不留旧报价。 */
watch(() => [state.value.phase, state.value.view, state.value.detail?.product.productId], () => { if (state.value.phase !== 'catalog' || state.value.view !== 'detail' || !state.value.detail) { sheetVisible.value = false; viewerVisible.value = false; viewerImages.value = [] } })
/** 删除意向统一使用项目确认框。 */
async function removeItem(skuId) { if (await openAppDialog({ title: '移除商品', description: '确认移除该商品？' })) controller.remove(skuId) }

/** 公开页面跳转由唯一导航器放行，不读取经销商会话。 */
function leave() { if (isSearchPage.value && state.value.view === 'catalog') return navigator.back(); if (state.value.busy) return; if (state.value.view !== 'catalog') return controller.back(); if (browseMode.value !== 'categories') { browseMode.value = 'categories'; keyword.value = ''; return controller.catalog({ keyword: '', categoryId: state.value.query.categoryId }) } return controller.back() }
/** Web隐藏/后退缓存离开清敏，恢复必须重新授权。 */
function webHide() { viewerVisible.value = false; viewerImages.value = []; sheetVisible.value = false; active = false; controller.hide() }
/** Web恢复和uni恢复可能同时触发，由活跃标记去重。 */
function webShow() { if (!active) { active = true; controller.resume() } }
/** 文档可见性变化同步访客生命周期。 */
function visibility() { if (document.visibilityState === 'hidden') webHide(); else webShow() }
watch(locale, () => {
  if (!active || state.value.phase !== 'catalog') return
  if (state.value.view === 'checkout') controller.checkoutChanged()
  else if (state.value.view === 'cart') controller.basket()
  else if (state.value.view === 'detail' && state.value.detail) controller.detail(state.value.detail.product.productId)
  else controller.catalog(state.value.query)
})
/** 真实搜索页导航不携带会话密钥。 */
function openSearchPage(categoryId) { const access = controller.location(); if (access) return navigator.navigateTo(routes.share.retailSearch(access, categoryId)) }
/** 展示层只接收已脱敏分享报价。 */
async function loadPreviews(query) { const page = await controller.preview(query); return { ...page, items: page.items.map(item => ({ ...item, name: item.productName, code: item.productCode, image: item.imageUrl, price: item.fromPrice, hasPriceRange: false })) } }
onLoad(query => {
  const route = String(getCurrentPages().at(-1)?.route || '')
  isSearchPage.value = route.endsWith('/search')
  if (isSearchPage.value) browseMode.value = query?.categoryId ? 'results' : 'search'

  controller.open(query)
  // #ifdef H5
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('pagehide', webHide)
  window.addEventListener('pageshow', webShow)
  // #endif
})
onShow(() => { if (firstShow) firstShow = false; else webShow() })
onHide(webHide)
onUnload(() => {
  // #ifdef H5
  document.removeEventListener('visibilitychange', visibility)
  window.removeEventListener('pagehide', webHide)
  window.removeEventListener('pageshow', webShow)
  // #endif
  controller.dispose()
})
</script>
<style scoped>
.floating-cart{position:absolute;right:20px;bottom:calc(24px + env(safe-area-inset-bottom));z-index:1;pointer-events:auto}.floating-cart.above-footer{bottom:calc(96px + env(safe-area-inset-bottom))}
.share-cart{max-width:960px;margin:auto;padding:16px;box-sizing:border-box;display:flex;flex-direction:column;gap:12px}.cart-item{margin-bottom:12px;box-sizing:border-box}.cart-row{display:flex;align-items:center;gap:12px}.cart-image{width:86px;height:86px;flex:0 0 86px}.cart-copy{flex:1;min-width:0}.cart-name{display:block;font-size: var(--type-label-size, 15px);font-weight: var(--font-weight-semibold, 600);line-height:1.5}.cart-spec{display:block;margin:6px 0;font-size: var(--type-caption-size, 12px);color:var(--text-secondary,#737a84)}.cart-price{font-size: var(--type-section-title-size, 18px);color:var(--primary-color,#d7192d)}.cart-controls{display:flex;align-items:center;justify-content:space-between;margin-top:12px;gap:12px}.check-button{display:flex;padding:6px;background:transparent;margin:0;flex:0 0 30px;justify-content:center}.check-button::after{display:none}.check{display:flex;width:20px;height:20px;border-radius:50%;border:1px solid var(--border-color,#d9dce2);align-items:center;justify-content:center;font-size: var(--type-caption-size, 12px)}.check.checked{color:white;border-color:var(--primary-color,#d7192d);background:var(--primary-color,#d7192d)}.add-button{flex:1}.cart-selection{flex:1;text-align:right;font-size: var(--type-body-size, 14px);color:var(--text-secondary,#737a84)}
</style>
