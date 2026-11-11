<template>
  <button class="checkout-spu-header" :class="{ 'has-thumbnail': image !== undefined, 'has-subtotal-label': subtotalLabel }"
    :aria-expanded="!collapsed" :aria-label="name" @tap="emit('toggle')">
    <slot v-if="image !== undefined" name="thumbnail">
      <AppProductImage class="checkout-spu-image" :src="image"
        :show-stock-badge="false" :fallback-icon-size="20" mode="aspectFill" />
    </slot>
    <view class="checkout-spu-copy">
      <text class="checkout-spu-name">{{ name }}</text>
      <text class="checkout-spu-meta">{{ meta }}</text>
    </view>
    <view v-if="subtotalLabel" class="checkout-spu-summary">
      <AmountText class="checkout-spu-total" :text="amount" />
      <view class="checkout-spu-subtotal">
        <text>{{ subtotalLabel }}</text>
        <AppIcon name="chevron-right" :size="12" class="checkout-subtotal-icon" :class="{ expanded: !collapsed }" />
      </view>
    </view>
    <AmountText v-else class="checkout-spu-total" :text="amount" />
    <AppIcon v-if="!subtotalLabel" name="chevron-right" :size="16" class="checkout-collapse-icon" :class="{ expanded: !collapsed }" />
  </button>
</template>
<script setup>
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
/** 两端结算共用SPU折叠标题，小计与数量由服务端预览或当前领域模型提供。 */
defineProps({ name: String, meta: String, amount: String, collapsed: Boolean, image: String, subtotalLabel: String })
const emit=defineEmits(['toggle'])
</script>
<style scoped lang="scss">
@import '@/subPackages/commerce/pages/checkout/presentation.scss';

.checkout-spu-header.has-thumbnail {
  grid-template-columns: 48px minmax(0, 1fr) minmax(48px, auto) 16px;
  min-height: 72px;
  gap: 8px;
}

.checkout-spu-image {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-xs, 6px);
}

.has-thumbnail .checkout-spu-name {
  display: -webkit-box;
  white-space: normal;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

@media (max-width: 360px) {
  .checkout-spu-header.has-thumbnail { grid-template-columns: 38px minmax(0, 1fr) minmax(44px, auto) 16px; padding-inline: 8px; }
  .checkout-spu-image { width: 38px; height: 38px; }
}
.checkout-spu-header.has-subtotal-label {
  grid-template-columns: 48px minmax(0, 1fr) minmax(0, 32%);
  background: var(--surface-card, #fff);
}
.checkout-spu-summary { display: flex; min-width: 0; flex-direction: column; align-items: flex-end; gap: 4px; }
.checkout-spu-subtotal {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-secondary, #676A73);
  font-size: var(--type-caption-size, 12px);
  line-height: 16px;
  text-align: right;
}
.checkout-subtotal-icon { flex-shrink: 0; transform: rotate(90deg); }
.checkout-subtotal-icon.expanded { transform: rotate(-90deg); }

@media (max-width: 360px) {
  .checkout-spu-header.has-subtotal-label { grid-template-columns: 38px minmax(0, 1fr) minmax(0, 35%); }
}
</style>
