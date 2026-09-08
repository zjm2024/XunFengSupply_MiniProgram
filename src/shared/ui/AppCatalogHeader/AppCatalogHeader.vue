<template>
  <view
    class="app-catalog-header"
    :class="{
      'is-sticky': sticky,
      'is-transparent': transparent,
      'is-back-only': backOnly,
    }"
  >
    <AppStatusBarSpacer :extra="statusBarExtra" />

    <view class="header-content">
      <view v-if="backOnly" class="minimal-nav">
        <view class="catalog-back-button" hover-class="header-button--pressed" @click="$emit('back')">
          <AppIcon name="chevron-left" :size="24" :stroke-width="2.2" />
        </view>
      </view>

      <template v-else>
        <view class="search-nav">
          <view class="catalog-back-button" hover-class="header-button--pressed" @click="$emit('back')">
            <AppIcon name="chevron-left" :size="24" :stroke-width="2.2" />
          </view>

          <view class="search-box">
            <AppIcon class="search-icon" name="search" :size="19" />
            <input
              class="search-input"
              :value="keyword"
              :placeholder="placeholder"
              confirm-type="search"
              @input="handleKeywordInput"
              @confirm="$emit('search')"
            />
            <view v-if="keyword" class="search-clear" @click.stop="$emit('clear-keyword')">
              <AppIcon name="close" :size="14" />
            </view>
            <view class="search-submit" hover-class="search-submit--pressed" @click="$emit('search')">
              <text>搜索</text>
            </view>
          </view>

          <view v-if="showCart" class="catalog-cart-button" hover-class="header-button--pressed" @click="$emit('cart')">
            <AppIcon name="cart" :size="21" />
            <text v-if="cartCount" class="cart-count-badge">{{ cartCount > 99 ? '99+' : cartCount }}</text>
          </view>
        </view>

        <view class="quick-sort-bar">
          <view
            v-for="item in quickSortItems"
            :key="item.key"
            class="quick-sort-item"
            :class="{ 'is-active': isQuickSortActive(item.key) }"
            hover-class="quick-sort-item--pressed"
            @click="$emit('sort', item.key)"
          >
            <text>{{ item.label }}</text>
            <view v-if="item.directional" class="sort-direction">
              <text :class="{ 'is-active': isSortDirection(item.key, 'asc') }">▲</text>
              <text :class="{ 'is-active': isSortDirection(item.key, 'desc') }">▼</text>
            </view>
          </view>

          <view
            class="quick-sort-item filter-entry"
            :class="{ 'is-active': filterCount > 0 }"
            hover-class="quick-sort-item--pressed"
            @click="$emit('filter')"
          >
            <text>筛选</text>
            <AppIcon name="filter" :size="15" />
            <text v-if="filterCount" class="filter-count">{{ filterCount }}</text>
          </view>
        </view>

        <view class="quick-filter-row">
          <scroll-view class="active-filter-scroll" scroll-x :show-scrollbar="false">
            <view class="active-filter-list">
              <view class="category-filter-chip" :class="{ 'is-active': categoryActive }" @click="$emit('filter')">
                <text>{{ categoryLabel || '分类' }}</text>
                <AppIcon name="chevron-down" :size="12" />
              </view>
              <view v-if="stockFilterLabel" class="active-filter-tag" @click="$emit('remove-filter', 'stock')">
                <text>{{ stockFilterLabel }}</text>
                <AppIcon name="close" :size="11" />
              </view>
              <view v-if="categoryActive || stockFilterLabel" class="clear-filter-button" @click="$emit('clear-filters')">
                <text>清除</text>
              </view>
            </view>
          </scroll-view>
          <text class="result-count">{{ total }} 件</text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import AppIcon from '../AppIcon/AppIcon.vue'
import AppStatusBarSpacer from '../AppStatusBarSpacer/AppStatusBarSpacer.vue'

const props = defineProps({
  backOnly: { type: Boolean, default: false },
  transparent: { type: Boolean, default: false },
  sticky: { type: Boolean, default: true },
  statusBarExtra: { type: Number, default: 8 },
  keyword: { type: String, default: '' },
  placeholder: { type: String, default: '搜索商品名称 / SKU / 69码' },
  showCart: { type: Boolean, default: true },
  cartCount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  sortKey: { type: String, default: 'default' },
  filterCount: { type: Number, default: 0 },
  categoryLabel: { type: String, default: '分类' },
  categoryActive: { type: Boolean, default: false },
  stockFilterLabel: { type: String, default: '' },
  theme: { type: String, default: 'dark' },
})

const emit = defineEmits([
  'update:keyword',
  'search',
  'clear-keyword',
  'back',
  'cart',
  'sort',
  'filter',
  'remove-filter',
  'clear-filters',
])

const quickSortItems = Object.freeze([
  { key: 'default', label: '综合' },
  { key: 'latest', label: '最新' },
  { key: 'price', label: '价格', directional: true },
  { key: 'stock', label: '库存', directional: true },
])

function handleKeywordInput(event) {
  emit('update:keyword', event?.detail?.value ?? '')
}

function isQuickSortActive(type) {
  if (type === 'price') return props.sortKey.startsWith('price')
  if (type === 'stock') return props.sortKey.startsWith('stock')
  return props.sortKey === type
}

function isSortDirection(type, direction) {
  if (!isQuickSortActive(type)) return false
  return props.sortKey.endsWith(direction === 'asc' ? 'Asc' : 'Desc')
}

function applyStatusBarStyle() {
  // #ifdef APP-PLUS
  if (typeof plus !== 'undefined' && plus.navigator) {
    plus.navigator.setStatusBarStyle(props.theme === 'light' ? 'light' : 'dark')
  }
  // #endif
}

onMounted(applyStatusBarStyle)
watch(() => props.theme, applyStatusBarStyle)
</script>

<style lang="scss" scoped>
.app-catalog-header {
  position: relative;
  z-index: 120;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(17, 18, 22, .045);
  background: #f4f5f7;
}

.app-catalog-header.is-sticky {
  position: sticky;
  top: 0;
}

.app-catalog-header.is-transparent {
  border-bottom-color: transparent;
  background: transparent;
}

.header-content {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 8px 12px 10px;
  box-sizing: border-box;
}

.app-catalog-header.is-back-only .header-content {
  padding-bottom: 6px;
}

.minimal-nav,
.search-nav,
.catalog-back-button,
.catalog-cart-button,
.search-clear,
.search-submit,
.quick-sort-bar,
.quick-sort-item,
.sort-direction,
.quick-filter-row,
.active-filter-list,
.category-filter-chip,
.active-filter-tag,
.clear-filter-button {
  display: flex;
  align-items: center;
}

.minimal-nav {
  min-height: 44px;
}

.search-nav {
  gap: 9px;
}

.catalog-back-button,
.catalog-cart-button {
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  justify-content: center;
  border-radius: 50%;
  color: #22252a;
  background: #e7e8eb;
}

.is-transparent .catalog-back-button {
  border: 1px solid rgba(255, 255, 255, .68);
  background: rgba(255, 255, 255, .82);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}

.catalog-cart-button {
  color: #4f545c;
  background: rgba(231, 232, 235, .78);
}

.header-button--pressed {
  opacity: .66;
  transform: scale(.95);
}

.cart-count-badge {
  position: absolute;
  top: -1px;
  right: -2px;
  display: grid;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  box-sizing: border-box;
  place-items: center;
  border: 2px solid #f4f5f7;
  border-radius: 9px;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  background: #d7192d;
}

.search-box {
  display: flex;
  min-width: 0;
  height: 44px;
  flex: 1;
  align-items: center;
  gap: 9px;
  padding-left: 14px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 24px;
  background: #e7e8eb;
}

.search-icon {
  flex-shrink: 0;
  color: #8c919b;
}

.search-input {
  min-width: 0;
  height: 100%;
  flex: 1;
  border: none;
  color: #111216;
  font-size: 15px;
  background: transparent;
}

.search-input::placeholder {
  color: #a8adb5;
}

.search-clear {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  justify-content: center;
  border-radius: 50%;
  color: #777c85;
  background: rgba(93, 98, 108, .09);
}

.search-submit {
  height: 30px;
  flex-shrink: 0;
  justify-content: center;
  padding: 0 15px;
  border-left: 1px solid rgba(77, 81, 89, .1);
  color: #24272c;
  font-size: 13px;
  font-weight: 650;
}

.search-submit--pressed,
.quick-sort-item--pressed {
  opacity: .58;
}

.quick-sort-bar {
  height: 48px;
  justify-content: space-between;
  margin-top: 5px;
}

.quick-sort-item {
  position: relative;
  height: 100%;
  min-width: 54px;
  justify-content: center;
  gap: 3px;
  color: #656a72;
  font-size: 13px;
}

.quick-sort-item.is-active {
  color: #17191d;
  font-weight: 700;
}

.quick-sort-item.is-active::after {
  position: absolute;
  bottom: 3px;
  left: 50%;
  width: 18px;
  height: 2px;
  border-radius: 2px;
  background: #d7192d;
  content: '';
  transform: translateX(-50%);
}

.sort-direction {
  flex-direction: column;
  color: #afb2b8;
  font-size: 6px;
  line-height: 7px;
}

.sort-direction .is-active {
  color: #d7192d;
}

.filter-entry {
  gap: 5px;
}

.filter-entry.is-active {
  color: #c6192b;
}

.filter-count {
  display: grid;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  box-sizing: border-box;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  background: #d7192d;
}

.quick-filter-row {
  min-width: 0;
  gap: 10px;
}

.active-filter-scroll {
  min-width: 0;
  flex: 1;
  white-space: nowrap;
}

.active-filter-list {
  width: max-content;
  gap: 8px;
  padding: 1px 0;
}

.category-filter-chip,
.active-filter-tag {
  min-height: 32px;
  box-sizing: border-box;
  border-radius: 17px;
  font-size: 11px;
  background: #e7e8eb;
}

.category-filter-chip {
  max-width: 180px;
  gap: 5px;
  padding: 0 12px;
  color: #34373d;
}

.category-filter-chip.is-active {
  color: #b81828;
  background: rgba(215, 25, 45, .08);
}

.category-filter-chip text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.active-filter-tag {
  gap: 5px;
  padding: 0 11px;
  border: 1px solid rgba(215, 25, 45, .12);
  color: #bd1728;
  background: rgba(215, 25, 45, .055);
}

.clear-filter-button {
  padding: 6px 4px;
  color: #858a93;
  font-size: 10px;
}

.result-count {
  flex-shrink: 0;
  color: #757a83;
  font-size: 11px;
  white-space: nowrap;
}

@media screen and (max-width: 380px) {
  .header-content {
    padding-right: 9px;
    padding-left: 9px;
  }

  .search-nav {
    gap: 6px;
  }

  .catalog-back-button,
  .catalog-cart-button {
    width: 40px;
    height: 40px;
  }

  .search-box {
    height: 40px;
    padding-left: 11px;
  }

  .search-submit {
    padding: 0 11px;
  }

  .quick-sort-item {
    min-width: 48px;
    font-size: 12px;
  }
}

@media screen and (min-width: 768px) {
  .header-content {
    padding: 10px 28px 14px;
  }

  .search-box {
    height: 48px;
    border-radius: 25px;
  }

  .catalog-back-button,
  .catalog-cart-button {
    width: 48px;
    height: 48px;
  }

  .quick-sort-bar {
    height: 52px;
  }

  .quick-sort-item {
    min-width: 92px;
    font-size: 14px;
  }
}

@media screen and (min-width: 1180px) {
  .header-content {
    padding-right: 36px;
    padding-left: 36px;
  }
}
</style>
