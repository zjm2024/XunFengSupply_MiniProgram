<template>
  <view class="category-tab tab-page">
    <view v-if="loading && !initialized" class="state-box state-box--loading">
      <view class="loading-dot" />
      <text>正在加载商品分类...</text>
    </view>

    <view v-else-if="loadFailed || !categoryTree.length" class="state-box">
      <view class="state-illustration">
        <AppSvgIllustration :svg="noSearchResultSvg" size="lg" />
      </view>
      <text class="state-title">暂未获取到商品分类</text>
      <text class="state-description">请检查网络后重新加载</text>
      <view class="retry-button" hover-class="control--pressed" @click="loadCategories">
        <AppIcon name="refresh" :size="16" />
        <text>重新加载</text>
      </view>
    </view>

    <view v-else class="category-layout">
      <scroll-view class="primary-scroll" scroll-y :show-scrollbar="false">
        <view class="primary-list">
          <view
            v-for="category in categoryTree"
            :key="String(category.id)"
            class="primary-item"
            :class="{ 'is-active': isSameId(category.id, activeRootId) }"
            hover-class="primary-item--pressed"
            @click="selectPrimary(category)"
          >
            <view class="primary-indicator" />
            <text>{{ category.name }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="category-content">
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
          class="category-groups-scroll"
          scroll-y
          scroll-with-animation
          :show-scrollbar="false"
          :scroll-top="contentScrollTop"
        >
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

              <view v-if="isSectionLoading(section)" class="product-preview-grid">
                <view v-for="index in 3" :key="index" class="product-skeleton">
                  <view class="skeleton-image" />
                  <view class="skeleton-copy">
                    <view class="skeleton-line skeleton-line--wide" />
                    <view class="skeleton-line skeleton-line--price" />
                  </view>
                </view>
              </view>

              <view v-else-if="getSectionProducts(section).length" class="product-preview-grid">
                <AppProductCard
                  v-for="product in getSectionProducts(section)"
                  :key="product.productId"
                  :product="product"
                  variant="compact"
                  :show-code="false"
                  :show-stock="false"
                  @click="openProduct(product)"
                />
              </view>

              <view v-else class="product-empty" hover-class="control--pressed" @click="openCategoryProducts(section)">
                <AppIcon name="product" :size="24" />
                <view class="product-empty-copy">
                  <text class="product-empty-title">暂无商品预览</text>
                  <text class="product-empty-description">进入商品列表查看该分类</text>
                </view>
                <AppIcon name="arrow-right" :size="16" />
              </view>

              <view v-if="section.children?.length" class="deeper-entry" @click="openCategoryProducts(section)">
                <AppIcon name="filter" :size="14" />
                <text>该分类还有下级分类，进入列表继续筛选</text>
              </view>
            </view>

            <view class="deep-category-hint">
              <AppIcon name="filter" :size="17" />
              <text>分类页展示前三层，更深层级请在商品列表筛选</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { getCategoryList, getGoodsList } from '@/subPackages/commerce/api/productApi.js'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductCard from '@/shared/ui/AppProductCard/AppProductCard.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import noSearchResultSvg from '../../../shared/assets/illustrations/no-search-result.svg?raw'

const props = defineProps({ active: { type: Boolean, default: false } })

const categoryTree = ref([])
const activeRootId = ref(null)
const activeSecondaryId = ref(null)
const productsByCategory = ref({})
const loadingByCategory = ref({})
const loadedCategoryIds = ref({})
const contentScrollTop = ref(0)
const loading = ref(false)
const initialized = ref(false)
const loadFailed = ref(false)

const activeRoot = computed(() => (
  categoryTree.value.find(category => isSameId(category.id, activeRootId.value))
  || categoryTree.value[0]
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

watch(() => props.active, active => {
  if (active && !initialized.value) loadCategories()
}, { immediate: true })

watch(categorySections, sections => {
  if (props.active && sections.length) loadProductPreviews(sections)
}, { flush: 'post' })

async function loadCategories() {
  if (loading.value) return
  loading.value = true
  loadFailed.value = false

  try {
    const result = await getCategoryList()
    categoryTree.value = Array.isArray(result)
      ? result.filter(category => category?.id !== null && category?.id !== undefined && category?.name)
      : []
    setActiveRoot(categoryTree.value[0] || null)
  } catch (error) {
    categoryTree.value = []
    activeRootId.value = null
    activeSecondaryId.value = null
    loadFailed.value = true
    console.warn('[HomeCategory] 分类加载失败:', error)
  } finally {
    loading.value = false
    initialized.value = true
  }
}

function isSameId(first, second) {
  return String(first ?? '') === String(second ?? '')
}

function categoryKey(category) {
  return String(category?.id ?? '')
}

function setActiveRoot(category) {
  activeRootId.value = category?.id ?? null
  const firstSecondary = Array.isArray(category?.children) ? category.children[0] : null
  activeSecondaryId.value = firstSecondary?.id ?? category?.id ?? null
  resetContentScroll()
}

function selectPrimary(category) {
  if (isSameId(category.id, activeRootId.value)) return
  setActiveRoot(category)
}

function selectSecondary(category) {
  if (isSameId(category.id, activeSecondaryId.value)) return
  activeSecondaryId.value = category.id
  resetContentScroll()
}

async function resetContentScroll() {
  contentScrollTop.value = 1
  await nextTick()
  contentScrollTop.value = 0
}

async function loadProductPreviews(sections) {
  const pendingSections = sections.filter(section => !loadedCategoryIds.value[categoryKey(section)])
  for (let index = 0; index < pendingSections.length; index += 3) {
    await Promise.all(pendingSections.slice(index, index + 3).map(loadSectionProducts))
  }
}

async function loadSectionProducts(section) {
  const key = categoryKey(section)
  if (!key || loadingByCategory.value[key] || loadedCategoryIds.value[key]) return

  loadingByCategory.value = { ...loadingByCategory.value, [key]: true }
  try {
    const result = await getGoodsList({
      pageNum: 1,
      pageSize: 9,
      categoryId: section.id,
      hasImage: true,
    })
    productsByCategory.value = {
      ...productsByCategory.value,
      [key]: Array.isArray(result?.items) ? result.items : [],
    }
  } catch (error) {
    productsByCategory.value = { ...productsByCategory.value, [key]: [] }
    console.warn(`[HomeCategory] 分类 ${section.name} 商品预览加载失败:`, error)
  } finally {
    loadingByCategory.value = { ...loadingByCategory.value, [key]: false }
    loadedCategoryIds.value = { ...loadedCategoryIds.value, [key]: true }
  }
}

function isSectionLoading(section) {
  return Boolean(loadingByCategory.value[categoryKey(section)])
}

function getSectionProducts(section) {
  return productsByCategory.value[categoryKey(section)] || []
}

function getGroupSubtitle(section) {
  const products = getSectionProducts(section)
  if (products.length) return `精选 ${products.length} 件商品`
  return section.children?.length ? `${section.children.length} 个更深层分类` : '分类商品'
}

function openProduct(product) {
  if (!product?.productId) return
  return navigator.navigateTo(routes.commerce.productDetail(product.productId))
}

function openCategoryProducts(category) {
  if (category?.id === null || category?.id === undefined || category?.id === '') return
  return navigator.navigateTo(routes.commerce.productList({ categoryId: category.id }))
}
</script>

<style lang="scss" scoped>
.tab-page {
  display: flex;
  width: 100%;
  max-width: 1180px;
  min-height: 100%;
  margin: 0 auto;
  padding: 4px 12px calc(76px + env(safe-area-inset-bottom));
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

.category-layout {
  display: flex;
  height: calc(100vh - 154px);
  min-height: 460px;
  overflow: hidden;
  border-radius: 20px;
  background: #f2f3f4;
}

.primary-scroll {
  width: 92px;
  height: 100%;
  flex: 0 0 92px;
  background: #eceef0;
}

.primary-list {
  padding: 7px 0 18px;
}

.primary-item {
  position: relative;
  display: flex;
  min-height: 54px;
  padding: 7px 11px;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  color: #696d75;
  font-size: 12px;
  line-height: 1.35;
  text-align: center;
}

.primary-item.is-active {
  color: #202228;
  font-weight: 720;
}

.primary-indicator {
  position: absolute;
  top: 50%;
  left: 0;
  width: 3px;
  height: 18px;
  border-radius: 0 3px 3px 0;
  background: transparent;
  transform: translateY(-50%);
}

.primary-item.is-active .primary-indicator {
  background: var(--color-brand, #d7192d);
}

.primary-item--pressed,
.control--pressed {
  opacity: 0.66;
}

.category-content {
  display: flex;
  min-width: 0;
  height: 100%;
  flex: 1;
  flex-direction: column;
}

.secondary-tabs {
  width: 100%;
  min-height: 54px;
  flex: 0 0 54px;
  white-space: nowrap;
  background: #f2f3f4;
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
  border-radius: 17px;
  color: #676b73;
  font-size: 11px;
  background: #fff;
}

.secondary-tab.is-active {
  color: #fff;
  font-weight: 680;
  background: #292b30;
}

.category-groups-scroll {
  min-height: 0;
  flex: 1;
}

.category-groups {
  padding: 0 10px 18px;
}

.category-group {
  margin-bottom: 10px;
  padding: 14px 12px 12px;
  border-radius: 17px;
  background: #fff;
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
  font-size: 15px;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-subtitle {
  margin-top: 3px;
  color: #a0a3aa;
  font-size: 8px;
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
  border-radius: 14px;
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
  border-radius: 14px;
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
  font-size: 11px;
  font-weight: 650;
}

.product-empty-description {
  margin-top: 4px;
  font-size: 8px;
}

.deeper-entry {
  min-height: 34px;
  margin-top: 8px;
  padding: 0 10px;
  justify-content: center;
  gap: 5px;
  border-radius: 12px;
  color: #8e929a;
  font-size: 8px;
  background: #f7f8f9;
}

.deep-category-hint {
  min-height: 46px;
  padding: 0 14px;
  justify-content: center;
  gap: 7px;
  border-radius: 15px;
  color: #8b8e96;
  font-size: 9px;
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
  font-size: 11px;
}

.state-box--loading {
  min-height: 300px;
}

.state-illustration {
  margin-bottom: 4px;
}

.state-title {
  color: #454850;
  font-size: 15px;
  font-weight: 700;
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
  border-radius: 20px;
  color: #fff;
  font-size: 11px;
  font-weight: 680;
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
  .primary-scroll {
    width: 82px;
    flex-basis: 82px;
  }

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
  .primary-scroll {
    width: 124px;
    flex-basis: 124px;
  }

  .primary-item {
    min-height: 58px;
    padding-right: 15px;
    padding-left: 15px;
    font-size: 13px;
  }

  .product-preview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 10px;
  }
}

@media screen and (min-width: 821px) {
  .tab-page {
    padding: 6px 24px 20px;
  }

  .category-layout {
    height: calc(100vh - 102px);
    min-height: 590px;
    border-radius: 24px;
  }

  .primary-scroll {
    width: 150px;
    flex-basis: 150px;
  }

  .primary-item {
    min-height: 62px;
    font-size: 14px;
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
    border-radius: 19px;
    font-size: 12px;
  }

  .category-groups {
    padding: 0 16px 24px;
  }

  .category-group {
    margin-bottom: 14px;
    padding: 20px 18px 18px;
    border-radius: 21px;
  }

  .group-title {
    font-size: 18px;
  }

  .group-subtitle {
    font-size: 10px;
  }

  .product-preview-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
}
</style>
