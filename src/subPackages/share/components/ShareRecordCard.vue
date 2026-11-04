<template>
  <AppCard padding="none" class="share-record">
    <view class="record-header"><view class="record-identify"><text class="record-title">{{ record.title || t('share.dealer.untitled') }}</text><text class="record-created">{{ t('share.dealer.created') }} {{ date(record.createdAt) }}</text></view><StatusTag :type="record.state === 1 || record.state === 3 ? 'success' : 'default'" :text="t('share.dealer.states.' + record.state)" /></view>
    <view class="record-fields"><view><text class="field-label">{{ t('share.dealer.expiresAt') }}</text><text class="field-value">{{ date(record.expiresAt) }}</text></view><view class="record-visits" :class="{ active: record.state === 1 }"><text class="field-label">{{ t('share.dealer.totalVisits') }}</text><text class="field-value">{{ record.visitCount }}</text></view><view v-if="record.orderId" class="record-order"><text class="field-label">{{ t('share.dealer.orderStatus') }}</text><text class="field-value">{{ t('share.dealer.orderCreated') }}</text></view></view>
    <view v-if="actions.length" class="record-actions"><ActionRow compact :actions="actions" :more-text="t('share.dealer.moreActions')" @select="$emit('action', $event)" @overflow="$emit('overflow', $event)" /></view>
  </AppCard>
</template>
<script setup>
import { computed } from 'vue'
import AppCard from '@/shared/ui/AppCard/AppCard.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import ActionRow from '@/shared/ui/ActionRow.vue'
import { t } from '@/shared/i18n/index.js'
import { formatDateTime } from '@/shared/utils/format.js'
const props = defineProps({ record: { type: Object, required: true }, busy: { type: Boolean, default: false } })
defineEmits(['action', 'overflow'])
const actions = computed(() => [
  ...(props.record.canRevoke && props.record.state === 1 ? [{ key: 'revoke', label: t('share.dealer.revoke'), type: 'default', disabled: props.busy }] : []),
  ...(props.record.canReveal ? [{ key: 'reveal', label: t('share.dealer.showQr'), type: 'primary', disabled: props.busy }] : []),
])
/** 使用项目统一日期格式，列表保留分钟精度。 */
function date(value) { return formatDateTime(value, 'YYYY-MM-DD HH:mm') }
</script>
<style scoped>
.share-record{--glass-card-background:#fff;--glass-card-shadow:none;--glass-card-blur:none;background:var(--surface-card-solid,#fff);border-radius:16px;overflow:hidden;min-width:0}
.record-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 16px 0}
.record-identify{flex:1;min-width:0}
.record-title{display:block;color:var(--text-primary,#1b1c20);font-size:16px;font-weight:600;line-height:24px;overflow-wrap:anywhere}
.record-created{display:block;margin-top:4px;color:var(--text-tertiary,#969aa3);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}
.record-fields{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px 16px;padding:16px}
.field-label,.field-value{display:block}
.field-label{color:var(--text-tertiary,#969aa3);font-size:12px;line-height:18px}
.field-value{margin-top:3px;color:var(--text-primary,#1b1c20);font-size:14px;line-height:22px;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.record-visits{text-align:right;min-width:56px}
.record-visits .field-value{font-size:18px;font-weight:600;line-height:22px}
.record-visits.active .field-value{color:var(--primary-color,#d7192d)}
.record-order{grid-column:1 / -1}
.record-actions{margin:0 16px;padding:14px 0 16px;border-top:1px solid var(--divider-color,#eef0f3)}
.record-actions :deep(.action-row-control){justify-content:flex-end}
.record-actions :deep(.row-button){flex:0 0 auto;min-height:34px;border-radius:9px}
</style>
