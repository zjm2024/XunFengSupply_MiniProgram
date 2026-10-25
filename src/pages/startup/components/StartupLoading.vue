<template>
  <view class="startup-loading">
    <AppInitializing
      :title="title ?? t('main.startup.title')"
      :description="tip ?? t('main.startup.tip')"
      :fill="true"
      :show-brand="true"
    />
  </view>
</template>

<script setup>
import AppInitializing from '@/shared/ui/AppInitializing/AppInitializing.vue'
import { t } from '@/shared/i18n/index.js'

defineProps({
  title: {
    type: String,
    default: null,
  },
  tip: {
    type: String,
    default: null,
  },
})
</script>

<style lang="scss" scoped>
.startup-loading {
  width: 100%;
  height: 100%;
}
</style>
