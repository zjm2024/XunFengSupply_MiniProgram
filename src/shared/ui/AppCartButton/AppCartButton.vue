<template>
  <button class="app-cart-button" :disabled="disabled" :aria-label="'购物车，' + count + '件商品'" hover-class="app-cart-button--pressed" @tap="$emit('tap')"><AppIcon name="cart" :size="24" /><text v-if="count > 0" class="cart-count-badge">{{ count > 99 ? '99+' : count }}</text></button>
</template>
<script setup>
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
/** 只展示购物车图标与右上角数量，不读取采购或访客购物车。 */
defineProps({ count: { type: Number, default: 0 }, disabled: Boolean })
defineEmits(['tap'])
</script>
<style scoped>
.app-cart-button{position:relative;display:flex;width:52px;height:52px;margin:0;padding:0;align-items:center;justify-content:center;overflow:visible;border:1px solid var(--border-color,#e4e6eb);border-radius:50%;background:var(--surface-card,#fff);color:var(--text-primary,#1b1c20);box-shadow:0 6px 22px rgba(40,48,65,.16)}.app-cart-button::after{display:none}.cart-count-badge{position:absolute;right:-3px;top:-4px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:18px;height:18px;padding:0 4px;border-radius:10px;background:var(--primary-color,#d7192d);color:#fff;font-size:10px;font-weight:600;line-height:18px}.app-cart-button--pressed{opacity:.8}.app-cart-button[disabled]{opacity:.5}
</style>
