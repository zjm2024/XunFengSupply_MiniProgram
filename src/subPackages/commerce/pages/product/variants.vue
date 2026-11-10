<template>
  <AppPageShell>
    <template #header>
      <app-header
        class="purchase-header"
        :title="t('commerce.titles.bulk')"
        :show-back="true"
        :show-cart="true"
        :cart-count="cartStore.cartBadgeCount"
        @cart="goToCart"
      />
    </template>

    <template #content>
      <AppContent>
        <app-page-state
          :state="pageState"
          :title="t('commerce.variants.loadFailedTitle')"
          :description="errorMessage"
          :action-text="t('commerce.variants.reload')"
          icon-type="product"
          @retry="loadProduct"
        >
          <view v-if="product" class="batch-layout" :class="{ 'matrix-layout': isMatrix }" :style="matrixStyle">
            <view class="purchase-top">
              <view class="product-card">
                <AppProductImage v-if="product.image" class="product-image" :src="product.image" />
                <view class="product-info">
                  <text class="product-name">{{ product.name }}</text>
                  <text v-if="product.code" class="product-code">{{ t('commerce.variants.article', { code: product.code }) }}</text>
                  <view class="price-row">
                    <AmountText v-if="productPrice" class="price" :text="productPrice.amount" />
                    <text class="unit">{{ productPrice ? t(productPrice.variable ? 'commerce.variants.fromPerUnit' : 'commerce.variants.perUnit', { unit: product.unit }) : t('commerce.variants.noQuote') }}</text>
                  </view>
                </view>
              </view>

            </view>

            <view v-if="skuGroups.length" class="spec-toolbar">
              <view class="batch-fill-row">
                <button v-if="fillScopes.length > 2" class="fill-scope" @tap="fillPickerVisible = true">
                  <view class="fill-scope-control">
                    <text class="fill-scope-text">{{ fillScopes[fillScopeIndex].name }}</text>
                    <AppIcon name="chevron-right" :size="12" class="fill-scope-icon" />
                  </view>
                </button>
                <input v-model="batchFillNumber" type="number" class="batch-fill-input"
                  :aria-label="t('commerce.variants.quantityPlaceholder')"
                  :placeholder="t('commerce.variants.quantityShort')" @confirm="applyBatchFill" />
                <button class="batch-fill-btn button-center" @click="applyBatchFill">{{ t('commerce.variants.applyFill') }}</button>
                <button class="clear-btn button-center" :disabled="!selectedLines.length" @click="clearAll">{{ t('commerce.variants.clearShort') }}</button>
              </view>
              <view class="spec-view-row">
                <text v-if="isMatrix" class="spec-swipe-hint">{{ t('commerce.variants.swipeSizes') }}</text>
                <text v-else class="spec-list-label">{{ t('commerce.variants.specTitle') }}</text>
                <view class="spec-switch" role="group" :aria-label="t('commerce.variants.viewMode')">
                  <button class="spec-view-button" :class="{ 'is-selected': !isMatrix }"
                    :aria-pressed="!isMatrix" @click="setViewMode('list')">{{ t('commerce.variants.listView') }}</button>
                  <button class="spec-view-button" :class="{ 'is-selected': isMatrix }"
                    :aria-pressed="isMatrix" @click="setViewMode('matrix')">{{ t('commerce.variants.tableView') }}</button>
                </view>
              </view>
            </view>

            <scroll-view v-if="skuGroups.length" class="spec-scroll" :class="{ 'is-matrix': isMatrix }" :scroll-x="isMatrix">
              <view class="spec-sheet">
                <view class="matrix-heading">
                  <text class="matrix-label">{{ t('commerce.variants.colorSize') }}</text>
                  <view class="matrix-sizes">
                    <text v-for="column in sizeColumns" :key="column.key" class="matrix-size">{{ column.label }}</text>
                  </view>
                </view>
                <view v-for="group in matrixGroups" :key="group.key" class="sku-group-card">
                  <view class="group-heading">
                    <AppProductImage v-if="group.image" class="group-image" :src="group.image" />
                    <view class="group-heading-text">
                      <text class="group-title">{{ group.name }}</text>
                      <text v-if="!isMatrix && isGroupCollapsed(group.key) && group.selectedCount" class="group-selected">{{ t('commerce.variants.selected', { count: group.selectedCount, quantity: group.selectedQuantity, unit: product.unit }) }}</text>
                    </view>
                    <view v-if="showGroupQuote(group)" class="group-quote">
                      <AmountText class="group-price" :text="group.quote.amount" />
                      <text v-if="group.quote.variable" class="group-price-note">{{ t('commerce.variants.from') }}</text>
                    </view>
                    <view class="group-actions">
                      <button class="collapse-btn button-center" :aria-expanded="!isGroupCollapsed(group.key)"
                        :aria-label="isGroupCollapsed(group.key) ? t('commerce.variants.expand') : t('commerce.variants.collapse')"
                        @tap="toggleGroup(group.key)">
                        <AppIcon name="chevron-right" :size="16" class="collapse-icon" :class="{ expanded: !isGroupCollapsed(group.key) }" />
                      </button>
                    </view>
                  </view>

                  <view class="group-size-list" :class="{ 'is-collapsed': isGroupCollapsed(group.key) }">
                    <template v-for="cell in group.displayCells" :key="cell.key">
                      <view v-if="cell.sku" class="sku-row"
                        :class="{ unavailable: !cell.editable, 'has-quantity': quantities[cell.sku.skuId] > 0 }">
                        <view v-if="!isMatrix || cell.price || cell.stock || cell.minimum || cell.code" class="sku-copy">
                          <view class="sku-title-row">
                            <text class="sku-size">{{ cell.label }}</text>
                            <AmountText v-if="cell.price" class="sku-price" :text="cell.price" />
                            <AmountText v-if="cell.listPrice" class="sku-list-price" :class="{ 'sku-list-price--strike': cell.strike }" :text="cell.listPrice" />
                            <text v-if="cell.stock" class="sku-stock" :class="cell.stock.tone">{{ cell.stock.label }}</text>
                          </view>
                          <view v-if="cell.minimum || cell.code" class="sku-meta">
                            <text v-if="cell.minimum" class="sku-minimum">{{ cell.minimum }}</text>
                            <text v-if="cell.code">{{ cell.code }}</text>
                          </view>
                        </view>
                        <input v-if="cell.editable && isMatrix" class="matrix-quantity" type="number"
                          :key="matrixInputRevisions[cell.sku.skuId] || 0"
                          :ref="field => labelMatrixField(field, quantityLabel(group, cell))"
                          :aria-label="quantityLabel(group, cell)"
                          :value="matrixEdit?.sku.skuId === cell.sku.skuId ? matrixEdit.value : (quantities[cell.sku.skuId] || 0)"
                          placeholder="0" confirm-type="done"
                          @focus="beginMatrixEdit(cell.sku)" @input="updateMatrixEdit(cell.sku, $event)"
                          @blur="finishMatrixEdit(cell.sku, $event)" @confirm="finishMatrixEdit(cell.sku, $event)" />
                        <quantity-stepper v-else-if="cell.editable" class="sku-stepper"
                          :input-label="quantityLabel(group, cell)"
                          :model-value="quantities[cell.sku.skuId] || 0"
                          :min="cell.sku.minOrderQty" :max="cell.sku.stock"
                          :allow-input="true" :allow-zero="true" size="sm"
                          @update:model-value="setSkuQuantity(cell.sku, $event)" />
                      </view>
                      <view v-else class="matrix-empty" :aria-label="t('commerce.variants.noSize')">—</view>
                    </template>
                  </view>
                </view>
              </view>
            </scroll-view>
            <view v-else class="no-specs">{{ t('commerce.variants.noSpecs') }}</view>

          </view>
        </app-page-state>
      </AppContent>
    </template>

    <template #footer>
      <fixed-action-bar v-if="pageState === PageStatus.CONTENT">
        <view class="footer-stack" :class="{ 'matrix-layout': isMatrix }" :style="matrixStyle">
          <view v-if="validationMessage" class="validation-message" role="alert">{{ validationMessage }}</view>
          <view class="footer-inner">
            <view class="footer-summary">
              <text class="footer-label">{{ t('commerce.variants.selected', { count: selectedLines.length, quantity: totalQuantity, unit: product?.unit || '件' }) }}</text>
              <AmountText class="footer-amount" :text="'¥' + (formatMoney(totalAmount))" />
            </view>
            <button class="add-btn button-center" :disabled="!canSubmit || submitting" @click="submit">
              {{ submitting ? t('commerce.variants.submitting') : t('commerce.variants.add') }}
            </button>
          </view>
        </view>
      </fixed-action-bar>
    </template>
    <template #overlay>
      <AppOptionPicker v-model:visible="fillPickerVisible" :model-value="fillScopeIndex" :options="fillScopes.map((scope,index) => ({ value: index, label: scope.name }))" :title="t('commerce.variants.specTitle')" @confirm="setFillScope({ detail: { value: $event } })" />
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import { getPriceDisplay } from '@/shared/utils/priceDisplay.js'
import '@/subPackages/commerce/i18n/register.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { AppError, ErrorKind } from '@/shared/api/appError.js'
import { computed, ref } from 'vue'
import AppOptionPicker from '@/shared/ui/AppOptionPicker.vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getGoodsDetail } from '../../api/productApi.js'
import { useCart } from '@/shared/composables/useCart.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'
import { useResponsive } from '@/shared/composables/useResponsive.js'
import storage from '@/shared/utils/storage.js'
import { navigator } from '../../../../app/navigation/navigator.js'
import { routes } from '../../../../app/config/routes.js'
import { PageStatus } from '../../../../shared/model/pageState.js'
import AppPageShell from '../../../../shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '../../../../shared/ui/AppContent/AppContent.vue'
import AppPageState from '../../../../shared/ui/AppPageState/AppPageState.vue'
import appHeader from '../../../../shared/ui/AppHeader/AppHeader.vue'
import fixedActionBar from '../../../../shared/ui/FixedActionBar/FixedActionBar.vue'
import AppProductImage from '../../../../shared/ui/AppProductImage/AppProductImage.vue'
import quantityStepper from '@/shared/ui/QuantityStepper/QuantityStepper.vue'
import AppIcon from '../../../../shared/ui/AppIcon/AppIcon.vue'

const SPEC_VIEW_STORAGE_KEY = 'bulk_purchase_view_mode'
const { layout } = useResponsive()
const viewMode = ref(storage.get(SPEC_VIEW_STORAGE_KEY, ''))
const isMatrix = computed(() => viewMode.value === 'matrix'
  || (viewMode.value !== 'list' && layout.value.windowWidth >= 760))

function setViewMode(mode) {
  finishMatrixEdit()
  viewMode.value = mode
  storage.set(SPEC_VIEW_STORAGE_KEY, mode)
}

const productId = ref(0)
const product = ref(null)
const quantities = ref({})
const batchRequestId = ref('')
const batchFillNumber = ref('')
const matrixEdit = ref(null)
const matrixInputRevisions = ref({})
const fillScopeKey = ref(null)
const fillPickerVisible = ref(false)
const collapsedGroupKeys = ref({})
const pageState = ref(PageStatus.LOADING)
const pageFailure = ref(localError('commerce.variants.network'))
const errorMessage = computed(() => pageFailure.value?.message || '')
const { cartStore, submitting, loadCart, batchAddSkuToCart } = useCart()

const skuGroups = computed(() => {
  const groups = new Map()
  for (const sku of product.value?.skus || []) {
    const key = String(sku.colorId || sku.colorName || 'default')
    if (!groups.has(key)) groups.set(key, { key, name: sku.colorName || t('commerce.variants.defaultColor'), items: [], image: '', selectedCount: 0, selectedQuantity: 0 })
    const group = groups.get(key)
    group.items.push(sku)
    if (!group.image && sku.image) group.image = sku.image
    const quantity = Number(quantities.value[sku.skuId]) || 0
    if (quantity > 0) {
      group.selectedCount++
      group.selectedQuantity += quantity
    }
  }
  return Array.from(groups.values(), group => {
    const quote = priceQuote(group.items)
    const counts = new Map()
    const entries = group.items.map(sku => {
      const label = sku.sizeName || sku.specName || t('commerce.variants.defaultSize')
      const id = sku.sizeValueId ? 'id:' + sku.sizeValueId : 'label:' + (sku.sizeName || sku.specName || '')
      const position = counts.get(id) || 0
      counts.set(id, position + 1)
      return { key: JSON.stringify([id, position]), label, sku, id }
    })
    const cells = Object.fromEntries(entries.map(({ key, sku, id }) => [key, skuPresentation(sku, quote, counts.get(id) > 1)]))
    const editableCount = Object.values(cells).filter(cell => cell.editable).length
    return { ...group, entries, cells, quote, editableCount }
  })
})

const fillScopes = computed(() => [
  { key: null, name: t('commerce.variants.allColors') },
  ...skuGroups.value.filter(group => group.editableCount > 0).map(({ key, name }) => ({ key, name })),
])
const fillScopeIndex = computed(() => Math.max(0, fillScopes.value.findIndex(scope => scope.key === fillScopeKey.value)))

function setFillScope(event) {
  finishMatrixEdit()
  fillScopeKey.value = fillScopes.value[Number(event.detail.value)]?.key ?? null
}

const sizeColumns = computed(() => Array.from(new Map(skuGroups.value.flatMap(group =>
  group.entries.map(({ key, label }) => [key, { key, label }]),
)).values()))
const matrixGroups = computed(() => skuGroups.value.map(group => ({ ...group,
  displayCells: sizeColumns.value.map(column => ({ ...column, ...group.cells[column.key] })),
})))
const matrixStyle = computed(() => ({ '--spec-columns': String(sizeColumns.value.length || 1) }))
const productPrice = computed(() => priceQuote(product.value?.skus || []))

const selectedLines = computed(() => (product.value?.skus || [])
  .map(sku => ({
    sku,
    skuId: Number(sku.skuId),
    quantity: Number(quantities.value[sku.skuId]) || 0,
  }))
  .filter(line => line.quantity > 0))

const totalQuantity = computed(() => selectedLines.value.reduce((sum, line) => sum + line.quantity, 0))
const totalAmount = computed(() => selectedLines.value.reduce(
  (sum, line) => sum + Number(line.sku.price || 0) * line.quantity,
  0,
))

const validationMessage = computed(() => {
  if (selectedLines.value.length > 50) return t('commerce.variants.tooMany')
  const invalid = selectedLines.value.find(({ sku, quantity }) => (
    !sku.canPurchase
    || quantity < Number(sku.minOrderQty || 1)
    || quantity > Number(sku.stock || 0)
  ))
  if (!invalid) return ''
  if (!invalid.sku.canPurchase) return t('commerce.variants.unavailable', { name: invalid.sku.specName || invalid.sku.skuCode })
  if (invalid.quantity < invalid.sku.minOrderQty) return t('commerce.variants.belowMinimum', { name: invalid.sku.specName || invalid.sku.skuCode, count: invalid.sku.minOrderQty })
  return t('commerce.variants.aboveStock', { name: invalid.sku.specName || invalid.sku.skuCode })
})

const canSubmit = computed(() => selectedLines.value.length > 0 && !validationMessage.value)

onLoad(options => {
  productId.value = Number(options?.id || options?.productId || 0)
  loadProduct()
})

onShow(() => loadCart({ silent: true }).catch(() => {}))

/** 读取原商品并沿用原数量初始化，只本地化错误。 */
async function loadProduct() {
  if (!productId.value) {
    pageState.value = PageStatus.ERROR
    pageFailure.value = localError('commerce.variants.missingId')
    return
  }
  pageState.value = PageStatus.LOADING
  try {
    const result = await getGoodsDetail(productId.value)
    if (!result) throw localError('commerce.variants.missing')
    product.value = result
    quantities.value = Object.fromEntries((result.skus || []).map(sku => [sku.skuId, 0]))
    collapsedGroupKeys.value = {}
    fillScopeKey.value = null
    matrixEdit.value = null
    batchRequestId.value = ''
    pageState.value = PageStatus.CONTENT
  } catch (error) {
    pageFailure.value = error?.message ? error : localError('commerce.variants.loadFailed')
    pageState.value = PageStatus.ERROR
  }
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

/** 以可采购规格的最低成交单价为组价，避免缺货低价误导。 */
function priceQuote(items) {
  const cents = items.filter(sku => sku.canPurchase && sku.price != null && sku.price !== '')
    .map(sku => Math.round(Number(sku.price) * 100))
    .filter(price => Number.isFinite(price) && price >= 0)
  if (!cents.length) return null
  const min = Math.min(...cents)
  return { cents: min, amount: '¥' + formatMoney(min / 100), variable: Math.max(...cents) !== min }
}

function skuPresentation(sku, quote, duplicate) {
  const unit = product.value?.unit || ''
  const display = getPriceDisplay(sku)
  const cents = Math.round(Number(sku.price) * 100)
  const hasPrice = sku.price != null && sku.price !== '' && Number.isFinite(cents) && cents >= 0
  const showPrice = sku.canPurchase && hasPrice && (quote?.variable || display.showListPrice)
  return {
    sku,
    editable: sku.canPurchase && Number(sku.stock) >= Math.max(1, Number(sku.minOrderQty) || 1),
    price: showPrice ? '¥' + formatMoney(cents / 100) : '',
    listPrice: showPrice && display.showListPrice ? '¥' + formatMoney(display.listPrice) : '',
    strike: display.strikeListPrice,
    stock: stockPresentation(sku, unit),
    minimum: sku.canPurchase && sku.minOrderQty > 1 ? t('commerce.variants.minimum', { count: sku.minOrderQty, unit }) : '',
    code: duplicate ? sku.skuCode : '',
  }
}

function stockPresentation(sku, unit) {
  const stock = Number(sku.stock) || 0
  if (!sku.canPurchase) {
    return { tone: 'muted', label: t(sku.stockKnown !== false && stock <= 0 ? 'commerce.variants.soldOut' : 'commerce.variants.notPurchasable') }
  }
  if (sku.stockKnown === false) return { tone: 'muted', label: t('commerce.variants.unknownStock') }
  if (stock <= 0) return { tone: 'muted', label: t('commerce.variants.soldOut') }
  if (stock <= Math.max(1, Number(sku.minOrderQty) || 1)) return { tone: 'warning', label: t('commerce.variants.lastOrder', { count: stock, unit }) }
  if (stock <= 100) return { tone: 'low', label: t('commerce.variants.stockQuantity', { count: stock, unit }) }
  return null
}

function setSkuQuantity(sku, value) {
  let quantity = Math.max(0, Number(value) || 0)
  if (quantity > 0) {
    quantity = Math.max(Number(sku.minOrderQty || 1), quantity)
    quantity = Math.min(Number(sku.stock || 0), quantity)
  }
  if ((quantities.value[sku.skuId] || 0) === quantity) return
  quantities.value = { ...quantities.value, [sku.skuId]: quantity }
  batchRequestId.value = ''
}

/** 商品统一价在页首展示，混价组展开时直接显示每个尺码的成交价。 */
function showGroupQuote(group) {
  if (!group.quote || !productPrice.value?.variable) return false
  return !group.quote.variable || (!isMatrix.value && isGroupCollapsed(group.key))
}

function isGroupCollapsed(key) {
  return Boolean(collapsedGroupKeys.value[key])
}

function toggleGroup(key) {
  collapsedGroupKeys.value = {
    ...collapsedGroupKeys.value,
    [key]: !collapsedGroupKeys.value[key],
  }
}

function clearAll() {
  if (matrixEdit.value) resetMatrixField(matrixEdit.value.sku.skuId)
  matrixEdit.value = null
  quantities.value = Object.fromEntries((product.value?.skus || []).map(sku => [sku.skuId, 0]))
  batchRequestId.value = ''
  batchFillNumber.value = ''
}

function quantityLabel(group, cell) {
  const label = t('commerce.variants.quantityFor', { color: group.name, size: cell.label })
  return cell.code ? label + ' · ' + cell.code : label
}

function labelMatrixField(field, label) {
  // #ifdef H5
  field?.$el?.querySelector?.('input')?.setAttribute('aria-label', label)
  // #endif
}

function beginMatrixEdit(sku) {
  if (matrixEdit.value?.sku.skuId === sku.skuId) return
  finishMatrixEdit()
  matrixEdit.value = { sku, value: String(quantities.value[sku.skuId] || '') }
}

function updateMatrixEdit(sku, event) {
  if (matrixEdit.value?.sku.skuId !== sku.skuId) return
  matrixEdit.value.value = String(event.detail?.value ?? event.target?.value ?? '')
}

/** UniApp 输入控件在绑定值未变化时需要重建，以丢弃无效的内部草稿。 */
function resetMatrixField(skuId) {
  matrixInputRevisions.value[skuId] = (matrixInputRevisions.value[skuId] || 0) + 1
}

/** 格内保留输入草稿，离开后校验，避免输入第一位时被起订量强行替换。 */
function finishMatrixEdit(sku = matrixEdit.value?.sku, event) {
  if (!sku || matrixEdit.value?.sku.skuId !== sku.skuId) return true
  const raw = String(event?.detail?.value ?? event?.target?.value ?? matrixEdit.value.value)
  const quantity = Number(raw)
  matrixEdit.value = null
  const min = Number(sku.minOrderQty || 1)
  const max = Number(sku.stock)
  if (Number.isSafeInteger(quantity) && (quantity === 0 || (quantity >= min && quantity <= max))) {
    if (raw !== String(quantity) && quantity === (quantities.value[sku.skuId] || 0)) resetMatrixField(sku.skuId)
    setSkuQuantity(sku, quantity)
    return true
  }
  resetMatrixField(sku.skuId)
  uni.showToast({ title: t('commerce.variants.quantityRange', { min, max, unit: product.value?.unit || '' }), icon: 'none' })
  return false
}

/** 预览填数范围，跳过无法满足起订量的规格并按库存封顶。 */
function makeFillPlan(skus, target) {
  const updates = []
  let overwriteCount = 0
  if (!Number.isSafeInteger(target) || target <= 0) return { updates, overwriteCount }
  for (const sku of skus) {
    if (!sku.canPurchase) continue
    const quantity = Math.min(target, Number(sku.stock || 0))
    if (!(quantity >= Number(sku.minOrderQty || 1))) continue
    const current = Number(quantities.value[sku.skuId]) || 0
    if (current === quantity) continue
    if (current > 0) overwriteCount++
    updates.push([sku.skuId, quantity])
  }
  return { updates, overwriteCount }
}

function applyFill({ updates }) {
  if (!updates.length) {
    uni.showToast({ title: t('commerce.variants.nothingToFill'), icon: 'none' })
    return
  }
  quantities.value = { ...quantities.value, ...Object.fromEntries(updates) }
  batchRequestId.value = ''
  uni.showToast({ title: t('commerce.variants.filled', { count: updates.length }), icon: 'success' })
}

function fillDescription(overwriteCount) {
  const rule = t('commerce.variants.bulkFillRule')
  return overwriteCount ? t('commerce.variants.bulkOverwrite', { count: overwriteCount }) + ' ' + rule : rule
}

async function applyBatchFill() {
  if (!finishMatrixEdit()) return
  const target = Number(batchFillNumber.value)
  if (!Number.isSafeInteger(target) || target <= 0) {
    uni.showToast({ title: t('commerce.variants.quantityInvalid'), icon: 'none' })
    return
  }
  const scope = fillScopes.value[fillScopeIndex.value]
  const scopedGroup = skuGroups.value.find(group => group.key === scope?.key)
  const plan = makeFillPlan(scopedGroup?.items ?? product.value?.skus ?? [], target)
  if (plan.overwriteCount && !await openAppDialog({
    title: scope?.key == null ? t('commerce.variants.bulkFillConfirm') : t('commerce.variants.editColorQuantity', { color: scope.name }),
    description: fillDescription(plan.overwriteCount),
    confirmText: t('commerce.variants.applyFill'),
  })) return
  applyFill(plan)
}

function createBatchRequestId() {
  return `cart-batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** 沿用原批量 SKU、数量与客户端请求标识，只本地化反馈。 */
async function submit() {
  if (!finishMatrixEdit() || !canSubmit.value) return
  if (!batchRequestId.value) batchRequestId.value = createBatchRequestId()
  try {
    const success = await batchAddSkuToCart(
      selectedLines.value.map(({ skuId, quantity }) => ({ skuId, quantity })),
      batchRequestId.value,
    )
    if (success) {
      uni.showToast({ title: t('commerce.variants.added'), icon: 'success' })
      setTimeout(goToCart, 500)
    }
  } catch (error) {
    uni.showToast({ title: error?.message || t('commerce.variants.addFailed'), icon: 'none' })
  }
}

async function goToCart() {
  await navigator.navigateTo(routes.commerce.cart())
}
/** 创建可重新取词的本地提示，不附加后端错误码。 */
function localError(messageKey) {
  return new AppError('', ErrorKind.UNKNOWN, { messageKey })
}

</script>

<style lang="scss" scoped>
.purchase-header :deep(.cart-count-badge) { transform: translate(25%, 25%); }
.batch-layout { display: flex; flex-direction: column; gap: 8px; padding: 8px 0 14px; }
.purchase-top, .sku-group-card, .no-specs { border: 1px solid var(--color-divider); border-radius: var(--radius-card, 14px); background: var(--surface-card); }
.purchase-top { padding: 10px 12px; }
.product-card { display: flex; align-items: center; gap: 12px; min-width: 0; }
.product-image { flex: 0 0 44px; width: 44px; height: 44px; border-radius: var(--radius-control, 10px); }
.product-info { flex: 1; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; gap: 2px 8px; }
.product-code { grid-row: 2; }
.price-row { grid-column: 2; grid-row: 1 / span 2; flex-wrap: wrap; justify-content: flex-end; }
.group-heading-text { min-width: 0; }
.product-name, .group-title { display: block; color: var(--color-text-primary); font-size: 15px; font-weight: 700; line-height: 1.4; overflow-wrap: anywhere; }
.product-code { display: block; color: var(--color-text-secondary); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.price-row, .group-quote { display: flex; align-items: baseline; gap: 4px; min-width: 0; }
.price-row { margin-top: 2px; }
.unit { white-space: nowrap; }
.price { color: var(--color-brand); font-size: 19px; font-weight: 700; }
.unit, .group-price-note { color: var(--color-text-secondary); font-size: 12px; }
.batch-fill-row { display: flex; align-items: center; gap: 8px; }
.batch-fill-input { flex: 1; min-width: 0; height: 44px; box-sizing: border-box; padding: 0 10px; border: 1px solid var(--color-border); border-radius: var(--radius-control, 10px); background: var(--surface-card); font-size: 14px; }
.batch-fill-input:focus-within { border-color: var(--color-brand); }
.batch-fill-btn, .clear-btn, .collapse-btn, .add-btn { display: flex; align-items: center; justify-content: center; flex: none; margin: 0; box-sizing: border-box; font-weight: 600; line-height: 1.2; }
.batch-fill-btn::after, .clear-btn::after, .collapse-btn::after, .add-btn::after { border: 0; }
.batch-fill-btn, .clear-btn { min-height: 44px; padding: 0 12px; border-radius: var(--radius-control, 10px); font-size: 13px; }
.batch-fill-btn { border: 1px solid var(--color-border); background: var(--surface-card); color: var(--color-text-primary); }
.clear-btn { border: 1px solid var(--color-divider); color: var(--color-text-secondary); background: var(--surface-muted); }
.spec-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 12px; padding: 4px 8px; background: var(--surface-card); border: 1px solid var(--color-divider); border-radius: var(--radius-control, 10px); }
.batch-fill-row { flex: 1 1 275px; }
.spec-view-row { display: flex; align-items: center; justify-content: space-between; flex: 1 1 220px; min-width: 0; gap: 4px; }
.spec-list-label { color: var(--color-text-primary); font-size: 13px; font-weight: 600; }
.spec-view-button:focus-visible, .matrix-quantity:focus-within, .sku-stepper:focus-within { outline: 2px solid var(--color-brand); outline-offset: -2px; }
.matrix-quantity { width: 100%; height: 34px; min-height: 0; box-sizing: border-box; padding: 0 4px; border: 1px solid var(--color-divider); border-radius: 6px; background: var(--surface-card); color: var(--color-text-secondary); text-align: center; font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.matrix-quantity :deep(input) { text-align: center; }
.fill-scope { flex: 0 1 104px; min-width: 0; margin: 0; padding: 0; background: transparent; text-align: left; line-height: 20px; }
.fill-scope::after { border: 0; }
.fill-scope-control { display: flex; height: 36px; min-width: 0; align-items: center; gap: 4px; padding: 0 8px; border: 1px solid var(--color-divider); border-radius: 6px; box-sizing: border-box; color: var(--color-text-primary); font-size: 13px; }
.fill-scope-text { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.fill-scope-icon { flex: none; transform: rotate(90deg); }
.has-quantity .matrix-quantity { background: var(--surface-muted); border-color: var(--color-border); color: var(--color-text-primary); }
.spec-swipe-hint { display: block; margin-top: 2px; color: var(--color-text-secondary); font-size: 12px; }
.spec-switch { display: flex; gap: 3px; padding: 3px; margin-left: auto; border: 1px solid var(--color-divider); border-radius: var(--radius-control, 10px); background: var(--surface-card); }
.spec-view-button { display: flex; align-items: center; justify-content: center; min-height: 44px; margin: 0; padding: 0 8px; border: 0; border-radius: var(--radius-small, 8px); background: transparent; color: var(--color-text-secondary); font-size: 13px; font-weight: 600; line-height: 1.2; }
.spec-view-button::after { border: 0; }
.spec-view-button.is-selected { background: var(--surface-muted); color: var(--color-text-primary); }
.spec-scroll { width: 100%; min-width: 0; box-sizing: border-box; }
.matrix-heading, .matrix-empty { display: none; }
.spec-sheet { display: flex; flex-direction: column; gap: 6px; }
.sku-group-card { overflow: hidden; }
.group-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-height: 42px; box-sizing: border-box; padding: 5px 10px; border-bottom: 1px solid var(--color-divider); background: var(--surface-subtle); }
.group-image { width: 29px; height: 29px; flex: 0 0 29px; border-radius: var(--radius-small, 8px); }
.group-heading-text { flex: 1 1 66px; }
.group-selected { display: block; margin-top: 1px; color: var(--color-brand-700); font-size: 11px; line-height: 1.35; }
.group-price { color: var(--color-text-primary); font-size: 14px; font-weight: 700; }
.group-actions { display: flex; align-items: center; gap: 3px; }
.collapse-btn { width: 44px; height: 44px; padding: 0; border: 0; border-radius: var(--radius-small, 8px); color: var(--color-text-secondary); background: transparent; }
.collapse-icon { transition: transform 160ms ease; }
.collapse-icon.expanded { transform: rotate(90deg); }
.group-size-list.is-collapsed { display: none; }
.sku-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; min-height: 48px; padding: 6px 10px 6px 12px; box-sizing: border-box; border-bottom: 1px solid var(--color-divider); }
.sku-row:last-child { border-bottom: 0; }
.sku-row.unavailable { background: var(--surface-subtle); }
.sku-row.has-quantity { background: var(--surface-subtle); }
.sku-copy { flex: 1; min-width: 0; }
.sku-title-row, .sku-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 6px; }
.sku-size { min-width: 25px; color: var(--color-text-primary); font-size: 14px; font-weight: 650; overflow-wrap: anywhere; }
.sku-price { color: var(--color-brand-700); font-size: 12px; font-weight: 700; }
.sku-list-price, .sku-meta { color: var(--color-text-secondary); font-size: 11px; }
.sku-meta { margin-top: 4px; line-height: 1.4; overflow-wrap: anywhere; }
.sku-list-price--strike :deep(.amount-text__value) { text-decoration: line-through; }
.sku-stock { max-width: 100%; box-sizing: border-box; padding: 2px 5px; border-radius: 4px; background: var(--surface-muted); color: var(--color-text-secondary); font-size: 11px; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
.sku-stock.low { padding: 0; color: var(--color-text-secondary); background: transparent; font-size: 12px; font-weight: 400; }
.sku-stock.warning { color: var(--warning-color); background: var(--warning-light); }
.sku-stepper { flex: none; box-sizing: border-box; border: 1px solid var(--color-border); border-radius: var(--radius-control, 10px); overflow: hidden; background: var(--surface-card); }
.sku-stepper :deep(.stepper-button) { border-radius: 0; }
.has-quantity .sku-stepper { border-color: var(--color-border); }
.validation-message, .no-specs { padding: 10px 12px; border-radius: var(--radius-small, 8px); font-size: 13px; line-height: 1.45; }
.validation-message { color: var(--danger-color); background: var(--color-brand-50); }
.no-specs { color: var(--color-text-secondary); text-align: center; }
.footer-stack { width: 100%; min-width: 0; }
.footer-stack .validation-message { margin-bottom: 6px; }
.footer-inner { display: flex; width: 100%; max-width: 1120px; align-items: center; justify-content: space-between; gap: 12px; margin: 0 auto; }
.footer-summary { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: flex-start; }
.footer-label { color: var(--color-text-secondary); font-size: 12px; line-height: 1.4; }
.footer-amount { color: var(--color-brand); font-size: 21px; font-weight: 700; }
.add-btn { min-height: 44px; padding: 0 20px; border: 0; border-radius: var(--radius-control, 10px); background: var(--color-brand); color: #fff; font-size: 14px; }
.add-btn[disabled], .clear-btn[disabled] { color: var(--color-text-disabled); background: var(--surface-muted); }
.batch-fill-btn:active, .clear-btn:active, .collapse-btn:active { background: var(--bg-pressed, #eceef2); }
.add-btn:active:not([disabled]) { background: var(--color-brand-600); }

@media screen and (min-width: 760px) {
  .batch-layout, .footer-stack { width: 100%; max-width: 760px; margin-inline: auto; box-sizing: border-box; }
  .matrix-layout { max-width: max(560px, calc(136px + var(--spec-columns) * 158px)); }
  .batch-layout { padding-top: 10px; }
  .purchase-top { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 10px 12px; }
  .batch-fill-row { flex: 0 1 350px; }
  .spec-view-row { flex: 1; }
  .product-card { width: 100%; }
  .spec-swipe-hint, .spec-list-label { display: none; }
}

.spec-scroll.is-matrix {
  --matrix-color-width: 136px;
  --matrix-cell-width: 108px;
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-card, 14px);
  background: var(--surface-card);
  .spec-sheet { min-width: calc(var(--matrix-color-width) + var(--spec-columns) * var(--matrix-cell-width)); gap: 0; }
  .matrix-heading, .sku-group-card { display: flex; align-items: stretch; }
  .matrix-heading { background: var(--surface-subtle); border-bottom: 1px solid var(--color-divider); }
  .sku-group-card { overflow: visible; border: 0; border-radius: 0; border-bottom: 1px solid var(--color-divider); }
  .sku-group-card:last-child { border-bottom: 0; }
  .matrix-label, .group-heading { position: sticky; left: 0; z-index: 1; flex: 0 0 var(--matrix-color-width); box-sizing: border-box; border-right: 1px solid var(--color-divider); background: var(--surface-subtle); }
  .matrix-label, .matrix-size { display: flex; align-items: center; justify-content: center; min-height: 36px; padding: 6px 8px; color: var(--color-text-primary); font-size: 13px; font-weight: 700; text-align: center; overflow-wrap: anywhere; }
  .matrix-sizes, .group-size-list, .group-size-list.is-collapsed { flex: 1; min-width: 0; display: grid; grid-template-columns: repeat(var(--spec-columns), minmax(var(--matrix-cell-width), 1fr)); }
  .matrix-size + .matrix-size, .group-size-list > * + * { border-left: 1px solid var(--color-divider); }
  .group-heading { flex-direction: column; flex-wrap: nowrap; align-items: flex-start; justify-content: center; gap: 3px; padding: 6px 10px; border-bottom: 0; }
  .group-heading-text { flex: none; }
  .group-title { font-size: 14px; }
  .group-image, .sku-size { display: none; }
  .group-actions .collapse-btn { display: none !important; }
  .sku-row, .matrix-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 68px; gap: 4px; padding: 6px 5px; border-bottom: 0; }
  .sku-row { justify-content: flex-end; padding-bottom: 8px; }
  .sku-row.unavailable { justify-content: center; }
  .sku-row.has-quantity { background: var(--surface-card); }
  .sku-copy { flex: none; width: 100%; text-align: center; }
  .sku-title-row, .sku-meta { justify-content: center; }
  .sku-title-row { flex-direction: column; gap: 2px; }
  .matrix-empty { color: var(--color-text-secondary); background: var(--surface-subtle); }
}

@media screen and (max-width: 759px) {
  .spec-view-button, .batch-fill-btn, .clear-btn { min-height: 34px; }
  .batch-fill-btn, .clear-btn { padding-inline: 8px; }
  .batch-fill-input { height: 36px; padding-inline: 8px; }
  .batch-fill-row { gap: 5px; }
  .fill-scope { flex: 0 0 100px; }
  .collapse-btn { width: 34px; height: 34px; }
  .spec-scroll.is-matrix .sku-row, .spec-scroll.is-matrix .matrix-empty { min-height: 54px; }
  .spec-scroll.is-matrix { --matrix-color-width: 82px; --matrix-cell-width: 78px; }
  .spec-scroll.is-matrix .sku-stock.low, .spec-scroll.is-matrix .sku-minimum { display: none; }
  .spec-scroll.is-matrix .group-heading { padding-inline: 8px; }
}

@media (prefers-reduced-motion: reduce) { .collapse-icon { transition: none; } }
</style>
