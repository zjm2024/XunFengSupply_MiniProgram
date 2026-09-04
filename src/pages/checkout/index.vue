<template>
  <AppPageShell>
    <template #header>
      <app-header title="确认订单" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="checkout-content">
          <!-- 收货地址 -->
          <view class="address-card" @click="selectAddress">
            <view class="address-info">
              <text class="address-name">{{ address.name }}　{{ address.phone }}</text>
              <text class="address-detail">{{ address.detail }}</text>
            </view>
            <text class="address-arrow">→</text>
          </view>

          <!-- 订单商品 -->
          <view class="checkout-card">
            <view class="card-header">
              <text class="card-title">订单商品</text>
              <text class="card-count">{{ summary.skuCount }} 个 SKU · {{ summary.totalQuantity }} 件</text>
            </view>

            <view class="product-row">
              <image class="product-image" src="/static/images/jersey-red.png" mode="aspectFill" />
              <view class="product-info">
                <text class="product-name">薰风专业比赛服 T-100</text>
                <text class="product-spec">赤焰红 / 曜石黑 · S–XL</text>
              </view>
              <text class="product-price">¥{{ summary.totalAmount.toFixed(2) }}</text>
            </view>
          </view>

          <!-- 配送设置 -->
          <view class="settings-list">
            <button class="setting-item" @click="selectDelivery">
              <text>配送方式</text>
              <text class="setting-value">省外物流 →</text>
            </button>
            <button class="setting-item" @click="selectShipMode">
              <text>发货模式</text>
              <text class="setting-value">立即备货 →</text>
            </button>
            <button class="setting-item" @click="splitOrder">
              <text>买赠拆单</text>
              <text class="setting-value">未拆分 →</text>
            </button>
            <button class="setting-item" @click="selectInvoice">
              <text>发票</text>
              <text class="setting-value">暂不开票 →</text>
            </button>
          </view>
        </view>
      </AppContent>
    </template>

    <template #footer>
      <fixed-action-bar>
        <view class="amount-section">
          <view class="amount-item"><text>商品金额</text><text>¥{{ summary.totalAmount.toFixed(2) }}</text></view>
          <view class="amount-item"><text>运费</text><text>待确认</text></view>
          <view class="amount-item"><text>余额抵扣</text><text>¥0.00</text></view>
          <view class="amount-divider"></view>
          <view class="amount-item payable"><text>应付</text><text class="payable-text">¥{{ summary.totalAmount.toFixed(2) }}</text></view>

          <label class="agreement-label">
            <checkbox :checked="agreed" @tap="agreed = !agreed" />
            <text>我已阅读并同意《经销商交易协议》</text>
          </label>

          <button
            class="submit-btn"
            :disabled="!agreed"
            :class="{ 'is-disabled': !agreed }"
            @click="submitOrder"
          >提交订单</button>
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
import { ref, reactive } from 'vue'
import { useCartStore } from '@/store/modules/cart.js'
import appHeader from '@/components/AppHeader/AppHeader.vue'
import fixedActionBar from '@/components/FixedActionBar/FixedActionBar.vue'
import confirmPopup from '@/components/ConfirmPopup/ConfirmPopup.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppContent from '@/components/AppContent/AppContent.vue'
import { safeNavigateTo } from '@/utils/routeGuard.js'

const cartStore = useCartStore()

const address = reactive({
  name: '张先生',
  phone: '138 **** 5678',
  detail: '江苏省南京市建邺区江东中路 329 号'
})

const agreed = ref(false)
const confirmModalVisible = ref(false)

const summary = cartStore.summary

function selectAddress() { uni.showToast({ title: '选择收货地址', icon: 'none' }) }
function selectDelivery() { uni.showToast({ title: '选择配送方式', icon: 'none' }) }
function selectShipMode() { uni.showToast({ title: '选择发货模式', icon: 'none' }) }
function splitOrder() { uni.showToast({ title: '买赠拆单设置', icon: 'none' }) }
function selectInvoice() { uni.showToast({ title: '发票设置', icon: 'none' }) }

function submitOrder() {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意交易协议', icon: 'none' })
    return
  }
  confirmModalVisible.value = true
}

function confirmSubmit() {
  confirmModalVisible.value = false
  uni.showToast({ title: '订单已提交，等待品牌审核', icon: 'success' })
  setTimeout(() => {
    safeNavigateTo('/pages/order/index')
  }, 1500)
}
</script>

<style lang="scss" scoped>
.checkout-content {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 地址卡片 */
.address-card {
  position: relative;
  width: 100%;
  min-height: 76px; /* 稳定 px */
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  padding: 14px 42px 14px 14px;
  text-align: left;

  &:active { opacity: 0.85; }
}

.address-name {
  font-size: 15px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  display: block;
}

.address-detail {
  color: #5E626B;
  font-size: 12px;
  margin-top: 5px;
  display: block;
}

.address-arrow {
  position: absolute;
  right: 16px;
  top: 28px;
  color: #989BA3;
  font-size: 14px;
}

/* 卡片 */
.checkout-card, .settings-list {
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  overflow: hidden;
  margin-top: 12px;
}

.card-header { padding: 14px; }

.card-title {
  font-size: 15px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  float: left;
}

.card-count {
  color: #5E626B;
  font-size: 12px;
  float: right;
  font-weight: 400;
}

.product-row {
  display: grid;
  grid-template-columns: 56px 1fr auto; /* 稳定 px */
  gap: 10px;
  align-items: center;
  padding: 0 14px 14px;
}

.product-image {
  width: 56px; /* 稳定 px */
  height: 56px;
  border-radius: 7px;
  object-fit: cover;
}

.product-name {
  font-size: 14px;
  font-weight: 500;
  color: #111216;
  display: block;
}

.product-spec {
  margin-top: 2px;
  color: #5E626B;
  font-size: 12px;
  display: block;
}

.product-price {
  font-size: 15px;
  font-weight: 500;
  color: #111216;
}

/* 设置列表 */
.settings-list { padding: 0 14px; }

.setting-item {
  width: 100%;
  min-height: 52px; /* 稳定 px */
  border: none;
  border-bottom: 1px solid #EFEFF1;
  background: white;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #111216;

  &:last-child { border-bottom: none; }
  &:active { background: #FCFCFD; }
}

.setting-value { color: #5E626B; font-weight: 400; }

/* 底部金额栏 */
.amount-section { width: 100%; max-width: 260px; } /* 稳定 px */

.amount-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #111216;

  &.payable { margin-top: 8px; }
}

.payable-text {
  font-size: 20px; /* 稳定 px */
  font-weight: 600;
  color: #D7192D;
  font-variant-numeric: tabular-nums;
}

.amount-divider { height: 1px; background: #EFEFF1; margin: 10px 0; }

.agreement-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  font-size: 12px;
  color: #5E626B;

  checkbox { accent-color: #D7192D; }
}

.submit-btn {
  width: 100%;
  height: 48px; /* 稳定 px */
  margin-top: 12px;
  background: #D7192D;
  color: white;
  font-size: 15px;
  font-weight: 650;
  border: none;
  border-radius: 10px;

  &:active:not(.is-disabled) { background: #B91224; }
  &.is-disabled { background: #EFEFF1; color: #989BA3; }
}
</style>
