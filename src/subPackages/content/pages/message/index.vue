<!--
  APP系统消息通知列表页面（分包：systemSub）
  对应业务流程节点：
  全链路消息 → 订单状态变更推送、付款提醒、发货通知、售后结果、对账提醒、系统公告
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="消息通知" :show-back="true">
        <template #right>
          <text class="read-all" @click="handleMarkAllRead">全部已读</text>
        </template>
      </AppHeader>
    </template>
    <template #content>
      <AppContent>
        <view class="message-list-page">
          <!-- 消息分类Tab -->
          <scroll-view class="msg-tabs" scroll-x>
            <view 
              class="tab-item" 
              :class="{ active: currentType === '' }"
              @click="switchType('')"
            >全部</view>
            <view 
              class="tab-item" 
              v-for="(tab, index) in msgTypes" 
              :key="index"
              :class="{ active: currentType === tab.value }"
              @click="switchType(tab.value)"
            >
              {{ tab.label }}
              <view class="tab-badge" v-if="tab.unread > 0">{{ tab.unread }}</view>
            </view>
          </scroll-view>

          <!-- 消息列表 -->
          <scroll-view class="list-wrapper" scroll-y @scrolltolower="loadMore">
            <view class="msg-list">
              <view 
                class="msg-item" 
                :class="{ unread: !item.isRead }"
                v-for="item in messageList" 
                :key="item.messageId"
                @click="goToDetail(item)"
              >
                <!-- 消息图标 -->
                <view class="msg-icon" :class="'icon-' + item.type">
                  <text>{{ getTypeIcon(item.type) }}</text>
                </view>

                <!-- 消息内容 -->
                <view class="msg-content">
                  <view class="msg-top">
                    <text class="msg-title">{{ item.title }}</text>
                    <text class="msg-time">{{ formatRelativeTime(item.createTime) }}</text>
                  </view>
                  <text class="msg-summary">{{ item.summary }}</text>
                  <view class="msg-source">
                    <text class="source-tag">{{ getTypeLabel(item.type) }}</text>
                  </view>
                </view>

                <!-- 未读标记 -->
                <view class="unread-dot" v-if="!item.isRead"></view>
              </view>
            </view>

            <AppPageState v-if="!loading && messageList.length === 0" state="empty" title="暂无消息" icon-type="message" />

            <view class="load-more" v-if="messageList.length > 0">
              <text v-if="hasMore">加载中...</text>
              <text v-else class="no-more">— 已经到底了 —</text>
            </view>
          </scroll-view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMessageList, markAllAsRead, markAsRead } from '../../api/message.js'
import { useMessageStore } from '../../model/messageStore.js'
import { formatRelativeTime } from '../../../../shared/utils/format.js'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const messageStore = useMessageStore()

const msgTypes = reactive([
  { value: 1, label: '订单', unread: 0 },
  { value: 2, label: '付款', unread: 0 },
  { value: 3, label: '发货', unread: 0 },
  { value: 4, label: '售后', unread: 0 },
  { value: 5, label: '对账', unread: 0 }
])

const currentType = ref('')
const messageList = ref([])
const loading = ref(false)
const hasMore = ref(true)

onShow(() => {
  loadMessages()
  loadUnreadCount()
})

function switchType(type) {
  currentType.value = type
  messageList.value = []
  hasMore.value = true
  loadMessages()
}

// TODO: 待接入后端消息接口（getMessageList / getUnreadCount）
function loadMessages() {}
function loadUnreadCount() {}
function loadMore() {}

function getTypeIcon(type) {
  const icons = { 1: '📦', 2: '💰', 3: '🚚', 4: '🔄', 5: '📋', 99: '📢' }
  return icons[type] || '📌'
}

function getTypeLabel(type) {
  const labels = { 1: '订单', 2: '付款', 3: '发货', 4: '售后', 5: '对账', 99: '系统' }
  return labels[type] || '消息'
}

/**
 * 点击消息 → 标记已读 + 跳转对应页面
 */
async function goToDetail(item) {
  // 标记已读
  if (!item.isRead) {
    try {
      // await markAsRead(item.messageId)
      item.isRead = true
      messageStore.reduceUnread(messageStore.getMessageTypeKey(item.type), 1)
    } catch (e) {}
  }

  // 根据消息类型跳转不同页面
  const routeMap = {
    1: () => navigator.navigateTo(routes.order.detail(item.relatedId)),
    2: () => navigator.navigateTo(routes.order.pay(item.relatedId)),
    3: () => navigator.navigateTo(routes.order.detail(item.relatedId)),
    4: () => navigator.navigateTo(routes.order.afterSaleList()),
    5: () => navigator.navigateTo(routes.account.billList()),
    99: null
  }

  const handler = routeMap[item.type]
  if (handler) handler()
}

/**
 * 全部标记已读
 */
async function handleMarkAllRead() {
  try {
    // await markAllAsRead()
    messageStore.markAllRead()
    messageList.value.forEach(msg => msg.isRead = true)
    uni.showToast({ title: '已全部标记已读', icon: 'success' })
  } catch (e) {
    console.error('操作失败:', e)
  }
}
</script>

<style lang="scss" scoped>
.message-list-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color);
}

.read-all {
  font-size: 26rpx;
  color: var(--primary-color);
  padding: 0 16rpx;
}

.msg-tabs {
  display: flex;
  white-space: nowrap;
  background: #fff;
  padding: 0 8rpx 16rpx;
  flex-shrink: 0;
  
  .tab-item {
    display: inline-flex;
    align-items: center;
    padding: 16rpx 24rpx;
    font-size: 26rpx;
    color: var(--text-secondary);
    position: relative;
    
    &.active {
      color: var(--primary-color);
      font-weight: 600;
    }
    
    .tab-badge {
      min-width: 28rpx;
      height: 28rpx;
      line-height: 28rpx;
      text-align: center;
      font-size: 18rpx;
      color: #fff;
      background: var(--primary-color);
      border-radius: 14rpx;
      margin-left: 6rpx;
      padding: 0 6rpx;
    }
  }
}

.list-wrapper {
  flex: 1;
  padding: 16rpx 24rpx;
}

.msg-list {
  .msg-item {
    display: flex;
    align-items: flex-start;
    background: #fff;
    border-radius: 12rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
    position: relative;
    
    &.unread {
      background: rgba(196, 30, 58, 0.02);
    }
    
    .msg-icon {
      width: 72rpx;
      height: 72rpx;
      border-radius: 16rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32rpx;
      flex-shrink: 0;
      margin-right: 20rpx;
      
      &.icon-1 { background: rgba(64, 158, 255, 0.08); }
      &.icon-2 { background: rgba(230, 162, 60, 0.08); }
      &.icon-3 { background: rgba(103, 194, 58, 0.08); }
      &.icon-4 { background: rgba(196, 30, 58, 0.08); }
      &.icon-5 { background: rgba(144, 147, 153, 0.08); }
      &.icon-99 { background: rgba(255, 152, 0, 0.08); }
    }
    
    .msg-content {
      flex: 1;
      min-width: 0;
      
      .msg-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8rpx;
        
        .msg-title {
          font-size: 28rpx;
          font-weight: 500;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 400rpx;
        }
        
        .msg-time {
          font-size: 22rpx;
          color: var(--text-placeholder);
          flex-shrink: 0;
          margin-left: 16rpx;
        }
      }
      
      .msg-summary {
        display: block;
        font-size: 24rpx;
        color: var(--text-secondary);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.5;
        margin-bottom: 8rpx;
      }
      
      .source-tag {
        display: inline-block;
        font-size: 20rpx;
        color: var(--text-placeholder);
        background: var(--bg-color);
        padding: 2rpx 12rpx;
        border-radius: 4rpx;
      }
    }
    
    .unread-dot {
      position: absolute;
      top: 28rpx;
      right: 28rpx;
      width: 16rpx;
      height: 16rpx;
      background: var(--primary-color);
      border-radius: 50%;
    }
  }
}

.load-more {
  text-align: center;
  padding: 24rpx 0;
  font-size: 24rpx;
  color: var(--text-placeholder);
  
  .no-more { color: #CCC; }
}
</style>
