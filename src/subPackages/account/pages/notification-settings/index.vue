<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="消息通知" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="notification-page">
          <view class="notification-hero">
            <view class="hero-icon">
              <AppIcon name="bell" :size="28" :stroke-width="1.8" />
            </view>
            <view class="hero-copy">
              <text class="hero-title">消息通知设置</text>
              <text class="hero-desc">按你的需要接收订单、审核、账单和平台公告提醒</text>
            </view>
          </view>

          <AppListGroup title="消息接收" description="总开关">
            <AppListItem
              label="接收消息通知"
              description="关闭后不影响消息中心查看历史消息"
              icon="bell"
              :clickable="false"
              :show-arrow="false"
            >
              <template #action>
                <switch :checked="settings.enabled" color="#D7192D" @change="toggle('enabled', $event)" />
              </template>
            </AppListItem>
          </AppListGroup>

          <AppListGroup title="业务消息" description="订单进度变化时提醒">
            <AppListItem
              v-for="item in businessItems"
              :key="item.key"
              :label="item.label"
              :description="item.description"
              :icon="item.icon"
              :clickable="false"
              :show-arrow="false"
              :disabled="!settings.enabled"
            >
              <template #action>
                <switch
                  :checked="settings[item.key]"
                  :disabled="!settings.enabled"
                  color="#D7192D"
                  @change="toggle(item.key, $event)"
                />
              </template>
            </AppListItem>
          </AppListGroup>

          <AppListGroup title="平台提醒" description="服务与公告">
            <AppListItem
              label="系统公告"
              description="平台规则、服务变更和重要公告"
              icon="announcement"
              :clickable="false"
              :show-arrow="false"
              :disabled="!settings.enabled"
            >
              <template #action>
                <switch :checked="settings.announcement" :disabled="!settings.enabled" color="#D7192D" @change="toggle('announcement', $event)" />
              </template>
            </AppListItem>
            <AppListItem
              label="声音提醒"
              description="收到新消息时播放提示音"
              icon="bell"
              :clickable="false"
              :show-arrow="false"
              :disabled="!settings.enabled"
            >
              <template #action>
                <switch :checked="settings.sound" :disabled="!settings.enabled" color="#D7192D" @change="toggle('sound', $event)" />
              </template>
            </AppListItem>
            <AppListItem
              label="震动提醒"
              description="收到新消息时触发设备震动"
              icon="settings"
              :clickable="false"
              :show-arrow="false"
              :disabled="!settings.enabled"
            >
              <template #action>
                <switch :checked="settings.vibration" :disabled="!settings.enabled" color="#D7192D" @change="toggle('vibration', $event)" />
              </template>
            </AppListItem>
          </AppListGroup>

          <view class="notification-note">
            <AppIcon name="info" :size="16" :stroke-width="1.8" />
            <text>通知偏好会保存在当前设备。后续接入服务端推送后，将同步用于控制推送范围。</text>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import { reactive } from 'vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppListGroup from '@/shared/ui/AppListGroup/AppListGroup.vue'
import AppListItem from '@/shared/ui/AppListItem/AppListItem.vue'
import { getNotificationSettings, saveNotificationSettings } from '@/shared/model/notificationSettings.js'

const settings = reactive(getNotificationSettings())

const businessItems = Object.freeze([
  { key: 'order', label: '订单消息', description: '下单、付款、发货和订单状态变化', icon: 'order' },
  { key: 'audit', label: '审核消息', description: '签约、资质和售后审核进度', icon: 'check' },
  { key: 'bill', label: '账单与授信', description: '充值、对账、授信和还款提醒', icon: 'invoice' },
  { key: 'afterSale', label: '售后消息', description: '售后申请、退款和处理结果', icon: 'refresh' },
])

onShow(() => Object.assign(settings, getNotificationSettings()))

function toggle(key, event) {
  const value = Boolean(event?.detail?.value)
  Object.assign(settings, saveNotificationSettings({ ...settings, [key]: value }))
}
</script>

<style lang="scss" scoped>
.notification-page {
  display: grid;
  gap: 18px;
  padding: 10px 0 calc(28px + env(safe-area-inset-bottom));
}

.notification-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(255,255,255,.82), rgba(255,244,246,.68));
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

.hero-icon {
  display: grid;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  place-items: center;
  border-radius: 15px;
  color: #D7192D;
  background: rgba(215,25,45,.1);
}

.hero-copy { min-width: 0; }
.hero-title { display: block; color: #1B1F24; font-size: 17px; font-weight: 750; }
.hero-desc { display: block; margin-top: 5px; color: #747B85; font-size: 12px; line-height: 18px; }

.notification-note {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 12px 14px;
  border-radius: 12px;
  color: #7A6470;
  background: rgba(255,248,249,.7);
  font-size: 11px;
  line-height: 17px;
}

.notification-note :deep(svg) { flex: 0 0 auto; margin-top: 1px; color: #D7192D; }
</style>
