<template>
  <ConfirmPopup
    :model-value="visible"
    :title="dialog.title"
    :description="dialog.description"
    :confirm-text="dialog.confirmText || undefined"
    :cancel-text="dialog.cancelText || undefined"
    :show-cancel="dialog.showCancel"
    :danger="dialog.danger"
    :close-on-overlay="dialog.closeOnOverlay"
    @confirm="settleAppDialog(true, hostId)"
    @cancel="settleAppDialog(false, hostId)"
    @close="settleAppDialog(false, hostId)"
  >
    <input
      v-if="dialog.input"
      class="app-dialog-input"
      :value="dialog.input.value"
      :placeholder="dialog.input.placeholder"
      maxlength="64"
      @input="updateAppDialogInput($event?.detail?.value ?? $event?.target?.value ?? '', hostId)"
    />
  </ConfirmPopup>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import ConfirmPopup from './ConfirmPopup.vue'
import { activateAppDialogHost, deactivateAppDialogHost, settleAppDialog, updateAppDialogInput, useAppDialog } from '@/shared/composables/useAppDialog.js'

const hostId = Symbol('page-confirm-host')
const { state, visible } = useAppDialog(hostId)
const dialog = computed(() => state.value)

/** 页面进入前台后接管共享弹框的渲染。 */
function activateHost() { activateAppDialogHost(hostId) }

/** 页面离开时结束未确认操作，避免返回后继续执行旧操作。 */
function deactivateHost() { deactivateAppDialogHost(hostId) }

onShow(activateHost)
onMounted(activateHost)
onHide(deactivateHost)
onUnload(deactivateHost)
onBeforeUnmount(deactivateHost)
</script>
