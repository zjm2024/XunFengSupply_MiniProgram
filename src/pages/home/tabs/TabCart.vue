<template>
  <view class="tab-page">
    <view v-if="loading && !cartStore.loaded" class="state-box"><view class="loading-dot"></view><text>正在同步购物车...</text></view>

    <view v-else-if="!cartStore.isEmpty">
      <view class="summary-grid">
        <view class="summary-card summary-card--primary"><text class="summary-label">已选金额</text><text class="summary-value summary-value--amount">{{ cartStore.formattedTotalAmount }}</text><text class="summary-hint">以服务端实时价格为准</text></view>
        <view class="summary-card"><text class="summary-label">商品种类</text><text class="summary-value">{{ cartStore.summary.productCount }}</text><text class="summary-hint">种商品</text></view>
        <view class="summary-card"><text class="summary-label">采购数量</text><text class="summary-value">{{ cartStore.summary.totalQuantity }}</text><text class="summary-hint">件商品</text></view>
      </view>

      <view class="cart-preview">
        <view class="section-heading"><view><text class="section-title">已选货品</text><text class="section-subtitle">展示最近 {{ previewItems.length }} 项</text></view><text class="item-count">共 {{ cartStore.cartBadgeCount }} 件</text></view>
        <view class="cart-list">
          <view v-for="item in previewItems" :key="item.cartItemId" class="cart-item" @click="openProduct(item)">
            <view class="item-image-wrap"><AppProductImage class="item-image" :src="item.image" :stock="item.stock" /></view>
            <view class="item-copy"><text class="item-name">{{ item.name || `商品 ${item.productId}` }}</text><text v-if="item.skuName" class="item-spec">{{ item.skuName }}</text><view class="item-price-row"><text class="item-price">¥{{ formatPrice(item.price) }}</text><text class="item-quantity">× {{ item.quantity }}</text></view></view>
            <AppIcon class="item-arrow" name="chevron-right" :size="17" />
          </view>
        </view>
      </view>

      <view class="cart-action" @click="openCart"><view><text class="action-title">进入购物车</text><text class="action-subtitle">调整数量、勾选商品并提交订单</text></view><view class="action-arrow"><AppIcon name="arrow-right" :size="20" /></view></view>
    </view>

    <view v-else class="empty-cart">
      <view class="empty-illustration">
        <AppSvgIllustration :svg="emptyCartSvg" size="lg" />
      </view>
      <text class="empty-title">购物车还是空的</text>
      <text class="empty-text">前往商品分类，选择需要采购的体育用品。</text>
      <view class="primary-button" @click="openProductList"><text>去选购商品</text><AppIcon name="arrow-right" :size="17" /></view>
    </view>
  </view>
</template>

<script setup>
import { computed, watch } from 'vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useCart } from '@/subPackages/commerce/composables/useCart.js'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import emptyCartSvg from '../../../shared/assets/illustrations/empty-cart.svg?raw'

const props = defineProps({ active: { type: Boolean, default: false } })
const { cartStore, loading, loadCart } = useCart({ autoSchedule: false })
const previewItems = computed(() => cartStore.validItems.slice(0, 4))

watch(() => props.active, active => {
  if (active) loadCart({ silent: cartStore.loaded }).catch(error => console.warn('[HomeCart] 购物车同步失败:', error))
}, { immediate: true })

function formatPrice(price) { return Number(price || 0).toFixed(2) }

async function openProduct(item) {
  if (item?.productId) await navigator.navigateTo(routes.commerce.productDetail(item.productId))
}

async function openCart() { await navigator.navigateTo(routes.commerce.cart()) }
async function openProductList() { await navigator.navigateTo(routes.commerce.productList()) }
</script>

<style lang="scss" scoped>
.tab-page { width: 100%; max-width: 1180px; min-height: 100%; margin: 0 auto; padding: 18px 16px calc(80px + env(safe-area-inset-bottom)); box-sizing: border-box; }
.page-heading, .section-heading, .cart-item, .item-price-row, .cart-action, .primary-button { display: flex; align-items: center; }
.page-heading { justify-content: space-between; gap: 18px; padding: 20px; border: 1px solid rgba(255,255,255,.86); border-radius: 24px; background: linear-gradient(145deg, rgba(255,255,255,.94), rgba(255,246,229,.86)); box-shadow: 0 14px 36px rgba(55,40,43,.06); }
.heading-copy { display: flex; min-width: 0; flex-direction: column; }
.page-kicker { color: #b86c08; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; }
.page-title { margin-top: 5px; font-size: 24px; font-weight: 780; }
.page-description { margin-top: 7px; color: #6e7179; font-size: 12px; line-height: 1.6; }
.heading-icon { display: grid; place-items: center; width: 54px; height: 54px; flex-shrink: 0; border-radius: 18px; color: #fff; background: linear-gradient(145deg, #f4a51d, #d87908); box-shadow: 0 12px 25px rgba(217,119,6,.2); }
.summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; margin-top: 16px; }
.summary-card { display: flex; min-width: 0; min-height: 110px; padding: 15px 12px; align-items: center; justify-content: center; flex-direction: column; box-sizing: border-box; border: 1px solid rgba(255,255,255,.9); border-radius: 19px; background: rgba(255,255,255,.76); box-shadow: 0 10px 26px rgba(45,40,42,.05); }
.summary-card--primary { background: linear-gradient(145deg, rgba(255,255,255,.95), rgba(255,239,241,.86)); }
.summary-label { color: #777b84; font-size: 10px; }
.summary-value { margin-top: 7px; color: #30323a; font-size: 24px; font-weight: 780; }
.summary-value--amount { color: var(--color-brand, #d7192d); font-size: 18px; }
.summary-hint { margin-top: 5px; color: #a0a2a9; font-size: 9px; text-align: center; }
.cart-preview { margin-top: 16px; padding: 17px; border: 1px solid rgba(255,255,255,.9); border-radius: 22px; background: rgba(255,255,255,.76); box-shadow: 0 12px 30px rgba(45,40,42,.05); }
.section-heading { justify-content: space-between; margin-bottom: 12px; }
.section-heading > view { display: flex; flex-direction: column; }
.section-title { font-size: 17px; font-weight: 750; }
.section-subtitle, .item-count { margin-top: 3px; color: #999ca3; font-size: 10px; }
.cart-list { display: grid; gap: 9px; }
.cart-item { min-width: 0; padding: 9px; gap: 11px; border: 1px solid rgba(52,54,61,.055); border-radius: 15px; background: rgba(248,249,251,.7); }
.item-image-wrap { width: 58px; height: 58px; flex-shrink: 0; border-radius: 13px; background: #fff; }
.item-image { width: 100%; height: 100%; }
.item-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.item-name { overflow: hidden; font-size: 12px; font-weight: 650; white-space: nowrap; text-overflow: ellipsis; }
.item-spec { margin-top: 4px; overflow: hidden; color: #999ca3; font-size: 9px; white-space: nowrap; text-overflow: ellipsis; }
.item-price-row { margin-top: 7px; gap: 8px; }
.item-price { color: var(--color-brand, #d7192d); font-size: 13px; font-weight: 750; }
.item-quantity { color: #7b7e86; font-size: 10px; }
.item-arrow { color: #a3a5ab; }
.cart-action { min-height: 72px; margin-top: 16px; padding: 0 18px; justify-content: space-between; gap: 14px; border-radius: 20px; color: #fff; background: linear-gradient(100deg, #ef4555, #d7192d 65%, #bb1224); box-shadow: 0 14px 28px rgba(215,25,45,.2); }
.cart-action > view:first-child { display: flex; min-width: 0; flex-direction: column; }
.action-title { font-size: 15px; font-weight: 750; }
.action-subtitle { margin-top: 4px; color: rgba(255,255,255,.76); font-size: 10px; }
.action-arrow { display: grid; place-items: center; width: 38px; height: 38px; flex-shrink: 0; border-radius: 50%; background: rgba(255,255,255,.16); }
.state-box, .empty-cart { display: flex; min-height: 330px; align-items: center; justify-content: center; flex-direction: column; gap: 10px; color: #94979f; font-size: 12px; }
.loading-dot { width: 24px; height: 24px; border: 3px solid rgba(215,25,45,.12); border-top-color: var(--color-brand, #d7192d); border-radius: 50%; animation: spin .9s linear infinite; }
.empty-illustration { margin-bottom: 8px; }
.empty-title { margin-top: 5px; color: #363840; font-size: 18px; font-weight: 750; }
.empty-text { max-width: 260px; line-height: 1.6; text-align: center; }
.primary-button { min-height: 44px; margin-top: 8px; padding: 0 20px; justify-content: center; gap: 7px; border-radius: 15px; color: #fff; font-size: 13px; font-weight: 700; background: linear-gradient(100deg, #ef4555, #d7192d); }
@keyframes spin { to { transform: rotate(360deg); } }
@media screen and (min-width: 800px) {
  .tab-page { padding: 18px 24px 18px; }
  .page-heading { padding: 24px 28px; }
  .summary-grid { gap: 16px; }
  .summary-card { min-height: 128px; }
  .summary-value { font-size: 30px; }
  .summary-value--amount { font-size: 25px; }
  .cart-list { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
</style>
