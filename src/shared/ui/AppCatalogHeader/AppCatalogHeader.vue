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
        <AppBackButton plain :transparent="transparent" :theme="theme" @click="$emit('back')" />
      </view>

      <template v-else>
        <view class="search-nav">
          <AppBackButton plain :transparent="transparent" :theme="theme" @click="$emit('back')" />

          <view class="search-box">
            <AppIcon class="search-icon" name="search" :size="19" />
            <view
              v-if="keywordCommitted && keyword"
              class="search-keyword-chip"
              hover-class="search-keyword-chip--pressed"
              @click="$emit('edit-keyword')"
            >
              <text class="search-keyword-text">{{ keyword }}</text>
              <view class="search-keyword-close" @click.stop="$emit('clear-keyword')">
                <AppIcon name="close" :size="12" :stroke-width="2" />
              </view>
            </view>
            <input
              v-else
              class="search-input"
              :value="keyword"
              :placeholder="placeholder"
              :focus="autoFocus"
              confirm-type="search"
              @input="handleKeywordInput"
              @confirm="$emit('search')"
            />
            <view v-if="keyword && !keywordCommitted" class="search-clear" @click.stop="$emit('clear-keyword')">
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

        <view v-if="showTools" class="quick-sort-bar">
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

      </template>
    </view>
  </view>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import AppBackButton from '../AppBackButton/AppBackButton.vue'
import AppIcon from '../AppIcon/AppIcon.vue'
import AppStatusBarSpacer from '../AppStatusBarSpacer/AppStatusBarSpacer.vue'

const props = defineProps({
  backOnly: { type: Boolean, default: false },
  transparent: { type: Boolean, default: false },
  sticky: { type: Boolean, default: true },
  statusBarExtra: { type: Number, default: 8 },
  keyword: { type: String, default: '' },
  placeholder: { type: String, default: '商品名称 / SKU / 69码' },
  autoFocus: { type: Boolean, default: false },
  keywordCommitted: { type: Boolean, default: false },
  showTools: { type: Boolean, default: true },
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
  'edit-keyword',
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
  border-bottom: 1px solid #eef0f2;
  background: #fff;
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
  padding: 8px 14px 10px;
  box-sizing: border-box;
}

.app-catalog-header.is-back-only .header-content {
  padding-bottom: 6px;
}

.minimal-nav,
.search-nav,
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

.search-nav { gap: 8px; }

.catalog-cart-button {
  position: relative;
  width: 40px;
  height: 42px;
  flex-shrink: 0;
  justify-content: center;
  color: #34373d;
  background: transparent;
}

.header-button--pressed {
  opacity: .66;
  transform: scale(.95);
}

.cart-count-badge {
  position: absolute;
  top: 1px;
  right: -1px;
  display: grid;
  min-width: 18px;
  max-width: 32px;
  height: 18px;
  padding: 0 4px;
  box-sizing: border-box;
  place-items: center;
  overflow: hidden;
  border: 1.5px solid #fff;
  border-radius: 9px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  text-overflow: ellipsis;
  background: #d7192d;
  transform: translate(25%, -25%);
}

.search-box {
  display: flex;
  min-width: 0;
  height: 44px;
  flex: 1;
  align-items: center;
  gap: 8px;
  padding-left: 14px;
  overflow: hidden;
  border: 1px solid #eff1f3;
  border-radius: 22px;
  background: #f4f5f6;
}

.search-icon {
  flex-shrink: 0;
  color: #777c84;
}

.search-input {
  min-width: 0;
  height: 100%;
  flex: 1;
  border: none;
  color: #202226;
  font-size: 14px;
  background: transparent;
}

.search-input::placeholder {
  color: #9a9fa7;
}

.search-keyword-chip {
  min-width: 0;
  max-width: min(56%, 360px);
  height: 30px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  box-sizing: border-box;
  color: #34373d;
  font-size: 14px;
  background: transparent;
}

.search-keyword-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-keyword-close {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #767b84;
  background: transparent;
}

.search-keyword-chip--pressed {
  opacity: .7;
}

.search-clear {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  justify-content: center;
  color: #777c85;
  background: transparent;
}

.search-submit {
  height: 26px;
  min-width: 56px;
  margin-left: auto;
  flex-shrink: 0;
  justify-content: center;
  padding: 0 14px;
  box-sizing: border-box;
  border-left: 1px solid #dde0e4;
  color: #25272b;
  font-size: 13px;
  font-weight: 650;
}

.search-submit--pressed,
.quick-sort-item--pressed {
  opacity: .58;
}

.quick-sort-bar {
  height: 46px;
  justify-content: space-between;
  margin-top: 8px;
  margin-bottom: 8px;
}

.quick-sort-item {
  position: relative;
  height: 100%;
  min-width: 54px;
  justify-content: center;
  gap: 3px;
  color: #686d75;
  font-size: 13px;
}

.quick-sort-item.is-active {
  color: #1d1f23;
  font-weight: 650;
}

.quick-sort-item.is-active::after {
  position: absolute;
  bottom: 1px;
  left: 50%;
  width: 20px;
  height: 2px;
  border-radius: 2px;
  background: #d7192d;
  content: '';
  transform: translateX(-50%);
}

.sort-direction {
  flex-direction: column;
  color: #b7bac0;
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

  .catalog-cart-button { width: 36px; height: 40px; }

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
    padding: 10px 28px 0;
  }

  .search-box {
    height: 48px;
    border-radius: 24px;
    padding-left: 16px;
  }

  .catalog-cart-button {
    width: 44px;
    height: 48px;
  }

  .search-submit {
    height: 28px;
    padding: 0 16px;
  }

  .quick-sort-bar {
    height: 50px;
    margin-top: 10px;
    margin-bottom: 8px;
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
