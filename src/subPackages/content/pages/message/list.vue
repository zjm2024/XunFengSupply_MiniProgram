<template>
  <AppPageShell class="message-shell">
    <template #header>
      <AppHeader :title="listTitle" :show-back="true" :transparent="true" :action-text="t('content.messages.settingsAction')" @action="goToNotificationSettings">
        <template #before-action>
          <button class="mark-all-read-icon" hover-class="none" :disabled="markingAll || unreadCount <= 0" :aria-busy="markingAll" :aria-label="t(markingAll ? 'content.messages.markingAll' : 'content.messages.markAll')" @tap="handleMarkAllRead">
            <AppIcon name="broom" :size="20" />
          </button>
        </template>
      </AppHeader>
    </template>

    <template #content>
      <AppContent
        width-mode="standard"
        padding="16px var(--page-padding-x, 16px) 32px"
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="handleRefresh"
        @refresherrestore="handleRefresherRestore"
        @refresherabort="handleRefresherRestore"
        @scrolltolower="loadMore"
      >
        <view class="message-page">
          <view class="message-inbox">

            <AppPageState v-if="loading && !messageList.length" state="loading" />

            <view v-else-if="messageList.length" class="message-list">
              <button
                v-for="item in messageList"
                :key="item.messageId"
                class="message-item"
                role="link"
                :class="{ unread: !item.isRead }"
                hover-class="message-control--pressed"
                @click="goToDetail(item)"
              >
                <view class="message-card-body">
                  <view class="message-meta">
                    <view class="message-type">
                      <view class="message-type-icon">
                        <image class="list-type-art" :src="messageIcon(item.type)" mode="aspectFit" alt="" aria-hidden="true" />
                        <view v-if="!item.isRead" class="message-unread-dot" aria-hidden="true" />
                      </view>
                      <text v-if="!item.isRead" class="message-unread-announcement">{{ t('content.messages.unread') }}</text>
                      <text>{{ getTypeMeta(item.type).label }}</text>
                    </view>
                    <text class="message-time">{{ formatRelativeTime(item.createdAt, relativeTimeLabel) || t('content.messages.unknownTime') }}</text>
                  </view>
                  <text class="message-title">{{ item.title }}</text>
                  <text v-if="hasDistinctPreview(item)" class="message-content">{{ messagePreview(item.content) }}</text>
                  <view class="message-card-footer">
                    <view class="message-detail-link">
                      <text>{{ t('content.messages.viewDetail') }}</text>
                      <AppIcon name="chevron-right" :size="14" aria-hidden="true" />
                    </view>
                  </view>
                </view>
              </button>
            </view>

            <AppPageState v-else-if="initialError" state="error" :title="t('content.messages.loadFailed')" :action-text="t('content.messages.retry')" @retry="refreshPage" />
            <AppPageState v-else state="empty" icon-type="message"
              :title="t('content.messages.empty')" :description="t('content.messages.emptyHint')" />
          </view>

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
import { waitForPaginationResult } from '@/shared/utils/refreshAnimation.js'

import { t } from '@/shared/i18n/index.js'
import '@/subPackages/content/i18n/register.js'
import { computed, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { getMessageList, getUnreadSummary, markAllAsRead } from '../../api/message.js'
import { useMessageStore } from '../../model/messageStore.js'
import { formatRelativeTime } from '../../../../shared/utils/format.js'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'

import { messageIcon } from '../../model/messageCategories.js'
const messageStore = useMessageStore()
const pageSize = 20

const msgTypes = computed(() => [
  { value: '', label: t('content.messages.all') },
  { value: 'business', label: t('content.messages.business') },
  { value: 1, label: t('content.messages.order') },
  { value: 2, label: t('content.messages.audit') },
  { value: 3, label: t('content.messages.bill') },
  { value: 4, label: t('content.messages.announcement') },
])

const typeMeta = computed(() => ({
  1: { label: t('content.messages.orderType'), icon: 'order' },
  2: { label: t('content.messages.auditType'), icon: 'check' },
  3: { label: t('content.messages.billType'), icon: 'invoice' },
  4: { label: t('content.messages.announcementType'), icon: 'announcement' },
}))

const currentType = ref('business')
const listTitle = computed(() => msgTypes.value.find(item => String(item.value) === String(currentType.value))?.label || t('content.messages.business'))
const initialError = ref(false)
let disposed = false
let loadedSession = ''
const messageList = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const isRefreshing = ref(false)
const markingAll = ref(false)
const hasMore = ref(true)
const pageNum = ref(1)
const totalCount = ref(0)
const unreadCount = computed(() => messageStore.unreadCount)
const userStore = useUserStore()
const sessionKey = () => String(userStore.userId) + ":" + String(userStore.dealerId)
const loadMoreError = ref(false)
let listRequestId = 0
let summaryRequestId = 0

const loadMoreStatus = computed(() => {
  if (loadingMore.value) return 'loading'
  if (loadMoreError.value) return 'error'
  if (!hasMore.value) return 'no-more'
  return 'idle'
})


onLoad(options => {
  const type = String(options?.type || 'business')
  currentType.value = ['business', '1', '2', '3', '4'].includes(type) ? type : 'business'
})
onShow(() => {
  if (loadedSession !== sessionKey()) { loadedSession = sessionKey(); refreshPage(); return }
  messageList.value = messageList.value.map(item => ({ ...item, isRead: messageStore.messageList.find(cached => cached.messageId === item.messageId)?.isRead ?? item.isRead }))
  loadUnreadCount()
})
onUnload(() => { disposed = true; listRequestId++ })


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


async function requestPage(targetPage) {
  return getMessageList({ pageNum: targetPage, pageSize,
    businessOnly: currentType.value === 'business',
    msgType: currentType.value === '' || currentType.value === 'business' ? null : Number(currentType.value) })
}

/** 按原筛选和分页读取消息，保留消息正文与业务事实。 */
async function loadMessages(append = false) {
  if (append && (loading.value || loadingMore.value)) return
  const requestId = ++listRequestId
  const key = sessionKey()
  const isCurrent = () => !disposed && requestId === listRequestId && key === sessionKey()
  if (!append) initialError.value = false
  loading.value = !append
  loadingMore.value = append
  try {
    const result = await waitForPaginationResult(requestPage(pageNum.value), append)
    if (!isCurrent()) return
    messageList.value = append ? [...messageList.value, ...result.items.filter(item => !messageList.value.some(old => old.messageId === item.messageId))] : result.items
    totalCount.value = result.totalCount
    hasMore.value = result.items.length > 0 && pageNum.value * pageSize < result.totalCount
    loadMoreError.value = false
    messageStore.setMessageList(messageList.value)

  } catch (error) {
    if (!isCurrent()) return
    if (append) pageNum.value = Math.max(1, pageNum.value - 1)
    loadMoreError.value = Boolean(append)
    initialError.value = !append
    console.error('[MessageCenter] 加载消息失败:', error)
    uni.showToast({ title: t('content.messages.loadFailed'), icon: 'none' })
  } finally {
    if (requestId === listRequestId) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

async function loadUnreadCount() {
  const key = sessionKey(), id = ++summaryRequestId
  try { const summary = await getUnreadSummary(); if (!disposed && id === summaryRequestId && key === sessionKey()) messageStore.applySummary(summary) }
  catch (error) { console.warn('[MessageCenter] Summary unavailable', error?.kind) }
}

function loadMore() {
  if (disposed || initialError.value || !hasMore.value || loading.value || loadingMore.value) return
  pageNum.value += 1
  loadMessages(true)
}

/** 仅格式化相对时间的显示单位，不参与 UTC 解析或消息排序。 */
function relativeTimeLabel(unit, count) {
  return t('content.messages.time.' + unit, { count })
}

/** 摘要只投影纯文字，保留服务端原正文，跨端不依赖DOM或执行HTML。 */
function messagePreview(value) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  return String(value ?? '')
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, ' ')
    .replace(/<\/?(?:p|div|li|h[1-6]|br|hr)\b[^>]*>/gi, ' ')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, name) => {
      if (name[0] !== '#') return entities[name.toLowerCase()] ?? entity
      const hex = name[1]?.toLowerCase() === 'x'
      const code = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10)
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : entity
    })
    .replace(/\s+/g, ' ').trim()
}

/** 同一段文案只在列表显示一次，详情保留完整正文。 */
function hasDistinctPreview(item) {
  const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ')
  const preview = messagePreview(item.content)
  return Boolean(preview && preview !== normalize(item.title))
}

/** 按原消息类型返回图标和本地化标签。 */
function getTypeMeta(type) {
  return typeMeta.value[type] || { label: t('content.messages.notification'), icon: 'bell' }
}

function goToNotificationSettings() {
  navigator.navigateTo(routes.account.notificationSettings())
}

/** 用户点击时沿用原已读写入和业务导航，只本地化失败反馈。 */
async function goToDetail(item) {
  // The detail page marks read only after an owned message was loaded successfully.
  navigator.navigateTo(routes.content.messageDetail(item.messageId))
}

/** 用户主动点击后沿用原批量已读流程与计数处理。 */
async function handleMarkAllRead() {
  if (markingAll.value || unreadCount.value <= 0) return
  markingAll.value = true
  try {
    const key = sessionKey()
    await markAllAsRead(messageStore.maxMessageId)
    if (key !== sessionKey()) return
    await refreshPage()
    uni.showToast({ title: t('content.messages.markedAll'), icon: 'success' })
  } catch (error) {
    console.error('[MessageCenter] 全部已读失败:', error)
    uni.showToast({ title: t('content.messages.operationFailed'), icon: 'none' })
  } finally {
    markingAll.value = false
  }
}
</script>

<style lang="scss" scoped>
.message-page {
  min-width: 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  width: 100%;
  border-radius: var(--radius-card, 14px);
  background: var(--surface-card);
  box-sizing: border-box;
}

.message-item {
  display: block;
  margin: 0;
  padding: 0;
  border: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  overflow: hidden;
}
.message-item::after,
.mark-all-read-icon::after { border: 0; }
.message-item.message-control--pressed,
.message-item:active { background: var(--surface-page); }
@media (hover: hover) {
  .message-item:hover { box-shadow: var(--glass-card-shadow); }
}
.message-item:focus-visible,
.mark-all-read-icon:focus-visible {
  outline: 2px solid var(--primary-color, #d7192d);
  outline-offset: -3px;
}

.message-card-body { padding: 16px; }
.message-title {
  display: block;
  margin-top: 10px;
  overflow-wrap: anywhere;
  text-wrap: balance;
  color: var(--type-title-color);
  font-size: var(--type-card-title-size);
  line-height: var(--type-card-title-line-height);
  font-weight: var(--font-weight-semibold, 600);
}
.message-item.unread .message-title { font-weight: var(--font-weight-bold, 700); }

.message-meta,
.message-type {
  display: flex;
  align-items: center;
}
.message-meta {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 12px;
  color: var(--type-secondary-color);
  font-size: var(--type-caption-size);
  line-height: var(--type-caption-line-height);
}
.message-type {
  min-width: 0;
  gap: 8px;
  font-weight: var(--font-weight-medium, 500);
}
.message-type-icon { position: relative; flex: none; width: 28px; height: 28px; }
.list-type-art { display: block; width: 100%; height: 100%; }
.message-unread-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary-color, #d7192d);
  box-shadow: 0 0 0 2px var(--surface-card);
  pointer-events: none;
}
.message-unread-announcement {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.message-time { margin-inline-start: auto; font-variant-numeric: tabular-nums; }

.message-content {
  display: -webkit-box;
  margin-top: 6px;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  color: var(--type-secondary-color);
  font-size: var(--type-body-size);
  line-height: var(--type-body-line-height);
}

.message-card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 12px;
}
.message-detail-link {
  display: flex;
  align-items: center;
  margin-inline-start: auto;
  gap: 4px;
  flex: none;
  color: var(--type-secondary-color);
  font-size: var(--type-body-small-size);
  line-height: var(--type-body-small-line-height);
}








.mark-all-read-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--type-title-color);
  background: transparent;
}
.mark-all-read-icon[disabled] { color: var(--color-text-disabled, #b8bbc2); background: transparent; }

@media (min-width: 768px) {
  .message-card-body { padding-inline: 24px; }
}
</style>
