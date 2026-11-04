<template>
  <AppPageShell>
    <template #header>
      <app-header
        :title="t('commerce.titles.productDetail')"
        :show-back="true"
        :show-cart="true"
        :cart-count="cartStore.cartBadgeCount"
        @cart="goToCart"
      />
    </template>

    <template #content>
      <AppContent padding="0" :no-max-width="true">
        <app-page-state
          :state="pageState"
          :title="t('commerce.product.loadFailedTitle')"
          :description="errorMessage"
          :action-text="t('commerce.product.reload')"
          icon-type="product"
          @retry="loadProduct"
        >
          <view v-if="product" class="detail-layout">
            <!-- 商品主图 -->
            <view class="media-card">
              <swiper
                class="image-swiper"
                :indicator-dots="displayImages.length > 1"
                :current="currentImage"
                :circular="displayImages.length > 1"
                @change="onSwiperChange"
              >
                <swiper-item v-for="(image, idx) in displayImages" :key="idx">
                  <view class="main-image-wrap" @click="previewImage(idx)">
                    <AppProductImage class="main-image" :src="image" :stock="detailImageStock" />
                  </view>
                </swiper-item>
              </swiper>
              <text v-if="displayImages.length" class="image-counter" @click="previewImage(currentImage)">
                {{ currentImage + 1 }} / {{ displayImages.length }}
              </text>
            </view>

            <view class="detail-main">
              <!-- 基础信息、价格 -->
              <view class="info-card">
                <text class="product-name">{{ product.name }}</text>
                <text class="product-code">
                  {{ t('commerce.product.article', { code: product.code || '-' }) }}
                  <template v-if="product.erpSku">　ERP：{{ product.erpSku }}</template>
                </text>
                <view class="price-row">
                  <AmountText class="price" :text="'¥' + (formatMoney(selectedSkuPrice))" />
                  <AmountText v-if="selectedPriceDisplay.showListPrice" class="list-price" :class="{ 'list-price--strike': selectedPriceDisplay.strikeListPrice }" :text="' ¥' + (formatMoney(selectedPriceDisplay.listPrice))" />
                  <text class="price-unit">/ {{ product.unit }}</text>
                </view>
                <button v-if="selectedSku" class="price-variant" @tap="openPurchaseSheet">
                  <text>{{ t('commerce.product.currentVariant', { name: selectedSku.specName || selectedSku.skuCode || t('commerce.product.defaultVariant') }) }}</text>
                  <AppIcon name="chevron-right" :size="14" />
                </button>
                <view class="facts">
                  <text>{{ t('commerce.product.minimum', { count: selectedMinOrderQty, unit: product.unit }) }}</text>
                  <text class="fact-dot">·</text>
                  <status-tag :type="stockStatus.type" :text="stockStatus.text" />
                  <template v-if="product.categoryName">
                    <text class="fact-dot">·</text>
                    <text>{{ product.categoryName }}</text>
                  </template>
                </view>
              </view>

              <view v-if="product.promotions?.length" class="promotion-card">
                <view class="promotion-heading">
                  <view class="promotion-title-row">
                    <AppIcon name="gift" :size="20" color="#D7192D" />
                    <text class="promotion-title">{{ t('commerce.product.promotions') }}</text>
                  </view>
                  <text class="promotion-count">{{ t('commerce.product.promotionsCount', { count: product.promotions.length }) }}</text>
                </view>
                <view
                  v-for="promotion in product.promotions"
                  :key="promotion.promotionId"
                  class="promotion-item"
                >
                  <view class="promotion-item-heading">
                    <text class="promotion-name">{{ promotion.name }}</text>
                    <text v-if="promotion.isStackable" class="promotion-stackable">{{ t('commerce.product.stackable') }}</text>
                  </view>
                  <view v-for="rule in promotion.rules" :key="rule.ruleId" class="promotion-rule">
                    <view class="promotion-rule-line">
                      <text class="promotion-badge">{{ promotionRuleBadge(rule.ruleType) }}</text>
                      <text class="promotion-description">{{ rule.description }}</text>
                    </view>
                    <view v-if="rule.gifts.length" class="promotion-gifts">
                      <view v-for="gift in rule.gifts" :key="gift.giftId || gift.skuId" class="promotion-gift">
                        <AppProductImage class="promotion-gift-image" :src="gift.image" :stock="gift.availableStock" />
                        <view class="promotion-gift-copy">
                          <text class="promotion-gift-name">{{ gift.productName }}</text>
                          <text class="promotion-gift-spec">{{ gift.specDesc || gift.skuCode }} · {{ t('commerce.product.giftCount', { count: gift.quantity }) }}</text>
                        </view>
                        <text
                          class="promotion-gift-stock"
                          :class="{ warning: !gift.isStockSufficient }"
                        >{{ giftStockText(gift) }}</text>
                      </view>
                    </view>
                  </view>
                  <text class="promotion-time">{{ t('commerce.product.expires', { date: formatDate(promotion.endTime, 'YYYY.MM.DD') }) }}</text>
                </view>
                <text class="promotion-notice">{{ t('commerce.product.promotionHint') }}</text>
              </view>

              <view v-if="sizeRecommendationHtml" class="size-recommendation-card">
                <view class="section-title">{{ t('commerce.product.sizeRecommendation') }}</view>
                <rich-text class="size-recommendation-rich-text" :nodes="sizeRecommendationHtml" />
              </view>

              <view
                class="batch-purchase-entry"
                :class="{ disabled: !hasPurchasableSku }"
                @click="goToBatchPurchase"
              >
                <view class="batch-entry-copy">
                  <text class="batch-entry-title">{{ t('commerce.product.batch') }}</text>
                  <text class="batch-entry-desc">{{ t('commerce.product.batchHint') }}</text>
                </view>
                <text class="batch-entry-arrow">›</text>
              </view>

              <view class="single-purchase-entry" :class="{ disabled: !hasPurchasableSku }" @click="openPurchaseSheet">
                <view>
                  <text class="section-title">{{ t('commerce.product.single') }}</text>
                  <text class="section-desc">{{ selectedSkuSummary }}</text>
                </view>
                <view class="entry-action">
                  <text>{{ hasPurchasableSku ? t('commerce.product.select') : '暂无库存' }}</text>
                  <AppIcon name="chevron-right" :size="16" />
                </view>
              </view>

              <!-- 商品参数 -->
              <view class="section-card">
                <text class="section-title">{{ t('commerce.product.parameters') }}</text>
                <view class="params-list">
                  <view v-for="row in productParams" :key="row.label" class="param-row">
                    <text class="param-label">{{ row.label }}</text>
                    <text class="param-value">{{ row.value }}</text>
                  </view>
                </view>
              </view>

              <!-- 后台商品介绍支持富文本和详情图片 -->
              <view class="detail-description">
                <view class="detail-description-heading">
                  <view class="heading-line"></view>
                  <text class="detail-description-title">{{ t('commerce.product.description') }}</text>
                  <view class="heading-line"></view>
                </view>
                <rich-text v-if="detailHtml" class="detail-rich-text" :nodes="detailHtml" />
                <view v-else class="detail-empty">
                  <text>{{ t('commerce.product.emptyDescription') }}</text>
                </view>
              </view>
            </view>
          </view>
        </app-page-state>
      </AppContent>
      <AppImageViewer
        v-model="imageViewerVisible"
        :images="displayImages"
        :initial-index="imageViewerStartIndex"
      />
      <SingleSkuPurchaseSheet
        v-model:visible="purchaseSheetVisible"
        :product="product"
        :initial-sku-id="selectedSku?.skuId"
        :submitting="submitting"
        @confirm="submitAddToCart"
        @batch="goToBatchPurchase"
      />
    </template>

    <template #footer>
      <fixed-action-bar v-if="pageState === PageStatus.CONTENT">
        <button class="cart-entry" @click="goToCart">
          <view class="cart-icon-wrap">
            <AppIcon name="cart" :size="24" />
            <text v-if="cartStore.cartBadgeCount" class="cart-badge">{{ cartStore.cartBadgeDisplay }}</text>
          </view>
          <text>{{ t('commerce.product.cart') }}</text>
        </button>
        <button
          class="action-btn secondary button-center"
          :disabled="!hasPurchasableSku || submitting"
          @click="handleAddToCart"
        >
          {{ submitting ? t('commerce.product.adding') : t('commerce.product.add') }}
        </button>
        <button
          class="action-btn primary button-center"
          :disabled="!hasPurchasableSku || submitting"
          @click="goToBatchPurchase"
        >{{ t('commerce.product.batch') }}</button>
      </fixed-action-bar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { normalizeDetailHtml } from '@/shared/utils/productRichText.js'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/commerce/i18n/register.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { getPriceDisplay } from '@/shared/utils/priceDisplay.js'
import { AppError, ErrorKind } from '@/shared/api/appError.js'
import { computed, ref } from 'vue'
import { onBackPress, onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
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
import statusTag from '../../../../shared/ui/StatusTag/StatusTag.vue'
import AppProductImage from '../../../../shared/ui/AppProductImage/AppProductImage.vue'
import AppImageViewer from '../../../../shared/ui/AppImageViewer/AppImageViewer.vue'
import SingleSkuPurchaseSheet from '../../components/SingleSkuPurchaseSheet/SingleSkuPurchaseSheet.vue'
import AppIcon from '../../../../shared/ui/AppIcon/AppIcon.vue'
import { formatDate } from '../../../../shared/utils/format.js'

const productId = ref(0)
const product = ref(null)
const currentImage = ref(0)
const imageViewerVisible = ref(false)
const imageViewerStartIndex = ref(0)
const pageState = ref(PageStatus.LOADING)
const pageFailure = ref(localError('commerce.product.network'))
const errorMessage = computed(() => pageFailure.value?.message || '')
const submitting = ref(false)
const selectedSkuId = ref(null)
const purchaseSheetVisible = ref(false)

const { cartStore, loadCart, addSkuToCart, flush } = useCart()

const routeProductId = () => productId.value

// ==================== 当前选中 SKU ====================
const selectedSku = computed(() => {
  if (!product.value?.skus?.length) return null
  return product.value.skus.find(sku => String(sku.skuId) === String(selectedSkuId.value)) || null
})

const selectedSkuPrice = computed(() => Number(selectedSku.value?.price ?? product.value?.price ?? 0))
const selectedPriceDisplay = computed(() => getPriceDisplay(selectedSku.value || {}))
const selectedMinOrderQty = computed(() => Math.max(1, Number(selectedSku.value?.minOrderQty || product.value?.moq || 1)))
const hasPurchasableSku = computed(() => Boolean(product.value?.skus?.some(sku => sku.canPurchase)))
const detailImageStock = computed(() => {
  if (selectedSku.value?.stockKnown) return selectedSku.value.stock
  if (product.value?.stockKnown) return product.value.stock
  return undefined
})
const selectedSkuSummary = computed(() => {
  if (!hasPurchasableSku.value) return t('commerce.product.noPurchasable')
  if (!selectedSku.value) return t('commerce.product.chooseQuantity')
  return t('commerce.product.selectedSummary', { name: selectedSku.value.specName || selectedSku.value.skuCode || t('commerce.product.defaultVariant'), count: selectedMinOrderQty.value, unit: product.value?.unit || '件' })
})

// 商品介绍和尺码推荐表分开清洗，避免推荐表被合并到普通介绍中。
const detailHtml = computed(() => normalizeDetailHtml(product.value?.description))
const sizeRecommendationHtml = computed(() => normalizeDetailHtml(product.value?.sizeRecommendation))

// 选中具体 SKU 后优先展示 SKU 颜色图片，未选择时回退到 SPU 主图。
const displayImages = computed(() => {
  const main = selectedSku.value?.image || product.value?.image
  return main ? [main, ...(product.value?.images?.filter(img => img !== main) || [])] : product.value?.images || []
})

const stockStatus = computed(() => {
  if (!hasPurchasableSku.value) return { type: 'error', text: '暂无库存' }
  if (!selectedSku.value) return { type: 'info', text: '请选择规格' }
  if (!selectedSku.value.canPurchase) return { type: 'error', text: selectedSku.value.invalidReason || '暂不可购买' }
  if (!selectedSku.value.stockKnown) return { type: 'success', text: '可采购' }
  const stock = Number(selectedSku.value.stock) || 0
  if (stock <= 100) return { type: 'warning', text: `库存 ${stock} ${product.value.unit}` }
  return { type: 'success', text: '有货' }
})

const productParams = computed(() => product.value ? [
  { label: t('commerce.product.code'), value: product.value.code || '-' },
  { label: 'ERP SKU', value: product.value.erpSku || '-' },
  { label: t('commerce.product.category'), value: product.value.categoryName || '-' },
  { label: t('commerce.product.unit'), value: product.value.unit },
  { label: t('commerce.product.variants'), value: t('commerce.product.variantCount', { count: product.value.skus.length }) },
] : [])

// ==================== 行为 ====================
let openFromHome = false
onLoad(options => {
  openFromHome = options?.openPurchase === '1'
  productId.value = Number(options?.id || options?.productId || 0)
  loadProduct()
})

onShow(() => {
  loadCart({ silent: true }).catch(() => {})
})

onBackPress(() => {
  if (purchaseSheetVisible.value) {
    purchaseSheetVisible.value = false
    return true
  }
  if (!imageViewerVisible.value) return false
  imageViewerVisible.value = false
  return true
})

onHide(async () => {
  await flush()
})

// ⚠️ 调度器是单例，页面卸载时只 flush，不 dispose
onUnload(async () => {
  await flush()
})

/** 按原商品 ID 读取资料及初始 SKU，仅本地化页面错误。 */
async function loadProduct() {
  if (!routeProductId()) {
    pageState.value = PageStatus.ERROR
    pageFailure.value = localError('commerce.product.missingId')
    return
  }
  pageState.value = PageStatus.LOADING
  try {
    const result = await getGoodsDetail(routeProductId())
    if (!result) throw localError('commerce.product.missing')
    product.value = result
    currentImage.value = 0
    // 默认选中首个可用 SKU
    const firstAvailable = result.skus?.find(s => s.canPurchase)
    const initialSku = firstAvailable || result.skus?.[0]
    selectedSkuId.value = initialSku?.skuId ?? null
    pageState.value = PageStatus.CONTENT
    if (openFromHome) { openFromHome = false; openPurchaseSheet() }
  } catch (error) {
    pageFailure.value = error?.message ? error : localError('commerce.product.loadFailed')
    pageState.value = PageStatus.ERROR
  }
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

/** 仅翻译既有促销规则类型名称，保留原规则代码。 */
function promotionRuleBadge(ruleType) {
  const labels = {
    AMOUNT_REDUCTION: t('commerce.product.amountReduction'),
    AMOUNT_GIFT: t('commerce.product.amountGift'),
    QUANTITY_GIFT: t('commerce.product.amountGift'),
    RATE_DISCOUNT: t('commerce.product.discount'),
  }
  return labels[ruleType] || t('commerce.product.promotion')
}

function giftStockText(gift) {
  if (!gift.isAvailable) return '已下架'
  if (!gift.isStockSufficient) return '赠品库存紧张'
  return gift.availableStock <= 20 ? `仅余 ${gift.availableStock}` : '赠品有货'
}

function onSwiperChange(event) {
  currentImage.value = event.detail.current
}

/** 全屏预览图片 */
function previewImage(index) {
  if (!displayImages.value.length) return
  imageViewerStartIndex.value = Number(index) || 0
  imageViewerVisible.value = true
}

/** 沿用原 SKU 数量与加购结果，只本地化反馈。 */
async function submitAddToCart({ sku, quantity } = {}) {
  if (!sku?.canPurchase || submitting.value) return null
  submitting.value = true
  try {
    await addSkuToCart({ skuId: sku.skuId, quantity })
    selectedSkuId.value = sku.skuId
    purchaseSheetVisible.value = false
    if (typeof uni !== 'undefined') uni.showToast({ title: t('commerce.product.added'), icon: 'success' })
    return true
  } catch (error) {
    if (typeof uni !== 'undefined') {
      uni.showToast({ title: error?.message || t('commerce.product.addFailed'), icon: 'none' })
    }
    return false
  } finally {
    submitting.value = false
  }
}

function handleAddToCart() {
  openPurchaseSheet()
}

/** 保留原可采购判断并显示规格选择面板。 */
function openPurchaseSheet() {
  if (!hasPurchasableSku.value) {
    if (typeof uni !== 'undefined') uni.showToast({ title: t('commerce.product.stockUnavailable'), icon: 'none' })
    return
  }
  purchaseSheetVisible.value = true
}

/** 保留原可采购判断与批量采购路由。 */
async function goToBatchPurchase() {
  if (!hasPurchasableSku.value) {
    uni.showToast({ title: t('commerce.product.noPurchasable'), icon: 'none' })
    return
  }
  purchaseSheetVisible.value = false
  await navigator.navigateTo(routes.commerce.productVariants(productId.value))
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
@import '@/shared/styles/productDetail.scss';

/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.media-card, .info-card, .promotion-card, .size-recommendation-card, .section-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
</style>
