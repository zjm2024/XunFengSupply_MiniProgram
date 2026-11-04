<template>
  <view v-if="message" class="share-availability" role="status">
    <AppIcon name="info" :size="16" /><text>{{ message }}</text>
  </view>
</template>
<script setup>
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
defineProps({ message: { type: String, default: '' } })
</script>
<style scoped>
.share-availability{display:flex;align-items:flex-start;gap:8px;padding:12px 16px;color:var(--text-secondary);background:var(--surface-subtle);font-size:var(--font-size-caption,12px);line-height:20px}.share-availability text{flex:1;min-width:0;overflow-wrap:anywhere}
</style>
