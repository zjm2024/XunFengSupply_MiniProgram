<template>
  <view v-if="visible" class="express-picker">
    <view class="express-picker__mask" @tap="handleCancel" />
    <view class="express-picker__sheet" @tap.stop>
      <view class="express-picker__header">
        <view class="express-picker__header-action express-picker__header-action--cancel" @tap="handleCancel">{{ t('commerce.carrier.cancel') }}</view>
        <view class="express-picker__heading">
          <text class="express-picker__title">{{ t('commerce.carrier.title') }}</text>
          <text class="express-picker__subtitle">{{ t('commerce.carrier.hint') }}</text>
        </view>
        <view class="express-picker__header-action express-picker__header-action--confirm" @tap="handleConfirm">{{ t('commerce.carrier.confirm') }}</view>
      </view>

      <scroll-view class="express-picker__list" scroll-y>
        <view
          v-for="item in options"
          :key="item.code"
          class="express-picker__option"
          :class="{ 'express-picker__option--selected': draftCode === item.code }"
          @tap="selectOption(item)"
        >
          <view class="express-picker__icon-wrap">
            <AppIcon name="truck" :size="20" :color="draftCode === item.code ? '#D91E36' : '#667085'" />
          </view>
          <view class="express-picker__option-copy">
            <text class="express-picker__option-name">{{ item.name }}</text>
            <text v-if="item.code" class="express-picker__option-code">{{ item.code }}</text>
          </view>
          <view class="express-picker__check" :class="{ 'express-picker__check--selected': draftCode === item.code }">
            <AppIcon v-if="draftCode === item.code" name="check" :size="14" color="#FFFFFF" />
          </view>
        </view>
        <view v-if="!options.length" class="express-picker__empty">{{ t('commerce.carrier.empty') }}</view>
      </scroll-view>

      <view class="express-picker__safe-area" />
    </view>
  </view>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/commerce/i18n/register.js'
import { ref, watch } from 'vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  options: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:visible', 'update:modelValue', 'confirm'])
const draftCode = ref('')

watch(() => props.visible, (visible) => {
  if (visible) {
    draftCode.value = props.modelValue || props.options[0]?.code || ''
  }
})

watch(() => props.modelValue, (value) => {
  if (!props.visible) draftCode.value = value || ''
})

function selectOption(item) {
  draftCode.value = item.code || ''
}

function handleCancel() {
  emit('update:visible', false)
}

function handleConfirm() {
  const selected = props.options.find(item => item.code === draftCode.value)
  if (!selected) return
  emit('update:modelValue', selected.code)
  emit('confirm', selected)
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
.express-picker {
  position: fixed;
  z-index: 1000;
  inset: 0;
}

.express-picker__mask {
  position: absolute;
  inset: 0;
  background: rgba(17, 18, 22, 0.42);
}

.express-picker__sheet {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  max-height: 76vh;
  overflow: hidden;
  border-radius: 18px 18px 0 0;
  background: #fff;
  box-shadow: 0 -8px 28px rgba(16, 24, 40, 0.12);
  animation: express-picker-in 0.22s ease-out;
}

.express-picker__header {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #f0f1f3;
}

.express-picker__header-action {
  min-width: 60px;
  flex-shrink: 0;
  white-space: nowrap;
  color: #667085;
  font-size: 14px;
  text-align: center;
}

.express-picker__header-action--confirm {
  color: #d91e36;
  font-weight: 600;
}

.express-picker__heading {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  flex-direction: column;
  gap: 4px;
}

.express-picker__title {
  color: #111216;
  font-size: 16px;
  font-weight: 600;
}

.express-picker__subtitle {
  color: #98a2b3;
  font-size: 11px;
}

.express-picker__list {
  max-height: 52vh;
  box-sizing: border-box;
  padding: 12px 16px 4px;
}

.express-picker__option {
  display: flex;
  min-height: 68px;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  padding: 0 14px;
  border: 1px solid #eaecf0;
  border-radius: 12px;
  background: #fff;
  box-sizing: border-box;
}

.express-picker__option--selected {
  border-color: #f2a1ad;
  background: #fff7f8;
}

.express-picker__icon-wrap {
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f2f4f7;
}

.express-picker__option--selected .express-picker__icon-wrap {
  background: #ffe5e9;
}

.express-picker__option-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.express-picker__option-name {
  overflow: hidden;
  color: #111216;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.express-picker__option-code {
  overflow: hidden;
  color: #98a2b3;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.express-picker__check {
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border: 1px solid #d0d5dd;
  border-radius: 50%;
  box-sizing: border-box;
}

.express-picker__check--selected {
  border-color: #d91e36;
  background: #d91e36;
}

.express-picker__empty {
  padding: 36px 0;
  color: #98a2b3;
  font-size: 13px;
  text-align: center;
}

.express-picker__safe-area {
  height: env(safe-area-inset-bottom);
  min-height: 10px;
}

@keyframes express-picker-in {
  from { transform: translateY(24px); opacity: 0.8; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
