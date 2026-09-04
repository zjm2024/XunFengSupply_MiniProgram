<!--
  ⚠️ [DEAD CODE] 此页面已废弃，将被删除！

  旧版购物车批量操作页面（原主包 Tab 页面）
  替代者：pages/cart/index.vue（V2 购物车）

  废弃原因：
  - 不在 pages.json 中注册
  - V2 架构改为无 TabBar 设计
  - 新版购物车路径：/pages/cart/index

  当前状态：DEAD — 无任何活跃引用，等待物理删除
  计划删除版本：阶段1完成后
-->
<template>
  <view class="cart-page">
    <!-- 购物车为空 -->
    <view v-if="cartStore.isEmpty && !cartStore.loading" class="cart-empty">
      <empty-view text="购物车空空如也" />
      <button class="go-shopping-btn" @click="goShopping">去逛逛</button>
    </view>

    <!-- 购物车内容 -->
    <template v-else>
      <!-- 购物车列表 -->
      <scroll-view class="cart-list-wrapper" scroll-y>
        <!-- 店铺分组（按品牌方分组） -->
        <view class="store-group" v-for="group in storeGroupedList" :key="group.storeId">
          <!-- 店铺头部：全选 -->
          <view class="store-header">
            <batch-checkbox 
              :checked="isStoreAllSelected(group)"
              @toggle="toggleStoreSelect(group)"
            />
            <text class="store-name">{{ group.storeName }}</text>
          </view>

          <!-- 商品列表 -->
          <view class="cart-items">
            <view 
              class="cart-item" 
              v-for="item in group.items" 
              :key="item.cartItemId"
            >
              <!-- 选择框 -->
              <batch-checkbox 
                :checked="isSelected(item.cartItemId)"
                @toggle="toggleItemSelect(item.cartItemId)"
              />

              <!-- 商品信息 -->
              <image class="item-image" :src="item.goodsImage" mode="aspectFill" @click="goToDetail(item.goodsId)" />
              
              <view class="item-info">
                <text class="item-name" @click="goToDetail(item.goodsId)">{{ item.goodsName }}</text>
                <text class="item-sku">{{ item.skuName }}</text>
                
                <view class="item-bottom">
                  <view class="price-row">
                    <text class="price">¥{{ (item.price / 100).toFixed(2) }}</text>
                    <text class="stock-hint low-stock" v-if="item.stock < item.quantity">
                      库存不足
                    </text>
                  </view>
                  
                  <!-- 数量修改器 -->
                  <view class="quantity-stepper">
                    <view 
                      class="stepper-btn minus" 
                      :class="{ disabled: item.quantity <= 1 }"
                      @click="changeQuantity(item, -1)"
                    >-</view>
                    <text class="stepper-value">{{ item.quantity }}</text>
                    <view 
                      class="stepper-btn plus"
                      :class="{ disabled: item.quantity >= item.stock }"
                      @click="changeQuantity(item, 1)"
                    >+</view>
                  </view>
                </view>
              </view>

              <!-- 删除按钮 -->
              <view class="delete-btn" @click="confirmDelete(item)">
                <uni-icons type="trash" size="18" color="#999" />
              </view>
            </view>
          </view>
        </view>

        <!-- 底部安全距离 -->
        <view style="height: 140rpx;"></view>
      </scroll-view>

      <!-- 底部结算栏 -->
      <view class="cart-footer">
        <view class="footer-left">
          <batch-checkbox 
            :checked="cartStore.isSelectAll"
            @toggle="toggleSelectAll"
          />
          <text class="select-all-text">全选</text>
        </view>
        
        <view class="footer-right">
          <view class="total-info">
            <text class="total-label">合计:</text>
            <text class="total-price">{{ cartStore.formattedTotalAmount }}</text>
          </view>
          <button 
            class="settle-btn" 
            :class="{ disabled: !cartStore.hasSelected }"
            :disabled="!cartStore.hasSelected"
            @click="goToSettle"
          >
            结算({{ cartStore.summary.selectedCount }})
          </button>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCartStore } from '../../store/modules/cart.js'
import { getCartList, batchUpdateQuantity, batchRemove } from '../../api/cart.js'
import batchCheckbox from '../../components/batch-checkbox/batch-checkbox.vue'
import emptyView from '../../components/empty-view/empty-view.vue'

const cartStore = useCartStore()

// 按店铺分组的购物车列表
const storeGroupedList = computed(() => {
  const groups = {}
  cartStore.cartList.forEach(item => {
    const storeId = item.storeId || 'default'
    if (!groups[storeId]) {
      groups[storeId] = {
        storeId,
        storeName: item.storeName || '薰风体育官方',
        items: []
      }
    }
    groups[storeId].items.push(item)
  })
  return Object.values(groups)
})

onShow(() => {
  loadCartList()
})

/**
 * 加载购物车列表
 * TODO: 调用 getCartList() 接口
 */
async function loadCartList() {
  cartStore.setLoading(true)
  try {
    // const res = await getCartList()
    // cartStore.setCartList(res.list)
    // cartStore.setSummary(res.summary)
    
    // TODO: 替换为真实接口
    cartStore.setLoading(false)
  } catch (e) {
    console.error('加载购物车失败:', e)
    cartStore.setLoading(false)
  }
}

/**
 * 判断是否选中
 */
function isSelected(cartItemId) {
  return cartStore.selectedIds.includes(cartItemId)
}

/**
 * 切换单个商品选中
 */
function toggleItemSelect(cartItemId) {
  cartStore.toggleSelect(cartItemId)
  updateSummary()
}

/**
 * 判断店铺是否全选
 */
function isStoreAllSelected(group) {
  return group.items.every(item => isSelected(item.cartItemId))
}

/**
 * 切换店铺全选
 */
function toggleStoreSelect(group) {
  const allSelected = isStoreAllSelected(group)
  const ids = group.items.map(item => item.cartItemId)
  if (allSelected) {
    cartStore.batchUnselect(ids)
  } else {
    cartStore.batchSelect(ids)
  }
  updateSummary()
}

/**
 * 全选/取消全选
 */
function toggleSelectAll() {
  cartStore.selectAll(!cartStore.isSelectAll)
  updateSummary()
}

/**
 * 修改数量
 */
async function changeQuantity(item, delta) {
  const newQty = item.quantity + delta
  if (newQty < 1 || newQty > item.stock) return
  
  // 先本地更新UI
  cartStore.updateItemQuantity(item.cartItemId, newQty)
  
  try {
    // TODO: 调用 batchUpdateQuantity([{ cartItemId: item.cartItemId, quantity: newQty }])
    updateSummary()
  } catch (e) {
    // 回滚
    cartStore.updateItemQuantity(item.cartItemId, item.quantity)
  }
}

/**
 * 确认删除
 */
function confirmDelete(item) {
  uni.showModal({
    title: '提示',
    content: `确定删除「${item.goodsName}」吗？`,
    confirmColor: '#C41E3A',
    success: async (res) => {
      if (res.confirm) {
        try {
          // TODO: 调用 batchRemove([item.cartItemId])
          cartStore.removeItems([item.cartItemId])
          uni.showToast({ title: '已删除', icon: 'none' })
        } catch (e) {
          console.error('删除失败:', e)
        }
      }
    }
  })
}

/**
 * 更新统计
 * TODO: 调用 getCartSummary() 或本地计算
 */
function updateSummary() {
  // 本地计算统计
  const selectedItems = cartStore.selectedCartItems
  const totalCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  
  cartStore.setSummary({
    totalCount,
    totalAmount,
    selectedCount: selectedItems.length
  })
}

/**
 * 去结算
 */
function goToSettle() {
  if (!cartStore.hasSelected) return
  
  // 将选中的商品ID传给结算页
  const selectedIds = cartStore.selectedIds.join(',')
  uni.navigateTo({
    url: `/subPackages/orderSub/orderConfirm?selectedIds=${selectedIds}`
  })
}

/**
 * 去购物
 */
function goShopping() {
  uni.switchTab({ url: '/pages/classify/classify' })
}

/**
 * 进商品详情
 */
function goToDetail(goodsId) {
  uni.navigateTo({
    url: `/subPackages/goodsSub/goodsDetail?goodsId=${goodsId}`
  })
}
</script>

<style lang="scss" scoped>
.cart-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-color);
}

.cart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  
  .go-shopping-btn {
    margin-top: 40rpx;
    width: 300rpx;
    height: 72rpx;
    line-height: 72rpx;
    background: var(--primary-color);
    color: #fff;
    font-size: 28rpx;
    border-radius: 36rpx;
    border: none;
  }
}

.cart-list-wrapper {
  flex: 1;
  padding: 16rpx 24rpx;
}

.store-group {
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  
  .store-header {
    display: flex;
    align-items: center;
    padding: 24rpx 20rpx;
    border-bottom: 1rpx solid var(--border-color);
    
    .store-name {
      margin-left: 16rpx;
      font-size: 28rpx;
      font-weight: 600;
      color: var(--text-primary);
    }
  }
}

.cart-items {
  .cart-item {
    display: flex;
    align-items: flex-start;
    padding: 24rpx 20rpx;
    position: relative;
    border-bottom: 1rpx solid var(--border-color);
    
    &:last-child {
      border-bottom: none;
    }
    
    .item-image {
      width: 160rpx;
      height: 160rpx;
      border-radius: 8rpx;
      flex-shrink: 0;
      margin-left: 16rpx;
    }
    
    .item-info {
      flex: 1;
      margin-left: 16rpx;
      min-width: 0;
      
      .item-name {
        font-size: 26rpx;
        color: var(--text-primary);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.4;
      }
      
      .item-sku {
        display: block;
        font-size: 22rpx;
        color: var(--text-placeholder);
        margin-top: 8rpx;
      }
      
      .item-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 16rpx;
        
        .price-row {
          .price {
            font-size: 30rpx;
            font-weight: 700;
            color: var(--primary-color);
          }
          
          .stock-hint {
            display: block;
            font-size: 20rpx;
            color: #F56C6C;
            margin-top: 4rpx;
          }
        }
        
        .quantity-stepper {
          display: flex;
          align-items: center;
          border: 1rpx solid var(--border-color);
          border-radius: 6rpx;
          
          .stepper-btn {
            width: 48rpx;
            height: 48rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28rpx;
            color: var(--text-primary);
            
            &.disabled {
              color: #CCC;
            }
            
            &.plus {
              color: var(--primary-color);
              border-left: 1rpx solid var(--border-color);
            }
            
            &.minus {
              border-right: 1rpx solid var(--border-color);
            }
          }
          
          .stepper-value {
            width: 64rpx;
            text-align: center;
            font-size: 26rpx;
          }
        }
      }
    }
    
    .delete-btn {
      position: absolute;
      right: 16rpx;
      top: 24rpx;
      padding: 8rpx;
    }
  }
}

.cart-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.05);
  z-index: 100;
  
  .footer-left {
    display: flex;
    align-items: center;
    
    .select-all-text {
      margin-left: 12rpx;
      font-size: 28rpx;
      color: var(--text-primary);
    }
  }
  
  .footer-right {
    display: flex;
    align-items: center;
    
    .total-info {
      margin-right: 24rpx;
      
      .total-label {
        font-size: 26rpx;
        color: var(--text-secondary);
      }
      
      .total-price {
        font-size: 34rpx;
        font-weight: 700;
        color: var(--primary-color);
      }
    }
    
    .settle-btn {
      width: 200rpx;
      height: 72rpx;
      line-height: 72rpx;
      background: var(--primary-color);
      color: #fff;
      font-size: 28rpx;
      border-radius: 36rpx;
      border: none;
      padding: 0;
      
      &.disabled {
        background: #CCC;
      }
    }
  }
}
</style>
