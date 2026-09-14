<template>
  <AppPageShell>
    <template #header>
      <app-header
        title="商品详情"
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
          title="商品加载失败"
          :description="errorMessage"
          action-text="重新加载"
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
                  货号：{{ product.code || '-' }}
                  <template v-if="product.erpSku">　ERP：{{ product.erpSku }}</template>
                </text>
                <view class="price-row">
                  <text class="price-symbol">¥</text>
                  <text class="price">{{ formatMoney(selectedSkuPrice) }}</text>
                  <text v-if="selectedSkuListPrice > 0 && selectedSkuListPrice !== selectedSkuPrice" class="list-price">
                    ¥{{ formatMoney(selectedSkuListPrice) }}
                  </text>
                  <text class="price-unit">/ {{ product.unit }}</text>
                </view>
                <view class="facts">
                  <text>{{ selectedMinOrderQty }} {{ product.unit }}起订</text>
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
                    <AppIcon name="gift" :size="19" color="#D7192D" />
                    <text class="promotion-title">促销活动</text>
                  </view>
                  <text class="promotion-count">{{ product.promotions.length }} 个活动</text>
                </view>
                <view
                  v-for="promotion in product.promotions"
                  :key="promotion.promotionId"
                  class="promotion-item"
                >
                  <view class="promotion-item-heading">
                    <text class="promotion-name">{{ promotion.name }}</text>
                    <text v-if="promotion.isStackable" class="promotion-stackable">可叠加</text>
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
                          <text class="promotion-gift-spec">{{ gift.specDesc || gift.skuCode }} · 赠 {{ gift.quantity }} 件</text>
                        </view>
                        <text
                          class="promotion-gift-stock"
                          :class="{ warning: !gift.isStockSufficient }"
                        >{{ giftStockText(gift) }}</text>
                      </view>
                    </view>
                  </view>
                  <text class="promotion-time">有效期至 {{ formatPromotionTime(promotion.endTime) }}</text>
                </view>
                <text class="promotion-notice">实际赠品与优惠以下单确认页实时计算结果为准</text>
              </view>

              <view
                class="batch-purchase-entry"
                :class="{ disabled: !hasPurchasableSku }"
                @click="goToBatchPurchase"
              >
                <view class="batch-entry-copy">
                  <text class="batch-entry-title">批量采购</text>
                  <text class="batch-entry-desc">按颜色和尺码一次填写多个 SKU 数量</text>
                </view>
                <text class="batch-entry-arrow">›</text>
              </view>

              <view class="single-purchase-entry" :class="{ disabled: !hasPurchasableSku }" @click="openPurchaseSheet">
                <view>
                  <text class="section-title">单规格采购</text>
                  <text class="section-desc">{{ selectedSkuSummary }}</text>
                </view>
                <view class="entry-action">
                  <text>{{ hasPurchasableSku ? '选择规格' : '暂无库存' }}</text>
                  <AppIcon name="chevron-right" :size="16" />
                </view>
              </view>

              <!-- 商品参数 -->
              <view class="section-card">
                <text class="section-title">商品参数</text>
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
                  <text class="detail-description-title">详情介绍</text>
                  <view class="heading-line"></view>
                </view>
                <rich-text v-if="detailHtml" class="detail-rich-text" :nodes="detailHtml" />
                <view v-else class="detail-empty">
                  <text>暂无商品详情图片或说明</text>
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
            <AppIcon name="cart" :size="26" />
            <text v-if="cartStore.cartBadgeCount" class="cart-badge">{{ cartStore.cartBadgeCount }}</text>
          </view>
          <text>购物车</text>
        </button>
        <button
          class="action-btn secondary button-center"
          :disabled="!hasPurchasableSku || submitting"
          @click="handleAddToCart"
        >
          {{ submitting ? '加入中…' : '加入购物车' }}
        </button>
        <button
          class="action-btn primary button-center"
          :disabled="!hasPurchasableSku || submitting"
          @click="goToBatchPurchase"
        >
          批量采购
        </button>
      </fixed-action-bar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onBackPress, onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getGoodsDetail } from '../../api/productApi.js'
import { useCart } from '../../composables/useCart.js'
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

const productId = ref(0)
const product = ref(null)
const currentImage = ref(0)
const imageViewerVisible = ref(false)
const imageViewerStartIndex = ref(0)
const pageState = ref(PageStatus.LOADING)
const errorMessage = ref('网络异常，请稍后重试')
const submitting = ref(false)
const selectedSkuId = ref(null)
const purchaseSheetVisible = ref(false)

const { cartStore, loadCart, addSkuToCart, flush } = useCart()

const routeProductId = () => productId.value

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 后台详情使用富文本编辑器，APP/小程序端需要移除可执行内容，
 * 同时把详情图片统一收敛为内容区全宽，避免后台写死宽高后溢出屏幕。
 */
function normalizeDetailHtml(value) {
  const source = String(value || '').trim()
  if (!source) return ''

  let html = /<[a-z][\s\S]*>/i.test(source)
    ? source
    : escapeHtml(source).replace(/\r?\n/g, '<br>')

  html = html
    .replace(/<(script|iframe|object|embed|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')

  return html.replace(/<img\b([^>]*)\/?\s*>/gi, (_tag, attributes = '') => {
    const safeAttributes = attributes
      .replace(/\s(?:style|width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .trim()
    const prefix = safeAttributes ? ` ${safeAttributes}` : ''
    return `<img${prefix} style="display:block;width:100%;max-width:100%;height:auto;margin:0;" />`
  })
}

// ==================== 当前选中 SKU ====================
const selectedSku = computed(() => {
  if (!product.value?.skus?.length) return null
  return product.value.skus.find(sku => String(sku.skuId) === String(selectedSkuId.value)) || null
})

const selectedSkuPrice = computed(() => Number(selectedSku.value?.price || product.value?.price || 0))
const selectedSkuListPrice = computed(() => Number(selectedSku.value?.listPrice || 0))
const selectedMinOrderQty = computed(() => Math.max(1, Number(selectedSku.value?.minOrderQty || product.value?.moq || 1)))
const hasPurchasableSku = computed(() => Boolean(product.value?.skus?.some(sku => sku.canPurchase)))
const detailImageStock = computed(() => {
  if (selectedSku.value?.stockKnown) return selectedSku.value.stock
  if (product.value?.stockKnown) return product.value.stock
  return undefined
})
const selectedSkuSummary = computed(() => {
  if (!hasPurchasableSku.value) return '当前商品暂无可采购规格'
  if (!selectedSku.value) return '选择规格和采购数量'
  return `已选 ${selectedSku.value.specName || selectedSku.value.skuCode || '默认规格'}，${selectedMinOrderQty.value} ${product.value?.unit || '件'}起订`
})

const detailHtml = computed(() => normalizeDetailHtml(product.value?.description))

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
  { label: '商品编码', value: product.value.code || '-' },
  { label: 'ERP SKU', value: product.value.erpSku || '-' },
  { label: '商品分类', value: product.value.categoryName || '-' },
  { label: '计量单位', value: product.value.unit },
  { label: '可选规格', value: `${product.value.skus.length} 种` },
] : [])

// ==================== 行为 ====================
onLoad(options => {
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

async function loadProduct() {
  if (!routeProductId()) {
    pageState.value = PageStatus.ERROR
    errorMessage.value = '缺少商品 ID，请返回商品目录重新选择'
    return
  }
  pageState.value = PageStatus.LOADING
  try {
    const result = await getGoodsDetail(routeProductId())
    if (!result) throw new Error('商品不存在或已下架')
    product.value = result
    currentImage.value = 0
    // 默认选中首个可用 SKU
    const firstAvailable = result.skus?.find(s => s.canPurchase)
    const initialSku = firstAvailable || result.skus?.[0]
    selectedSkuId.value = initialSku?.skuId ?? null
    pageState.value = PageStatus.CONTENT
  } catch (error) {
    errorMessage.value = error?.message || '商品加载失败，请稍后重试'
    pageState.value = PageStatus.ERROR
  }
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

function promotionRuleBadge(ruleType) {
  const labels = {
    AMOUNT_REDUCTION: '满减',
    AMOUNT_GIFT: '满赠',
    QUANTITY_GIFT: '满赠',
    RATE_DISCOUNT: '折扣',
  }
  return labels[ruleType] || '促销'
}

function giftStockText(gift) {
  if (!gift.isAvailable) return '已下架'
  if (!gift.isStockSufficient) return '赠品库存紧张'
  return gift.availableStock <= 20 ? `仅余 ${gift.availableStock}` : '赠品有货'
}

function formatPromotionTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
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

async function submitAddToCart({ sku, quantity } = {}) {
  if (!sku?.canPurchase || submitting.value) return null
  submitting.value = true
  try {
    await addSkuToCart({ skuId: sku.skuId, quantity })
    selectedSkuId.value = sku.skuId
    purchaseSheetVisible.value = false
    if (typeof uni !== 'undefined') uni.showToast({ title: '已加入购物车', icon: 'success' })
    return true
  } catch (error) {
    if (typeof uni !== 'undefined') {
      uni.showToast({ title: error?.message || '加入购物车失败', icon: 'none' })
    }
    return false
  } finally {
    submitting.value = false
  }
}

function handleAddToCart() {
  openPurchaseSheet()
}

function openPurchaseSheet() {
  if (!hasPurchasableSku.value) {
    if (typeof uni !== 'undefined') uni.showToast({ title: '当前商品暂无库存', icon: 'none' })
    return
  }
  purchaseSheetVisible.value = true
}

async function goToBatchPurchase() {
  if (!hasPurchasableSku.value) {
    uni.showToast({ title: '当前商品暂无可采购规格', icon: 'none' })
    return
  }
  purchaseSheetVisible.value = false
  await navigator.navigateTo(routes.commerce.productVariants(productId.value))
}

async function goToCart() {
  await navigator.navigateTo(routes.commerce.cart())
}
</script>

<style lang="scss" scoped>
.detail-layout {
  width: 100%;
  padding-bottom: 12px;
}

.media-card {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #FFFFFF;
}

.image-swiper {
  width: 100%;
  height: 100vw;
  max-height: 720px;
  background: #FFFFFF;
}

.main-image-wrap {
  width: 100%;
  height: 100%;
}

.main-image {
  width: 100%;
  height: 100%;
}

.image-counter {
  position: absolute;
  right: 14px;
  bottom: 14px;
  min-width: 42px;
  padding: 5px 10px;
  border-radius: 999px;
  color: #FFFFFF;
  background: rgba(17, 18, 22, 0.58);
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  cursor: pointer;
}

.detail-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 12px 12px 20px;
  box-sizing: border-box;
}

.info-card,
.promotion-card,
.section-card,
.batch-purchase-entry,
.single-purchase-entry {
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: 0 5px 18px rgba(17, 18, 22, 0.045);
}

.info-card,
.promotion-card,
.section-card {
  padding: 16px;
}

.promotion-card {
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: 0 5px 18px rgba(17, 18, 22, 0.045);
}

.promotion-heading,
.promotion-title-row,
.promotion-item-heading,
.promotion-rule-line,
.promotion-gift {
  display: flex;
  align-items: center;
}

.promotion-heading,
.promotion-item-heading { justify-content: space-between; gap: 12px; }
.promotion-title-row { gap: 7px; }
.promotion-title { color: var(--color-text-primary); font-size: 16px; font-weight: 700; }
.promotion-count { color: var(--color-text-tertiary); font-size: 11px; }

.promotion-item {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--color-divider);
}

.promotion-name { min-width: 0; color: var(--color-text-primary); font-size: 14px; font-weight: 650; }
.promotion-stackable { flex: 0 0 auto; color: var(--color-brand); font-size: 11px; }
.promotion-rule { margin-top: 10px; }
.promotion-rule-line { align-items: flex-start; gap: 8px; }
.promotion-badge { flex: 0 0 auto; padding: 2px 5px; border: 1px solid var(--color-brand); border-radius: 4px; color: var(--color-brand); font-size: 10px; line-height: 15px; }
.promotion-description { color: var(--color-text-secondary); font-size: 13px; line-height: 20px; }

.promotion-gifts {
  margin-top: 9px;
  overflow: hidden;
  border: 1px solid var(--color-divider);
  border-radius: 10px;
}

.promotion-gift { min-height: 54px; gap: 9px; padding: 8px 10px; }
.promotion-gift + .promotion-gift { border-top: 1px solid var(--color-divider); }
.promotion-gift-image { width: 42px; height: 42px; flex: 0 0 42px; border-radius: 7px; overflow: hidden; }
.promotion-gift-copy { min-width: 0; flex: 1; }
.promotion-gift-name,
.promotion-gift-spec { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.promotion-gift-name { color: var(--color-text-primary); font-size: 12px; font-weight: 600; }
.promotion-gift-spec { margin-top: 3px; color: var(--color-text-tertiary); font-size: 10px; }
.promotion-gift-stock { flex: 0 0 auto; color: var(--success-color, #168A52); font-size: 10px; }
.promotion-gift-stock.warning { color: var(--color-brand); }
.promotion-time { display: block; margin-top: 9px; color: var(--color-text-tertiary); font-size: 10px; text-align: right; }
.promotion-notice { display: block; margin-top: 12px; color: var(--color-text-tertiary); font-size: 10px; line-height: 16px; }

.product-name {
  display: block;
  color: var(--color-text-primary);
  font-size: 19px;
  font-weight: 700;
  line-height: 1.45;
}

.product-code {
  display: block;
  margin-top: 7px;
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.price-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  margin-top: 16px;
  color: var(--color-brand);
}

.price-symbol { font-size: 16px; font-weight: 700; }
.price { font-size: 30px; font-weight: 750; font-variant-numeric: tabular-nums; }
.list-price { margin-left: 8px; color: var(--color-text-disabled); font-size: 13px; text-decoration: line-through; }
.price-unit { margin-left: 4px; color: var(--color-text-secondary); font-size: 12px; }

.facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 13px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.fact-dot { color: var(--color-border-strong); }

.batch-purchase-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 74px;
  padding: 14px 16px;
  box-sizing: border-box;
  background: var(--surface-card);
}

.batch-purchase-entry:active { opacity: 0.82; }
.batch-purchase-entry.disabled { opacity: 0.5; }
.batch-entry-copy { min-width: 0; }
.batch-entry-title { display: block; color: var(--color-text-primary); font-size: 16px; font-weight: 700; }
.batch-entry-desc { display: block; margin-top: 4px; color: var(--color-text-secondary); font-size: 12px; }
.batch-entry-arrow { margin-left: 12px; color: var(--color-brand); font-size: 28px; line-height: 1; }

.single-purchase-entry {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  box-sizing: border-box;
}

.single-purchase-entry:active { background: var(--surface-subtle); }
.single-purchase-entry.disabled { opacity: 0.62; }
.entry-action { display: flex; flex: 0 0 auto; align-items: center; gap: 3px; color: var(--color-brand); font-size: var(--type-body-small-size, 13px); }
.single-purchase-entry.disabled .entry-action { color: var(--color-text-disabled); }

.section-heading-row,
.quantity-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title { display: block; color: var(--color-text-primary); font-size: 15px; font-weight: 700; }
.section-desc { display: block; margin-top: 4px; color: var(--color-text-tertiary); font-size: 12px; }
.text-action { min-width: 72px; height: 34px; padding: 0 12px; border: 0; border-radius: 17px; color: var(--color-brand); background: var(--color-brand-soft); font-size: 12px; line-height: 34px; }
.text-action[disabled] { color: var(--color-text-disabled); background: var(--surface-muted); }
.section-stock { color: var(--success-color, #168A52); font-size: 12px; white-space: nowrap; }
.quantity-stepper-row { margin-top: 14px; }
.sku-group { margin-top: 18px; }
.sku-group-label { display: block; color: var(--color-text-secondary); font-size: 13px; font-weight: 500; }
.sku-options { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 9px; }
.sku-chip { min-width: 68px; height: 38px; padding: 0 14px; color: var(--color-text-primary); background: var(--surface-subtle); border: 1px solid var(--color-border); border-radius: 9px; font-size: 13px; }
.sku-chip.active { color: var(--color-brand); background: var(--color-brand-soft); border-color: var(--color-brand); }
.sku-chip.disabled { color: var(--color-text-disabled); background: var(--surface-muted); opacity: 0.6; pointer-events: none; }
.sku-chip-text { line-height: 36px; }
.sku-selected-tip { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; padding: 9px 12px; background: var(--surface-subtle); border-radius: 8px; }
.tip-text { color: var(--color-text-secondary); font-size: 12px; }
.tip-error { color: var(--danger-color, #B42318); font-size: 12px; }
.params-list { margin-top: 12px; }
.param-row { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 12px; min-height: 42px; align-items: center; margin-top: 6px; padding: 0 12px; border-radius: 9px; background: var(--surface-subtle); font-size: 13px; }
.param-label { color: var(--color-text-tertiary); }
.param-value { color: var(--color-text-primary); text-align: right; word-break: break-all; }

.detail-description {
  overflow: hidden;
  background: #FFFFFF;
  border-radius: var(--radius-card);
}

.detail-description-heading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 58px;
  padding: 0 18px;
}

.heading-line { width: 28px; height: 1px; background: var(--color-divider); }
.detail-description-title { color: var(--color-text-primary); font-size: 15px; font-weight: 700; }
.detail-rich-text { display: block; width: 100%; overflow: hidden; color: var(--color-text-secondary); font-size: 14px; line-height: 1.75; }
.detail-empty { padding: 28px 16px 36px; color: var(--color-text-tertiary); font-size: 13px; text-align: center; }

.cart-entry {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 0 0 62px;
  height: 48px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 11px;
  transition: all 0.2s ease;
  overflow: visible;
}

.cart-entry:active {
  background: var(--color-border, #ECEEF2);
  transform: scale(0.96);
}

.cart-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-badge {
  position: absolute;
  top: -5px;
  right: -6px;
  min-width: 16px;
  max-width: 25px;
  height: 16px;
  padding: 0 3px;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 8px;
  color: #FFFFFF;
  background: var(--color-brand);
  font-size: 9px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  z-index: 2;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  height: 48px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 650;
  transition: all 0.2s ease;
  letter-spacing: 0.5px;
}

.action-btn.secondary {
  color: #fff;
  background: var(--color-brand, #D7192D);
}

.action-btn.secondary:active {
  transform: scale(0.97);
}

.action-btn.primary {
  color: #fff;
  background: #23252A;
}

.action-btn.primary:active {
  transform: scale(0.97);
}

.action-btn[disabled] {
  color: rgba(255, 255, 255, 0.7);
  background: #B8BBC2;
}

@media screen and (min-width: 768px) {
  .detail-layout { max-width: 760px; margin: 0 auto; padding: 20px 24px 28px; box-sizing: border-box; }
  .media-card { border-radius: var(--radius-card); }
  .image-swiper { height: min(712px, calc(100vw - 96px)); }
  .detail-main { padding: 14px 0 20px; }
  .info-card, .promotion-card, .section-card { padding: 20px; }
  .product-name { font-size: 21px; }
}

@media screen and (min-width: 960px) {
  .detail-layout {
    display: grid;
    grid-template-columns: minmax(360px, 0.9fr) minmax(460px, 1.1fr);
    align-items: start;
    gap: 18px;
    max-width: 1120px;
  }
  .image-swiper { height: auto; max-height: none; aspect-ratio: 1 / 1; }
  .detail-main { gap: 14px; padding-top: 0; }
}
</style>
