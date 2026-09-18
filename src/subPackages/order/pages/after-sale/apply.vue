<!--
  发起售后申请页面（分包：afterSaleSub）
  对应业务流程节点：
  售后闭环 → 发起售后申请、选择售后类型、上传凭证图片
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="申请售后" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="apply-after-sale-page">
          <!-- 选择订单商品 -->
          <view class="select-order-section" v-if="!selectedOrder" @click="goSelectOrder">
            <view class="select-trigger">
              <AppIcon name="plus" :size="24" color="#999" />
              <text class="hint">选择要售后的订单商品</text>
              <AppIcon name="chevron-right" :size="16" color="#CCC" />
            </view>
          </view>

          <!-- 已选商品展示 -->
          <view
            v-for="item in afterSaleItems"
            :key="item.orderItemId"
            class="selected-goods"
            :class="{ active: selectedGoods?.orderItemId === item.orderItemId }"
            @tap="selectGoods(item)"
          >
            <AppProductImage class="goods-image" :src="item.imageUrl" mode="aspectFill" />
            <view class="goods-info">
              <text class="goods-name">{{ item.productName }}</text>
              <text class="sku-name">{{ item.skuName }} · 可申请 {{ item.availableQuantity }} 件</text>
            </view>
            <view class="select-mark">{{ selectedGoods?.orderItemId === item.orderItemId ? '已选择' : '选择' }}</view>
          </view>

          <!-- 售后类型选择 -->
          <view class="type-section">
            <text class="section-label"><text class="required">*</text> 售后类型</text>
            <view class="type-options">
              <view 
                class="type-option" 
                :class="{ active: form.type === item.value }"
                v-for="item in afterSaleTypes" 
                :key="item.value"
                @click="form.type = item.value"
              >
                <text class="type-icon">{{ item.icon }}</text>
                <text class="type-name">{{ item.label }}</text>
                <text class="type-desc">{{ item.desc }}</text>
              </view>
            </view>
          </view>

          <!-- 申请数量与预计退款金额 -->
          <view class="amount-section" v-if="selectedGoods">
            <view class="quantity-row">
              <text class="section-label">申请数量</text>
              <input class="quantity-input" type="number" :value="form.quantity" @input="setQuantity($event.detail.value)" />
            </view>
            <text class="section-label">退款金额</text>
            <view class="amount-display">
              <text class="amount-symbol">¥</text>
              <text class="amount-value">{{ estimatedRefundAmount.toFixed(2) }}</text>
            </view>
            <text class="amount-tip">最终退款金额以审核结果为准</text>
          </view>

          <!-- 售后原因 -->
          <view class="reason-section">
            <text class="section-label"><text class="required">*</text> 售后原因</text>
            <input 
              class="reason-input" 
              v-model="form.reason"
              placeholder="请详细描述问题原因"
              maxlength="100"
            />
          </view>

          <!-- 底部占位 -->
          <view style="height: 140rpx;" />
        </view>
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar>
        <button 
          class="submit-btn" 
          :disabled="submitting || !canSubmit"
          @click="handleSubmit"
        >
          {{ submitting ? '提交中...' : '提交售后申请' }}
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { applyAfterSale, getAfterSaleableItems } from '../../api/afterSaleApi.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

// 售后类型选项
const afterSaleTypes = [
  { value: 1, label: '仅退款', icon: '¥', desc: '无需退回商品，审核后退款' },
  { value: 2, label: '退货退款', icon: '↩', desc: '退回商品，验收后退款' },
]

const orderId = ref('')
const selectedOrder = ref(null)
const selectedGoods = ref(null)
const afterSaleItems = ref([])
const submitting = ref(false)

const form = reactive({
  type: 1,
  reason: '',
  quantity: 1
})

// 是否可以提交
const canSubmit = computed(() => {
  return form.type && form.reason.trim() && selectedGoods.value && form.quantity > 0
})

/** 按当前申请数量估算退款金额，实际金额仍以后端审核为准。 */
const estimatedRefundAmount = computed(() => {
  if (!selectedGoods.value || selectedGoods.value.availableQuantity <= 0) return 0
  return Number(selectedGoods.value.refundAmount || 0) / selectedGoods.value.availableQuantity * form.quantity
})

onLoad((options) => {
  if (options.orderId) {
    orderId.value = options.orderId
    loadAfterSaleableItems(options.orderId)
  }
})

/** 加载当前订单可申请售后的商品，并默认选中第一项。 */
async function loadAfterSaleableItems(currentOrderId) {
  try {
    afterSaleItems.value = await getAfterSaleableItems(currentOrderId)
    selectedOrder.value = { orderId: Number(currentOrderId) }
    selectGoods(afterSaleItems.value[0] || null)
    if (!afterSaleItems.value.length) uni.showToast({ title: '该订单暂无可申请售后的商品', icon: 'none' })
  } catch (error) {
    afterSaleItems.value = []
    selectedGoods.value = null
    uni.showToast({ title: error?.message || '售后商品加载失败', icon: 'none' })
  }
}

/** 切换本次申请的商品并恢复其最大可申请数量。 */
function selectGoods(item) {
  selectedGoods.value = item
  form.quantity = item ? Math.max(1, Number(item.availableQuantity || 1)) : 1
}

/** 将申请数量限制在当前商品的可售后数量内。 */
function setQuantity(rawValue) {
  const maximum = Number(selectedGoods.value?.availableQuantity || 1)
  form.quantity = Math.min(maximum, Math.max(1, Math.floor(Number(rawValue) || 1)))
}

function goSelectOrder() {
  navigator.navigateTo(routes.order.list({ selectMode: 'afterSale' }), {
    events: {
      orderSelected(payload) {
        if (payload?.orderId) {
          orderId.value = payload.orderId
          loadAfterSaleableItems(payload.orderId)
        }
      },
    },
  })
}

/** 提交售后申请并跳转至售后记录页。 */
async function handleSubmit() {
  if (!canSubmit.value) {
    uni.showToast({ title: '请完善必填信息', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await applyAfterSale({
      orderId: Number(orderId.value),
      afterSaleType: form.type,
      reason: form.reason.trim(),
      clientRequestId: `after-sale-${orderId.value}-${Date.now()}`,
      items: [{ orderItemId: selectedGoods.value.orderItemId, quantity: form.quantity }],
    })
    uni.showToast({ title: '售后申请已提交', icon: 'success' })
    setTimeout(() => navigator.redirectTo(routes.order.afterSaleList()), 500)
  } catch (error) {
    uni.showToast({ title: error?.message || '售后申请提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.apply-after-sale-page {
  min-height: 100%;
  background: var(--bg-color);
}

.select-order-section {
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
  
  .select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx;
    
    .hint {
      flex: 1;
      text-align: center;
      font-size: 28rpx;
      color: var(--text-placeholder);
    }
  }
}

.selected-goods {
  display: flex;
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  
  .goods-image {
    width: 160rpx;
    height: 160rpx;
    border-radius: 8rpx;
    flex-shrink: 0;
  }
  
  .goods-info {
    margin-left: 20rpx;
    
    .goods-name {
      display: block;
      font-size: 28rpx;
      color: var(--text-primary);
      font-weight: 500;
    }
    
    .sku-name {
      display: block;
      font-size: 24rpx;
      color: var(--text-placeholder);
      margin-top: 8rpx;
    }
  }
}

.selected-goods.active {
  outline: 1px solid rgba(215, 25, 45, .32);
  background: #FFF8F9;
}

.select-mark {
  flex: 0 0 auto;
  color: var(--color-brand, #D7192D);
  font-size: var(--type-caption-size, 12px);
  font-weight: 650;
}

.quantity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #EEF0F2;
}

.quantity-row .section-label { margin-bottom: 0; }

.quantity-input {
  width: 72px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--color-border, #DDE0E4);
  border-radius: var(--radius-control, 10px);
  box-sizing: border-box;
  background: var(--surface-subtle, #F7F8FA);
  font-size: var(--type-body-size, 14px);
  text-align: center;
}

.type-section, .amount-section, .reason-section, .evidence-section, .desc-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 16rpx;
  
  .section-label {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20rpx;
    
    .required {
      color: #F56C6C;
      margin-right: 4rpx;
    }
  }
}

.type-options {
  .type-option {
    display: flex;
    align-items: center;
    padding: 24rpx;
    border: 2rpx solid var(--border-color);
    border-radius: 12rpx;
    margin-bottom: 16rpx;
    
    &:last-child { margin-bottom: 0; }
    
    &.active {
      border-color: var(--primary-color);
      background: rgba(196, 30, 58, 0.02);
    }
    
    .type-icon {
      font-size: 36rpx;
      margin-right: 16rpx;
    }
    
    .type-name {
      font-size: 28rpx;
      font-weight: 500;
      color: var(--text-primary);
      margin-right: 16rpx;
    }
    
    .type-desc {
      font-size: 22rpx;
      color: var(--text-placeholder);
    }
  }
}

.amount-display {
  display: flex;
  align-items: baseline;
  padding: 20rpx 0;
  
  .amount-symbol {
    font-size: 36rpx;
    color: var(--primary-color);
    font-weight: 600;
  }
  
  .amount-value {
    font-size: 56rpx;
    font-weight: 700;
    color: var(--primary-color);
  }
}

.amount-tip {
  font-size: 24rpx;
  color: var(--text-placeholder);
}

.reason-input {
  width: 100%;
  height: 80rpx;
  background: var(--bg-color);
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.desc-textarea {
  width: 100%;
  height: 160rpx;
  background: var(--bg-color);
  border-radius: 8rpx;
  padding: 20rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: var(--primary-color);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  
  &[disabled] {
    opacity: 0.5;
  }
}
</style>
