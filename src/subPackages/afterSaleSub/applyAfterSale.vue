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
              <uni-icons type="plus" size="24" color="#999" />
              <text class="hint">选择要售后的订单商品</text>
              <uni-icons type="right" size="16" color="#CCC" />
            </view>
          </view>

          <!-- 已选商品展示 -->
          <view class="selected-goods" v-if="selectedGoods">
            <image class="goods-image" :src="selectedGoods.goodsImage" mode="aspectFill" />
            <view class="goods-info">
              <text class="goods-name">{{ selectedGoods.goodsName }}</text>
              <text class="sku-name">{{ selectedGoods.skuName }}</text>
            </view>
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

          <!-- 退款金额（退货退款时显示） -->
          <view class="amount-section" v-if="form.type === 1">
            <text class="section-label">退款金额</text>
            <view class="amount-display">
              <text class="amount-symbol">¥</text>
              <text class="amount-value">{{ (selectedGoods?.price || 0 / 100).toFixed(2) }}</text>
            </view>
            <text class="amount-tip">（该商品实际支付金额，不可修改）</text>
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

          <!-- 凭证图片上传 -->
          <view class="evidence-section">
            <text class="section-label">问题凭证</text>
            <upload-file 
              v-model="form.images" 
              :maxCount="5"
              tips="请上传能反映问题的照片（最多5张），如：商品破损照片等"
            />
          </view>

          <!-- 补充说明 -->
          <view class="desc-section">
            <text class="section-label">补充说明</text>
            <textarea 
              class="desc-textarea" 
              v-model="form.description"
              placeholder="选填：补充说明情况"
              maxlength="200"
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
import { applyAfterSale, getAfterSaleableItems } from '../../api/aftersale.js'
import uploadFile from '../../components/upload-file/upload-file.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppContent from '@/components/AppContent/AppContent.vue'
import FixedActionBar from '@/components/FixedActionBar/FixedActionBar.vue'
import { safeNavigateTo } from '../../utils/routeGuard.js'

// 售后类型选项
const afterSaleTypes = [
  { value: 1, label: '退货退款', icon: '📦', desc: '退回商品，全额退款' },
  { value: 2, label: '换货补发', icon: '🔄', desc: '退回问题品，重新发货' },
  { value: 3, label: '仅退款', icon: '💰', desc: '无需退货，直接退款' }
]

const orderId = ref('')
const selectedOrder = ref(null)
const selectedGoods = ref(null)
const submitting = ref(false)

const form = reactive({
  type: 1,
  reason: '',
  description: '',
  images: [],
  quantity: 1
})

// 是否可以提交
const canSubmit = computed(() => {
  return form.type && form.reason.trim() && selectedGoods.value
})

onLoad((options) => {
  if (options.orderId) {
    orderId.value = options.orderId
    loadAfterSaleableItems(options.orderId)
  }
})

/**
 * 加载可售后商品
 * TODO: 调用 getAfterSaleableItems(orderId)
 */
async function loadAfterSaleableItems(orderId) {
  try {
    // const res = await getAfterSaleableItems(orderId)
    // 如果只有一个商品则自动选中
  } catch (e) {
    console.error('获取可售后商品失败:', e)
  }
}

function goSelectOrder() {
  safeNavigateTo('/subPackages/orderSub/orderList?selectMode=afterSale')
}

/**
 * 提交售后申请
 * TODO: 表单校验 → 调用 applyAfterSale(form) 接口
 */
async function handleSubmit() {
  if (!canSubmit.value) {
    uni.showToast({ title: '请完善必填信息', icon: 'none' })
    return
  }
  
  submitting.value = true
  
  try {
    // await applyAfterSale({
    //   orderId: selectedOrder.value.orderId,
    //   orderItemId: selectedGoods.value.orderItemId,
    //   type: form.type,
    //   reason: form.reason,
    //   images: form.images,
    //   quantity: form.quantity,
    //   description: form.description
    // })
    
    uni.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (e) {
    console.error('提交售后失败:', e)
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
