<template>
  <AppCard padding="none">
    <view class="record-header"><view class="record-identify"><text class="record-title">{{ record.title || t('share.dealer.untitled') }}</text><text class="record-created">{{ t('share.dealer.created') }} {{ date(record.createdAt) }}</text></view><StatusTag :type="record.state === 1 || record.state === 3 ? 'success' : 'default'" :text="t('share.dealer.states.' + record.state)" /></view>
    <view class="record-fields"><view><text class="field-label">{{ t('share.dealer.expiresAt') }}</text><text class="field-value">{{ date(record.expiresAt) }}</text></view><view><text class="field-label">{{ t('share.dealer.totalVisits') }}</text><text class="field-value">{{ record.visitCount }}</text></view><view v-if="record.orderId" class="record-order"><text class="field-label">{{ t('share.dealer.orderStatus') }}</text><text class="field-value">{{ t('share.dealer.orderCreated') }}</text></view></view>
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
  ...(props.record.canReveal ? [{ key: 'reveal', label: t('share.dealer.showQr'), type: 'primary', disabled: props.busy }] : []),
  ...(props.record.canRevoke && props.record.state === 1 ? [{ key: 'revoke', label: t('share.dealer.revoke'), type: 'default', disabled: props.busy }] : []),
])
/** 使用项目统一日期格式，列表保留分钟精度。 */
function date(value) { return formatDateTime(value, 'YYYY-MM-DD HH:mm') }
</script>
<style scoped>
.record-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--divider-color);
}
.record-identify { flex: 1; min-width: 0; }
.record-title {
  display: block;
  color: var(--text-primary);
  font-size: var(--font-size-md, 16px);
  font-weight: var(--font-weight-semibold, 600);
  line-height: 24px;
  overflow-wrap: anywhere;
}
.record-created { display: block; margin-top: 4px; color: var(--text-tertiary); font-size: var(--font-size-caption, 12px); line-height: 20px; }
.record-fields { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 12px 16px; padding: 12px 16px; }
.field-label, .field-value { display: block; line-height: 22px; }
.field-label { color: var(--text-secondary); font-size: var(--font-size-caption, 12px); }
.field-value { color: var(--text-primary); font-size: var(--font-size-body, 14px); overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.record-order { grid-column: 1 / -1; }
.record-actions { padding: 0 16px 12px; }
</style>
