<template>
  <AppPageShell class="home-shell">
    <template #header>
      <view class="home-header-wrap">
        <AppStatusBarSpacer />
        <view class="home-header">
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
              @click="goToMessages"
            >
              <AppIcon name="message" :size="22" :stroke-width="1.8" />
              <view v-if="hasUnread" class="unread-dot" />
            </view>
            <view
              class="header-action glass-btn"
              hover-class="glass-btn--pressed"
              hover-stay-time="80"
              aria-label="经销商中心"
              @click="goToAccount"
            >
              <AppIcon name="user" :size="22" :stroke-width="1.8" />
            </view>
          </view>
        </view>
      </view>
    </template>

    <template #content>
      <AppContent padding="0" :no-max-width="true">
        <view class="home-canvas">
          <view class="home-inner">

            <view class="entry-grid">
              <view
                class="entry-card order-card"
                hover-class="entry-card--pressed"
                hover-stay-time="80"
                @click="goToProducts"
              >
                <view class="entry-card-glow"></view>
                <view class="entry-heading">
                  <text class="entry-heading-title">商品下单</text>
                  <view class="entry-heading-icon">
                    <AppIcon name="package" :size="22" />
                  </view>
                </view>

                <view class="entry-divider"></view>

                <view class="entry-body">
                  <view class="entry-visual order-visual">
                    <view class="visual-ring visual-ring-large"></view>
                    <view class="visual-ring visual-ring-small"></view>
                    <view class="visual-icon order-icon">
                      <AppIcon name="package" :size="52" />
                    </view>
                  </view>

                  <view class="entry-content">
                    <text class="entry-description">浏览商品目录，完成单品或批量采购。</text>
                    <view class="entry-button entry-button-primary">
                      <text>立即下单</text>
                      <AppIcon name="arrow-right" :size="17" />
                    </view>
                  </view>
                </view>
              </view>

              <view
                class="entry-card news-card"
                hover-class="entry-card--pressed"
                hover-stay-time="80"
                @click="goToNews"
              >
                <view class="entry-card-glow"></view>
                <view class="entry-heading">
                  <text class="entry-heading-title">新闻资讯</text>
                  <view class="entry-heading-icon entry-heading-icon--muted">
                    <AppIcon name="news" :size="22" />
                  </view>
                </view>

                <view class="entry-divider"></view>

                <view class="entry-body">
                  <view class="entry-visual news-visual">
                    <view class="visual-ring visual-ring-large"></view>
                    <view class="visual-icon news-icon">
                      <AppIcon name="news" :size="52" />
                    </view>
                  </view>

                  <view class="entry-content">
                    <text class="entry-description">查看品牌公告、政策通知和行业动态。</text>
                    <view class="entry-button entry-button-secondary">
                      <text>查看资讯</text>
                      <AppIcon name="arrow-right" :size="17" />
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed } from 'vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { useMessageStore } from '@/subPackages/content/model/messageStore.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppStatusBarSpacer from '@/shared/ui/AppStatusBarSpacer/AppStatusBarSpacer.vue'

const userStore = useUserStore()
const messageStore = useMessageStore()
const userDisplayName = computed(() => userStore.displayName || userStore.realName || '经销商')
const userInitial = computed(() => userDisplayName.value.trim().slice(0, 1) || '经')
const hasUnread = computed(() => messageStore.hasUnread)

async function goToProducts() {
  await navigator.navigateTo(routes.commerce.productList())
}

async function goToNews() {
  await navigator.navigateTo(routes.content.news())
}

async function goToMessages() {
  await navigator.navigateTo(routes.content.messages())
}

async function goToAccount() {
  await navigator.navigateTo(routes.account.center())
}
</script>

<style lang="scss" scoped>
.home-shell {
  --home-page-background: linear-gradient(155deg, #fffdfd 0%, #fff5f6 42%, #f5f6f8 100%);
  --surface-page: transparent;
  background: var(--home-page-background);
}

.home-shell :deep(.shell-header),
.home-shell :deep(.shell-content-wrapper),
.home-shell :deep(.app-content),
.home-shell :deep(.content-inner),
.home-shell :deep(.content-scroll),
.home-shell :deep(.content-body),
.home-shell :deep(.shell-safe-area-bottom) {
  background: transparent;
}

.home-header-wrap {
  background: transparent;
}

.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  max-width: 1088px;
  min-height: 62px;
  margin: 0 auto;
  padding: 8px 16px;
  box-sizing: border-box;
}

.brand-block,
.brand-title-row,
.header-actions,
.user-action,
.entry-heading,
.entry-button {
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
  color: var(--color-text-primary);
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
  background: var(--color-brand);
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
  background: rgba(255, 255, 255, 0.55);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  backdrop-filter: blur(16px) saturate(1.2);
  box-shadow: 0 4px 16px rgba(30, 32, 38, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7);
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.glass-btn .app-icon {
  color: var(--color-text-primary);
}

.glass-btn--pressed {
  transform: scale(0.94);
  box-shadow: 0 2px 10px rgba(30, 32, 38, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.unread-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-brand);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
}

.home-canvas {
  min-height: 100%;
  padding: 22px 16px calc(28px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: transparent;
}

.home-inner {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
}

.welcome-title {
  display: block;
  margin: 2px 2px 20px;
  color: var(--color-text-primary);
  font-size: 25px;
  font-weight: 750;
  line-height: 1.3;
}

.entry-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.entry-card {
  position: relative;
  overflow: hidden;
  padding: 19px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.94);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 16px 38px rgba(30, 32, 38, 0.075), inset 0 1px 0 rgba(255, 255, 255, 0.95);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
}

.order-card {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(255, 239, 242, 0.85));
}

.news-card {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(249, 250, 252, 0.87));
}

.entry-card--pressed {
  opacity: 0.92;
  transform: scale(0.985);
  box-shadow: 0 10px 26px rgba(30, 32, 38, 0.08);
}

.entry-card-glow {
  position: absolute;
  top: -76px;
  right: -64px;
  width: 174px;
  height: 174px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 92, 103, 0.17), rgba(255, 255, 255, 0) 70%);
  pointer-events: none;
}

.entry-heading {
  position: relative;
  z-index: 1;
  justify-content: space-between;
}

.entry-heading-title {
  color: var(--color-text-primary);
  font-size: 20px;
  font-weight: 750;
}

.entry-heading-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(215, 25, 45, 0.11);
  border-radius: 13px;
  color: var(--color-brand);
  background: rgba(255, 255, 255, 0.74);
}

.entry-heading-icon--muted {
  color: var(--color-text-secondary);
  border-color: rgba(98, 102, 111, 0.11);
}

.entry-divider {
  position: relative;
  z-index: 1;
  height: 1px;
  margin: 14px 0 17px;
  background: linear-gradient(90deg, rgba(215, 25, 45, 0.15), rgba(236, 238, 242, 0.78), rgba(236, 238, 242, 0));
}

.news-card .entry-divider {
  background: linear-gradient(90deg, rgba(98, 102, 111, 0.14), rgba(236, 238, 242, 0.78), rgba(236, 238, 242, 0));
}

.entry-body {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 102px minmax(0, 1fr);
  align-items: center;
  gap: 17px;
}

.entry-visual {
  position: relative;
  display: grid;
  place-items: center;
  width: 102px;
  height: 112px;
  overflow: hidden;
  border-radius: 20px;
}

.order-visual {
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.92), rgba(255, 213, 218, 0.76));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8), 0 10px 24px rgba(215, 25, 45, 0.08);
}

.news-visual {
  background: linear-gradient(145deg, #f8f9fb, #edf0f4);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.82);
}

.visual-ring {
  position: absolute;
  border: 1px solid rgba(215, 25, 45, 0.11);
  border-radius: 50%;
}

.visual-ring-large {
  top: -33px;
  right: -35px;
  width: 100px;
  height: 100px;
}

.visual-ring-small {
  bottom: -20px;
  left: -14px;
  width: 54px;
  height: 54px;
}

.visual-icon {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 23px;
}

.order-icon {
  color: #fff;
  background: linear-gradient(145deg, #f04a59, var(--color-brand) 60%, #b91224);
  box-shadow: 0 14px 26px rgba(215, 25, 45, 0.24);
}

.news-icon {
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 10px 20px rgba(27, 28, 32, 0.08);
}

.entry-content {
  min-width: 0;
}

.entry-description {
  display: block;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.entry-button {
  justify-content: center;
  gap: 7px;
  width: 100%;
  min-height: 44px;
  margin-top: 15px;
  box-sizing: border-box;
  border-radius: 13px;
  font-size: 14px;
  font-weight: 650;
}

.entry-button-primary {
  color: #fff;
  background: linear-gradient(100deg, #f2515f 0%, var(--color-brand) 62%, #c91428 100%);
  box-shadow: 0 11px 22px rgba(215, 25, 45, 0.2);
}

.entry-button-secondary {
  color: var(--color-brand);
  border: 1px solid rgba(215, 25, 45, 0.4);
  background: rgba(255, 255, 255, 0.68);
}

@media screen and (max-width: 359px) {
  .home-header,
  .home-canvas {
    padding-right: 12px;
    padding-left: 12px;
  }

  .welcome-title {
    font-size: 23px;
  }

  .entry-card {
    padding: 16px;
  }

  .entry-body {
    grid-template-columns: 84px minmax(0, 1fr);
    gap: 12px;
  }

  .entry-visual {
    width: 84px;
    height: 100px;
  }

  .visual-icon {
    width: 62px;
    height: 62px;
  }

  .entry-description {
    font-size: 12px;
  }
}

@media screen and (min-width: 560px) {
  .user-action {
    padding-right: 13px;
  }

  .user-name {
    display: block;
  }
}

@media screen and (min-width: 768px) {
  .home-header {
    min-height: 68px;
    padding-right: 24px;
    padding-left: 24px;
  }

  .home-canvas {
    padding: 34px 24px 36px;
  }

  .welcome-title {
    margin-bottom: 26px;
    font-size: 28px;
  }

  .entry-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px;
  }

  .entry-card {
    min-height: 326px;
    padding: 25px;
    border-radius: 26px;
  }

  .entry-heading-title {
    font-size: 23px;
  }

  .entry-divider {
    margin-top: 18px;
    margin-bottom: 23px;
  }

  .entry-body {
    grid-template-columns: 122px minmax(0, 1fr);
    gap: 21px;
  }

  .entry-visual {
    width: 122px;
    height: 144px;
  }

  .visual-icon {
    width: 82px;
    height: 82px;
  }

  .entry-description {
    min-height: 42px;
    font-size: 14px;
  }

  .entry-button {
    min-height: 48px;
    margin-top: 20px;
  }
}

@media screen and (min-width: 1024px) {
  .home-canvas {
    padding-top: 42px;
  }
}
</style>
