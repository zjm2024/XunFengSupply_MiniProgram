<template>
  <AppPageShell>
    <template #header>
      <app-header title="消息中心" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <!-- Tab 切换 -->
          <view class="segment-tabs compact">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="tab-btn"
              :class="{ 'is-active': activeTab === tab.key }"
              @click="activeTab = tab.key"
            >{{ tab.label }}</button>
          </view>

          <!-- 消息列表 -->
          <view class="message-list">
            <view
              v-for="msg in filteredMessages"
              :key="msg.id"
              class="message-item"
              :class="{ 'is-unread': !msg.read }"
              @click="readMessage(msg)"
            >
              <view class="msg-dot" :class="{ 'has-unread': !msg.read }"></view>
              <view class="msg-body">
                <text class="msg-title">{{ msg.title }}</text>
                <text class="msg-desc">{{ msg.content }}</text>
              </view>
              <text class="msg-time">{{ msg.time }}</text>
            </view>

            <empty-state
              v-if="filteredMessages.length === 0"
              title="暂无消息"
              icon-type="default"
            />
          </view>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import appHeader from '@/components/AppHeader/AppHeader.vue'
import emptyState from '@/components/EmptyState/EmptyState.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppContent from '@/components/AppContent/AppContent.vue'

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'order', label: '订单' },
  { key: 'bill', label: '账单' },
  { key: 'system', label: '系统' }
]

const activeTab = ref('all')

const messages = ref([
  {
    id: '1',
    type: 'order',
    title: '订单审核通过',
    content: '您的订单 PO20250810001 已审核通过。',
    time: '10:30',
    read: false
  },
  {
    id: '2',
    type: 'order',
    title: '待确认发货',
    content: '订单 PO20250809015 待确认发货，请及时处理。',
    time: '09:15',
    read: false
  },
  {
    id: '3',
    type: 'bill',
    title: '8 月对账单已生成',
    content: '请登录查看账单明细及还款日期。',
    time: '08/10',
    read: true
  }
])

const filteredMessages = computed(() => {
  if (activeTab.value === 'all') return messages.value
  return messages.value.filter(m => m.type === activeTab.value)
})

function readMessage(msg) {
  // 标记已读
  msg.read = true
  uni.showToast({ title: msg.title, icon: 'none' })
}
</script>

<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

.segment-tabs {
  display: flex;
  gap: 10px;
  border-bottom: 1px solid #EFEFF1;
  margin-bottom: 16px;

  &.compact {
    justify-content: space-around;
  }
}

.tab-btn {
  min-height: 42px;
  padding: 0 16px;
  white-space: nowrap;
  border: none;
  background: transparent;
  color: #5E626B;
  font-size: 14px;

  &.is-active {
    color: #D7192D;
    border-bottom: 2px solid #D7192D;
    font-weight: 650;
  }
}

/* 消息列表 */
.message-list {
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 12px;
  overflow: hidden;
}

.message-item {
  display: grid;
  grid-template-columns: 8px 1fr auto;
  gap: 10px;
  padding: 14px;
  border-bottom: 1px solid #F5F5F6;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: #FCFCFD;
  }
}

.msg-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #EFEFF1;
  margin-top: 10px;

  &.has-unread {
    background: #D7192D;
  }
}

.msg-body {
  min-width: 0;
}

.msg-title {
  font-size: 15px;
  font-weight: 600;
  color: #111216;
  display: block;
}

.msg-desc {
  margin-top: 4px;
  color: #5E626B;
  font-size: 13px;
  line-height: 1.5;
  display: block;
}

.msg-time {
  color: #989BA3;
  font-size: 12px;
}

.bottom-spacer {
  height: 24px;
}
</style>
