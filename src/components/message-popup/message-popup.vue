<!--
  消息推送弹窗组件
  用途：实时推送订单状态变更、付款提醒、发货通知等系统消息
  全局悬浮展示，点击跳转对应页面
-->
<template>
  <view class="message-popup" v-if="visible" @click="handleClick">
    <view class="popup-container" :class="{ 'slide-in': visible }">
      <view class="msg-icon" :class="'type-' + message.type">
        <text>{{ getTypeIcon(message.type) }}</text>
      </view>
      <view class="msg-body">
        <text class="msg-title">{{ message.title }}</text>
        <text class="msg-summary">{{ message.summary }}</text>
      </view>
      <view class="close-btn" @click.stop="close">
        <uni-icons type="clear" size="18" color="#999" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  message: { 
    type: Object, 
    default: () => ({ type: 99, title: '', summary: '' }) 
  }
})

const emit = defineEmits(['close', 'click'])
const visible = ref(false)

let hideTimer = null

/**
 * 显示消息弹窗
 */
function show() {
  visible.value = true
  
  // 5秒后自动隐藏
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    close()
  }, 5000)
}

/**
 * 关闭弹窗
 */
function close(e) {
  if (e) e.stopPropagation()
  visible.value = false
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  emit('close')
}

/**
 * 点击消息
 */
function handleClick() {
  emit('click', props.message)
  close()
}

function getTypeIcon(type) {
  const icons = { 1: '📦', 2: '💰', 3: '🚚', 4: '🔄', 5: '📋', 99: '📢' }
  return icons[type] || '📌'
}

defineExpose({ show, close })
</script>

<style lang="scss" scoped>
.message-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  display: flex;
  justify-content: center;
  padding-top: calc(env(safe-area-inset-top) + 20rpx);
  pointer-events: none;
  
  .popup-container {
    display: flex;
    align-items: center;
    background: #fff;
    border-radius: 12rpx;
    padding: 20rpx 28rpx;
    box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
    max-width: 650rpx;
    pointer-events: auto;
    transform: translateY(-120%);
    transition: transform 0.3s ease-out;
    
    &.slide-in {
      transform: translateY(0);
    }
    
    .msg-icon {
      width: 68rpx;
      height: 68rpx;
      border-radius: 14rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30rpx;
      flex-shrink: 0;
      margin-right: 18rpx;
      
      &.type-1 { background: rgba(64, 158, 255, 0.1); }
      &.type-2 { background: rgba(230, 162, 60, 0.1); }
      &.type-3 { background: rgba(103, 194, 58, 0.1); }
      &.type-4 { background: rgba(196, 30, 58, 0.1); }
      &.type-5 { background: rgba(144, 147, 153, 0.1); }
      &.type-99 { background: rgba(255, 152, 0, 0.1); }
    }
    
    .msg-body {
      flex: 1;
      min-width: 0;
      
      .msg-title {
        display: block;
        font-size: 27rpx;
        font-weight: 500;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .msg-summary {
        display: block;
        font-size: 23rpx;
        color: var(--text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-top: 4rpx;
      }
    }
    
    .close-btn {
      padding: 8rpx;
      margin-left: 12rpx;
      flex-shrink: 0;
    }
  }
}
</style>
