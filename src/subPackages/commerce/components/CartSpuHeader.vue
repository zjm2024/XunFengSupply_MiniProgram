<template>
  <view class="spu-header" :class="{ 'has-thumbnail': image !== undefined, 'toggle-on-header': toggleOnHeader }" @tap="toggleOnHeader && emit('toggle')">
    <label class="check-wrap group-check" :aria-label="selectLabel" @tap.stop="!disabled && emit('select')"><view class="check" :class="{ checked:selected, indeterminate:partial }"><text v-if="selected">✓</text><text v-else-if="partial">—</text></view></label>
    <AppProductImage v-if="image !== undefined" class="spu-thumbnail" :src="image" :show-stock-badge="false" :fallback-icon-size="18" @click="!toggleOnHeader && emit('product')" />
    <view class="spu-copy" @tap="!toggleOnHeader && emit('product')"><text class="spu-name">{{ name }}</text><text class="spu-meta">{{ meta }}</text></view>
    <view v-if="subtotalLabel" class="spu-summary">
      <AmountText class="spu-total" :text="amount" />
      <text class="spu-subtotal-label">{{ subtotalLabel }}</text>
    </view>
    <AmountText v-else class="spu-total" :text="amount" />
    <button class="collapse-btn button-center" :aria-label="collapsed ? expandLabel : collapseLabel" :aria-expanded="!collapsed" @tap.stop="emit('toggle')"><AppIcon name="chevron-right" :size="18" class="collapse-icon" :class="{ expanded:!collapsed }" /></button>
  </view>
</template>
<script setup>
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
/** 经销商与分享购物车共用SPU标题、选择和折叠入口，不依赖购物车或会话。 */
defineProps({ name:String, meta:String, amount:String, image:String, subtotalLabel:String, toggleOnHeader:Boolean, selected:Boolean, partial:Boolean, collapsed:Boolean, disabled:Boolean, selectLabel:{type:String,default:'选择本商品全部规格'}, expandLabel:{type:String,default:'展开规格'}, collapseLabel:{type:String,default:'收起规格'} })
const emit=defineEmits(['select','product','toggle'])
</script>
<style scoped lang="scss">
@import '@/subPackages/commerce/pages/cart/presentation.scss';

.spu-header.has-thumbnail {
  grid-template-columns: 24px 38px minmax(0, 1fr) minmax(52px, 22%) 26px;
  gap: 6px;
  min-height: 56px;
  padding: 6px 10px;
}
.has-thumbnail .group-check { display: flex; min-height: 44px; align-items: center; justify-content: center; padding: 0; }
.spu-thumbnail { width: 38px; height: 38px; border-radius: 8px; }
.has-thumbnail .spu-name { font-size: 13px; line-height: 18px; }
.has-thumbnail .spu-meta { margin-top: 1px; line-height: 16px; }
.spu-summary { display: flex; min-width: 0; flex-direction: column; align-items: flex-end; }
.has-thumbnail .spu-total { display: inline-flex; color: var(--type-title-color, #16181d); font-size: 13px; font-weight: 600; }
.spu-subtotal-label { color: var(--type-secondary-color, #676A73); font-size: 10px; line-height: 14px; }
.has-thumbnail .collapse-btn { width: 28px; height: 44px; background: transparent; }
.toggle-on-header .collapse-btn { background: transparent; }
</style>
