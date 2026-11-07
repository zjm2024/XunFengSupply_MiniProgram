<template>
  <AppOptionPicker
    :visible="visible"
    :model-value="modelValue"
    :options="pickerOptions"
    :title="t('commerce.carrier.title')"
    :description="showHint ? t('commerce.carrier.hint') : ''"
    :empty-text="t('commerce.carrier.empty')"
    :cancel-text="t('commerce.carrier.cancel')"
    :confirm-text="t('commerce.carrier.confirm')"
    default-first
    @update:visible="$emit('update:visible', $event)"
    @confirm="confirmCarrier"
  />
</template>

<script setup>
import { computed } from 'vue'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/commerce/i18n/register.js'
import AppOptionPicker from '@/shared/ui/AppOptionPicker.vue'

const props = defineProps({
  visible: Boolean,
  showHint: { type: Boolean, default: true },
  options: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:visible', 'update:modelValue', 'confirm'])
const pickerOptions = computed(() => props.options.map(item => ({
  value: item.code,
  label: item.name,
  meta: item.code,
})))

function confirmCarrier(code) {
  const selected = props.options.find(item => item.code === code)
  if (!selected) return
  emit('update:modelValue', selected.code)
  emit('confirm', selected)
}
</script>
