<template>
  <view class="detail-layout">
    <view class="media-card">
      <swiper class="image-swiper" :indicator-dots="images.length > 1" :current="currentImage" :circular="images.length > 1" @change="currentImage = $event.detail.current"><swiper-item v-for="(image,index) in images" :key="image"><view class="main-image-wrap" @tap="preview(index)"><AppProductImage class="main-image" :src="image" :show-stock-badge="false" /></view></swiper-item></swiper>
      <text class="image-counter" @tap="preview(currentImage)">{{ currentImage + 1 }} / {{ images.length }}</text>
    </view>
    <view class="detail-main">
      <view class="info-card">
        <text class="product-name">{{ product.productName }}</text><text class="product-code">{{ t('commerce.product.article', { code: product.productCode || '-' }) }}</text>
        <view v-if="showPrice" class="price-row"><AmountText class="price" :text="'¥' + selectedPrice" /><text class="price-unit">/ {{ unit || '件' }}</text></view>
        <button v-if="purchasable && displaySku" class="price-variant" @tap="$emit('select', displaySku.skuId)"><text>{{ t('commerce.product.currentVariant', { name: selectedName }) }}</text><AppIcon name="chevron-right" :size="13" /></button>
        <view class="facts"><text v-if="purchasable">{{ t('commerce.product.minimum', { count: 1, unit: unit || '件' }) }}</text><text v-if="purchasable" class="fact-dot">·</text><StatusTag :type="stockType(selectedStock)" :text="t('share.stock.' + selectedStock)" /><template v-if="categoryName"><text class="fact-dot">·</text><text>{{ categoryName }}</text></template></view>
      </view>
      <view v-if="sizeHtml" class="size-recommendation-card"><view class="section-title">{{ t('commerce.product.sizeRecommendation') }}</view><rich-text class="size-recommendation-rich-text" :nodes="sizeHtml" /></view>
      <view v-if="purchasable" class="single-purchase-entry" :class="{ disabled: !canPurchase }" @tap="$emit('select', displaySku?.skuId)"><view><text class="section-title">{{ t('commerce.product.single') }}</text><text class="section-desc">{{ canPurchase ? t('commerce.product.selectedSummary', { name: selectedName, count: 1, unit: unit || '件' }) : t('commerce.product.noPurchasable') }}</text></view><view class="entry-action"><text>{{ canPurchase ? t('commerce.product.select') : '暂无库存' }}</text><AppIcon name="chevron-right" :size="16" /></view></view>
      <view class="section-card"><text class="section-title">{{ t('commerce.product.parameters') }}</text><view class="params-list"><view v-for="row in productParams" :key="row.label" class="param-row"><text class="param-label">{{ row.label }}</text><text class="param-value">{{ row.value }}</text></view></view></view>
      <view v-if="!purchasable" class="section-card"><view class="section-heading"><text class="section-title">规格库存</text><text class="section-count">{{ total }} 个规格</text></view><view v-for="sku in skus" :key="sku.skuId" class="spec-row" @tap="selectedSku = sku"><view class="spec-copy"><text>{{ sku.specDesc || sku.skuCode }}</text><text class="product-code">{{ sku.skuCode }}</text></view><StatusTag :type="stockType(sku.stockState)" :text="t('share.stock.' + sku.stockState)" /></view><AppButton v-if="hasMore" block variant="secondary" :loading="loading" @tap="$emit('more')">加载更多规格</AppButton><AppLoadMore v-else :status="loading ? 'loading' : 'no-more'" /></view>
      <view v-if="showPrice" class="detail-description"><view class="detail-description-heading"><view class="heading-line" /><text class="detail-description-title">{{ t('commerce.product.description') }}</text><view class="heading-line" /></view><rich-text v-if="detailHtml" class="detail-rich-text" :nodes="detailHtml" /><view v-else class="detail-empty"><text>{{ t('commerce.product.emptyDescription') }}</text></view></view>
    </view>
    <ShareOverlayPortal :visible="!!selectedSku"><ConfirmPopup :model-value="!!selectedSku" title="规格详情" :show-cancel="false" confirm-text="关闭" @close="selectedSku = null" @confirm="selectedSku = null" @update:model-value="!$event && (selectedSku = null)"><view v-if="selectedSku" class="sku-popup"><AppProductImage class="sku-image" :src="selectedSku.imageUrl || product.imageUrl" :show-stock-badge="false" /><text class="product-name">{{ selectedSku.specDesc || selectedSku.skuCode }}</text><text class="product-code">{{ selectedSku.skuCode }}</text><StatusTag :type="stockType(selectedSku.stockState)" :text="t('share.stock.' + selectedSku.stockState)" /></view></ConfirmPopup></ShareOverlayPortal>
  </view>
</template>
<script setup>
import ShareOverlayPortal from './ShareOverlayPortal.vue'
import { computed, ref, watch } from 'vue'
import { normalizeDetailHtml } from '@/shared/utils/productRichText.js'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import '@/subPackages/commerce/i18n/register.js'
import { t } from '@/shared/i18n/index.js'
/** 分享商品详情复用经销商同一份详情样式和富文本处理，选规格由页面统一覆盖层承载。 */
const props = defineProps({ product: { type: Object, required: true }, skus: { type: Array, default: () => [] }, total: { type: Number, default: 0 }, loading: Boolean, hasMore: Boolean, showPrice: Boolean, purchasable: Boolean, description: { type: String, default: '' }, sizeRecommendation: { type: String, default: '' }, unit: { type: String, default: '' }, selectedSkuId: { type: [String,Number], default: null }, categoryName: { type: String, default: '' } })
const emit = defineEmits(['more','select','preview'])
const selectedSku = ref(null), currentImage = ref(0)
const detailHtml = computed(() => normalizeDetailHtml(props.description))
const sizeHtml = computed(() => normalizeDetailHtml(props.sizeRecommendation))
const displaySku = computed(() => props.skus.find(sku => String(sku.skuId) === String(props.selectedSkuId)) || props.skus.find(sku => sku.stockState !== 'OUT_OF_STOCK') || props.skus[0] || null)
const selectedPrice = computed(() => displaySku.value?.unitPrice || props.product.fromPrice)
const selectedStock = computed(() => displaySku.value?.stockState || props.product.stockState)
const selectedName = computed(() => displaySku.value?.specDesc || displaySku.value?.skuCode || '请选择规格')
const canPurchase = computed(() => props.skus.some(sku => sku.stockState !== 'OUT_OF_STOCK'))
const productParams = computed(() => [{label:'商品编码',value:props.product.productCode || '-'}, ...(props.categoryName ? [{label:'分类',value:props.categoryName}] : []), {label:'单位',value:props.unit || '件'}, {label:'规格',value:props.total + ' 个规格'}])
const images = computed(() => { const values = [...new Set([displaySku.value?.imageUrl, props.product.imageUrl, ...props.skus.map(item => item.imageUrl)].filter(Boolean))]; return values.length ? values : [''] })
/** 报价更新清理只读规格弹层，避免旧状态停留。 */
watch(() => props.skus, () => { selectedSku.value = null })
/** 图片变更后重新定位轮播页，避免越界计数。 */
watch(images, () => { currentImage.value = 0 })
/** 图片只预览当前授权返回的资源。 */
function preview(index) { if (images.value[index]) emit('preview', { images: images.value.filter(Boolean), index }) }
/** 将公开库存三态映射到项目标签。 */
function stockType(state) { return state === 'IN_STOCK' ? 'success' : state === 'LOW_STOCK' ? 'warning' : 'default' }
</script>
<style scoped lang="scss">
@import '@/shared/styles/productDetail.scss';
.section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.section-count{font-size:12px;color:var(--text-secondary,#737a84)}.spec-row{display:flex;align-items:center;gap:12px;padding:16px 0;border-bottom:1px solid var(--border-color,#eceef2)}.spec-copy{flex:1;min-width:0;font-size:14px}.spec-state{display:flex;flex-direction:column;align-items:flex-end;gap:6px}.sku-popup{display:flex;flex-direction:column;gap:12px}.sku-popup :deep(.status-tag){align-self:flex-start;flex:none;width:auto;max-width:100%;min-height:22px;line-height:18px}.sku-image{width:120px;height:120px;align-self:center}
</style>
