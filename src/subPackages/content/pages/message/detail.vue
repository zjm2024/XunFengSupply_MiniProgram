<template>
  <AppPageShell class="message-detail-shell">
    <template #header>
      <AppHeader :title="t('content.titles.messageDetail')" :show-back="true" />
    </template>

    <template #content>
      <AppContent width-mode="standard" padding="12px var(--page-padding-x, 16px) 32px">
        <view class="message-detail-page">
          <view v-if="loading && !detail" class="detail-state" role="status" aria-live="polite">
            <view class="detail-spinner" />
            <text>{{ t('content.messages.loading') }}</text>
          </view>

          <button v-else-if="errorText" class="detail-state detail-state--error" @click="loadDetail">
            <text>{{ errorText }}</text>
            <text class="detail-retry">{{ t('content.messages.retry') }}</text>
          </button>

          <view v-else-if="detail">
            <view class="message-detail-card">
              <text class="detail-title" role="heading" aria-level="1">{{ detail.title }}</text>
              <view class="detail-topline">
                <text class="detail-time">{{ formatDateTime(detail.createdAt) || t('content.messages.unknownTime') }}</text>
                <view class="detail-type">
                  <image class="detail-type-art" alt="" aria-hidden="true" :src="messageIcon(detail.type)" mode="aspectFit" />
                  <text>{{ getTypeMeta(detail.type).label }}</text>
                </view>
                <view class="read-status" aria-live="polite" :class="{ unread: !detail.isRead }">
                  <view class="read-status-dot" aria-hidden="true" />
                  <text>{{ detail.isRead ? t('content.messages.read') : t('content.messages.unread') }}</text>
                </view>
              </view>

              <view class="detail-divider" />
              <text class="detail-content">{{ detail.content || t('content.messages.emptyContent') }}</text>
            </view>

            <view v-if="relatedAction" class="message-detail-actions">
              <button class="related-entry" role="link" hover-class="related-entry--pressed" @click="openRelatedBusiness">
                <text class="related-entry-title">{{ relatedAction.title }}</text>
                <AppIcon name="chevron-right" :size="16" aria-hidden="true" />
              </button>
            </view>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/content/i18n/register.js'
import { messageIcon } from '../../model/messageCategories.js'
import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { getMessageDetail, getUnreadSummary, markAsRead } from '../../api/message.js'
import { useMessageStore } from '../../model/messageStore.js'
import { formatDateTime } from '../../../../shared/utils/format.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useUserStore } from '@/shared/session/userStore.js'

const messageStore = useMessageStore()
const userStore = useUserStore()
const sessionKey = () => String(userStore.userId) + ':' + String(userStore.dealerId)
const messageId = ref('')
const detail = ref(null)
const loading = ref(false)
let disposed = false
const loadFailure = ref(null)
const errorText = computed(() => loadFailure.value?.message
  || (loadFailure.value?.messageKey ? t(loadFailure.value.messageKey) : ''))

const typeMeta = computed(() => ({
  1: { label: t('content.messages.orderType'), icon: 'order', tone: 'order' },
  2: { label: t('content.messages.auditType'), icon: 'check', tone: 'audit' },
  3: { label: t('content.messages.billType'), icon: 'invoice', tone: 'bill' },
  4: { label: t('content.messages.announcementType'), icon: 'announcement', tone: 'system' },
}))

const relatedAction = computed(() => {
  if (!detail.value?.relatedId) return null
  if (detail.value.relatedKind === 'afterSale') return { title: t('content.messages.viewAfterSale'), icon: 'order', kind: 'afterSale' }
  if (detail.value.relatedKind === 'invoice') return { title: t('content.messages.viewInvoice'), icon: 'invoice', kind: 'invoice' }
  if (detail.value.relatedKind === 'bill' || detail.value.type === 3) {
    return { title: t('content.messages.viewBill'), icon: 'invoice', kind: 'bill' }
  }
  if (detail.value.relatedKind === 'order' || detail.value.type === 1) {
    return { title: t('content.messages.viewOrder'), icon: 'order', kind: 'order' }
  }
  return null
})

onLoad((options) => {
  messageId.value = String(options?.messageId || '')
  loadDetail()
})
onUnload(() => { disposed = true })

function pick(source, camelKey, pascalKey, fallback) {
  return source?.[camelKey] ?? source?.[pascalKey] ?? fallback
}

/** 读取原消息和关联记录，保留错误对象以响应语言变化。 */
async function loadDetail() {
  if (!messageId.value || loading.value) {
    if (!messageId.value) loadFailure.value = { messageKey: 'content.messages.invalid' }
    return
  }

  loading.value = true
  loadFailure.value = null
  const key = sessionKey()
  try {
    const result = await getMessageDetail(messageId.value)
    if (disposed || key !== sessionKey()) return
    detail.value = result

    if (!detail.value) {
      loadFailure.value = { messageKey: 'content.messages.missing' }
      return
    }

    try {
      await markDetailAsRead()
    } catch {
      if (!disposed && key === sessionKey()) uni.showToast({ title: t('content.messages.operationFailed'), icon: 'none' })
    }
  } catch (error) {
    if (disposed || key !== sessionKey()) return
    console.error('[MessageDetail] 加载消息失败:', error)
    loadFailure.value = error?.message ? error : { messageKey: 'content.messages.loadFailed' }
  } finally {
    loading.value = false
  }
}

async function markDetailAsRead() {
  if (!detail.value || detail.value.isRead) return
  const key = sessionKey()
  const openedMessage = detail.value
  await markAsRead({ messageId: openedMessage.messageId })
  if (key !== sessionKey()) return
  openedMessage.isRead = true
  const cached = messageStore.messageList.find(item => item.messageId === openedMessage.messageId)
  if (cached) cached.isRead = true
  try {
    const summary = await getUnreadSummary()
    if (key !== sessionKey()) return
    messageStore.applySummary(summary)
  } catch { /* A failed background badge refresh must not hide an already loaded message. */ }
}

/** 仅翻译消息类型标签，不生成或改写消息正文。 */
function getTypeMeta(type) {
  return typeMeta.value[type] || { label: t('content.messages.notification'), icon: 'bell', tone: 'default' }
}

function openRelatedBusiness() {
  if (!relatedAction.value || !detail.value?.relatedId) return
  if (relatedAction.value.kind === 'afterSale') { navigator.navigateTo(routes.order.afterSaleDetail(detail.value.relatedId)); return }
  if (relatedAction.value.kind === 'invoice') { navigator.navigateTo(routes.account.invoice()); return }
  if (relatedAction.value.kind === 'bill') {
    navigator.navigateTo(routes.account.billDetail(detail.value.relatedId))
    return
  }
  navigator.navigateTo(routes.order.detail(detail.value.relatedId))
}
</script>

<style lang="scss" scoped>
.message-detail-page {
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: env(safe-area-inset-bottom);
}

.message-detail-card {
  padding: 16px;
  border-radius: var(--radius-feature, 18px);
  background: var(--surface-card);
  overflow-wrap: anywhere;
}

.detail-topline,
.detail-type,
.read-status {
  display: flex;
  align-items: center;
}

.detail-topline { flex-wrap: wrap; gap: 4px 12px; margin-top: 8px; }
.detail-type {
  gap: 8px;
  min-width: 0;
  color: var(--type-secondary-color);
  font-size: var(--type-caption-size);
  line-height: var(--type-caption-line-height);
}
.detail-type-art { flex: none; width: 16px; height: 16px; }
.read-status {
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  color: var(--type-secondary-color);
  background: rgba(27, 29, 32, .05);
  font-size: var(--type-caption-size);
  line-height: var(--type-caption-line-height);
}
.read-status.unread { color: var(--primary-color, #d7192d); background: rgba(215, 25, 45, .07); }
.read-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.detail-title {
  display: block;
  text-wrap: balance;
  color: var(--type-title-color);
  font-size: var(--type-page-title-size);
  line-height: var(--type-page-title-line-height);
  font-weight: var(--font-weight-bold, 700);
}
.detail-time {
  display: block;
  color: var(--type-secondary-color);
  font-size: var(--type-caption-size);
  line-height: var(--type-caption-line-height);
  font-variant-numeric: tabular-nums;
}
.detail-divider { height: 1px; margin: 16px 0; background: var(--border-color, rgba(27, 29, 32, .09)); }
.detail-content {
  display: block;
  color: var(--type-body-color);
  font-size: var(--type-body-size);
  line-height: var(--type-body-line-height);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message-detail-actions {
  --message-glass-blur: blur(16px);
  display: flex;
  justify-content: flex-start;
  margin-top: 12px;
  padding: 12px;
  border-radius: var(--radius-feature, 18px);
  background: rgba(255, 255, 255, .76);
  box-shadow: var(--glass-card-shadow);
  -webkit-backdrop-filter: var(--message-glass-blur);
  backdrop-filter: var(--message-glass-blur);
}

.related-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  margin: 0;
  padding: 10px 14px;
  border: 0;
  border-radius: var(--radius-card, 14px);
  box-sizing: border-box;
  text-align: left;
  color: var(--type-title-color);
  background: transparent;
}
.related-entry--pressed,
.related-entry:active { opacity: .65; }
@media (hover: hover) {
  .related-entry:hover { opacity: .8; }
}
.related-entry-title {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: var(--type-body-size);
  line-height: var(--type-body-line-height);
  font-weight: var(--font-weight-semibold, 600);
}

.detail-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 220px;
  color: var(--type-secondary-color);
  font-size: var(--type-body-small-size);
  line-height: var(--type-body-small-line-height);
}
.detail-state--error { width: 100%; flex-direction: column; border: 0; background: transparent; }
.detail-retry { color: var(--primary-color, #d7192d); }
.related-entry::after, .detail-state--error::after { border: 0; }
.related-entry:focus-visible, .detail-state--error:focus-visible {
  outline: 2px solid var(--primary-color, #d7192d);
  outline-offset: -2px;
}
.detail-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(27, 29, 32, .12);
  border-top-color: var(--primary-color, #d7192d);
  border-radius: 50%;
  animation: detail-spin .8s linear infinite;
}
@keyframes detail-spin { to { transform: rotate(360deg); } }

@media (min-width: 768px) {
  .message-detail-card { padding: 32px; }
  .message-detail-actions { padding-inline: 32px; }
}
@media (prefers-reduced-motion: reduce) { .detail-spinner { animation: none; } }
</style>
