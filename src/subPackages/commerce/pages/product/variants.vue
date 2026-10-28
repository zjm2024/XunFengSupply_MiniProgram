<template>
  <AppPageShell>
    <template #header>
      <app-header
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
          <view v-if="product" class="batch-layout">
            <view class="product-card">
              <AppProductImage class="product-image" :src="product.image" :stock="product.stock" />
              <view class="product-info">
                <text class="product-name">{{ product.name }}</text>
                <text class="product-code">{{ t('commerce.variants.article', { code: product.code || '-' }) }}</text>
                <view class="price-row">
                  <AmountText class="price" :text="(priceText)" />
                  <text class="unit">/ {{ product.unit }}</text>
                </view>
              </view>
            </view>

            <view class="batch-toolbar">
              <view>
                <text class="card-title">{{ t('commerce.variants.fillTitle') }}</text>
                <text class="card-desc">{{ t('commerce.variants.fillHint') }}</text>
              </view>
              <view class="batch-fill-row">
                <input
                  v-model="batchFillNumber"
                  type="number"
                  class="batch-fill-input"
                  :placeholder="t('commerce.variants.quantityPlaceholder')"
                />
                <button class="batch-fill-btn button-center" @click="applyBatchFill">{{ t('commerce.variants.fill') }}</button>
                <button class="clear-btn button-center" :disabled="selectedLines.length === 0" @click="clearAll">{{ t('commerce.variants.clear') }}</button>
              </view>
            </view>

            <view v-for="group in skuGroups" :key="group.key" class="sku-group-card">
              <view class="group-heading" @tap="toggleGroup(group.key)">
                <view class="group-heading-copy">
                  <AppProductImage class="group-image" :src="group.image" />
                  <view class="group-heading-text">
                  <text class="group-title">{{ group.name }}</text>
                  <text class="group-desc">
                    {{ t('commerce.variants.sizeCount', { count: group.items.length }) }}<text v-if="group.selectedCount">{{ t('commerce.variants.groupSelected', { count: group.selectedCount, quantity: group.selectedQuantity, unit: product.unit }) }}</text>
                  </text>
                  </view>
                </view>
                <view class="group-actions">
                  <button class="copy-btn button-center" @tap.stop="copyGroup(group)">{{ t('commerce.variants.copy') }}</button>
                  <button
                    class="collapse-btn button-center"
                    :aria-label="isGroupCollapsed(group.key) ? t('commerce.variants.expand') : t('commerce.variants.collapse')"
                    @tap.stop="toggleGroup(group.key)"
                  >
                    <AppIcon
                      name="chevron-right"
                      :size="17"
                      class="collapse-icon"
                      :class="{ expanded: !isGroupCollapsed(group.key) }"
                    />
                  </button>
                </view>
              </view>

              <view v-show="!isGroupCollapsed(group.key)" class="group-size-list">
                <view
                  v-for="sku in group.items"
                  :key="sku.skuId"
                  class="sku-row"
                  :class="{ unavailable: !sku.canPurchase }"
                >
                  <view class="sku-copy">
                    <view class="sku-title-row">
                      <text class="sku-size">{{ sku.sizeName || sku.specName || t('commerce.variants.defaultSize') }}</text>
                      <text class="sku-stock" :class="{ empty: !sku.canPurchase }">
                        {{ sku.canPurchase ? formatStock(sku.stock) : '缺货' }}
                      </text>
                    </view>
                    <text class="sku-code">SKU：{{ sku.skuCode || '-' }}</text>
                    <view class="sku-price-row">
                      <AmountText class="sku-price" :text="'¥' + (formatMoney(sku.price))" />
                      <AmountText v-if="getPriceDisplay(sku).showListPrice" class="sku-list-price" :class="{ 'sku-list-price--strike': getPriceDisplay(sku).strikeListPrice }" :text="'¥' + formatMoney(getPriceDisplay(sku).listPrice)" />
                      <text class="sku-moq">{{ t('commerce.variants.minimum', { count: sku.minOrderQty, unit: product.unit }) }}</text>
                    </view>
                  </view>
                  <quantity-stepper
                    :model-value="quantities[sku.skuId] || 0"
                    :min="sku.minOrderQty"
                    :max="sku.stock"
                    :step="1"
                    :disabled="!sku.canPurchase"
                    :allow-input="true"
                    :allow-zero="true"
                    size="sm"
                    @update:model-value="setSkuQuantity(sku, $event)"
                  />
                </view>
              </view>
            </view>

            <view v-if="validationMessage" class="validation-message">{{ validationMessage }}</view>
          </view>
        </app-page-state>
      </AppContent>
    </template>

    <template #footer>
      <fixed-action-bar v-if="pageState === PageStatus.CONTENT">
        <view class="footer-inner">
          <view class="footer-summary">
            <text class="footer-label">{{ t('commerce.variants.selected', { count: selectedLines.length, quantity: totalQuantity, unit: product?.unit || '件' }) }}</text>
            <AmountText class="footer-amount" :text="'¥' + (formatMoney(totalAmount))" />
          </view>
          <button class="add-btn button-center" :disabled="!canSubmit || submitting" @click="submit">
            {{ submitting ? t('commerce.variants.submitting') : t('commerce.variants.add') }}
          </button>
        </view>
      </fixed-action-bar>
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
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getGoodsDetail } from '../../api/productApi.js'
import { useCart } from '@/shared/composables/useCart.js'
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

const productId = ref(0)
const product = ref(null)
const quantities = ref({})
const batchRequestId = ref('')
const batchFillNumber = ref('')
const collapsedGroupKeys = ref({})
const pageState = ref(PageStatus.LOADING)
const pageFailure = ref(localError('commerce.variants.network'))
const errorMessage = computed(() => pageFailure.value?.message || '')
const { cartStore, submitting, loadCart, batchAddSkuToCart } = useCart()

const skuGroups = computed(() => {
  const groups = new Map()
  for (const sku of product.value?.skus || []) {
    const key = String(sku.colorId || sku.colorName || 'default')
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: sku.colorName || t('commerce.variants.defaultColor'),
        items: [],
        image: '',
      })
    }
    const group = groups.get(key)
    group.items.push(sku)
    // 同一颜色下取第一张可用 SKU 图片作为颜色组缩略图。
    if (!group.image && sku.image) group.image = sku.image
    const quantity = Number(quantities.value[sku.skuId]) || 0
    if (quantity > 0) {
      group.selectedCount = (group.selectedCount || 0) + 1
      group.selectedQuantity = (group.selectedQuantity || 0) + quantity
    }
  }
  return Array.from(groups.values())
})

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

const priceText = computed(() => {
  const prices = (product.value?.skus || [])
    .filter(sku => sku.canPurchase)
    .map(sku => Number(sku.price || 0))
    .filter(price => Number.isFinite(price) && price >= 0)
  if (!prices.length) return t('commerce.variants.noQuote')
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max
    ? `¥${formatMoney(min)}`
    : `¥${formatMoney(min)} - ¥${formatMoney(max)}`
})

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
    collapsedGroupKeys.value = Object.fromEntries(skuGroups.value.map((group, index) => [group.key, index > 0]))
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

function formatStock(value) {
  const stock = Math.max(0, Number(value) || 0)
  return stock > 100 ? '有货' : `库存 ${stock} ${product.value?.unit || '件'}`
}

function setSkuQuantity(sku, value) {
  let quantity = Math.max(0, Number(value) || 0)
  if (quantity > 0) {
    quantity = Math.max(Number(sku.minOrderQty || 1), quantity)
    quantity = Math.min(Number(sku.stock || 0), quantity)
  }
  quantities.value = { ...quantities.value, [sku.skuId]: quantity }
  batchRequestId.value = ''
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
  quantities.value = Object.fromEntries((product.value?.skus || []).map(sku => [sku.skuId, 0]))
  batchRequestId.value = ''
  batchFillNumber.value = ''
}

/** 一键批量填数：输入数量应用到所有可采购 SKU，超出库存的取最高库存 */
function applyBatchFill() {
  const raw = Number(batchFillNumber.value)
  if (!Number.isFinite(raw) || raw <= 0) {
    uni.showToast({ title: t('commerce.variants.quantityInvalid'), icon: 'none' })
    return
  }
  const target = Math.floor(raw)
  const skus = product.value?.skus || []
  const next = { ...quantities.value }
  let filledCount = 0
  skus.forEach(sku => {
    if (!sku.canPurchase) return
    const maxStock = Number(sku.stock || 0)
    const minQty = Number(sku.minOrderQty || 1)
    // 超出库存时取最高库存，但不低于起订量
    const value = maxStock <= 0 ? 0 : Math.min(target, Math.max(maxStock, minQty))
    if (value >= minQty) {
      next[sku.skuId] = value
      filledCount++
    }
  })
  quantities.value = next
  batchRequestId.value = ''
  if (filledCount > 0) {
    uni.showToast({ title: t('commerce.variants.filled', { count: filledCount }), icon: 'success' })
  } else {
    uni.showToast({ title: t('commerce.variants.nothingToFill'), icon: 'none' })
  }
}

/** 沿用原颜色组数量复制规则，只本地化不可采购提示。 */
function copyGroup(group) {
  const available = group.items.filter(sku => sku.canPurchase)
  if (!available.length) {
    uni.showToast({ title: t('commerce.variants.noColorSku'), icon: 'none' })
    return
  }
  const sourceLine = available.find(sku => Number(quantities.value[sku.skuId]) > 0)
  const sourceQuantity = sourceLine ? Number(quantities.value[sourceLine.skuId]) : 0
  const next = { ...quantities.value }
  available.forEach(sku => {
    const target = sourceQuantity > 0 ? sourceQuantity : Number(sku.minOrderQty || 1)
    next[sku.skuId] = Math.min(Number(sku.stock || 0), Math.max(Number(sku.minOrderQty || 1), target))
  })
  quantities.value = next
  batchRequestId.value = ''
}

function createBatchRequestId() {
  return `cart-batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** 沿用原批量 SKU、数量与客户端请求标识，只本地化反馈。 */
async function submit() {
  if (!canSubmit.value) return
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
.batch-layout { display: flex; flex-direction: column; gap: 12px; padding: 12px 0 24px; }
.product-card, .batch-toolbar, .sku-group-card { background: var(--glass-card-background, rgba(255,255,255,.74)); border-radius: var(--radius-card); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.product-card { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: 14px; padding: 14px; }
.product-image { width: 88px; height: 88px; border-radius: 10px; background: var(--surface-muted); }
.product-info { min-width: 0; }
.product-name { display: block; color: var(--color-text-primary); font-size: 16px; font-weight: 700; line-height: 1.45; }
.product-code { display: block; margin-top: 5px; color: var(--color-text-tertiary); font-size: 12px; }
.price-row { display: flex; align-items: baseline; margin-top: 10px; }
.price { color: var(--color-brand); font-size: 20px; font-weight: 700; }
.unit { margin-left: 4px; color: var(--color-text-secondary); font-size: 12px; }

.batch-toolbar { display: flex; flex-direction: column; gap: 10px; padding: 15px 16px; }
.batch-fill-row { display: flex; align-items: center; gap: 8px; }
.batch-fill-input { flex: 1; height: 34px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 17px; font-size: 13px; background: var(--surface-card); }
.batch-fill-input:focus { border-color: var(--color-brand); }
.batch-fill-btn { flex-shrink: 0; height: 34px; padding: 0 14px; border: 0; border-radius: 17px; color: #fff; background: var(--color-brand); font-size: var(--type-caption-size, 12px); font-weight: 600; }
.card-title, .group-title { display: block; color: var(--color-text-primary); font-size: 15px; font-weight: 700; }
.card-desc, .group-desc { display: block; margin-top: 4px; color: var(--color-text-tertiary); font-size: 12px; line-height: 1.5; }
.clear-btn, .copy-btn { flex-shrink: 0; height: 34px; padding: 0 13px; border: 1px solid var(--color-border); border-radius: 17px; color: var(--color-text-secondary); background: #FFFFFF; font-size: var(--type-caption-size, 12px); line-height: var(--type-button-line-height, 20px); }
.clear-btn[disabled] { color: var(--color-text-disabled); background: var(--surface-muted); }

.sku-group-card { overflow: hidden; }
.group-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--color-divider); }
.group-heading-copy { display: flex; min-width: 0; align-items: center; gap: 10px; }
.group-heading-text { min-width: 0; }
.group-image { width: 48px; height: 48px; flex: 0 0 48px; border-radius: 9px; background: var(--surface-muted); }
.group-actions { display: flex; flex: none; align-items: center; gap: 7px; }
.collapse-btn { display: flex; width: 34px; height: 34px; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: 50%; color: var(--color-text-secondary); background: var(--surface-muted); }
.collapse-btn::after, .copy-btn::after, .clear-btn::after { border: 0; }
.collapse-icon { transition: transform 180ms ease; }
.collapse-icon.expanded { transform: rotate(90deg); }
.group-size-list { overflow: hidden; }
.sku-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 96px; padding: 13px 14px; border-bottom: 1px solid var(--color-divider); box-sizing: border-box; }
.sku-row:last-child { border-bottom: 0; }
.sku-row.unavailable { opacity: 0.5; background: var(--surface-muted); }
.sku-copy { flex: 1; min-width: 0; }
.sku-title-row, .sku-price-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.sku-size { color: var(--color-text-primary); font-size: 14px; font-weight: 650; }
.sku-stock { color: var(--success-color, #168A52); font-size: 11px; }
.sku-stock.empty { color: var(--danger-color, #B42318); }
.sku-code { display: block; margin-top: 5px; overflow: hidden; color: var(--color-text-tertiary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.sku-price-row { margin-top: 7px; }
.sku-price { color: var(--color-brand); font-size: 15px; font-weight: 700; }
.sku-list-price { max-width: 100%; color: var(--color-text-secondary); font-size: 12px; }
.sku-list-price--strike :deep(.amount-text__value) { text-decoration: line-through; }
.sku-moq { color: var(--color-text-secondary); font-size: 11px; }
.validation-message { padding: 11px 14px; border-radius: 9px; color: var(--danger-color, #B42318); background: #FFF1F1; font-size: 12px; line-height: 1.5; }

.footer-inner { display: flex; width: 100%; max-width: 1120px; align-items: center; justify-content: space-between; gap: 16px; margin: 0 auto; }
.footer-summary { display: flex; min-width: 0; flex: 1; align-items: flex-start; justify-content: center; flex-direction: column; }
.footer-label { overflow: hidden; color: var(--color-text-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.footer-amount { color: var(--color-brand); font-size: var(--type-money-size, 18px); font-weight: 700; }
.add-btn { display: flex; min-width: 136px; height: 44px; flex: 0 0 auto; align-items: center; justify-content: center; margin: 0; padding: 0 22px; color: #FFFFFF; background: var(--color-brand); border: 0; border-radius: var(--radius-control); font-size: 14px; font-weight: 650; line-height: 1; text-align: center; box-sizing: border-box; }
.add-btn::after { border: 0; }
.add-btn[disabled] { color: var(--color-text-disabled); background: var(--surface-muted); }

@media screen and (min-width: 760px) {
  .batch-layout { max-width: 860px; margin: 0 auto; padding-top: 20px; }
  .product-card { grid-template-columns: 112px minmax(0, 1fr); padding: 18px; }
  .product-image { width: 112px; height: 112px; }
  .sku-row { min-height: 104px; padding: 16px 20px; }
}

/* 金额按实际可用宽度缩字，父布局允许收缩。 */
.product-info, .price-row, .sku-copy, .sku-price-row, .footer-summary { min-width: 0; }
.price-row { display: flex; align-items: baseline; }
.unit { flex: none; }
.sku-row { min-width: 0; }
.sku-copy { flex: 1; }
</style>
