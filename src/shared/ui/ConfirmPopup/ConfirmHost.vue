<template>
  <ConfirmPopup
    v-model="dialog.visible"
    :title="dialog.title"
    :description="dialog.description"
    :confirm-text="dialog.confirmText || undefined"
    :cancel-text="dialog.cancelText || undefined"
    :show-cancel="dialog.showCancel"
    :danger="dialog.danger"
    :close-on-overlay="dialog.closeOnOverlay"
    @input="updateAppDialogInput"
    @confirm="settleAppDialog(true)"
    @cancel="settleAppDialog(false)"
    @close="settleAppDialog(false)"
  >
    <input
      v-if="dialog.input"
      class="app-dialog-input"
      :value="dialog.input.value"
      :placeholder="dialog.input.placeholder"
      maxlength="64"
      @input="updateAppDialogInput($event?.detail?.value ?? $event?.target?.value ?? '')"
    />
  </ConfirmPopup>
</template>

<script setup>
import { computed } from 'vue'
import ConfirmPopup from './ConfirmPopup.vue'
import { settleAppDialog, updateAppDialogInput, useAppDialog } from '@/shared/composables/useAppDialog.js'

const { state } = useAppDialog()
const dialog = computed(() => state.value)
</script>
