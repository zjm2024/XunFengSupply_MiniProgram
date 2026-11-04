<template>
  <ConfirmPopup v-if="modal" :model-value="!!entry" :title="entry?.title || t('share.dealer.qrTitle')" :show-cancel="false" :confirm-text="t('share.dealer.close')" @close="$emit('close')" @confirm="$emit('close')" @update:model-value="!$event && $emit('close')">
    <view v-if="entry"><AppQrCode :matrix="matrix" :size="qrSize" /><text v-if="entry.expiresAt" class="qr-expiry">{{ t('share.dealer.expiresAt') }} {{ formatDateTime(entry.expiresAt, 'YYYY-MM-DD HH:mm') }}</text><AppButton block @tap="copyShareLink(entry)">{{ t('share.dealer.copy') }}</AppButton></view>
  </ConfirmPopup>
  <AppCard v-else-if="entry" padding="md"><view class="qr-heading"><text class="qr-title">{{ entry.title || t(entry.retail ? 'share.dealer.retailTitle' : 'share.dealer.stockTitle') }}</text><StatusTag type="success" :text="t('share.dealer.generated')" /></view><AppQrCode :matrix="matrix" :size="qrSize" /><text v-if="entry.expiresAt" class="qr-expiry">{{ t('share.dealer.expiresAt') }} {{ formatDateTime(entry.expiresAt, 'YYYY-MM-DD HH:mm') }}</text><AppButton block @tap="copyShareLink(entry)">{{ t('share.dealer.copy') }}</AppButton></AppCard>
</template>
<script setup>
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import AppCard from '@/shared/ui/AppCard/AppCard.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AppQrCode from '@/shared/ui/AppQrCode/AppQrCode.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import { t } from '@/shared/i18n/index.js'
import { createQrMatrix } from '@/shared/utils/qrMatrix.js'
import { formatDateTime } from '@/shared/utils/format.js'
import { copyShareLink } from '../model/copyShareLink.js'
import { useResponsive } from '@/shared/composables/useResponsive.js'
const props = defineProps({ entry: { type: Object, default: null }, modal: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'invalid'])
const matrix = shallowRef([])
const { layout } = useResponsive()
const qrSize = computed(() => Math.max(120, Math.min(260, (layout.value.windowWidth || 390) - 96)))
let expiryTimer = null
/** 生成本地二维码，并在服务端期限到达后立即清除展示。 */
watch(() => props.entry, entry => {
  clearInterval(expiryTimer); matrix.value = []
  if (!entry) return
  if (entry.expiresAt && Date.now() >= Date.parse(entry.expiresAt)) { emit('close'); return }
  try { matrix.value = createQrMatrix(entry.url) } catch { emit('invalid'); return }
  if (entry.expiresAt) expiryTimer = setInterval(() => { if (Date.now() >= Date.parse(entry.expiresAt)) { clearInterval(expiryTimer); matrix.value = []; emit('close') } }, 1000)
}, { immediate: true })
onBeforeUnmount(() => { clearInterval(expiryTimer); matrix.value = [] })
</script>
<style scoped>
.qr-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.qr-title{flex:1;min-width:0;color:var(--text-primary);font-size:var(--font-size-md,16px);font-weight: var(--font-weight-semibold, 600);line-height: 24px;overflow-wrap:anywhere}.qr-expiry{display:block;margin:0 0 16px;color:var(--text-secondary);font-size:var(--font-size-caption,12px);line-height: 20px;text-align:center}.share-qr-inline{min-width:0}
</style>
