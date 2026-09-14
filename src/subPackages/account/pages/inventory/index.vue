<template>
  <AppPageShell>
    <template #header>
      <AppHeader
        title="我的库存"
        :show-back="true"
        :searchable="true"
        :search-value="keywordInput"
        search-placeholder="搜索商品、规格或 SKU"
        @update:search-value="keywordInput = $event"
        @search="applySearch"
        @clear-search="clearSearch"
      />
    </template>
    <template #content>
      <AppContent padding="0 0 32px">
        <view class="inventory-page">
          <view class="toolbar">
            <scroll-view class="tab-scroll" scroll-x :show-scrollbar="false">
              <view class="tabs">
                <view v-for="tab in tabs" :key="tab.key" class="tab" :class="{ active: activeTab === tab.key }" @tap="changeTab(tab.key)">{{ tab.label }}</view>
              </view>
            </scroll-view>
          </view>

          <view class="content-wrap">
            <view class="result-head">
              <text>{{ activeTabLabel }}</text><text>{{ totalCount }} 个规格</text>
            </view>
            <AppPageState
              :state="pageState"
              title="暂无库存"
              :description="pageState === PageStatus.ERROR ? loadError : '采购订单确认收货后，商品会自动进入这里'"
              action-text="重新加载"
              @retry="reload"
              @action="reload"
            >
              <template #default>
                <view class="stock-grid">
                  <view v-for="item in items" :key="item.skuId" class="stock-card" hover-class="pressed" @tap="openDetail(item.skuId)">
                    <AppProductImage class="product-image" :src="item.imageUrl" :stock="item.availableQuantity" mode="aspectFill" />
                    <view class="product-copy">
                      <view class="name-line">
                        <text class="product-name">{{ item.productName || '未命名商品' }}</text>
                        <AppIcon name="chevron-right" :size="16" color="#A4A8AF" />
                      </view>
                      <text class="sku-name">{{ item.skuName || `SKU ${item.skuId}` }}</text>
                      <view class="spec-line">
                        <text v-if="item.colorName">颜色 {{ item.colorName }}</text>
                        <text v-if="item.sizeName">尺码 {{ item.sizeName }}</text>
                        <text v-if="item.skuCode">{{ item.skuCode }}</text>
                      </view>
                      <view class="quantity-row">
                        <view class="primary-qty"><text>可用</text><text>{{ formatQty(item.availableQuantity) }} {{ item.unit }}</text></view>
                        <view><text>在手</text><text>{{ formatQty(item.onHandQuantity) }}</text></view>
                        <view><text>锁定/不可用</text><text>{{ formatQty(item.reservedQuantity + item.unavailableQuantity) }}</text></view>
                      </view>
                      <view class="card-foot">
                        <text>{{ item.warehouseCount }} 个仓位</text>
                        <text>最近入库 {{ formatDate(item.lastInboundAt) }}</text>
                      </view>
                    </view>
                  </view>
                </view>
              </template>
            </AppPageState>
            <view v-if="pageState === PageStatus.CONTENT" class="load-status">{{ loadingMore ? '正在加载…' : (hasMore ? '上拉加载更多' : '已展示全部库存') }}</view>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { getDealerInventoryList } from '../../api/inventory.js'

const tabs = Object.freeze([
  { key: 'all', label: '全部库存' },
  { key: 'available', label: '有可用库存' },
  { key: 'low', label: '低库存' },
  { key: 'out', label: '无可用库存' },
])
const items = ref([])
const totalCount = ref(0)
const pageNum = ref(1)
const pageSize = 16
const keywordInput = ref('')
const keyword = ref('')
const activeTab = ref('all')
const pageState = ref(PageStatus.LOADING)
const loadingMore = ref(false)
const hasMore = ref(false)
const loadError = ref('')
const activeTabLabel = computed(() => tabs.find(item => item.key === activeTab.value)?.label || '全部库存')

onShow(() => { if (pageState.value === PageStatus.LOADING) reload() })
onReachBottom(loadMore)

async function reload() {
  pageNum.value = 1
  items.value = []
  pageState.value = PageStatus.LOADING
  loadError.value = ''
  try {
    const result = await getDealerInventoryList({
      pageNum: 1,
      pageSize,
      keyword: keyword.value,
      stockStatus: activeTab.value,
    })
    applyResult(result, false)
  } catch (error) {
    loadError.value = error?.message || '库存读取失败，请稍后重试'
    pageState.value = PageStatus.ERROR
  }
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value || pageState.value !== PageStatus.CONTENT) return
  loadingMore.value = true
  try {
    const nextPage = pageNum.value + 1
    const result = await getDealerInventoryList({ pageNum: nextPage, pageSize, keyword: keyword.value, stockStatus: activeTab.value })
    pageNum.value = nextPage
    applyResult(result, true)
  } catch (error) {
    uni.showToast({ title: error?.message || '加载失败', icon: 'none' })
  } finally { loadingMore.value = false }
}

function applyResult(result, append) {
  items.value = append ? [...items.value, ...result.items] : result.items
  totalCount.value = result.totalCount
  hasMore.value = items.value.length < result.totalCount
  pageState.value = items.value.length ? PageStatus.CONTENT : PageStatus.EMPTY
}
function applySearch() { keyword.value = keywordInput.value.trim(); reload() }
function clearSearch() { keywordInput.value = ''; keyword.value = ''; reload() }
function changeTab(key) { if (key === activeTab.value) return; activeTab.value = key; reload() }
function openDetail(skuId) { navigator.navigateTo(routes.account.inventoryDetail(skuId)) }
function formatQty(value) { return Number(value || 0).toLocaleString('zh-CN') }
function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
</script>

<style lang="scss" scoped>
.inventory-page { width: 100%; }
.toolbar { position: sticky; z-index: 4; top: 0; padding: 8px var(--page-padding-x,16px); border-bottom: 1px solid #ECEEF1; background: rgba(255,255,255,.96); }
.tab-scroll { width: 100%; max-width: 1080px; margin: 0 auto; white-space: nowrap; }
.tabs { display: flex; width: max-content; gap: 7px; }
.tab { padding: 8px 12px; border: 1px solid #E3E5E8; border-radius: 10px; color: #696F78; background: #FFF; font-size: 11px; }
.tab.active { border-color: #D7192D; color: #FFF; background: #D7192D; font-weight: 650; }
.content-wrap { width: 100%; max-width: 1080px; margin: 0 auto; padding: 16px var(--page-padding-x,16px) 30px; box-sizing: border-box; }
.result-head { display: flex; justify-content: space-between; margin: 0 2px 11px; color: #8C9199; font-size: 10px; }
.result-head text:first-child { color: #343941; font-size: 13px; font-weight: 680; }
.stock-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 12px; }
.stock-card { display: grid; grid-template-columns: 94px minmax(0,1fr); gap: 13px; padding: 13px; border: 1px solid #E6E8EB; border-radius: 17px; background: #FFF; box-shadow: 0 7px 23px rgba(25,31,39,.035); }
.pressed { opacity: .7; transform: scale(.995); }
.product-image { width: 94px; height: 112px; border-radius: 12px; }
.product-copy { min-width: 0; }
.name-line { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.product-name { overflow: hidden; color: #23272E; font-size: 13px; font-weight: 690; line-height: 1.45; text-overflow: ellipsis; white-space: nowrap; }
.sku-name { display: block; margin-top: 5px; overflow: hidden; color: #828791; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.spec-line { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.spec-line text { padding: 3px 6px; border-radius: 6px; color: #68717B; background: #F2F4F5; font-size: 8px; }
.quantity-row { display: grid; grid-template-columns: 1.2fr .8fr 1fr; gap: 6px; margin-top: 10px; }
.quantity-row view { min-width: 0; }
.quantity-row text { display: block; overflow: hidden; color: #92969D; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.quantity-row text + text { margin-top: 3px; color: #3D434B; font-size: 11px; font-weight: 660; }
.quantity-row .primary-qty text + text { color: #1F6848; }
.card-foot { display: flex; justify-content: space-between; gap: 8px; margin-top: 9px; padding-top: 8px; border-top: 1px solid #F0F1F2; color: #9A9EA5; font-size: 8px; }
.load-status { padding: 20px 0 2px; color: #9B9FA6; font-size: 10px; text-align: center; }
@media screen and (min-width: 720px) {
  .toolbar { padding-top: 14px; padding-bottom: 14px; }
  .stock-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 15px; }
  .stock-card { grid-template-columns: 108px minmax(0,1fr); padding: 15px; }
  .product-image { width: 108px; height: 128px; }
}
</style>
