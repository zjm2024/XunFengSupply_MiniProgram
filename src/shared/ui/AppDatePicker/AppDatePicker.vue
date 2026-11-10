<template>
  <ConfirmPopup :model-value="modelValue" :title="title" presentation="action-sheet"
    @update:model-value="$emit('update:modelValue', $event)" @confirm="confirmDate">
    <view class="date-navigation">
      <button :aria-label="t('common.datePicker.previousMonth')" @tap="moveMonth(-1)"><AppIcon name="chevron-left" :size="20" /></button>
      <text>{{ monthLabel }}</text>
      <button :aria-label="t('common.datePicker.nextMonth')" @tap="moveMonth(1)"><AppIcon name="chevron-right" :size="20" /></button>
    </view>
    <view class="date-grid">
      <text v-for="day in weekdays" :key="day" class="date-weekday">{{ day }}</text>
      <view v-for="blank in monthOffset" :key="'blank-'+blank" />
      <button v-for="day in daysInMonth" :key="day" class="date-day" :class="{ 'is-selected': draft === dateValue(day) }" :aria-pressed="draft === dateValue(day)" @tap="draft = dateValue(day)">{{ day }}</button>
    </view>
  </ConfirmPopup>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { getLocale, t } from '@/shared/i18n/index.js'
import ConfirmPopup from '../ConfirmPopup/ConfirmPopup.vue'
import AppIcon from '../AppIcon/AppIcon.vue'
const props = defineProps({ modelValue: Boolean, value: { type: String, default: '' }, title: { type: String, required: true } })
const emit = defineEmits(['update:modelValue','change'])
const year = ref(2026), month = ref(1), draft = ref('')
const monthOffset = computed(() => new Date(year.value, month.value - 1, 1).getDay())
const daysInMonth = computed(() => new Date(year.value, month.value, 0).getDate())
const weekdays = computed(() => t('common.datePicker.weekdays').split(','))
const monthLabel = computed(() => new Date(year.value, month.value - 1, 1).toLocaleDateString(getLocale(), { year: 'numeric', month: 'long' }))
function dateValue(day) { return year.value + '-' + String(month.value).padStart(2,'0') + '-' + String(day).padStart(2,'0') }
watch(() => props.modelValue, open => {
  if (!open) return
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(props.value)
  const date = match ? new Date(Number(match[1]),Number(match[2])-1,Number(match[3])) : new Date()
  year.value = date.getFullYear(); month.value = date.getMonth()+1
  draft.value = dateValue(date.getDate())
}, { immediate: true })
function moveMonth(offset) {
  const date = new Date(year.value, month.value - 1 + offset, 1)
  if (date.getFullYear() < 1900 || date.getFullYear() > 2100) return
  year.value = date.getFullYear(); month.value = date.getMonth()+1
}
function confirmDate() {
  if (!props.modelValue || !draft.value) return
  emit('update:modelValue',false)
  if (draft.value !== props.value) emit('change', { detail: { value: draft.value } })
}
</script>
<style scoped>
.date-navigation { display: grid; grid-template-columns: 44px minmax(0,1fr) 44px; align-items: center; gap: 8px; margin-bottom: 16px; text-align: center; font-size: var(--type-card-title-size, 16px); line-height: 1.5; font-weight: 600; }
.date-navigation button { display: flex; justify-content: center; align-items: center; width: 44px; height: 44px; margin: 0; padding: 0; background: #f4f5f8; border-radius: 10px; }
.date-navigation button::after, .date-day::after { border: 0; }
.date-grid { display: grid; grid-template-columns: repeat(7,minmax(0,1fr)); gap: 4px; }
.date-weekday { text-align: center; font-size: var(--type-caption-size, 12px); line-height: 32px; color: #62666f; }
.date-day { display: flex; align-items: center; justify-content: center; min-width: 0; min-height: 40px; width: 100%; margin: 0; padding: 0; font-size: var(--type-body-size, 14px); line-height: 1.5; border: 1px solid transparent; border-radius: 8px; color: #1b1c20; background: #f4f5f8; }
.date-day.is-selected { border-color: #d7192d; color: #d7192d; font-weight: 600; }
</style>
