<template>
  <AppPageShell class="message-shell">
    <template #header>
      <AppHeader
        title="消息中心"
        :show-back="true"
        action-text="通知设置"
        @action="goToNotificationSettings"
      />
    </template>

    <template #content>
      <AppContent
        padding="12px var(--page-padding-x, 16px) 32px"
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="handleRefresh"
        @refresherrestore="handleRefresherRestore"
        @refresherabort="handleRefresherRestore"
        @scrolltolower="loadMore"
      >
        <view class="message-page">
          <view class="message-filter-toolbar">
            <StatusTabBar
              :items="messageTabs"
              :model-value="currentType"
              :max-width="700"
              @change="switchType"
            />
            <view
              v-if="unreadCount > 0"
              class="mark-all-read"
              :class="{ disabled: markingAll }"
              hover-class="mark-all-read--pressed"
              @tap="handleMarkAllRead"
            >
              全部已读
            </view>
          </view>

          <view v-if="loading && messageList.length === 0" class="message-skeleton" aria-label="正在加载消息">
            <view v-for="index in 3" :key="index" class="skeleton-card">
              <view class="skeleton-icon" />
              <view class="skeleton-lines">
                <view class="skeleton-line skeleton-line--title" />
                <view class="skeleton-line" />
                <view class="skeleton-line skeleton-line--short" />
              </view>
            </view>
          </view>

          <view v-else-if="messageList.length > 0" class="message-list">
            <view
              v-for="item in messageList"
              :key="item.messageId"
              class="message-item"
              :class="{ unread: !item.isRead }"
              hover-class="card--pressed"
              @tap="goToDetail(item)"
            >
              <view class="message-icon" :class="`tone-${getTypeMeta(item.type).tone}`">
                <AppIcon :name="getTypeMeta(item.type).icon" :size="24" :stroke-width="1.8" />
              </view>

              <view class="message-copy">
                <view class="message-topline">
                  <view class="message-title-wrap">
                    <view v-if="!item.isRead" class="unread-dot" />
                    <text class="message-title">{{ item.title }}</text>
                  </view>
                  <text class="message-time">{{ formatRelativeTime(item.createdAt) }}</text>
                </view>
                <text class="message-content">{{ item.content }}</text>
                <text class="message-type">{{ getTypeMeta(item.type).label }}</text>
              </view>
            </view>
          </view>

          <AppPageState v-else-if="!loading" state="empty" title="暂无消息" description="订单、审核和账单进度会在这里通知你">
            <template #illustration>
              <AppSvgIllustration :svg="noMessageSvg" size="lg" />
            </template>
          </AppPageState>

          <AppLoadMore
            v-if="messageList.length > 0"
            :status="loadMoreStatus"
            @retry="loadMore"
          />
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMessageList, getUnreadCount, markAllAsRead, markAsRead } from '../../api/message.js'
import { useMessageStore } from '../../model/messageStore.js'
import { formatRelativeTime, parseUtcToLocal } from '../../../../shared/utils/format.js'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import StatusTabBar from '@/shared/ui/StatusTabBar.vue'
import noMessageSvg from '../../../../shared/assets/illustrations/no-message.svg?raw'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'

const messageStore = useMessageStore()
const pageSize = 20

const msgTypes = Object.freeze([
  { value: '', label: '全部' },
  { value: 'business', label: '业务' },
  { value: 1, label: '订单' },
  { value: 2, label: '审核' },
  { value: 3, label: '账单' },
  { value: 4, label: '公告' },
])

const typeMeta = Object.freeze({
  1: { label: '订单消息', icon: 'order', tone: 'order' },
  2: { label: '审核消息', icon: 'check', tone: 'audit' },
  3: { label: '账单消息', icon: 'invoice', tone: 'bill' },
  4: { label: '系统公告', icon: 'announcement', tone: 'system' },
})

const currentType = ref('')
const messageList = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const isRefreshing = ref(false)
const markingAll = ref(false)
const hasMore = ref(true)
const pageNum = ref(1)
const totalCount = ref(0)
const unreadCount = ref(0)
const loadMoreError = ref(false)

const loadMoreStatus = computed(() => {
  if (loadMoreError.value) return 'error'
  if (loadingMore.value) return 'loading'
  if (!hasMore.value) return 'no-more'
  return 'idle'
})

const messageTabs = computed(() => {
  const counts = messageStore.typeUnreadCount || {}
  const businessCount = ['order', 'audit', 'bill']
    .reduce((sum, key) => sum + Number(counts[key] || 0), 0)
  const countMap = {
    '': unreadCount.value,
    business: businessCount,
    1: Number(counts.order || 0),
    2: Number(counts.audit || 0),
    3: Number(counts.bill || 0),
    4: Number(counts.announcement || 0),
  }
  return msgTypes.map(item => ({ ...item, count: countMap[item.value] || 0 }))
})

onShow(() => refreshPage())

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

async function refreshPage() {
  pageNum.value = 1
  totalCount.value = 0
  hasMore.value = true
  loadMoreError.value = false
  messageList.value = []
  await Promise.all([loadMessages(false), loadUnreadCount()])
}

async function handleRefresh() {
  if (isRefreshing.value) return
  const startedAt = Date.now()
  isRefreshing.value = true
  try {
    await refreshPage()
  } finally {
    await waitForRefreshAnimation(startedAt)
    isRefreshing.value = false
  }
}

function handleRefresherRestore() {
  if (!loading.value && !loadingMore.value) isRefreshing.value = false
}

async function switchType(type) {
  if (currentType.value === type && messageList.value.length > 0) return
  currentType.value = type
  pageNum.value = 1
  totalCount.value = 0
  hasMore.value = true
  loadMoreError.value = false
  messageList.value = []
  await loadMessages(false)
}

async function requestPage(targetPage) {
  if (currentType.value === 'business') {
    const results = await Promise.all([1, 2, 3].map(msgType => (
      getMessageList({ pageNum: targetPage, pageSize, msgType })
    )))
    const items = results.flatMap(result => pick(result, 'items', 'Items', []))
      .map(normalizeMessage)
      .sort((a, b) => parseUtcToLocal(b.createdAt).getTime() - parseUtcToLocal(a.createdAt).getTime())
    return {
      items,
      totalCount: results.reduce((sum, result) => sum + Number(pick(result, 'totalCount', 'TotalCount', 0)), 0),
    }
  }

  const result = await getMessageList({
    pageNum: targetPage,
    pageSize,
    msgType: currentType.value === '' ? null : currentType.value,
  })
  return {
    items: pick(result, 'items', 'Items', []).map(normalizeMessage),
    totalCount: Number(pick(result, 'totalCount', 'TotalCount', 0)),
  }
}

async function loadMessages(append = false) {
  if (loading.value || loadingMore.value) return
  const state = append ? loadingMore : loading
  state.value = true
  try {
    const result = await requestPage(pageNum.value)
    messageList.value = append ? [...messageList.value, ...result.items] : result.items
    totalCount.value = result.totalCount
    hasMore.value = messageList.value.length < result.totalCount
    loadMoreError.value = false
    messageStore.setMessageList(messageList.value)
    messageStore.setLatestMessage(messageList.value[0] || null)
  } catch (error) {
    if (append) pageNum.value = Math.max(1, pageNum.value - 1)
    loadMoreError.value = Boolean(append)
    console.error('[MessageCenter] 加载消息失败:', error)
    uni.showToast({ title: '消息加载失败，请稍后重试', icon: 'none' })
  } finally {
    state.value = false
  }
}

async function loadUnreadCount() {
  try {
    const result = await getUnreadCount()
    const source = result?.data ?? result?.Data ?? result
    const typedCounts = source?.typeUnreadCount
      ?? source?.TypeUnreadCount
      ?? source?.counts
      ?? source?.Counts
    if (typedCounts && typeof typedCounts === 'object' && !Array.isArray(typedCounts)) {
      const counts = {
        order: Number(typedCounts.order ?? typedCounts.Order ?? typedCounts[1] ?? 0),
        audit: Number(typedCounts.audit ?? typedCounts.Audit ?? typedCounts[2] ?? 0),
        bill: Number(typedCounts.bill ?? typedCounts.Bill ?? typedCounts[3] ?? 0),
        announcement: Number(typedCounts.announcement ?? typedCounts.Announcement ?? typedCounts[4] ?? 0),
      }
      messageStore.setUnreadCount(counts)
      unreadCount.value = messageStore.unreadCount
      return
    }
    unreadCount.value = Number(source?.unreadCount ?? source?.UnreadCount ?? source ?? 0)
    // 旧接口只有总未读数，清掉上一次会话残留的分类数，避免徽标显示过期数据。
    messageStore.setUnreadCount({ order: 0, audit: 0, bill: 0, announcement: 0 })
    messageStore.setUnreadCount(unreadCount.value)
  } catch (error) {
    console.error('[MessageCenter] 加载未读数失败:', error)
  }
}

function loadMore() {
  if (!hasMore.value || loading.value || loadingMore.value) return
  pageNum.value += 1
  loadMessages(true)
}

function getTypeMeta(type) {
  return typeMeta[type] || { label: '消息通知', icon: 'bell', tone: 'default' }
}

function goToNotificationSettings() {
  navigator.navigateTo(routes.account.notificationSettings())
}

async function goToDetail(item) {
  if (!item.isRead) {
    try {
      await markAsRead({ messageId: item.messageId })
      item.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      messageStore.reduceUnread(messageStore.getMessageTypeKey(item.type), 1)
    } catch (error) {
      console.error('[MessageCenter] 标记已读失败:', error)
      uni.showToast({ title: '操作失败，请重试', icon: 'none' })
      return
    }
  }

  if ((item.relatedKind === 'order' || item.type === 1) && item.relatedId) {
    navigator.navigateTo(routes.order.detail(item.relatedId))
    return
  }
  if ((item.relatedKind === 'bill' || item.type === 3) && item.relatedId) {
    navigator.navigateTo(routes.account.billDetail(item.relatedId))
    return
  }
  navigator.navigateTo(routes.content.messageDetail(item.messageId))
}

async function handleMarkAllRead() {
  if (markingAll.value || unreadCount.value <= 0) return
  markingAll.value = true
  try {
    await markAllAsRead()
    unreadCount.value = 0
    messageStore.markAllRead()
    messageList.value.forEach(item => { item.isRead = true })
    uni.showToast({ title: '已全部标记已读', icon: 'success' })
  } catch (error) {
    console.error('[MessageCenter] 全部已读失败:', error)
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    markingAll.value = false
  }
}
</script>

<style lang="scss" scoped>
.message-shell {
  --surface-page: #f2f4f7;
}

.message-page {
  width: 100%;
  min-height: 100%;
  margin: 0 auto;
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
}

.message-icon {
  display: grid;
  place-items: center;
  color: var(--icon-primary, #303238);
}

.card--pressed { opacity: 0.7; transform: scale(0.99); }

.message-filter-toolbar { display: flex; min-width: 0; align-items: center; gap: 8px; margin: 4px 0 14px; }
.message-filter-toolbar :deep(.status-tab-bar) { min-width: 0; flex: 1; }
.mark-all-read { flex: none; padding: 4px 0 4px 4px; color: var(--primary-color, #d7192d); font-size: 12px; line-height: 18px; white-space: nowrap; }
.mark-all-read.disabled { opacity: .45; }
.mark-all-read--pressed { opacity: .62; }

.message-list,
.message-skeleton { display: grid; grid-template-columns: 1fr; gap: 10px; }
.message-item,
.skeleton-card { display: grid; grid-template-columns: 32px minmax(0, 1fr); align-items: flex-start; gap: 12px; min-height: 112px; padding: 16px; border-radius: var(--radius-card, 14px); background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); box-sizing: border-box; }
.message-item.unread { border-left: 3px solid var(--primary-color, #d7192d); padding-left: 14px; }
.message-icon { width: 32px; height: 32px; }
.tone-order { color: #496f9b; }
.tone-audit { color: #168a52; }
.tone-bill { color: #9a6b22; }
.tone-system { color: var(--primary-color, #d7192d); }
.tone-default { color: var(--icon-secondary, #62666f); }
.message-copy { min-width: 0; }
.message-topline { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 10px; }
.message-title-wrap { display: flex; min-width: 0; align-items: center; gap: 7px; }
.unread-dot { width: 6px; height: 6px; flex: none; border-radius: 50%; background: var(--primary-color, #d7192d); }
.message-title { overflow: hidden; color: var(--type-title-color, #1b1c20); font-size: var(--type-body-size, 14px); font-weight: 650; line-height: var(--type-body-line-height, 22px); text-overflow: ellipsis; white-space: nowrap; }
.message-time { flex: none; color: var(--type-muted-color, #969aa3); font-size: var(--type-micro-size, 11px); line-height: var(--type-micro-line-height, 16px); }
.message-content { display: -webkit-box; margin-top: 7px; overflow: hidden; color: var(--type-secondary-color, #62666f); font-size: var(--type-body-small-size, 13px); line-height: var(--type-body-small-line-height, 20px); -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.message-type { display: block; margin-top: 8px; color: var(--type-muted-color, #969aa3); font-size: var(--type-micro-size, 11px); line-height: var(--type-micro-line-height, 16px); }

.skeleton-card { grid-template-columns: 32px minmax(0, 1fr); }
.skeleton-icon,
.skeleton-line { border-radius: 6px; background: linear-gradient(90deg, #eef0f3 25%, #f7f8fa 50%, #eef0f3 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.4s infinite linear; }
.skeleton-icon { width: 30px; height: 30px; border-radius: 50%; }
.skeleton-lines { display: grid; gap: 9px; padding-top: 2px; }
.skeleton-line { width: 100%; height: 12px; }
.skeleton-line--title { width: 48%; height: 15px; }
.skeleton-line--short { width: 34%; }
.load-state { padding: 20px 0 4px; color: var(--type-muted-color, #969aa3); font-size: var(--type-caption-size, 12px); text-align: center; }

@keyframes skeleton-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

@media screen and (min-width: 600px) {
  .message-list,
  .message-skeleton { gap: 12px; }
  .message-item,
  .skeleton-card { min-height: 120px; padding: 18px 20px; }
}

</style>
