<template>
  <view class="home-page" :class="{ 'is-large-screen': isLargeScreen }">
    <AppStatusBarSpacer />

    <view class="home-layout">
      <view v-if="isLargeScreen" class="sidebar-container">
        <ResponsiveNav
          :active-tab="activeTab"
          :cart-count="cartCount"
          mode="sidebar"
          @change="selectTab"
        />
      </view>

      <view class="home-main">
        <HomeTopBar
          :has-unread="hasUnread"
          @messages="goToMessages"
          @account="goToAccount"
        />

        <scroll-view class="home-scroll" scroll-y :show-scrollbar="false" :enable-back-to-top="true">
          <view class="tab-stage">
            <TabHome
              v-show="activeTab === 'home'"
              :active="activeTab === 'home'"
              @select-tab="selectTab"
            />
            <TabCategory v-show="activeTab === 'category'" :active="activeTab === 'category'" />
            <TabNews v-show="activeTab === 'news'" :active="activeTab === 'news'" />
            <TabCart v-show="activeTab === 'cart'" :active="activeTab === 'cart'" />
          </view>
        </scroll-view>
      </view>
    </view>

    <ResponsiveNav
      v-if="!isLargeScreen"
      :active-tab="activeTab"
      :cart-count="cartCount"
      mode="bottom"
      @change="selectTab"
    />
  </view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useMessageStore } from '@/subPackages/content/model/messageStore.js'
import { useCart } from '@/subPackages/commerce/composables/useCart.js'
import AppStatusBarSpacer from '@/shared/ui/AppStatusBarSpacer/AppStatusBarSpacer.vue'
import HomeTopBar from './components/HomeTopBar.vue'
import ResponsiveNav from './components/ResponsiveNav.vue'
import TabHome from './tabs/TabHome.vue'
import TabCategory from './tabs/TabCategory.vue'
import TabNews from './tabs/TabNews.vue'
import TabCart from './tabs/TabCart.vue'

const messageStore = useMessageStore()
const { cartStore, loadCart } = useCart({ autoSchedule: false })

const activeTab = ref('home')
const isLargeScreen = ref(false)
const hasUnread = computed(() => messageStore.hasUnread)
const cartCount = computed(() => cartStore.cartBadgeCount)

let resizeListener = null

function checkScreenSize() {
  // #ifdef H5
  isLargeScreen.value = window.innerWidth >= 800
  // #endif

  // #ifdef MP-WEIXIN || APP-PLUS
  try {
    isLargeScreen.value = uni.getSystemInfoSync().windowWidth >= 800
  } catch (_) {
    isLargeScreen.value = false
  }
  // #endif
}

async function selectTab(tabKey) {
  if (tabKey === 'settings') {
    await navigator.navigateTo(routes.account.security())
    return
  }
  if (tabKey === 'account') {
    await navigator.navigateTo(routes.account.center())
    return
  }
  activeTab.value = tabKey
}

async function goToMessages() {
  await navigator.navigateTo(routes.content.messages())
}

async function goToAccount() {
  await navigator.navigateTo(routes.account.center())
}

onMounted(() => {
  checkScreenSize()
  // #ifdef H5
  resizeListener = checkScreenSize
  window.addEventListener('resize', resizeListener)
  // #endif
})

onShow(() => {
  loadCart({ silent: true }).catch(() => {})
})

onUnmounted(() => {
  // #ifdef H5
  if (resizeListener) window.removeEventListener('resize', resizeListener)
  // #endif
})
</script>

<style lang="scss" scoped>
.home-page {
  --home-bg: #f4f5f6;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  color: var(--color-text-primary, #1b1c20);
  background: var(--home-bg);
}

.home-layout,
.home-main {
  min-width: 0;
  min-height: 0;
}

.home-layout {
  display: flex;
  flex: 1;
}

.sidebar-container {
  flex-shrink: 0;
  background: transparent;
}

.home-main {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.home-scroll {
  flex: 1;
  height: 100%;
}

.tab-stage {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
}

@media screen and (min-width: 800px) {
  .home-layout {
    background: transparent;
  }

  .home-main {
    padding: 0;
    box-sizing: border-box;
  }

  .home-scroll {
    background: transparent;
  }
}
</style>
