<template>
  <AppPageShell class="message-detail-shell">
    <template #header>
      <AppHeader :title="t('content.titles.messageDetail')" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="12px var(--page-padding-x, 16px) 32px">
        <view class="message-detail-page">
          <view v-if="loading" class="detail-state">
            <view class="detail-spinner" />
            <text>{{ t('content.messages.loading') }}</text>
          </view>

          <view v-else-if="errorText" class="detail-state detail-state--error" @tap="loadDetail">
            <text>{{ errorText }}</text>
            <text class="detail-retry">{{ t('content.messages.retry') }}</text>
          </view>

          <view v-else-if="detail" class="message-detail-card">
            <view class="detail-topline">
              <view class="detail-type" :class="`tone-${getTypeMeta(detail.type).tone}`">
                <AppIcon :name="getTypeMeta(detail.type).icon" :size="19" :stroke-width="1.8" />
                <text>{{ getTypeMeta(detail.type).label }}</text>
              </view>
              <view class="read-status" :class="{ unread: !detail.isRead }">
                <view class="read-status-dot" />
                <text>{{ detail.isRead ? '已读' : '未读' }}</text>
              </view>
            </view>

            <text class="detail-title">{{ detail.title }}</text>
            <text class="detail-time">{{ formatDateTime(detail.createdAt) || t('content.messages.unknownTime') }}</text>

            <view class="detail-divider" />
            <text class="detail-content">{{ detail.content || t('content.messages.emptyContent') }}</text>

            <view v-if="relatedAction" class="related-entry" hover-class="related-entry--pressed" @tap="openRelatedBusiness">
              <view class="related-entry-icon">
                <AppIcon :name="relatedAction.icon" :size="20" :stroke-width="1.8" />
              </view>
              <view class="related-entry-copy">
                <text class="related-entry-title">{{ relatedAction.title }}</text>
                <text class="related-entry-desc">{{ t('content.messages.relatedHint') }}</text>
              </view>
              <AppIcon name="chevron-right" :size="17" color="#9AA1AA" />
            </view>

            <view class="read-hint">
              <AppIcon name="check" :size="14" :stroke-width="1.8" />
              <text>{{ detail.isRead ? '已同步阅读状态' : '打开后将自动标记为已读' }}</text>
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
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getMessageList, markAsRead } from '../../api/message.js'
import { useMessageStore } from '../../model/messageStore.js'
import { formatDateTime } from '../../../../shared/utils/format.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const messageStore = useMessageStore()
const messageId = ref('')
const detail = ref(null)
const loading = ref(false)
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

function pick(source, camelKey, pascalKey, fallback) {
  return source?.[camelKey] ?? source?.[pascalKey] ?? fallback
}

function normalizeMessage(item) {
  let templateParams = {}
  const rawParams = pick(item, 'templateParams', 'TemplateParams', '')
  if (rawParams && typeof rawParams === 'object') templateParams = rawParams
  else if (rawParams) {
    try { templateParams = JSON.parse(rawParams) } catch (_) { templateParams = {} }
  }

  const orderId = templateParams.orderId ?? templateParams.OrderId
  const billId = templateParams.billId ?? templateParams.BillId
  const relatedId = orderId ?? billId ?? templateParams.relatedId ?? templateParams.RelatedId ?? null

  return {
    messageId: Number(pick(item, 'messageId', 'MessageId', 0)),
    title: String(pick(item, 'title', 'Title', '消息通知')),
    content: String(pick(item, 'content', 'Content', '')),
    type: Number(pick(item, 'msgType', 'MsgType', 0)),
    isRead: Boolean(pick(item, 'isRead', 'IsRead', false)),
    createdAt: pick(item, 'createdAt', 'CreatedAt', ''),
    relatedId,
    relatedKind: orderId ? 'order' : billId ? 'bill' : null,
  }
}

/** 读取原消息和关联记录，保留错误对象以响应语言变化。 */
async function loadDetail() {
  if (!messageId.value || loading.value) {
    if (!messageId.value) loadFailure.value = { messageKey: 'content.messages.invalid' }
    return
  }

  loading.value = true
  loadFailure.value = null
  try {
    const cached = messageStore.messageList.find(item => String(item.messageId) === messageId.value)
    if (cached) {
      detail.value = { ...cached }
    } else {
      const result = await getMessageList({ pageNum: 1, pageSize: 100 })
      const items = pick(result, 'items', 'Items', []).map(normalizeMessage)
      detail.value = items.find(item => String(item.messageId) === messageId.value) || null
    }

    if (!detail.value) {
      loadFailure.value = { messageKey: 'content.messages.missing' }
      return
    }

    await markDetailAsRead()
  } catch (error) {
    console.error('[MessageDetail] 加载消息失败:', error)
    loadFailure.value = error?.message ? error : { messageKey: 'content.messages.loadFailed' }
  } finally {
    loading.value = false
  }
}

async function markDetailAsRead() {
  if (!detail.value || detail.value.isRead) return
  await markAsRead({ messageId: detail.value.messageId })
  detail.value.isRead = true
  messageStore.reduceUnread(messageStore.getMessageTypeKey(detail.value.type), 1)
  const cached = messageStore.messageList.find(item => item.messageId === detail.value.messageId)
  if (cached) cached.isRead = true
}

/** 仅翻译消息类型标签，不生成或改写消息正文。 */
function getTypeMeta(type) {
  return typeMeta.value[type] || { label: t('content.messages.notification'), icon: 'bell', tone: 'default' }
}

function openRelatedBusiness() {
  if (!relatedAction.value || !detail.value?.relatedId) return
  if (relatedAction.value.kind === 'bill') {
    navigator.navigateTo(routes.account.billDetail(detail.value.relatedId))
    return
  }
  navigator.navigateTo(routes.order.detail(detail.value.relatedId))
}
</script>

<style lang="scss" scoped>
.message-detail-shell { --surface-page: #f2f4f7; }
.message-detail-page { width: 100%; min-height: 100%; padding-bottom: env(safe-area-inset-bottom); box-sizing: border-box; }
.message-detail-card { padding: 20px; border-radius: var(--radius-feature, 18px); background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.detail-topline { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.detail-type { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 650; }
.tone-order { color: #496f9b; }
.tone-audit { color: #168a52; }
.tone-bill { color: #9a6b22; }
.tone-system { color: var(--primary-color, #d7192d); }
.tone-default { color: var(--icon-secondary, #62666f); }
.read-status { display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 999px; color: #7d858f; background: rgba(125,133,143,.1); font-size: 11px; line-height: 16px; }
.read-status.unread { color: var(--primary-color, #d7192d); background: rgba(215,25,45,.1); }
.read-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.detail-title { display: block; margin-top: 18px; color: var(--type-title-color, #1b1c20); font-size: 20px; font-weight: 750; line-height: 28px; }
.detail-time { display: block; margin-top: 8px; color: var(--type-muted-color, #969aa3); font-size: 12px; line-height: 18px; }
.detail-divider { height: 1px; margin: 18px 0; background: rgba(130,138,148,.16); }
.detail-content { display: block; color: var(--type-body-color, #1b1c20); font-size: 15px; line-height: 26px; white-space: pre-wrap; word-break: break-word; }
.related-entry { display: flex; min-height: 58px; align-items: center; gap: 11px; margin-top: 24px; padding: 12px 13px; border-radius: 14px; background: rgba(215,25,45,.06); }
.related-entry--pressed { opacity: .66; }
.related-entry-icon { display: grid; width: 34px; height: 34px; flex: none; place-items: center; border-radius: 11px; color: var(--primary-color, #d7192d); background: rgba(215,25,45,.1); }
.related-entry-copy { min-width: 0; flex: 1; }
.related-entry-title { display: block; color: var(--type-title-color, #1b1c20); font-size: 13px; font-weight: 650; line-height: 20px; }
.related-entry-desc { display: block; margin-top: 2px; color: var(--type-muted-color, #969aa3); font-size: 11px; line-height: 16px; }
.read-hint { display: flex; align-items: center; gap: 5px; margin-top: 24px; color: var(--type-muted-color, #969aa3); font-size: 11px; line-height: 16px; }
.detail-state { display: flex; min-height: 220px; align-items: center; justify-content: center; gap: 9px; color: var(--type-muted-color, #969aa3); font-size: 13px; }
.detail-state--error { flex-direction: column; color: var(--primary-color, #d7192d); }
.detail-retry { color: var(--type-muted-color, #969aa3); }
.detail-spinner { width: 17px; height: 17px; border: 2px solid #e3e6ea; border-top-color: var(--primary-color, #d7192d); border-radius: 50%; animation: detail-spin .8s linear infinite; }
@keyframes detail-spin { to { transform: rotate(360deg); } }
</style>
