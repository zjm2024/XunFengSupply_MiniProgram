<template>
  <view class="action-row-control" :class="{ 'is-compact': compact }" @tap.stop>
    <button v-if="layout.overflow.length" class="row-more" :aria-label="moreText" aria-haspopup="menu" @tap="openMore">{{ moreText }}<text aria-hidden="true">⌃</text></button>
    <button v-for="action in layout.visible" :key="action.key" class="row-button" :class="action.type" :disabled="isDisabled(action)" @tap="select(action)">{{ action.label }}</button>
    <view class="action-measures" aria-hidden="true">
      <text v-for="action in actions" :key="action.key" class="action-measure">{{ action.label }}</text>
      <text class="more-measure">{{ moreText }} ⌃</text>
    </view>
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { fitActionRow } from './actionRowLayout.js'

const props = defineProps({ actions: { type: Array, default: () => [] }, moreText: { type: String, required: true }, compact: { type: Boolean, default: false } })
const emit = defineEmits(['select', 'overflow'])
const instance = getCurrentInstance()
const width = ref(0), widths = ref([]), moreWidth = ref(60)
let generation = 0, alive = true
const signature = computed(() => JSON.stringify([props.compact, props.moreText, props.actions.map(action => [action.key, action.label, action.type])]))
const layout = computed(() => fitActionRow(props.actions, width.value || 240, widths.value, moreWidth.value, 8, props.compact ? 72 : 112))

/** 读取容器和文字实宽，字体、语言或屏幕变化后重新安排，绝不触发业务操作。 */
async function measure() {
  const revision = ++generation
  await nextTick()
  if (!alive || typeof uni.createSelectorQuery !== 'function') return
  const query = uni.createSelectorQuery().in(instance.proxy)
  query.select('.action-row-control').boundingClientRect()
  query.selectAll('.action-measure').boundingClientRect()
  query.select('.more-measure').boundingClientRect()
  query.exec(result => {
    if (!alive || revision !== generation || !result?.[0]?.width) return
    width.value = result[0].width
    widths.value = (result[1] || []).map(rect => Math.ceil(rect.width) + (props.compact ? 22 : 28))
    moreWidth.value = Math.max(60, Math.ceil(result[2]?.width || 0) + 12)
  })
}
/** 统一禁用状态，菜单和外露操作遵守相同规则。 */
function isDisabled(action) { return action.disabled || action.type === 'disabled' }
/** 只转发当前可用动作，业务入口仍由页面处理。 */
function select(action) { if (!isDisabled(action)) emit('select', action.key) }
/** 把按钮视口坐标交给页面覆盖层，避免菜单被卡片滚动容器裁切。 */
function openMore() {
  if (!layout.value.overflow.length || typeof uni.createSelectorQuery !== 'function') return
  const keys = layout.value.overflow.map(action => action.key)
  uni.createSelectorQuery().in(instance.proxy).select('.row-more').boundingClientRect().exec(result => {
    if (alive && result?.[0]) emit('overflow', { keys, anchor: result[0] })
  })
}
watch(signature, measure, { flush: 'post' })
onMounted(() => { measure(); uni.onWindowResize?.(measure) })
onBeforeUnmount(() => { alive = false; generation++; uni.offWindowResize?.(measure) })
</script>

<style scoped>
.action-row-control { position: relative; display: flex; width: 100%; min-width: 0; align-items: stretch; gap: 8px; }
.row-button { display: flex; flex: 1 1 0; min-width: 0; min-height: 44px; align-items: center; justify-content: center; margin: 0; padding: 10px 13px; border: 1px solid #dde0e4; border-radius: var(--radius-control, 10px); background: #fff; color: #363c45; font-size: var(--type-button-size, 15px); font-weight: var(--font-weight-semibold, 600); line-height: var(--type-button-line-height, 22px); white-space: normal; overflow-wrap: anywhere; }
.row-button.primary { border-color: #d7192d; background: #d7192d; color: #fff; }
.row-button:disabled { color: #969aa3; background: #eceef2; border-color: #eceef2; }
.action-row-control.is-compact { justify-content: flex-end; }
.is-compact .row-button { position:relative;flex:0 1 auto;min-width:min(var(--list-action-min-width,72px),100%);max-width:200px;min-height:var(--list-action-height,32px);padding:5px 10px;border-radius:var(--list-action-radius,8px);font-size:var(--list-action-font-size,12px);line-height: 20px; }
.is-compact {min-height:44px;align-items:center;}
.is-compact .row-button::before{content:'';position:absolute;left:0;right:0;top:-6px;bottom:-6px;}
.is-compact .row-more{min-height:44px;padding:6px;font-size: var(--type-caption-size, 12px);}
.is-compact .action-measure,.is-compact .more-measure{font-size: var(--type-caption-size, 12px);}
.is-compact .row-more { margin-right: auto; }
.row-more { display: flex; flex: 0 0 auto; min-width: 60px; min-height: 44px; align-items: center; justify-content: center; gap: 5px; margin: 0; padding: 10px 6px; border: 0; background: transparent; color: #626974; font-size: var(--type-body-small-size, 13px); line-height: 20px; }
.action-measures { position: absolute; top: 0; left: 0; display: flex; width: 0; height: 0; overflow: hidden; visibility: hidden; pointer-events: none; white-space: nowrap; }
.action-measure { flex: none; font-size: var(--type-button-size, 15px); font-weight: var(--font-weight-semibold, 600); line-height: var(--type-button-line-height, 22px); white-space: nowrap; }
.more-measure { flex: none; font-size: var(--type-body-small-size, 13px); line-height: 20px; white-space: nowrap; }
button::after { border: 0; }
</style>
