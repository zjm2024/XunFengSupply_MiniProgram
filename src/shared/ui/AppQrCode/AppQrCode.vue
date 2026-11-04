<template>
  <view v-if="matrix.length" class="app-qr" :style="{ padding: quiet + 'px', width: side + 'px', height: side + 'px' }" role="img" aria-label="分享链接二维码">
    <view v-for="(row, y) in matrix" :key="y" class="app-qr-row" :style="{ height: cell + 'px' }">
      <view v-for="(dark, x) in row" :key="x" class="app-qr-cell" :style="{ width: cell + 'px', height: cell + 'px', backgroundColor: dark ? '#000' : '#fff' }" />
    </view>
  </view>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({ matrix: { type: Array, default: () => [] }, size: { type: Number, default: 260 } })
// 整像素模块和四模块白边保证三个平台显示同一二维码。
const cell = computed(() => Math.max(1, Math.floor(props.size / (props.matrix.length + 8))))
const quiet = computed(() => cell.value * 4)
const side = computed(() => cell.value * props.matrix.length)
</script>
<style scoped>
.app-qr{box-sizing:content-box;flex:none;margin:12px auto;background:#fff;overflow:hidden}.app-qr-row{display:flex;flex:none}.app-qr-cell{flex:none}
</style>
