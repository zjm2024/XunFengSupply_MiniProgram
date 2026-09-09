<template>
  <AppPageShell>
    <template #header>
      <app-header title="确认订单" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <app-page-state
          :state="pageState"
          title="订单加载失败"
          :description="errorMessage"
          action-text="重新加载"
          icon-type="order"
          @retry="loadCheckoutData"
        >
          <view class="checkout-content">
            <!-- 收货信息 -->
            <view class="address-card">
              <view class="address-info">
                <text class="address-name">默认收货信息</text>
                <text class="address-detail">提交后由订单服务按经销商档案确认</text>
              </view>
            </view>

            <!-- 订单商品 -->
            <view class="checkout-card">
              <view class="card-header">
                <text class="card-title">订单商品</text>
                <text class="card-count">{{ checkoutItems.length }} 个 SKU · {{ totalQuantity }} 件</text>
              </view>

              <view v-for="item in checkoutItems" :key="item.cartItemId" class="product-row">
                <AppProductImage class="product-image" :src="item.image" :stock="item.stock" />
                <view class="product-info">
                  <text class="product-name">{{ item.name }}</text>
                  <text class="product-spec">{{ item.code || `商品 ${item.productId}` }} · {{ item.quantity }} {{ item.unit }}</text>
                </view>
                <text class="product-price">¥{{ (item.price * item.quantity).toFixed(2) }}</text>
              </view>
            </view>

            <!-- 配送设置 -->
            <view class="settings-list">
              <view class="setting-item">
                <text>配送方式</text>
                <text class="setting-value">默认</text>
              </view>
              <view class="setting-item">
                <text>发票</text>
                <text class="setting-value">暂不开票</text>
              </view>
            </view>
          </view>
        </app-page-state>
      </AppContent>
    </template>

    <template #footer>
      <fixed-action-bar v-if="pageState === PageStatus.CONTENT">
        <view class="amount-section">
          <view class="amount-item">
            <text>商品金额</text>
            <text>¥{{ totalAmount.toFixed(2) }}</text>
          </view>
          <view class="amount-item payable">
            <text>应付</text>
            <text class="payable-text">¥{{ totalAmount.toFixed(2) }}</text>
          </view>

          <label class="agreement-label">
            <checkbox :checked="agreed" @tap="agreed = !agreed" />
            <text>我已阅读并同意《经销商交易协议》</text>
          </label>

          <button
            class="submit-btn"
            :disabled="!agreed || checkoutItems.length === 0 || submitting"
            :class="{ 'is-disabled': !agreed || checkoutItems.length === 0 || submitting }"
            @click="submitOrder"
          >{{ submitting ? '提交中…' : '提交订单' }}</button>
        </view>
      </fixed-action-bar>
    </template>
  </AppPageShell>

  <!-- 提交确认弹窗 -->
  <confirm-popup
    v-model:visible="confirmModalVisible"
    title="确认提交订单？"
    description="提交后将进入品牌审核流程。在线支付成功后锁定库存，授信或对公订单提交后即锁定库存。"
    confirm-text="确认提交"
    @confirm="confirmSubmit"
  />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '../../model/cartStore.js'
import { createOrder, generateClientRequestId } from '../../api/checkoutApi.js'
import { PageStatus } from '@/shared/model/pageState.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import fixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import confirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const cartStore = useCartStore()

const agreed = ref(false)
const confirmModalVisible = ref(false)
const submitting = ref(false)
const pageState = ref(PageStatus.LOADING)
const errorMessage = ref('')
const clientRequestId = ref('')

// 只在购物车 store 中读取选中项
const checkoutItems = computed(() => cartStore.selectedItems)
const totalQuantity = computed(() => cartStore.summary.selectedQuantity)
const totalAmount = computed(() => cartStore.summary.selectedAmount)

onMounted(() => {
  loadCheckoutData()
})

function loadCheckoutData() {
  if (checkoutItems.value.length === 0) {
    pageState.value = PageStatus.EMPTY
    errorMessage.value = '购物车中没有选中商品'
    return
  }
  pageState.value = PageStatus.CONTENT
}

function submitOrder() {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意交易协议', icon: 'none' })
    return
  }
  confirmModalVisible.value = true
}

async function confirmSubmit() {
  confirmModalVisible.value = false
  submitting.value = true

  // 幂同键：重试复用同一 ClientRequestId
  if (!clientRequestId.value) {
    clientRequestId.value = generateClientRequestId()
  }

  try {
    const response = await createOrder({
      clientRequestId: clientRequestId.value,
      items: checkoutItems.value.map(item => ({
        skuId: item.skuId,
        quantity: item.quantity,
      })),
      deliveryType: 1,
      paymentMode: 1,
    })
    // 必须读取 orderId，缺失视为响应错误
    const orderId = response?.orderId
    if (!orderId) {
      uni.showToast({ title: '订单创建失败：未返回订单号', icon: 'none' })
      return
    }
    uni.showToast({ title: '订单提交成功', icon: 'success' })
    // 提交成功：清空购物车选中项
    cartStore.clearCart()
    setTimeout(() => {
      navigator.redirectTo(routes.order.detail(orderId))
    }, 800)
  } catch (error) {
    // 保留 clientRequestId 以便用户重试复现幂等
    uni.showToast({ title: error?.message || '订单提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variable.scss' as *;

.checkout-content {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 地址卡片 */
.address-card {
  position: relative;
  width: 100%;
  min-height: 76px;
  background: $color-bg-card;
  border: 1px solid $color-border-default;
  border-radius: $radius-card;
  padding: 14px 42px 14px 14px;
  text-align: left;

  &:active { opacity: 0.85; }
}

.address-name {
  font-size: 15px;
  font-weight: 600;
  color: $color-text-primary;
  display: block;
}

.address-detail {
  color: $color-text-secondary;
  font-size: 12px;
  margin-top: 5px;
  display: block;
}

/* 卡片 */
.checkout-card, .settings-list {
  background: $color-bg-card;
  border: 1px solid $color-border-default;
  border-radius: $radius-card;
  overflow: hidden;
  margin-top: 12px;
}

.card-header { padding: 14px; }

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: $color-text-primary;
  float: left;
}

.card-count {
  color: $color-text-secondary;
  font-size: 12px;
  float: right;
  font-weight: 400;
}

.product-row {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 0 14px 14px;
}

.product-image {
  width: 56px;
  height: 56px;
  border-radius: 7px;
  object-fit: cover;
}

.product-name {
  font-size: 14px;
  font-weight: 500;
  color: $color-text-primary;
  display: block;
}

.product-spec {
  margin-top: 2px;
  color: $color-text-secondary;
  font-size: 12px;
  display: block;
}

.product-price {
  font-size: 15px;
  font-weight: 500;
  color: $color-text-primary;
}

/* 设置列表 */
.settings-list { padding: 0 14px; }

.setting-item {
  width: 100%;
  min-height: 52px;
  border: none;
  border-bottom: 1px solid $color-border-default;
  background: transparent;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: $color-text-primary;

  &:last-child { border-bottom: none; }
}

.setting-value { color: $color-text-secondary; font-weight: 400; }

/* 底部金额栏 */
.amount-section { width: 100%; max-width: 260px; }

.amount-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: $color-text-primary;

  &.payable { margin-top: 8px; }
}

.payable-text {
  font-size: 20px;
  font-weight: 600;
  color: $color-brand-500;
  font-variant-numeric: tabular-nums;
}

.agreement-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  font-size: 12px;
  color: $color-text-secondary;

  checkbox { accent-color: $color-brand-500; }
}

.submit-btn {
  width: 100%;
  height: 48px;
  margin-top: 12px;
  background: $color-brand-500;
  color: white;
  font-size: 15px;
  font-weight: 650;
  border: none;
  border-radius: $radius-control;

  &:active:not(.is-disabled) { background: $color-brand-700; }
  &.is-disabled { background: $color-bg-subtle; color: $color-text-disabled; }
}
</style>
