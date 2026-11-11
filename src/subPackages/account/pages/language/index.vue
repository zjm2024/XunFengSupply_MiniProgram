<template>
  <AppPageShell>
    <template #header>
      <app-header :title="t('account.language.title')" :show-back="true" />
    </template>

    <template #content>
      <AppContent width-mode="standard" padding="18px var(--page-padding-x, 16px) 28px">
        <view class="language-page">
          <text class="section-label">{{ t('account.language.current') }}</text>
          <view class="lang-list" role="radiogroup" :aria-label="t('account.language.title')">
            <button v-for="lang in languages" :key="lang.code"
              class="lang-item" :class="{ 'is-active': currentLang === lang.code }"
              role="radio" :aria-checked="currentLang === lang.code" :disabled="saving"
              @tap="selectLanguage(lang)">
              <view class="lang-main"><text class="lang-name">{{ lang.name }}</text><text class="lang-native">{{ lang.native }}</text></view>
              <view class="check-icon" :class="{ selected: currentLang === lang.code }">
                <AppIcon v-if="currentLang === lang.code" name="check" :size="14" color="#FFFFFF" />
              </view>
            </button>
          </view>
          <view class="language-notes" aria-live="polite">
            <text v-if="saving" class="sync-message">{{ t('account.language.saving') }}</text>
            <text v-else-if="syncFailed" class="sync-message is-error">{{ t('account.language.syncFailed') }}</text>
            <text>{{ t('account.language.immediate') }}</text>
            <text>{{ t('account.language.original') }}</text>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { locale, t } from '@/shared/i18n/index.js'
import { useLanguageSettings } from '../../composables/useLanguageSettings.js'
import '../../i18n/register.js'

const currentLang = locale
const { saving, syncFailed, selectLanguage: changeLanguage } = useLanguageSettings()
const languages = computed(() => [
  { code: 'zh-CN', name: t('account.language.zh'), native: '简体中文' },
  { code: 'en-US', name: t('account.language.en'), native: 'English' },
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

<style scoped lang="scss">
.language-page { max-width: 640px; margin: 0 auto; }
.section-label { display: block; margin: 0 4px 10px; color: #858A94; font-size: 13px; line-height: 20px; }
.lang-list { overflow: hidden; border-radius: 14px; background: var(--surface-card, #FFF); }
.lang-item { display: flex; width: 100%; min-height: 78px; align-items: center; justify-content: space-between; gap: 16px; margin: 0; padding: 16px 18px; border: 0; border-radius: 0; background: transparent; text-align: left; line-height: normal; }
.lang-item::after { border: 0; }
.lang-item + .lang-item { border-top: 1px solid #F0F1F3; }
.lang-item.is-active { background: #FFF8F9; }
.lang-item[disabled] { opacity: .7; }
.lang-main { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
.lang-name { color: #25282E; font-size: 15px; line-height: 21px; }
.is-active .lang-name { color: var(--color-brand, #D7192D); font-weight: 600; }
.lang-native { color: #9398A1; font-size: 12px; line-height: 18px; }
.check-icon { display: flex; width: 22px; height: 22px; flex: none; align-items: center; justify-content: center; border: 1px solid #DBDEE3; border-radius: 50%; box-sizing: border-box; }
.check-icon.selected { border-color: var(--color-brand, #D7192D); background: var(--color-brand, #D7192D); }
.language-notes { display: flex; flex-direction: column; gap: 7px; padding: 16px 4px 0; color: #9398A1; font-size: 12px; line-height: 20px; }
.sync-message { color: #646973; }
.sync-message.is-error { color: #BE1830; }
</style>
