<template>
  <AppPageShell>
    <template #header>
      <app-header title="购物车" :show-back="true" @back="goBack" />
    </template>

    <template #content>
      <AppContent>
        <app-page-state
          :state="pageState"
          :title="stateTitle"
          :description="stateDescription"
          :action-text="pageState === PageStatus.EMPTY ? '去选商品' : '重新加载'"
          :has-stale-content="hasStaleForDisplay"
          icon-type="cart"
          @retry="refreshCart"
          @action="goToProductList"
        >
          <!-- 骨架屏插槽 -->
          <template #skeleton>
            <view class="cart-skeleton">
              <view class="sk-bar skeleton-block" />
              <view v-for="i in 3" :key="i" class="sk-card">
                <view class="sk-check skeleton-block" />
                <view class="sk-img skeleton-block" />
                <view class="sk-info">
                  <view class="sk-line skeleton-block" />
                  <view class="sk-line short skeleton-block" />
                  <view class="sk-line shorter skeleton-block" />
                </view>
              </view>
            </view>
          </template>

          <!-- 正常内容 -->
          <template #default>
            <view class="cart-layout">
              <!-- 主体区域 -->
              <view class="cart-main">
                <!-- 顶部工具栏 -->
                <view class="cart-toolbar">
                  <view class="toolbar-left">
                    <text class="toolbar-title">采购清单</text>
                    <text class="toolbar-desc">
                      {{ cartStore.items.length }} 种商品，共 {{ cartStore.summary.allQuantity }} 件
                    </text>
                  </view>
                  <button class="outline-btn" @click="goToProductList">继续选购</button>
                </view>

                <!-- 同步状态提示 -->
                <view v-if="cartStore.syncHint" class="sync-hint">
                  <text class="sync-dot" />
                  <text class="sync-text">{{ cartStore.syncHint }}</text>
                </view>

                <!-- flush 错误提示 -->
                <view v-if="flushError" class="sync-hint is-error">
                  <text class="sync-text">同步失败：{{ flushError.message || '请稍后重试' }}</text>
                  <button class="retry-link" @click="retryFlush">重试</button>
                </view>

                <!-- 失效商品区 -->
                <view v-if="cartStore.invalidItems.length > 0" class="invalid-section">
                  <view class="invalid-header">
                    <text class="invalid-title">{{ cartStore.invalidSummaryText }}</text>
                    <button class="link-btn" @click="removeInvalidItems">清空失效</button>
                  </view>
                  <view class="cart-list">
                    <view v-for="item in cartStore.invalidItems" :key="item.cartItemId" class="cart-card is-invalid">
                      <view class="invalid-tag">失效</view>
                      <image class="product-image" :src="item.image" mode="aspectFit" />
                      <view class="product-info">
                        <text class="product-name">{{ item.name || `商品 ${item.productId}` }}</text>
                        <text class="product-code">编号：{{ item.code || item.productId }}</text>
                        <text class="invalid-reason">{{ item.invalidReason || '商品已下架或不可采购' }}</text>
                      </view>
                      <button class="delete-btn" @click="deleteOne(item.cartItemId)">移除</button>
                    </view>
                  </view>
                </view>

                <!-- 有效商品列表 -->
                <view class="cart-list">
                  <view v-for="item in cartStore.validItems" :key="item.cartItemId" class="cart-card">
                    <!-- 选择框 -->
                    <label class="check-wrap" @tap.stop="onToggleSelect(item)">
                      <view class="check" :class="{ checked: isSelected(item) }">
                        <text v-if="isSelected(item)">✓</text>
                      </view>
                    </label>

                    <!-- 商品图 -->
                    <image
                      class="product-image"
                      :src="item.image"
                      mode="aspectFit"
                      @click="goToDetail(item.productId)"
                    />

                    <!-- 商品信息 -->
                    <view class="product-info">
                      <text class="product-name" @click="goToDetail(item.productId)">
                        {{ item.name || `商品 ${item.productId}` }}
                      </text>
                      <text class="product-code">编号：{{ item.code || item.productId }}</text>

                      <!-- SKU 规格 -->
                      <text v-if="item.skuName" class="sku-spec">
                        规格：{{ item.skuName }}
                      </text>

                      <!-- 价格行 -->
                      <view class="price-line">
                        <text class="price">¥{{ Number(item.price).toFixed(2) }}</text>
                        <text class="unit">/ {{ unitText(item) }}</text>
                      </view>

                      <!-- 数量控制 -->
                      <view class="quantity-row">
                        <QuantityStepper
                          :model-value="item.quantity"
                          :min="Number(item.minOrderQty) || 1"
                          :max="Number(item.stock) || 9999"
                          :step="1"
                          size="sm"
                          @change="(val) => onQuantityChange(item, val)"
                          @plus="(val) => onQuantityChange(item, val)"
                          @minus="(val) => onQuantityChange(item, val)"
                        />
                        <button class="delete-icon-btn" @click="deleteOne(item.cartItemId)">
                          <text class="trash-icon">🗑</text>
                        </button>
                      </view>
                    </view>

                    <!-- 小计 -->
                    <text class="subtotal">¥{{ subtotal(item) }}</text>
                  </view>
                </view>
              </view>

              <!-- 侧栏汇总 -->
              <view v-if="cartStore.validItems.length > 0" class="summary-card">
                <text class="summary-title">采购汇总</text>
                <view class="summary-row">
                  <text>已选商品</text>
                  <text>{{ cartStore.summary.selectedCount }} 种</text>
                </view>
                <view class="summary-row">
                  <text>已选数量</text>
                  <text>{{ cartStore.summary.selectedQuantity }} 件</text>
                </view>
                <view class="summary-row">
                  <text>未选数量</text>
                  <text>{{ cartStore.summary.totalQuantity - cartStore.summary.selectedQuantity }} 件</text>
                </view>
                <view class="summary-divider" />
                <view class="summary-row total">
                  <text>商品金额</text>
                  <text class="total-amount">{{ cartStore.formattedTotalAmount }}</text>
                </view>
                <view v-if="cartStore.summary.invalidCount > 0" class="summary-row">
                  <text>含失效商品</text>
                  <text>{{ cartStore.summary.invalidCount }} 件</text>
                </view>
                <view v-if="cartStore.summary.remainingLimit < 100000" class="limit-hint">
                  <text>距 ¥100,000 限额还可采购 ¥{{ cartStore.summary.remainingLimit.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</text>
                </view>
                <text v-if="cartStore.summary.isOverLimit" class="risk-text">
                  已超过 10 万元单次采购上限，请分批结算。
                </text>
              </view>
            </view>
          </template>
        </app-page-state>
      </AppContent>
    </template>

    <!-- 底部结算栏 -->
    <template #footer>
      <fixed-action-bar v-if="pageState === PageStatus.CONTENT">
        <label class="select-all" @tap="onSelectAll(!cartStore.isSelectAll)">
          <view class="check" :class="{ checked: cartStore.isSelectAll }">
            <text v-if="cartStore.isSelectAll">✓</text>
          </view>
          <text>全选</text>
        </label>
        <view class="footer-spacer" />
        <view class="footer-total">
          <text class="footer-label">已选 {{ cartStore.summary.selectedQuantity }} 件</text>
          <text class="footer-amount">{{ cartStore.formattedTotalAmount }}</text>
        </view>
        <button
          class="checkout-btn"
          :disabled="!canCheckout"
          @click="goToCheckout"
        >
          去结算
        </button>
      </fixed-action-bar>
    </template>
  </AppPageShell>

  <!-- 确认删除弹窗 -->
  <ConfirmPopup
    v-model="showDeleteConfirm"
    title="确认移除"
    :description="deleteConfirmText"
    confirm-text="移除"
    :danger="true"
    @confirm="confirmDelete"
  />
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { useCart } from '../../composables/useCart.js'
import { PageStatus } from '../../../../shared/model/pageState.js'
import { navigator } from '../../../../app/navigation/navigator.js'
import { routes } from '../../../../app/config/routes.js'
import AppPageShell from '../../../../shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '../../../../shared/ui/AppContent/AppContent.vue'
import AppPageState from '../../../../shared/ui/AppPageState/AppPageState.vue'
import appHeader from '../../../../shared/ui/AppHeader/AppHeader.vue'
import fixedActionBar from '../../../../shared/ui/FixedActionBar/FixedActionBar.vue'
import QuantityStepper from '../../components/QuantityStepper/QuantityStepper.vue'
import ConfirmPopup from '../../../../shared/ui/ConfirmPopup/ConfirmPopup.vue'

// ==================== Cart Hook ====================
const {
  cartStore,
  loadCart,
  toggleSelect,
  selectAllItems,
  setItemQuantity,
  deleteItems,
  flush,
  flushError,
} = useCart()

// ==================== 本地 UI 状态 ====================
const loadFailed = ref(false)
const loadError = ref('')
const deletingIds = ref([])
const showDeleteConfirm = ref(false)
const deleteConfirmText = ref('')
let pendingDeleteIds = null

// ==================== 页面状态 ====================
const pageState = computed(() => {
  if (cartStore.loading && !cartStore.loaded) return PageStatus.LOADING
  if (loadFailed.value && !cartStore.loaded) return PageStatus.ERROR
  if (cartStore.isEmpty) return PageStatus.EMPTY
  return PageStatus.CONTENT
})

const stateTitle = computed(() =>
  pageState.value === PageStatus.EMPTY ? '购物车为空' : '购物车加载失败',
)

const stateDescription = computed(() =>
  pageState.value === PageStatus.EMPTY
    ? '从商品目录选择需要采购的商品'
    : (loadError.value || '网络异常，请稍后重试'),
)

/** 首屏失败但有旧内容可展示 */
const hasStaleForDisplay = computed(() =>
  loadFailed.value && cartStore.loaded && cartStore.items.length > 0,
)

/** 是否能结算 */
const canCheckout = computed(() =>
  cartStore.hasSelected && !cartStore.summary.isOverLimit,
)

// ==================== 事件处理 ====================

/** 刷新购物车 */
async function refreshCart() {
  loadFailed.value = false
  loadError.value = ''
  try {
    await loadCart()
  } catch (error) {
    loadFailed.value = true
    loadError.value = error?.message || '网络异常，请稍后重试'
    console.error('[Cart] 加载购物车失败:', error)
  }
}

/** 重试 flush */
async function retryFlush() {
  try {
    await flush()
  } catch (err) {
    console.warn('[Cart] flush 重试失败:', err)
  }
}

/** 单项选择切换 */
function onToggleSelect(item) {
  toggleSelect(item)
}

/** 全选/取消全选 */
function onSelectAll(selected) {
  selectAllItems(Boolean(selected))
}

/** 数据驱动的选择状态 */
function isSelected(item) {
  return cartStore.isItemSelected(item)
}

/** 数量变更 */
function onQuantityChange(item, newQty) {
  if (!item || Number(newQty) === Number(item.quantity)) return
  setItemQuantity(item, Number(newQty))
}

/** 删除单项：弹确认 */
function deleteOne(cartItemId) {
  const item = cartStore.items.find(i => String(i.cartItemId) === String(cartItemId))
  if (!item) return
  pendingDeleteIds = [Number(cartItemId)]
  deleteConfirmText.value = `确定从购物车移除「${item.name || '该商品'}」？`
  showDeleteConfirm.value = true
}

/** 移除失效商品 */
function removeInvalidItems() {
  const ids = cartStore.invalidItems.map(i => Number(i.cartItemId))
  if (ids.length === 0) return
  pendingDeleteIds = ids
  deleteConfirmText.value = `确定清空 ${ids.length} 件失效商品？`
  showDeleteConfirm.value = true
}

/** 确认删除 */
function confirmDelete() {
  if (!pendingDeleteIds || pendingDeleteIds.length === 0) return
  deleteItems(pendingDeleteIds)
  pendingDeleteIds = null
  showDeleteConfirm.value = false
}

function goToDetail(productId) {
  if (!productId) return
  navigator.navigateTo(routes.commerce.productDetail(productId))
}

function goToProductList() {
  navigator.navigateTo(routes.commerce.productList())
}

async function goToCheckout() {
  if (!canCheckout.value) return
  try {
    await flush()
    navigator.navigateTo(routes.commerce.checkout())
  } catch (err) {
    console.error('[Cart] flush 失败，禁止结算:', err)
    if (typeof uni !== 'undefined') {
      uni.showToast({ title: '同步购物车失败，请重试后结算', icon: 'none' })
    }
  }
}

function goBack() {
  navigator.back()
}

// ==================== 工具函数 ====================
function unitText(item) {
  return item.unit || '件'
}

function subtotal(item) {
  const value = Number(item.price || 0) * Number(item.quantity || 0)
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ==================== 生命周期 ====================
onShow(refreshCart)

onHide(() => {
  // 页面隐藏时尽力 flush（不阻塞，不阻塞 UI）
  flush().catch(err => console.warn('[Cart] onHide flush 失败:', err))
})

onUnload(() => {
  // ⚠️ 调度器是单例，页面卸载时只 flush，不 dispose
  // 避免破坏其他页面的待同步队列
  flush().catch(err => console.warn('[Cart] onUnload flush 失败:', err))
})

onBeforeUnmount(() => {
  // 兜底 flush（不 dispose 单例）
  flush().catch(() => {})
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variable.scss' as *;

// ==================== 布局 ====================
.cart-layout {
  padding: 12px 0 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cart-main {
  min-width: 0;
}

// ==================== 顶部工具栏 ====================
.cart-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.toolbar-left {
  display: flex;
  flex-direction: column;
}

.toolbar-title {
  color: $color-text-primary;
  font-size: 16px;
  font-weight: 650;
}

.toolbar-desc {
  margin-top: 3px;
  color: $color-gray-400;
  font-size: 12px;
}

.outline-btn {
  height: 36px;
  padding: 0 13px;
  color: $color-brand-500;
  background: $color-bg-card;
  border: 1px solid $color-brand-500;
  border-radius: 9px;
  font-size: 13px;
  flex-shrink: 0;
}

// ==================== 同步提示 ====================
.sync-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: $color-brand-50;
  border: 1px solid rgba(215, 25, 45, 0.15);
  border-radius: 8px;

  &.is-error {
    background: $color-error-bg;
    border-color: rgba(180, 35, 24, 0.2);

    .sync-text {
      color: $color-error;
      flex: 1;
    }
  }
}

.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $color-brand-500;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.sync-text {
  color: $color-brand-700;
  font-size: 12px;
}

.retry-link {
  color: $color-brand-500;
  font-size: 12px;
  background: transparent;
  border: none;
  padding: 0 4px;
}

// ==================== 失效商品 ====================
.invalid-section {
  margin-bottom: 16px;
}

.invalid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 0 2px;
}

.invalid-title {
  color: $color-warning;
  font-size: 12px;
  font-weight: 500;
}

.link-btn {
  color: $color-brand-500;
  font-size: 12px;
  background: transparent;
  border: none;
  padding: 4px 8px;
}

// ==================== 购物车列表 ====================
.cart-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cart-card {
  position: relative;
  display: grid;
  grid-template-columns: 22px 76px minmax(0, 1fr);
  gap: 10px;
  padding: 13px;
  background: $color-bg-card;
  border: 1px solid $color-border-default;
  border-radius: $radius-card;

  &.is-invalid {
    opacity: 0.65;
    background: $color-bg-subtle;
    border-style: dashed;
  }
}

.invalid-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  padding: 2px 6px;
  color: $color-warning;
  background: $color-warning-bg;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.invalid-reason {
  display: block;
  margin-top: 4px;
  color: $color-warning;
  font-size: 11px;
}

.check-wrap {
  padding-top: 2px;
}

.check {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  flex: 0 0 20px;
  color: white;
  background: white;
  border: 1px solid $color-gray-300;
  border-radius: 50%;
  font-size: 11px;
}

.check.checked {
  background: $color-brand-500;
  border-color: $color-brand-500;
}

.product-image {
  width: 76px;
  height: 76px;
  background: $color-bg-subtle;
  border-radius: 9px;
}

.product-info {
  min-width: 0;
  padding-right: 54px;
}

.product-name {
  display: -webkit-box;
  overflow: hidden;
  color: $color-text-primary;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-code {
  display: block;
  margin-top: 3px;
  color: $color-gray-400;
  font-size: 11px;
}

.sku-spec {
  display: block;
  margin-top: 3px;
  color: $color-text-secondary;
  font-size: 11px;
}

.price-line {
  display: flex;
  align-items: baseline;
  margin-top: 7px;
}

.price {
  color: $color-brand-500;
  font-size: 16px;
  font-weight: 700;
}

.unit {
  margin-left: 3px;
  color: $color-gray-400;
  font-size: 11px;
}

// ==================== 数量行 ====================
.quantity-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.delete-icon-btn {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  flex-shrink: 0;

  &:active {
    background: $color-bg-subtle;
  }
}

.trash-icon {
  font-size: 16px;
}

.delete-btn {
  align-self: flex-start;
  height: 28px;
  padding: 0 10px;
  color: $color-text-secondary;
  background: $color-bg-subtle;
  border: 1px solid $color-border-default;
  border-radius: 6px;
  font-size: 11px;
}

// ==================== 小计 ====================
.subtotal {
  position: absolute;
  top: 13px;
  right: 13px;
  color: $color-text-primary;
  font-size: 13px;
  font-weight: 650;
}

// ==================== 汇总卡 ====================
.summary-card {
  padding: 16px;
  background: $color-bg-card;
  border: 1px solid $color-border-default;
  border-radius: $radius-card;
}

.summary-title {
  display: block;
  margin-bottom: 12px;
  color: $color-text-primary;
  font-size: 15px;
  font-weight: 650;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-top: 9px;
  color: $color-text-secondary;
  font-size: 13px;

  &.total {
    color: $color-text-primary;
    font-weight: 650;
  }
}

.total-amount {
  color: $color-brand-500;
  font-size: 19px;
  font-weight: 700;
}

.summary-divider {
  height: 1px;
  margin: 14px 0;
  background: $color-gray-100;
}

.limit-hint {
  margin-top: 8px;
  padding: 6px 10px;
  background: $color-brand-50;
  border-radius: 6px;
  color: $color-brand-700;
  font-size: 11px;
}

.risk-text {
  display: block;
  margin-top: 10px;
  color: $color-error;
  font-size: 11px;
  line-height: 1.5;
}

// ==================== 底部栏 ====================
.select-all {
  display: flex;
  align-items: center;
  gap: 6px;
  color: $color-text-primary;
  font-size: 13px;
}

.footer-spacer {
  flex: 1;
  min-width: 12px;
}

.footer-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.footer-label {
  color: $color-gray-400;
  font-size: 10px;
}

.footer-amount {
  color: $color-brand-500;
  font-size: 18px;
  font-weight: 700;
}

.checkout-btn {
  height: 44px;
  min-width: 106px;
  padding: 0 20px;
  color: #FFFFFF;
  background: $color-brand-500;
  border: 0;
  border-radius: $radius-control;
  font-size: 14px;
  font-weight: 650;

  &[disabled] {
    color: $color-text-disabled;
    background: $color-bg-subtle;
  }
}

// ==================== 骨架屏 ====================
.cart-skeleton {
  padding: 12px 0;
}

.sk-bar {
  width: 120px;
  height: 18px;
  margin-bottom: 24px;
}

.sk-card {
  display: grid;
  grid-template-columns: 22px 76px minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.sk-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.sk-img {
  width: 76px;
  height: 76px;
  border-radius: 9px;
}

.sk-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.sk-line {
  width: 100%;
  height: 14px;

  &.short { width: 60%; }
  &.shorter { width: 35%; }
}

.skeleton-block {
  background: linear-gradient(90deg, #F7F7F8 25%, #EFEFF1 50%, #F7F7F8 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

// ==================== 窄屏优先 ====================

// ==================== 平板横屏 ====================
@media screen and (min-width: 840px) {
  .cart-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 18px;
    padding-top: 20px;
  }

  .summary-card {
    position: sticky;
    top: 20px;
    align-self: start;
    margin-top: 0;
  }

  .cart-card {
    grid-template-columns: 22px 92px minmax(0, 1fr);
    padding: 16px;
  }

  .product-image {
    width: 92px;
    height: 92px;
  }

  .product-info {
    padding-right: 82px;
  }
}
</style>
