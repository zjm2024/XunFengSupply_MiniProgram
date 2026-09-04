<template>
  <view v-if="visible" class="popup-overlay" @click="handleOverlayClick">
    <view class="popup-sheet" :class="{ 'is-show': visible }" @click.stop>
      <!-- 关闭按钮 -->
      <view class="popup-close" @click="handleClose">
        <text class="close-text">×</text>
      </view>
      
      <!-- 内容区域 -->
      <view class="popup-content">
        <!-- 标题 -->
        <text v-if="title" class="popup-title">{{ title }}</text>
        
        <!-- 描述 -->
        <text v-if="description" class="popup-desc">{{ description }}</text>
        
        <!-- 自定义内容插槽 -->
        <slot></slot>
        
        <!-- 预览信息 -->
        <view v-if="previewText" class="popup-preview">
          <text class="preview-text">{{ previewText }}</text>
        </view>
      </view>
      
      <!-- 操作按钮 -->
      <view class="popup-actions">
        <button 
          v-if="showCancel" 
          class="action-btn btn-cancel" 
          @click="handleCancel"
        >
          {{ cancelText }}
        </button>
        <button 
          class="action-btn btn-confirm" 
          :class="{ 'is-danger': danger }"
          :disabled="confirmDisabled"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </button>
      </view>
      
      <!-- 安全区 -->
      <view class="safe-area-bottom"></view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  // 是否显示
  modelValue: {
    type: Boolean,
    default: false
  },
  // 标题
  title: {
    type: String,
    default: ''
  },
  // 描述
  description: {
    type: String,
    default: ''
  },
  // 预览文本
  previewText: {
    type: String,
    default: ''
  },
  // 取消按钮文字
  cancelText: {
    type: String,
    default: '取消'
  },
  // 确认按钮文字
  confirmText: {
    type: String,
    default: '确认'
  },
  // 是否显示取消按钮
  showCancel: {
    type: Boolean,
    default: true
  },
  // 确认按钮是否为危险操作（红色）
  danger: {
    type: Boolean,
    default: false
  },
  // 确认按钮是否禁用
  confirmDisabled: {
    type: Boolean,
    default: false
  },
  // 点击遮罩是否关闭
  closeOnOverlay: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'close'])

const visible = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  visible.value = val
})

// 安全区高度
const safeBottom = ref(0)

onMounted(() => {
  try {
    const sysInfo = uni.getSystemInfoSync()
    safeBottom.value = sysInfo.safeAreaInsets?.bottom || 0
  } catch (e) {
    safeBottom.value = 24
  }
})

function handleClose() {
  visible.value = false
  emit('update:modelValue', false)
  emit('close')
}

function handleCancel() {
  handleClose()
  emit('cancel')
}

function handleConfirm() {
  if (props.confirmDisabled) return
  emit('confirm')
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    handleClose()
  }
}
</script>

<style lang="scss" scoped>
.popup-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(17, 18, 22, 0.58);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.popup-sheet {
  position: relative;
  width: 100%;
  max-width: 840rpx; /* 560px */
  max-height: 88vh;
  overflow-y: auto;
  background: white;
  border-radius: 36rpx 36rpx 0 0;
  padding: 44rpx 36rpx calc(36rpx + env(safe-area-inset-bottom));
  box-shadow: 0 16rpx 48rpx rgba(17, 18, 22, 0.14);
  animation: sheet-in 0.18s ease-out;
}

@keyframes sheet-in {
  from {
    opacity: 0.5;
    transform: translateY(8rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.popup-close {
  position: absolute;
  right: 24rpx;
  top: 20rpx;
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:active {
    opacity: 0.6;
  }
}

.close-text {
  font-size: 50rpx;
  color: #989BA3;
  line-height: 1;
}

.popup-content {
  margin-bottom: 36rpx;
}

.popup-title {
  display: block;
  font-size: 40rpx;
  font-weight: 600;
  color: #111216;
  margin-bottom: 16rpx;
  line-height: 1.4;
}

.popup-desc {
  display: block;
  font-size: 28rpx;
  color: #5E626B;
  line-height: 1.6;
  margin-bottom: 24rpx;
}

.popup-preview {
  padding: 24rpx;
  background: #F7F7F8;
  border-radius: 16rpx;
}

.preview-text {
  font-size: 26rpx;
  color: #5E626B;
  line-height: 1.6;
}

.popup-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.action-btn {
  height: 96rpx;
  border-radius: 20rpx;
  font-size: 30rpx;
  font-weight: 650;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.btn-cancel {
  background: white;
  color: #D7192D;
  border: 2rpx solid #D7192D;
  
  &:active {
    background: #FFF1F2;
  }
}

.btn-confirm {
  background: #D7192D;
  color: white;
  
  &:active {
    background: #B91224;
  }
  
  &.is-danger {
    background: #B42318;
    
    &:active {
      background: #9A1A13;
    }
  }
}

.safe-area-bottom {
  height: env(safe-area-inset-bottom);
}
</style>
