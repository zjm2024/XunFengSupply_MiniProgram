<template>
  <view class="variants-page">
    <!-- 顶部导航 -->
    <app-header
      :show-back="true"
      :title="'批量选规格'"
      :show-cart="true"
      :cart-count="cartBadgeCount"
      @back="goBack"
      @cart="goToCart"
    />

    <!-- 滚动内容区 -->
    <scroll-view class="variant-scroll" scroll-y :style="{ height: scrollHeight }">
      <view class="variant-content">
        <!-- 商品摘要卡片 -->
        <view class="product-summary">
          <image class="summary-image" :src="product.image" mode="aspectFill" />
          <view class="summary-info">
            <text class="summary-name">{{ product.name }}</text>
            <view class="summary-price">
              <text class="price-text">¥{{ product.price.toFixed(2) }}</text>
              <text class="price-unit">/ {{ product.unit }}</text>
            </view>
            <text class="summary-moq">{{ product.moq }} 件起订</text>
          </view>
        </view>

        <!-- 规格选择面板 -->
        <view class="variant-panel">
          <!-- 颜色选择 -->
          <view class="section-heading">
            <text class="heading-title">颜色</text>
            <text class="heading-hint">切换颜色会保留已填数量</text>
          </view>

          <scroll-view class="color-options" scroll-x>
            <view 
              v-for="color in colors" 
              :key="color.id"
              class="color-option"
              :class="{ 'is-active': activeColor === color.id }"
              @click="selectColor(color.id)"
            >
              <image class="color-image" :src="color.image" mode="aspectFill" />
              <text class="color-name">{{ color.name }}</text>
              <text class="color-count">{{ getColorTotal(color.id) > 0 ? `已选 ${getColorTotal(color.id)} 件` : '未选择' }}</text>
              <!-- 选中标记 -->
              <view v-if="activeColor === color.id" class="color-check">
                <text class="check-icon">✓</text>
              </view>
            </view>
          </scroll-view>

          <!-- 尺码列表 -->
          <view class="size-section">
            <view class="section-heading size-heading">
              <text class="heading-title">尺码（{{ getActiveColorName() }}）</text>
              <view class="size-actions">
                <button class="text-btn" @click="showBulkModal">批量填数</button>
                <button class="text-btn" @click="showCopyModal">复制到其他颜色</button>
              </view>
            </view>

            <view class="size-rows">
              <view v-for="size in sizes" :key="size" class="size-row">
                <text class="size-label">{{ size }}</text>
                
                <!-- 库存状态 -->
                <text 
                  class="stock-status" 
                  :class="getStockClass(activeColor, size)"
                >
                  {{ getStockLabel(activeColor, size) }}
                </text>

                <!-- 数量步进器 -->
                <quantity-stepper
                  :model-value="getQuantity(activeColor, size)"
                  :min="0"
                  :max="getStock(activeColor, size)"
                  :disabled="getStock(activeColor, size) === 0"
                  :allow-input="true"
                  @update:model-value="(val) => updateQuantity(size, val)"
                />
              </view>
            </view>
          </view>
        </view>

        <!-- 底部安全区域预留 -->
        <view class="bottom-spacer"></view>
      </view>
    </scroll-view>

    <!-- 固定底部汇总栏 -->
    <fixed-action-bar>
      <view class="variant-summary">
        <text class="summary-text">{{ summaryText }}</text>
        <text class="summary-amount">¥{{ summaryAmount.toFixed(2) }}</text>
      </view>
      <button 
        class="batch-add-btn" 
        :class="{ 'is-disabled': summary.totalQuantity === 0 }"
        :disabled="summary.totalQuantity === 0"
        @click="batchAddToCart"
      >
        批量加入购物车
      </button>
    </fixed-action-bar>

    <!-- 批量填数弹窗 -->
    <confirm-popup
      v-model:visible="bulkModalVisible"
      :title="`批量填数 · ${getActiveColorName()}`"
      :preview-text="`将为当前颜色的 ${availableSizes.length} 个可售尺码填入数量，超过库存时自动使用可售上限。`"
      confirm-text="应用"
      @confirm="applyBulk"
    >
      <view class="modal-form">
        <!-- 填数模式 -->
        <label class="radio-option">
          <radio value="same" :checked="bulkMode === 'same'" @click="bulkMode = 'same'" />
          <text>每个尺码相同数量</text>
        </label>
        <label class="radio-option">
          <radio value="grow" :checked="bulkMode === 'grow'" @click="bulkMode = 'grow'" />
          <text>按尺码递增</text>
        </label>
        
        <!-- 数量输入 -->
        <label class="form-label">
          <text>每个尺码</text>
          <input 
            class="form-input" 
            type="number" 
            v-model="bulkValue"
            placeholder="请输入数量"
            :min="0"
            :max="999"
          />
        </label>
        
        <!-- 跳过缺货选项 -->
        <label class="checkbox-option">
          <checkbox :checked="skipOOS" @tap="skipOOS = !skipOOS" />
          <text>跳过缺货尺码</text>
        </label>
      </view>
    </confirm-popup>

    <!-- 复制数量弹窗 -->
    <confirm-popup
      v-model:visible="copyModalVisible"
      title="复制数量到其他颜色"
      :description="`把「${getActiveColorName()}」各尺码数量复制到 ${targetColors.map(c => `「${c.name}」`).join('、')}。缺货尺码将自动跳过，超过库存的数量按可售上限填入。`"
      preview-text="复制前保留目标颜色已有数量；确认后可继续逐项修改。"
      confirm-text="确认复制"
      @confirm="applyCopy"
    />
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useCartStore } from '@/store/modules/cart.js'
import appHeader from '@/components/AppHeader/AppHeader.vue'
import quantityStepper from '@/components/QuantityStepper/QuantityStepper.vue'
import fixedActionBar from '@/components/FixedActionBar/FixedActionBar.vue'
import confirmPopup from '@/components/ConfirmPopup/ConfirmPopup.vue'

const cartStore = useCartStore()

// ========== Mock 数据 ==========
const PRICE = 168

const colors = reactive([
  { id: 'red', name: '赤焰红', image: '/static/images/jersey-red.png' },
  { id: 'black', name: '曜石黑', image: '/static/images/jersey-black.png' },
  { id: 'white', name: '冰川白', image: '/static/images/jersey-white.png' }
])

const sizes = reactive(['S', 'M', 'L', 'XL', '2XL'])

const inventory = reactive({
  red:   { S: 200, M: 180, L: 36, XL: 80, '2XL': 0 },
  black: { S: 160, M: 142, L: 96, XL: 28, '2XL': 40 },
  white: { S: 120, M: 118, L: 88, XL: 56, '2XL': 20 }
})

// 各颜色各尺码数量（切换颜色时保留）
const quantities = reactive({
  red:   { S: 10, M: 10, L: 10, XL: 10, '2XL': 0 },
  black: { S: 6, M: 6, L: 6, XL: 6, '2XL': 0 },
  white: { S: 0, M: 0, L: 0, XL: 0, '2XL': 0 }
})

const product = reactive({
  id: 'T-100',
  name: '薰风专业比赛服 T-100',
  price: PRICE,
  unit: '件',
  moq: 20,
  image: '/static/images/jersey-red.png',
  colors: colors,
  inventory: inventory
})

// ========== 状态 ==========
const activeColor = ref('red')
const bulkModalVisible = ref(false)
const copyModalVisible = ref(false)
const bulkMode = ref('same') // same | grow
const bulkValue = ref(10)
const skipOOS = ref(true)
const scrollHeight = ref('calc(100vh - 200px)')

onMounted(() => {
  try {
    const sysInfo = uni.getSystemInfoSync()
    const navHeight = (sysInfo.statusBarHeight || 44) + 56 + 144
    scrollHeight.value = `calc(100vh - ${navHeight}px)`
  } catch (e) {
    // 使用默认值
  }
})

// ========== 计算属性 ==========
const cartBadgeCount = computed(() => cartStore.summary.skuCount)

// 可用尺码（排除缺货）
const availableSizes = computed(() => {
  return sizes.filter(s => inventory[activeColor.value][s] > 0)
})

// 目标颜色（用于复制）
const targetColors = computed(() => {
  return colors.filter(c => c.id !== activeColor.value)
})

// 汇总信息
const summary = computed(() => {
  let colorCount = 0
  let skuCount = 0
  let count = 0

  colors.forEach(color => {
    let hasColor = false
    sizes.forEach(size => {
      const qty = quantities[color.id][size]
      if (qty > 0) {
        hasColor = true
        skuCount++
        count += qty
      }
    })
    if (hasColor) colorCount++
  })

  return {
    colorCount,
    skuCount,
    totalQuantity: count,
    amount: count * PRICE
  }
})

const summaryText = computed(() => {
  return `已选 ${summary.value.colorCount} 个颜色 · ${summary.value.skuCount} 个 SKU · ${summary.value.totalQuantity} 件`
})

const summaryAmount = computed(() => summary.value.amount)

// ========== 方法 ==========
function selectColor(colorId) {
  activeColor.value = colorId
}

function getActiveColorName() {
  return colors.find(c => c.id === activeColor.value)?.name || ''
}

function getColorTotal(colorId) {
  return sizes.reduce((sum, size) => sum + quantities[colorId][size], 0)
}

function getStock(colorId, size) {
  return inventory[colorId]?.[size] || 0
}

function getQuantity(colorId, size) {
  return quantities[colorId]?.[size] || 0
}

function getStockLabel(colorId, size) {
  const stock = getStock(colorId, size)
  if (stock <= 0) return '缺货'
  if (stock <= 100) return `仅剩 ${stock} 件`
  return '有货'
}

function getStockClass(colorId, size) {
  const stock = getStock(colorId, size)
  if (stock <= 0) return 'out'
  if (stock <= 100) return 'low'
  return ''
}

function updateQuantity(size, value) {
  if (!quantities[activeColor.value]) {
    quantities[activeColor.value] = {}
  }
  quantities[activeColor.value][size] = Math.max(0, Math.min(value, getStock(activeColor.value, size)))
}

// 批量填数
function showBulkModal() {
  bulkModalVisible.value = true
}

function applyBulk() {
  const base = Math.max(0, parseInt(bulkValue.value) || 0)
  let increment = 0

  sizes.forEach(size => {
    const stock = inventory[activeColor.value][size]
    
    // 跳过缺货
    if (stock === 0 && skipOOS.value) return
    
    const desired = bulkMode.value === 'grow' ? base + increment * 2 : base
    quantities[activeColor.value][size] = Math.min(desired, stock)
    increment++
  })

  bulkModalVisible.value = false
  uni.showToast({ title: '已完成批量填数', icon: 'success' })
}

// 复制到其他颜色
function showCopyModal() {
  copyModalVisible.value = true
}

function applyCopy() {
  targetColors.value.forEach(color => {
    sizes.forEach(size => {
      const sourceQty = quantities[activeColor.value][size]
      const targetStock = inventory[color.id][size]
      
      // 缺货的跳过
      if (targetStock === 0) return
      
      quantities[color.id][size] = Math.min(sourceQty, targetStock)
    })
  })

  copyModalVisible.value = false
  uni.showToast({ title: '已复制到其他颜色', icon: 'success' })
}

// 批量加入购物车
function batchAddToCart() {
  if (summary.value.totalQuantity === 0) return

  // 构建要添加的数据结构
  const quantitiesToAdd = {}
  colors.forEach(color => {
    quantitiesToAdd[color.id] = {}
    sizes.forEach(size => {
      if (quantities[color.id][size] > 0) {
        quantitiesToAdd[color.id][size] = quantities[color.id][size]
      }
    })
  })

  cartStore.batchAddToCart({
    productId: product.id,
    name: product.name,
    code: 'XF-T100',
    price: product.price,
    image: product.image,
    unit: product.unit,
    moq: product.moq,
    colors: colors.map(c => ({ id: c.id, name: c.name, image: c.image })),
    inventory: inventory
  }, quantitiesToAdd)

  uni.showToast({ title: '已批量加入购物车', icon: 'success' })
  
  // 可选：跳转到购物车或继续选购
  setTimeout(() => {
    goToCart()
  }, 1500)
}

// 页面导航
function goBack() {
  uni.navigateBack()
}

function goToCart() {
  uni.navigateTo({
    url: '/pages/cart/index'
  })
}
</script>

<style lang="scss" scoped>
.variants-page {
  min-height: 100vh;
  background: #F7F7F8;
}

.variant-scroll {
  flex: 1;
}

.variant-content {
  max-width: 1400rpx; /* 约 700px，平板端更宽 */
  width: 100%;
  margin: 0 auto;
  padding: 24rpx 32rpx;
  
  @media screen and (min-width: 768px) {
    padding: 24rpx 48rpx;
  }
}

/* ========== 商品摘要 ========== */
.product-summary {
  display: flex;
  gap: 24rpx;
  background: white;
  border: 2rpx solid #EFEFF1;
  padding: 24rpx;
  border-radius: 24rpx;
}

.summary-image {
  width: 144rpx; /* 72px */
  height: 144rpx;
  border-radius: 16rpx;
  object-fit: cover;
  object-position: top;
}

.summary-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.summary-name {
  font-size: 30rpx; /* 15px */
  font-weight: 600;
  color: #111216;
  margin-bottom: 8rpx;
}

.summary-price {
  display: flex;
  align-items: baseline;
}

.price-text {
  color: #D7192D;
  font-size: 36rpx; /* 18px */
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.price-unit {
  color: #5E626B;
  font-size: 24rpx;
  margin-left: 4rpx;
}

.summary-moq {
  margin-top: 4rpx;
  color: #5E626B;
  font-size: 24rpx;
}

/* ========== 规格面板 ========== */
.variant-panel {
  margin-top: 24rpx;
  background: white;
  border: 2rpx solid #EFEFF1;
  border-radius: 24rpx;
  padding: 28rpx;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.heading-title {
  font-size: 32rpx; /* 16px */
  font-weight: 600;
  color: #111216;
}

.heading-hint {
  color: #989BA3;
  font-size: 22rpx; /* 11px */
}

.size-heading {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid #EFEFF1;
}

.size-actions {
  display: flex;
  gap: 16rpx;
}

.text-btn {
  min-height: 68rpx; /* 34px */
  padding: 0 8rpx;
  background: transparent;
  border: none;
  color: #D7192D;
  font-size: 24rpx; /* 12px */
  
  &:active {
    opacity: 0.6;
  }
}

/* ========== 颜色选择 ========== */
.color-options {
  display: flex;
  gap: 20rpx;
  padding: 4rpx 4rpx 20rpx;
  white-space: nowrap;
}

.color-option {
  width: 200rpx; /* 100px */
  min-width: 200rpx;
  border: 2rpx solid #DEDFE3;
  background: white;
  border-radius: 20rpx;
  padding: 8rpx;
  position: relative;
  
  &.is-active {
    border: 4rpx solid #D7192D;
    padding: 6rpx;
  }
  
  &:active {
    opacity: 0.85;
  }
}

.color-image {
  width: 100%;
  height: 172rpx; /* 86px */
  object-fit: cover;
  object-position: top;
  border-radius: 14rpx;
}

.color-name {
  display: block;
  margin: 8rpx 4rpx 0;
  font-size: 26rpx; /* 13px */
  font-weight: 600;
  color: #111216;
}

.color-count {
  display: block;
  color: #5E626B;
  font-size: 22rpx; /* 11px */
  margin: 0 4rpx 4rpx;
}

.color-check {
  position: absolute;
  right: 12rpx;
  bottom: 14rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #D7192D;
  display: grid;
  place-items: center;
}

.check-icon {
  color: white;
  font-size: 22rpx; /* 11px */
}

/* ========== 尺码行 ========== */
.size-rows {
  border-top: 2rpx solid #EFEFF1;
}

.size-row {
  display: grid;
  grid-template-columns: 92rpx 1fr auto;
  align-items: center;
  min-height: 112rpx; /* 56px */
  border-bottom: 2rpx solid #EFEFF1;
  
  &:last-child {
    border-bottom: none;
  }
}

.size-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #111216;
}

.stock-status {
  font-size: 24rpx; /* 12px */
  
  &.low {
    color: #B76500;
  }
  
  &.out {
    color: #989BA3;
  }
  
  &:not(.low):not(.out) {
    color: #168A52;
  }
}

/* ========== 底部汇总栏 ========== */
.bottom-spacer {
  height: 184rpx;
}

.variant-summary {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.summary-text {
  color: #5E626B;
  font-size: 22rpx; /* 11px */
}

.summary-amount {
  color: #D7192D;
  font-size: 40rpx; /* 20px */
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.batch-add-btn {
  height: 88rpx;
  padding: 0 40rpx;
  background: #D7192D;
  color: white;
  font-size: 28rpx;
  font-weight: 650;
  border: none;
  border-radius: 20rpx;
  white-space: nowrap;
  
  &:active:not(.is-disabled) {
    background: #B91224;
  }
  
  &.is-disabled {
    background: #EFEFF1;
    color: #989BA3;
  }
}

/* ========== 弹窗表单 ========== */
.modal-form {
  display: grid;
  gap: 24rpx;
}

.radio-option {
  display: flex !important;
  align-items: center;
  gap: 12rpx;
  min-height: 96rpx; /* 48px */
  border-bottom: 2rpx solid #EFEFF1;
  font-size: 28rpx;
  color: #111216;
  
  radio {
    accent-color: #D7192D;
  }
}

.form-label {
  display: grid;
  gap: 12rpx;
  font-size: 28rpx;
  color: #5E626B;
}

.form-input {
  height: 96rpx;
  border: 2rpx solid #DEDFE3;
  border-radius: 20rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: #111216;
  background: white;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 28rpx;
  color: #111216;
  
  checkbox {
    accent-color: #D7192D;
  }
}
</style>
