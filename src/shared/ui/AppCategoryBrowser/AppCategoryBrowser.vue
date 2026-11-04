<template>
  <view class="category-tab tab-page">
    <AppPageState v-if="loading && !categories.length" state="loading" />

    <view v-else-if="failed || !categories.length" class="state-box">
      <view class="state-illustration">
        <AppSvgIllustration :svg="noSearchResultSvg" size="lg" />
      </view>
      <text class="state-title">{{ t('main.category.empty') }}</text>
      <text class="state-description">{{ t('main.category.retryHint') }}</text>
      <view class="retry-button" hover-class="control--pressed" @click="refreshCategories">
        <AppIcon name="refresh" :size="16" />
        <text>{{ t('main.category.retry') }}</text>
      </view>
    </view>

    <AppCategoryLayout v-else :categories="categories" :active-id="activeRootId" @select="selectPrimary">
        <scroll-view
          v-if="secondaryCategories.length"
          class="secondary-tabs"
          scroll-x
          :show-scrollbar="false"
        >
          <view class="secondary-tab-list">
            <view
              v-for="category in secondaryCategories"
              :key="String(category.id)"
              class="secondary-tab"
              :class="{ 'is-active': isSameId(category.id, activeSecondaryId) }"
              hover-class="control--pressed"
              @click="selectSecondary(category)"
            >
              <text>{{ category.name }}</text>
            </view>
          </view>
        </scroll-view>

        <scroll-view
          class="category-groups-scroll" :refresher-default-style="refreshIndicatorStyle" refresher-background="transparent" :refresher-threshold="48" :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="refreshCategories"
          scroll-y
          scroll-with-animation
          :show-scrollbar="false"
          :scroll-top="contentScrollTop"
        >
          <!-- #ifdef H5 -->
          <template #refresher><view class="compact-refresher"><view class="compact-refresher-icon" :class="{ 'is-refreshing': refreshing }"><AppIcon name="refresh" :size="20" color="#737A84" /></view></view></template>
          <!-- #endif -->
          <view class="category-groups">
            <view
              v-for="section in categorySections"
              :key="String(section.id)"
              class="category-group"
            >
              <view class="group-heading">
                <view class="group-title-copy">
                  <text class="group-title">{{ section.name }}</text>
                  <text class="group-subtitle">{{ getGroupSubtitle(section) }}</text>
                </view>
              </view>

              <AppPageState v-if="isSectionLoading(section)" state="loading" compact />

              <view v-else-if="getSectionProducts(section).length" class="product-preview-grid">
                <AppProductCard
                  v-for="product in getSectionProducts(section)"
                  :key="product.productId"
                  :product="product"
                  variant="compact"
                  :show-code="false"
                  :show-stock="false" :show-price="showPrice" :show-image-stock-badge="false"
                  @click="openProduct(product)"
                />
              </view>

              <view v-else class="product-empty" hover-class="control--pressed" @click="openCategoryProducts(section)">
                <AppIcon name="product" :size="24" />
                <view class="product-empty-copy">
                  <text class="product-empty-title">{{ t('main.category.noPreview') }}</text>
                  <text class="product-empty-description">{{ t('main.category.openList') }}</text>
                </view>
                <AppIcon name="arrow-right" :size="16" />
              </view>

              <view v-if="section.children?.length" class="deeper-entry" @click="openCategoryProducts(section)">
                <AppIcon name="filter" :size="14" />
                <text>{{ t('main.category.deeper') }}</text>
              </view>
            </view>

            <!-- <view class="deep-category-hint">
              <AppIcon name="filter" :size="18" />
              <text>分类页展示前三层，更深层级请在商品列表筛选</text>
            </view> -->
          </view>
        </scroll-view>
    </AppCategoryLayout>
  </view>
</template>
<script setup>
/** H5自定义刷新头，原生App/小程序使用原生指示器以兼容编译。 */
let refreshIndicatorStyle = 'black'
// #ifdef H5
refreshIndicatorStyle = 'none'
// #endif
import { computed, nextTick, ref, watch, onBeforeUnmount } from 'vue'
import { t } from '@/shared/i18n/index.js'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductCard from '@/shared/ui/AppProductCard/AppProductCard.vue'
import AppCategoryLayout from '@/shared/ui/AppCategoryLayout/AppCategoryLayout.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import noSearchResultSvg from '@/shared/assets/illustrations/no-search-result.svg?raw'
/** 经销商与分享入口共用三级分类展示；数据加载由所属业务注入。 */
const props = defineProps({ categories: { type: Array, default: () => [] }, active: { type: Boolean, default: true }, loading: Boolean, failed: Boolean, refreshing: Boolean, showPrice: { type: Boolean, default: true }, loadProducts: { type: Function, required: true } })
const emit = defineEmits(['product', 'category', 'refresh'])
let generation = 0
/** 重新读取分类由所属入口授权，展示层不调用业务API。 */
function refreshCategories() { emit('refresh') }
const activeRootId = ref(null)
const activeSecondaryId = ref(null)
const productsByCategory = ref({})
const loadingByCategory = ref({})
const loadedCategoryIds = ref({})
const contentScrollTop = ref(0)


const activeRoot = computed(() => (
  props.categories.find(category => isSameId(category.id, activeRootId.value))
  || props.categories[0]
  || null
))

const secondaryCategories = computed(() => (
  Array.isArray(activeRoot.value?.children) ? activeRoot.value.children : []
))

const activeSecondary = computed(() => (
  secondaryCategories.value.find(category => isSameId(category.id, activeSecondaryId.value))
  || secondaryCategories.value[0]
  || activeRoot.value
  || null
))

const categorySections = computed(() => {
  const children = Array.isArray(activeSecondary.value?.children) ? activeSecondary.value.children : []
  return children.length ? children : (activeSecondary.value ? [activeSecondary.value] : [])
})

/** 按字符串比较分类标识，保留长ID精度。 */
function isSameId(first, second) {
  return String(first ?? '') === String(second ?? '')
}

/** 生成稳定的预览缓存键。 */
function categoryKey(category) {
  return String(category?.id ?? '')
}

/** 一级分类切换时选中首个二级标签。 */
function setActiveRoot(category) {
  activeRootId.value = category?.id ?? null
  const firstSecondary = Array.isArray(category?.children) ? category.children[0] : null
  activeSecondaryId.value = firstSecondary?.id ?? category?.id ?? null
  resetContentScroll()
}

/** 切换一级分类，复用当前分类数据。 */
function selectPrimary(category) {
  if (isSameId(category.id, activeRootId.value)) return
  setActiveRoot(category)
}

/** 切换二级标签并更新三级分组。 */
function selectSecondary(category) {
  if (isSameId(category.id, activeSecondaryId.value)) return
  activeSecondaryId.value = category.id
  resetContentScroll()
}

/** 分类切换复位内容滚动。 */
async function resetContentScroll() {
  contentScrollTop.value = 1
  await nextTick()
  contentScrollTop.value = 0
}

/** 每批最多三个分组加载预览，分类变更后停止旧批次。 */
async function loadProductPreviews(sections) {
  const version = generation
  const pendingSections = sections.filter(section => !loadedCategoryIds.value[categoryKey(section)])
  for (let index = 0; index < pendingSections.length; index += 3) {
    if (version !== generation) return
    await Promise.all(pendingSections.slice(index, index + 3).map(loadSectionProducts))
  }
}

/** 读取九个有图商品并丢弃过期预览响应。 */
async function loadSectionProducts(section) {
  const key = categoryKey(section)
  if (!key || loadingByCategory.value[key] || loadedCategoryIds.value[key]) return

  const ticket = generation
  loadingByCategory.value = { ...loadingByCategory.value, [key]: true }
  try {
    const result = await props.loadProducts({
      pageNum: 1,
      pageSize: 9,
      categoryId: section.id,
      hasImage: true,
    })
    if (ticket !== generation) return
    productsByCategory.value = {
      ...productsByCategory.value,
      [key]: Array.isArray(result?.items) ? result.items : [],
    }
  } catch (error) {
    productsByCategory.value = { ...productsByCategory.value, [key]: [] }
    console.warn(`[HomeCategory] 分类 ${section.name} 商品预览加载失败:`, error)
  } finally {
    if (ticket !== generation) return
    loadingByCategory.value = { ...loadingByCategory.value, [key]: false }
    loadedCategoryIds.value = { ...loadedCategoryIds.value, [key]: true }
  }
}

/** 读取分组加载状态。 */
function isSectionLoading(section) {
  return Boolean(loadingByCategory.value[categoryKey(section)])
}

/** 读取已授权的分组预览。 */
function getSectionProducts(section) {
  return productsByCategory.value[categoryKey(section)] || []
}

/** 复用经销商分类分组副标题。 */
function getGroupSubtitle(section) {
  const products = getSectionProducts(section)
  if (products.length) return t('main.category.selected', { count: products.length })
  return section.children?.length ? t('main.category.subcategories', { count: section.children.length }) : t('main.category.products')
}

/** 通知业务入口打开商品详情。 */
function openProduct(product) {
  if (!product?.productId) return
  emit('product', product.productId)
}

/** 通知业务入口打开分类查询列表。 */
function openCategoryProducts(category) {
  if (category?.id === null || category?.id === undefined || category?.id === '') return
  emit('category', category.id)
}

/** 分类或活跃状态变化时清理旧预览，迟到报价不能重新出现。 */
watch(() => [props.categories, props.active], () => {
 generation++; productsByCategory.value = {}; loadingByCategory.value = {}; loadedCategoryIds.value = {}
 if (!props.categories.length) return
 const secondary = activeSecondaryId.value
 setActiveRoot(props.categories.find(item => isSameId(item.id, activeRootId.value)) || props.categories[0])
 if (secondaryCategories.value.some(item => isSameId(item.id, secondary))) activeSecondaryId.value = secondary
 if (props.active) loadProductPreviews(categorySections.value)
}, { immediate: true })
watch(categorySections, sections => { if (props.active) loadProductPreviews(sections) }, { flush: 'post' })
onBeforeUnmount(() => { generation++ })
</script>
<style lang="scss" scoped>
.tab-page {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  padding: 4px 12px 0;
  flex-direction: column;
  box-sizing: border-box;
}

.secondary-tab-list,
.secondary-tab,
.group-heading,
.product-empty,
.deeper-entry,
.retry-button,
.deep-category-hint {
  display: flex;
  align-items: center;
}

.control--pressed {
  opacity: 0.66;
}

.secondary-tabs {
  width: 100%;
  min-height: 54px;
  flex: 0 0 54px;
  white-space: nowrap;
  background: rgba(242,243,244,.62);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}

.secondary-tab-list {
  width: max-content;
  height: 54px;
  padding: 0 12px;
  gap: 8px;
}

.secondary-tab {
  min-height: 32px;
  padding: 0 13px;
  justify-content: center;
  border-radius: var(--radius-feature, 18px);
  color: #676b73;
  font-size: var(--type-caption-size, 12px);
  background: rgba(255,255,255,.68);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}

.secondary-tab.is-active {
  color: #fff;
  font-weight: var(--font-weight-semibold, 600);
  background: #292b30;
}

.category-groups-scroll {
  height: 0;
  min-height: 0;
  flex: 1;
}

.category-groups {
  padding: 0 10px 18px;
}

.category-group {
  margin-bottom: 10px;
  padding: 14px 12px 12px;
  border-radius: var(--radius-feature, 18px);
  background: var(--glass-card-background, rgba(255,255,255,.74));
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

.group-heading {
  min-height: 36px;
  justify-content: space-between;
  gap: 12px;
}

.group-title-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.group-title {
  overflow: hidden;
  color: #25272d;
  font-size: var(--type-card-title-size, 16px);
  font-weight: var(--font-weight-bold, 700);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-subtitle {
  margin-top: 3px;
  color: #a0a3aa;
  font-size: var(--type-caption-size, 12px);
}

.product-preview-grid {
  display: grid;
  margin-top: 10px;
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;
}

.product-skeleton {
  display: flex;
  min-height: 86px;
  align-items: center;
  gap: 8px;
}

.skeleton-image {
  width: 72px;
  height: 72px;
  flex: 0 0 72px;
  border-radius: var(--radius-card, 14px);
  background: #f0f1f3;
}

.skeleton-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 10px;
}

.skeleton-line {
  width: 46%;
  height: 9px;
  border-radius: 5px;
  background: #f0f1f3;
}

.skeleton-line--wide {
  width: 82%;
}

.skeleton-line--price {
  width: 34%;
}

.product-empty {
  min-height: 82px;
  margin-top: 10px;
  padding: 0 12px;
  gap: 10px;
  border-radius: var(--radius-card, 14px);
  color: #9b9ea5;
  background: #f7f8f9;
}

.product-empty-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.product-empty-title {
  color: #555860;
  font-size: var(--type-caption-size, 12px);
  font-weight: var(--font-weight-semibold, 600);
}

.product-empty-description {
  margin-top: 4px;
  font-size: var(--type-caption-size, 12px);
}

.deeper-entry {
  min-height: 34px;
  margin-top: 8px;
  padding: 0 10px;
  justify-content: center;
  gap: 5px;
  border-radius: var(--radius-card, 14px);
  color: #8e929a;
  font-size: var(--type-caption-size, 12px);
  background: #f7f8f9;
}

.deep-category-hint {
  min-height: 46px;
  padding: 0 14px;
  justify-content: center;
  gap: 7px;
  border-radius: var(--radius-card, 14px);
  color: #8b8e96;
  font-size: var(--type-caption-size, 12px);
  background: rgba(255, 255, 255, 0.62);
}

.state-box {
  display: flex;
  min-height: 420px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #92959d;
  font-size: var(--type-caption-size, 12px);
}

.state-box--loading {
  min-height: 300px;
}

.state-illustration {
  margin-bottom: 4px;
}

.state-title {
  color: #454850;
  font-size: var(--type-card-title-size, 16px);
  font-weight: var(--font-weight-bold, 700);
}

.state-description {
  color: #9b9ea5;
}

.retry-button {
  min-height: 40px;
  margin-top: 14px;
  padding: 0 16px;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius-feature, 18px);
  color: #fff;
  font-size: var(--type-caption-size, 12px);
  font-weight: var(--font-weight-semibold, 600);
  background: var(--color-brand, #d7192d);
}

.loading-dot {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(215, 25, 45, 0.12);
  border-top-color: var(--color-brand, #d7192d);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media screen and (max-width: 360px) {
  .category-groups {
    padding-right: 7px;
    padding-left: 7px;
  }

  .category-group {
    padding-right: 8px;
    padding-left: 8px;
  }
}

@media screen and (min-width: 600px) {
  .product-preview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 10px;
  }
}

@media screen and (min-width: 821px) {
  .tab-page {
    padding: 6px 0 20px;
  }

  .secondary-tabs,
  .secondary-tab-list {
    height: 64px;
  }

  .secondary-tabs {
    flex-basis: 64px;
  }

  .secondary-tab-list {
    padding-right: 20px;
    padding-left: 20px;
    gap: 10px;
  }

  .secondary-tab {
    min-height: 36px;
    padding: 0 16px;
    border-radius: var(--radius-feature, 18px);
    font-size: var(--type-caption-size, 12px);
  }

  .category-groups {
    padding: 0 16px 24px;
  }

  .category-group {
    margin-bottom: 14px;
    padding: 20px 18px 18px;
    border-radius: var(--radius-feature, 18px);
  }

  .group-title {
    font-size: var(--type-card-title-size, 16px);
  }

  .group-subtitle {
    font-size: var(--type-caption-size, 12px);
  }

  .product-preview-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
}

/* 原生H5刷新头按拖动距离设置内联高度，限制占位避免大幅下拉推走页面。 */
:deep(.uni-scroll-view-refresher){max-height:56px!important;overflow:hidden;background:transparent!important}
.compact-refresher{height:48px;display:flex;align-items:center;justify-content:center;background:transparent;pointer-events:none}
.compact-refresher-icon{display:flex;align-items:center;justify-content:center;width:28px;height:28px;color:#737a84}
.compact-refresher-icon.is-refreshing{animation:compact-refresher-spin .9s linear infinite}
@keyframes compact-refresher-spin{to{transform:rotate(360deg)}}

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.category-group {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
</style>
