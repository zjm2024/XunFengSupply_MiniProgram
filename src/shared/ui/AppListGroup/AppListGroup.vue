<template>
  <view class="app-list-section">
    <view v-if="title || description" class="section-heading">
      <text v-if="title" class="section-title">{{ title }}</text>
      <text v-if="description" class="section-description">{{ description }}</text>
    </view>
    <view class="app-list-group" :class="{ compact }">
      <slot />
    </view>
  </view>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  compact: { type: Boolean, default: false },
})
</script>

<style scoped>
.app-list-section { min-width: 0; }

.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 0 4px 8px;
}

.section-title {
  color: var(--text-secondary, #62666F);
  font-size: var(--font-size-caption, 12px);
  font-weight: var(--font-weight-semibold, 600);
  line-height: 18px;
}

.section-description {
  color: var(--text-tertiary, #969AA3);
  font-size: var(--font-size-micro, 11px);
  line-height: 16px;
  text-align: right;
}

.app-list-group {
  overflow: hidden;
  background: var(--surface-card, #FFFFFF);
  border: 1px solid var(--divider-color, #ECEEF2);
  border-radius: var(--radius-base, 14px);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(17, 18, 22, 0.03));
}

.app-list-group.compact { border-radius: var(--radius-control, 10px); }
</style>
