<template>
  <AppPageShell>
    <template #header>
      <app-header
        :title="t('commerce.titles.cart')"
        :show-back="true"
        :searchable="true"
        :search-value="searchKeyword"
        :search-placeholder="t('commerce.cart.searchPlaceholder')"
        @update:search-value="setSearchKeyword"
        @clear-search="clearSearch"
        :action-text="pageState === PageStatus.CONTENT ? (isManaging ? t('commerce.titles.done') : t('commerce.titles.manage')) : ''"
        @back="goBack"
        @action="toggleManagement"
      />
    </template>

    <template #content>
      <AppContent
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="onPullRefresh"
        @refresherrestore="finishPullRefresh"
        @refresherabort="finishPullRefresh"
      >
        <app-page-state
          :state="pageState"
          :title="stateTitle"
          :description="stateDescription"
          :action-text="pageState === PageStatus.EMPTY ? t('commerce.cart.browse') : t('commerce.cart.reload')"
          :has-stale-content="hasStaleForDisplay"
          icon-type="cart"
          @retry="refreshCart"
          @action="goToProductList"
        >
          <!-- 骨架屏插槽 -->
          <template #skeleton>
            <view class="cart-skeleton">
              <view class="sk-bar skeleton-block" />
              <view v-for="i in 3" :key="i" class="sk-card">
                <view class="sk-check skeleton-block" />
                <view class="sk-img skeleton-block" />
                <view class="sk-info">
                  <view class="sk-line skeleton-block" />
                  <view class="sk-line short skeleton-block" />
                  <view class="sk-line shorter skeleton-block" />
                </view>
              </view>
            </view>
          </template>

          <template #illustration>
            <AppSvgIllustration :svg="cartEmptySvg" size="lg" />
          </template>

          <!-- 正常内容 -->
          <template #default>
            <view class="cart-layout" :class="{ 'is-managing': isManaging }" @tap="closeItemActions">
              <!-- 主体区域 -->
              <view class="cart-main">
                <!-- 顶部工具栏 -->
                <view class="cart-toolbar">
                  <view class="toolbar-left">
                    <text class="toolbar-title">{{ t('commerce.cart.list') }}</text>
                    <text class="toolbar-desc">
                      {{ t('common.search.sortDefault') }} · {{ t('commerce.cart.listCount', { products: visibleProductCount, skus: visibleItems.length, quantity: visibleQuantity }) }}
                    </text>
                  </view>
                  <button v-if="!isManaging" class="outline-btn button-center" @click="goToProductList">{{ t('commerce.cart.continue') }}</button>
                </view>

                <view v-if="isSearching" class="search-summary">
                  <text>{{ t('commerce.cart.searchCount', { count: visibleItems.length }) }}</text>
                  <button class="link-btn button-center" @tap.stop="clearSearch">{{ t('commerce.cart.showAll') }}</button>
                </view>
                <view v-if="hiddenSelectedCount" class="search-selection-hint">
                  <text>{{ t(isManaging ? 'commerce.cart.hiddenManagement' : 'commerce.cart.hiddenSelected', { count: hiddenSelectedCount }) }}</text>
                </view>
                <view v-if="isSearching && !visibleItems.length" class="search-empty">
                  <AppIcon name="search" :size="28" />
                  <text>{{ t('commerce.cart.noSearchResults') }}</text>
                  <button class="link-btn button-center" @tap.stop="clearSearch">{{ t('commerce.cart.showAll') }}</button>
                </view>

                <!-- 同步状态提示 -->
                <view v-if="cartStore.syncHint" class="sync-hint">
                  <text class="sync-dot" />
                  <text class="sync-text">{{ cartStore.syncHint }}</text>
                </view>

                <!-- flush 错误提示 -->
                <view v-if="flushError" class="sync-hint is-error">
                  <text class="sync-text">{{ t('commerce.cart.syncNotice', { message: flushError.message || t('commerce.cart.retryHint') }) }}</text>
                  <button class="retry-link button-center" @click="retryFlush">{{ t('commerce.cart.retry') }}</button>
                </view>

                <!-- 有效商品：SPU 分组，组内展示 SKU -->
                <view class="spu-list">
                  <view v-for="group in validGroups" :key="group.key" class="spu-card">
                    <CartSpuHeader :name="group.name" :meta="t('commerce.cart.groupCount', { count:group.skuCount, quantity:group.totalQuantity })" :amount="'¥' + formatMoney(group.totalAmount)" :selected="group.allSelected" :partial="group.partiallySelected" :collapsed="isGroupCollapsed(group.key)" :expand-label="t('commerce.cart.expand')" :collapse-label="t('commerce.cart.collapse')" @select="onToggleGroup(group)" @product="goToDetail(group.productId)" @toggle="toggleGroup(group.key)" />

                    <view v-show="!isGroupCollapsed(group.key)" class="sku-list">
                      <view
                        v-for="item in group.items"
                        :key="item.cartItemId"
                        class="sku-action-shell"
                        :class="{
                          'action-open': isItemActionOpen(item.cartItemId),
                          'is-dragging': isItemDragging(item.cartItemId),
                        }"
                      >
                        <button class="sku-delete-action button-center" @tap.stop="deleteOne(item.cartItemId)">
                          <AppIcon name="trash" :size="20" color="#FFFFFF" />
                          <text>{{ t('commerce.cart.delete') }}</text>
                        </button>
                        <view
                          class="sku-row"
                          :style="skuSwipeStyle(item.cartItemId)"
                          @touchstart="onSkuTouchStart($event, item)"
                          @touchmove="onSkuTouchMove($event, item)"
                          @touchend="onSkuTouchEnd($event, item)"
                          @touchcancel="onSkuTouchCancel(item)"
                          @contextmenu.prevent="revealItemActions(item)"
                        >
                          <label class="check-wrap" @tap.stop="onToggleSelect(item)">
                            <view class="check" :class="{ checked: isSelected(item) }">
                              <text v-if="isSelected(item)">✓</text>
                            </view>
                          </label>

                          <AppProductImage
                            class="product-image"
                            :src="item.image"
                            :stock="item.stock"
                            @click="goToDetail(item.productId)"
                          />

                          <view class="product-info">
                            <text class="sku-title">{{ item.skuName || t('commerce.cart.defaultVariant') }}</text>
                            <text class="product-code">SKU：{{ item.code || item.skuId }}</text>
                            <view class="price-line">
                              <AmountText class="price" :text="'¥' + (formatMoney(item.price))" />
                              <AmountText v-if="getPriceDisplay(item).showListPrice" class="list-price" :class="{ 'list-price--strike': getPriceDisplay(item).strikeListPrice }" :text="'¥' + formatMoney(item.listPrice)" />
                              <text class="unit">/ {{ unitText(item) }}</text>
                            </view>
                            <AmountText v-if="item.strategyDiscount + item.promotionDiscount > 0" class="strategy-discount" :text="t('commerce.cart.strategyAmount', { amount: formatMoney(item.strategyDiscount + item.promotionDiscount) })" />
                            <view class="quantity-row">
                              <QuantityStepper
                                :model-value="item.quantity"
                                :min="Number(item.minOrderQty) || 1"
                                :max="Number(item.stock) || 9999"
                                :step="1"
                                size="sm"
                                @change="(val) => onQuantityChange(item, val)"
                                @plus="(val) => onQuantityChange(item, val)"
                                @minus="(val) => onQuantityChange(item, val)"
                              />
                              <AmountText class="sku-subtotal" :text="t('commerce.cart.subtotal', { amount: subtotal(item) })" />
                            </view>
                          </view>
                        </view>
                      </view>
                    </view>
                  </view>
                </view>
                <!-- 失效商品区 -->
                <view v-if="visibleInvalidItems.length > 0" class="invalid-section">
                  <view class="invalid-header">
                    <text class="invalid-title">{{ t('commerce.cart.invalidCount', { count: visibleInvalidItems.length }) }}</text>
                    <button class="link-btn button-center" @click="removeInvalidItems">{{ t(isSearching ? 'commerce.cart.clearInvalidResults' : 'commerce.cart.clearInvalid') }}</button>
                  </view>
                  <view class="cart-list">
                    <view v-for="group in invalidGroups" :key="group.key" class="spu-card invalid-spu">
                      <view class="invalid-spu-header">
                        <text class="spu-name">{{ group.name }}</text>
                        <text class="spu-meta">{{ t('commerce.cart.groupCount', { count: group.skuCount, quantity: group.totalQuantity }) }}</text>
                      </view>
                    <view v-for="item in group.items" :key="item.cartItemId" class="cart-card is-invalid">
                      <label v-if="isManaging" class="check-wrap" @tap.stop="onToggleSelect(item)">
                        <view class="check" :class="{ checked: isManagementSelected(item) }">
                          <text v-if="isManagementSelected(item)">✓</text>
                        </view>
                      </label>
                      <AppProductImage class="product-image" :src="item.image" :stock="item.stock" />
                      <view class="product-info">
                        <text class="product-name">{{ item.skuName || t('commerce.cart.defaultVariant') }}</text>
                        <text class="product-code">{{ t('commerce.cart.code', { code: item.code || item.productId }) }}</text>
                        <AmountText class="invalid-price" :text="'¥' + formatMoney(item.price)" />
                        <text class="invalid-reason">{{ item.invalidReason || t('commerce.cart.invalidHint') }}</text>
                      </view>
                      <button v-if="!isManaging" class="delete-btn button-center" @click="deleteOne(item.cartItemId)">{{ t('commerce.cart.remove') }}</button>
                    </view>
                    </view>
                  </view>
                </view>

              </view>

              <!-- 侧栏汇总 -->
              <view v-if="cartStore.validItems.length > 0" class="summary-card">
                <view class="summary-heading">
                  <view>
                    <text class="summary-title">{{ t('commerce.cart.summary') }}</text>
                    <text class="summary-subtitle">{{ t('commerce.cart.summaryHint') }}</text>
                  </view>
                  <view class="summary-badge">{{ t('commerce.cart.productCount', { count: cartStore.summary.selectedCount }) }}</view>
                </view>
                <view class="summary-row">
                  <text>{{ t('commerce.cart.selectedItems') }}</text>
                  <text>{{ t('commerce.cart.productCount', { count: cartStore.summary.selectedCount }) }}</text>
                </view>
                <view class="summary-row">
                  <text>{{ t('commerce.cart.selectedQuantity') }}</text>
                  <text>{{ t('commerce.cart.quantityCount', { count: cartStore.summary.selectedQuantity }) }}</text>
                </view>
                <view class="summary-row">
                  <text>{{ t('commerce.cart.unselectedQuantity') }}</text>
                  <text>{{ t('commerce.cart.quantityCount', { count: cartStore.summary.totalQuantity - cartStore.summary.selectedQuantity }) }}</text>
                </view>
                <view class="summary-divider" />
                <view class="summary-row total">
                  <text>{{ t('commerce.cart.netAmount') }}</text>
                  <AmountText class="total-amount" :text="(cartStore.formattedTotalAmount)" />
                </view>
                <view v-if="cartStore.summary.discountAmount > 0" class="summary-row discount-summary">
                  <text>{{ t('commerce.cart.promotionDiscount') }}</text>
                  <AmountText class="discount-amount" :text="'-¥' + (formatMoney(cartStore.summary.discountAmount))" />
                </view>
                <view v-if="cartStore.summary.invalidCount > 0" class="summary-row">
                  <text>{{ t('commerce.cart.invalidItems') }}</text>
                  <text>{{ t('commerce.cart.quantityCount', { count: cartStore.summary.invalidCount }) }}</text>
                </view>
                <view v-if="cartStore.summary.remainingLimit < 100000" class="limit-hint">
                  <view class="limit-amounts"><text>{{ t('commerce.cart.limitBefore') }}</text><AmountText text="¥100,000" /><text>{{ t('commerce.cart.limitAfter') }}</text><AmountText :text="'¥' + cartStore.summary.remainingLimit.toLocaleString('zh-CN', { minimumFractionDigits: 2 })" /></view>
                </view>
                <text v-if="cartStore.summary.isOverLimit" class="risk-text">{{ t('commerce.cart.overLimit') }}</text>
              </view>
            </view>
          </template>
        </app-page-state>
      </AppContent>
    </template>

    <!-- 底部结算栏 -->
    <template #footer>
      <fixed-action-bar v-if="pageState === PageStatus.CONTENT">
        <view v-if="isManaging" class="footer-inner management-footer">
          <label class="select-all" @tap="onManagementSelectAll(!areAllItemsSelected)">
            <view class="check" :class="{ checked: areAllItemsSelected }">
              <text v-if="areAllItemsSelected">✓</text>
            </view>
            <text>{{ t(isSearching ? 'commerce.cart.selectResults' : 'commerce.cart.selectAll') }}</text>
          </label>
          <button v-if="!isSearching" class="clear-cart-btn button-center" @tap="requestClearAll">
            <AppIcon name="trash" :size="18" />
            <text>{{ t('commerce.cart.clearAll') }}</text>
          </button>
          <button
            class="manage-delete-btn button-center"
            :disabled="managementSelectedCount === 0"
            @tap="requestDeleteSelected"
          >
            {{ t('commerce.cart.delete') }}{{ managementSelectedCount ? ` (${managementSelectedCount})` : '' }}
          </button>
        </view>
        <view v-else class="footer-inner">
          <label class="select-all" @tap="onSelectAll(!areAllValidSelected)">
            <view class="check" :class="{ checked: areAllValidSelected }">
              <text v-if="areAllValidSelected">✓</text>
            </view>
            <text>{{ t(isSearching ? 'commerce.cart.selectResults' : 'commerce.cart.selectAll') }}</text>
          </label>
          <view class="footer-total">
            <text class="footer-label">{{ t('commerce.cart.selectedCount', { count: cartStore.summary.selectedQuantity }) }}</text>
            <AmountText class="footer-amount" :text="(cartStore.formattedTotalAmount)" />
          </view>
          <button
            class="checkout-btn button-center"
            :disabled="!canCheckout"
            @click="goToCheckout"
          >{{ t('commerce.cart.checkout') }}</button>
        </view>
      </fixed-action-bar>
    </template>
  </AppPageShell>

  <!-- 确认删除弹窗 -->
  <ConfirmPopup
    v-model="showDeleteConfirm"
    :title="deleteConfirmTitle"
    :description="deleteConfirmText"
    :confirm-text="t('commerce.cart.remove')"
    :danger="true"
    @confirm="confirmDelete"
  />
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/commerce/i18n/register.js'
import CartSpuHeader from '../../components/CartSpuHeader.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { getPriceDisplay } from '@/shared/utils/priceDisplay.js'
import { AppError, ErrorKind } from '@/shared/api/appError.js'
import { computed, onBeforeUnmount, ref } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { useCart } from '@/shared/composables/useCart.js'
import { PageStatus } from '../../../../shared/model/pageState.js'
import { navigator } from '../../../../app/navigation/navigator.js'
import { routes } from '../../../../app/config/routes.js'
import AppPageShell from '../../../../shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '../../../../shared/ui/AppContent/AppContent.vue'
import AppPageState from '../../../../shared/ui/AppPageState/AppPageState.vue'
import appHeader from '../../../../shared/ui/AppHeader/AppHeader.vue'
import fixedActionBar from '../../../../shared/ui/FixedActionBar/FixedActionBar.vue'
import QuantityStepper from '@/shared/ui/QuantityStepper/QuantityStepper.vue'
import ConfirmPopup from '../../../../shared/ui/ConfirmPopup/ConfirmPopup.vue'
import AppProductImage from '../../../../shared/ui/AppProductImage/AppProductImage.vue'
import AppSvgIllustration from '../../../../shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppIcon from '../../../../shared/ui/AppIcon/AppIcon.vue'
import { sortCartGroupsByStock, groupItemsBySpu, filterCartItems } from '../../model/cartGrouping.js'
import cartEmptySvg from '../../../../shared/assets/illustrations/empty-cart.svg?raw'
import { waitForRefreshAnimation } from '../../../../shared/utils/refreshAnimation.js'

// ==================== Cart Hook ====================
const {
  cartStore,
  loadCart,
  toggleSelect,
  batchSetSelected,
  selectAllItems,
  setItemQuantity,
  deleteItems,
  clearAll,
  flush,
  flushError,
} = useCart()

// ==================== 本地 UI 状态 ====================
const loadFailed = ref(false)
const loadFailure = ref(null)
const loadError = computed(() => loadFailure.value?.message || '')
const showDeleteConfirm = ref(false)
const deleteTitleKey = ref('commerce.cart.confirmRemove')
const deleteConfirmTitle = computed(() => t(deleteTitleKey.value))
const deleteDialog = ref(null)
const deleteConfirmText = computed(() => {
  const dialog = deleteDialog.value
  if (!dialog) return ''
  const parameters = { ...dialog.parameters }
  if (dialog.messageKey === 'commerce.cart.removeOne') parameters.name ||= t('commerce.cart.thisProduct')
  return t(dialog.messageKey, parameters)
})
const searchKeyword = ref('')
const isManaging = ref(false)
const collapsedGroupKeys = ref({})
const activeActionItemId = ref(null)
const draggingItemId = ref(null)
const swipeOffsets = ref({})
const isRefreshing = ref(false)
let pendingDeleteIds = null
let pendingClearAll = false
let swipeGesture = null
let suppressCloseUntil = 0
const SWIPE_ACTION_WIDTH = 78

// ==================== 页面状态 ====================
const pageState = computed(() => {
  if (cartStore.loading && !cartStore.loaded) return PageStatus.LOADING
  if (loadFailed.value && !cartStore.loaded) return PageStatus.ERROR
  if (cartStore.isEmpty) return PageStatus.EMPTY
  return PageStatus.CONTENT
})

const stateTitle = computed(() =>
  pageState.value === PageStatus.EMPTY ? t('commerce.cart.empty') : t('commerce.cart.loadFailed'),
)

const stateDescription = computed(() =>
  pageState.value === PageStatus.EMPTY
    ? t('commerce.cart.emptyHint')
    : (loadError.value || t('commerce.cart.network')),
)

/** 首屏失败但有旧内容可展示 */
const hasStaleForDisplay = computed(() =>
  loadFailed.value && cartStore.loaded && cartStore.items.length > 0,
)

/** 是否能结算 */
const canCheckout = computed(() =>
  cartStore.hasSelected && !cartStore.summary.isOverLimit,
)
const isSearching = computed(() => Boolean(searchKeyword.value.trim()))
const visibleItems = computed(() => filterCartItems(cartStore.items, searchKeyword.value))
const visibleValidItems = computed(() => visibleItems.value.filter(item => item.canPurchase !== false))
const visibleInvalidItems = computed(() => visibleItems.value.filter(item => item.canPurchase === false))
const visibleQuantity = computed(() => visibleItems.value.reduce((sum,item) => sum + (Number(item.quantity) || 0),0))
const validGroups = computed(() => sortCartGroupsByStock(groupItemsBySpu(visibleValidItems.value)))
const invalidGroups = computed(() => sortCartGroupsByStock(groupItemsBySpu(visibleInvalidItems.value)))
const visibleProductCount = computed(() => groupItemsBySpu(visibleItems.value).length)
const hiddenSelectedCount = computed(() => {
  if (!isSearching.value) return 0
  const visibleIds = new Set(visibleItems.value.map(item => String(item.cartItemId)))
  return cartStore.items.filter(item => item.selected !== false && (isManaging.value || item.canPurchase !== false) && !visibleIds.has(String(item.cartItemId))).length
})
const areAllValidSelected = computed(() =>
  visibleValidItems.value.length > 0 && visibleValidItems.value.every(item => isSelected(item)),
)
const managementSelectedItems = computed(() => visibleItems.value.filter(item => item.selected !== false))
const managementSelectedCount = computed(() => managementSelectedItems.value.length)
const areAllItemsSelected = computed(() =>
  visibleItems.value.length > 0 && visibleItems.value.every(item => item.selected !== false),
)

// ==================== 事件处理 ====================

/** 搜索只改变展示范围，不请求接口或重置选择。 */
function setSearchKeyword(value) {
  searchKeyword.value = String(value ?? '')
  activeActionItemId.value = null
}

/** 恢复全部商品并保留原数量、选择及折叠状态。 */
function clearSearch() {
  setSearchKeyword('')
}

/** 刷新购物车 */
async function refreshCart() {
  loadFailed.value = false
  loadFailure.value = null
  try {
    await loadCart({ silent: cartStore.loaded })
  } catch (error) {
    loadFailed.value = true
    loadFailure.value = error?.message ? error : localError('commerce.cart.network')
    console.error('[Cart] 加载购物车失败:', error)
  }
}

async function onPullRefresh() {
  if (isRefreshing.value) return
  const startedAt = Date.now()
  isRefreshing.value = true
  activeActionItemId.value = null
  try {
    await refreshCart()
  } finally {
    await waitForRefreshAnimation(startedAt)
    isRefreshing.value = false
  }
}

function finishPullRefresh() {
  if (!cartStore.loading) isRefreshing.value = false
}

/** 重试 flush */
async function retryFlush() {
  try {
    await flush()
  } catch (err) {
    console.warn('[Cart] flush 重试失败:', err)
  }
}

/** 单项选择切换 */
function onToggleSelect(item) {
  activeActionItemId.value = null
  toggleSelect(item)
}

function isManagementSelected(item) {
  return item?.selected !== false
}

function toggleManagement() {
  isManaging.value = !isManaging.value
  activeActionItemId.value = null
}

/** 管理模式全选只操作当前搜索结果，避免删除隐藏商品。 */
function onManagementSelectAll(selected) {
  activeActionItemId.value = null
  if (isSearching.value) batchSetSelected(visibleItems.value.map(item => Number(item.cartItemId)).filter(Boolean), Boolean(selected))
  else selectAllItems(Boolean(selected))
}

function onToggleGroup(group) {
  activeActionItemId.value = null
  const ids = group.items.map(item => Number(item.cartItemId)).filter(Boolean)
  batchSetSelected(ids, !group.allSelected)
}

/** 全选/取消全选 */
function onSelectAll(selected) {
  activeActionItemId.value = null
  if (isSearching.value) batchSetSelected(visibleValidItems.value.map(item => Number(item.cartItemId)).filter(Boolean), Boolean(selected))
  else selectAllItems(Boolean(selected))
}

function toggleGroup(groupKey) {
  activeActionItemId.value = null
  collapsedGroupKeys.value = {
    ...collapsedGroupKeys.value,
    [groupKey]: !collapsedGroupKeys.value[groupKey],
  }
}

/** 搜索命中时展开规格，清空搜索后恢复原有折叠偏好。 */
function isGroupCollapsed(groupKey) {
  return !isSearching.value && Boolean(collapsedGroupKeys.value[groupKey])
}

function isItemActionOpen(cartItemId) {
  return String(activeActionItemId.value) === String(cartItemId)
}

/** 数据驱动的选择状态 */
function isSelected(item) {
  return cartStore.isItemSelected(item)
}

/** 数量变更 */
function onQuantityChange(item, newQty) {
  activeActionItemId.value = null
  if (!item || Number(newQty) === Number(item.quantity)) return
  setItemQuantity(item, Number(newQty))
}

function touchPoint(event, changed = false) {
  const points = changed ? event?.changedTouches : event?.touches
  const point = points?.[0] || event?.changedTouches?.[0] || event?.touches?.[0]
  if (!point) return null
  return {
    x: Number(point.clientX ?? point.pageX ?? point.x ?? 0),
    y: Number(point.clientY ?? point.pageY ?? point.y ?? 0),
  }
}

function onSkuTouchStart(event, item) {
  const point = touchPoint(event)
  if (!point) return
  const itemId = Number(item?.cartItemId)
  if (!itemId) return
  if (activeActionItemId.value && !isItemActionOpen(itemId)) activeActionItemId.value = null
  swipeGesture = {
    itemId,
    startX: point.x,
    startY: point.y,
    baseOffset: isItemActionOpen(itemId) ? -SWIPE_ACTION_WIDTH : 0,
    horizontal: false,
  }
}

function onSkuTouchMove(event, item) {
  if (!swipeGesture || swipeGesture.itemId !== Number(item?.cartItemId)) return
  const point = touchPoint(event)
  if (!point) return
  const deltaX = point.x - swipeGesture.startX
  const deltaY = point.y - swipeGesture.startY
  if (!swipeGesture.horizontal && Math.abs(deltaX) < 6) return
  if (!swipeGesture.horizontal && Math.abs(deltaY) >= Math.abs(deltaX)) return
  swipeGesture.horizontal = true
  draggingItemId.value = swipeGesture.itemId
  const offset = Math.max(-SWIPE_ACTION_WIDTH, Math.min(0, swipeGesture.baseOffset + deltaX))
  swipeOffsets.value = { ...swipeOffsets.value, [swipeGesture.itemId]: offset }
}

function onSkuTouchEnd(event, item) {
  if (!swipeGesture || swipeGesture.itemId !== Number(item?.cartItemId)) return
  const itemId = swipeGesture.itemId
  const offset = Number(swipeOffsets.value[itemId] ?? swipeGesture.baseOffset)
  if (swipeGesture.horizontal) {
    activeActionItemId.value = offset <= -(SWIPE_ACTION_WIDTH / 2) ? itemId : null
    suppressCloseUntil = Date.now() + 120
  }
  clearSwipeState(itemId)
}

function onSkuTouchCancel(item) {
  clearSwipeState(Number(item?.cartItemId))
}

function clearSwipeState(itemId) {
  const nextOffsets = { ...swipeOffsets.value }
  delete nextOffsets[itemId]
  swipeOffsets.value = nextOffsets
  draggingItemId.value = null
  swipeGesture = null
}

function skuSwipeStyle(cartItemId) {
  const offset = swipeOffsets.value[cartItemId]
  return Number.isFinite(offset) ? { transform: `translateX(${offset}px)` } : {}
}

function isItemDragging(cartItemId) {
  return String(draggingItemId.value) === String(cartItemId)
}

function revealItemActions(item) {
  activeActionItemId.value = Number(item?.cartItemId) || null
}

function closeItemActions() {
  if (Date.now() < suppressCloseUntil) return
  activeActionItemId.value = null
}

/** 删除单项：弹确认 */
function deleteOne(cartItemId) {
  const item = cartStore.items.find(i => String(i.cartItemId) === String(cartItemId))
  if (!item) return
  pendingDeleteIds = [Number(cartItemId)]
  pendingClearAll = false
  deleteTitleKey.value = 'commerce.cart.confirmRemove'
  deleteDialog.value = { messageKey: 'commerce.cart.removeOne', parameters: { name: item.name || null } }
  showDeleteConfirm.value = true
  activeActionItemId.value = null
}

/** 移除失效商品 */
function removeInvalidItems() {
  const ids = visibleInvalidItems.value.map(i => Number(i.cartItemId))
  if (ids.length === 0) return
  pendingDeleteIds = ids
  pendingClearAll = false
  deleteTitleKey.value = 'commerce.cart.clearInvalidTitle'
  deleteDialog.value = { messageKey: 'commerce.cart.removeInvalid', parameters: { count: ids.length } }
  showDeleteConfirm.value = true
}

/** 保存原已选 SKU 快照并显示可重新取词的删除确认。 */
function requestDeleteSelected() {
  const ids = managementSelectedItems.value.map(item => Number(item.cartItemId)).filter(Boolean)
  if (ids.length === 0) return
  pendingDeleteIds = ids
  pendingClearAll = false
  deleteTitleKey.value = 'commerce.cart.deleteSelectedTitle'
  deleteDialog.value = { messageKey: 'commerce.cart.removeSelected', parameters: { count: ids.length } }
  showDeleteConfirm.value = true
}

/** 保存清空动作并显示可重新取词的确认，不直接提交。 */
function requestClearAll() {
  if (isSearching.value || cartStore.items.length === 0) return
  pendingDeleteIds = null
  pendingClearAll = true
  deleteTitleKey.value = 'commerce.cart.clearAllTitle'
  deleteDialog.value = { messageKey: 'commerce.cart.removeAll', parameters: { count: cartStore.items.length } }
  showDeleteConfirm.value = true
}

/** 确认删除 */
async function confirmDelete() {
  if (pendingClearAll) {
    try {
      await clearAll()
      isManaging.value = false
    } catch (error) {
      if (typeof uni !== 'undefined') uni.showToast({ title: error?.message || t('commerce.cart.clearFailed'), icon: 'none' })
      return
    } finally {
      pendingClearAll = false
      showDeleteConfirm.value = false
    }
    return
  }
  if (!pendingDeleteIds || pendingDeleteIds.length === 0) return
  deleteItems(pendingDeleteIds)
  pendingDeleteIds = null
  showDeleteConfirm.value = false
}

function goToDetail(productId) {
  if (!productId) return
  navigator.navigateTo(routes.commerce.productDetail(productId))
}

function goToProductList() {
  navigator.navigateTo(routes.commerce.productList())
}

async function goToCheckout() {
  if (!canCheckout.value) return
  try {
    await flush()
    navigator.navigateTo(routes.commerce.checkout())
  } catch (err) {
    console.error('[Cart] flush 失败，禁止结算:', err)
    if (typeof uni !== 'undefined') {
      uni.showToast({ title: t('commerce.cart.syncFailed'), icon: 'none' })
    }
  }
}

function goBack() {
  navigator.back()
}

// ==================== 工具函数 ====================
function unitText(item) {
  return item.unit || '件'
}

function subtotal(item) {
  const value = Number(item.netSubtotal ?? (Number(item.price || 0) * Number(item.quantity || 0)))
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// ==================== 生命周期 ====================
onShow(refreshCart)

onHide(() => {
  isManaging.value = false
  // 页面隐藏时尽力 flush（不阻塞，不阻塞 UI）
  flush().catch(err => console.warn('[Cart] onHide flush 失败:', err))
})

onUnload(() => {
  // ⚠️ 调度器是单例，页面卸载时只 flush，不 dispose
  // 避免破坏其他页面的待同步队列
  flush().catch(err => console.warn('[Cart] onUnload flush 失败:', err))
})

onBeforeUnmount(() => {
  // 兜底 flush（不 dispose 单例）
  flush().catch(() => {})
})
/** 创建可重新取词的本地提示，不附加后端错误码。 */
function localError(messageKey) {
  return new AppError('', ErrorKind.UNKNOWN, { messageKey })
}

</script>

<style lang="scss" scoped>
@import "./presentation.scss";

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.sk-card, .spu-card, .cart-card, .summary-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
</style>
