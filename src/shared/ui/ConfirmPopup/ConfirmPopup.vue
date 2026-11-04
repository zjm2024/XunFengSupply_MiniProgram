<template>
  <view v-if="visible" class="popup-overlay" :class="{ 'is-action-sheet': presentation === 'action-sheet' }" @click="handleOverlayClick">
    <view class="popup-sheet" :class="{ 'is-show': visible }" @click.stop>
      <!-- 关闭按钮 -->
      <button class="popup-close" :disabled="dismissDisabled" :aria-label="t('common.close')" @click="handleClose">
        <text class="close-text">×</text>
      </button>
      
      <view v-if="title" class="popup-header">
        <text class="popup-title">{{ title }}</text>
      </view>

      <!-- 内容区域 -->
      <view class="popup-content">
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
      <view v-if="showCancel || showConfirm" class="popup-actions" :class="{ 'is-single': !showCancel || !showConfirm }">
        <button 
          v-if="showCancel" 
          class="action-btn btn-cancel" 
          :disabled="dismissDisabled"
          @click="handleCancel"
        >
          {{ cancelText ?? t('common.cancel') }}
        </button>
        <button 
          v-if="showConfirm"
          class="action-btn btn-confirm" 
          :class="{ 'is-danger': danger }"
          :disabled="confirmDisabled"
          @click="handleConfirm"
        >
          {{ confirmText ?? t('common.ui.confirmAction') }}
        </button>
      </view>
      
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { t } from '@/shared/i18n/index.js'

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
    default: null
  },
  // 确认按钮文字
  confirmText: {
    type: String,
    default: null
  },
  // 是否显示取消按钮
  showCancel: {
    type: Boolean,
    default: true
  },
  // 操作菜单可仅保留中性的取消按钮。
  showConfirm: { type: Boolean, default: true },
  // 手机操作菜单从底部展开，确认和表单弹框保持居中。
  presentation: { type: String, default: 'dialog' },
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
  // 保存过程中阻止关闭，避免丢失失败反馈或重复开启编辑。
  dismissDisabled: { type: Boolean, default: false },
  // 点击遮罩是否关闭
  closeOnOverlay: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'close', 'input'])

const visible = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  visible.value = val
})

/** 关闭弹框并通知宿主页同步可见状态。 */
function handleClose() {
  if (props.dismissDisabled) return
  visible.value = false
  emit('update:modelValue', false)
  emit('close')
}

/** 取消操作并遵守提交期间的关闭保护。 */
function handleCancel() {
  if (props.dismissDisabled) return
  handleClose()
  emit('cancel')
}

/** 确认只通知调用方，由业务决定完成和关闭时机。 */
function handleConfirm() {
  if (props.confirmDisabled) return
  emit('confirm')
}

/** 按调用方配置处理遮罩点击。 */
function handleOverlayClick() {
  if (props.closeOnOverlay) {
    handleClose()
  }
}
</script>

<style lang="scss" scoped>
.popup-overlay {
  position: fixed;
  pointer-events: auto;
  inset: 0;
  z-index: var(--z-modal, 500);
  background: rgba(17, 18, 22, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 20px;
  animation: xf-popup-fade-in 180ms ease-out both;
}

.popup-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: min(100%, 520px);
  max-width: 560px;
  max-height: calc(100vh - 40px);
  max-height: calc(100dvh - 40px);
  overflow: hidden;
  background: var(--modal-surface, #FFFFFF);
  border-radius: var(--radius-feature, 18px);
  padding: 20px;
  box-shadow: var(--shadow-lg, 0 12px 32px rgba(17, 18, 22, 0.12));
  transform-origin: center bottom;
  animation: xf-popup-sheet-in 260ms cubic-bezier(.2, .8, .2, 1) both;
}

@keyframes xf-popup-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes xf-popup-sheet-in {
  from {
    opacity: 0;
    transform: translateY(36px) scale(.985);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.popup-close {
  position: absolute;
  right: 12px;
  top: 8px;
  z-index: 1;
  width: 44px;
  height: 44px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:active {
    opacity: 0.6;
  }
}

.close-text {
  font-size: var(--type-heading-size, 24px);
  color: var(--icon-muted, #969AA3);
  line-height: 1;
}

.popup-header {
  flex: 0 0 auto;
  margin-bottom: 14px;
  padding-right: 36px;
}

.popup-content {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  overflow-wrap: anywhere;
  margin-bottom: 16px;
}

.popup-title {
  display: block;
  font-size: var(--type-section-title-size, 18px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #1B1C20);

  overflow-wrap: anywhere;
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

.app-dialog-input {
  display: block;
  width: 100%;
  min-height: 48px;
  box-sizing: border-box;
  margin: 4px 0 14px;
  padding: 0 13px;
  border: 1px solid #d9dce2;
  border-radius: var(--radius-control, 10px);
  color: var(--text-primary, #1b1c20);
  background: #f8f9fa;
  font-size: var(--type-label-size, 15px);
}

.preview-text {
  font-size: var(--type-body-small-size, 13px);
  color: var(--text-secondary, #62666F);
  line-height: 1.6;
}

.popup-actions {
  display: grid;
  flex: 0 0 auto;
  /* 两个按钮均分；按钮多于两组时按最小视觉宽度自动换行。 */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 112px), 1fr));
  gap: 10px;
}
.popup-actions.is-single {
  grid-template-columns: minmax(112px, min(220px, 100%));
  justify-content: center;
}

.action-btn {
  /* 视觉最小宽度与触控高度分开控制，避免短文字按钮缩成小红块。 */
  min-width: 112px;
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  height: auto;
  padding: 10px 12px;
  line-height: 20px;
  white-space: normal;
  border-radius: var(--radius-control, 10px);
  font-size: var(--type-body-size, 14px);
  font-weight: 600;
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
  background: var(--surface-page, #F4F5F8);
  color: var(--text-primary, #1B1C20);
  
  &:active {
    background: #E9EBEF;
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

.popup-close::after, .action-btn::after { border: 0; }

@media screen and (max-width: 599px) {
  .popup-overlay.is-action-sheet {
    align-items: flex-end;
    padding: 0;
  }
  .is-action-sheet .popup-sheet {
    width: 100%;
    max-width: 100%;
    max-height: calc(100vh - 20px);
    max-height: calc(100dvh - 20px);
    border-radius: 20px 20px 0 0;
    padding: 20px 20px calc(12px + env(safe-area-inset-bottom));
  }
  .is-action-sheet .popup-actions.is-single { grid-template-columns: minmax(0, 1fr); }
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
    transform-origin: center;
    animation-name: xf-popup-dialog-in;
  }

  .popup-actions {
    /* 大屏不让操作按钮无限拉宽，按钮组保持紧凑并靠右。 */
    grid-template-columns: repeat(auto-fit, minmax(112px, 220px));
    justify-content: end;
  }

  .popup-actions.is-single {
    justify-content: center;
  }
}

@keyframes xf-popup-dialog-in {
  from { opacity: 0; transform: translateY(10px) scale(.94); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .popup-overlay,
  .popup-sheet { animation-duration: 1ms; }
}
</style>
