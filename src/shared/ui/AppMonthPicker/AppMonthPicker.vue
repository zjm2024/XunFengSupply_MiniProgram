<template>
  <ConfirmPopup :model-value="modelValue" :title="t('common.monthPicker.title')" presentation="action-sheet"
    @update:model-value="emit('update:modelValue', $event)" @confirm="confirmMonth">
    <view class="month-year-nav">
      <button class="year-arrow" :disabled="draftYear <= 1900" :aria-label="t('common.monthPicker.previousYear')" @tap="changeYear(-1)"><AppIcon name="chevron-left" :size="20" /></button>
      <text class="year-label" aria-live="polite">{{ t('common.monthPicker.year', { year: draftYear }) }}</text>
      <button class="year-arrow" :disabled="draftYear >= 2100" :aria-label="t('common.monthPicker.nextYear')" @tap="changeYear(1)"><AppIcon name="chevron-right" :size="20" /></button>
    </view>
    <view class="month-grid">
      <button v-for="month in 12" :key="month" class="month-option" :class="{ 'is-selected': draftMonth === month }"
        :aria-pressed="draftMonth === month" @tap="draftMonth = month">{{ t('common.monthPicker.month', { month }) }}</button>
    </view>
  </ConfirmPopup>
</template>

<script setup>
import { ref, watch } from 'vue'
import { t } from '@/shared/i18n/index.js'
import ConfirmPopup from '../ConfirmPopup/ConfirmPopup.vue'
import AppIcon from '../AppIcon/AppIcon.vue'

// 由宿主页的overlay插槽承载，避免日期选择器被滚动区和毛玻璃卡片裁切。
const props = defineProps({ modelValue: { type: Boolean, default: false }, value: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue', 'change'])
const draftYear = ref(new Date().getFullYear())
const draftMonth = ref(new Date().getMonth() + 1)

/** 每次打开从已提交账期恢复草稿，取消不影响宿主页。 */
function resetDraft() {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(props.value)
  const now = new Date()
  draftYear.value = match ? Math.min(2100, Math.max(1900, Number(match[1]))) : now.getFullYear()
  draftMonth.value = match ? Number(match[2]) : now.getMonth() + 1
}
watch(() => props.modelValue, open => { if (open) resetDraft() }, { immediate: true })

/** 在可支持年份范围内切换草稿年份，不提交查询。 */
function changeYear(offset) {
  draftYear.value = Math.min(2100, Math.max(1900, draftYear.value + offset))
}

/** 确认后输出与原生月份picker一致的YYYY-MM事件结构。 */
function confirmMonth() {
  if (!props.modelValue) return
  const value = `${draftYear.value}-${String(draftMonth.value).padStart(2, '0')}`
  emit('update:modelValue', false)
  if (value !== props.value) emit('change', { detail: { value } })
}
</script>

<style scoped>
.month-year-nav { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: center; gap: 12px; margin-bottom: 16px; }
.year-arrow { display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: var(--radius-control, 10px); color: var(--text-primary, #1B1C20); background: var(--surface-page, #F4F5F8); }
.year-arrow:disabled { opacity: .35; }
.year-label { min-width: 0; text-align: center; font-size: var(--type-card-title-size, 16px); line-height: 24px; font-weight: var(--font-weight-semibold, 600); }
.month-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.month-option { display: flex; min-width: 0; min-height: 44px; align-items: center; justify-content: center; margin: 0; padding: 10px 4px; border: 1px solid transparent; border-radius: var(--radius-control, 10px); color: var(--text-primary, #1B1C20); background: var(--surface-page, #F4F5F8); font-size: var(--type-body-size, 14px); line-height: 22px; }
.month-option.is-selected { border-color: var(--color-brand, #D7192D); color: var(--color-brand, #D7192D); background: #FFF3F4; font-weight: var(--font-weight-semibold, 600); }
.month-option:active, .year-arrow:active { opacity: .7; }
.year-arrow::after, .month-option::after { border: 0; }
</style>
