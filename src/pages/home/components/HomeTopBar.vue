<template>
  <view class="topbar">
    <view class="brand-block">
      <view class="brand-mark">
        <image class="brand-logo" src="/static/images/logo-v.png" mode="aspectFit" />
      </view>
      <view class="brand-title-row">
        <text class="brand-title">薰风商城</text>
        <view class="brand-dot"></view>
      </view>
    </view>

    <view class="header-actions">
      <view
        class="header-action glass-btn"
        hover-class="glass-btn--pressed"
        hover-stay-time="80"
        aria-label="消息中心"
        @click="$emit('messages')"
      >
        <AppIcon name="bell" :size="21  " :stroke-width="1.8" />
        <view v-if="hasUnread" class="unread-dot" />
      </view>
      <view
        class="header-action glass-btn"
        hover-class="glass-btn--pressed"
        hover-stay-time="80"
        aria-label="经销商中心"
        @click="$emit('account')"
      >
        <AppIcon name="user" :size="22" :stroke-width="1.8" />
      </view>
    </view>
  </view>
</template>

<script setup>
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'

defineProps({
  hasUnread: { type: Boolean, default: false },
})

defineEmits(['messages', 'account'])
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
.header-actions {
  display: flex;
  align-items: center;
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

  .glass-btn {
    width: 46px;
    height: 46px;
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
