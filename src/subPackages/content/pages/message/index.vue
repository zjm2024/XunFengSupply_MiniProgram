<template>
  <AppPageShell class="message-shell">
    <template #header>
      <AppHeader
        :title="t('content.titles.messages')"
        :show-back="true"
        :transparent="true"
        :action-text="t('content.messages.settingsAction')"
        @action="goToNotificationSettings"
      />
    </template>

    <template #content>
      <AppContent
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
            <view class="inbox-controls">
              <view class="inbox-toolbar">
                <view class="inbox-summary">
                  <view v-if="unreadCount > 0" class="unread-dot" aria-hidden="true" />
                  <text aria-live="polite">{{ unreadCount > 0
                    ? t('content.messages.unreadSummary', { count: unreadCount })
                    : t('content.messages.noUnread') }}</text>
                </view>
                <button
                  v-if="unreadCount > 0"
                  class="mark-all-read"
                  :disabled="markingAll"
                  hover-class="mark-all-read--pressed"
                  @click="handleMarkAllRead"
                >{{ t(markingAll ? 'content.messages.markingAll' : 'content.messages.markAll') }}</button>
              </view>

              <view class="message-filters" role="group" :aria-label="t('content.messages.filterLabel')">
                <button
                  v-for="tab in messageTabs"
                  :key="tab.value"
                  class="message-filter"
                  :class="{ 'is-active': currentType === tab.value }"
                  :aria-pressed="currentType === tab.value"
                  hover-class="message-control--pressed"
                  @click="switchType(tab.value)"
                >
                  <text>{{ tab.label }}</text>
                  <text v-if="tab.count > 0" class="filter-count">{{ tab.count > 99 ? '99+' : tab.count }}</text>
                </button>
              </view>
            </view>

            <view v-if="loading && !messageList.length" class="message-skeleton" :aria-label="t('content.messages.loadingList')">
              <view v-for="index in 3" :key="index" class="skeleton-row">
                <view class="skeleton-icon" />
                <view class="skeleton-lines">
                  <view class="skeleton-line skeleton-line--title" />
                  <view class="skeleton-line skeleton-line--meta" />
                </view>
              </view>
            </view>

            <view v-else-if="messageList.length" class="message-list">
              <button
                v-for="item in messageList"
                :key="item.messageId"
                class="message-item"
                :class="{ unread: !item.isRead }"
                hover-class="message-control--pressed"
                @click="goToDetail(item)"
              >
                <view class="message-icon" aria-hidden="true">
                  <AppIcon :name="getTypeMeta(item.type).icon" :size="19" />
                  <view v-if="!item.isRead" class="unread-dot message-icon-dot" />
                </view>
                <view class="message-copy">
                  <view class="message-title-wrap">
                    <text v-if="!item.isRead" class="sr-only">{{ t('content.messages.unreadLabel') }}</text>
                    <text class="message-title">{{ item.title }}</text>
                  </view>
                  <text v-if="hasDistinctPreview(item)" class="message-content">{{ messagePreview(item.content) }}</text>
                  <view class="message-meta">
                    <text class="message-type">{{ getTypeMeta(item.type).label }}</text>
                    <text class="message-time message-time--inline">{{ formatRelativeTime(item.createdAt, relativeTimeLabel) }}</text>
                  </view>
                </view>
                <text class="message-time message-time--wide">{{ formatRelativeTime(item.createdAt, relativeTimeLabel) }}</text>
                <view class="message-chevron" aria-hidden="true"><AppIcon name="chevron-right" :size="14" /></view>
              </button>
            </view>

            <view v-else class="message-empty">
              <AppPageState state="empty" :title="t('content.messages.empty')" :description="t('content.messages.emptyHint')">
                <template #illustration>
                  <view class="inbox-empty-icon" aria-hidden="true"><AppIcon name="bell" :size="28" /></view>
                </template>
              </AppPageState>
            </view>
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
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/content/i18n/register.js'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
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

const currentType = ref('')
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
  return msgTypes.value.map(item => ({ ...item, count: countMap[item.value] || 0 }))
})

onShow(() => refreshPage())

function pick(source, camelKey, pascalKey, fallback) {
  return source?.[camelKey] ?? source?.[pascalKey] ?? fallback
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
  return getMessageList({ pageNum: targetPage, pageSize,
    businessOnly: currentType.value === 'business',
    msgType: currentType.value === '' || currentType.value === 'business' ? null : currentType.value })
}

/** 按原筛选和分页读取消息，保留消息正文与业务事实。 */
async function loadMessages(append = false) {
  if (append && (loading.value || loadingMore.value)) return
  const requestId = ++listRequestId
  const key = sessionKey()
  const isCurrent = () => requestId === listRequestId && key === sessionKey()
  loading.value = !append
  loadingMore.value = append
  try {
    const result = await requestPage(pageNum.value)
    if (!isCurrent()) return
    messageList.value = append ? [...messageList.value, ...result.items] : result.items
    totalCount.value = result.totalCount
    hasMore.value = messageList.value.length < result.totalCount
    loadMoreError.value = false
    messageStore.setMessageList(messageList.value)
    messageStore.setLatestMessage(messageList.value[0] || null)
  } catch (error) {
    if (!isCurrent()) return
    if (append) pageNum.value = Math.max(1, pageNum.value - 1)
    loadMoreError.value = Boolean(append)
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
  const key = sessionKey()
  try { const summary = await getUnreadSummary(); if (key === sessionKey()) messageStore.applySummary(summary) }
  catch (error) { console.warn('[MessageCenter] Summary unavailable', error?.kind) }
}

function loadMore() {
  if (!hasMore.value || loading.value || loadingMore.value) return
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
.message-shell {
  --surface-page: #e9eaeb;
  --inbox-paper: #fff;
  --inbox-ink: #18191b;
  --inbox-muted: #575b62;
  --inbox-divider: rgba(27, 29, 32, .09);
  --inbox-soft: rgba(27, 29, 32, .06);
  --inbox-unread: #c6172b;
  background-image:
    radial-gradient(ellipse at 16% 1%, #fff 0, transparent 48%),
    radial-gradient(ellipse at 98% 22%, #c9cbce 0, transparent 51%),
    radial-gradient(ellipse at 12% 68%, #cfd1d3 0, transparent 49%),
    linear-gradient(155deg, #e4e5e7 8%, #f5f5f6 57%, #e1e2e4 100%);
}

.message-page {
  width: 100%;
  max-width: 840px;
  min-height: 100%;
  margin: 0 auto;
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
}

.message-inbox {
  display: grid;
  gap: 12px;
}

.inbox-controls,
.message-list,
.message-skeleton,
.message-empty {
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .86);
  border-radius: 18px;
  background: rgba(250, 250, 251, .9);
  box-shadow: 0 10px 30px rgba(23, 25, 28, .07), 0 1px 3px rgba(23, 25, 28, .04);
}

@supports ((backdrop-filter: blur(16px)) or (-webkit-backdrop-filter: blur(16px))) {
  .inbox-controls,
  .message-list,
  .message-skeleton,
  .message-empty {
    background: linear-gradient(145deg, rgba(255, 255, 255, .66), rgba(255, 255, 255, .42));
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
  }
}

.message-empty { padding: 12px; }

.inbox-toolbar {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px 0;
}

.inbox-summary {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: var(--inbox-ink);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.mark-all-read,
.message-filter,
.message-item {
  margin: 0;
  border: 0;
  color: inherit;
  font: inherit;
  box-sizing: border-box;
}

.mark-all-read::after,
.message-filter::after,
.message-item::after { border: 0; }

.mark-all-read {
  display: flex;
  min-height: 44px;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: 9px;
  color: var(--inbox-paper);
  background: var(--inbox-unread);
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
}

.mark-all-read[disabled] { opacity: .6; }
.mark-all-read--pressed { opacity: .82; }

.message-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  margin: 8px 12px 12px;
  padding: 4px;
  border: 1px solid var(--inbox-divider);
  border-radius: 12px;
  background: var(--inbox-soft);
}

.message-filter {
  display: flex;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2px 4px;
  padding: 4px;
  border-radius: 7px;
  color: var(--inbox-muted);
  background: transparent;
  font-size: 13px;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.message-filter.is-active {
  color: var(--inbox-ink);
  background: rgba(255, 255, 255, .9);
  box-shadow: 0 1px 3px rgba(23, 25, 28, .14), inset 0 0 0 1px rgba(255, 255, 255, .82);
  font-weight: 600;
}

.filter-count {
  padding: 1px 4px;
  border-radius: 4px;
  color: var(--inbox-ink);
  background: var(--inbox-soft);
  font-size: 12px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.message-item,
.skeleton-row {
  display: grid;
  width: 100%;
  grid-template-columns: 36px minmax(0, 1fr) 16px;
  min-height: 76px;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 0;
  background: transparent;
  text-align: left;
}

.message-item + .message-item,
.skeleton-row + .skeleton-row { border-top: 1px solid var(--inbox-divider); }
.message-item.unread { background: rgba(255, 255, 255, .3); }
.message-item.message-control--pressed,
.message-filter:not(.is-active).message-control--pressed { background: rgba(27, 29, 32, .09); }
.message-filter.is-active.message-control--pressed { opacity: .8; }
.message-item:focus-visible,
.message-filter:focus-visible,
.mark-all-read:focus-visible { outline: 2px solid var(--inbox-ink); outline-offset: -3px; }

.message-icon,
.inbox-empty-icon {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, .75);
  border-radius: 10px;
  color: #393c40;
  background: rgba(255, 255, 255, .46);
}

.inbox-empty-icon { width: 56px; height: 56px; margin: 0 auto; border-radius: 14px; }
.message-copy { min-width: 0; }
.message-title-wrap { min-width: 0; }
.unread-dot { width: 7px; height: 7px; flex: none; border-radius: 50%; background: var(--inbox-unread); }
.message-icon { position: relative; }
.message-icon-dot { position: absolute; top: 0; right: 0; box-shadow: 0 0 0 2px var(--inbox-paper); }

.message-title,
.message-content {
  display: -webkit-box;
  min-width: 0;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.message-title { color: var(--inbox-ink); font-size: 15px; font-weight: 550; line-height: 22px; }
.message-item.unread .message-title { font-weight: 700; }
.message-content { margin-top: 4px; color: var(--inbox-muted); font-size: 14px; line-height: 20px; }
.message-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin-top: 4px; }
.message-type, .message-time { color: var(--inbox-muted); font-size: 12px; line-height: 18px; }
.message-time--wide { display: none; }
.message-chevron { display: flex; align-items: center; justify-content: center; color: var(--inbox-muted); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

.skeleton-row { grid-template-columns: 36px minmax(0, 1fr); }
.skeleton-icon, .skeleton-line { border-radius: 6px; background: var(--inbox-soft); }
.skeleton-icon { width: 36px; height: 36px; border-radius: 9px; }
.skeleton-lines { display: grid; gap: 8px; }
.skeleton-line--title { width: 52%; height: 15px; }
.skeleton-line--meta { width: 26%; height: 12px; }

@media (min-width: 640px) {
  .inbox-toolbar { padding: 12px 20px 0; }
  .message-filters { grid-template-columns: repeat(6, minmax(0, 1fr)); margin: 8px 20px 16px; }
  .message-item, .skeleton-row { padding: 12px 20px; }
  .message-item { grid-template-columns: 36px minmax(0, 1fr) auto 16px; gap: 16px; }
  .message-time--wide { display: block; text-align: right; }
  .message-time--inline { display: none; }
}
</style>
