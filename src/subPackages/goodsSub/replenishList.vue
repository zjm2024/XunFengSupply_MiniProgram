<!--
  补货清单选购页面（分包：goodsSub）
  对应业务流程节点：
  工作台选购 → 补货清单选购渠道（基于历史采购智能推荐）
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="补货清单" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="replenish-page">
          <!-- 页面标题栏 -->
          <view class="page-header">
            <text class="page-subtitle">基于您的采购历史智能推荐</text>
          </view>

          <!-- 批量操作栏 -->
          <view class="batch-bar" v-if="replenishList.length > 0">
            <batch-checkbox 
              :checked="isAllSelected"
              @toggle="toggleSelectAll"
            />
            <text class="select-text">全选</text>
            <view class="batch-actions">
              <text class="action-text primary" @click="batchAddCart">批量加入购物车</text>
            </view>
          </view>

          <!-- 补货清单列表 -->
          <scroll-view class="list-wrapper" scroll-y @scrolltolower="loadMore">
            <view class="replenish-list">
              <view 
                class="replenish-item" 
                v-for="item in replenishList" 
                :key="item.goodsId"
              >
                <batch-checkbox 
                  :checked="isSelected(item.goodsId)"
                  @toggle="toggleSelect(item.goodsId)"
                />
                
                <image class="item-image" :src="item.image" mode="aspectFill" @click="goToDetail(item.goodsId)" />
                
                <view class="item-info" @click="goToDetail(item.goodsId)">
                  <text class="item-name">{{ item.goodsName }}</text>
                  <text class="item-sku">{{ item.skuName }}</text>
                  
                  <view class="item-middle">
                    <text class="last-buy">上次购买: {{ item.lastBuyDate }}</text>
                    <text class="buy-count">累计采购: {{ item.totalBuyCount }}次</text>
                  </view>
                  
                  <view class="item-bottom">
                    <text class="price">¥{{ (item.price / 100).toFixed(2) }}</text>
                    
                    <!-- 推荐数量修改器 -->
                    <view class="rec-qty">
                      <text class="rec-label">建议</text>
                      <view class="qty-stepper">
                        <view class="step-btn" @click.stop="changeQty(item, -1)">-</view>
                        <text class="qty-val">{{ item.recommendQty }}</text>
                        <view class="step-btn" @click.stop="changeQty(item, 1)">+</view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <empty-view v-if="!loading && replenishList.length === 0" text="暂无补货推荐" />
            
            <view class="load-more" v-if="replenishList.length > 0">
              <text v-if="hasMore">加载中...</text>
              <text v-else class="no-more">— 已经到底了 —</text>
            </view>
          </scroll-view>

          <!-- 底部占位 -->
          <view style="height: 100rpx;" v-if="selectedIds.length > 0" />
        </view>
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar v-if="selectedIds.length > 0">
        <view class="footer-bar-inner">
          <text class="selected-count">已选 {{ selectedIds.length }} 种商品</text>
          <button class="add-all-btn" @click="batchAddCart">全部加入购物车</button>
        </view>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getReplenishList, addReplenishToCart } from '../../api/goods.js'
import batchCheckbox from '../../components/batch-checkbox/batch-checkbox.vue'
import emptyView from '../../components/empty-view/empty-view.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppContent from '@/components/AppContent/AppContent.vue'
import FixedActionBar from '@/components/FixedActionBar/FixedActionBar.vue'
import { safeNavigateTo } from '../../utils/routeGuard.js'

const replenishList = ref([])
const selectedIds = ref([])
const loading = ref(false)
const hasMore = ref(true)

const isAllSelected = computed(() => 
  replenishList.value.length > 0 && selectedIds.value.length === replenishList.value.length
)

onShow(() => {
  loadReplenishList()
})

/**
 * 加载补货清单
 * TODO: 调用 getReplenishList() 接口
 */
async function loadReplenishList() {
  loading.value = true
  try {
    // const res = await getReplenishList()
    // replenishList.value = res.list
    loading.value = false
  } catch (e) {
    console.error('加载补货清单失败:', e)
    loading.value = false
  }
}

function loadMore() {
  // 分页加载更多
}

function isSelected(goodsId) {
  return selectedIds.value.includes(goodsId)
}

function toggleSelect(goodsId) {
  const idx = selectedIds.value.indexOf(goodsId)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(goodsId)
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = replenishList.value.map(item => item.goodsId)
  }
}

function changeQty(item, delta) {
  const newQty = item.recommendQty + delta
  if (newQty >= 1) item.recommendQty = newQty
}

/**
 * 批量加入购物车
 * TODO: 调用 addReplenishToCart(items) 接口
 */
async function batchAddCart() {
  if (selectedIds.value.length === 0) {
    uni.showToast({ title: '请先选择商品', icon: 'none' })
    return
  }
  
  const items = replenishList.value
    .filter(item => selectedIds.value.includes(item.goodsId))
    .map(item => ({
      goodsId: item.goodsId,
      skuId: item.defaultSkuId,
      quantity: item.recommendQty
    }))
  
  try {
    // await addReplenishToCart(items)
    uni.showToast({ title: `已添加${items.length}种商品`, icon: 'success' })
    selectedIds.value = []
  } catch (e) {
    console.error('批量加购失败:', e)
  }
}

function goToDetail(goodsId) {
  safeNavigateTo(`/subPackages/goodsSub/goodsDetail?goodsId=${goodsId}`)
}
</script>

<style lang="scss" scoped>
.replenish-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color);
}

.page-header {
  background: #fff;
  padding: 24rpx 32rpx;
  
  .page-subtitle {
    display: block;
    font-size: 24rpx;
    color: var(--text-placeholder);
  }
}

.batch-bar {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 20rpx 24rpx;
  margin-top: 2rpx;
  
  .select-text {
    font-size: 26rpx;
    color: var(--text-primary);
    margin-left: 12rpx;
  }
  
  .batch-actions {
    margin-left: auto;
    
    .action-text {
      font-size: 26rpx;
      color: var(--primary-color);
      font-weight: 500;
    }
  }
}

.list-wrapper {
  flex: 1;
  padding: 16rpx 24rpx;
}

.replenish-list {
  .replenish-item {
    display: flex;
    align-items: flex-start;
    background: #fff;
    border-radius: 12rpx;
    padding: 24rpx 20rpx;
    margin-bottom: 16rpx;
    
    .item-image {
      width: 160rpx;
      height: 160rpx;
      border-radius: 8rpx;
      margin-left: 16rpx;
      flex-shrink: 0;
    }
    
    .item-info {
      flex: 1;
      margin-left: 16rpx;
      min-width: 0;
      
      .item-name {
        font-size: 28rpx;
        color: var(--text-primary);
        font-weight: 500;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .item-sku {
        display: block;
        font-size: 22rpx;
        color: var(--text-placeholder);
        margin-top: 6rpx;
      }
      
      .item-middle {
        display: flex;
        gap: 20rpx;
        margin-top: 10rpx;
        
        .last-buy, .buy-count {
          font-size: 22rpx;
          color: var(--text-secondary);
          background: var(--bg-color);
          padding: 2rpx 12rpx;
          border-radius: 4rpx;
        }
      }
      
      .item-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 14rpx;
        
        .price {
          font-size: 32rpx;
          font-weight: 700;
          color: var(--primary-color);
        }
        
        .rec-qty {
          display: flex;
          align-items: center;
          
          .rec-label {
            font-size: 22rpx;
            color: var(--text-placeholder);
            margin-right: 8rpx;
          }
          
          .qty-stepper {
            display: flex;
            align-items: center;
            border: 1rpx solid var(--border-color);
            border-radius: 6rpx;
            
            .step-btn {
              width: 44rpx;
              height: 44rpx;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 26rpx;
              color: var(--primary-color);
            }
            
            .qty-val {
              width: 52rpx;
              text-align: center;
              font-size: 24rpx;
            }
          }
        }
      }
    }
  }
}

.footer-bar-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  
  .selected-count {
    font-size: 26rpx;
    color: var(--text-secondary);
  }
  
  .add-all-btn {
    width: 280rpx;
    height: 72rpx;
    line-height: 72rpx;
    background: var(--primary-color);
    color: #fff;
    font-size: 28rpx;
    border-radius: 36rpx;
    border: none;
  }
}

.load-more {
  text-align: center;
  padding: 24rpx 0;
  font-size: 24rpx;
  color: var(--text-placeholder);
  
  .no-more { color: #CCC; }
}
</style>
