<!--
  商品详情+SKU实时库存页面（分包：goodsSub）
  对应业务流程节点：
  工作台选购 → 商品详情查看、SKU选择、实时库存校验、加入购物车
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="商品详情" :show-back="true" :transparent="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="goods-detail-page" v-if="goodsInfo.goodsId">
          <!-- 商品图片轮播 -->
          <swiper class="goods-swiper" :indicator-dots="true" :autoplay="true" circular>
            <swiper-item v-for="(img, index) in goodsInfo.images" :key="index">
              <image class="swiper-image" :src="img" mode="aspectFill" />
            </swiper-item>
          </swiper>

          <!-- 商品基本信息 -->
          <view class="goods-info-card">
            <view class="price-row">
              <text class="price">¥{{ (currentSku.price || goodsInfo.price / 100).toFixed(2) }}</text>
              <text class="original-price" v-if="goodsInfo.originalPrice">¥{{ (goodsInfo.originalPrice / 100).toFixed(2) }}</text>
            </view>
            <text class="goods-name">{{ goodsInfo.goodsName }}</text>
            <text class="goods-desc">{{ goodsInfo.description || '' }}</text>
            
            <!-- 库存提示 -->
            <view class="stock-tag" :class="{ low: currentSku.stock < 50, out: currentSku.stock === 0 }">
              库存: {{ currentSku.stock }}{{ goodsInfo.unit || '筒' }}
            </view>
          </view>

          <!-- SKU选择区域 -->
          <view class="sku-section" @click="showSkuPopup = true">
            <view class="sku-trigger">
              <text class="sku-label">已选:</text>
              <text class="sku-value">{{ selectedSkuText || '请选择规格' }}</text>
              <uni-icons type="right" size="16" color="#CCC" />
            </view>
          </view>

          <!-- 商品详情富文本 -->
          <view class="detail-section">
            <text class="section-title">商品详情</text>
            <rich-text class="rich-content" :nodes="goodsInfo.detailContent"></rich-text>
          </view>

          <!-- 底部占位，避免内容被 FixedActionBar 遮挡 -->
          <view style="height: 120rpx;" />
        </view>

        <!-- 空状态 -->
        <view v-else class="loading-page">
          <text class="loading-text">加载中...</text>
        </view>
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar v-if="goodsInfo.goodsId">
        <view class="bottom-bar-inner">
          <view class="bar-left">
            <view class="bar-action" @click="goToCart">
              <uni-icons type="cart" size="24" />
              <text class="action-text">购物车</text>
              <view class="cart-badge" v-if="cartCount > 0">{{ cartCount }}</view>
            </view>
          </view>
          <view class="bar-right">
            <button class="add-cart-btn" @click="handleAddCart">加入购物车</button>
            <button class="buy-now-btn" @click="handleBuyNow">立即购买</button>
          </view>
        </view>
      </FixedActionBar>
    </template>

    <!-- SKU选择弹窗 -->
    <uni-popup ref="skuPopupRef" type="bottom" @change="onPopupChange">
      <view class="sku-popup">
        <view class="popup-header">
          <text class="popup-title">选择规格</text>
          <uni-icons type="close" size="22" @click="closeSkuPopup" />
        </view>
        
        <view class="selected-info">
          <image class="sku-image" :src="currentSku.image || goodsInfo.mainImage" mode="aspectFill" />
          <view class="sku-price-info">
            <text class="sku-price">¥{{ (currentSku.price || 0).toFixed(2) }}</text>
            <text class="sku-stock">库存: {{ currentSku.stock }}件</text>
          </view>
        </view>

        <!-- SKU属性列表 -->
        <view class="sku-attrs" v-for="attr in skuAttrList" :key="attr.name">
          <text class="attr-name">{{ attr.name }}</text>
          <view class="attr-values">
            <view 
              class="attr-value" 
              :class="{ active: selectedAttrs[attr.name] === value, disabled: value.disabled }"
              v-for="value in attr.values" 
              :key="value.id"
              @click="selectAttr(attr.name, value)"
            >{{ value.label }}</view>
          </view>
        </view>

        <!-- 数量选择 -->
        <view class="quantity-row">
          <text class="quantity-label">数量</text>
          <view class="quantity-stepper">
            <view class="stepper-btn" :class="{ disabled: quantity <= 1 }" @click="quantity--">-</view>
            <text class="stepper-val">{{ quantity }}</text>
            <view class="stepper-btn" :class="{ disabled: quantity >= currentSku.stock }" @click="quantity++">+</view>
          </view>
        </view>

        <button class="confirm-btn" @click="confirmSku">确定</button>
      </view>
    </uni-popup>
  </AppPageShell>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getGoodsDetail, getGoodsSkuList } from '../../api/goods.js'
import { addToCart as cartAddApi } from '../../api/cart.js'
import { CART } from '../../config/routes.js'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppContent from '@/components/AppContent/AppContent.vue'
import FixedActionBar from '@/components/FixedActionBar/FixedActionBar.vue'
import { safeNavigateTo } from '../../utils/routeGuard.js'

const goodsId = ref('')
const goodsInfo = ref({})
const skuList = ref([])
const showSkuPopup = ref(false)
const quantity = ref(1)
const cartCount = ref(0)
const skuPopupRef = ref(null)

// 当前选中的SKU
const currentSku = ref({ price: 0, stock: 0, image: '', skuId: '' })

// 选中的属性组合
const selectedAttrs = reactive({})

// SKU属性列表
const skuAttrList = ref([])

// 已选SKU文本
const selectedSkuText = computed(() => {
  const keys = Object.keys(selectedAttrs)
  if (keys.length === 0) return ''
  return keys.map(k => `${k}: ${selectedAttrs[k]}`).join(' ')
})

// 监听选中属性变化，更新当前SKU
watch(selectedAttrs, () => {
  updateCurrentSku()
}, { deep: true })

onLoad(async (options) => {
  goodsId.value = options.goodsId
  await loadGoodsDetail()
  await loadSkuList()
})

/**
 * 加载商品详情
 * TODO: 调用 getGoodsDetail(goodsId.value)
 */
async function loadGoodsDetail() {
  try {
    // const res = await getGoodsDetail(goodsId.value)
    // goodsInfo.value = res
  } catch (e) {
    console.error('加载商品详情失败:', e)
  }
}

/**
 * 加载SKU列表
 * TODO: 调用 getGoodsSkuList(goodsId.value)
 */
async function loadSkuList() {
  try {
    // const res = await getGoodsSkuList(goodsId.value)
    // skuList.value = res.list
    // 解析SKU属性
    // buildSkuAttrs(res.list)
  } catch (e) {
    console.error('加载SKU失败:', e)
  }
}

/**
 * 选择SKU属性值
 */
function selectAttr(attrName, value) {
  if (value.disabled) return
  selectedAttrs[attrName] = value.label
}

/**
 * 更新当前SKU信息
 */
function updateCurrentSku() {
  // 根据选中的属性组合匹配对应SKU
  // TODO: 实现SKU匹配逻辑
}

/**
 * 确认SKU选择
 */
function confirmSku() {
  closeSkuPopup()
}

/**
 * 关闭SKU弹窗
 */
function closeSkuPopup() {
  showSkuPopup.value = false
  skuPopupRef.value?.close?.()
}

function onPopupChange(e) {
  showSkuPopup.value = e.show
}

/**
 * 加入购物车
 */
async function handleAddCart() {
  if (!currentSku.value.skuId) {
    showSkuPopup.value = true
    skuPopupRef.value?.open?.()
    return
  }
  
  try {
    // await cartAddApi({ goodsId: goodsId.value, skuId: currentSku.value.skuId, quantity: quantity.value })
    uni.showToast({ title: '已加入购物车', icon: 'success' })
  } catch (e) {
    console.error('加入购物车失败:', e)
  }
}

/**
 * 立即购买
 */
function handleBuyNow() {
  if (!currentSku.value.skuId) {
    showSkuPopup.value = true
    skuPopupRef.value?.open?.()
    return
  }
  // 跳转订单确认页，携带单个商品信息
  safeNavigateTo(`/subPackages/orderSub/orderConfirm?goodsId=${goodsId.value}&skuId=${currentSku.value.skuId}&quantity=${quantity.value}`)
}

/**
 * 去购物车
 */
function goToCart() {
  safeNavigateTo(CART)
}
</script>

<style lang="scss" scoped>
.goods-detail-page {
  min-height: 100%;
  background: var(--bg-color);
}

.loading-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;

  .loading-text {
    font-size: 28rpx;
    color: var(--text-secondary);
  }
}

.goods-swiper {
  width: 100%;
  height: 375px;
  
  .swiper-image {
    width: 100%;
    height: 100%;
  }
}

.goods-info-card {
  background: #fff;
  padding: 28rpx 32rpx;
  margin-bottom: 16rpx;
  
  .price-row {
    display: flex;
    align-items: baseline;
    margin-bottom: 16rpx;
    
    .price {
      font-size: 44rpx;
      font-weight: 700;
      color: var(--primary-color);
    }
    
    .original-price {
      font-size: 26rpx;
      color: var(--text-placeholder);
      text-decoration: line-through;
      margin-left: 12rpx;
    }
  }
  
  .goods-name {
    display: block;
    font-size: 32rpx;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
    margin-bottom: 12rpx;
  }
  
  .goods-desc {
    display: block;
    font-size: 26rpx;
    color: var(--text-secondary);
    line-height: 1.6;
  }
  
  .stock-tag {
    display: inline-block;
    font-size: 24rpx;
    color: var(--text-secondary);
    background: var(--bg-color);
    padding: 4rpx 16rpx;
    border-radius: 20rpx;
    margin-top: 16rpx;
    
    &.low { color: #E6A23C; background: #FDF6EC; }
    &.out { color: #F56C6C; background: #FEF0F0; }
  }
}

.sku-section {
  background: #fff;
  padding: 28rpx 32rpx;
  margin-bottom: 16rpx;
  
  .sku-trigger {
    display: flex;
    align-items: center;
    
    .sku-label {
      font-size: 28rpx;
      color: var(--text-secondary);
      margin-right: 16rpx;
    }
    
    .sku-value {
      flex: 1;
      font-size: 28rpx;
      color: var(--text-primary);
    }
  }
}

.detail-section {
  background: #fff;
  padding: 28rpx 32rpx;
  
  .section-title {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20rpx;
  }
}

.bottom-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  
  .bar-left {
    .bar-action {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8rpx 20rpx;
      
      .action-text {
        font-size: 20rpx;
        color: var(--text-secondary);
        margin-top: 4rpx;
      }
      
      .cart-badge {
        position: absolute;
        top: 0;
        right: 8rpx;
        min-width: 30rpx;
        height: 30rpx;
        line-height: 30rpx;
        text-align: center;
        font-size: 20rpx;
        color: #fff;
        background: var(--primary-color);
        border-radius: 15rpx;
      }
    }
  }
  
  .bar-right {
    display: flex;
    gap: 16rpx;
    
    .add-cart-btn, .buy-now-btn {
      width: 200rpx;
      height: 72rpx;
      line-height: 72rpx;
      border-radius: 36rpx;
      font-size: 28rpx;
      border: none;
      padding: 0;
    }
    
    .add-cart-btn {
      background: #FFE4E4;
      color: var(--primary-color);
    }
    
    .buy-now-btn {
      background: var(--primary-color);
      color: #fff;
    }
  }
}

/* SKU弹窗样式 */
.sku-popup {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx;
  max-height: 80vh;
  
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    
    .popup-title {
      font-size: 32rpx;
      font-weight: 600;
    }
  }
  
  .selected-info {
    display: flex;
    margin-bottom: 32rpx;
    
    .sku-image {
      width: 180rpx;
      height: 180rpx;
      border-radius: 12rpx;
      margin-right: 20rpx;
    }
    
    .sku-price-info {
      .sku-price {
        font-size: 38rpx;
        font-weight: 700;
        color: var(--primary-color);
      }
      
      .sku-stock {
        display: block;
        font-size: 24rpx;
        color: var(--text-secondary);
        margin-top: 8rpx;
      }
    }
  }
  
  .sku-attrs {
    margin-bottom: 24rpx;
    
    .attr-name {
      display: block;
      font-size: 28rpx;
      color: var(--text-primary);
      font-weight: 500;
      margin-bottom: 16rpx;
    }
    
    .attr-values {
      display: flex;
      flex-wrap: wrap;
      gap: 16rpx;
      
      .attr-value {
        padding: 12rpx 28rpx;
        background: var(--bg-color);
        border-radius: 8rpx;
        font-size: 26rpx;
        color: var(--text-primary);
        border: 2rpx solid transparent;
        
        &.active {
          border-color: var(--primary-color);
          color: var(--primary-color);
          background: rgba(196, 30, 58, 0.05);
        }
        
        &.disabled {
          opacity: 0.4;
        }
      }
    }
  }
  
  .quantity-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32rpx;
    
    .quantity-label {
      font-size: 28rpx;
      color: var(--text-primary);
    }
    
    .quantity-stepper {
      display: flex;
      align-items: center;
      border: 1rpx solid var(--border-color);
      border-radius: 8rpx;
      
      .stepper-btn {
        width: 64rpx;
        height: 56rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32rpx;
        
        &.disabled { color: #CCC; }
      }
      
      .stepper-val {
        width: 80rpx;
        text-align: center;
        font-size: 28rpx;
        border-left: 1rpx solid var(--border-color);
        border-right: 1rpx solid var(--border-color);
      }
    }
  }
  
  .confirm-btn {
    width: 100%;
    height: 88rpx;
    line-height: 88rpx;
    background: var(--primary-color);
    color: #fff;
    font-size: 32rpx;
    font-weight: 600;
    border-radius: 44rpx;
    border: none;
  }
}
</style>
