<template>
  <AppPageShell>
    <template #header>
      <app-header title="语言设置" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <!-- 当前语言 -->
          <view class="current-card">
            <text class="current-label">当前显示语言</text>
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
            <text class="tips-title">温馨提示</text>
            <view class="tips-list">
              <view class="tip-item">
                <text class="tip-dot">•</text>
                <text class="tip-text">切换语言后，界面文字将立即更新为所选语言</text>
              </view>
              <view class="tip-item">
                <text class="tip-dot">•</text>
                <text class="tip-text">部分内容（如商品名称、订单详情）可能仍以原始语言显示</text>
              </view>
              <view class="tip-item">
                <text class="tip-dot">•</text>
                <text class="tip-text">如需完整的多语言支持，请联系管理员配置翻译资源</text>
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
import { ref, computed } from 'vue'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'

const currentLang = ref('zh-CN')

// 支持的语言列表
const languages = ref([
  { code: 'zh-CN', name: '简体中文', native: '简体中文' },
  { code: 'zh-TW', name: '繁體中文', native: '繁體中文' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ja', name: '日本語', native: '日本語' },
  { code: 'ko', name: '한국어', native: '한국어' }
])

// 尝试读取已保存的语言设置
try {
  const savedLang = uni.getStorageSync('app_language')
  if (savedLang) {
    currentLang.value = savedLang
  }
} catch (e) {}

const currentLanguage = computed(() => {
  return languages.value.find(l => l.code === currentLang.value) || languages.value[0]
})

function selectLanguage(lang) {
  currentLang.value = lang.code
  uni.setStorageSync('app_language', lang.code)

  // 触发语言变更事件
  uni.$emit('languageChanged', lang)

  uni.showToast({
    title: `已切换至${lang.name}`,
    icon: 'success',
    duration: 1500
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
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
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
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  padding: 16px;
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
