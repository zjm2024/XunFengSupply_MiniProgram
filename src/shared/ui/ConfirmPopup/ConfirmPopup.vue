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
import { ref, watch } from 'vue'

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
  z-index: var(--z-modal, 500);
  background: rgba(17, 18, 22, 0.52);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.popup-sheet {
  position: relative;
  width: 100%;
  max-width: 560px;
  max-height: 88vh;
  overflow-y: auto;
  background: var(--surface-card, #FFFFFF);
  border-radius: 18px 18px 0 0;
  padding: 22px 18px calc(18px + env(safe-area-inset-bottom));
  box-shadow: var(--shadow-lg, 0 12px 32px rgba(17, 18, 22, 0.12));
  animation: sheet-in 0.18s ease-out;
}

@keyframes sheet-in {
  from {
    opacity: 0.5;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.popup-close {
  position: absolute;
  right: 12px;
  top: 10px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:active {
    opacity: 0.6;
  }
}

.close-text {
  font-size: 25px;
  color: var(--icon-muted, #969AA3);
  line-height: 1;
}

.popup-content {
  margin-bottom: 18px;
}

.popup-title {
  display: block;
  font-size: var(--font-size-xl, 20px);
  font-weight: 600;
  color: var(--text-primary, #1B1C20);
  margin-bottom: 8px;
  line-height: 1.4;
}

.popup-desc {
  display: block;
  font-size: var(--font-size-base, 14px);
  color: var(--text-secondary, #62666F);
  line-height: 1.6;
  margin-bottom: 12px;
}

.popup-preview {
  padding: 12px;
  background: var(--surface-page, #F4F5F8);
  border-radius: var(--radius-control, 10px);
}

.preview-text {
  font-size: 13px;
  color: var(--text-secondary, #62666F);
  line-height: 1.6;
}

.popup-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.action-btn {
  height: var(--control-height, 48px);
  border-radius: var(--radius-control, 10px);
  font-size: 15px;
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
  background: var(--surface-card, #FFFFFF);
  color: var(--primary-color, #D7192D);
  border: 1px solid var(--primary-color, #D7192D);
  
  &:active {
    background: var(--color-brand-50, #FFF1F2);
  }
}

.btn-confirm {
  background: var(--primary-color, #D7192D);
  color: var(--text-inverse, #FFFFFF);
  
  &:active {
    background: var(--primary-dark, #B91224);
  }
  
  &.is-danger {
    background: var(--danger-color, #B42318);
    
    &:active {
      background: #9A1A13;
    }
  }
}

.safe-area-bottom {
  height: env(safe-area-inset-bottom);
}

@media screen and (min-width: 600px) {
  .popup-overlay {
    align-items: center;
    padding: 24px;
  }

  .popup-sheet {
    max-width: 520px;
    border-radius: var(--radius-feature, 18px);
    padding: 24px;
  }
}
</style>
