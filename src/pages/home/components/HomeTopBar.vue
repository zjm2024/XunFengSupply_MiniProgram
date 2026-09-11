<template>
  <view class="topbar" :class="{ 'topbar--page': activeTab !== 'home' }">
    <view v-if="activeTab === 'home'" class="brand-block">
      <view class="brand-mark">
        <image class="brand-logo" src="/static/images/logo-v.png" mode="aspectFit" />
      </view>
      <view class="brand-title-row">
        <text class="brand-title">首页</text>
        <view class="brand-dot"></view>
      </view>
    </view>

    <view v-else class="page-title-block">
      <text class="page-title">{{ currentTitle }}</text>
    </view>

    <!-- 首页搜索框：位于 Logo 右侧 -->
    <view
      v-if="activeTab === 'home'"
      class="home-search-box"
      hover-class="home-search-box--pressed"
      aria-label="搜索商品"
      @click="$emit('search')"
    >
      <AppIcon class="home-search-icon" name="search" :size="16" :stroke-width="1.8" />
      <text class="home-search-placeholder">商品名称 / SKU / 69码</text>
    </view>

    <view
      v-else-if="activeTab === 'category'"
      class="category-search"
      hover-class="glass-btn--pressed"
      aria-label="搜索商品"
      @click="$emit('search')"
    >
      <AppIcon name="search" :size="20" :stroke-width="1.8" />
      <text class="category-search-text">商品名称 / SKU / 69码</text>
    </view>

    <view v-else-if="activeTab === 'account'" class="header-actions">
      <view
        class="header-action glass-btn"
        hover-class="glass-btn--pressed"
        hover-stay-time="80"
        aria-label="设置"
        @click="$emit('settings')"
      >
        <AppIcon name="settings" :size="21" :stroke-width="1.8" />
      </view>
      <view
        class="header-action glass-btn"
        hover-class="glass-btn--pressed"
        hover-stay-time="80"
        aria-label="消息中心"
        @click="$emit('messages')"
      >
        <AppIcon name="bell" :size="21" :stroke-width="1.8" />
        <view v-if="hasUnread" class="unread-dot" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'

const props = defineProps({
  activeTab: { type: String, default: 'home' },
  hasUnread: { type: Boolean, default: false },
})

defineEmits(['messages', 'settings', 'search'])

const tabTitles = Object.freeze({
  category: '分类',
  news: '资讯',
  cart: '购物车',
  account: '我的',
})

const currentTitle = computed(() => tabTitles[props.activeTab] || '')
</script>

<style lang="scss" scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 62px;
  padding: 8px 16px;
  box-sizing: border-box;
}

.brand-block,
.brand-title-row,
.page-title-block,
.header-actions {
  display: flex;
  align-items: center;
}

.category-search {
  display: flex;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  color: #2f3238;
  background: #e7e8eb;
  transition: transform 160ms ease, opacity 160ms ease;
}

.category-search-text {
  display: none;
}

/* ========== 首页搜索框 ========== */

.home-search-box {
  display: flex;
  min-width: 0;
  height: 36px;
  flex: 1;
  align-items: center;
  gap: 7px;
  margin-left: 12px;
  padding: 0 12px;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 18px;
  background: #e7e8eb;
}

.home-search-icon {
  flex-shrink: 0;
  color: #8c919b;
}

.home-search-placeholder {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: #a8adb5;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-search-box--pressed {
  opacity: 0.58;
}

.brand-block {
  min-width: 0;
  gap: 10px;
}

.brand-mark {
  display: grid;
  place-items: center;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(215, 25, 45, 0.1);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 18px rgba(215, 25, 45, 0.12);
}

.brand-logo {
  width: 28px;
  height: 28px;
}

.brand-title-row {
  display: none;
  min-width: 0;
  gap: 6px;
}

.brand-title {
  overflow: hidden;
  color: var(--color-text-primary, #1b1c20);
  font-size: 18px;
  font-weight: 750;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-dot {
  flex: none;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-brand, #d7192d);
}

.page-title-block {
  min-width: 0;
  flex: 1;
}

.page-title {
  color: var(--color-text-primary, #1b1c20);
  font-size: 21px;
  font-weight: 760;
  line-height: 1.2;
}

.header-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
}

.header-action {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.glass-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: transparent;
  transition: transform 160ms ease;
}

.glass-btn :deep(.app-icon) {
  color: var(--color-text-primary, #1b1c20);
}

.glass-btn--pressed {
  transform: scale(0.94);
  opacity: 0.7;
}

.unread-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-brand, #d7192d);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
}

@media screen and (min-width: 768px) {
  .brand-title-row {
    display: flex;
  }

  .home-search-box {
    max-width: 480px;
    height: 38px;
  }
}

@media screen and (min-width: 800px) {
  .topbar {
    min-height: 68px;
    padding-right: 24px;
    padding-left: 24px;
  }

  .brand-mark {
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
  }

  .brand-logo {
    width: 32px;
    height: 32px;
  }

  .brand-title {
    font-size: 20px;
  }

  .page-title {
    font-size: 24px;
  }

  .glass-btn {
    width: 46px;
    height: 46px;
  }


  .home-search-box {
    width: clamp(240px, 32vw, 360px);
    height: 44px;
    padding: 0 16px;
    justify-content: flex-start;
    gap: 9px;
    box-sizing: border-box;
    border-radius: 22px;
    color: #737780;
  }

  .home-search-box-text {
    display: block;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .category-search {
    width: clamp(240px, 32vw, 360px);
    height: 44px;
    padding: 0 16px;
    justify-content: flex-start;
    gap: 9px;
    box-sizing: border-box;
    border-radius: 22px;
    color: #737780;
  }

  .category-search-text {
    display: block;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media screen and (min-width: 1180px) {
  .home-search-box {
    max-width: 680px;
  }
}

@media screen and (max-width: 374px) {
  .topbar {
    padding-right: 12px;
    padding-left: 12px;
  }

  .brand-mark {
    flex: 0 0 34px;
    width: 34px;
    height: 34px;
  }

  .brand-logo {
    width: 24px;
    height: 24px;
  }

  .brand-title {
    font-size: 16px;
  }

  .glass-btn {
    width: 38px;
    height: 38px;
  }

  .header-actions {
    gap: 6px;
  }
}
</style>
