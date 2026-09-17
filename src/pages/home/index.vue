<template>
  <view
    class="home-page"
    :class="{
      'is-large-screen': isLargeScreen,
      'home-page--integrated': currentTabLayout.integratedBackground,
    }"
  >
    <view
      class="home-status-area"
      :class="{ 'home-status-area--integrated': currentTabLayout.integratedBackground }"
    >
      <AppStatusBarSpacer />
    </view>

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
          v-if="!currentTabLayout.topBarFollowsScroll"
          :active-tab="activeTab"
          :has-unread="hasUnread"
          :follow-scroll="false"
          @search="goToProductSearch"
          @messages="goToMessages"
          @settings="goToSettings"
        />

        <scroll-view
          class="home-scroll"
          :class="{ 'home-scroll--integrated': currentTabLayout.integratedBackground }"
          scroll-y
          :show-scrollbar="false"
          :enable-back-to-top="true"
        >
          <HomeTopBar
            v-if="currentTabLayout.topBarFollowsScroll"
            :active-tab="activeTab"
            :has-unread="hasUnread"
            :follow-scroll="true"
            @search="goToProductSearch"
            @messages="goToMessages"
            @settings="goToSettings"
          />
          <view class="tab-stage">
            <TabHome
              v-show="activeTab === 'home'"
              :active="activeTab === 'home'"
              @select-tab="selectTab"
            />
            <TabCategory v-show="activeTab === 'category'" :active="activeTab === 'category'" />
            <TabNews v-show="activeTab === 'news'" :active="activeTab === 'news'" />
            <TabCart v-show="activeTab === 'cart'" :active="activeTab === 'cart'" />
            <TabAccount v-show="activeTab === 'account'" :active="activeTab === 'account'" />
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
import { onShow, onResize } from '@dcloudio/uni-app'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useMessageStore } from '@/shared/model/messageStore.js'
import { useCart } from '@/shared/composables/useCart.js'
import AppStatusBarSpacer from '@/shared/ui/AppStatusBarSpacer/AppStatusBarSpacer.vue'
import HomeTopBar from './components/HomeTopBar.vue'
import ResponsiveNav from './components/ResponsiveNav.vue'
import TabHome from './tabs/TabHome.vue'
import TabCategory from './tabs/TabCategory.vue'
import TabNews from './tabs/TabNews.vue'
import TabCart from './tabs/TabCart.vue'
import TabAccount from './tabs/TabAccount.vue'

const messageStore = useMessageStore()
const { cartStore, loadCart } = useCart({ autoSchedule: false })

const activeTab = ref('home')
const isLargeScreen = ref(false)
const hasUnread = computed(() => messageStore.hasUnread)
const cartCount = computed(() => cartStore.cartBadgeCount)

// 页面级头部策略：需要沉浸式体验的页面可让标题栏进入滚动容器。
const TAB_LAYOUT_CONFIG = Object.freeze({
  home: { topBarFollowsScroll: false, integratedBackground: false },
  category: { topBarFollowsScroll: false, integratedBackground: false },
  news: { topBarFollowsScroll: false, integratedBackground: false },
  cart: { topBarFollowsScroll: false, integratedBackground: false },
  account: { topBarFollowsScroll: true, integratedBackground: true },
})
const currentTabLayout = computed(() => TAB_LAYOUT_CONFIG[activeTab.value] || TAB_LAYOUT_CONFIG.home)

let resizeListener = null

function checkScreenSize() {
  // #ifdef H5
  isLargeScreen.value = window.innerWidth >= 820
  // #endif

  // #ifdef MP-WEIXIN || APP-PLUS
  try {
    isLargeScreen.value = uni.getSystemInfoSync().windowWidth >= 820
  } catch (_) {
    isLargeScreen.value = false
  }
  // #endif
}

async function selectTab(tabKey) {
  activeTab.value = tabKey
}

async function goToMessages() {
  await navigator.navigateTo(routes.content.messages())
}

async function goToProductSearch() {
  await navigator.navigateTo(routes.commerce.productList({ mode: 'search' }))
}

async function goToSettings() {
  await navigator.navigateTo(routes.account.settings())
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

// APP/小程序横竖屏旋转触发
onResize(() => {
  checkScreenSize()
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

.home-page--integrated {
  /* 状态栏、顶部、个人信息和内容区共用一张底，避免色块断层。 */
  --home-bg: #f2f5f9;
}

.home-layout,
.home-main {
  min-width: 0;
  min-height: 0;
}

.home-status-area {
  flex: none;
  background: var(--home-bg);
}

.home-status-area--integrated {
  background: var(--home-bg);
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

.home-scroll--integrated {
  background: var(--home-bg);
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

}
</style>
