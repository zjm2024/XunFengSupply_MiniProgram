<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('commerce.titles.checkout')" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 24px">
        <AppPageState
          :state="pageState"
          :title="stateTitle"
          :description="stateDescription"
          :action-text="stateActionText"
          icon-type="order"
          @retry="handleStateAction"
        >
          <view class="checkout-page">
            <view v-if="hasPriceChanged" class="price-notice">
              <AppIcon name="info" :size="17" color="#B76500" />
              <text>{{ t('commerce.checkout.priceChanged') }}</text>
            </view>

            <view v-if="previewError" class="preview-notice">
              <AppIcon name="alert" :size="17" color="#B42318" />
              <text>{{ previewError }}</text>
              <button class="notice-action button-center" @click="refreshPreview()">{{ t('commerce.checkout.reprice') }}</button>
            </view>

            <view class="checkout-grid">
              <view class="checkout-main">
                <view class="section-card fulfillment-card">
                  <view class="section-heading">
                    <view class="heading-icon">
                      <AppIcon name="location" :size="20" />
                    </view>
                    <view class="heading-copy">
                      <text class="section-title">{{ t('commerce.checkout.receiver') }}</text>
                      <text class="section-subtitle">{{ t('commerce.checkout.receiverHint') }}</text>
                    </view>
                    <text v-if="selectedAddress?.isDefault" class="section-badge">{{ t('commerce.checkout.default') }}</text>
                  </view>

                  <button class="address-entry" :class="{ empty: !hasAddress }" @click="goToAddress()">
                    <template v-if="hasAddress">
                      <view class="contact-block">
                        <view class="contact-line">
                          <text class="contact-name">{{ receiverName }}</text>
                          <text v-if="receiverPhone" class="contact-phone">{{ receiverPhone }}</text>
                        </view>
                        <text class="contact-address">{{ receiverAddress }}</text>
                      </view>
                      <view class="address-action">
                        <text>{{ t('commerce.checkout.change') }}</text>
                        <AppIcon name="chevron-right" :size="17" color="#90939A" />
                      </view>
                    </template>
                    <template v-else>
                      <view class="empty-address-icon">
                        <AppIcon name="plus" :size="18" color="#D7192D" />
                      </view>
                      <view class="empty-address-copy">
                        <text class="empty-address-title">{{ t('commerce.checkout.addAddress') }}</text>
                        <text class="empty-address-desc">{{ t('commerce.checkout.addressHint') }}</text>
                      </view>
                      <AppIcon name="chevron-right" :size="18" color="#D7192D" />
                    </template>
                  </button>
                </view>

                <view class="section-card products-card">
                  <view class="section-heading product-heading">
                    <view class="heading-icon">
                      <AppIcon name="order" :size="20" />
                    </view>
                    <view class="heading-copy">
                      <text class="section-title">{{ t('commerce.checkout.products') }}</text>
                      <text class="section-subtitle">{{ t('commerce.checkout.listCount', { products: checkoutGroups.length, skus: displayItems.length, quantity: totalQuantity }) }}</text>
                    </view>
                    <view class="verified-label">
                      <AppIcon name="shield-check" :size="14" />
                      <text>{{ t('commerce.checkout.details') }}</text>
                    </view>
                  </view>

                  <view class="checkout-spu-list">
                    <view v-for="group in checkoutGroups" :key="group.key" class="checkout-spu-group">
                      <button class="checkout-spu-header" @tap="toggleCheckoutGroup(group.key)">
                        <view class="checkout-spu-copy">
                          <text class="checkout-spu-name">{{ group.name }}</text>
                          <text class="checkout-spu-meta">{{ t('commerce.checkout.groupCount', { count: group.skuCount, quantity: group.totalQuantity }) }}</text>
                        </view>
                        <AmountText class="checkout-spu-total" :text="'¥' + (formatMoney(group.totalAmount))" />
                        <AppIcon
                          name="chevron-right"
                          :size="17"
                          class="checkout-collapse-icon"
                          :class="{ expanded: !isCheckoutGroupCollapsed(group.key) }"
                        />
                      </button>

                      <view v-show="!isCheckoutGroupCollapsed(group.key)" class="product-list">
                        <view
                          v-for="item in group.items"
                          :key="item.lineKey || item.skuId"
                          class="product-row"
                          :class="{ 'has-stock-risk': item.stockInsufficient }"
                        >
                          <AppProductImage
                            class="product-image"
                            :src="item.image"
                            :stock="item.availableStock"
                            :fallback-icon-size="26"
                          />
                          <view class="product-info">
                            <view class="product-name-line">
                              <text class="product-name">{{ item.skuName || t('commerce.checkout.defaultVariant') }}</text>
                              <text v-if="item.isGift" class="gift-tag">{{ t('commerce.checkout.gift') }}</text>
                            </view>
                            <text class="product-spec">SKU：{{ item.code || item.skuId }}</text>
                            <view class="product-meta">
                              <AmountText :text="'¥' + (formatMoney(item.salePrice)) + ' / ' + (item.unit)" />
                              <AmountText v-if="item.strategyDiscount > 0" class="strategy-discount" :text="t('commerce.checkout.strategyAmount', { amount: formatMoney(item.strategyDiscount) })" />
                              <AmountText v-if="item.promotionDiscount > 0" class="promotion-discount" :text="t('commerce.checkout.promotionAmount', { amount: formatMoney(item.promotionDiscount) })" />
                              <text>× {{ item.quantity }}</text>
                            </view>
                            <text v-if="item.stockInsufficient" class="stock-risk">
                              {{ t('commerce.checkout.requiredStock', { stock: item.availableStock, quantity: item.quantity }) }}
                            </text>
                          </view>
                          <view class="product-amount">
                            <AmountText :text="'¥' + (formatMoney(item.totalAmount))" />
                            <AmountText v-if="getPriceDisplay(item).showListPrice" class="list-price" :class="{ 'list-price--strike': getPriceDisplay(item).strikeListPrice }" :text="' ¥' + formatMoney(item.listPrice * item.quantity)" />
                          </view>
                        </view>
                      </view>
                    </view>
                  </view>

                  <view v-if="!stockAvailable" class="stock-warning">
                    <AppIcon name="alert" :size="16" color="#B42318" />
                    <text>{{ stockWarningText }}</text>
                  </view>
                  <view v-if="requiresGiftOmissionConfirmation" class="gift-stock-warning">
                    <AppIcon name="gift" :size="16" color="#D7192D" />
                    <text>{{ t('commerce.checkout.giftWarning', { message: giftStockWarningText }) }}</text>
                  </view>
                </view>
              </view>

              <view class="checkout-side">
                <view class="section-card options-card">
                  <view class="compact-heading">
                    <text class="section-title">{{ t('commerce.checkout.delivery') }}</text>
                    <text v-if="previewing" class="refreshing-text">{{ t('commerce.checkout.repricing') }}</text>
                  </view>
                  <view class="delivery-fixed">
                    <view class="choice-icon active-icon">
                      <AppIcon name="truck" :size="19" />
                    </view>
                    <view class="choice-copy">
                      <text class="choice-title">{{ t('commerce.checkout.logistics') }}</text>
                      <text class="choice-desc">{{ t('commerce.checkout.logisticsHint') }}</text>
                    </view>
                    <text class="fixed-label">{{ t('commerce.checkout.default') }}</text>
                  </view>
                  <view v-if="expressCompanyOptions.length" class="carrier-selector">
                    <view class="carrier-selector-copy">
                      <text class="choice-title">{{ t('commerce.checkout.carrier') }}</text>
                      <text class="choice-desc">{{ t('commerce.checkout.carrierHint') }}</text>
                    </view>
                    <view class="carrier-picker-value" @tap="expressPickerVisible = true">
                      <text>{{ selectedExpressCompany?.name || t('commerce.checkout.select') }}</text>
                      <AppIcon name="chevron-right" :size="16" color="#90939A" />
                    </view>
                  </view>
                  <view v-if="carrierError" class="preview-notice carrier-notice">
                    <AppIcon name="alert" :size="17" color="#B42318" />
                    <text>{{ carrierError }}</text>
                  </view>
                </view>

                <view class="section-card detail-card">
                  <view class="setting-row">
                    <view class="setting-label">
                      <AppIcon name="invoice" :size="18" />
                      <text>{{ t('commerce.checkout.invoice') }}</text>
                    </view>
                    <text class="setting-value">{{ t('commerce.checkout.invoiceHint') }}</text>
                  </view>

                  <view class="remark-block">
                    <view class="remark-heading">
                      <view class="setting-label">
                        <AppIcon name="edit" :size="18" />
                        <text>{{ t('commerce.checkout.remark') }}</text>
                      </view>
                      <text class="remark-count">{{ customerRemark.length }}/200</text>
                    </view>
                    <textarea
                      v-model="customerRemark"
                      class="remark-input"
                      maxlength="200"
                      :placeholder="t('commerce.checkout.remarkPlaceholder')"
                      placeholder-class="remark-placeholder"
                      :disabled="submitting"
                    />
                  </view>
                </view>

                <view class="section-card summary-card">
                  <view class="compact-heading">
                    <text class="section-title">{{ t('commerce.checkout.summary') }}</text>
                    <text class="verified-text">{{ t('commerce.checkout.verify') }}</text>
                  </view>

                  <view class="amount-list">
                    <view class="amount-row">
                      <text>{{ t('commerce.checkout.goodsAmount') }}</text>
                      <AmountText :text="'¥' + (formatMoney(goodsAmount))" />
                    </view>
                    <view v-if="discountAmount > 0" class="amount-row discount">
                      <text>{{ t('commerce.checkout.discount') }}</text>
                      <AmountText :text="'-¥' + (formatMoney(discountAmount))" />
                    </view>
                    <view class="amount-row">
                      <text>{{ t('commerce.checkout.freight') }}</text>
                      <AmountText :text="(freightAmount > 0 ? ('¥' + formatMoney(freightAmount)) : t('commerce.checkout.freeShipping'))" />
                    </view>
                  </view>

                  <view class="payable-row">
                    <view>
                      <text class="payable-label">{{ t('commerce.checkout.payable') }}</text>
                      <text class="payable-quantity">{{ t('commerce.checkout.totalQuantity', { count: totalQuantity }) }}</text>
                    </view>
                    <view class="payable-price">
                      <AmountText class="payable-amount" :text="'¥' + (formatMoney(payableAmount))" />
                    </view>
                  </view>

                  <view class="agreement-row" @click="agreed = !agreed">
                    <view class="agreement-check" :class="{ checked: agreed }">
                      <AppIcon v-if="agreed" name="check" :size="14" color="#FFFFFF" />
                    </view>
                    <text>{{ t('commerce.checkout.agreement') }}</text>
                  </view>
                  <text v-if="submitDisabledReason" class="submit-hint">{{ submitDisabledReason }}</text>

                  <view class="secure-tip">
                    <AppIcon name="shield-check" :size="15" color="#168A52" />
                    <text>{{ t('commerce.checkout.progressHint') }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </AppPageState>
      </AppContent>
    </template>

    <template #footer>
      <FixedActionBar v-if="pageState === PageStatus.CONTENT">
        <view class="checkout-footer">
          <view class="footer-summary">
            <text class="footer-count">{{ t('commerce.checkout.totalQuantity', { count: totalQuantity }) }}</text>
            <view class="footer-price">
              <text class="footer-label">{{ t('commerce.checkout.due') }}</text>
              <AmountText class="footer-amount" :text="'¥' + (formatMoney(payableAmount))" />
            </view>
          </view>
          <button
            class="submit-btn button-center"
            :class="{ 'is-disabled': !canSubmit }"
            :disabled="!canSubmit"
            @click="prepareSubmit"
          >
            {{ submitButtonText }}
          </button>
        </view>
      </FixedActionBar>
    </template>
  </AppPageShell>

  <ConfirmPopup
    v-model="confirmModalVisible"
    :title="t('commerce.checkout.confirmTitle')"
    :description="confirmDescription"
    :preview-text="confirmPreviewText"
    :confirm-text="t('commerce.checkout.confirm')"
    :confirm-disabled="submitting"
    :close-on-overlay="!submitting"
    @confirm="confirmSubmit"
  />
  <ExpressCompanyPicker
    v-model:visible="expressPickerVisible"
    v-model="expressCompanyCode"
    :options="expressCompanyOptions"
    @confirm="handleExpressCompanyConfirm"
  />
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/commerce/i18n/register.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { getPriceDisplay } from '@/shared/utils/priceDisplay.js'
import { AppError, ErrorKind } from '@/shared/api/appError.js'
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createOrder, generateClientRequestId, getExpressCompanies, previewOrder } from '../../api/checkoutApi.js'
import { getAddressList } from '../../../account/api/addressApi.js'
import { useCart } from '@/shared/composables/useCart.js'
import { PAYMENT_MODE, DELIVERY_TYPE } from '@/app/config/constant.js'
import { PageStatus } from '@/shared/model/pageState.js'
import { useUserStore } from '@/shared/session/userStore.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'
import ExpressCompanyPicker from '../../components/ExpressCompanyPicker/ExpressCompanyPicker.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { groupItemsBySpu } from '../../model/cartGrouping.js'
const userStore = useUserStore()
const { cartStore, loadCart, flush } = useCart()

const pageState = ref(PageStatus.LOADING)
const pageFailure = ref(null)
const errorMessage = computed(() => pageFailure.value?.message || '')
const checkoutItems = ref([])
const previewData = ref(null)
const previewing = ref(false)
const previewFailure = ref(null)
const previewError = computed(() => previewFailure.value?.message || '')
const deliveryType = ref(DELIVERY_TYPE.DELIVERY)
const selectedAddress = ref(null)
const expressCompanies = ref([])
const expressCompanyCode = ref('')
const expressPickerVisible = ref(false)
const carrierFailure = ref(null)
const carrierError = computed(() => carrierFailure.value?.message || '')
const customerRemark = ref('')
const agreed = ref(false)
const confirmModalVisible = ref(false)
const submitting = ref(false)
const omitUnavailableGifts = ref(false)
const clientRequestId = ref('')
const collapsedCheckoutGroupKeys = ref({})
let previewSequence = 0

const hasAddress = computed(() => Number(selectedAddress.value?.id) > 0)
const receiverName = computed(() => selectedAddress.value?.name || '')
const receiverPhone = computed(() => selectedAddress.value?.phone || '')
const receiverAddress = computed(() => selectedAddress.value?.fullAddress || '')
const addressId = computed(() => hasAddress.value ? Number(selectedAddress.value.id) : null)
const expressCompanyOptions = computed(() => expressCompanies.value)
const selectedExpressCompany = computed(() => expressCompanyOptions.value.find(item => item.code === expressCompanyCode.value) || null)


const localAmount = computed(() => checkoutItems.value.reduce(
  (sum, item) => sum + number(item.price) * number(item.quantity),
  0,
))

const displayItems = computed(() => {
  if (previewData.value?.items?.length) return previewData.value.items
  return checkoutItems.value.map(item => ({
    ...item,
    name: item.name || '商品',
    basePrice: number(item.basePrice ?? item.price),
    salePrice: number(item.price),
    listPrice: number(item.listPrice),
    priceSource: item.priceSource || 'BASE',
    strategyDiscount: number(item.strategyDiscount),
    totalAmount: number(item.price) * number(item.quantity),
    availableStock: number(item.stock, Number.MAX_SAFE_INTEGER),
    stockInsufficient: number(item.stock, Number.MAX_SAFE_INTEGER) < number(item.quantity),
  }))
})
const checkoutGroups = computed(() => groupItemsBySpu(displayItems.value))

const totalQuantity = computed(() => displayItems.value.reduce(
  (sum, item) => sum + number(item.quantity),
  0,
))
const goodsAmount = computed(() => number(previewData.value?.goodsAmount, localAmount.value))
const discountAmount = computed(() => number(previewData.value?.discountAmount))
const freightAmount = computed(() => number(previewData.value?.freightAmount))
const payableAmount = computed(() => number(
  previewData.value?.payableAmount,
  goodsAmount.value - discountAmount.value + freightAmount.value,
))
const stockAvailable = computed(() => previewData.value?.stockAvailable !== false)
const insufficientSkus = computed(() => previewData.value?.insufficientSkus || [])
const stockWarningText = computed(() => insufficientSkus.value.length
  ? t('commerce.checkout.insufficientSkus', { skus: insufficientSkus.value.join('、') })
  : t('commerce.checkout.stockFallback'),
)
const giftStockAvailable = computed(() => previewData.value?.giftStockAvailable !== false)
const insufficientGiftSkus = computed(() => previewData.value?.insufficientGiftSkus || [])
const requiresGiftOmissionConfirmation = computed(() => (
  previewData.value?.requiresGiftOmissionConfirmation === true || !giftStockAvailable.value
))
const giftStockWarningText = computed(() => insufficientGiftSkus.value.length
  ? t('commerce.checkout.insufficientGifts', { skus: insufficientGiftSkus.value.join('、') })
  : t('commerce.checkout.giftStockFallback'),
)
const hasPriceChanged = computed(() =>
  Boolean(previewData.value) && Math.abs(localAmount.value - goodsAmount.value) >= 0.01,
)

const submitDisabledReason = computed(() => {
  if (!userStore.canOrder) return t('commerce.checkout.accountBlocked')
  if (!hasAddress.value) return t('commerce.checkout.addressRequired')
  if (deliveryType.value === DELIVERY_TYPE.DELIVERY && !expressCompanyCode.value) return carrierError.value || t('commerce.checkout.carrierRequired')
  if (!stockAvailable.value) return t('commerce.checkout.stockBlocked')
  if (!agreed.value) return t('commerce.checkout.agreementRequired')
  if (previewError.value) return t('commerce.checkout.quoteRetry')
  return ''
})
const canSubmit = computed(() =>
  checkoutItems.value.length > 0
  && Boolean(previewData.value)
  && userStore.canOrder
  && hasAddress.value
  && (deliveryType.value !== DELIVERY_TYPE.DELIVERY || Boolean(expressCompanyCode.value))
  && stockAvailable.value
  && !previewError.value
  && agreed.value
  && !previewing.value
  && !submitting.value,
)
const submitButtonText = computed(() => {
  if (submitting.value) return t('commerce.checkout.submitting')
  if (previewing.value) return t('commerce.checkout.quoting')
  return t('commerce.checkout.submit')
})

const stateTitle = computed(() => {
  if (pageState.value === PageStatus.EMPTY) return t('commerce.checkout.empty')
  if (pageState.value === PageStatus.ERROR) return t('commerce.checkout.loadFailedTitle')
  return ''
})
const stateDescription = computed(() => {
  if (pageState.value === PageStatus.EMPTY) return t('commerce.checkout.emptyHint')
  return errorMessage.value || t('commerce.checkout.network')
})
const stateActionText = computed(() =>
  pageState.value === PageStatus.EMPTY ? t('commerce.checkout.backCart') : t('commerce.checkout.reload'),
)
const confirmDescription = computed(() => {
  const giftText = omitUnavailableGifts.value ? t('commerce.checkout.omitSuffix') : ''
  return t('commerce.checkout.confirmDescription', { count: totalQuantity.value, giftText })
})
const confirmPreviewText = computed(() => t('commerce.checkout.confirmAmount', { amount: formatMoney(payableAmount.value) }))

onLoad(() => {
  loadCheckoutData()
})

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}


function valueOf(source, camelKey, pascalKey, fallback = undefined) {
  return source?.[camelKey] ?? source?.[pascalKey] ?? fallback
}

function formatMoney(value) {
  return number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function toggleCheckoutGroup(groupKey) {
  const collapsed = isCheckoutGroupCollapsed(groupKey)
  collapsedCheckoutGroupKeys.value = {
    ...collapsedCheckoutGroupKeys.value,
    [groupKey]: !collapsed,
  }
}

function isCheckoutGroupCollapsed(groupKey) {
  // 商品清单默认折叠，只有用户主动点击后才展开。
  if (!Object.prototype.hasOwnProperty.call(collapsedCheckoutGroupKeys.value, groupKey)) return true
  return Boolean(collapsedCheckoutGroupKeys.value[groupKey])
}

function buildOrderItems() {
  return checkoutItems.value
    .map(item => ({
      SkuId: number(item.skuId),
      Quantity: Math.max(1, number(item.quantity, 1)),
    }))
    .filter(item => item.SkuId > 0)
}

function normalizePreview(raw = {}) {
  const sourceItems = valueOf(raw, 'items', 'Items', [])
  const cartItemMap = new Map(checkoutItems.value.map(item => [String(item.skuId), item]))
  const items = (Array.isArray(sourceItems) ? sourceItems : []).map(source => {
    const skuId = number(valueOf(source, 'skuId', 'SkuId'))
    const cartItem = cartItemMap.get(String(skuId)) || {}
    const basePrice = number(valueOf(source, 'basePrice', 'BasePrice'), number(cartItem.basePrice || cartItem.price))
    const salePrice = number(valueOf(source, 'salePrice', 'SalePrice'), number(cartItem.price))
    const listPrice = number(valueOf(source, 'listPrice', 'ListPrice'), salePrice)
    const priceSource = valueOf(source, 'priceSource', 'PriceSource', cartItem.priceSource || 'BASE')
    const quantity = Math.max(1, number(valueOf(source, 'quantity', 'Quantity'), cartItem.quantity || 1))
    const strategyDiscount = Math.round(getPriceDisplay({ listPrice, salePrice, priceSource }).strategyDiscount * quantity * 100) / 100
    const promotionDiscount = number(valueOf(source, 'promotionDiscountAmount', 'PromotionDiscountAmount'), 0)
    const availableStock = number(
      valueOf(source, 'availableStock', 'AvailableStock'),
      number(cartItem.stock, Number.MAX_SAFE_INTEGER),
    )
    const isGift = Boolean(valueOf(source, 'isGift', 'IsGift', cartItem.isGift || false))
    const isStockSufficient = valueOf(source, 'isStockSufficient', 'IsStockSufficient', availableStock >= quantity) !== false
    return {
      cartItemId: cartItem.cartItemId,
      productId: number(valueOf(source, 'productId', 'ProductId'), cartItem.productId),
      skuId,
      name: cartItem.name || valueOf(source, 'productName', 'ProductName') || valueOf(source, 'skuName', 'SkuName') || '商品',
      skuName: cartItem.skuName || valueOf(source, 'skuName', 'SkuName') || '',
      code: cartItem.code || '',
      image: valueOf(source, 'imageUrl', 'ImageUrl') || cartItem.image,
      unit: cartItem.unit || '件',
      basePrice,
      salePrice,
      listPrice,
      priceSource,
      strategyDiscount,
      promotionDiscount,
      quantity,
      totalAmount: number(valueOf(source, 'totalAmount', 'TotalAmount'), Math.max(0, salePrice * quantity - promotionDiscount)),
      promotionSnapshot: valueOf(source, 'promotionSnapshot', 'PromotionSnapshot', null),
      availableStock,
      stockInsufficient: isGift ? !isStockSufficient : availableStock < quantity,
      isGift,
      promotionName: valueOf(source, 'promotionName', 'PromotionName', ''),
      lineKey: `${valueOf(source, 'isGift', 'IsGift', false) ? 'gift' : 'goods'}:${skuId}`,
    }
  })

  return {
    items,
    goodsAmount: number(valueOf(raw, 'goodsAmount', 'GoodsAmount')),
    discountAmount: number(valueOf(raw, 'discountAmount', 'DiscountAmount')),
    freightAmount: number(valueOf(raw, 'freightAmount', 'FreightAmount')),
    payableAmount: number(valueOf(raw, 'payableAmount', 'PayableAmount')),
    quoteFingerprint: valueOf(raw, 'quoteFingerprint', 'QuoteFingerprint', null),
    stockAvailable: valueOf(raw, 'stockAvailable', 'StockAvailable', true) !== false,
    insufficientSkus: valueOf(raw, 'insufficientSkus', 'InsufficientSkus', []) || [],
    giftStockAvailable: valueOf(raw, 'giftStockAvailable', 'GiftStockAvailable', true) !== false,
    insufficientGiftSkus: valueOf(raw, 'insufficientGiftSkus', 'InsufficientGiftSkus', []) || [],
    requiresGiftOmissionConfirmation: valueOf(raw, 'requiresGiftOmissionConfirmation', 'RequiresGiftOmissionConfirmation', false) === true,
  }
}

function normalizeExpressCompany(source = {}) {
  return {
    code: String(valueOf(source, 'code', 'Code', '') || ''),
    name: String(valueOf(source, 'name', 'Name', '') || valueOf(source, 'code', 'Code', '') || ''),
  }
}

/** 沿用原承运商规范化和默认选择，只保留可重新取词的读取错误。 */
async function loadExpressCompanies() {
  carrierFailure.value = null
  try {
    const raw = await getExpressCompanies()
    expressCompanies.value = (Array.isArray(raw) ? raw : []).map(normalizeExpressCompany).filter(item => item.code)
    if (!expressCompanies.value.length) {
      expressCompanyCode.value = ''
      carrierFailure.value = localError('commerce.checkout.carrierEmpty')
      return
    }
    if (!expressCompanies.value.some(item => item.code === expressCompanyCode.value)) {
      expressCompanyCode.value = expressCompanies.value[0].code
    }
  } catch (error) {
    expressCompanies.value = []
    expressCompanyCode.value = ''
    carrierFailure.value = error?.message ? error : localError('commerce.checkout.carrierFailed')
  }
}

async function handleExpressCompanyConfirm() {
  await refreshPreview()
}

/** 沿用原购物车、地址、承运商和预览流程，不因语言变化重载。 */
async function loadCheckoutData() {
  pageState.value = PageStatus.LOADING
  pageFailure.value = null
  previewFailure.value = null
  previewData.value = null
  clientRequestId.value = ''

  try {
    await flush()
    await loadCart({ silent: true })
    const selected = cartStore.selectedItems
    if (selected.length === 0) {
      checkoutItems.value = []
      pageState.value = PageStatus.EMPTY
      return
    }
    if (cartStore.summary.isOverLimit) {
      throw localError('commerce.checkout.overLimit')
    }

    checkoutItems.value = selected.map(item => ({ ...item }))
    await loadDefaultAddress()
    await loadExpressCompanies()
    if (deliveryType.value === DELIVERY_TYPE.DELIVERY && !expressCompanyCode.value) throw copyDisplayError(carrierFailure.value, 'commerce.checkout.loadFailed')
    const result = await refreshPreview({ silent: true })
    if (!result) throw copyDisplayError(previewFailure.value, 'commerce.checkout.quoteFailed')
    pageState.value = PageStatus.CONTENT
  } catch (error) {
    pageFailure.value = error?.message ? error : localError('commerce.checkout.loadFailed')
    pageState.value = PageStatus.ERROR
  }
}

/** 沿用原预览参数、序列保护和旧预览回退，只本地化错误。 */
async function refreshPreview({ silent = false } = {}) {
  if (checkoutItems.value.length === 0 || previewing.value) return null
  const requestId = ++previewSequence
  const previousPreview = previewData.value
  previewing.value = true
  previewFailure.value = null

  try {
    const raw = await previewOrder({
      Items: buildOrderItems(),
      AddressId: addressId.value,
      DeliveryType: deliveryType.value,
      ExpressCompanyCode: expressCompanyCode.value || null,
    })
    if (requestId !== previewSequence) return null
    const normalized = normalizePreview(raw)
    if (normalized.items.length === 0) throw localError('commerce.checkout.quoteEmpty')
    previewData.value = normalized
    omitUnavailableGifts.value = false
    return normalized
  } catch (error) {
    if (requestId === previewSequence) {
      previewData.value = previousPreview
      previewFailure.value = error?.message ? error : localError('commerce.checkout.quoteFailedRetry')
      if (!silent) uni.showToast({ title: previewError.value, icon: 'none' })
    }
    return null
  } finally {
    if (requestId === previewSequence) previewing.value = false
  }
}

async function loadDefaultAddress() {
  const list = await getAddressList()
  const currentId = Number(selectedAddress.value?.id) || 0
  selectedAddress.value = list.find(item => item.id === currentId)
    || list.find(item => item.isDefault)
    || list[0]
    || null
}

function goToAddress() {
  navigator.navigateTo(routes.account.address({ selectMode: true }), {
    events: {
      addressSelected: async (address) => {
        selectedAddress.value = address || null
        await refreshPreview()
      },
    },
  })
}

async function prepareSubmit() {
  if (!canSubmit.value) return
  const result = await refreshPreview()
  if (!result || !result.stockAvailable) return
  if (result.requiresGiftOmissionConfirmation || result.giftStockAvailable === false) {
    const confirmed = await confirmGiftOmission(giftStockWarningText.value)
    if (!confirmed) return
    omitUnavailableGifts.value = true
  }
  if (!canSubmit.value) return
  confirmModalVisible.value = true
}

/** 提交结算快照，由服务端在订单事务内校验并清理共享购物车。 */
async function confirmSubmit() {
  if (submitting.value || !canSubmit.value) return
  confirmModalVisible.value = false
  submitting.value = true
  if (!clientRequestId.value) clientRequestId.value = generateClientRequestId()

  const orderedCartIds = checkoutItems.value
    .map(item => number(item.cartItemId))
    .filter(Boolean)
  let createdOrders = []

  try {
    const response = await createOrder({
      ClientRequestId: clientRequestId.value,
      CartItemIds: orderedCartIds,
      Items: buildOrderItems(),
      AddressId: addressId.value,
      QuoteFingerprint: previewData.value?.quoteFingerprint || null,
      // 创建阶段不选择支付方式；收银台确认支付时才写入最终支付模式。
      PaymentMode: PAYMENT_MODE.CASH,
      DeliveryType: deliveryType.value,
      ExpressCompanyCode: expressCompanyCode.value || null,
      CustomerRemark: customerRemark.value.trim() || null,
      OmitUnavailableGifts: omitUnavailableGifts.value,
    })
    const orderId = valueOf(response, 'orderId', 'OrderId')
    if (!orderId) throw localError('commerce.checkout.missingCreatedId')

    const responseOrders = valueOf(response, 'orders', 'Orders', [])
    createdOrders = (Array.isArray(responseOrders) && responseOrders.length ? responseOrders : [response])
      .map(order => ({
        orderId: number(valueOf(order, 'orderId', 'OrderId')),
        payableAmount: number(valueOf(order, 'payableAmount', 'PayableAmount')),
      }))
      .filter(order => order.orderId > 0)

    // 服务端已原子消费本次购物车快照，本地仅同步显示结果。
    cartStore.optimisticRemove(orderedCartIds)

    navigator.redirectTo(routes.order.pay(orderId))
  } catch (error) {
    if (createdOrders.length) {
      uni.showToast({ title: t('commerce.checkout.createdUnpaid'), icon: 'none', duration: 2600 })
      setTimeout(() => navigator.redirectTo(routes.order.list({ status: 20 })), 900)
      return
    }
    if (error?.errorCode === 'ORDER_GIFT_STOCK_INSUFFICIENT' && !omitUnavailableGifts.value) {
      submitting.value = false
      const confirmed = await confirmGiftOmission(error?.message || t('commerce.checkout.giftInsufficient'))
      if (confirmed) {
        omitUnavailableGifts.value = true
        await confirmSubmit()
      }
      return
    }
    uni.showToast({ title: error?.message || t('commerce.checkout.submitFailed'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}

/** 显示赠品放弃确认，只有用户确认才沿用原下单分支。 */
function confirmGiftOmission(message) {
  return openAppDialog({
      title: t('commerce.checkout.giftTitle'),
      description: t('commerce.checkout.omitQuestion', { message }),
      confirmText: t('commerce.checkout.omitGift'),
      cancelText: t('commerce.checkout.doNotOrder'),
      danger: true,
    })
}

function handleStateAction() {
  if (pageState.value === PageStatus.EMPTY) {
    navigator.back()
    return
  }
  loadCheckoutData()
}
/** 创建可重新取词的本地提示，不附加后端错误码。 */
function localError(messageKey) {
  return new AppError('', ErrorKind.UNKNOWN, { messageKey })
}

/** 保留原包装错误只含显示消息的语义，不复制后端 errorCode。 */
function copyDisplayError(source, fallbackKey) {
  return new AppError(source?.message || t(fallbackKey), ErrorKind.UNKNOWN, {
    messageKey: source?.messageKey || (!source?.message ? fallbackKey : undefined),
  })
}

</script>

<style lang="scss" scoped>
@use '@/shared/styles/variable.scss' as *;

.checkout-page {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding-bottom: 4px;
  box-sizing: border-box;
}

.checkout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.checkout-main,
.checkout-side {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.section-card {
  overflow: hidden;
  border-radius: 16px;
  background: var(--glass-card-background, rgba(255,255,255,.74));
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

.product-name-line { display: flex; align-items: center; gap: 7px; }
.gift-tag { flex: 0 0 auto; padding: 2px 6px; border-radius: 7px; color: #B22131; background: #FFF0F2; font-size: 10px; line-height: 15px; }

.section-heading {
  display: flex;
  min-height: 64px;
  align-items: center;
  gap: 11px;
  padding: 14px 16px;
  box-sizing: border-box;
}

.heading-icon {
  display: flex;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #50657A;
  background: #EEF2F5;
}

.heading-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.section-title {
  color: var(--color-text-primary, #111216);
  font-size: var(--type-card-title-size, 16px);
  font-weight: 650;
  line-height: 22px;
}

.section-subtitle,
.refreshing-text {
  color: var(--color-text-secondary, #676A73);
  font-size: var(--type-caption-size, 12px);
  line-height: 17px;
}

.section-badge {
  padding: 4px 9px;
  border-radius: 12px;
  color: #4C6072;
  background: #EEF2F5;
  font-size: 11px;
  line-height: 16px;
}

.address-entry {
  display: flex;
  width: calc(100% - 32px);
  min-height: 78px;
  align-items: center;
  gap: 12px;
  margin: 0 16px 16px;
  padding: 13px 14px;
  border: 0;
  border-radius: 13px;
  color: var(--color-text-primary, #111216);
  background: var(--surface-subtle, #F8F9FA);
  text-align: left;
  box-sizing: border-box;

  &::after {
    border: 0;
  }

  &.empty {
    background: #F6F8FA;
  }
}

.address-entry .contact-block {
  min-width: 0;
  flex: 1;
  margin: 0;
}

.address-action {
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
  color: var(--color-text-secondary, #676A73);
  font-size: 12px;
}

.empty-address-icon {
  display: flex;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #EAF0F4;
}

.empty-address-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.empty-address-title {
  color: #34495B;
  font-size: 14px;
  font-weight: 650;
}

.empty-address-desc {
  color: #6C7680;
  font-size: 11px;
}

.contact-block {
  margin: 0 16px 16px 65px;
}

.contact-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.contact-name {
  color: var(--color-text-primary, #111216);
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
}

.contact-phone {
  color: var(--color-text-secondary, #676A73);
  font-size: 14px;
}

.contact-address {
  display: block;
  margin-top: 6px;
  color: var(--color-text-secondary, #676A73);
  font-size: 13px;
  line-height: 20px;
}

.profile-warning,
.stock-warning,
.gift-stock-warning,
.price-notice,
.preview-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #8A4B00;
  background: #FFF8ED;
  font-size: 12px;
  line-height: 18px;
}

.gift-stock-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 14px 14px;
  padding: 10px 12px;
  border: 1px solid rgba(215, 25, 45, 0.2);
  border-radius: 10px;
  color: #7E252E;
  background: #FFFFFF;
  font-size: 12px;
  line-height: 18px;
}

.profile-warning {
  margin: 0 16px 16px;
  padding: 10px 12px;
  border-radius: 10px;
}

.price-notice,
.preview-notice {
  margin-bottom: 12px;
  padding: 11px 13px;
  border-radius: 12px;
}

.preview-notice {
  color: #8A1C15;
  background: #FFF3F2;
}

.price-notice > text,
.preview-notice > text {
  min-width: 0;
  flex: 1;
}

.notice-action {
  flex: none;
  margin: -6px -7px -6px 0;
  padding: 6px 8px;
  border: 0;
  color: var(--color-brand, #D7192D);
  background: transparent;
  font-size: 12px;
  line-height: 18px;

  &::after {
    border: 0;
  }
}

.verified-label,
.verified-text {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
  color: #168A52;
  font-size: 11px;
}

.verified-text {
  color: var(--color-text-tertiary, #94969C);
}

.checkout-spu-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 14px;
}

.checkout-spu-group {
  overflow: hidden;
  border-radius: 13px;
  background: var(--surface-subtle, #F8F9FA);
}

.checkout-spu-header {
  display: grid;
  width: 100%;
  min-height: 62px;
  grid-template-columns: minmax(0, 1fr) minmax(0, .7fr) 28px;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 10px 12px;
  border: 0;
  border-radius: 0;
  color: var(--color-text-primary, #111216);
  background: var(--surface-subtle, #F8F9FA);
  text-align: left;
  box-sizing: border-box;
}

.checkout-spu-header::after {
  border: 0;
}

.checkout-spu-copy {
  min-width: 0;
}

.checkout-spu-name {
  display: block;
  overflow: hidden;
  font-size: var(--type-body-size, 14px);
  font-weight: 650;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.checkout-spu-meta {
  display: block;
  margin-top: 3px;
  color: var(--color-text-tertiary, #94969C);
  font-size: 11px;
  line-height: 16px;
}

.checkout-spu-total {
  color: var(--color-text-primary, #111216);
  font-size: 13px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.checkout-collapse-icon {
  color: var(--color-text-secondary, #676A73);
  transition: transform 180ms ease;
}

.checkout-collapse-icon.expanded {
  transform: rotate(90deg);
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.product-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) minmax(0, .65fr);
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 11px;
  background: var(--surface-card, #FFFFFF);
}

.product-image {
  width: 72px;
  height: 72px;
  border-radius: 10px;
}

.product-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.product-name {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-primary, #111216);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.product-spec {
  overflow: hidden;
  margin-top: 4px;
  color: var(--color-text-secondary, #676A73);
  font-size: 12px;
  line-height: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 7px;
  color: var(--color-text-secondary, #676A73);
  font-size: 12px;
}

.strategy-discount { display: block; color: #c45656; font-size: 11px; margin-top: 2px; } .promotion-discount { display: block; color: #d96b24; font-size: 11px; margin-top: 2px; }
.product-amount {
  display: flex;
  align-self: stretch;
  align-items: flex-end;
  justify-content: center;
  flex-direction: column;
  color: var(--color-text-primary, #111216);
  font-size: 14px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.list-price {
  margin-top: 5px;
  color: var(--color-text-tertiary, #94969C);
  font-size: 11px;
  font-weight: 400;
}
.list-price--strike :deep(.amount-text__value) { text-decoration: line-through; }

.stock-risk {
  margin-top: 5px;
  color: #B42318;
  font-size: 11px;
  line-height: 16px;
}

.stock-warning {
  margin: 0 16px 16px;
  padding: 10px 12px;
  border-radius: 10px;
  color: #8A1C15;
  background: #FFF3F2;
}

.compact-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 16px 12px;
}

.options-card {
  padding-bottom: 14px;
}

.carrier-selector {
  display: flex;
  min-height: 68px;
  align-items: center;
  gap: 12px;
  margin: 10px 14px 0;
  padding: 11px 12px;
  border: 1px solid var(--color-border, #E4E6EB);
  border-radius: 12px;
  background: #FFF;
  box-sizing: border-box;

  &:active {
    background: var(--surface-subtle, #F7F8FA);
  }
}

.carrier-selector-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.carrier-picker-value {
  display: flex;
  max-width: 46%;
  flex: none;
  align-items: center;
  gap: 4px;
  color: var(--color-text-primary, #111216);
  font-size: 13px;
  font-weight: 600;
}

.carrier-picker-value text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delivery-fixed {
  display: flex;
  min-height: 62px;
  align-items: center;
  gap: 10px;
  margin: 0 14px;
  padding: 10px 12px;
  border: 1px solid #DDE3E8;
  border-radius: 12px;
  background: #F7F9FA;
  box-sizing: border-box;
}

.active-icon {
  color: #50657A;
  background: #EAF0F4;
}

.fixed-label {
  flex: none;
  padding: 3px 8px;
  border-radius: 999px;
  color: #4C6072;
  background: #E9EEF2;
  font-size: 10px;
  font-weight: 600;
}

.choice-icon {
  display: flex;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--color-text-secondary, #676A73);
  background: var(--surface-subtle, #F7F8FA);
}

.choice-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.choice-title {
  color: inherit;
  font-size: var(--type-body-size, 14px);
  font-weight: 600;
  line-height: 20px;
}

.choice-desc {
  overflow: hidden;
  color: var(--color-text-secondary, #676A73);
  font-size: 11px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-card {
  padding: 0 16px 16px;
}

.setting-row,
.remark-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.setting-row {
  min-height: 52px;
  border-bottom: 1px solid var(--color-divider, #F0F1F3);
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--color-text-primary, #111216);
  font-size: 14px;
  font-weight: 550;
}

.setting-value,
.remark-count {
  color: var(--color-text-secondary, #676A73);
  font-size: 12px;
}

.remark-block {
  padding-top: 15px;
}

.remark-input {
  width: 100%;
  height: 86px;
  margin-top: 12px;
  padding: 11px 12px;
  border: 1px solid var(--color-border, #E4E6EB);
  border-radius: 11px;
  color: var(--color-text-primary, #111216);
  background: var(--surface-subtle, #F7F8FA);
  font-size: 13px;
  line-height: 20px;
  box-sizing: border-box;
}

.summary-card {
  padding: 0 16px 16px;
}

.summary-card .compact-heading {
  padding-right: 0;
  padding-left: 0;
}

.amount-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 2px 0 15px;
  border-bottom: 1px solid var(--color-divider, #F0F1F3);
}

.amount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text-secondary, #676A73);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.amount-row.discount {
  color: var(--color-brand, #D7192D);
}

.payable-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
}

.payable-label {
  display: block;
  color: var(--color-text-primary, #111216);
  font-size: 14px;
  font-weight: 650;
}

.payable-quantity {
  display: block;
  margin-top: 3px;
  color: var(--color-text-tertiary, #94969C);
  font-size: 11px;
}

.payable-price {
  color: var(--color-brand, #D7192D);
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 30px;
}

.currency {
  margin-right: 2px;
  font-size: 14px;
}

.agreement-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary, #676A73);
  font-size: 12px;
  line-height: 18px;
}

.agreement-check {
  display: flex;
  width: 19px;
  height: 19px;
  flex: 0 0 19px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border-strong, #D2D4D9);
  border-radius: 6px;
  background: #FFFFFF;
  box-sizing: border-box;
}

.agreement-check.checked {
  border-color: var(--color-brand, #D7192D);
  background: var(--color-brand, #D7192D);
}

.submit-hint {
  display: block;
  margin: 8px 0 0 27px;
  color: #B76500;
  font-size: 11px;
  line-height: 16px;
}

.secure-tip {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 14px;
  padding: 10px 11px;
  border-radius: 10px;
  color: #3E6854;
  background: #F1F8F4;
  font-size: 11px;
  line-height: 17px;
}

.checkout-footer {
  display: flex;
  width: 100%;
  max-width: 1120px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.footer-summary {
  min-width: 0;
}

.footer-count {
  display: block;
  color: var(--color-text-secondary, #676A73);
  font-size: 11px;
  line-height: 15px;
}

.footer-price {
  display: flex;
  align-items: baseline;
  margin-top: 2px;
  color: var(--color-brand, #D7192D);
  font-variant-numeric: tabular-nums;
}

.footer-label {
  margin-right: 5px;
  color: var(--color-text-primary, #111216);
  font-size: 12px;
}

.footer-currency {
  font-size: 13px;
  font-weight: 650;
}

.footer-amount {
  font-size: 21px;
  font-weight: 700;
}

.submit-btn {
  width: 136px;
  height: 46px;
  flex: 0 0 136px;
  margin: 0;
  padding: 0 18px;
  border: 0;
  border-radius: 12px;
  color: #FFFFFF;
  background: var(--color-brand, #D7192D);
  font-size: var(--type-label-size, 15px);
  font-weight: 650;
  line-height: var(--type-button-line-height, 20px);

  &::after {
    border: 0;
  }

  &.is-disabled {
    color: var(--color-text-disabled, #B2B4BA);
    background: var(--surface-subtle, #F1F2F4);
  }
}

@media (min-width: 800px) {
  .checkout-grid {
    grid-template-columns: minmax(0, 1.48fr) minmax(320px, 0.82fr);
    align-items: start;
    gap: 16px;
  }

  .checkout-spu-list {
    padding: 14px 16px 16px;
  }

  .checkout-main,
  .checkout-side {
    gap: 16px;
  }

  .section-card {
    border-radius: 18px;
  }

  .product-row {
    grid-template-columns: 84px minmax(0, 1fr) minmax(0, .65fr);
  }

  .product-image {
    width: 84px;
    height: 84px;
  }

  .checkout-footer {
    padding: 0 4px;
  }

  .submit-btn {
    width: 176px;
    flex-basis: 176px;
  }
}

@media (max-width: 420px) {
  .section-heading {
    padding-right: 13px;
    padding-left: 13px;
  }

  .contact-block {
    margin-right: 13px;
    margin-left: 62px;
  }

  .product-list {
    padding: 0 13px;
  }

  .product-row {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 10px;
  }

  .product-image {
    width: 64px;
    height: 64px;
  }

  .strategy-discount { display: block; color: #c45656; font-size: 11px; margin-top: 2px; }
.product-amount {
    grid-column: 2;
    align-items: flex-start;
    margin-top: -4px;
  }

  .submit-btn {
    width: 124px;
    flex-basis: 124px;
  }
}

/* 金额按实际可用宽度缩字，父布局允许收缩。 */
.summary-card, .amount-row, .product-amount, .payable-price, .footer-summary, .footer-price { min-width: 0; }
.payable-price { max-width: 65%; }
.payable-amount { font-size: inherit; }
.payable-row, .amount-row { gap: 10px; }
.amount-row > text, .footer-label { flex: none; }
.product-meta .amount-text { font-size: inherit; }
</style>
