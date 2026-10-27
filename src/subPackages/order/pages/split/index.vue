<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="existingSplits.length ? t('order.split.detailsTitle') : t('order.split.editorTitle')" :show-back="true" />
    </template>
    <template #content>
      <AppContent padding="0" :scroll-top="scrollTopCommand" @scroll="onPageScroll">
        <view class="allocation-page">
          <view v-if="loading" class="state-card">{{ t('order.split.loading') }}</view>
          <template v-else-if="context">
            <view class="order-meta">
              <text class="eyebrow">{{ t('order.split.order', { number: orderNo }) }}</text>
              <text class="order-summary-total">{{ t('order.split.quantity', { count: totalQuantity }) }}</text>
            </view>
            <view v-if="lastSplitFailureReason" class="notice-card">
              <text>{{ t('order.split.previousFailure', { reason: lastSplitFailureReason }) }}</text>
              <text>{{ t('order.split.retryPlan') }}</text>
            </view>
            <view v-if="failedSplits.length && remainingItems.length" class="notice-card">
              <text>{{ t('order.split.notPlanned', { count: remainingQuantity }) }}</text>
              <text v-if="reallocationDisabledReason">{{ reallocationDisabledReason }}</text>
              <view class="remaining-item-list"><text v-for="item in remainingItems" :key="itemIdOf(item)" class="remaining-item">{{ valueOf(item, 'productName', 'ProductName', '') }} ×{{ quantityOf(item) }}</text></view>
            </view>
            <template v-if="existingSplits.length">
              <view class="section-heading"><text>{{ t('order.split.details') }}</text><text class="section-note">{{ t('order.split.addressCount', { count: existingSplits.length }) }}</text></view>
              <view class="split-progress-card">
                <view><text class="split-progress-title">{{ t('order.split.progress') }}</text><text class="split-progress-copy">{{ t('order.split.processed', { count: processedSplitCount, total: existingSplits.length }) }}</text></view>
                <text class="split-progress-number">{{ t('order.split.quantity', { count: shippedQuantityTotal }) }}</text>
              </view>
              <view class="readonly-grid">
                <view v-for="split in existingSplits" :key="splitIdOf(split)" class="split-card readonly-card">
                  <view class="card-head">
                    <view><text class="card-title">{{ valueOf(split, 'splitName', 'SplitName', '') || t('order.split.deliveryFallback') }}</text><text class="card-subtitle">{{ valueOf(split, 'splitNo', 'SplitNo', '') }}</text></view>
                    <text class="status-tag">{{ customerStatusText(split) }}</text>
                  </view>
                  <view class="readonly-address"><text class="address-person">{{ valueOf(split, 'receiverName', 'ReceiverName', '') }} {{ valueOf(split, 'receiverPhone', 'ReceiverPhone', '') }}</text><text class="address-detail">{{ valueOf(split, 'fullAddress', 'FullAddress', '') }}</text></view>
                  <view v-for="item in itemsOf(split)" :key="splitIdOf(split) + '-' + itemIdOf(item)" class="readonly-item">
                    <AppImage class="item-image" width="100%" height="100%" :src="valueOf(item, 'imageUrl', 'ImageUrl', '')" mode="aspectFill" />
                    <view class="item-copy"><text class="item-name">{{ valueOf(item, 'productName', 'ProductName', '') }}</text><text class="item-spec">{{ valueOf(item, 'skuName', 'SkuName', '') }}</text></view>
                    <view class="readonly-quantity-copy"><text class="readonly-quantity">{{ t('order.split.expected', { count: quantityOf(item) }) }}</text><text class="readonly-shipped">{{ t('order.split.shipped', { count: shippedQuantityOf(item) }) }}</text></view>
                  </view>
                  <text v-if="unshippedQuantityOf(split) > 0" class="split-result-warning">{{ t('order.split.notShipped', { count: unshippedQuantityOf(split) }) }}</text>
                  <text v-else-if="shippedQuantityOf(split) > 0" class="split-result-success">{{ t('order.split.shipmentHandled') }}</text>
                  <text v-if="valueOf(split, 'shippedAt', 'ShippedAt', null)" class="split-shipped-time">{{ t('order.split.shippedAt', { time: formatDateTime(valueOf(split, 'shippedAt', 'ShippedAt', null)) }) }}</text>
                  <text v-if="isReviewRejected(split)" class="split-result-warning">{{ t('order.split.reviewRejected', { reason: valueOf(split, 'erpReviewReasonMessage', 'ErpReviewReasonMessage', '') ? '：' + valueOf(split, 'erpReviewReasonMessage', 'ErpReviewReasonMessage', '') : '' }) }}</text>
                </view>
              </view>
            </template>
            <template v-else>
              <view v-if="disabledReason" class="notice-card">{{ disabledReason }}</view>
              <view v-if="!disabledReason && !addresses.length" class="empty-address-card">
                <AppIcon name="location" :size="28" color="#d7192d" />
                <text class="empty-title">{{ t('order.split.emptyAddress') }}</text><text class="empty-copy">{{ t('order.split.emptyAddressCopy') }}</text>
                <button class="secondary-button button-center" @tap="openAddressManager">{{ t('order.split.addAddress') }}</button>
              </view>
              <template v-else-if="!disabledReason">
                <view class="allocation-workspace">
                  <view class="address-controls">
                    <view class="editor-toolbar">
                      <text class="section-title">{{ t('order.split.addressesHeading', { count: addressGroups.length }) }}</text>
                      <picker v-if="canAddAddressGroup" class="add-address-picker" :range="addressOptions()" range-key="label" :value="0" :disabled="editingLocked" @change="selectAddress(0, $event)">
                        <view class="add-address-button" :class="{ 'is-disabled': editingLocked }">{{ t('order.split.addShort') }}</view>
                      </picker>
                    </view>
                    <scroll-view v-if="addressGroups.length > 1" class="address-tabs" scroll-x :scroll-into-view="'allocation-address-' + activeAddressId" :show-scrollbar="false">
                      <view class="address-tab-list">
                        <button v-for="(group, groupIndex) in addressGroups" :key="group.key" :id="'allocation-address-' + group.addressId" class="address-tab" :class="{ active: activeAddressId === group.addressId }" :disabled="editingLocked" @tap="selectActiveAddress(group.addressId)">
                          <text class="address-tab-name">{{ groupIndex + 1 }}. {{ group.address?.name || t('order.split.addressFallback') }}</text>
                          <text class="address-tab-quantity">{{ t('order.split.quantity', { count: groupTotalQuantity(group.addressId) }) }}</text>
                        </button>
                      </view>
                    </scroll-view>
                  </view>
                <view class="address-group-list">
                  <view v-for="group in activeAddressGroups" :key="group.key" class="address-group-card">
                    <view class="address-summary">
                      <view class="address-group-head">
                        <view class="address-group-copy">
                          <text class="address-group-contact">{{ group.address?.name || t('order.split.addressFallback') }}</text>
                          <text v-if="group.address?.phone" class="address-phone">{{ group.address.phone }}</text>
                        </view>
                        <picker class="change-address-picker" :range="addressOptions(group.addressId)" range-key="label" :value="addressOptionIndex(group.addressId)" :disabled="editingLocked" @change="selectAddress(group.addressId, $event)"><view class="change-address-button">{{ t('order.split.changeAddressShort') }}</view></picker>
                      </view>
                      <text v-if="group.address" class="group-address-detail">{{ group.address.fullAddress }}</text>
                    </view>
                    <view class="item-tools">
                    <view class="items-heading">
                      <text class="section-title">{{ t('order.split.itemsHeading') }}</text>
                      <button class="more-actions-toggle" :aria-label="t('order.split.moreActions')" :disabled="editingLocked" @tap="actionsExpanded = true">{{ t('order.list.more') }}<text aria-hidden="true"> ···</text></button>
                    </view>
                    <view class="sku-search">
                      <AppIcon name="search" :size="17" color="#747b86" />
                      <input v-model="searchQuery" class="sku-search-input" :placeholder="t('order.split.searchPlaceholder')" :aria-label="t('order.split.searchPlaceholder')" confirm-type="search" maxlength="100" />
                      <button v-if="searchQuery" class="search-clear" :aria-label="t('order.split.clearSearch')" @tap="clearSearch"><AppIcon name="close" :size="16" /></button>
                    </view>
                    <view class="item-filters">
                      <button v-for="filter in itemFilterOptions" :key="filter.key" :class="{ active: itemFilter === filter.key }" :aria-pressed="itemFilter === filter.key" @tap="itemFilter = filter.key">{{ filter.label }}</button>
                    </view>
                    <text v-if="searchTerms.length" class="search-result-count">{{ t('order.split.searchResultCount', { count: visibleItemCount }) }}</text>
                    </view>
                    <view v-if="groupTotalQuantity(group.addressId) === 0" class="target-hint">{{ t('order.split.emptyTargetShort') }}</view>
                    <view v-if="!visibleProductGroups.length" class="filtered-empty"><text>{{ emptyItemsMessage }}</text><button class="text-action" @tap="resetItemFilters">{{ searchTerms.length && !searchMatchedItemCount ? t('order.split.clearSearch') : t('order.split.showAllMatches') }}</button></view>
                    <view v-for="product in visibleProductGroups" :key="product.key" class="allocation-product">
                      <button class="product-head" :aria-expanded="isProductExpanded(product)" @tap="toggleProduct(product)">
                        <AppImage v-if="product.imageUrl" class="item-image" width="40px" height="40px" :src="product.imageUrl" mode="aspectFill" />
                        <view class="item-copy"><text class="item-name">{{ product.name || t('order.split.productFallback') }}</text><view class="item-spec"><text>{{ t('order.split.variants', { count: product.totalVariantCount }) }}</text><text>{{ t('order.split.hereQuantity', { count: product.currentQuantity }) }}</text><text v-if="product.remainingQuantity > 0" class="has-remaining">{{ t('order.split.pendingQuantity', { count: product.remainingQuantity }) }}</text></view></view>
                        <AppIcon :name="isProductExpanded(product) ? 'chevron-down' : 'chevron-right'" :size="17" color="#747b86" />
                      </button>
                      <template v-if="isProductExpanded(product)">
                      <view v-for="item in product.items" :key="itemIdOf(item)" class="group-item-row">
                        <view class="sku-copy">
                          <text class="sku-name">{{ valueOf(item, 'skuName', 'SkuName', '') || valueOf(item, 'skuCode', 'SkuCode', '') || t('order.split.defaultVariant') }}</text>
                          <text v-if="valueOf(item, 'skuName', 'SkuName', '') && valueOf(item, 'skuCode', 'SkuCode', '')" class="sku-code">{{ valueOf(item, 'skuCode', 'SkuCode', '') }}</text>
                          <text v-if="isRetainedItem(item)" class="retained-note">{{ t('order.split.quantityUpdated') }}</text>
                          <text v-if="valueOf(item, 'isGift', 'IsGift', false)" class="gift-tag">{{ t('order.split.gift') }}</text>
                          <view class="sku-balance">
                            <text>{{ t('order.split.ordered', { count: quantityOf(item) }) }}</text>
                            <text v-if="balanceFor(group.addressId, itemIdOf(item)).allocated > balanceFor(group.addressId, itemIdOf(item)).current">{{ t('order.split.elsewhere', { count: balanceFor(group.addressId, itemIdOf(item)).allocated - balanceFor(group.addressId, itemIdOf(item)).current }) }}</text>
                            <text v-if="balanceFor(group.addressId, itemIdOf(item)).remaining > 0" class="has-remaining">{{ t('order.split.remaining', { count: balanceFor(group.addressId, itemIdOf(item)).remaining }) }}</text>
                          </view>
                          <button v-if="hasTransferSource(group.addressId, itemIdOf(item))" class="transfer-button" :disabled="editingLocked" @tap="openTransfer(group.addressId, itemIdOf(item))">{{ t('order.split.moveShort') }}</button>
                        </view>
                        <view class="group-item-quantity">
                          <QuantityStepper class="split-quantity-stepper" :model-value="balanceFor(group.addressId, itemIdOf(item)).current" :min="1" :max="balanceFor(group.addressId, itemIdOf(item)).maximum" :allow-zero="true" :allow-input="true" :disabled="editingLocked || balanceFor(group.addressId, itemIdOf(item)).maximum <= 0" size="compact" @update:model-value="setAddressItemQuantity(group.addressId, itemIdOf(item), $event)" />
                        </view>
                      </view>
                      </template>
                    </view>
                  </view>
                </view>
                </view>
                <view v-if="submitFailure" class="notice-card submit-error">{{ submitFailure.message || t('order.split.submitFailed') }}</view>
              </template>
            </template>
          </template>
          <view v-else class="state-card"><text>{{ loadError?.message || t('order.split.loadFailed') }}</text><button class="secondary-button button-center" @tap="loadData">{{ t('order.split.retry') }}</button></view>
        </view>
      </AppContent>
    </template>
    <template v-if="!loading && context && !existingSplits.length && canEdit" #footer>
      <FixedActionBar>
        <view class="footer-stack">
          <text class="footer-hint" :class="{ pending: unallocatedQuantity > 0 }">{{ submissionAccepted ? t('order.split.accepted') : unallocatedQuantity > 0 ? t('order.split.pending', { count: unallocatedQuantity }) : validationError || t('order.split.footerReady', { count: allocatedQuantity, total: totalQuantity, addresses: deliveryGroupCount }) }}</text>
          <button v-if="submissionAccepted" class="submit-button button-center" @tap="loadData">{{ t('order.split.refreshResult') }}</button>
          <button v-else class="submit-button button-center" :disabled="!canSubmit || submitting" @tap="openReview">{{ submitting ? t('order.split.submitting') : t('order.split.reviewAction') }}</button>
        </view>
      </FixedActionBar>
    </template>
    <template #overlay>
      <ConfirmPopup v-model="actionsExpanded" :title="t('order.split.moreActions')" :show-cancel="false" :confirm-text="t('order.split.done')" @confirm="actionsExpanded = false">
        <view class="action-menu">
          <button class="menu-action" :disabled="editingLocked || unallocatedQuantity <= 0" @tap="actionsExpanded = false; requestAssignAllRemaining(activeAddressId)">{{ t('order.split.assignWholeOrderRemaining') }}</button>
          <button class="menu-action" :disabled="editingLocked || groupTotalQuantity(activeAddressId) <= 0" @tap="actionsExpanded = false; clearCurrentAddress(activeAddressId)">{{ t('order.split.clear') }}</button>
          <button v-if="addressGroups.length > 1" class="menu-action danger-action" :disabled="editingLocked" @tap="actionsExpanded = false; requestRemoveAddress(activeAddressId)">{{ t('order.split.removeAddress') }}</button>
          <button class="menu-action" :disabled="editingLocked" @tap="actionsExpanded = false; openAddressManager()">{{ t('order.split.manageAddress') }}</button>
          <button class="menu-action" @tap="guideExpanded = !guideExpanded">{{ t('order.split.guide') }} {{ guideExpanded ? '−' : '+' }}</button>
          <view v-if="guideExpanded" class="guide-copy"><text>{{ t('order.split.step2Hint') }}</text><text>{{ t('order.split.bulkHint') }}</text><text>{{ t('order.split.step3Hint') }}</text></view>
        </view>
      </ConfirmPopup>
      <ConfirmPopup v-model="reviewVisible" :title="t('order.split.reviewTitle')" :description="t('order.split.reviewCopy')" :cancel-text="t('order.split.keepEditing')" :confirm-text="t('order.split.submitPlan')" :confirm-disabled="!canSubmit || submitting" @confirm="confirmReview">
        <view class="review-groups">
          <view v-for="group in reviewGroups" :key="group.addressId" class="review-group">
            <view class="review-heading"><text>{{ group.address?.name || t('order.split.addressFallback') }}</text><text>{{ t('order.split.quantity', { count: group.quantity }) }}</text></view>
            <text class="review-address">{{ group.address?.phone }} {{ group.address?.fullAddress }}</text>
            <view v-for="item in group.items" :key="item.orderItemId" class="review-item"><view><text>{{ item.name }}</text><text class="review-spec">{{ item.spec }}</text></view><text class="review-quantity">×{{ item.quantity }}</text></view>
          </view>
        </view>
      </ConfirmPopup>
      <ConfirmPopup v-model="transferVisible" class="transfer-dialog" :title="t('order.split.transferTitle')" :description="t('order.split.transferCopy')" :confirm-text="t('order.split.transferConfirm')" :confirm-disabled="editingLocked || transferMaximum < 1" @confirm="confirmTransfer">
        <text class="transfer-variant">{{ transferItemLabel }}</text>
        <text class="transfer-label">{{ t('order.split.transferSource') }}</text>
        <picker :range="transferSources" range-key="label" :value="transferSourceIndex" @change="chooseTransferSource"><view class="transfer-source">{{ transferSources[transferSourceIndex]?.label || t('order.split.selectAddress') }}</view></picker>
        <view class="transfer-controls"><text>{{ t('order.split.transferQuantity', { count: transferMaximum }) }}</text><QuantityStepper class="split-quantity-stepper" size="compact" v-model="transferQuantity" :min="1" :max="transferMaximum" :disabled="transferMaximum < 1" :allow-input="true" /></view>
      </ConfirmPopup>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/order/i18n/register.js'
import { computed, nextTick, ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppImage from '@/shared/ui/AppImage/AppImage.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import QuantityStepper from '@/shared/ui/QuantityStepper/QuantityStepper.vue'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { ERP_REVIEW_STATUS, FULFILLMENT_SPLIT_STATUS, FULFILLMENT_SPLIT_STATUS_MAP } from '@/app/config/constant.js'
import { formatDateTime } from '../../../../shared/utils/format.js'
import {
  allocationBalance,
  allocateRemainingToAddress,
  buildFulfillmentGroups,
  changeAllocationAddress,
  clearAddressAllocation,
  createAllocationPlan,
  setAddressAllocationQuantity,
  transferAddressAllocation,
  validateAllocationPlan,
} from '../../domain/fulfillmentAllocation.js'
import {
  createFulfillmentSplits,
  generateClientRequestId,
  getFulfillmentAddressList,
  getFulfillmentSplitContext,
} from '../../api/orderApi.js'

const orderId = ref(0)
const context = ref(null)
const addresses = ref([])
const allocationPlan = ref([])
const selectedAddressIds = ref([])
const activeAddressId = ref(0)
const searchQuery = ref('')
const itemFilter = ref('all')
const expandedProducts = ref({})
const filteredExpansion = ref({})
const retainedItemId = ref(0)
const scrollTopCommand = ref(undefined)
let currentScrollTop = 0, unfilteredScrollTop = null, scrollRestoreVersion = 0
const loading = ref(true)
const submitting = ref(false)
const pageReady = ref(false)
const guideExpanded = ref(false)
const actionsExpanded = ref(false)
const reviewVisible = ref(false)
const submitFailure = ref(null)
const loadError = ref(null)
const submissionAccepted = ref(false)
const editingLocked = computed(() => submitting.value || submissionAccepted.value)
const transferDraft = ref(null)
const transferQuantity = ref(1)
const transferFromId = ref(0)
const transferVisible = computed({ get: () => Boolean(transferDraft.value), set: value => { if (!value) transferDraft.value = null } })

/** 兼容配送上下文现有的两种字段命名。 */
const valueOf = (source, camel, pascal, fallback = undefined) => source?.[camel] ?? source?.[pascal] ?? fallback
const orderNo = computed(() => valueOf(context.value, 'orderNo', 'OrderNo', ''))
const disabledReason = computed(() => valueOf(context.value, 'disabledReason', 'DisabledReason', ''))
const sourceItems = computed(() => valueOf(context.value, 'items', 'Items', []) || [])
const existingSplits = computed(() => valueOf(context.value, 'splits', 'Splits', []) || [])
const failedSplits = computed(() => valueOf(context.value, 'failedSplits', 'FailedSplits', []) || [])
const remainingItems = computed(() => valueOf(context.value, 'remainingItems', 'RemainingItems', []) || [])
const remainingQuantity = computed(() => remainingItems.value.reduce((sum, item) => sum + quantityOf(item), 0))
const reallocationDisabledReason = computed(() => valueOf(
  context.value,
  'reallocationDisabledReason',
  'ReallocationDisabledReason',
  '',
))
const lastSplitFailureReason = computed(() => valueOf(context.value, 'lastSplitFailureReason', 'LastSplitFailureReason', ''))
const canEdit = computed(() => valueOf(context.value, 'canSplit', 'CanSplit', false) === true)
const addressIds = computed(() => addresses.value.map(item => item.id))
const productGroups = computed(() => {
  const groups = new Map()
  for (const item of sourceItems.value) {
    const name = valueOf(item, 'productName', 'ProductName', '')
    const productId = String(valueOf(item, 'productId', 'ProductId', '')).trim()
    const code = valueOf(item, 'productCode', 'ProductCode', '')
    // 缺少 SPU 时保留独立订单行，不按同名猜测归属。
    const key = /^[1-9]\d*$/.test(productId) ? `id:${productId}` : `line:${itemIdOf(item)}`
    if (!groups.has(key)) groups.set(key, { key, name: name || code, imageUrl: valueOf(item, 'imageUrl', 'ImageUrl', ''), items: [] })
    groups.get(key).items.push(item)
  }
  return [...groups.values()]
})
const itemFilterOptions = computed(() => [
  { key: 'all', label: t('order.split.filterAll') },
  { key: 'remaining', label: t('order.split.filterRemaining') },
  { key: 'address', label: t('order.split.filterAddress') },
])
const searchTerms = computed(() => normalizeSearch(searchQuery.value).split(/\s+/).filter(Boolean))
const allocationIndex = computed(() => new Map(allocationPlan.value.map(item => [item.orderItemId, item])))
const activeBalances = computed(() => new Map(allocationPlan.value.map(item => [item.orderItemId, allocationBalance(item, activeAddressId.value)])))
const searchMatchedGroups = computed(() => productGroups.value.map(product => ({ ...product, allItems: product.items, items: product.items.filter(item => matchesSearch(item)) })).filter(product => product.items.length))
const searchMatchedItemCount = computed(() => searchMatchedGroups.value.reduce((sum, product) => sum + product.items.length, 0))
const visibleProductGroups = computed(() => searchMatchedGroups.value.map(product => {
  const full = product.allItems
  return { ...product, totalVariantCount: new Set(full.map(item => valueOf(item, 'skuId', 'SkuId', 0) || valueOf(item, 'skuCode', 'SkuCode', '') || itemIdOf(item))).size,
    currentQuantity: full.reduce((sum, item) => sum + (activeBalances.value.get(itemIdOf(item))?.current || 0), 0),
    remainingQuantity: full.reduce((sum, item) => sum + (activeBalances.value.get(itemIdOf(item))?.remaining || 0), 0),
    items: product.items.filter(item => matchesItemFilter(item) || itemIdOf(item) === retainedItemId.value),
  }
}).filter(product => product.items.length))
const visibleItemCount = computed(() => visibleProductGroups.value.reduce((sum, product) => sum + product.items.length, 0))
const emptyItemsMessage = computed(() => searchTerms.value.length
  ? t(searchMatchedItemCount.value ? 'order.split.filterNoMatches' : 'order.split.noSearchResults')
  : t(itemFilter.value === 'address' ? 'order.split.noAddressItems' : 'order.split.filterEmpty'))

watch([searchQuery, itemFilter], () => { filteredExpansion.value = {}; retainedItemId.value = 0 }, { flush: 'sync' })
watch(activeAddressId, () => { retainedItemId.value = 0 }, { flush: 'sync' })
watch(searchQuery, (value, previous) => {
  scrollRestoreVersion++
  if (value.trim() && !previous.trim()) unfilteredScrollTop = currentScrollTop
  if (!value.trim() && previous.trim()) restoreUnfilteredScroll()
}, { flush: 'sync' })

/** 归一化输入只用于查找，不修改商品、编码或提交数据。 */
function normalizeSearch(value) { return String(value || '').normalize('NFKC').trim().toLowerCase() }
/** 多个关键词同时匹配名称、规格和真实业务编码，不拿内部 SKU ID 冒充编码。 */
function matchesSearch(item) {
  const text = normalizeSearch(['productName', 'productCode', 'skuName', 'skuCode'].map(key => valueOf(item, key, key[0].toUpperCase() + key.slice(1), '')).join(' '))
  return searchTerms.value.every(term => text.includes(term))
}
/** 筛选仅作用于展示，待分配表示全单仍未安排的数量。 */
function matchesItemFilter(item) {
  const balance = activeBalances.value.get(itemIdOf(item))
  return itemFilter.value === 'all' || (itemFilter.value === 'remaining' ? balance?.remaining > 0 : balance?.current > 0)
}
/** 多 SPU 默认收起；检索和筛选自动展开，并保留用户临时折叠选择。 */
function isProductExpanded(product) {
  if (searchTerms.value.length || itemFilter.value !== 'all') return filteredExpansion.value[product.key] ?? true
  return expandedProducts.value[product.key] ?? (productGroups.value.length === 1)
}
/** 以真实 SPU 键保存折叠状态，清除检索后恢复原有选择。 */
function toggleProduct(product) {
  const target = searchTerms.value.length || itemFilter.value !== 'all' ? filteredExpansion : expandedProducts
  target.value = { ...target.value, [product.key]: !isProductExpanded(product) }
}
/** 刚编辑后不匹配筛选的行暂时保留，防止连续加减时跳位。 */
function isRetainedItem(item) { return itemIdOf(item) === retainedItemId.value && !matchesItemFilter(item) }
/** 只清除关键词，保留地址和数量以及原来的普通折叠状态。 */
function clearSearch() { searchQuery.value = '' }
/** 空结果时优先解除状态筛选，查无匹配时再清空关键词。 */
function resetItemFilters() {
  if (searchTerms.value.length && !searchMatchedItemCount.value) clearSearch()
  else itemFilter.value = 'all'
}
/** 记录原生滚动事件，不在每次滚动时反向驱动滚动位置。 */
function onPageScroll(event) { currentScrollTop = Number(event?.detail?.scrollTop) || 0 }
/** 结果列表还原后恢复进入搜索前的位置；新搜索使旧恢复任务失效。 */
async function restoreUnfilteredScroll() {
  if (unfilteredScrollTop === null) return
  const target = unfilteredScrollTop, version = scrollRestoreVersion
  unfilteredScrollTop = null
  scrollTopCommand.value = currentScrollTop
  await nextTick()
  if (version === scrollRestoreVersion && !searchQuery.value.trim()) scrollTopCommand.value = target
}
const addressGroups = computed(() => selectedAddressIds.value.map(addressId => ({
  key: String(addressId),
  addressId,
  address: addressById(addressId),
})))
const activeAddressGroups = computed(() => addressGroups.value.filter(group => group.addressId === activeAddressId.value))
const canAddAddressGroup = computed(() => (
  addressGroups.value.length < 10
  && addresses.value.some(address => !selectedAddressIds.value.includes(address.id))
))
const totalQuantity = computed(() => sourceItems.value.reduce((sum, item) => sum + quantityOf(item), 0))
const allocatedQuantity = computed(() => allocationPlan.value.reduce((sum, item) => sum + allocationBalance(item).allocated, 0))
const unallocatedQuantity = computed(() => totalQuantity.value - allocatedQuantity.value)
const deliveryGroups = computed(() => buildFulfillmentGroups(allocationPlan.value))
const deliveryGroupCount = computed(() => deliveryGroups.value.length)
/** 按当前方案生成只读核对内容；不重排原始商品、不发请求。 */
const reviewGroups = computed(() => deliveryGroups.value.map(group => ({
  addressId: group.addressId,
  address: addressById(group.addressId),
  quantity: group.items.reduce((sum, item) => sum + item.quantity, 0),
  items: group.items.map(item => {
    const source = sourceItems.value.find(row => itemIdOf(row) === item.orderItemId)
    return { ...item, name: valueOf(source, 'productName', 'ProductName', ''),
      spec: valueOf(source, 'skuName', 'SkuName', '') || valueOf(source, 'skuCode', 'SkuCode', '') || t('order.split.defaultVariant') }
  }),
})))
const validationError = computed(() => validateAllocationPlan(allocationPlan.value, addressIds.value, 10,
  (key, parameters) => t('order.split.validation.' + key, parameters)))
const canSubmit = computed(() => canEdit.value && !validationError.value && !editingLocked.value)
const submitButtonText = computed(() => deliveryGroupCount.value > 1
  ? t('order.split.submitAddresses', { count: deliveryGroupCount.value })
  : t('order.split.submit'))
const processedSplitCount = computed(() => existingSplits.value.filter(split => shippedQuantityOf(split) > 0 || [FULFILLMENT_SPLIT_STATUS.SHIPPED, FULFILLMENT_SPLIT_STATUS.COMPLETED, FULFILLMENT_SPLIT_STATUS.FAILED, FULFILLMENT_SPLIT_STATUS.CANCELLED].includes(Number(valueOf(split, 'status', 'Status', -1)))).length)
const shippedQuantityTotal = computed(() => existingSplits.value.reduce((sum, split) => sum + shippedQuantityOf(split), 0))

onLoad(async options => {
  orderId.value = Number(options.orderId) || 0
  await loadData()
  pageReady.value = true
})

onShow(async () => {
  if (!pageReady.value || loading.value || existingSplits.value.length) return
  await refreshAddresses()
})

/** 加载配送上下文和地址，并建立不会丢失数量的商品分配方案。 */
async function loadData() {
  if (loading.value && pageReady.value) return
  loading.value = true
  loadError.value = null
  try {
    const [splitContext, addressList] = await Promise.all([
      getFulfillmentSplitContext(orderId.value),
      getFulfillmentAddressList(),
    ])
    context.value = splitContext
    addresses.value = addressList
    if (!existingSplits.value.length && canEdit.value) initializePlan()
  } catch (error) {
    loadError.value = error
    uni.showToast({ title: error?.message || t('order.split.loadFailed'), icon: 'none' })
  } finally {
    loading.value = false
  }
}

/** 使用默认地址初始化商品分配；页面按地址分组展示，同一 SKU 可进入多个地址。 */
function initializePlan() {
  const preferred = addresses.value.find(item => item.isDefault) || addresses.value[0]
  allocationPlan.value = createAllocationPlan(sourceItems.value, preferred?.id || 0)
  selectedAddressIds.value = preferred ? [preferred.id] : []
  activeAddressId.value = preferred?.id || 0
}

/** 刷新地址；已删除地址的数量退回待分配，不擅自转给其他收货人。 */
async function refreshAddresses() {
  try {
    addresses.value = await getFulfillmentAddressList()
    const validIds = new Set(addresses.value.map(item => item.id))
    const hadDeletedAddress = selectedAddressIds.value.some(id => !validIds.has(id))
    allocationPlan.value = allocationPlan.value.map(item => ({
      ...item,
      allocations: item.allocations.filter(allocation => validIds.has(Number(allocation.addressId))),
    }))
    selectedAddressIds.value = selectedAddressIds.value.filter(id => validIds.has(id))
    if (!selectedAddressIds.value.length && addresses.value.length) {
      selectedAddressIds.value = [(addresses.value.find(item => item.isDefault) || addresses.value[0]).id]
    }
    if (!selectedAddressIds.value.includes(activeAddressId.value)) activeAddressId.value = selectedAddressIds.value[0] || 0
    if (hadDeletedAddress) uni.showToast({ title: t('order.split.addressRemoved'), icon: 'none' })
  } catch (error) {
    uni.showToast({ title: error?.message || t('order.split.addressRefreshFailed'), icon: 'none' })
  }
}

/** 按订单明细查找当前 SKU 的分配余额。 */
function balanceFor(addressId, orderItemId) {
  if (Number(addressId) === activeAddressId.value) return activeBalances.value.get(Number(orderItemId)) || allocationBalance(undefined, addressId)
  return allocationBalance(allocationIndex.value.get(Number(orderItemId)), addressId)
}

/** 返回明确的联系人和完整地址；已被其他配送地址使用的选项不再重复出现。 */
function addressOptions(currentAddressId = 0) {
  return [
    { id: 0, label: t('order.split.selectAddress') },
    ...addresses.value
      .filter(address => address.id === Number(currentAddressId) || !selectedAddressIds.value.includes(address.id))
      .map(address => ({ ...address, label: `${address.name} ${address.phone} ${address.fullAddress}` })),
  ]
}

/** picker 的 value 是选项索引，与业务地址 ID 分开处理。 */
function addressOptionIndex(addressId) {
  return Math.max(0, addressOptions(addressId).findIndex(address => address.id === Number(addressId)))
}

/** 将 picker 返回的字符串或数字索引映射到地址 ID，再新增或整体更换配送地址。 */
function selectAddress(currentAddressId, event) {
  if (editingLocked.value) return
  const rawIndex = event?.detail?.value
  if (!/^\d+$/.test(String(rawIndex ?? ''))) return
  const selected = addressOptions(currentAddressId)[Number(rawIndex)]
  if (!selected?.id) return
  const sourceId = Number(currentAddressId)
  if (selected.id === sourceId || selectedAddressIds.value.includes(selected.id)) return

  if (sourceId === 0) {
    if (!canAddAddressGroup.value) return
    selectedAddressIds.value = [...selectedAddressIds.value, selected.id]
  } else {
    if (!selectedAddressIds.value.includes(sourceId)) return
    allocationPlan.value = allocationPlan.value.map(item => {
      const index = item.allocations.findIndex(allocation => Number(allocation.addressId) === sourceId)
      return index < 0 ? item : changeAllocationAddress(item, index, selected.id)
    })
    selectedAddressIds.value = selectedAddressIds.value.map(id => id === sourceId ? selected.id : id)
  }
  activeAddressId.value = selected.id
}

/** 移除地址并释放其所有尺码数量，其他地址数量和订单总数不变。 */
function removeAddressGroup(addressId) {
  const id = Number(addressId)
  if (editingLocked.value || selectedAddressIds.value.length <= 1 || !selectedAddressIds.value.includes(id)) return
  allocationPlan.value = allocationPlan.value.map(item => setAddressAllocationQuantity(item, id, 0))
  selectedAddressIds.value = selectedAddressIds.value.filter(selectedId => selectedId !== id)
  if (activeAddressId.value === id) activeAddressId.value = selectedAddressIds.value[0]
}

/** 将所有规格的真实剩余追加到指定地址，包含筛选后隐藏的商品。 */
function assignAllRemaining(addressId) {
  const id = Number(addressId)
  if (editingLocked.value || !selectedAddressIds.value.includes(id) || unallocatedQuantity.value <= 0) return
  allocationPlan.value = allocateRemainingToAddress(allocationPlan.value, id)
  retainedItemId.value = 0
}

/** 批量分配明确针对全单，确认后重查目标和数量，不受当前检索结果限制。 */
async function requestAssignAllRemaining(addressId) {
  const id = Number(addressId), quantity = unallocatedQuantity.value
  if (editingLocked.value || !selectedAddressIds.value.includes(id) || quantity <= 0) return
  if (!await openAppDialog({ title: t('order.split.assignWholeOrderRemaining'), description: t('order.split.assignWholeOrderConfirm', { count: quantity, name: addressById(id)?.name || t('order.split.addressFallback') }) })) return
  if (activeAddressId.value !== id || unallocatedQuantity.value !== quantity) {
    uni.showToast({ title: t('order.split.planChanged'), icon: 'none' }); return
  }
  assignAllRemaining(id)
}

/** 确认后清空指定地址的全部规格；数量回到待分配，其他地址不受影响。 */
async function clearCurrentAddress(addressId) {
  const id = Number(addressId)
  if (editingLocked.value || !selectedAddressIds.value.includes(id) || groupTotalQuantity(id) <= 0) return
  const confirmed = await openAppDialog({
    title: t('order.split.clearTitle'),
    description: t('order.split.clearContent'),
    confirmText: t('order.split.clearConfirm'),
    cancelText: t('common.cancel'),
  })
  if (!confirmed || editingLocked.value || !selectedAddressIds.value.includes(id)) return
  allocationPlan.value = clearAddressAllocation(allocationPlan.value, id)
  retainedItemId.value = 0
}

/** 独立编辑所选地址的 SKU 数量，领域方法负责限制剩余上限并允许归零。 */
function setAddressItemQuantity(addressId, orderItemId, requestedQuantity) {
  if (editingLocked.value || !selectedAddressIds.value.includes(Number(addressId))) return
  const index = allocationPlan.value.findIndex(item => item.orderItemId === Number(orderItemId))
  if (index < 0) return
  if (Number(addressId) === activeAddressId.value && itemFilter.value !== 'all') retainedItemId.value = Number(orderItemId)
  allocationPlan.value[index] = setAddressAllocationQuantity(allocationPlan.value[index], addressId, requestedQuantity)
}
/** 读取订单明细标识，区分同商品下不同尺码。 */
function itemIdOf(item) { return Number(valueOf(item, 'orderItemId', 'OrderItemId', 0)) }
/** 读取已生成配送安排的标识。 */
function splitIdOf(split) { return Number(valueOf(split, 'splitId', 'SplitId', 0)) }
/** 读取配送地址包含的商品明细。 */
function itemsOf(split) { return valueOf(split, 'items', 'Items', []) || [] }
/** 读取订单或配送明细的件数。 */
function quantityOf(item) { return Number(valueOf(item, 'quantity', 'Quantity', 0)) }
/** 读取配送地址的应发总件数。 */
function totalQuantityOf(split) { return Number(valueOf(split, 'totalQuantity', 'TotalQuantity', 0)) }
/** 读取实际发货件数。 */
function shippedQuantityOf(source) { return Number(valueOf(source, 'shippedQuantity', 'ShippedQuantity', 0)) }
/** 读取未发件数，缺失时按应发与实发差额计算。 */
function unshippedQuantityOf(split) {
  const explicit = valueOf(split, 'unshippedQuantity', 'UnshippedQuantity', null)
  if (explicit !== null && explicit !== undefined) return Math.max(0, Number(explicit) || 0)
  return Math.max(0, totalQuantityOf(split) - shippedQuantityOf(split))
}
/** 按业务地址标识查找完整收货信息。 */
function addressById(id) { return addresses.value.find(item => item.id === Number(id)) }
/** 汇总当前地址已分配的各规格数量。 */
function groupTotalQuantity(addressId) {
  return allocationPlan.value.reduce((sum, item) => (
    sum + (item.allocations || [])
      .filter(allocation => allocation.addressId === Number(addressId))
      .reduce((itemSum, allocation) => itemSum + Number(allocation.quantity || 0), 0)
  ), 0)
}
/** 打开统一地址管理页；返回后 onShow 会保留方案并刷新新增地址。 */
function openAddressManager() {
  navigator.navigateTo(routes.account.address())
}


/** 仅切换当前编辑地址，不改变任何商品数量。 */
function selectActiveAddress(addressId) {
  if (!editingLocked.value && selectedAddressIds.value.includes(Number(addressId))) activeAddressId.value = Number(addressId)
}

/** 删除前明确数量会回到待分配；取消不改变方案。 */
async function requestRemoveAddress(addressId) {
  const id = Number(addressId)
  if (editingLocked.value || selectedAddressIds.value.length < 2) return
  const quantity = groupTotalQuantity(id)
  if (quantity <= 0) { removeAddressGroup(id); return }
  const confirmed = await openAppDialog({
    title: t('order.split.removeTitle'),
    description: t('order.split.removeContent', { count: quantity }),
    confirmText: t('order.split.removeAddress'), cancelText: t('common.cancel'),
  })
  if (confirmed) removeAddressGroup(id)
}

/** 判断当前规格是否在其他已选择地址中有可调入的数量。 */
function hasTransferSource(targetId, itemId) {
  const item = allocationPlan.value.find(row => row.orderItemId === Number(itemId))
  return (item?.allocations || []).some(row => row.addressId !== Number(targetId) && row.quantity > 0)
}

const transferSources = computed(() => {
  const draft = transferDraft.value
  if (!draft) return []
  const item = allocationPlan.value.find(row => row.orderItemId === draft.itemId)
  return (item?.allocations || [])
    .filter(row => row.addressId !== draft.targetId && row.quantity > 0 && selectedAddressIds.value.includes(row.addressId))
    .map(row => {
      const address = addressById(row.addressId)
      return { id: row.addressId, quantity: row.quantity,
        label: (address ? address.name + ' · ' + address.fullAddress : t('order.split.addressFallback')) + ' · ' + t('order.split.quantity', { count: row.quantity }) }
    })
})
const transferSourceIndex = computed(() => Math.max(0, transferSources.value.findIndex(row => row.id === transferFromId.value)))
const transferMaximum = computed(() => transferSources.value.find(row => row.id === transferFromId.value)?.quantity || 0)
const transferItemLabel = computed(() => {
  const item = sourceItems.value.find(row => itemIdOf(row) === transferDraft.value?.itemId)
  return item ? valueOf(item, 'productName', 'ProductName', '') + ' · ' + valueOf(item, 'skuName', 'SkuName', '') : ''
})

/** 打开当前规格调入面板，默认仅调一件，确认前不改任何分配。 */
function openTransfer(targetId, itemId) {
  if (editingLocked.value || !selectedAddressIds.value.includes(Number(targetId))) return
  transferDraft.value = { targetId: Number(targetId), itemId: Number(itemId) }
  transferFromId.value = transferSources.value[0]?.id || 0
  transferQuantity.value = 1
  if (!transferFromId.value) transferDraft.value = null
}

/** picker 索引显式映射到来源地址，切换来源重置数量而不立即修改方案。 */
function chooseTransferSource(event) {
  const raw = event?.detail?.value
  if (!/^\d+$/.test(String(raw ?? ''))) return
  const source = transferSources.value[Number(raw)]
  if (!source) return
  transferFromId.value = source.id
  transferQuantity.value = 1
}

/** 再次校验来源、目标和数量后一次完成守恒转移；不调用写接口。 */
function confirmTransfer() {
  const draft = transferDraft.value
  if (editingLocked.value || !draft || !selectedAddressIds.value.includes(draft.targetId)) return
  const quantity = Number(transferQuantity.value)
  const index = allocationPlan.value.findIndex(row => row.orderItemId === draft.itemId)
  if (index < 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > transferMaximum.value) {
    uni.showToast({ title: t('order.split.transferUnavailable'), icon: 'none' })
    return
  }
  allocationPlan.value[index] = transferAddressAllocation(allocationPlan.value[index], transferFromId.value, draft.targetId, quantity)
  transferDraft.value = null
}

/** 将后端返回的客户状态优先转换为配送详情文案，避免展示 ERP/WMS 内部状态。 */
function customerStatusText(split) {
  const message = valueOf(split, 'customerStatusMessage', 'CustomerStatusMessage', '')
  if (message) return message
  const status = Number(valueOf(split, 'status', 'Status', FULFILLMENT_SPLIT_STATUS.PENDING_PUSH))
  return FULFILLMENT_SPLIT_STATUS_MAP[status]?.text || '配送处理中'
}

/** 判断配送安排是否未通过，只有后端明确返回驳回结果时才提示重排。 */
function isReviewRejected(split) {
  return [ERP_REVIEW_STATUS.REJECTED, ERP_REVIEW_STATUS.REJECTED_AFTER_SHIPMENT].includes(
    Number(valueOf(split, 'erpReviewStatus', 'ErpReviewStatus', 0)),
  )
}

/** 打开本地核对层，让客户确认每个地址实际分配的商品。 */
function openReview() {
  if (canSubmit.value) reviewVisible.value = true
}

/** 只响应当前核对层的一次确认，关层后沿用原提交入口。 */
async function confirmReview() {
  if (!reviewVisible.value || !canSubmit.value || submitting.value) return
  reviewVisible.value = false
  await submitSplits()
}

/** 沿用配送分配、请求标识和提交结果处理，失败保留草稿供继续编辑。 */
async function submitSplits() {
  if (!canSubmit.value || submitting.value) {
    if (validationError.value) uni.showToast({ title: validationError.value, icon: 'none' })
    return
  }
  submitting.value = true
  submitFailure.value = null
  try {
    await createFulfillmentSplits({
      orderId: orderId.value,
      clientRequestId: generateClientRequestId(),
      groups: deliveryGroups.value,
    })
    submissionAccepted.value = true
    uni.showToast({ title: t('order.split.submitSuccess'), icon: 'success' })
    await loadData()
  } catch (error) {
    submitFailure.value = error || {}
    uni.showToast({ title: error?.message || t('order.split.submitFailed'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
/* 手机端以地址和规格数量为主，编辑区只保留一层卡片。 */
.allocation-page { width: 100%; max-width: 720px; margin: 0 auto; padding: 10px 14px 24px; box-sizing: border-box; color: #1b1c20; }
.order-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 2px 2px 10px; }
.eyebrow { min-width: 0; color: #747b86; font-size: 11px; line-height: 18px; overflow-wrap: anywhere; }
.order-summary-total { flex: none; color: #62666f; font-size: 12px; white-space: nowrap; }
.allocation-workspace, .address-group-list { min-width: 0; }
.editor-toolbar { display: flex; min-height: 44px; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.section-title { color: #252a32; font-size: 15px; font-weight: 650; line-height: 22px; }
.add-address-picker, .change-address-picker { flex: none; }
.add-address-button { display: flex; min-height: 36px; align-items: center; justify-content: center; padding: 0 12px; border: 1px solid #e2e5ea; border-radius: 9px; background: #fff; color: #343b46; font-size: 12px; font-weight: 550; line-height: 20px; }
.is-disabled { opacity: .45; }
.address-tabs { width: 100%; min-width: 0; margin-bottom: 10px; white-space: nowrap; }
.address-tab-list { display: inline-flex; gap: 8px; padding: 1px 0 5px; }
.address-tab { display: inline-flex; flex: none; align-items: center; gap: 10px; min-height: 44px; max-width: 210px; margin: 0; padding: 8px 12px; border: 1px solid #e2e5ea; border-radius: 10px; color: #62666f; background: #fff; line-height: 20px; }
.address-tab.active { color: #bd172a; border-color: #d7192d; background: #fff5f6; }
.address-tab-name { min-width: 0; max-width: 125px; overflow: hidden; font-size: 12px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.address-tab-quantity { flex: none; color: #747b86; font-size: 11px; white-space: nowrap; }
.address-group-card { min-width: 0; overflow: visible; border: 1px solid #e9ebef; border-radius: 16px; background: #fff; }
.address-summary { padding: 10px 14px 14px; border-bottom: 1px solid #eceef2; }
.address-group-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.address-group-copy { display: flex; flex: 1; min-width: 0; flex-wrap: wrap; align-items: baseline; gap: 3px 9px; }
.address-group-contact { color: #242a33; font-size: 15px; font-weight: 650; line-height: 22px; overflow-wrap: anywhere; }
.address-phone { color: #747b86; font-size: 12px; line-height: 20px; overflow-wrap: anywhere; }
.change-address-button { display: flex; min-height: 44px; min-width: 44px; align-items: center; justify-content: flex-end; color: #b91d31; font-size: 12px; line-height: 20px; }
.group-address-detail { display: block; margin-top: 2px; color: #62666f; font-size: 12px; line-height: 19px; overflow-wrap: anywhere; }
.items-heading { display: flex; min-height: 50px; align-items: center; justify-content: space-between; gap: 12px; padding: 0 14px; }
.items-heading .section-title { font-size: 13px; font-weight: 600; }
.more-actions-toggle { display: flex; min-height: 44px; align-items: center; margin: 0; padding: 0; border: 0; color: #747b86; background: transparent; font-size: 12px; line-height: 20px; }
.more-actions-toggle text { margin-left: 5px; font-size: 18px; }
.allocation-product { margin: 0 14px; }
.allocation-product + .allocation-product { margin-top: 8px; padding-top: 14px; border-top: 1px solid #e9ebef; }
.product-head { display: flex; width: 100%; min-width: 0; min-height: 56px; align-items: center; gap: 10px; margin: 0; padding: 8px 0; border: 0; background: transparent; text-align: left; white-space: normal; }
.item-image { width: 40px; height: 40px; flex: 0 0 40px; overflow: hidden; border-radius: 8px; background: #f4f5f8; }
.item-copy { min-width: 0; flex: 1; }
.item-name { display: block; color: #303640; font-size: 13px; font-weight: 600; line-height: 20px; overflow-wrap: anywhere; }
.item-spec { display: flex; flex-wrap: wrap; gap: 2px 10px; margin-top: 3px; color: #747b86; font-size: 11px; line-height: 18px; }
.item-tools { position: sticky; top: 0; z-index: 20; margin-bottom: 10px; padding: 0 14px 12px; border-bottom: 1px solid #eceef2; background: #fff; }
.item-tools .items-heading { padding-right: 0; padding-left: 0; }
.sku-search { display: flex; min-height: 44px; align-items: center; gap: 8px; padding: 0 10px; border: 1px solid #e2e5e9; border-radius: 10px; background: #f7f8fa; }
.sku-search-input { flex: 1; width: 0; min-width: 0; height: 44px; padding: 0; border: 0; outline: none; background: transparent; color: #303640; font-size: 16px; }
.search-clear { display: flex; flex: 0 0 36px; min-height: 44px; align-items: center; justify-content: center; margin: 0 -6px 0 0; padding: 0; border: 0; background: transparent; }
.item-filters { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 6px; margin-top: 8px; }
.item-filters button { display: flex; min-width: 0; min-height: 44px; align-items: center; justify-content: center; margin: 0; padding: 7px 6px; border: 0; border-radius: 8px; background: #f3f4f6; color: #626974; font-size: 12px; line-height: 18px; white-space: normal; }
.item-filters button.active { color: #b91d31; background: #fff0f2; font-weight: 600; }
.search-result-count { display: block; margin-top: 8px; color: #747b86; font-size: 11px; line-height: 18px; }
.sku-code { display: block; margin-top: 2px; color: #747b86; font-size: 11px; line-height: 17px; overflow-wrap: anywhere; }
.retained-note { display: block; color: #16804b; font-size: 11px; line-height: 17px; }
.group-item-row { display: grid; grid-template-columns: minmax(0, 1fr) 124px; align-items: center; gap: 10px; min-height: 68px; padding: 9px 0; border-top: 1px solid #f1f2f5; }
.sku-copy { min-width: 0; }
.sku-name { color: #333a45; font-size: 13px; font-weight: 500; line-height: 20px; overflow-wrap: anywhere; }
.sku-balance { display: flex; flex-wrap: wrap; gap: 1px 8px; margin-top: 3px; color: #828995; font-size: 11px; line-height: 17px; font-variant-numeric: tabular-nums; }
.sku-balance text { white-space: normal; }
.has-remaining { color: #a76713; }
.group-item-quantity { min-width: 0; }
.split-quantity-stepper { width: 124px; }
.gift-tag { display: inline-block; margin-left: 5px; padding: 0 4px; border-radius: 4px; color: #a15a20; background: #fff5e8; font-size: 10px; line-height: 17px; }
.transfer-button { display: flex; align-items: center; justify-content: flex-start; min-height: 32px; margin: 2px 0 -3px; padding: 0; border: 0; color: #b91d31; background: transparent; font-size: 11px; line-height: 18px; text-align: left; }
.target-hint { margin: 0 14px 10px; padding: 9px 11px; border-radius: 8px; color: #8d641e; background: #fff8ed; font-size: 12px; line-height: 19px; }
.active-filter { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px; margin: 0 14px 10px; color: #8d641e; font-size: 12px; line-height: 20px; }
.text-action { min-height: 36px; margin: 0; padding: 5px 0; border: 0; color: #b91d31; background: transparent; font-size: 12px; line-height: 20px; white-space: normal; }
.filtered-empty { padding: 18px 14px 22px; color: #747b86; font-size: 13px; line-height: 21px; text-align: center; }
.filtered-empty .text-action { display: block; margin: 6px auto 0; }
.footer-stack { width: 100%; max-width: 692px; margin: 0 auto; min-width: 0; }
.footer-hint { display: block; margin: 0 0 8px; color: #687681; font-size: 12px; line-height: 18px; text-align: center; }
.footer-hint.pending { color: #a76713; }
.submit-button { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 46px; margin: 0; padding: 11px 14px; border: 0; border-radius: 11px; color: #fff; background: #d7192d; font-size: 14px; font-weight: 600; line-height: 22px; white-space: normal; }
.submit-button[disabled] { color: #969aa3; background: #eceef2; }
.state-card, .notice-card, .empty-address-card { padding: 22px 16px; border: 1px solid #e9ebef; border-radius: 14px; background: #fff; color: #62666f; font-size: 13px; line-height: 21px; text-align: center; }
.notice-card { margin-bottom: 12px; padding: 12px 14px; border: 0; color: #94621d; background: #fff7e9; text-align: left; overflow-wrap: anywhere; }
.notice-card > text, .remaining-item { display: block; }
.submit-error { margin-top: 14px; color: #a32b29; background: #fff1ef; }
.empty-address-card { display: flex; align-items: center; flex-direction: column; gap: 8px; padding: 30px 18px; }
.empty-title { font-size: 15px; font-weight: 600; }
.empty-copy { font-size: 13px; line-height: 21px; }
.secondary-button { min-height: 44px; margin: 14px auto 0; padding: 10px 18px; border: 0; border-radius: 10px; color: #fff; background: #d7192d; font-size: 13px; line-height: 20px; }
.button-center { display: flex; align-items: center; justify-content: center; text-align: center; }
.action-menu { display: flex; flex-direction: column; }
.menu-action { width: 100%; min-height: 48px; margin: 0; padding: 12px 0; border: 0; border-bottom: 1px solid #eceef2; color: #343b46; background: transparent; font-size: 13px; line-height: 21px; text-align: left; white-space: normal; }
.menu-action[disabled] { color: #a2a8b1; }
.danger-action { color: #b42318; }
.guide-copy { padding: 12px; border-radius: 8px; color: #62666f; background: #f4f5f8; font-size: 12px; line-height: 20px; }
.guide-copy > text { display: block; }
.guide-copy > text + text { margin-top: 8px; }
.review-groups { display: flex; flex-direction: column; gap: 14px; }
.review-group { padding: 12px; border: 1px solid #e9ebef; border-radius: 10px; }
.review-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; color: #303640; font-size: 14px; font-weight: 600; line-height: 21px; }
.review-heading > text:first-child { min-width: 0; overflow-wrap: anywhere; }
.review-heading > text:last-child { flex: none; }
.review-address { display: block; margin: 5px 0 8px; color: #747b86; font-size: 12px; line-height: 19px; overflow-wrap: anywhere; }
.review-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-top: 1px solid #eceef2; color: #454e5b; font-size: 12px; line-height: 19px; }
.review-item > view { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.review-spec { display: block; color: #828995; }
.review-quantity { flex: none; font-weight: 600; font-variant-numeric: tabular-nums; }
.transfer-label, .transfer-variant { display: block; margin: 12px 0 7px; color: #454e5b; font-size: 13px; line-height: 20px; }
.transfer-variant { font-weight: 600; }
.transfer-source { padding: 11px; border: 1px solid #e2e5ea; border-radius: 8px; color: #454e5b; font-size: 12px; line-height: 19px; overflow-wrap: anywhere; }
.transfer-controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-top: 14px; color: #62666f; font-size: 12px; line-height: 20px; }
button::after { border: 0; }
/* 已安排配送的只读详情继续展示后端状态及实际发货数量。 */
.section-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin: 14px 0 10px; font-size: 15px; font-weight: 600; }
.section-note { color: #828995; font-size: 12px; font-weight: 400; }
.split-progress-card { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding: 14px; border-radius: 12px; background: #eef6f1; color: #35674f; font-size: 13px; line-height: 20px; }
.split-progress-title, .split-progress-copy { display: block; }
.split-progress-title { font-weight: 600; }
.split-progress-copy { font-size: 12px; }
.split-progress-number { flex: none; font-variant-numeric: tabular-nums; }
.readonly-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.split-card { min-width: 0; padding: 14px; border: 1px solid #e9ebef; border-radius: 14px; background: #fff; }
.card-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 8px; }
.card-head > view { min-width: 0; flex: 1; }
.card-title, .card-subtitle { display: block; overflow-wrap: anywhere; }
.card-title { font-size: 14px; font-weight: 600; line-height: 21px; }
.card-subtitle { margin-top: 3px; color: #828995; font-size: 11px; line-height: 18px; }
.status-tag { max-width: 100%; padding: 3px 7px; border-radius: 6px; color: #a34450; background: #fff1f3; font-size: 11px; line-height: 18px; overflow-wrap: anywhere; }
.readonly-address { margin-top: 12px; padding: 10px; border-radius: 8px; background: #f7f8fa; }
.address-person, .address-detail { display: block; font-size: 12px; line-height: 19px; overflow-wrap: anywhere; }
.address-detail { margin-top: 3px; color: #747b86; }
.readonly-item { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid #eceef2; }
.readonly-quantity-copy { display: flex; flex-direction: column; gap: 3px; margin-left: auto; font-size: 12px; line-height: 19px; text-align: right; }
.readonly-shipped { color: #747b86; }
.split-result-warning, .split-result-success, .split-shipped-time { display: block; margin-top: 10px; font-size: 12px; line-height: 19px; overflow-wrap: anywhere; }
.split-result-warning { color: #94621d; }
.split-result-success { color: #35674f; }
.split-shipped-time { color: #828995; }
@media (min-width: 800px) {
  .allocation-page { padding-top: 16px; }
  .readonly-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (prefers-reduced-motion: reduce) { * { transition: none; } }
</style>
