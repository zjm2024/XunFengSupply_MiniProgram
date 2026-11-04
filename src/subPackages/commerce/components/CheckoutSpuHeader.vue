<template>
  <button class="checkout-spu-header" :aria-expanded="!collapsed" :aria-label="(collapsed ? '展开' : '收起') + name" @tap="emit('toggle')"><view class="checkout-spu-copy"><text class="checkout-spu-name">{{ name }}</text><text class="checkout-spu-meta">{{ meta }}</text></view><AmountText class="checkout-spu-total" :text="amount" /><AppIcon name="chevron-right" :size="18" class="checkout-collapse-icon" :class="{ expanded:!collapsed }" /></button>
</template>
<script setup>
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
/** 两端结算共用SPU折叠标题，小计与数量由服务端预览或当前领域模型提供。 */
defineProps({ name:String, meta:String, amount:String, collapsed:Boolean })
const emit=defineEmits(['toggle'])
</script>
<style scoped lang="scss">
@import '@/subPackages/commerce/pages/checkout/presentation.scss';
</style>
