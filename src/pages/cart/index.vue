<template>
  <AppPageShell>
    <template #header>
      <app-header
        title="购物车"
        :show-back="true"
        :show-right-action="true"
        right-action-text="管理"
      />
    </template>

    <template #content>
      <!-- 风控提示条 -->
      <view class="risk-banner">
        <text class="risk-text">距离 10 万元上限还可添加</text>
        <text class="risk-amount">{{ formattedRemaining }}</text>
      </view>

      <AppContent>
        <view class="cart-content">
          <!-- 工具栏 -->
          <view class="cart-toolbar">
            <text class="toolbar-title">已选商品</text>
            <button class="toolbar-btn" @click="goToProductList">继续选商品</button>
          </view>

          <!-- 空状态：使用 AppPageState -->
          <app-page-state
            v-if="cartStore.isEmpty"
            state="empty"
            title="购物车为空"
            description="快去挑选心仪的商品吧"
            action-text="去选商品"
            icon-type="cart"
            :fullscreen="false"
            @action="goToProductList"
          />

          <!-- 商品列表（非空时） -->
          <template v-else>
            <view
              v-for="product in cartStore.products"
              :key="product.productId"
              class="cart-product"
            >
              <!-- 商品头部：图片 + 名称 + 价格 + 批量选规格按钮 -->
              <view class="product-heading">
                <!-- 商品级勾选 -->
                <label class="check-box" @tap.stop="toggleProduct(product.productId)">
                  <view class="check-inner" :class="{ 'is-checked': isProductSelected(product.productId) }">
                    <text v-if="isProductSelected(product.productId)" class="check-mark">✓</text>
                  </view>
                </label>

                <!-- 商品图 -->
                <image
                  class="product-image"
                  :src="product.image"
                  mode="aspectFill"
                />

                <!-- 商品信息 -->
                <view class="product-info">
                  <text class="product-name">{{ product.name }}</text>
                  <text class="product-code">货号：{{ product.code || '-' }}</text>
                  <view class="product-price">
                    <text class="price-text">¥{{ product.price.toFixed(2) }}</text>
                    <text class="price-unit">/ {{ product.unit }}</text>
                  </view>
                </view>

                <!-- 批量选规格按钮 -->
                <button class="variant-btn" @click="goToVariants(product.productId)">批量选规格</button>
              </view>

              <!-- 颜色分组列表 -->
              <view class="cart-variant-groups">
                <view
                  v-for="color in product.colors"
                  :key="color.colorId"
                  class="cart-color"
                  :class="{ 'is-expanded': isColorExpanded(color.colorId) }"
                >
                  <!-- 颜色行头部：勾选 + 颜色图 + 名称 + 展开按钮 -->
                  <view class="color-head">
                    <!-- 颜色级勾选 -->
                    <label class="check-box check-sm" @tap.stop="toggleColor(product.productId, color.colorId)">
                      <view class="check-inner check-sm-inner" :class="{ 'is-checked': isColorSelected(product.productId, color.colorId) }">
                        <text v-if="isColorSelected(product.productId, color.colorId)" class="check-mark check-sm-mark">✓</text>
                      </view>
                    </label>

                    <image
                      class="color-image"
                      :src="color.image"
                      mode="aspectFill"
                    />

                    <text class="color-summary">{{ color.colorName }} · {{ getColorSKUCount(color) }} 个尺码 · {{ getColorTotal(color) }} 件</text>

                    <!-- 展开/收起按钮 -->
                    <view class="expand-btn" @tap.stop="toggleExpand(color.colorId)">
                      <text class="expand-icon">{{ isColorExpanded(color.colorId) ? '⌃' : '⌄' }}</text>
                    </view>
                  </view>

                  <!-- 尺码行（展开时显示） -->
                  <view v-if="isColorExpanded(color.colorId)" class="cart-sizes">
                    <template v-if="getColorSizes(color).length > 0">
                      <view
                        v-for="size in getColorSizes(color)"
                        :key="size.sizeId"
                        class="size-row"
                      >
                        <text class="size-label">{{ size.sizeId }}</text>

                        <!-- 库存状态 -->
                        <text
                          class="stock-status"
                          :class="size.stock === 0 ? 'out' : ''"
                        >
                          {{ size.stock === 0 ? '缺货' : `库存 ${size.stock}` }}
                        </text>

                        <!-- 数量步进器 -->
                        <quantity-stepper
                          :model-value="size.quantity"
                          :min="0"
                          :max="size.stock"
                          :disabled="size.stock === 0"
                          :allow-input="true"
                          @update:model-value="(val) => updateSizeQty(product.productId, color.colorId, size.sizeId, val)"
                        />
                      </view>
                    </template>
                    <text v-else class="empty-hint">该颜色尚未选择尺码</text>
                  </view>
                </view>
              </view>
            </view>
          </template>
        </view>
      </AppContent>
    </template>

    <template #footer>
      <fixed-action-bar>
        <!-- 全选 -->
        <label class="select-all" @tap="toggleSelectAll">
          <view class="check-inner" :class="{ 'is-checked': cartStore.isSelectAll }">
            <text v-if="cartStore.isSelectAll" class="check-mark">✓</text>
          </view>
          <text class="select-all-text">全选</text>
        </label>

        <!-- 汇总信息 -->
        <view class="cart-total">
          <text class="total-text">{{ summaryText }}</text>
          <text class="total-amount">{{ formattedTotalAmount }}</text>
        </view>

        <!-- 去结算按钮 -->
        <button
          class="checkout-btn"
          :class="{ 'is-disabled': !hasSelection }"
          :disabled="!hasSelection"
          @click="goToCheckout"
        >
          去结算
        </button>
      </fixed-action-bar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed } from 'vue'
import { useCartStore } from '@/store/modules/cart.js'
import quantityStepper from '@/components/QuantityStepper/QuantityStepper.vue'
import AppPageState from '@/components/AppPageState/AppPageState.vue'
import fixedActionBar from '@/components/FixedActionBar/FixedActionBar.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import appHeader from '@/components/AppHeader/AppHeader.vue'
import AppContent from '@/components/AppContent/AppContent.vue'
import { safeNavigateTo } from '@/utils/routeGuard.js'

const cartStore = useCartStore()

// ========== 计算属性 ==========
const formattedTotalAmount = computed(() => cartStore.formattedTotalAmount)
const formattedRemaining = computed(() => {
  const remaining = cartStore.summary.remainingLimit
  return `¥${remaining.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`
})

const summaryText = computed(() => {
  const s = cartStore.summary
  return `已选 ${s.skuCount} 个 SKU · ${s.totalQuantity} 件`
})

const hasSelection = computed(() => cartStore.selectedSKUs.length > 0)

// ========== 选择状态方法 ==========
function isProductSelected(productId) {
  return cartStore.isProductFullySelected(productId)
}

function isColorSelected(productId, colorId) {
  const product = cartStore.products.find(p => p.productId === productId)
  if (!product) return false

  const color = product.colors?.find(c => c.colorId === colorId)
  if (!color) return false

  // 检查该颜色下所有有数量的 SKU 是否都选中（使用 Array.includes 替代 Set.has）
  return color.sizes
    ?.filter(s => s.quantity > 0)
    .every(s => cartStore.selectedSKUKeys.includes(`${productId}_${color.colorId}_${s.sizeId}`))
}

function isColorExpanded(colorId) {
  // 使用 Array.includes 替代 Set.has
  return cartStore.expandedColorIds.includes(colorId)
}

// ========== 数据方法 ==========
function getColorSKUCount(color) {
  return color.sizes?.filter(s => s.quantity > 0).length || 0
}

function getColorTotal(color) {
  return color.sizes?.reduce((sum, s) => sum + s.quantity, 0) || 0
}

function getColorSizes(color) {
  // 返回有数量或展开后显示缺货的尺码
  const expanded = isColorExpanded(color.colorId)
  return color.sizes?.filter(s =>
    s.quantity > 0 || (expanded && s.stock === 0)
  ) || []
}

// ========== 操作方法 ==========
function toggleProduct(productId) {
  cartStore.toggleProductSelect(productId)
}

function toggleColor(productId, colorId) {
  cartStore.toggleColorSelect(productId, colorId)
}

function toggleExpand(colorId) {
  cartStore.toggleColorExpand(colorId)
}

function toggleSelectAll() {
  cartStore.selectAll(!cartStore.isSelectAll)
}

function updateSizeQty(productId, colorId, sizeId, value) {
  cartStore.updateSKUQuantity(productId, colorId, sizeId, value)
}

// ========== 页面导航 - 使用统一导航 ==========
function goToProductList() {
  safeNavigateTo('/pages/product/list')
}

function goToVariants(productId) {
  safeNavigateTo('/pages/product/variants')
}

function goToCheckout() {
  if (!hasSelection.value) {
    uni.showToast({ title: '请先选择商品', icon: 'none' })
    return
  }

  // 检查金额上限
  if (cartStore.summary.isOverLimit) {
    uni.showModal({
      title: '超出购物车上限',
      content: `当前已选金额 ¥${cartStore.summary.totalAmount.toFixed(2)}，超过 10 万元上限。请减少商品数量后重试。`,
      showCancel: false,
      confirmText: '我知道了'
    })
    return
  }

  safeNavigateTo('/pages/checkout/index')
}
</script>

<style lang="scss" scoped>
/* ========== 风控提示条 ========== */
.risk-banner {
  min-height: 36px; /* 稳定 px */
  display: flex;
  align-items: center;
  padding: 0 16px;
  color: #B42318;
  background: #FFF1F2;
  border-bottom: 1px solid #FFE0E3;
  font-size: 12px; /* 稳定 px */
}

.risk-amount {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-left: 4px;
}

.cart-content {
  padding-bottom: env(safe-area-inset-bottom);
}

/* ========== 工具栏 ========== */
.cart-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.toolbar-title {
  font-size: 14px;
  color: #111216;
  font-weight: 500;
}

.toolbar-btn {
  border: 1px solid #D7192D;
  color: #D7192D;
  background: white;
  min-height: 34px; /* 稳定 px */
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;

  &:active {
    background: #FFF1F2;
  }
}

/* ========== 商品卡片 ========== */
.cart-product {
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}

.product-heading {
  display: grid;
  grid-template-columns: 24px 76px 1fr;
  gap: 10px;
  padding: 12px;
  align-items: start;
}

/* 复选框 */
.check-box {
  display: flex;
  align-items: center;
  padding-top: 2px;
}

.check-inner {
  width: 20px; /* 稳定 px */
  height: 20px;
  border: 1px solid #DEDFE3;
  border-radius: 50%;
  display: grid;
  place-items: center;

  &.is-checked {
    background: #D7192D;
    border-color: #D7192D;
  }
}

.check-sm .check-sm-inner {
  width: 18px;
  height: 18px;
}

.check-mark {
  color: white;
  font-size: 12px; /* 稳定 px */
}

.check-sm-mark {
  font-size: 11px;
}

/* 商品图 */
.product-image {
  width: 76px; /* 稳定 px */
  height: 76px;
  object-fit: cover;
  object-position: top;
  border-radius: 8px;
}

/* 商品信息 */
.product-info {
  display: flex;
  flex-direction: column;
}

.product-name {
  font-size: 14px; /* 稳定 px */
  font-weight: 500;
  color: #111216;
  line-height: 1.45;
}

.product-code {
  margin-top: 2px;
  color: #5E626B;
  font-size: 12px;
}

.product-price {
  margin-top: 3px;
}

.price-text {
  color: #D7192D;
  font-size: 15px;
  font-weight: 600;
}

.price-unit {
  color: #5E626B;
  font-size: 12px;
  font-weight: 400;
}

/* 批量选规格按钮 */
.variant-btn {
  grid-column: 3;
  justify-self: start;
  margin-top: 2px;
  border: 1px solid #D7192D;
  color: #D7192D;
  background: white;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;

  &:active {
    background: #FFF1F2;
  }
}

/* ========== 颜色分组 ========== */
.cart-variant-groups {
  border-top: 1px solid #EFEFF1;
  padding: 0 12px;
}

.cart-color {
  border-bottom: 1px solid #EFEFF1;

  &:last-child {
    border-bottom: none;
  }
}

.color-head {
  display: grid;
  grid-template-columns: 22px 42px 1fr auto;
  gap: 9px;
  align-items: center;
  min-height: 58px; /* 稳定 px */
}

.color-image {
  width: 40px; /* 稳定 px */
  height: 40px;
  object-fit: cover;
  object-position: top;
  border-radius: 7px;
}

.color-summary {
  font-size: 14px;
  font-weight: 600;
  color: #111216;
}

.expand-btn {
  min-width: 32px;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.6;
  }
}

.expand-icon {
  font-size: 17px;
  color: #5E626B;
}

/* 尺码行 */
.cart-sizes {
  padding: 0 0 8px 74px; /* 左侧缩进对齐颜色名 */
}

.size-row {
  display: grid;
  grid-template-columns: 30px 1fr auto;
  align-items: center;
  min-height: 46px; /* 稳定 px */
}

.size-label {
  font-size: 14px;
  font-weight: 600;
  color: #111216;
}

.stock-status {
  font-size: 12px;
  color: #168A52;

  &.out {
    color: #989BA3;
  }
}

.empty-hint {
  color: #989BA3;
  font-size: 13px;
  padding: 8px 0;
}

/* ========== 固定底部栏 ========== */
.select-all {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  &:active {
    opacity: 0.7;
  }
}

.select-all-text {
  font-size: 14px;
  color: #111216;
}

.cart-total {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: right;
}

.total-text {
  color: #5E626B;
  font-size: 11px; /* 稳定 px */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.total-amount {
  color: #D7192D;
  font-size: 18px; /* 稳定 px */
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.checkout-btn {
  height: 44px;
  padding: 0 20px;
  background: #D7192D;
  color: white;
  font-size: 14px;
  font-weight: 650;
  border: none;
  border-radius: 10px;
  white-space: nowrap;

  &:active:not(.is-disabled) {
    background: #B91224;
  }

  &.is-disabled {
    background: #EFEFF1;
    color: #989BA3;
  }
}
</style>
