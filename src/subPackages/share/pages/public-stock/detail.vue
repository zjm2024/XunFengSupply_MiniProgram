<template>
  <AppPageShell>
    <template #header>
      <AppHeader show-back custom-back :title="product?.productName || t('share.stock.specs')" :show-language="false" @back="back" />
    </template>
    <template #content>
      <AppContent padding="0" :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="refresh" @scrolltolower="more">
        <view class="detail-page">
          <AppPageState v-if="failed || (loading && !product)" :state="failed ? 'error' : 'loading'" :title="t(expired ? 'share.stock.expired' : 'share.stock.unavailable')" :action-text="expired ? '' : '重新加载'" @retry="refresh" />
          <ShareProductDetail v-if="product" :product="product" :skus="skus" :total="totalCount" :loading="loading" :has-more="hasMore" @more="more" @preview="previewImages" />

        </view>
      </AppContent>
    </template>
    <template #overlay><AppImageViewer v-model="viewerVisible" :images="viewerImages" :initial-index="viewerIndex" /></template>
  </AppPageShell>
</template>

<script setup>
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import ShareProductDetail from '../../components/ShareProductDetail.vue'
import AppImageViewer from '@/shared/ui/AppImageViewer/AppImageViewer.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { computed, ref, watch } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { locale, t } from '@/shared/i18n/index.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { registerShareLocales } from '../../i18n/register.js'
import { getPublicStockDetail, publicStockId } from '../../api/publicStockApi.js'
import { getPublicStockAccess, setPublicStockAccess } from '../../model/publicStockAccess.js'

registerShareLocales()
const viewerVisible = ref(false), viewerImages = ref([]), viewerIndex = ref(0)
/** 图片预览复用经销商查看器，在页面覆盖层承载。 */
function previewImages(value) { viewerImages.value = value.images; viewerIndex.value = value.index; viewerVisible.value = true }
const refreshing = ref(false)
const product = ref(null)
const skus = ref([])
const loading = ref(false)
const failed = ref(false)
const expired = ref(false)
const currentPage = ref(0)
const pageSize = ref(20)
const totalCount = ref(0)
const hasMore = computed(() => currentPage.value > 0 && currentPage.value < 10000 && currentPage.value * pageSize.value < totalCount.value)
let productId = ''
let generation = 0
let active = true
let firstShow = true

/** 规格状态只从独立公开接口获取；语言/恢复刷新作废旧请求。 */
async function load(append = false) {
  if (append && (loading.value || !hasMore.value)) return
  const epoch = ++generation
  const pageNum = append ? currentPage.value + 1 : 1
  failed.value = false
  expired.value = false
  loading.value = true
  if (!append) { product.value = null; skus.value = []; currentPage.value = 0; totalCount.value = 0 }
  try {
    const result = await getPublicStockDetail({ productId, pageNum, pageSize: 20 })
    if (epoch !== generation) return
    product.value = result.product
    skus.value = append ? [...skus.value, ...result.skus.items.filter(row => !skus.value.some(old => old.skuId === row.skuId))] : result.skus.items
    currentPage.value = result.skus.pageNum
    pageSize.value = result.skus.pageSize
    totalCount.value = result.skus.totalCount
  } catch (error) {
    if (epoch !== generation) return
    product.value = null; skus.value = []; currentPage.value = 0; totalCount.value = 0; failed.value = true
    expired.value = error?.httpStatus === 410 || error?.errorCode === 'PUBLIC_STOCK_LINK_EXPIRED'
  } finally {
    if (epoch === generation) loading.value = false
  }
}
/** 手动重载总是重新校验可见范围及商品状态。 */
function reload() { return load(false) }
/** 下拉重新校验链接与规格，完成或失败均收起刷新状态。 */
async function refresh() { if (refreshing.value) return; refreshing.value = true; try { await reload() } finally { refreshing.value = false } }
/** 更多规格不加入普通采购购物车。 */
function more() { return load(true) }
/** 直接打开详情时返回公开列表，不落入经销商首页登录流程。 */
function back() {
 const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
 const previous = String(pages[pages.length - 2]?.route || '').replace(/^\//, '')
 if (['stock', 'stock/search', 'subPackages/share/pages/public-stock/index', 'subPackages/share/pages/public-stock/search'].includes(previous)) return navigator.back()
 return navigator.redirectTo(routes.share.publicStock(getPublicStockAccess()))
}
watch(locale, () => { if (active && productId) reload() })
onLoad(query => { setPublicStockAccess(query?.access, query?.expires); productId = publicStockId(query?.productId); reload() })
onShow(() => { active = true; if (firstShow) firstShow = false; else reload() })
onHide(() => { viewerVisible.value = false; viewerImages.value = []; active = false })
onUnload(() => { active = false; generation++ })
</script>

<style scoped>
.detail-page{padding:0}.state{padding:40px 16px;text-align:center;color:var(--text-secondary,#737a84)}
</style>
