<template>
  <AppPageShell>
    <template #header>
      <app-header title="产品手册" :show-back="true" />
    </template>

    <template #content>
      <AppContent
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="handleRefresh"
        @refresherrestore="handleRefresherRestore"
        @refresherabort="handleRefresherRestore"
        @scrolltolower="handleLoadMore"
      >
        <view class="manual-page">
          <scroll-view v-if="categories.length > 1" class="category-tabs" scroll-x>
            <view class="category-tabs-inner">
              <button
                v-for="category in categories"
                :key="category.id"
                class="category-btn"
                :class="{ 'is-active': selectedCategoryId === category.id }"
                @click="selectCategory(category.id)"
              >{{ category.title }}</button>
            </view>
          </scroll-view>

          <AppPageState
            :state="pageStatus.status.value"
            :has-stale-content="pageStatus.hasStaleContent.value"
            icon-type="product"
            action-text="重新加载"
            :fullscreen="false"
            @retry="handleRetry"
          >
            <view class="manual-list">
              <view
                v-for="item in manuals"
                :key="item.id"
                class="manual-item"
                hover-class="card--pressed"
                @click="preview(item)"
              >
                <AppProductImage class="manual-cover" :src="item.coverUrl" mode="aspectFit" lazy-load :fallback-icon-size="28" />
                <view class="manual-copy">
                  <text class="manual-title">{{ item.title }}</text>
                  <text class="manual-meta">{{ item.date ? `更新于 ${item.date}` : '暂无发布日期' }}</text>
                  <text v-if="item.fileUrl" class="manual-file-hint">支持在线预览</text>
                </view>
                <AppIcon name="chevron-right" :size="18" class="manual-arrow" />
              </view>
              <AppLoadMore
                v-if="manuals.length"
                :status="pageStatus.isLoadingMore.value
                  ? 'loading'
                  : (pageStatus.isError.value && pageStatus.hasStaleContent.value
                    ? 'error'
                    : (!pageStatus.hasMore.value ? 'no-more' : 'idle'))"
                @retry="handleLoadMore"
              />
            </view>
            <template #skeleton>
              <view class="manual-list">
                <view v-for="item in 4" :key="item" class="manual-skeleton" />
              </view>
            </template>
          </AppPageState>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import { usePageState } from '@/shared/composables/usePageState.js'
import { getManualCategories, getManualList } from '../../api/manual.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { getCachedResource } from '@/shared/utils/resourceCache.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'

const ROOT_CATEGORY_ID = 'd244l5QtSn'
const categoryTree = ref([])
const selectedCategoryId = ref(ROOT_CATEGORY_ID)
const isRefreshing = ref(false)

const categories = computed(() => [
  { id: ROOT_CATEGORY_ID, title: '全部手册' },
  ...categoryTree.value,
])

const pageStatus = usePageState(async ({ page = 1, pageSize = 10 } = {}) => {
  const result = await getManualList({
    categoryId: selectedCategoryId.value,
    pageNum: page,
    pageSize,
  })
  const items = Array.isArray(result?.items) ? result.items : []
  void cacheManualCovers(items, selectedCategoryId.value)
  return items
}, { autoLoad: false, pageSize: 10 })

const manuals = computed(() => Array.isArray(pageStatus.data.value) ? pageStatus.data.value : [])

onMounted(loadPage)

async function loadPage() {
  try {
    const categoryResult = await getManualCategories()
    const rootChildren = Array.isArray(categoryResult?.root?.children)
      ? categoryResult.root.children
      : []
    const categories = Array.isArray(categoryResult?.categories)
      ? categoryResult.categories
      : []
    categoryTree.value = categories.length > 0 ? categories : rootChildren
    await pageStatus.refresh()
  } catch (error) {
    console.error('[Manual] 产品手册加载失败:', error)
    pageStatus.setError(error)
  }
}

/** 后台缓存封面，不阻塞列表首屏显示。 */
async function cacheManualCovers(items, categoryId) {
  const cached = await Promise.all(items.map(async (item) => ({
    id: item.id,
    coverUrl: await getCachedResource(item.coverUrl, { kind: 'image' }),
  })))
  const cachedMap = new Map(cached.map(item => [item.id, item.coverUrl]))
  if (selectedCategoryId.value !== categoryId) return
  pageStatus.data.value = manuals.value.map(item => cachedMap.has(item.id)
    ? { ...item, coverUrl: cachedMap.get(item.id) }
    : item)
}

async function selectCategory(categoryId) {
  if (categoryId === selectedCategoryId.value) return
  selectedCategoryId.value = categoryId
  pageStatus.reset()
  await pageStatus.refresh()
}

function handleLoadMore() {
  pageStatus.loadMore()
}

async function handleRefresh() {
  if (isRefreshing.value) return
  const startedAt = Date.now()
  isRefreshing.value = true
  try {
    await pageStatus.refresh()
  } finally {
    await waitForRefreshAnimation(startedAt)
    isRefreshing.value = false
  }
}

function handleRefresherRestore() {
  if (!pageStatus.isRefreshing.value) isRefreshing.value = false
}

function handleRetry() {
  loadPage()
}

async function preview(item) {
  if (item?.id) await navigator.navigateTo(routes.content.manualPreview(item.id))
}
</script>

<style lang="scss" scoped>
.manual-page { width: 100%; max-width: 1120px; padding: 12px 16px calc(30px + env(safe-area-inset-bottom)); box-sizing: border-box; }
.category-tabs { width: 100%; margin-bottom: 14px; white-space: nowrap; }
.category-tabs-inner { display: flex; gap: 8px; width: max-content; }
.category-btn { min-height: 34px; padding: 0 16px; border: 1px solid #E5E6EB; border-radius: 17px; color: #666A73; background: #FFF; font-size: 12px; line-height: 34px; }
.category-btn::after { border: 0; }
.category-btn.is-active { border-color: #D7192D; color: #FFF; background: #D7192D; font-weight: 700; }
.manual-list { display: grid; gap: 12px; }
.manual-item { display: flex; min-height: 92px; align-items: center; gap: 12px; padding: 12px; border-radius: 16px; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.manual-cover { width: 70px; height: 82px; flex: 0 0 70px; border-radius: 10px; background: #F1F3F6; }
.manual-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.manual-title { overflow: hidden; color: #17191E; font-size: 15px; font-weight: 750; line-height: 1.45; text-overflow: ellipsis; white-space: nowrap; }
.manual-meta, .manual-file-hint { margin-top: 7px; color: #9699A1; font-size: 11px; }
.manual-file-hint { color: #D7192D; }
.manual-arrow { flex: 0 0 auto; color: #A0A3AA; }
.list-status { padding: 8px 0; color: #9A9CA3; font-size: 11px; text-align: center; }
.state-box { display: flex; min-height: 300px; align-items: center; justify-content: center; flex-direction: column; gap: 9px; color: #94979F; font-size: 12px; }
.state-title { color: #454850; font-size: 15px; font-weight: 700; }
.manual-skeleton { height: 106px; border-radius: 16px; background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%); background-size: 200% 100%; animation: manual-skeleton-shimmer 1.5s infinite; }
.card--pressed { opacity: .9; transform: scale(.985); }
@keyframes manual-skeleton-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
</style>
