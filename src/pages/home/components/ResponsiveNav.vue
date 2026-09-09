<template>
  <view class="responsive-nav" :class="`responsive-nav--${mode}`">
    <view class="nav-list">
      <view
        v-for="item in displayItems"
        :key="item.key"
        class="nav-item"
        :class="{ 'is-active': activeTab === item.key }"
        :aria-label="item.label"
        hover-class="nav-item--pressed"
        hover-stay-time="80"
        @click="$emit('change', item.key)"
      >
        <view class="nav-icon-wrap">
          <AppIcon
            class="nav-svg-icon"
            :name="getItemIcon(item)"
            :size="mode === 'sidebar' ? 24 : 22"
            :stroke-width="1.8"
          />
          <text v-if="item.key === 'cart' && normalizedCartCount" class="cart-badge">
            {{ normalizedCartCount }}
          </text>
        </view>
        <text v-if="mode !== 'sidebar'" class="nav-label">{{ item.label }}</text>
      </view>
    </view>

    <view v-if="mode === 'sidebar'" class="sidebar-version">V1.0</view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'

const props = defineProps({
  activeTab: { type: String, default: 'home' },
  cartCount: { type: Number, default: 0 },
  mode: { type: String, default: 'bottom' },
})

defineEmits(['change'])

const tabItems = Object.freeze([
  { key: 'home', label: '首页', inactive: 'tab-home', active: 'tab-home-active' },
  { key: 'category', label: '分类', inactive: 'tab-category', active: 'tab-category-active' },
  { key: 'news', label: '资讯', inactive: 'tab-news', active: 'tab-news-active' },
  { key: 'cart', label: '购物车', inactive: 'tab-cart', active: 'tab-cart-active' },
])

const sidebarItems = Object.freeze([
  ...tabItems,
])

const displayItems = computed(() => (props.mode === 'sidebar' ? sidebarItems : tabItems))

const normalizedCartCount = computed(() => {
  const count = Number(props.cartCount || 0)
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
})

function getItemIcon(item) {
  return props.activeTab === item.key ? item.active : item.inactive
}

</script>

<style lang="scss" scoped>
.responsive-nav {
  flex-shrink: 0;
  box-sizing: border-box;
}

.nav-list,
.nav-item,
.nav-icon-wrap {
  display: flex;
  align-items: center;
}

.nav-item {
  position: relative;
  justify-content: center;
  color: #777b84;
  transition: color 160ms ease, transform 160ms ease, background 160ms ease;
}

.nav-icon-wrap {
  position: relative;
  justify-content: center;
}

.nav-label {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.nav-item.is-active {
  color: var(--color-brand, #d7192d);
}

.nav-item--pressed {
  opacity: 0.72;
  transform: scale(0.96);
}

.cart-badge {
  position: absolute;
  top: -7px;
  right: -12px;
  display: grid;
  place-items: center;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  box-sizing: border-box;
  border: 2px solid #fff;
  border-radius: 10px;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  background: var(--color-brand, #d7192d);
}

.responsive-nav--bottom {
  position: relative;
  z-index: 100;
  padding: 6px 10px calc(6px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(42, 44, 51, 0.08);
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
}

.responsive-nav--bottom .nav-list {
  justify-content: space-around;
}

.responsive-nav--bottom .nav-list {
  gap: 6px;
}

.responsive-nav--bottom .nav-item {
  flex: 1;
  min-width: 0;
  height: 48px;
  flex-direction: column;
  gap: 3px;
  border-radius: 0;
  color: #999;
}

.responsive-nav--bottom .nav-item.is-active {
  color: var(--color-brand, #d7192d);
  background: transparent;
}

.responsive-nav--bottom .nav-icon-wrap {
  width: 26px;
  height: 24px;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.responsive-nav--bottom .nav-icon-wrap::before {
  display: none;
}

.responsive-nav--bottom .nav-svg-icon {
  flex: 0 0 auto;
}

.responsive-nav--bottom .nav-item.is-active .nav-icon-wrap {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.responsive-nav--bottom .nav-item.is-active .nav-icon-wrap::before {
  display: none;
}

.responsive-nav--bottom .nav-item.is-active .nav-svg-icon {
  opacity: 1;
}

.responsive-nav--bottom .nav-label {
  font-size: 10px;
}

.responsive-nav--bottom .cart-badge {
  top: -5px;
  right: -8px;
}

.responsive-nav--sidebar {
  position: relative;
  z-index: 110;
  display: flex;
  width: 100px;
  height: 100%;
  padding: 18px 10px;
  flex-direction: column;
  background: transparent;
}

.sidebar-mark {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin: 0 auto;
  border: 1px solid rgba(215, 25, 45, 0.08);
  border-radius: 19px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 12px 28px rgba(215, 25, 45, 0.09);
}

.sidebar-logo {
  width: 40px;
  height: 40px;
}

.responsive-nav--sidebar .nav-list {
  flex: 1;
  justify-content: center;
  flex-direction: column;
  gap: 14px;
}

.responsive-nav--sidebar .nav-item {
  width: 60px;
  height: 48px;
  justify-content: center;
  border-radius: 0;
  color: #999;
  background: transparent;
  transition: color 140ms ease, opacity 140ms ease, transform 140ms ease;
}

.responsive-nav--sidebar .nav-item.is-active {
  color: var(--color-brand, #d7192d);
  background: transparent;
}

.responsive-nav--sidebar .nav-icon-wrap {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.responsive-nav--sidebar .nav-icon-wrap::before {
  display: none;
}

.responsive-nav--sidebar .nav-svg-icon {
  flex: 0 0 auto;
}

.responsive-nav--sidebar .nav-item.is-active .nav-icon-wrap {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.responsive-nav--sidebar .nav-item.is-active .nav-icon-wrap::before {
  display: none;
}

.responsive-nav--sidebar .nav-item.is-active .nav-svg-icon {
  opacity: 1;
}

.responsive-nav--sidebar .nav-item--pressed {
  opacity: 0.68;
  transform: scale(0.96);
}

.sidebar-version {
  color: #aaaab0;
  font-size: 10px;
  text-align: center;
}
</style>
