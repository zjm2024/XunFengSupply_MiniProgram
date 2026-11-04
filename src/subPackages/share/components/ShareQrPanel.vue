<template>
  <ShareOverlayPortal v-if="modal" :visible="!!entry"><view class="share-qr-modal-scope">
    <ConfirmPopup class="share-qr-dialog" :model-value="!!entry" :title="t('share.dealer.qrTitle')" :show-cancel="false" :confirm-text="t('share.dealer.copy')" @close="$emit('close')" @confirm="entry && copyShareLink(entry)" @update:model-value="!$event && $emit('close')">
      <view v-if="entry" class="qr-dialog-body">
        <text v-if="entry.title" class="qr-entry-title">{{ entry.title }}</text>
        <view class="qr-code-frame"><AppQrCode :matrix="matrix" :size="qrSize" /></view>
        <text v-if="entry.expiresAt" class="qr-expiry">{{ t('share.dealer.expiresAt') }} {{ formatDateTime(entry.expiresAt, 'YYYY-MM-DD HH:mm') }}</text>
      </view>
    </ConfirmPopup>
  </view></ShareOverlayPortal>
  <AppCard v-else-if="entry" padding="md"><view class="qr-heading"><text class="qr-title">{{ entry.title || t(entry.retail ? 'share.dealer.retailTitle' : 'share.dealer.stockTitle') }}</text><StatusTag type="success" :text="t('share.dealer.generated')" /></view><AppQrCode :matrix="matrix" :size="qrSize" /><text v-if="entry.expiresAt" class="qr-expiry">{{ t('share.dealer.expiresAt') }} {{ formatDateTime(entry.expiresAt, 'YYYY-MM-DD HH:mm') }}</text><AppButton block @tap="copyShareLink(entry)">{{ t('share.dealer.copy') }}</AppButton></AppCard>
</template>
<script setup>
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import ShareOverlayPortal from './ShareOverlayPortal.vue'
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
/** 二维码按弹框内容宽度及短屏高度缩放，保持整数模块和扫码白边。 */
const qrSize = computed(() => Math.max(120, Math.min(240, (layout.value.windowWidth || 390) - 120, (layout.value.windowHeight || 800) - 260)))
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

.qr-dialog-body{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;min-width:0;box-sizing:border-box;padding:4px 0}
.qr-entry-title{display:block;max-width:100%;text-align:center;overflow-wrap:anywhere;font-size:14px;line-height:22px;color:var(--text-secondary,#62666f)}
.qr-code-frame{display:flex;justify-content:center;align-items:center;flex-shrink:0;max-width:100%;background:#fff;border:1px solid var(--divider-color,#eef0f3);border-radius:12px;padding:6px;box-sizing:border-box}
.qr-code-frame :deep(.app-qr){margin:0}
.qr-dialog-body .qr-expiry{margin:0;line-height:20px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.share-qr-modal-scope :deep(.popup-sheet){width:384px;max-width:100%;padding:22px;max-height:calc(100dvh - 40px)}
.share-qr-modal-scope :deep(.popup-header){padding:0 28px;text-align:center;margin-bottom:14px}
.share-qr-modal-scope :deep(.popup-content){flex:1 1 auto;margin-bottom:18px;min-width:0}
.share-qr-modal-scope :deep(.popup-actions){flex-shrink:0}
</style>
