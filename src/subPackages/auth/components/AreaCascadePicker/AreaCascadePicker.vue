<template>
  <view class="area-picker">
    <view
      class="area-trigger"
      :class="{ 'has-value': displayText, 'has-error': error, disabled }"
      @tap="openPicker"
    >
      <text class="area-value">{{ displayText || (placeholder ?? t('common.region.placeholder')) }}</text>
      <AppIcon name="chevron-right" :size="16" :color="disabled ? '#C7C9CE' : '#969AA3'" />
    </view>
  </view>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import { computed } from 'vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'

const EMPTY_VALUE = {
  provinceCode: '',
  province: '',
  cityCode: '',
  city: '',
  districtCode: '',
  district: '',
}

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ provinceCode: '', province: '', cityCode: '', city: '', districtCode: '', district: '' }),
  },
  placeholder: { type: String, default: null },
  disabled: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
})

const emit = defineEmits(['open'])

const displayText = computed(() => {
  const value = props.modelValue || EMPTY_VALUE
  return [value.province, value.city, value.district].filter(Boolean).join(' ')
})

/** 打开由页面根级覆盖层承载的地区选择抽屉。 */
function openPicker() {
  if (!props.disabled) emit('open')
}
</script>

<style lang="scss" scoped>
.area-trigger {
  box-sizing: border-box;
  width: 100%;
  min-height: $control-height;
  padding: 0 $space-3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  background: $color-bg-card;
  border: 2rpx solid $color-border-default;
  border-radius: $radius-control;
  transition: border-color $duration-normal $easing-standard;

  &:active,
  &.has-value {
    border-color: $color-gray-300;
  }

  &.has-error {
    border-color: $color-error;
  }

  &.disabled {
    color: $color-text-disabled;
    background: $color-gray-50;
  }
}

.area-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: $color-text-primary;
  font-size: $font-size-body-m;
  line-height: $line-height-body-m;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.area-trigger:not(.has-value) .area-value {
  color: $color-text-disabled;
}
</style>
