<template>
  <view v-if="show" class="uni-popup-mask" @click="closeOnClickModal && close()">
    <view class="uni-popup-content" :class="[type]" @click.stop>
      <slot></slot>
    </view>
  </view>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  type: { type: String, default: 'center' }, // center / bottom / top
  closeOnClickModal: { type: Boolean, default: true }
})

const emit = defineEmits(['update:show', 'close'])

function close() {
  emit('update:show', false)
  emit('close')
}
</script>

<style scoped>
.uni-popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.uni-popup-content {
  background: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
  max-width: 80%;
  max-height: 80%;
  overflow: auto;
}

.uni-popup-content.bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 24rpx 24rpx 0 0;
  max-width: 100%;
}

.uni-popup-content.top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  border-radius: 0 0 24rpx 24rpx;
  max-width: 100%;
}
</style>
