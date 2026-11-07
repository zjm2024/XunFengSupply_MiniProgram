<template>
  <!-- #ifdef H5 -->
  <VueTeleport to="body">
  <!-- #endif -->
    <view v-show="visible" class="share-overlay-portal"><slot /></view>
  <!-- #ifdef H5 -->
  </VueTeleport>
  <!-- #endif -->
</template>
<script setup>
// #ifdef H5
import { Teleport as VueTeleport } from 'vue'
// #endif
/** 持续挂载以保留visible驱动的初始化；H5明确挂到body，脱离卡片和页面裁切。 */
defineProps({visible:Boolean})
</script>
<style scoped>
.share-overlay-portal{position:fixed;inset:0;z-index:2200;pointer-events:auto;isolation:isolate}
</style>
