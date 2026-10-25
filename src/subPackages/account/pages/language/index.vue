<template>
  <AppPageShell>
    <template #header>
      <app-header :title="t('account.language.title')" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <!-- 当前语言 -->
          <view class="current-card">
            <text class="current-label">{{ t('account.language.current') }}</text>
            <view class="current-value">
              <text class="current-text">{{ currentLanguage.name }}</text>
              <text class="current-native">{{ currentLanguage.native }}</text>
            </view>
          </view>

          <!-- 语言列表 -->
          <view class="lang-list">
            <view
              v-for="lang in languages"
              :key="lang.code"
              class="lang-item"
              :class="{ 'is-active': currentLang === lang.code }"
              @click="selectLanguage(lang)"
            >
              <view class="lang-main">
                <text class="lang-name">{{ lang.name }}</text>
                <text class="lang-native">{{ lang.native }}</text>
              </view>
              <view v-if="currentLang === lang.code" class="check-icon">
                <text>✓</text>
              </view>
            </view>
          </view>

          <!-- 提示信息 -->
          <view class="tips-card">
            <text class="tips-title">{{ t('account.language.tips') }}</text>
            <text v-if="saving" class="tip-text">{{ t('account.language.saving') }}</text>
            <text v-else-if="syncFailed" class="tip-text">{{ t('account.language.syncFailed') }}</text>
            <view class="tips-list">
              <view class="tip-item">
                <text class="tip-dot">•</text>
                <text class="tip-text">{{ t('account.language.immediate') }}</text>
              </view>
              <view class="tip-item">
                <text class="tip-dot">•</text>
                <text class="tip-text">{{ t('account.language.original') }}</text>
              </view>
              <view class="tip-item">
                <text class="tip-dot">•</text>
                <text class="tip-text">{{ t('account.language.status') }}</text>
              </view>
            </view>
          </view>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed } from 'vue'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { locale, t } from '@/shared/i18n/index.js'
import { useLanguageSettings } from '../../composables/useLanguageSettings.js'
import '../../i18n/register.js'

const currentLang = locale
const { saving, syncFailed, selectLanguage: changeLanguage } = useLanguageSettings()
const languages = computed(() => [
  { code: 'zh-CN', name: t('account.language.zh'), native: 'ZH' },
  { code: 'en-US', name: t('account.language.en'), native: 'EN' },
])
const currentLanguage = computed(() => languages.value.find(item => item.code === currentLang.value))

/** 只切换显示语言，不重建页面、不清表单、不重发业务写请求。 */
async function selectLanguage(lang) {
  const result = await changeLanguage(lang.code)
  if (!result) return
  uni.showToast({
    title: result === 'local-only' ? t('account.language.syncFailed')
      : t('account.language.changed', { language: currentLanguage.value.name }),
    icon: result === 'local-only' ? 'none' : 'success',
    duration: result === 'local-only' ? 3000 : 1500,
  })
}
</script>

<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 当前语言卡片 */
.current-card {
  background: linear-gradient(135deg, #D7192D, #E8384F);
  border-radius: 12px;
  padding: 20px 16px;
  margin-bottom: 12px;
  color: white;
}

.current-label {
  font-size: 13px; /* 稳定 px */
  opacity: 0.9;
  display: block;
  margin-bottom: 6px;
}

.current-value {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.current-text {
  font-size: 20px; /* 稳定 px */
  font-weight: 700;
}

.current-native {
  font-size: 14px;
  opacity: 0.85;
}

/* 语言列表 */
.lang-list {
  background: var(--glass-card-background, rgba(255,255,255,.74));
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

.lang-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #F5F5F6;

  &:last-child {
    border-bottom: none;
  }

  &.is-active {
    background: #FEF3F4;

    .lang-name {
      color: #D7192D;
      font-weight: 600;
    }
  }

  &:active {
    background: rgba(0, 0, 0, 0.02);
  }
}

.lang-main {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.lang-name {
  font-size: 15px;
  color: #111216;
}

.lang-native {
  font-size: 13px;
  color: #989BA5;
}

.check-icon {
  width: 24px; /* 稳定 px */
  height: 24px;
  background: #D7192D;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: white;
    font-size: 14px;
    font-weight: 700;
  }
}

/* 提示卡片 */
.tips-card {
  background: var(--glass-card-background, rgba(255,255,255,.74));
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

.tips-title {
  font-size: 14px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  display: block;
  margin-bottom: 10px;
}

.tips-list {
  display: grid;
  gap: 8px;
}

.tip-item {
  display: flex;
  gap: 6px;
  align-items: flex-start;
}

.tip-dot {
  color: #989BA5;
  font-size: 14px;
  line-height: 1.6;
}

.tip-text {
  font-size: 13px;
  color: #5E626B;
  line-height: 1.6;
  flex: 1;
}

.bottom-spacer {
  height: 24px;
}
</style>
