<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('account.titles.notifications')" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="notification-page">
          <view class="notification-hero">
            <view class="hero-icon">
              <AppIcon name="bell" :size="28" :stroke-width="1.8" />
            </view>
            <view class="hero-copy">
              <text class="hero-title">{{ t('account.notifications.title') }}</text>
              <text class="hero-desc">{{ t('account.notifications.intro') }}</text>
            </view>
          </view>

          <AppListGroup :title="t('account.notifications.receive')" :description="t('account.notifications.master')">
            <AppListItem
              :label="t('account.notifications.enabled')"
              :description="t('account.notifications.enabledHint')"
              icon="bell"
              :clickable="false"
              :show-arrow="false"
            >
              <template #action>
                <switch :checked="settings.enabled" color="#D7192D" @change="toggle('enabled', $event)" />
              </template>
            </AppListItem>
          </AppListGroup>

          <AppListGroup :title="t('account.notifications.business')" :description="t('account.notifications.businessHint')">
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

          <AppListGroup :title="t('account.notifications.platform')" :description="t('account.notifications.platformHint')">
            <AppListItem
              :label="t('account.notifications.announcement')"
              :description="t('account.notifications.announcementHint')"
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
              :label="t('account.notifications.sound')"
              :description="t('account.notifications.soundHint')"
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
              :label="t('account.notifications.vibration')"
              :description="t('account.notifications.vibrationHint')"
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
            <text>{{ t('account.notifications.note') }}</text>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import { onShow } from '@dcloudio/uni-app'
import { computed, reactive } from 'vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppListGroup from '@/shared/ui/AppListGroup/AppListGroup.vue'
import AppListItem from '@/shared/ui/AppListItem/AppListItem.vue'
import { getNotificationSettings, saveNotificationSettings } from '@/shared/model/notificationSettings.js'

const settings = reactive(getNotificationSettings())

const businessItems = computed(() => [
  { key: 'order', label: t('account.notifications.order'), description: t('account.notifications.orderHint'), icon: 'order' },
  { key: 'audit', label: t('account.notifications.audit'), description: t('account.notifications.auditHint'), icon: 'check' },
  { key: 'bill', label: t('account.notifications.bill'), description: t('account.notifications.billHint'), icon: 'invoice' },
  { key: 'afterSale', label: t('account.notifications.afterSale'), description: t('account.notifications.afterSaleHint'), icon: 'refresh' },
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
