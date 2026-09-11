<template>
  <AppPageShell>
    <template #header>
      <app-header
        title="批量采购"
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
          title="商品加载失败"
          :description="errorMessage"
          action-text="重新加载"
          icon-type="product"
          @retry="loadProduct"
        >
          <view v-if="product" class="batch-layout">
            <view class="product-card">
              <AppProductImage class="product-image" :src="product.image" :stock="product.stock" />
              <view class="product-info">
                <text class="product-name">{{ product.name }}</text>
                <text class="product-code">货号：{{ product.code || '-' }}</text>
                <view class="price-row">
                  <text class="price">{{ priceText }}</text>
                  <text class="unit">/ {{ product.unit }}</text>
                </view>
              </view>
            </view>

            <view class="batch-toolbar">
              <view>
                <text class="card-title">按规格批量填数</text>
                <text class="card-desc">一键填数将覆盖所有可采购 SKU 的数量</text>
              </view>
              <view class="batch-fill-row">
                <input
                  v-model="batchFillNumber"
                  type="number"
                  class="batch-fill-input"
                  placeholder="输入数量"
                />
                <button class="batch-fill-btn" @click="applyBatchFill">一键填数</button>
                <button class="clear-btn" :disabled="selectedLines.length === 0" @click="clearAll">一键清空</button>
              </view>
            </view>

            <view v-for="group in skuGroups" :key="group.key" class="sku-group-card">
              <view class="group-heading">
                <view>
                  <text class="group-title">{{ group.name }}</text>
                  <text class="group-desc">{{ group.items.length }} 个尺码规格</text>
                </view>
                <button class="copy-btn" @click="copyGroup(group)">整行复制</button>
              </view>

              <view
                v-for="sku in group.items"
                :key="sku.skuId"
                class="sku-row"
                :class="{ unavailable: !sku.canPurchase }"
              >
                <view class="sku-copy">
                  <view class="sku-title-row">
                    <text class="sku-size">{{ sku.sizeName || sku.specName || '默认规格' }}</text>
                    <text class="sku-stock" :class="{ empty: !sku.canPurchase }">
                      {{ sku.canPurchase ? formatStock(sku.stock) : '缺货' }}
                    </text>
                  </view>
                  <text class="sku-code">SKU：{{ sku.skuCode || '-' }}</text>
                  <view class="sku-price-row">
                    <text class="sku-price">¥{{ formatMoney(sku.price) }}</text>
                    <text class="sku-moq">{{ sku.minOrderQty }} {{ product.unit }}起订</text>
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

            <view v-if="validationMessage" class="validation-message">{{ validationMessage }}</view>
          </view>
        </app-page-state>
      </AppContent>
    </template>

    <template #footer>
      <fixed-action-bar v-if="pageState === PageStatus.CONTENT">
        <view class="footer-inner">
          <view class="footer-summary">
            <text class="footer-label">已选 {{ selectedLines.length }} 款，共 {{ totalQuantity }} {{ product?.unit || '件' }}</text>
            <text class="footer-amount">¥{{ formatMoney(totalAmount) }}</text>
          </view>
          <button class="add-btn" :disabled="!canSubmit || submitting" @click="submit">
            {{ submitting ? '提交中…' : '加入购物车' }}
          </button>
        </view>
      </fixed-action-bar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
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
import AppProductImage from '../../../../shared/ui/AppProductImage/AppProductImage.vue'
import quantityStepper from '../../components/QuantityStepper/QuantityStepper.vue'

const productId = ref(0)
const product = ref(null)
const quantities = ref({})
const batchRequestId = ref('')
const batchFillNumber = ref('')
const pageState = ref(PageStatus.LOADING)
const errorMessage = ref('网络异常，请稍后重试')
const { cartStore, submitting, loadCart, batchAddSkuToCart } = useCart()

const skuGroups = computed(() => {
  const groups = new Map()
  for (const sku of product.value?.skus || []) {
    const key = String(sku.colorId || sku.colorName || 'default')
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: sku.colorName || '默认颜色',
        items: [],
      })
    }
    groups.get(key).items.push(sku)
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
  if (!prices.length) return '暂无报价'
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max
    ? `¥${formatMoney(min)}`
    : `¥${formatMoney(min)} - ¥${formatMoney(max)}`
})

const validationMessage = computed(() => {
  if (selectedLines.value.length > 50) return '单次最多选择 50 个 SKU，请分批加入购物车'
  const invalid = selectedLines.value.find(({ sku, quantity }) => (
    !sku.canPurchase
    || quantity < Number(sku.minOrderQty || 1)
    || quantity > Number(sku.stock || 0)
  ))
  if (!invalid) return ''
  if (!invalid.sku.canPurchase) return `${invalid.sku.specName || invalid.sku.skuCode} 暂不可购买`
  if (invalid.quantity < invalid.sku.minOrderQty) return `${invalid.sku.specName || invalid.sku.skuCode} 不得低于 ${invalid.sku.minOrderQty} 件起订量`
  return `${invalid.sku.specName || invalid.sku.skuCode} 超过当前可用库存`
})

const canSubmit = computed(() => selectedLines.value.length > 0 && !validationMessage.value)

onLoad(options => {
  productId.value = Number(options?.id || options?.productId || 0)
  loadProduct()
})

onShow(() => loadCart({ silent: true }).catch(() => {}))

async function loadProduct() {
  if (!productId.value) {
    pageState.value = PageStatus.ERROR
    errorMessage.value = '缺少商品 ID，请返回商品目录重新选择'
    return
  }
  pageState.value = PageStatus.LOADING
  try {
    const result = await getGoodsDetail(productId.value)
    if (!result) throw new Error('商品不存在或已下架')
    product.value = result
    quantities.value = Object.fromEntries((result.skus || []).map(sku => [sku.skuId, 0]))
    batchRequestId.value = ''
    pageState.value = PageStatus.CONTENT
  } catch (error) {
    errorMessage.value = error?.message || '商品加载失败，请稍后重试'
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

function clearAll() {
  quantities.value = Object.fromEntries((product.value?.skus || []).map(sku => [sku.skuId, 0]))
  batchRequestId.value = ''
  batchFillNumber.value = ''
}

/** 一键批量填数：输入数量应用到所有可采购 SKU，超出库存的取最高库存 */
function applyBatchFill() {
  const raw = Number(batchFillNumber.value)
  if (!Number.isFinite(raw) || raw <= 0) {
    uni.show({ title: '请输入有效的数量', icon: 'none' })
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
    uni.showToast({ title: `已填入 ${filledCount} 个规格`, icon: 'success' })
  } else {
    uni.showToast({ title: '没有可填入的规格', icon: 'none' })
  }
}

function copyGroup(group) {
  const available = group.items.filter(sku => sku.canPurchase)
  if (!available.length) {
    uni.showToast({ title: '该颜色暂无可采购规格', icon: 'none' })
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

async function submit() {
  if (!canSubmit.value) return
  if (!batchRequestId.value) batchRequestId.value = createBatchRequestId()
  try {
    const success = await batchAddSkuToCart(
      selectedLines.value.map(({ skuId, quantity }) => ({ skuId, quantity })),
      batchRequestId.value,
    )
    if (success) {
      uni.showToast({ title: '已加入购物车', icon: 'success' })
      setTimeout(goToCart, 500)
    }
  } catch (error) {
    uni.showToast({ title: error?.message || '批量加购失败，请重试', icon: 'none' })
  }
}

async function goToCart() {
  await navigator.navigateTo(routes.commerce.cart())
}
</script>

<style lang="scss" scoped>
.batch-layout { display: flex; flex-direction: column; gap: 12px; padding: 12px 0 24px; }
.product-card, .batch-toolbar, .sku-group-card { background: var(--surface-card); border-radius: var(--radius-card); box-shadow: 0 2px 10px rgba(17, 18, 22, 0.035); }
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
.batch-fill-btn { flex-shrink: 0; height: 34px; padding: 0 14px; border: 0; border-radius: 17px; color: #fff; background: var(--color-brand); font-size: 12px; font-weight: 600; }
.card-title, .group-title { display: block; color: var(--color-text-primary); font-size: 15px; font-weight: 700; }
.card-desc, .group-desc { display: block; margin-top: 4px; color: var(--color-text-tertiary); font-size: 12px; line-height: 1.5; }
.clear-btn, .copy-btn { flex-shrink: 0; height: 34px; padding: 0 13px; border: 0; border-radius: 17px; color: var(--color-brand); background: var(--color-brand-soft); font-size: 12px; line-height: 34px; }
.clear-btn[disabled] { color: var(--color-text-disabled); background: var(--surface-muted); }

.sku-group-card { overflow: hidden; }
.group-heading { padding: 14px 16px; border-bottom: 1px solid var(--color-divider); }
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
.sku-moq { color: var(--color-text-secondary); font-size: 11px; }
.validation-message { padding: 11px 14px; border-radius: 9px; color: var(--danger-color, #B42318); background: #FFF1F1; font-size: 12px; line-height: 1.5; }

.footer-inner { display: flex; width: 100%; max-width: 1120px; align-items: center; justify-content: space-between; gap: 16px; margin: 0 auto; }
.footer-summary { display: flex; min-width: 0; flex: 1; align-items: flex-start; justify-content: center; flex-direction: column; }
.footer-label { overflow: hidden; color: var(--color-text-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.footer-amount { color: var(--color-brand); font-size: 19px; font-weight: 700; }
.add-btn { display: flex; min-width: 136px; height: 44px; flex: 0 0 auto; align-items: center; justify-content: center; margin: 0; padding: 0 22px; color: #FFFFFF; background: var(--color-brand); border: 0; border-radius: var(--radius-control); font-size: 14px; font-weight: 650; line-height: 1; text-align: center; box-sizing: border-box; }
.add-btn::after { border: 0; }
.add-btn[disabled] { color: var(--color-text-disabled); background: var(--surface-muted); }

@media screen and (min-width: 760px) {
  .batch-layout { max-width: 860px; margin: 0 auto; padding-top: 20px; }
  .product-card { grid-template-columns: 112px minmax(0, 1fr); padding: 18px; }
  .product-image { width: 112px; height: 112px; }
  .sku-row { min-height: 104px; padding: 16px 20px; }
}
</style>
