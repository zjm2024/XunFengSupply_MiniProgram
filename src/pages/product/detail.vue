<template>
  <view class="product-detail-page">
    <!-- 顶部导航 -->
    <app-header
      :show-back="true"
      :title="'商品详情'"
      :show-cart="true"
      :cart-count="cartBadgeCount"
      :transparent="isTransparent"
      :show-shadow="!isTransparent"
      @back="goBack"
      @cart="goToCart"
    />

    <!-- 滚动内容区 -->
    <scroll-view 
      class="product-scroll" 
      scroll-y
      :style="{ height: scrollHeight }"
      @scroll="handleScroll"
    >
      <view class="product-content">
        <!-- 商品图片轮播区 -->
        <view class="product-media">
          <swiper 
            class="image-swiper" 
            :indicator-dots="true" 
            :autoplay="false" 
            :circular="true"
            @change="onSwiperChange"
          >
            <swiper-item v-for="(img, index) in productImages" :key="index">
              <image 
                class="main-image" 
                :src="img" 
                mode="aspectFill"
              />
            </swiper-item>
          </swiper>
          <!-- 图片页码 -->
          <view class="image-counter">
            <text class="counter-text">{{ currentImage + 1 }} / {{ productImages.length }}</text>
          </view>
        </view>

        <!-- 商品信息卡片 -->
        <view class="info-card">
          <view class="title-block">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-code">货号：{{ product.code }}　69码：{{ product.barcode }}</text>
            
            <view class="price-row">
              <text class="price">¥{{ product.price.toFixed(2) }}</text>
              <text class="price-unit">/ {{ product.unit }}</text>
            </view>

            <view class="facts">
              <view class="fact-item">
                <text class="fact-text">{{ product.moq }} 件起订</text>
              </view>
              <view class="fact-divider"></view>
              <view class="fact-item">
                <status-tag-new :type="stockStatusType" :text="stockStatusText" />
              </view>
              <view class="fact-divider"></view>
              <view class="fact-item">
                <text class="fact-text">预计 48 小时内发货</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 服务规则行 -->
        <view class="info-row" @click="showServiceInfo">
          <text class="row-label">运费规则 · 售后说明</text>
          <text class="row-arrow">→</text>
        </view>

        <!-- 规格选择行 -->
        <view class="info-row" @click="goToVariants">
          <text class="row-label">选择颜色 / 尺码 / 数量</text>
          <text class="row-arrow">→</text>
        </view>

        <!-- 已选规格摘要 -->
        <view v-if="selectedSummary" class="info-row is-selected" @click="goToVariants">
          <text class="row-label selected-label">已选：{{ selectedSummary }}</text>
          <text class="row-arrow">→</text>
        </view>

        <!-- 商品参数表 -->
        <view class="params-card">
          <text class="params-title">商品参数</text>
          <view class="params-list">
            <view v-for="(param, index) in product.params" :key="index" class="param-row">
              <text class="param-key">{{ param.key }}</text>
              <text class="param-value">{{ param.value }}</text>
            </view>
          </view>
        </view>

        <!-- 图文详情 -->
        <view class="detail-section">
          <text class="section-title">图文详情</text>
          
          <!-- 产品细节图 -->
          <image 
            class="detail-image" 
            src="/static/images/jersey-detail.png" 
            mode="widthFix"
          />
          
          <view class="detail-copy">
            <text class="copy-title">轻盈速干，为比赛而生</text>
            <text class="copy-desc">高透气纤维与运动剪裁，在高强度训练中保持舒适与灵活。</text>
          </view>
        </view>

        <!-- 底部安全区域预留 -->
        <view class="bottom-spacer"></view>
      </view>
    </scroll-view>

    <!-- 固定底部操作栏 -->
    <fixed-action-bar>
      <!-- 购物车快捷入口 -->
      <view class="cart-shortcut" @click="goToCart">
        <text class="shortcut-text">购物车</text>
        <text v-if="cartBadgeCount > 0" class="shortcut-badge">{{ cartBadgeCount }}</text>
      </view>
      
      <!-- 加入购物车按钮 -->
      <button class="action-btn btn-secondary" @click="addToCartQuick">加入购物车</button>
      
      <!-- 批量选规格主按钮 -->
      <button class="action-btn btn-primary" @click="goToVariants">批量选规格</button>
    </fixed-action-bar>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/store/modules/cart.js'
import appHeader from '@/components/AppHeader/AppHeader.vue'
import statusTagNew from '@/components/StatusTag/StatusTag.vue'
import fixedActionBar from '@/components/FixedActionBar/FixedActionBar.vue'

const cartStore = useCartStore()

// Mock 商品数据
const product = ref({
  id: 'T-100',
  name: '薰风专业比赛服 T-100',
  code: 'XF-T100',
  barcode: '6901234567893',
  price: 168,
  unit: '件',
  moq: 20,
  stock: 576, // 总库存
  images: [
    '/static/images/jersey-model.png',
    '/static/images/jersey-red.png',
    '/static/images/jersey-black.png',
    '/static/images/jersey-white.png',
    '/static/images/jersey-detail.png',
    '/static/images/jersey-hero.png'
  ],
  params: [
    { key: '面料', value: '速干聚酯纤维' },
    { key: '版型', value: '标准' },
    { key: '适用', value: '羽毛球训练 / 比赛' },
    { key: '包装', value: '单件袋装' },
    { key: '尺码', value: 'S–2XL' }
  ]
})

const productImages = ref(product.value.images)
const currentImage = ref(0)
const isTransparent = ref(true)
const scrollHeight = ref('calc(100vh - 100px)')

onMounted(() => {
  cartStore.initMockData()
  
  try {
    const sysInfo = uni.getSystemInfoSync()
    const navHeight = (sysInfo.statusBarHeight || 44) + 56 + 144 // 底部栏高度
    scrollHeight.value = `calc(100vh - ${navHeight}px)`
  } catch (e) {
    // 使用默认值
  }
})

// 购物车角标数量
const cartBadgeCount = computed(() => cartStore.summary.skuCount)

// 库存状态
const stockStatusType = computed(() => {
  if (product.value.stock > 100) return 'success'
  if (product.value.stock > 0) return 'warning'
  return 'error'
})

const stockStatusText = computed(() => {
  if (product.value.stock > 100) return '有货'
  if (product.value.stock > 0) return `仅剩 ${product.value.stock} 件`
  return '缺货'
})

// 已选规格摘要
const selectedSummary = computed(() => {
  const summary = cartStore.summary
  if (summary.colorCount === 0) return ''
  return `${summary.colorCount} 个颜色 · ${summary.skuCount} 个 SKU · ${summary.totalQuantity} 件`
})

// Swiper 切换
function onSwiperChange(e) {
  currentImage.value = e.detail.current
}

// 滚动处理（控制导航栏透明度）
function handleScroll(e) {
  const scrollTop = e.detail.scrollTop
  isTransparent.value = scrollTop < 200
}

// 页面跳转
function goBack() {
  uni.navigateBack()
}

function goToCart() {
  uni.navigateTo({
    url: '/pages/cart/index'
  })
}

function goToVariants() {
  uni.navigateTo({
    url: '/pages/product/variants'
  })
}

function showServiceInfo() {
  uni.showModal({
    title: '服务说明',
    content: '运费：满 500 元包邮，不满运费 15 元\n售后：7 天无理由退换货，质量问题包退换',
    showCancel: false,
    confirmText: '我知道了'
  })
}

function addToCartQuick() {
  // 快速加入默认规格
  uni.showToast({
    title: '请使用批量选规格添加商品',
    icon: 'none'
  })
}
</script>

<style lang="scss" scoped>
.product-detail-page {
  min-height: 100vh;
  background: #F7F7F8;
}

.product-scroll {
  flex: 1;
}

.product-content {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* ========== 图片轮播 ========== */
.product-media {
  position: relative;
  width: calc(100% + 64rpx);
  margin-left: -32rpx;
  margin-right: -32rpx;
  height: min(65vh, 600rpx);
  background: #151619;
  overflow: hidden;
}

.image-swiper {
  width: 100%;
  height: 100%;
}

.main-image {
  width: 100%;
  height: 100%;
}

.image-counter {
  position: absolute;
  right: 28rpx;
  bottom: 24rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.55);
}

.counter-text {
  font-size: 24rpx;
  color: white;
}

/* ========== 信息卡片 ========== */
.info-card {
  background: white;
  margin: -32rpx 32rpx 24rpx;
  padding: 36rpx 32rpx;
  border-radius: 24rpx;
  position: relative;
  z-index: 2;
  border-bottom: 2rpx solid #EFEFF1;
}

.title-block {
  width: 100%;
}

.product-name {
  font-size: 40rpx; /* 20px */
  font-weight: 600;
  color: #111216;
  line-height: 1.4;
  display: block;
}

.product-code {
  display: block;
  color: #5E626B;
  font-size: 24rpx; /* 12px */
  margin-top: 12rpx;
}

.price-row {
  display: flex;
  align-items: baseline;
  margin-top: 24rpx;
}

.price {
  color: #D7192D;
  font-size: 54rpx; /* 27px */
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.price-unit {
  color: #5E626B;
  font-size: 26rpx; /* 13px */
  font-weight: 400;
  margin-left: 4rpx;
}

.facts {
  display: flex;
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid #EFEFF1;
}

.fact-item {
  flex: 1;
  text-align: center;
}

.fact-text {
  font-size: 24rpx; /* 12px */
  color: #26282D;
}

.fact-divider {
  width: 2rpx;
  background: #EFEFF1;
}

/* ========== 信息行 ========== */
.info-row {
  width: 100%;
  min-height: 104rpx; /* 52px */
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-bottom: 2rpx solid #EFEFF1;
  padding: 0 28rpx;
  margin-bottom: 20rpx;
  border-radius: 20rpx;
  
  &:active {
    background: #FCFCFD;
  }
  
  &.is-selected {
    background: #FFF1F2;
    
    .selected-label {
      color: #D7192D;
    }
  }
}

.row-label {
  font-size: 28rpx; /* 14px */
  color: #111216;
}

.row-arrow {
  color: #989BA3;
  font-size: 28rpx;
}

/* ========== 参数表 ========== */
.params-card {
  background: white;
  border-radius: 24rpx;
  border: 2rpx solid #EFEFF1;
  padding: 32rpx;
  margin-top: 24rpx;
}

.params-title {
  font-size: 32rpx; /* 16px */
  font-weight: 600;
  color: #111216;
  display: block;
  margin-bottom: 24rpx;
}

.param-row {
  display: grid;
  grid-template-columns: 180rpx 1fr;
  padding: 18rpx 0;
  border-top: 2rpx solid #EFEFF1;
  
  &:first-child {
    border-top: none;
  }
}

.param-key {
  color: #5E626B;
  font-size: 28rpx;
}

.param-value {
  color: #111216;
  font-size: 28rpx;
}

/* ========== 图文详情 ========== */
.detail-section {
  background: white;
  border-radius: 24rpx;
  border: 2rpx solid #EFEFF1;
  padding: 32rpx;
  margin-top: 24rpx;
}

.section-title {
  font-size: 32rpx; /* 16px */
  font-weight: 600;
  color: #111216;
  display: block;
  margin-bottom: 24rpx;
}

.detail-image {
  width: 100%;
  border-radius: 16rpx;
}

.detail-copy {
  margin-top: 28rpx;
}

.copy-title {
  display: block;
  font-size: 36rpx; /* 18px */
  font-weight: 600;
  color: #111216;
  margin-bottom: 8rpx;
}

.copy-desc {
  display: block;
  color: #5E626B;
  font-size: 28rpx;
  line-height: 1.6;
}

/* ========== 底部操作栏 ========== */
.bottom-spacer {
  height: 184rpx; /* 为底部固定栏留空间 */
}

.cart-shortcut {
  width: 116rpx; /* 58px */
  height: 88rpx;
  border: none;
  background: white;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  
  &:active {
    opacity: 0.7;
  }
}

.shortcut-text {
  font-size: 24rpx;
  color: #5E626B;
}

.shortcut-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  min-width: 34rpx;
  height: 34rpx;
  border-radius: 18rpx;
  padding: 0 8rpx;
  background: #D7192D;
  color: white;
  font-size: 20rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  font-weight: 650;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-secondary {
  background: white;
  color: #D7192D;
  border: 2rpx solid #D7192D;
  
  &:active {
    background: #FFF1F2;
  }
}

.btn-primary {
  flex: 1.15;
  background: #D7192D;
  color: white;
  
  &:active {
    background: #B91224;
  }
}
</style>
