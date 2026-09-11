<template>
  <view v-if="visible" class="drawer-layer">
    <view class="drawer-mask" @click="$emit('close')"></view>

    <view class="drawer-panel" :style="panelStyle">
      <view class="drawer-header">
        <view>
          <text class="drawer-title">筛选与排序</text>
          <text class="drawer-subtitle">按分类、库存和价格快速找货</text>
        </view>
        <view class="close-button" hover-class="button--pressed" @click="$emit('close')">
          <AppIcon name="close" :size="18" />
        </view>
      </view>

      <scroll-view
        class="drawer-scroll"
        scroll-y
        enhanced
        :show-scrollbar="false"
      >
        <view class="filter-section category-section">
          <view class="section-heading">
            <text class="section-title">商品分类</text>
            <text class="section-hint">支持选择任意层级</text>
          </view>

          <scroll-view class="category-breadcrumb-scroll" scroll-x :show-scrollbar="false">
            <view class="category-breadcrumb">
              <view class="breadcrumb-item" :class="{ 'is-current': draftCategoryPath.length === 0 }" @click="goToRoot">
                <text>全部分类</text>
              </view>
              <template v-for="(category, index) in draftCategoryPath" :key="String(category.id)">
                <AppIcon class="breadcrumb-arrow" name="chevron-right" :size="12" />
                <view
                  class="breadcrumb-item"
                  :class="{ 'is-current': index === draftCategoryPath.length - 1 }"
                  @click="goToCategory(index)"
                >
                  <text>{{ category.name }}</text>
                </view>
              </template>
            </view>
          </scroll-view>

          <view v-if="draftCategoryPath.length" class="selected-category-card">
            <view class="selected-category-icon">
              <AppIcon name="category" :size="18" />
            </view>
            <view class="selected-category-copy">
              <text class="selected-category-label">当前将筛选</text>
              <text class="selected-category-name">{{ selectedCategoryLabel }}</text>
            </view>
            <AppIcon class="selected-check" name="check" :size="17" />
          </view>

          <view class="category-level-heading">
            <text>{{ currentLevelTitle }}</text>
            <text v-if="currentCategoryOptions.length">{{ currentCategoryOptions.length }} 项</text>
          </view>

          <view v-if="currentCategoryOptions.length" class="category-options">
            <view
              v-for="category in currentCategoryOptions"
              :key="String(category.id)"
              class="category-option"
              :class="{ 'is-selected': isCategorySelected(category) }"
              hover-class="option--pressed"
              @click="selectCategory(category)"
            >
              <view class="category-option-copy">
                <text class="category-option-name">{{ category.name }}</text>
                <text v-if="category.children?.length" class="category-option-meta">
                  {{ category.children.length }} 个下级分类
                </text>
                <text v-else class="category-option-meta">末级分类</text>
              </view>
              <AppIcon
                :name="category.children?.length ? 'chevron-right' : (isCategorySelected(category) ? 'check' : 'category')"
                :size="17"
              />
            </view>
          </view>

          <view v-else class="category-empty">
            <text>该分类暂无下级分类，可直接应用当前分类。</text>
          </view>
        </view>

        <view class="filter-section">
          <view class="section-heading">
            <text class="section-title">库存状态</text>
            <text class="section-hint">快速定位可采购商品</text>
          </view>
          <view class="choice-grid choice-grid--stock">
            <view
              v-for="option in stockOptions"
              :key="option.value"
              class="choice-card"
              :class="{ 'is-selected': draftStockFilter === option.value }"
              hover-class="option--pressed"
              @click="draftStockFilter = option.value"
            >
              <text class="choice-title">{{ option.label }}</text>
              <text class="choice-description">{{ option.description }}</text>
            </view>
          </view>
        </view>

        <view class="filter-section">
          <view class="section-heading">
            <text class="section-title">商品排序</text>
            <text class="section-hint">由后端排序，分页结果更准确</text>
          </view>
          <view class="choice-grid">
            <view
              v-for="option in sortOptions"
              :key="option.value"
              class="choice-card"
              :class="{ 'is-selected': draftSortKey === option.value }"
              hover-class="option--pressed"
              @click="draftSortKey = option.value"
            >
              <view class="choice-title-row">
                <text class="choice-title">{{ option.label }}</text>
                <AppIcon v-if="draftSortKey === option.value" name="check" :size="15" />
              </view>
              <text class="choice-description">{{ option.description }}</text>
            </view>
          </view>
        </view>

        <view class="drawer-scroll-spacer"></view>
      </scroll-view>

      <view class="drawer-footer">
        <view class="reset-button" hover-class="button--pressed" @click="resetDraft">
          <text>重置</text>
        </view>
        <view class="apply-button" hover-class="button--pressed" @click="applyFilters">
          <text>应用筛选</text>
          <AppIcon name="check" :size="17" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AppIcon from '../../../../shared/ui/AppIcon/AppIcon.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  categoryTree: { type: Array, default: () => [] },
  categoryPath: { type: Array, default: () => [] },
  stockFilter: { type: String, default: '' },
  sortKey: { type: String, default: 'default' },
})

const emit = defineEmits(['close', 'apply'])

const stockOptions = Object.freeze([
  { value: '', label: '全部库存', description: '包含有货与缺货商品' },
  { value: 'inStock', label: '仅看有货', description: '库存大于 0' },
  { value: 'lowStock', label: '库存紧张', description: '优先安排采购' },
  { value: 'outOfStock', label: '暂时缺货', description: '库存等于 0' },
])

const sortOptions = Object.freeze([
  { value: 'default', label: '综合排序', description: '按平台默认顺序' },
  { value: 'latest', label: '最新上架', description: '优先展示新上架商品' },
  { value: 'priceAsc', label: '价格从低到高', description: '优先展示低价商品' },
  { value: 'priceDesc', label: '价格从高到低', description: '优先展示高价商品' },
  { value: 'stockDesc', label: '库存从高到低', description: '优先展示库存充足商品' },
  { value: 'stockAsc', label: '库存从低到高', description: '优先查看紧缺商品' },
])

const draftCategoryPath = ref([])
const categoryLevel = ref(0)
const draftStockFilter = ref('')
const draftSortKey = ref('default')

const selectedCategoryLabel = computed(() => draftCategoryPath.value.map(item => item.name).join(' / '))
const currentParent = computed(() => categoryLevel.value > 0 ? draftCategoryPath.value[categoryLevel.value - 1] : null)
const currentLevelTitle = computed(() => currentParent.value ? `${currentParent.value.name}的下级分类` : '选择一级分类')
const currentCategoryOptions = computed(() => {
  if (categoryLevel.value === 0) return props.categoryTree
  return Array.isArray(currentParent.value?.children) ? currentParent.value.children : []
})

function isSameId(first, second) {
  return String(first ?? '') === String(second ?? '')
}

function isCategorySelected(category) {
  return isSameId(draftCategoryPath.value[categoryLevel.value]?.id, category.id)
}

function goToRoot() {
  draftCategoryPath.value = []
  categoryLevel.value = 0
}

function goToCategory(index) {
  const category = draftCategoryPath.value[index]
  draftCategoryPath.value = draftCategoryPath.value.slice(0, index + 1)
  categoryLevel.value = category?.children?.length ? index + 1 : Math.max(0, index)
}

function selectCategory(category) {
  draftCategoryPath.value = [
    ...draftCategoryPath.value.slice(0, categoryLevel.value),
    category,
  ]

  if (category.children?.length) {
    categoryLevel.value += 1
  }
}

function resetDraft() {
  draftCategoryPath.value = []
  categoryLevel.value = 0
  draftStockFilter.value = ''
  draftSortKey.value = 'default'
}

function applyFilters() {
  emit('apply', {
    categoryPath: [...draftCategoryPath.value],
    stockFilter: draftStockFilter.value,
    sortKey: draftSortKey.value,
  })
}

const panelHeight = ref('88vh')
const panelStyle = computed(() => ({ height: panelHeight.value }))

function getWindowSize() {
  try {
    if (typeof uni.getWindowInfo === 'function') {
      return uni.getWindowInfo()
    }
    return uni.getSystemInfoSync()
  } catch (error) {
    return { windowWidth: 375, windowHeight: 667 }
  }
}

function calcPanelHeight() {
  nextTick(() => {
    const { windowWidth = 375, windowHeight = 667 } = getWindowSize()
    panelHeight.value = Number(windowWidth) >= 800
      ? `${Math.max(1, Number(windowHeight))}px`
      : `${Math.min(Math.max(1, Number(windowHeight)) * 0.88, 760)}px`
  })
}

function handleWindowResize() {
  if (props.visible) calcPanelHeight()
}

onMounted(() => {
  if (typeof uni.onWindowResize === 'function') uni.onWindowResize(handleWindowResize)
})

onUnmounted(() => {
  if (typeof uni.offWindowResize === 'function') uni.offWindowResize(handleWindowResize)
})

watch(() => props.visible, (visible) => {
  if (!visible) return
  draftCategoryPath.value = [...props.categoryPath]
  draftStockFilter.value = props.stockFilter
  draftSortKey.value = props.sortKey
  const selected = draftCategoryPath.value[draftCategoryPath.value.length - 1]
  categoryLevel.value = selected?.children?.length
    ? draftCategoryPath.value.length
    : Math.max(0, draftCategoryPath.value.length - 1)
  calcPanelHeight()
})
</script>

<style lang="scss" scoped>
.drawer-layer {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.drawer-mask {
  position: absolute;
  inset: 0;
  background: rgba(17, 18, 22, .38);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
}

.drawer-panel {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  max-height: min(88vh, 760px);
  overflow: hidden;
  flex-direction: column;
  border-radius: 24px 24px 0 0;
  background: #fbfbfc;
  box-shadow: 0 -18px 50px rgba(17, 18, 22, .16);
  animation: drawer-up 180ms ease-out;
}

.drawer-header,
.drawer-footer,
.section-heading,
.category-breadcrumb,
.selected-category-card,
.category-level-heading,
.category-option,
.choice-title-row {
  display: flex;
  align-items: center;
}

.drawer-header {
  justify-content: space-between;
  padding: 19px 18px 16px;
  border-bottom: 1px solid #ececef;
  background: rgba(255, 255, 255, .96);
}

.drawer-title,
.drawer-subtitle {
  display: block;
}

.drawer-title {
  color: #17191d;
  font-size: 19px;
  font-weight: 750;
}

.drawer-subtitle {
  margin-top: 4px;
  color: #92969f;
  font-size: 11px;
}

.close-button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid #ececef;
  border-radius: 12px;
  color: #656a73;
  background: #fff;
}

.drawer-scroll {
  flex: 1 1 0%;
  width: 100%;
  height: 0;
  min-height: 0;
  overflow: hidden;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}

.filter-section {
  margin: 12px;
  padding: 16px;
  border: 1px solid rgba(17, 18, 22, .055);
  border-radius: 18px;
  background: #fff;
}

.section-heading {
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  color: #1b1d21;
  font-size: 15px;
  font-weight: 700;
}

.section-hint {
  color: #a1a5ad;
  font-size: 10px;
}

.category-breadcrumb-scroll {
  width: 100%;
  margin-top: 13px;
  white-space: nowrap;
}

.category-breadcrumb {
  width: max-content;
  min-height: 30px;
  gap: 5px;
}

.breadcrumb-item {
  padding: 6px 9px;
  border-radius: 9px;
  color: #737780;
  font-size: 11px;
  background: #f5f5f7;
}

.breadcrumb-item.is-current {
  color: #d7192d;
  font-weight: 650;
  background: rgba(215, 25, 45, .08);
}

.breadcrumb-arrow {
  color: #b5b8be;
}

.selected-category-card {
  gap: 10px;
  margin-top: 12px;
  padding: 11px 12px;
  border: 1px solid rgba(215, 25, 45, .12);
  border-radius: 13px;
  background: rgba(215, 25, 45, .055);
}

.selected-category-icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 10px;
  color: #d7192d;
  background: #fff;
}

.selected-category-copy {
  min-width: 0;
  flex: 1;
}

.selected-category-label,
.selected-category-name {
  display: block;
}

.selected-category-label {
  color: #a16c73;
  font-size: 9px;
}

.selected-category-name {
  margin-top: 2px;
  overflow: hidden;
  color: #9f1524;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.selected-check {
  color: #d7192d;
}

.category-level-heading {
  justify-content: space-between;
  margin: 15px 1px 8px;
  color: #8d919a;
  font-size: 10px;
}

.category-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.category-option {
  min-width: 0;
  min-height: 54px;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 10px;
  box-sizing: border-box;
  border: 1px solid #ececef;
  border-radius: 12px;
  color: #9a9ea6;
  background: #fafafb;
}

.category-option.is-selected {
  border-color: rgba(215, 25, 45, .22);
  color: #d7192d;
  background: rgba(215, 25, 45, .06);
}

.category-option-copy {
  min-width: 0;
}

.category-option-name,
.category-option-meta {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.category-option-name {
  color: #34373d;
  font-size: 12px;
  font-weight: 620;
}

.category-option.is-selected .category-option-name {
  color: #bb1728;
}

.category-option-meta {
  margin-top: 4px;
  color: #a2a6ae;
  font-size: 9px;
}

.category-empty {
  padding: 20px 12px 8px;
  color: #a0a4ac;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.choice-card {
  min-width: 0;
  padding: 11px;
  border: 1px solid #ececef;
  border-radius: 12px;
  background: #fafafb;
}

.choice-card.is-selected {
  border-color: rgba(215, 25, 45, .22);
  color: #d7192d;
  background: rgba(215, 25, 45, .06);
}

.choice-title-row {
  justify-content: space-between;
  gap: 6px;
}

.choice-title,
.choice-description {
  display: block;
}

.choice-title {
  color: #34373d;
  font-size: 12px;
  font-weight: 620;
}

.choice-card.is-selected .choice-title {
  color: #bb1728;
}

.choice-description {
  margin-top: 4px;
  color: #9da1aa;
  font-size: 9px;
  line-height: 14px;
}

.drawer-scroll-spacer {
  height: calc(8px + env(safe-area-inset-bottom));
}

.drawer-footer {
  gap: 10px;
  padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid #ececef;
  background: rgba(255, 255, 255, .97);
}

.reset-button,
.apply-button {
  display: flex;
  height: 46px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 650;
}

.reset-button {
  width: 108px;
  border: 1px solid #e3e4e8;
  color: #555a63;
  background: #fff;
}

.apply-button {
  flex: 1;
  gap: 7px;
  color: #fff;
  background: #d7192d;
}

.button--pressed,
.option--pressed {
  opacity: .78;
}

@keyframes drawer-up {
  from { transform: translateY(22px); opacity: .7; }
  to { transform: translateY(0); opacity: 1; }
}

@media screen and (min-width: 800px) {
  .drawer-panel {
    top: 0;
    right: 0;
    bottom: 0;
    left: auto;
    width: min(430px, 46vw);
    max-height: none;
    border-radius: 22px 0 0 22px;
    box-shadow: -18px 0 50px rgba(17, 18, 22, .14);
    animation-name: drawer-left;
  }

  .drawer-header {
    padding: max(24px, env(safe-area-inset-top)) 22px 18px;
  }

  .filter-section {
    margin: 14px;
    padding: 18px;
  }

  .drawer-footer {
    padding: 14px 18px max(18px, env(safe-area-inset-bottom));
  }
}

@keyframes drawer-left {
  from { transform: translateX(28px); opacity: .72; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
