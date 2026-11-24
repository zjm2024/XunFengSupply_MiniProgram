<template>
  <AppPageShell class="section-shell">
    <template #header>
      <AppCatalogHeader
        v-model:keyword="keyword"
        :keyword-maxlength="64"
        :placeholder="t('common.homePage.search')"
        :show-cart="false"
        :show-filter="false"
        :show-tools="!unavailable"
        :sort-items="sectionSortItems"
        :sort-key="sectionSortKey"
        auto-hide-tools
        :tools-collapsed="toolsCollapsed"
        @back="goBack"
        @search="reload()"
        @clear-keyword="clearKeyword"
        @sort="changeSortKey"
      />
    </template>
    <template #content>
      <AppContent
        :no-max-width="true"
        padding="0"
        :scroll-top="scrollTop"
        :refresher-enabled="!unavailable"
        :refresher-triggered="refreshing"
        @scroll="handleScroll"
        @refresherrefresh="reload(true)"
        @refresherrestore="handleRefreshRestore"
        @refresherabort="handleRefreshRestore"
        @scrolltolower="loadMore"
      >
        <view v-if="!unavailable" class="section-tools-placeholder" aria-hidden="true" />
        <view class="section-page">
          <text class="section-title">{{ title || t('common.homePage.section') }}</text>
          <AppPageState
            v-if="unavailable"
            state="error"
            :title="t('common.homePage.unavailable')"
            :action-text="t('common.homePage.home')"
            @retry="returnHome"
          />
          <template v-else>
            <AppPageState v-if="loading && !items.length" state="loading" />
            <AppPageState
              v-else-if="failed && !items.length"
              state="error"
              :action-text="t('common.homePage.retry')"
              @retry="loadMore"
            />
            <AppPageState v-else-if="!items.length" state="empty" :title="t('common.homePage.empty')" />
            <view v-else class="section-grid">
              <AppProductCard
                v-for="product in items"
                :key="product.productId"
                :product="product"
                :show-code="false"
                :show-stock="false"
                :show-image-stock-badge="false"
                @click="openProduct(product, false)"
              />
            </view>
            <AppLoadMore
              v-if="items.length"
              :status="loading ? 'loading' : failed ? 'error' : hasMore ? 'idle' : 'no-more'"
              @retry="loadMore"
            />
          </template>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, nextTick, ref, watch, onBeforeUnmount } from 'vue'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import { waitForPaginationResult } from '@/shared/utils/refreshAnimation.js'
import { getHomeSection } from '@/shared/api/homePage.js'
import { t, getLocale } from '@/shared/i18n/index.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppCatalogHeader from '@/shared/ui/AppCatalogHeader/AppCatalogHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductCard from '@/shared/ui/AppProductCard/AppProductCard.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'

const user = useUserStore()
const items = ref([])
const title = ref('')
const keyword = ref('')
const sort = ref(2)
const loading = ref(false)
const failed = ref(false)
const unavailable = ref(false)
const hasMore = ref(true)
const canPurchase = ref(false)
const refreshing = ref(false)
const scrollTop = ref(0)
const toolsCollapsed = ref(false)
const sectionSortItems = Object.freeze([
  { key: 'default', labelKey: 'common.search.sortDefault' },
  { key: 'configured', labelKey: 'common.homePage.configured' },
  { key: 'latest', labelKey: 'common.homePage.latest' },
])
const SORT_VALUES = Object.freeze({ default: 2, configured: 0, latest: 1 })
const sectionSortKey = computed(() => sort.value === 0 ? 'configured' : sort.value === 1 ? 'latest' : 'default')
let scope = null
let page = 1
let epoch = 0
let disposed = false
let appliedKeyword = ''
let visible = true
let previousScrollTop = null
let scrollDirection = 0
let directionDistance = 0
let ignoreDirectionUntil = 0
// 与商品查询页的初始体验值一致，后续依据真机测量调整。
const TOOLS_HIDE_DISTANCE = 24
const TOOLS_SHOW_DISTANCE = 12
const TOOLS_HIDE_AFTER_TOP = 80

/** APP导航会再次编码query；仅恢复一次并校验服务端的页ID:版本契约。 */
function normalizeConfigStamp(value) {
  if (typeof value !== 'string') return ''
  let stamp = value
  if (!/^\d+:\d+$/.test(stamp)) {
    try { stamp = decodeURIComponent(stamp) }
    catch { return '' }
  }
  return /^\d+:\d+$/.test(stamp) ? stamp : ''
}

onLoad(options => {
  scope = {
    homePageId: String(options?.homePageId || ''),
    componentId: String(options?.componentId || ''),
    configStamp: normalizeConfigStamp(options?.configStamp),
  }
  if (!/^\d+$/.test(scope.homePageId) || !/^\d+$/.test(scope.componentId) || !scope.configStamp) {
    unavailable.value = true
    return
  }
  reload()
})

function resetTools(top = null) {
  toolsCollapsed.value = false
  previousScrollTop = top
  scrollDirection = 0
  directionDistance = 0
}

/** 仅控制当前工具行显示，不更改AppContent视口高度或列表滚动位置。 */
function handleScroll(event) {
  const top = Math.max(0, Number(event?.detail?.scrollTop) || 0)
  if (top <= TOOLS_SHOW_DISTANCE) {
    ignoreDirectionUntil = 0
    resetTools(top)
    return
  }
  if (!visible || unavailable.value || refreshing.value || (loading.value && !items.value.length)
    || Date.now() < ignoreDirectionUntil) { resetTools(top); return }
  if (previousScrollTop === null) { previousScrollTop = top; return }
  const delta = top - previousScrollTop
  previousScrollTop = top
  if (!delta) return
  const direction = Math.sign(delta)
  if (direction !== scrollDirection) { scrollDirection = direction; directionDistance = 0 }
  directionDistance += Math.abs(delta)
  if (direction > 0 && top >= TOOLS_HIDE_AFTER_TOP && directionDistance >= TOOLS_HIDE_DISTANCE) {
    toolsCollapsed.value = true
    directionDistance = 0
  } else if (direction < 0 && directionDistance >= TOOLS_SHOW_DISTANCE) {
    toolsCollapsed.value = false
    directionDistance = 0
  }
}

/** 搜索/排序/语言变化从同一楼层第一页重新读取，不扩大商品范围。 */
function reload(pull = false) {
  if (!scope || unavailable.value) return
  epoch++
  items.value = []
  page = 1
  hasMore.value = true
  loading.value = false
  failed.value = false
  appliedKeyword = keyword.value.trim()
  refreshing.value = pull
  resetTools()
  if (!pull) {
    ignoreDirectionUntil = Date.now() + 500
    scrollTop.value = -1
    nextTick(() => { if (!disposed) scrollTop.value = 0 })
  }
  return loadMore()
}

/** 仅提交已成功页的下一页；旧请求不能混入新筛选结果。 */
async function loadMore() {
  if (loading.value || !hasMore.value || !scope || unavailable.value) return
  const requestEpoch = epoch
  loading.value = true
  failed.value = false
  try {
    const result = await waitForPaginationResult(getHomeSection({ ...scope, keyword: appliedKeyword, sort: sort.value, pageNum: page }), page > 1)
    if (disposed || epoch !== requestEpoch) return
    title.value = result.title
    canPurchase.value = result.canPurchase
    const old = new Set(items.value.map(product => product.productId))
    items.value.push(...result.items.filter(product => !old.has(product.productId)))
    hasMore.value = result.hasMore
    page++
  } catch (error) {
    if (disposed || epoch !== requestEpoch) return
    if (/HOME_(SCOPE_CHANGED|SECTION_UNAVAILABLE)/.test(error.errorCode || '')) {
      unavailable.value = true
      items.value = []
      canPurchase.value = false
    } else failed.value = true
  } finally {
    if (epoch === requestEpoch) { loading.value = false; refreshing.value = false }
  }
}

/** 排序映射只接受楼层接口现有的三个值。 */
function changeSortKey(key) {
  if (Object.prototype.hasOwnProperty.call(SORT_VALUES, key)) changeSort(SORT_VALUES[key])
}

function changeSort(value) {
  if (sort.value === value) return
  sort.value = value
  reload()
}

function clearKeyword() {
  if (!keyword.value) return
  keyword.value = ''
  reload()
}

function handleRefreshRestore() { if (!loading.value) refreshing.value = false }
function goBack() { navigator.back() }

/** 保持列表实例和滚动位置，详情页复用原规格与加购规则。 */
function openProduct(product, buy) {
  navigator.navigateTo(buy ? routes.commerce.productPurchase(product.productId) : routes.commerce.productDetail(product.productId)).catch(() => {})
}

/** 配置失效后回到首页重新获取生效布局。 */
function returnHome() { navigator.reLaunch(routes.home()) }

onShow(() => { visible = true; ignoreDirectionUntil = 0; resetTools() })
onHide(() => { visible = false; resetTools() })
watch(() => [user.userId, user.dealerId, user.permissions.join(','), getLocale()], () => { title.value = ''; reload() })
onBeforeUnmount(() => { disposed = true; epoch++ })
</script>

<style scoped>
.section-shell { --catalog-tools-height: 62px; }
.section-tools-placeholder { height: var(--catalog-tools-height, 62px); }
.section-page { max-width: 1450px; margin: 0 auto; padding: 12px var(--page-content-gutter, 16px) 28px; box-sizing: border-box; }
.section-title { display: block; margin-bottom: 14px; color: var(--text-primary, #1B1C20); font-size: var(--type-card-title-size, 16px); font-weight: var(--font-weight-semibold, 600); line-height: 24px; }
.section-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
@media (min-width: 840px) { .section-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; } }
@media (min-width: 1024px) and (orientation: landscape) { .section-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; } }
</style>
