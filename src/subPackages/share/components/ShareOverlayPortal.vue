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
.share-overlay-portal :deep(.express-picker){position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center}
.share-overlay-portal :deep(.express-picker__sheet){position:relative;inset:auto;transform:none;width:100%;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);display:flex;flex-direction:column;animation:none}
.share-overlay-portal :deep(.express-picker__header){flex-shrink:0}
.share-overlay-portal :deep(.express-picker__list){display:block;min-height:0;overflow-y:auto;flex:1}
.share-overlay-portal :deep(.option-list){min-height:0;overflow-y:auto}
.share-overlay-portal :deep(.picker-panel){max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);min-height:0}
@media(min-width:768px){.share-overlay-portal :deep(.area-picker-overlay){align-items:center;padding:24px;box-sizing:border-box}.share-overlay-portal :deep(.picker-panel){width:560px;max-width:100%;height:min(680px,80vh);border-radius:18px}.share-overlay-portal :deep(.express-picker){align-items:center;padding:24px;box-sizing:border-box}.share-overlay-portal :deep(.express-picker__sheet){width:560px;max-width:100%;border-radius:18px}}
</style>
