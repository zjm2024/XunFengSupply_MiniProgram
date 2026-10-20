<template>
  <view v-if="shouldRender" class="area-picker-overlay" :class="{ closing: isClosing }" @tap="closePicker">
    <view class="picker-panel" @tap.stop>
      <view class="picker-header">
        <button class="header-action cancel" @tap="closePicker">取消</button>
        <text class="picker-title">选择所在地区</text>
        <button class="header-action confirm" :disabled="!canConfirm" @tap="confirmSelection">确定</button>
      </view>

      <view class="level-tabs">
        <view
          v-for="(tab, index) in tabs"
          :key="tab.key"
          class="level-tab"
          :class="{ active: activeLevel === index, disabled: !canOpenLevel(index) }"
          @tap="switchLevel(index)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <view v-if="loadError" class="load-error">
        <text>{{ loadError }}</text>
        <button class="retry-button" @tap="retryCurrentLevel">重新加载</button>
      </view>

      <view v-else-if="loading" class="loading-state">
        <view class="loading-spinner"></view>
        <text>地区加载中...</text>
      </view>

      <scroll-view v-else scroll-y class="option-list" :show-scrollbar="false">
        <view
          v-for="item in activeOptions"
          :key="item.code"
          class="option-item"
          :class="{ selected: selectedCode === item.code }"
          @tap="selectArea(item)"
        >
          <text>{{ item.name }}</text>
          <AppIcon v-if="selectedCode === item.code" name="check" :size="20" color="#D7192D" />
        </view>
        <view v-if="activeOptions.length === 0" class="empty-state">暂无可选地区</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { getAreaChildren, ROOT_AREA_CODE } from '../../../../shared/api/area.js'

const EMPTY_VALUE = {
  provinceCode: '',
  province: '',
  cityCode: '',
  city: '',
  districtCode: '',
  district: '',
}

const props = defineProps({
  visible: { type: Boolean, default: false },
  modelValue: {
    type: Object,
    default: () => ({ provinceCode: '', province: '', cityCode: '', city: '', districtCode: '', district: '' }),
  },
})

const emit = defineEmits(['update:visible', 'update:modelValue', 'confirm'])

const activeLevel = ref(0)
const loading = ref(false)
const loadError = ref('')
const requestVersion = ref(0)
const isClosing = ref(false)
let closeTimer = null
const draft = reactive({ ...EMPTY_VALUE })
const options = reactive({ provinces: [], cities: [], districts: [] })

const tabs = computed(() => [
  { key: 'province', label: draft.province || '请选择省' },
  { key: 'city', label: draft.city || '请选择市' },
  { key: 'district', label: draft.district || '请选择区县' },
])
const activeOptions = computed(() => [options.provinces, options.cities, options.districts][activeLevel.value])
const selectedCode = computed(() => [draft.provinceCode, draft.cityCode, draft.districtCode][activeLevel.value])
const canConfirm = computed(() => Boolean(draft.provinceCode && draft.cityCode && draft.districtCode))
const shouldRender = computed(() => props.visible || isClosing.value)

watch(() => props.visible, (visible) => {
  if (visible) {
    clearCloseTimer()
    isClosing.value = false
    initializePicker()
    return
  }

  cancelLoading()
  beginClosing()
})

onBeforeUnmount(clearCloseTimer)

/** 启动关闭动画，结束后再卸载抽屉内容。 */
function beginClosing() {
  if (isClosing.value) return
  isClosing.value = true
  clearCloseTimer()
  closeTimer = setTimeout(() => {
    isClosing.value = false
    closeTimer = null
  }, 180)
}

/** 清理正在等待的关闭动画计时器。 */
function clearCloseTimer() {
  if (closeTimer === null) return
  clearTimeout(closeTimer)
  closeTimer = null
}
/** 初始化当前打开会话的选中地区和候选数据。 */
async function initializePicker() {
  Object.assign(draft, EMPTY_VALUE, props.modelValue || {})
  activeLevel.value = 0
  await loadOptions(0, ROOT_AREA_CODE)
  if (!props.visible) return
  if (draft.provinceCode) await loadOptions(1, draft.provinceCode)
  if (!props.visible) return
  if (draft.cityCode) await loadOptions(2, draft.cityCode)
  if (props.visible) activeLevel.value = draft.cityCode ? 2 : draft.provinceCode ? 1 : 0
}

/** 请求指定层级的行政区数据。 */
async function loadOptions(level, parentCode) {
  const version = ++requestVersion.value
  loading.value = true
  loadError.value = ''
  try {
    const list = await getAreaChildren(parentCode)
    if (version !== requestVersion.value) return
    if (level === 0) options.provinces = list
    if (level === 1) options.cities = list
    if (level === 2) options.districts = list
  } catch (error) {
    if (version !== requestVersion.value) return
    loadError.value = error?.message || '地区加载失败，请稍后重试'
  } finally {
    if (version === requestVersion.value) loading.value = false
  }
}

/** 取消尚未完成的数据请求并清理加载状态。 */
function cancelLoading() {
  requestVersion.value += 1
  loading.value = false
  loadError.value = ''
}

/** 关闭抽屉且不提交本次临时选择。 */
function closePicker() {
  cancelLoading()
  beginClosing()
  emit('update:visible', false)
}

/** 判断指定层级是否可切换。 */
function canOpenLevel(level) {
  if (level === 0) return true
  if (level === 1) return Boolean(draft.provinceCode)
  return Boolean(draft.cityCode)
}

/** 切换当前显示的省、市或区县列表。 */
function switchLevel(level) {
  if (!canOpenLevel(level)) return
  activeLevel.value = level
  loadError.value = ''
}

/** 选择当前层级的一项行政区并加载下级数据。 */
async function selectArea(item) {
  if (loading.value) return

  if (activeLevel.value === 0) {
    draft.provinceCode = item.code
    draft.province = item.name
    draft.cityCode = ''
    draft.city = ''
    draft.districtCode = ''
    draft.district = ''
    options.cities = []
    options.districts = []
    activeLevel.value = 1
    await loadOptions(1, item.code)
    return
  }

  if (activeLevel.value === 1) {
    draft.cityCode = item.code
    draft.city = item.name
    draft.districtCode = ''
    draft.district = ''
    options.districts = []
    activeLevel.value = 2
    await loadOptions(2, item.code)
    return
  }

  draft.districtCode = item.code
  draft.district = item.name
}

/** 重新加载当前层级失败的行政区数据。 */
function retryCurrentLevel() {
  const parentCodes = [ROOT_AREA_CODE, draft.provinceCode, draft.cityCode]
  loadOptions(activeLevel.value, parentCodes[activeLevel.value])
}

/** 确认完整的省、市、区县选择并同步给页面表单。 */
function confirmSelection() {
  if (!canConfirm.value) return
  const value = { ...draft }
  emit('update:modelValue', value)
  emit('confirm', value)
  closePicker()
}
</script>

<style lang="scss" scoped>
.area-picker-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: auto;
  background: rgba(16, 24, 40, 0.48);
  animation: area-overlay-in 120ms ease-out both;

  &.closing {
    animation: area-overlay-out 90ms ease-in both;

    .picker-panel {
      animation: area-sheet-out 90ms cubic-bezier(.4, 0, 1, 1) both;
    }
  }
}

.picker-panel {
  position: relative;
  width: 100%;
  max-width: none;
  box-sizing: border-box;
  height: 72vh;
  max-height: 960rpx;
  min-height: 520rpx;
  display: flex;
  flex-direction: column;
  background: $color-bg-card;
  border-radius: $radius-feature $radius-feature 0 0;
  padding-bottom: calc(env(safe-area-inset-bottom) + #{$space-3});
  overflow: hidden;
  box-shadow: 0 -12rpx 36rpx rgba(28, 32, 38, .12);
  animation: area-sheet-in 220ms cubic-bezier(.2, .8, .2, 1) both;
}

@keyframes area-overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes area-sheet-in {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.picker-header {
  min-height: 104rpx;
  padding: 0 $space-2;
  display: grid;
  grid-template-columns: 128rpx 1fr 128rpx;
  align-items: center;
  border-bottom: 2rpx solid $color-gray-100;
}

.picker-title {
  text-align: center;
  font-size: $font-size-body-l;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.header-action,
.retry-button {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: $font-size-body-m;
  line-height: $touch-target-min;

  &::after {
    border: 0;
  }
}

.header-action.cancel {
  color: $color-text-secondary;
  text-align: left;
}

.header-action.confirm {
  color: $color-action-primary;
  text-align: right;
  font-weight: $font-weight-semibold;

  &[disabled] {
    color: $color-text-disabled;
    background: transparent !important;
  }
}

.level-tabs {
  display: flex;
  padding: 0 $space-4;
  gap: $space-4;
  border-bottom: 2rpx solid $color-gray-100;
}

.level-tab {
  position: relative;
  max-width: 34%;
  min-height: $touch-target-min;
  display: flex;
  align-items: center;
  color: $color-text-secondary;
  font-size: $font-size-body-m;

  text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &.active {
    color: $color-action-primary;
    font-weight: $font-weight-semibold;
  }

  &.active::after {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 4rpx;
    content: '';
    background: $color-action-primary;
    border-radius: $radius-full;
  }

  &.disabled {
    color: $color-text-disabled;
  }
}

.option-list {
  flex: 1;
  min-height: 0;
}

.option-item {
  min-height: 96rpx;
  margin: 0 $space-4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: $color-text-primary;
  font-size: $font-size-body-m;
  border-bottom: 2rpx solid $color-gray-100;

  &.selected {
    color: $color-action-primary;
    font-weight: $font-weight-semibold;
  }
}

.loading-state,
.load-error,
.empty-state {
  flex: 1;
  min-height: 320rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-text-secondary;
  font-size: $font-size-body-m;
}

.loading-state {
  flex-direction: column;
  gap: $space-3;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid $color-brand-100;
  border-top-color: $color-action-primary;
  border-radius: 50%;
  animation: area-spin 0.8s linear infinite;
}

.load-error {
  flex-direction: column;
  gap: $space-3;
  padding: $space-6;
  text-align: center;
}

.retry-button {
  min-width: 160rpx;
  color: $color-action-primary;
}

@keyframes area-spin {
  to { transform: rotate(360deg); }
}
</style>
