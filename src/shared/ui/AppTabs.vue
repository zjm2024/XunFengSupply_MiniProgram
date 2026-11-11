<template>
  <scroll-view class="app-tabs" scroll-x :show-scrollbar="false">
    <view class="app-tabs-track" role="tablist">
      <button v-for="item in items" :key="String(valueOf(item))" class="app-tab"
        :class="{ active: valueOf(item) === modelValue }" role="tab"
        :aria-selected="valueOf(item) === modelValue" :aria-controls="item.panelId"
        :disabled="item.disabled" @tap="select(valueOf(item))">{{ item.label }}</button>
    </view>
  </scroll-view>
</template>

<script setup>
const props = defineProps({
  items: { type: Array, default: () => [] },
  modelValue: { type: null, default: null },
})
const emit = defineEmits(['update:modelValue', 'change'])
function valueOf(item) { return Object.prototype.hasOwnProperty.call(item, 'value') ? item.value : item.key }
/** 内容页签只发送选择事件；内容和数据加载由页面持有。 */
function select(value) {
  if (value === props.modelValue || !props.items.some(item => valueOf(item) === value && !item.disabled)) return
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped lang="scss">
.app-tabs { display: block; width: 100%; white-space: nowrap; }
.app-tabs-track { display: flex; align-items: center; gap: 16px; min-width: max-content; }
.app-tab { position: relative; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; min-width: 80px; min-height: 44px; margin: 0; padding: 10px 12px; border: 0; border-radius: 0; background: transparent; color: var(--text-secondary, #737A84); font-size: var(--type-body-size, 14px); line-height: 20px; }
.app-tab::after { border: 0; }
.app-tab.active { color: var(--text-primary, #1B1C20); font-weight: var(--font-weight-semibold, 600); }
.app-tab.active::before { position: absolute; bottom: 0; left: 50%; width: 24px; height: 3px; border-radius: 3px; background: var(--color-brand, #D7192D); transform: translateX(-50%); content: ''; }
.app-tab[disabled] { color: var(--color-text-disabled, #B8BBC2); }
</style>
