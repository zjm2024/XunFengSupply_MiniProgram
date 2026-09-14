<template>
  <view class="startup-loading">
    <AppInitializing
      :title="title"
      :description="tip"
      :fill="true"
      :show-brand="true"
    />
  </view>
</template>

<script setup>
import AppInitializing from '@/shared/ui/AppInitializing/AppInitializing.vue'

defineProps({
  title: {
    type: String,
    default: '正在加载采购工作台',
  },
  tip: {
    type: String,
    default: '正在同步账户与采购数据',
  },
})
</script>

<style lang="scss" scoped>
.startup-loading {
  width: 100%;
  height: 100%;
}
</style>
