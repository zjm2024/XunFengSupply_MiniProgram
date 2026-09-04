<!--
  ⚠️ [DEAD CODE] 此页面已废弃，将被删除！

  旧版商品分类选购页面（原主包 Tab 页面）
  替代者：pages/product/list.vue（V2 商品列表）

  废弃原因：
  - 不在 pages.json 中注册
  - V2 双入口架构不需要独立分类页
  - 新版商品路径：/pages/product/list

  当前状态：DEAD — 无任何活跃引用，等待物理删除
  计划删除版本：阶段1完成后
-->
<template>
  <view class="classify-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <uni-icons type="search" size="18" color="#999" />
      <input 
        class="search-input" 
        type="text" 
        placeholder="搜索商品名称/型号"
        v-model="searchKeyword"
        @confirm="handleSearch"
        confirm-type="search"
      />
    </view>

    <view class="content-wrapper">
      <!-- 左侧分类列表 -->
      <scroll-view class="category-sidebar" scroll-y :scroll-top="sidebarScrollTop">
        <view 
          class="category-item" 
          :class="{ active: currentCategoryId === item.id }"
          v-for="item in categoryList" 
          :key="item.id"
          @click="switchCategory(item.id)"
        >
          <text class="category-name">{{ item.name }}</text>
        </view>
      </scroll-view>

      <!-- 右侧商品列表 -->
      <scroll-view class="goods-list-wrapper" scroll-y @scrolltolower="loadMore">
        <!-- 商品卡片列表 -->
        <view class="goods-list">
          <view 
            class="goods-card" 
            v-for="item in goodsList" 
            :key="item.goodsId"
            @click="goToDetail(item.goodsId)"
          >
            <image class="goods-image" :src="item.mainImage" mode="aspectFill" />
            <view class="goods-info">
              <text class="goods-name">{{ item.goodsName }}</text>
              <text class="goods-model">{{ item.model || item.skuName }}</text>
              <view class="goods-bottom">
                <view class="price-row">
                  <text class="price">¥{{ (item.price / 100).toFixed(2) }}</text>
                  <text class="unit">/{{ item.unit || '筒' }}</text>
                </view>
                <view class="stock-info" :class="{ low: item.stock < 50 }">
                  <text>库存: {{ item.stock }}{{ item.unit || '筒' }}</text>
                </view>
              </view>
            </view>
            <!-- 加入购物车按钮 -->
            <view class="add-cart-btn" @click.stop="addToCart(item)">
              <uni-icons type="plusempty" size="16" color="#C41E3A" />
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <empty-view v-if="!loading && goodsList.length === 0" text="暂无商品" />

        <!-- 加载更多 -->
        <view class="load-more" v-if="goodsList.length > 0">
          <text v-if="hasMore">加载中...</text>
          <text v-else class="no-more">— 已经到底了 —</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getCategoryList, getGoodsList } from '../../api/goods.js'
import { addToCart as cartAddApi } from '../../api/cart.js'
import emptyView from '../../components/empty-view/empty-view.vue'

// 分类数据
const categoryList = ref([])
const currentCategoryId = ref(null)

// 商品数据
const goodsList = ref([])
const loading = ref(false)
const hasMore = ref(true)
const page = reactive({
  current: 1,
  pageSize: 10
})

// 搜索
const searchKeyword = ref('')
const sidebarScrollTop = ref(0)

onShow(() => {
  loadCategories()
})

/**
 * 加载分类列表
 * TODO: 调用 getCategoryList() 接口
 */
async function loadCategories() {
  try {
    // const res = await getCategoryList()
    // categoryList.value = res
    
    // 临时模拟数据
    categoryList.value = [
      { id: 1, name: '比赛用球' },
      { id: 2, name: '训练用球' },
      { id: 3, name: '业余用球' },
      { id: 4, name: '羽毛球拍' },
      { id: 5, name: '运动配件' },
      { id: 6, name: '穿线服务' }
    ]
    
    // 默认选中第一个分类
    if (categoryList.value.length > 0 && !currentCategoryId.value) {
      switchCategory(categoryList.value[0].id)
    }
  } catch (e) {
    console.error('加载分类失败:', e)
  }
}

/**
 * 切换分类
 */
function switchCategory(categoryId) {
  currentCategoryId.value = categoryId
  page.current = 1
  goodsList.value = []
  hasMore.value = true
  loadGoodsList()
}

/**
 * 加载商品列表
 * TODO: 调用 getGoodsList() 接口
 */
async function loadGoodsList() {
  if (loading.value) return
  
  loading.value = true
  try {
    // const res = await getGoodsList({
    //   categoryId: currentCategoryId.value,
    //   keyword: searchKeyword.value,
    //   page: page.current,
    //   pageSize: page.pageSize
    // })
    // goodsList.value = page.current === 1 ? res.list : [...goodsList.value, ...res.list]
    // hasMore.value = res.hasMore
    
    // TODO: 移除以下模拟数据，替换为真实接口调用
    loading.value = false
  } catch (e) {
    console.error('加载商品失败:', e)
    loading.value = false
  }
}

/**
 * 加载更多
 */
function loadMore() {
  if (!hasMore.value || loading.value) return
  page.current++
  loadGoodsList()
}

/**
 * 搜索
 */
function handleSearch() {
  page.current = 1
  goodsList.value = []
  hasMore.value = true
  loadGoodsList()
}

/**
 * 进入商品详情
 * @param {string} goodsId - 商品ID
 */
function goToDetail(goodsId) {
  uni.navigateTo({
    url: `/subPackages/goodsSub/goodsDetail?goodsId=${goodsId}`
  })
}

/**
 * 加入购物车
 * @param {Object} item - 商品信息
 */
async function addToCart(item) {
  try {
    // TODO: 调用 cartAddApi({ goodsId: item.goodsId, skuId: item.defaultSkuId, quantity: 1 })
    uni.showToast({ title: '已加入购物车', icon: 'success' })
  } catch (e) {
    console.error('加入购物车失败:', e)
  }
}
</script>

<style lang="scss" scoped>
.classify-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-color);
}

.search-bar {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 16rpx 24rpx;
  
  .search-input {
    flex: 1;
    height: 64rpx;
    background: var(--bg-color);
    border-radius: 32rpx;
    padding: 0 24rpx;
    margin-left: 16rpx;
    font-size: 26rpx;
  }
}

.content-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.category-sidebar {
  width: 180rpx;
  height: 100%;
  background: #F8F8F8;
  
  .category-item {
    height: 96rpx;
    line-height: 96rpx;
    text-align: center;
    font-size: 26rpx;
    color: var(--text-secondary);
    position: relative;
    
    &.active {
      background: #fff;
      color: var(--primary-color);
      font-weight: 600;
      
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 6rpx;
        height: 40rpx;
        background: var(--primary-color);
        border-radius: 0 3rpx 3rpx 0;
      }
    }
  }
}

.goods-list-wrapper {
  flex: 1;
  height: 100%;
  padding: 16rpx;
}

.goods-list {
  .goods-card {
    display: flex;
    background: #fff;
    border-radius: 12rpx;
    padding: 20rpx;
    margin-bottom: 16rpx;
    position: relative;
    
    .goods-image {
      width: 180rpx;
      height: 180rpx;
      border-radius: 8rpx;
      flex-shrink: 0;
    }
    
    .goods-info {
      flex: 1;
      margin-left: 20rpx;
      display: flex;
      flex-direction: column;
      
      .goods-name {
        font-size: 28rpx;
        color: var(--text-primary);
        font-weight: 500;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .goods-model {
        font-size: 24rpx;
        color: var(--text-placeholder);
        margin-top: 8rpx;
      }
      
      .goods-bottom {
        margin-top: auto;
        
        .price-row {
          display: flex;
          align-items: baseline;
          
          .price {
            font-size: 34rpx;
            font-weight: 700;
            color: var(--primary-color);
          }
          
          .unit {
            font-size: 22rpx;
            color: var(--text-placeholder);
            margin-left: 4rpx;
          }
        }
        
        .stock-info {
          font-size: 22rpx;
          color: var(--text-secondary);
          margin-top: 6rpx;
          
          &.low {
            color: #E6A23C;
          }
        }
      }
    }
    
    .add-cart-btn {
      position: absolute;
      right: 20rpx;
      bottom: 20rpx;
      width: 56rpx;
      height: 56rpx;
      border: 2rpx solid var(--primary-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

.load-more {
  text-align: center;
  padding: 24rpx 0;
  font-size: 24rpx;
  color: var(--text-placeholder);
  
  .no-more {
    color: #CCC;
  }
}
</style>
