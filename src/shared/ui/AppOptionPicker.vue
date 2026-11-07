<template>
  <ConfirmPopup
    :model-value="visible"
    :title="title"
    :description="description"
    :confirm-text="confirmText"
    :cancel-text="cancelText"
    :confirm-disabled="disabled || !selectedOption"
    @update:model-value="$emit('update:visible', $event)"
    @confirm="confirmSelection"
  >
    <AppOptionList v-if="options.length" v-model="draftValue" :options="options" :disabled="disabled" />
    <text v-else-if="emptyText">{{ emptyText }}</text>
  </ConfirmPopup>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import ConfirmPopup from './ConfirmPopup/ConfirmPopup.vue'
import AppOptionList from './AppOptionList.vue'

const props = defineProps({
  visible: Boolean,
  modelValue: { type: [String, Number], default: null },
  options: { type: Array, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  emptyText: { type: String, default: '' },
  confirmText: { type: String, default: null },
  cancelText: { type: String, default: null },
  disabled: Boolean,
  defaultFirst: Boolean,
})

const emit = defineEmits(['update:visible', 'update:modelValue', 'confirm'])
const draftValue = ref(null)
const selectedOption = computed(() => props.options.find(option => option.value === draftValue.value && !option.disabled))

watch(() => props.visible, visible => {
  if (!visible) return
  const current = props.options.find(option => option.value === props.modelValue && !option.disabled)
  const first = props.defaultFirst ? props.options.find(option => !option.disabled) : null
  draftValue.value = (current || first)?.value ?? null
}, { immediate: true })

function confirmSelection() {
  if (!props.visible || props.disabled || !selectedOption.value) return
  emit('update:modelValue', selectedOption.value.value)
  emit('confirm', selectedOption.value.value)
  emit('update:visible', false)
}
</script>
