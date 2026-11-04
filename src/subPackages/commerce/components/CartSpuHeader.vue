<template>
  <view class="spu-header">
    <label class="check-wrap group-check" :aria-label="selectLabel" @tap.stop="!disabled && emit('select')"><view class="check" :class="{ checked:selected, indeterminate:partial }"><text v-if="selected">✓</text><text v-else-if="partial">—</text></view></label>
    <view class="spu-copy" @tap="emit('product')"><text class="spu-name">{{ name }}</text><text class="spu-meta">{{ meta }}</text></view>
    <AmountText class="spu-total" :text="amount" />
    <button class="collapse-btn button-center" :aria-label="collapsed ? expandLabel : collapseLabel" :aria-expanded="!collapsed" @tap.stop="emit('toggle')"><AppIcon name="chevron-right" :size="17" class="collapse-icon" :class="{ expanded:!collapsed }" /></button>
  </view>
</template>
<script setup>
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
/** 经销商与分享购物车共用SPU标题、选择和折叠入口，不依赖购物车或会话。 */
defineProps({ name:String, meta:String, amount:String, selected:Boolean, partial:Boolean, collapsed:Boolean, disabled:Boolean, selectLabel:{type:String,default:'选择本商品全部规格'}, expandLabel:{type:String,default:'展开规格'}, collapseLabel:{type:String,default:'收起规格'} })
const emit=defineEmits(['select','product','toggle'])
</script>
<style scoped lang="scss">
@import '@/subPackages/commerce/pages/cart/presentation.scss';
</style>
