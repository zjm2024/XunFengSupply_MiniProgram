<template>
  <view v-if="visible" class="sku-sheet-mask" @tap="close">
    <view class="sku-sheet" @tap.stop>
      <view class="sheet-handle" />
      <view class="sheet-header">
        <text class="sheet-title">选择采购规格</text>
        <button class="sheet-close button-center" :disabled="submitting" @tap="close">×</button>
      </view>

      <view class="product-summary">
        <AppProductImage
          class="summary-image"
          :src="selectedSku?.image || product?.image"
          :stock="selectedImageStock"
        />
        <view class="summary-copy">
          <view class="summary-price">
            <text class="price-symbol">¥</text>
            <text>{{ formatMoney(selectedSku?.price ?? product?.price) }}</text>
          </view>
          <text class="summary-stock" :class="{ empty: !selectedSku?.canPurchase }">{{ stockText }}</text>
          <text class="summary-selected">已选：{{ selectedSkuName }}</text>
        </view>
      </view>

      <scroll-view class="sheet-scroll" scroll-y>
        <view class="sheet-section">
          <text class="section-label">颜色</text>
          <view class="sku-options">
            <button
              v-for="group in colorGroups"
              :key="group.key"
              class="sku-option button-center"
              :class="{ active: selectedColorKey === group.key, disabled: !group.canPurchase }"
              :disabled="!group.canPurchase"
              @tap="selectColor(group)"
            >
              {{ group.name }}
            </button>
          </view>
        </view>

        <view class="sheet-section size-section">
          <view class="section-label-row">
            <text class="section-label">尺码</text>
            <text v-if="selectedColorName" class="selected-color">已选 {{ selectedColorName }}</text>
          </view>
          <view class="sku-options">
            <button
              v-for="sku in sizeOptions"
              :key="sku.skuId"
              class="sku-option size-option button-center"
              :class="{ active: isSelectedSku(sku), disabled: !sku.canPurchase }"
              :disabled="!sku.canPurchase"
              @tap="selectSize(sku)"
            >
              {{ sku.sizeName || sku.specName || sku.skuCode || '默认尺码' }}
            </button>
          </view>
          <text v-if="!hasPurchasableSku" class="empty-hint">当前商品暂无可采购规格</text>
          <text v-else-if="!sizeOptions.length" class="empty-hint">请先选择颜色</text>
        </view>

        <view class="sheet-section quantity-section">
          <view>
            <text class="section-label">采购数量</text>
            <text class="quantity-hint">{{ minimumText }}</text>
          </view>
          <QuantityStepper
            v-model="quantity"
            :min="minimumQuantity"
            :max="maximumQuantity"
            :disabled="!selectedSku?.canPurchase"
          />
        </view>
      </scroll-view>

      <view class="sheet-actions">
        <button class="batch-button button-center" :disabled="!hasPurchasableSku || submitting" @tap="emit('batch')">
          批量采购
        </button>
        <button class="confirm-button button-center" :disabled="!canConfirm || submitting" @tap="confirm">
          {{ submitting ? '加入中…' : '加入购物车' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AppProductImage from '../../../../shared/ui/AppProductImage/AppProductImage.vue'
import QuantityStepper from '../QuantityStepper/QuantityStepper.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  product: { type: Object, default: null },
  initialSkuId: { type: [Number, String], default: null },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'confirm', 'batch'])

const selectedSkuId = ref(null)
const selectedColorKey = ref('')
const quantity = ref(1)
const productSkus = computed(() => Array.isArray(props.product?.skus) ? props.product.skus : [])
const colorGroups = computed(() => {
  const groups = new Map()
  productSkus.value.forEach(sku => {
    const key = colorKey(sku)
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: sku.colorName || '默认颜色',
        items: [],
        canPurchase: false,
      })
    }
    const group = groups.get(key)
    group.items.push(sku)
    group.canPurchase ||= Boolean(sku.canPurchase)
  })
  return Array.from(groups.values())
})
const selectedColorGroup = computed(() => colorGroups.value.find(group => group.key === selectedColorKey.value) || null)
const selectedColorName = computed(() => selectedColorGroup.value?.name || '')
const sizeOptions = computed(() => selectedColorGroup.value?.items || [])
const hasPurchasableSku = computed(() => productSkus.value.some(sku => sku.canPurchase))
const selectedSku = computed(() => productSkus.value.find(sku => String(sku.skuId) === String(selectedSkuId.value)) || null)
const minimumQuantity = computed(() => Math.max(1, Number(selectedSku.value?.minOrderQty || props.product?.moq || 1)))
const maximumQuantity = computed(() => {
  if (!selectedSku.value?.stockKnown) return 9999
  return Math.max(minimumQuantity.value, Number(selectedSku.value.stock) || 0)
})
const canConfirm = computed(() => Boolean(
  selectedSku.value?.canPurchase
  && quantity.value >= minimumQuantity.value
  && quantity.value <= maximumQuantity.value,
))
const selectedSkuName = computed(() => {
  if (!selectedSku.value) return '请先选颜色，再选尺码'
  const color = selectedSku.value.colorName || '默认颜色'
  const size = selectedSku.value.sizeName || selectedSku.value.specName || selectedSku.value.skuCode || '默认尺码'
  return `${color} / ${size}`
})
const selectedImageStock = computed(() => selectedSku.value?.stockKnown ? selectedSku.value.stock : undefined)
const minimumText = computed(() => `${minimumQuantity.value} ${props.product?.unit || '件'}起订`)
const stockText = computed(() => {
  if (!selectedSku.value) return '请选择规格'
  if (!selectedSku.value.canPurchase) return selectedSku.value.invalidReason || '暂无库存'
  if (!selectedSku.value.stockKnown) return '库存以提交结果为准'
  return `库存 ${selectedSku.value.stock} ${props.product?.unit || '件'}`
})

watch(() => props.visible, visible => {
  if (!visible) return
  const initial = productSkus.value.find(sku => String(sku.skuId) === String(props.initialSkuId) && sku.canPurchase)
    || productSkus.value.find(sku => sku.canPurchase)
    || productSkus.value[0]
  selectedSkuId.value = initial?.skuId ?? null
  selectedColorKey.value = initial ? colorKey(initial) : ''
  quantity.value = Math.max(1, Number(initial?.minOrderQty || props.product?.moq || 1))
}, { immediate: true })

watch(minimumQuantity, minimum => {
  quantity.value = Math.min(maximumQuantity.value, Math.max(minimum, Number(quantity.value) || minimum))
})

function isSelectedSku(sku) {
  return String(sku?.skuId) === String(selectedSkuId.value)
}

function colorKey(sku) {
  return String(sku?.colorId ?? sku?.colorName ?? 'default')
}

function selectColor(group) {
  if (!group?.canPurchase) return
  selectedColorKey.value = group.key
  const currentSize = selectedSku.value?.sizeValueId ?? selectedSku.value?.sizeName
  const next = group.items.find(sku => (
    sku.canPurchase
    && String(sku.sizeValueId ?? sku.sizeName) === String(currentSize)
  )) || group.items.find(sku => sku.canPurchase)
  selectSize(next)
}

function selectSize(sku) {
  if (!sku?.canPurchase) return
  selectedSkuId.value = sku.skuId
  selectedColorKey.value = colorKey(sku)
  quantity.value = Math.max(1, Number(sku.minOrderQty || props.product?.moq || 1))
}

function close() {
  if (!props.submitting) emit('update:visible', false)
}

function confirm() {
  if (!canConfirm.value) return
  emit('confirm', { sku: selectedSku.value, quantity: quantity.value })
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}
</script>

<style lang="scss" scoped>
.sku-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(17, 18, 22, 0.42);
}

.sku-sheet {
  width: 100%;
  max-height: min(78vh, 680px);
  padding: 8px 16px calc(14px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 22px 22px 0 0;
  background: var(--surface-card, #FFFFFF);
}

.sheet-handle {
  width: 36px;
  height: 4px;
  margin: 0 auto 4px;
  border-radius: 999px;
  background: #D9DBDF;
}

.sheet-header {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
}

.sheet-title {
  color: var(--color-text-primary, #1B1C20);
  font-size: var(--type-section-title-size, 18px);
  font-weight: 700;
}

.sheet-close {
  width: 36px;
  height: 36px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--color-text-secondary, #5F646C);
  background: var(--surface-subtle, #F4F5F7);
  font-size: 24px;
  font-weight: 300;
}

.product-summary {
  display: flex;
  gap: 14px;
  margin: 6px 0 14px;
  padding: 12px;
  border-radius: 16px;
  background: var(--surface-subtle, #F7F8FA);
}

.summary-image {
  width: 88px;
  height: 88px;
  flex: 0 0 88px;
  border-radius: 12px;
  background: #FFFFFF;
}

.summary-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: center;
}

.summary-price {
  color: var(--color-brand, #D7192D);
  font-size: 24px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.price-symbol { font-size: 14px; }
.summary-stock { margin-top: 4px; color: var(--success-color, #168A52); font-size: var(--type-caption-size, 12px); }
.summary-stock.empty { color: var(--danger-color, #B42318); }
.summary-selected { margin-top: 5px; overflow: hidden; color: var(--color-text-secondary, #5F646C); font-size: var(--type-body-small-size, 13px); text-overflow: ellipsis; white-space: nowrap; }

.sheet-scroll {
  max-height: calc(min(78vh, 680px) - 250px);
}

.sheet-section {
  padding: 14px 0;
}

.size-section {
  border-top: 1px solid var(--color-divider, #EFF0F2);
}

.section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.selected-color {
  color: var(--color-text-tertiary, #8B9098);
  font-size: 11px;
}

.section-label {
  display: block;
  color: var(--color-text-primary, #1B1C20);
  font-size: var(--type-label-size, 15px);
  font-weight: 650;
}

.sku-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.sku-option {
  min-height: 40px;
  margin: 0;
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--color-text-primary, #1B1C20);
  background: var(--surface-subtle, #F4F5F7);
  font-size: var(--type-body-small-size, 13px);
  line-height: 20px;
}

.sku-option.active {
  border-color: var(--color-brand, #D7192D);
  color: var(--color-brand, #D7192D);
  background: #FFFFFF;
  box-shadow: inset 0 0 0 1px var(--color-brand, #D7192D);
}

.sku-option.disabled { color: var(--color-text-disabled, #B8BBC2); opacity: 0.72; }
.empty-hint { display: block; margin-top: 12px; color: var(--danger-color, #B42318); font-size: var(--type-caption-size, 12px); }

.quantity-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.quantity-hint { display: block; margin-top: 4px; color: var(--color-text-tertiary, #8B9098); font-size: var(--type-caption-size, 12px); }

.sheet-actions {
  display: grid;
  grid-template-columns: minmax(110px, 0.42fr) minmax(160px, 1fr);
  gap: 10px;
  padding-top: 12px;
}

.batch-button,
.confirm-button {
  height: 48px;
  margin: 0;
  border: 0;
  border-radius: 14px;
  font-size: var(--type-button-size, 14px);
  font-weight: 650;
}

.batch-button { border: 1px solid rgba(215, 25, 45, 0.42); color: var(--color-brand, #D7192D); background: #FFFFFF; }
.confirm-button { color: #FFFFFF; background: var(--color-brand, #D7192D); }
.batch-button[disabled], .confirm-button[disabled] { color: var(--color-text-disabled, #B8BBC2); background: var(--surface-muted, #ECEEF2); }

@media screen and (min-width: 768px) {
  .sku-sheet {
    max-width: 560px;
    margin-bottom: 28px;
    border-radius: 22px;
  }
}
</style>
