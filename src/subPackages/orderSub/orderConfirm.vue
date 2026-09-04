<!--
  结算确认页面（分包：orderSub）
  对应业务流程节点：
  购物车&下单结算 → 结算页（收货地址、发货备注、商品清单确认 → 预览 → 提交订单）
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="确认订单" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="order-confirm-page">
          <!-- 收货地址 -->
          <view class="address-section" @click="selectAddress">
            <view v-if="selectedAddress" class="address-info">
              <view class="address-top">
                <text class="name">{{ selectedAddress.contactName }}</text>
                <text class="phone">{{ selectedAddress.contactPhone }}</text>
              </view>
              <text class="address-detail">{{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }}{{ selectedAddress.detail }}</text>
            </view>
            <view v-else class="no-address">
              <text class="hint">请选择收货地址</text>
              <uni-icons type="right" size="16" color="#CCC" />
            </view>
          </view>

          <!-- 商品清单 -->
          <view class="goods-section">
            <view class="section-title">商品清单</view>
            <view
              class="goods-item"
              v-for="(item, idx) in previewData.items"
              :key="idx"
            >
              <image class="goods-image" :src="item.imageUrl || '/static/images/jersey-red.png'" mode="aspectFill" />
              <view class="goods-info">
                <text class="goods-name">{{ item.skuName }}</text>
                <view class="price-qty">
                  <text class="price">¥{{ Number(item.salePrice || 0).toFixed(2) }}</text>
                  <text class="qty">x{{ item.quantity }}</text>
                </view>
              </view>
            </view>

            <!-- 库存不足提示 -->
            <view class="stock-warning" v-if="previewData.insufficientSkus && previewData.insufficientSkus.length > 0">
              <uni-icons type="warning" size="16" color="#F56C6C" />
              <text class="warning-text">部分商品库存不足：{{ previewData.insufficientSkus.join(', ') }}</text>
            </view>
          </view>

          <!-- 发货备注 -->
          <view class="remark-section">
            <text class="label">发货备注</text>
            <textarea
              class="remark-input"
              v-model="remark"
              placeholder="选填：如对包装、配送有特殊要求"
              maxlength="100"
            />
          </view>

          <!-- 结算模式选择 -->
          <view class="pay-mode-section">
            <text class="label">结算方式</text>
            <view class="mode-options">
              <view
                class="mode-option"
                :class="{ active: paymentMode === PAYMENT_MODE.CASH }"
                @click="paymentMode = PAYMENT_MODE.CASH"
              >
                <uni-icons type="weixin" size="28" :color="paymentMode === PAYMENT_MODE.CASH ? '#C41E3A' : '#999'" />
                <text class="mode-name">现款支付</text>
                <text class="mode-desc">在线即时付款</text>
              </view>
              <view
                class="mode-option"
                :class="{ active: paymentMode === PAYMENT_MODE.CREDIT, disabled: !canUseCredit }"
                @click="canUseCredit && (paymentMode = PAYMENT_MODE.CREDIT)"
              >
                <uni-icons type="wallet" size="28" :color="paymentMode === PAYMENT_MODE.CREDIT ? '#C41E3A' : '#999'" />
                <text class="mode-name">授信赊账</text>
                <text class="mode-desc">月度统一结算</text>
                <text class="credit-limit" v-if="canUseCredit">可用额度 ¥{{ Number(availableCredit).toFixed(2) }}</text>
                <text class="credit-limit disabled-text" v-else>额度不足</text>
              </view>
            </view>
          </view>

          <!-- 底部占位，避免内容被 FixedActionBar 遮挡 -->
          <view style="height: 120rpx;" />

          <!-- 结算模式弹窗（备用） -->
          <pay-mode-popup
            ref="payModePopupRef"
            v-model="paymentMode"
            :availableCredit="availableCredit"
            :orderAmount="previewData.payableAmount || 0"
          />
        </view>
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar>
        <view class="submit-bar-inner">
          <view class="total-info">
            <text class="total-label">合计:</text>
            <text class="total-price">¥{{ Number(previewData.payableAmount || 0).toFixed(2) }}</text>
          </view>
          <button class="submit-btn" :disabled="submitting" @click="handleSubmitOrder">
            {{ submitting ? '提交中...' : '提交订单' }}
          </button>
        </view>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { previewOrder, createOrder, generateClientRequestId } from '../../api/order.js'
import { useUserStore } from '../../store/modules/user.js'
import { PAYMENT_MODE, DELIVERY_TYPE, ORDER_STATUS } from '../../config/constant.js'
import payModePopup from '../../components/pay-mode-popup/pay-mode-popup.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppContent from '@/components/AppContent/AppContent.vue'
import FixedActionBar from '@/components/FixedActionBar/FixedActionBar.vue'
import { safeNavigateTo, safeRedirectTo } from '../../utils/routeGuard.js'

const userStore = useUserStore()
const submitting = ref(false)
const remark = ref('')
const paymentMode = ref(PAYMENT_MODE.CASH)
const payModePopupRef = ref(null)

// 结算商品列表（从路由参数或购物车获取）
const orderItems = ref([])
const selectedAddress = ref(null)
const addressId = ref(null)

// 预览数据（服务端重算）
const previewData = reactive({
  items: [],
  goodsAmount: 0,
  discountAmount: 0,
  freightAmount: 0,
  payableAmount: 0,
  stockAvailable: true,
  insufficientSkus: [],
})

// 可用授信额度（后端金额为元）
const availableCredit = computed(() => userStore.availableCreditLimit || 0)

// 是否可以使用授信
const canUseCredit = computed(() =>
  userStore.canUseCreditPay && availableCredit.value >= (previewData.payableAmount || 0)
)

onLoad((options) => {
  if (options.items) {
    // 从路由参数接收选中的商品列表 JSON
    try {
      orderItems.value = JSON.parse(decodeURIComponent(options.items))
    } catch (e) {
      console.error('解析商品列表失败:', e)
      orderItems.value = []
    }
  }

  if (options.addressId) {
    addressId.value = Number(options.addressId)
    // 从地址选择页返回时获取地址信息
    loadAddressInfo(addressId.value)
  }

  // 加载预览数据
  loadPreviewData()
})

/**
 * 加载预览数据（服务端重算）
 */
async function loadPreviewData() {
  if (orderItems.value.length === 0) {
    uni.showToast({ title: '请先选择商品', icon: 'none' })
    return
  }

  try {
    const res = await previewOrder({
      items: orderItems.value.map(item => ({
        skuId: item.skuId,
        quantity: item.quantity,
      })),
      addressId: addressId.value,
      deliveryType: DELIVERY_TYPE.DELIVERY,
    })

    Object.assign(previewData, res)
  } catch (e) {
    console.error('预览订单失败:', e)
    uni.showToast({ title: e.message || '预览失败', icon: 'none' })
  }
}

/**
 * 加载地址信息
 */
async function loadAddressInfo(addrId) {
  // 从地址列表页返回时会携带地址信息
  // 实际实现依赖地址选择交互
}

/**
 * 选择收货地址
 */
function selectAddress() {
  safeNavigateTo({
    url: '/pages/address/index?mode=select',
    events: {
      selectAddress: (address) => {
        selectedAddress.value = address
        addressId.value = address.addressId || address.id
        // 地址变更后重新预览
        loadPreviewData()
      }
    }
  })
}

/**
 * 提交订单（含幂等键防重提交）
 */
async function handleSubmitOrder() {
  if (!selectedAddress.value && !addressId.value) {
    uni.showToast({ title: '请选择收货地址', icon: 'none' })
    return
  }

  if (!previewData.stockAvailable) {
    uni.showToast({ title: '商品库存不足，请调整后重试', icon: 'none' })
    return
  }

  submitting.value = true

  try {
    // 1. 生成幂等键
    const clientRequestId = generateClientRequestId()

    // 2. 调用创建订单接口
    const res = await createOrder({
      clientRequestId,
      items: orderItems.value.map(item => ({
        skuId: item.skuId,
        quantity: item.quantity,
      })),
      addressId: addressId.value,
      paymentMode: paymentMode.value,
      deliveryType: DELIVERY_TYPE.DELIVERY,
      customerRemark: remark.value,
    })

    uni.showToast({ title: '订单创建成功', icon: 'success' })

    // 3. 跳转支付页或订单详情
    if (res.orderStatus === ORDER_STATUS.PENDING_PAYMENT) {
      // 需要支付，跳转支付页
      safeRedirectTo(`/subPackages/paySub/payPage?orderId=${res.orderId}&paymentMode=${paymentMode.value}`)
    } else {
      // 不需要支付（如授信已扣款），跳转订单详情
      safeRedirectTo(`/subPackages/orderSub/orderDetail?orderId=${res.orderId}`)
    }
  } catch (e) {
    console.error('创建订单失败:', e)
    uni.showToast({ title: e.message || '创建订单失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.order-confirm-page {
  min-height: 100%;
  background: var(--bg-color);
}

.address-section {
  background: #fff;
  padding: 32rpx;
  margin-bottom: 16rpx;
  border-radius: 12rpx;

  .address-info {
    .address-top {
      display: flex;
      align-items: center;
      margin-bottom: 12rpx;

      .name {
        font-size: 32rpx;
        font-weight: 600;
        color: var(--text-primary);
        margin-right: 20rpx;
      }

      .phone {
        font-size: 28rpx;
        color: var(--text-secondary);
      }
    }

    .address-detail {
      font-size: 26rpx;
      color: var(--text-secondary);
      line-height: 1.5;
    }
  }

  .no-address {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .hint {
      font-size: 28rpx;
      color: var(--text-placeholder);
    }
  }
}

.goods-section, .remark-section, .pay-mode-section {
  background: #fff;
  padding: 28rpx 32rpx;
  margin-bottom: 16rpx;
  border-radius: 12rpx;

  .section-title, .label {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20rpx;
  }
}

.stock-warning {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 16rpx;
  padding: 12rpx 16rpx;
  background: #FEF0F0;
  border-radius: 8rpx;

  .warning-text {
    font-size: 24rpx;
    color: #F56C6C;
  }
}

.goods-item {
  display: flex;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child { border-bottom: none; }

  .goods-image {
    width: 160rpx;
    height: 160rpx;
    border-radius: 8rpx;
    flex-shrink: 0;
  }

  .goods-info {
    flex: 1;
    margin-left: 20rpx;

    .goods-name {
      font-size: 28rpx;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .price-qty {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 12rpx;

      .price {
        font-size: 30rpx;
        font-weight: 700;
        color: var(--primary-color);
      }

      .qty {
        font-size: 26rpx;
        color: var(--text-secondary);
      }
    }
  }
}

.remark-input {
  width: 100%;
  height: 140rpx;
  background: var(--bg-color);
  border-radius: 8rpx;
  padding: 20rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.mode-options {
  .mode-option {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    padding: 24rpx;
    border: 2rpx solid var(--border-color);
    border-radius: 12rpx;
    margin-bottom: 16rpx;

    &:last-child { margin-bottom: 0; }

    &.active {
      border-color: var(--primary-color);
      background: rgba(196, 30, 58, 0.02);
    }

    &.disabled {
      opacity: 0.5;
    }

    .mode-name {
      font-size: 28rpx;
      font-weight: 500;
      color: var(--text-primary);
      margin-left: 16rpx;
    }

    .mode-desc {
      width: 100%;
      font-size: 24rpx;
      color: var(--text-placeholder);
      margin-left: 68rpx;
      margin-top: 4rpx;
    }

    .credit-limit {
      width: 100%;
      font-size: 22rpx;
      color: var(--primary-color);
      margin-left: 68rpx;
      margin-top: 4rpx;

      &.disabled-text {
        color: #F56C6C;
      }
    }
  }
}

.submit-bar-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .total-info {
    .total-label {
      font-size: 28rpx;
      color: var(--text-secondary);
    }

    .total-price {
      font-size: 38rpx;
      font-weight: 700;
      color: var(--primary-color);
    }
  }

  .submit-btn {
    width: 240rpx;
    height: 80rpx;
    line-height: 80rpx;
    background: var(--primary-color);
    color: #fff;
    font-size: 30rpx;
    font-weight: 600;
    border-radius: 40rpx;
    border: none;

    &[disabled] {
      opacity: 0.6;
    }
  }
}
</style>
