﻿<template>
  <view
    class="app-list-item"
    :class="[{ disabled, danger, clickable: clickable && !disabled }]"
    :hover-class="clickable && !disabled ? 'item-pressed' : 'none'"
    :hover-start-time="0"
    :hover-stay-time="80"
    @tap="handleTap"
  >
    <view v-if="icon || $slots.icon" class="item-icon" aria-hidden="true">
      <slot name="icon">
        <AppIcon :name="icon" :size="22" :stroke-width="1.8" />
      </slot>
    </view>

    <view class="item-main">
      <text class="item-label">{{ label }}</text>
      <text v-if="description" class="item-description">{{ description }}</text>
    </view>

    <view v-if="value || $slots.value" class="item-value">
      <slot name="value">{{ value }}</slot>
    </view>
    <slot name="action" />

    <AppIcon
      v-if="showArrow && clickable"
      class="item-arrow"
      name="chevron-right"
      :size="20"
      :stroke-width="2"
      aria-hidden="true"
    />
  </view>
</template>

<script setup>
import AppIcon from '../AppIcon/AppIcon.vue'

const props = defineProps({
  label: { type: String, required: true },
  description: { type: String, default: '' },
  value: { type: [String, Number], default: '' },
  icon: { type: String, default: '' },
  clickable: { type: Boolean, default: true },
  showArrow: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  danger: { type: Boolean, default: false },
})

const emit = defineEmits(['tap'])

function handleTap(event) {
  if (props.clickable && !props.disabled) emit('tap', event)
}
</script>

<style scoped>
.app-list-item {
  position: relative;
  display: flex;
  align-items: center;
  min-height: var(--list-item-height, 56px);
  padding: 10px 16px;
  gap: 12px;
  background: var(--surface-card, #FFFFFF);
}

.app-list-item::after {
  content: '';
  position: absolute;
  right: 16px;
  bottom: 0;
  left: 50px;
  height: 1px;
  background: var(--divider-color, #ECEEF2);
}

.app-list-item:last-child::after { display: none; }
.item-pressed { background: var(--surface-subtle, #FCFCFD); }

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  color: var(--icon-secondary, #62666F);
}

.item-main { flex: 1; min-width: 0; }
.item-label, .item-description { display: block; }

.item-label {
  overflow: hidden;
  color: var(--text-primary, #1B1C20);
  font-size: var(--font-size-md, 16px);
  font-weight: var(--font-weight-regular, 400);
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-description {
  margin-top: 2px;
  overflow: hidden;
  color: var(--text-secondary, #62666F);
  font-size: var(--font-size-caption, 12px);
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-value {
  max-width: 42%;
  overflow: hidden;
  color: var(--text-tertiary, #969AA3);
  font-size: var(--font-size-base, 14px);
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-arrow { color: var(--icon-muted, #969AA3) !important; }
.danger .item-label, .danger .item-icon { color: var(--danger-color, #B42318); }
.disabled { opacity: 0.45; }

@media screen and (min-width: 600px) {
  .app-list-item { min-height: 60px; padding-right: 18px; padding-left: 18px; }
  .app-list-item::after { right: 18px; left: 54px; }
}
</style>
