<template>
  <AppPageShell class="message-shell">
    <template #header>
      <AppHeader
        title="消息中心"
        :show-back="true"
        :action-text="unreadCount > 0 ? '全部已读' : ''"
        :action-disabled="markingAll"
        @action="handleMarkAllRead"
      />
    </template>

    <template #content>
      <AppContent padding="12px var(--page-padding-x, 16px) 32px" @scrolltolower="loadMore">
        <view class="message-page">
          <view class="category-grid">
            <view
              v-for="category in categories"
              :key="category.key"
              class="category-card"
              :class="{ active: currentType === category.value }"
              hover-class="card--pressed"
              @tap="switchType(category.value)"
            >
              <view class="category-icon" :class="category.tone">
                <AppIcon :name="category.icon" :size="27" :stroke-width="1.8" />
              </view>
              <view class="category-copy">
                <view class="category-title-row">
                  <text class="category-title">{{ category.title }}</text>
                  <text v-if="category.badge" class="category-badge">{{ category.badge }}</text>
                </view>
                <text class="category-summary">{{ category.summary }}</text>
              </view>
              <AppIcon name="chevron-right" :size="17" color="#A5ABB3" />
            </view>
          </view>

          <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false">
            <view class="filter-row">
              <view
                v-for="tab in msgTypes"
                :key="String(tab.value)"
                class="filter-item"
                :class="{ active: currentType === tab.value }"
                hover-class="filter-item--pressed"
                @tap="switchType(tab.value)"
              >
                {{ tab.label }}
              </view>
            </view>
          </scroll-view>

          <view class="section-heading">
            <text class="section-title">{{ currentTypeLabel }}</text>
            <text v-if="totalCount > 0" class="section-meta">{{ totalCount }} 条</text>
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

          <view v-if="messageList.length > 0" class="load-state">
            <text v-if="loadingMore">正在加载…</text>
            <text v-else-if="!hasMore">没有更多消息了</text>
          </view>
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
import { formatRelativeTime } from '../../../../shared/utils/format.js'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import noMessageSvg from '../../../../shared/assets/illustrations/no-message.svg?raw'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

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
const markingAll = ref(false)
const hasMore = ref(true)
const pageNum = ref(1)
const totalCount = ref(0)
const unreadCount = ref(0)

const currentTypeLabel = computed(() => (
  msgTypes.find(item => item.value === currentType.value)?.label || '全部'
) + '消息')

const categories = computed(() => [
  {
    key: 'business',
    value: 'business',
    title: '业务消息',
    summary: '订单、审核与账单进度',
    icon: 'message',
    tone: 'business',
    badge: '',
  },
  {
    key: 'system',
    value: 4,
    title: '系统公告',
    summary: '平台通知与服务变更',
    icon: 'announcement',
    tone: 'system',
    badge: '',
  },
])

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

  return {
    messageId: Number(pick(item, 'messageId', 'MessageId', 0)),
    title: String(pick(item, 'title', 'Title', '消息通知')),
    content: String(pick(item, 'content', 'Content', '')),
    type: Number(pick(item, 'msgType', 'MsgType', 0)),
    isRead: Boolean(pick(item, 'isRead', 'IsRead', false)),
    createdAt: pick(item, 'createdAt', 'CreatedAt', ''),
    relatedId: templateParams.orderId
      ?? templateParams.OrderId
      ?? templateParams.billId
      ?? templateParams.BillId
      ?? null,
  }
}

async function refreshPage() {
  pageNum.value = 1
  totalCount.value = 0
  hasMore.value = true
  messageList.value = []
  await Promise.all([loadMessages(false), loadUnreadCount()])
}

async function switchType(type) {
  if (currentType.value === type && messageList.value.length > 0) return
  currentType.value = type
  pageNum.value = 1
  totalCount.value = 0
  hasMore.value = true
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
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
    messageStore.setMessageList(messageList.value)
    messageStore.setLatestMessage(messageList.value[0] || null)
  } catch (error) {
    if (append) pageNum.value = Math.max(1, pageNum.value - 1)
    console.error('[MessageCenter] 加载消息失败:', error)
    uni.showToast({ title: '消息加载失败，请稍后重试', icon: 'none' })
  } finally {
    state.value = false
  }
}

async function loadUnreadCount() {
  try {
    const result = await getUnreadCount()
    unreadCount.value = Number(result?.unreadCount ?? result?.UnreadCount ?? result ?? 0)
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

  if (!item.relatedId) return
  const routeMap = {
    1: () => navigator.navigateTo(routes.order.detail(item.relatedId)),
    3: () => navigator.navigateTo(routes.account.billList()),
  }
  routeMap[item.type]?.()
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
  max-width: 880px;
  min-height: 100%;
  margin: 0 auto;
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
}

.category-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.category-card {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 18px;
  min-height: 96px;
  align-items: center;
  gap: 13px;
  padding: 16px;
  border: 1px solid rgba(217, 220, 226, 0.8);
  border-radius: var(--radius-feature, 18px);
  background: #fff;
  box-shadow: 0 8px 26px rgba(35, 42, 51, 0.035);
  box-sizing: border-box;
  transition: border-color var(--transition-fast, 120ms) ease, transform var(--transition-fast, 120ms) ease;
}

.category-card.active {
  border-color: rgba(215, 25, 45, 0.28);
}

.category-icon,
.message-icon {
  display: grid;
  place-items: center;
  color: var(--icon-primary, #303238);
}

.category-icon.business { color: var(--primary-color, #d7192d); }
.category-icon.system { color: #9a6b22; }
.category-copy { min-width: 0; }
.category-title-row { display: flex; min-width: 0; align-items: center; gap: 7px; }
.category-title { color: var(--type-title-color, #1b1c20); font-size: var(--type-card-title-size, 16px); font-weight: 700; line-height: var(--type-card-title-line-height, 24px); }
.category-summary { display: block; margin-top: 4px; overflow: hidden; color: var(--type-secondary-color, #62666f); font-size: var(--type-caption-size, 12px); line-height: var(--type-caption-line-height, 18px); text-overflow: ellipsis; white-space: nowrap; }
.category-badge { display: grid; min-width: 18px; height: 18px; padding: 0 5px; place-items: center; border-radius: 9px; color: #fff; background: var(--primary-color, #d7192d); box-sizing: border-box; font-size: 10px; font-weight: 700; line-height: 1; }

.filter-scroll {
  width: 100%;
  margin: 16px 0 2px;
  white-space: nowrap;
}

.filter-row { display: inline-flex; min-width: 100%; align-items: center; gap: 8px; }
.filter-item { display: inline-flex; min-width: 54px; height: 34px; align-items: center; justify-content: center; padding: 0 14px; border: 1px solid transparent; border-radius: 17px; color: var(--type-secondary-color, #62666f); background: rgba(255, 255, 255, 0.72); box-sizing: border-box; font-size: var(--type-caption-size, 12px); font-weight: 500; }
.filter-item.active { border-color: rgba(215, 25, 45, 0.14); color: var(--primary-color, #d7192d); background: #fff; font-weight: 650; }
.filter-item--pressed,
.card--pressed { opacity: 0.7; transform: scale(0.99); }

.section-heading { display: flex; align-items: center; justify-content: space-between; margin: 20px 2px 10px; }
.section-title { color: var(--type-title-color, #1b1c20); font-size: var(--type-section-title-size, 18px); font-weight: 700; line-height: var(--type-section-title-line-height, 26px); }
.section-meta { color: var(--type-muted-color, #969aa3); font-size: var(--type-caption-size, 12px); }

.message-list,
.message-skeleton { display: grid; grid-template-columns: 1fr; gap: 10px; }
.message-item,
.skeleton-card { display: grid; grid-template-columns: 32px minmax(0, 1fr); align-items: flex-start; gap: 12px; min-height: 112px; padding: 16px; border: 1px solid rgba(226, 228, 232, 0.84); border-radius: var(--radius-card, 14px); background: #fff; box-sizing: border-box; }
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
  .category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .category-card { min-height: 108px; padding: 18px 20px; }
  .message-list,
  .message-skeleton { gap: 12px; }
  .message-item,
  .skeleton-card { min-height: 120px; padding: 18px 20px; }
}

@media screen and (min-width: 960px) {
  .message-list,
  .message-skeleton { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; }
}
</style>
