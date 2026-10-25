<template>
  <view class="amount-text" :style="naturalWidth ? { width: naturalWidth + 'px' } : {}">
    <text class="amount-text__value" :style="fontSize ? { fontSize: fontSize + 'px' } : {}">{{ text }}</text>
    <text class="amount-text__probe" aria-hidden="true">{{ text }}</text>
  </view>
</template>

<script setup>
import { getCurrentInstance, nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { estimateAmountWidth, fitAmountFontSize, subscribeAmountResize } from './amountSizing.js'

const props = defineProps({ text: { type: [String, Number], default: '' } })
const proxy = getCurrentInstance()?.proxy
const fontSize = ref(null)
const naturalWidth = ref(null)
let generation = 0
let timer = null
let disposed = false
let unsubscribe = null
let resizeObserver = null

/** 在组件作用域读取真实容器及未缩放文本，兼容 APP 与小程序。 */
function readLayout() {
  return new Promise(resolve => {
    if (typeof uni === 'undefined' || !uni.createSelectorQuery) return resolve([])
    try {
      const query = uni.createSelectorQuery().in(proxy)
      query.select('.amount-text').fields({ size: true, computedStyle: ['font-size', 'padding-left', 'padding-right', 'border-left-width', 'border-right-width'] })
      query.select('.amount-text__probe').boundingClientRect()
      query.exec(result => resolve(result || []))
    } catch { resolve([]) }
  })
}

/** 读取像素样式，兼容连字符和驼峰属性名。 */
function pixels(layout, name) {
  const camelName = name.replace(/-([a-z])/g, (_, character) => character.toUpperCase())
  return parseFloat(layout?.[name] ?? layout?.[camelName]) || 0
}

/** 固定原始宽度后再读 flex/grid 分配宽度，最多两轮且不监听输出字号。 */
async function measure(ticket) {
  await nextTick()
  const [box, probe] = await readLayout()
  if (disposed || ticket !== generation || !(box?.width > 0)) return
  const baseSize = pixels(box, 'font-size') || (probe?.height > 0 ? probe.height / 1.2 : 18)
  const width = probe?.width > 0 ? probe.width : estimateAmountWidth(props.text, baseSize)
  naturalWidth.value = width
  await nextTick()
  const [allocated] = await readLayout()
  if (disposed || ticket !== generation) return
  const contentWidth = (allocated?.width || box.width) - pixels(allocated || box, 'padding-left')
    - pixels(allocated || box, 'padding-right') - pixels(allocated || box, 'border-left-width')
    - pixels(allocated || box, 'border-right-width')
  fontSize.value = fitAmountFontSize(baseSize, width, contentWidth)
}

/** 合并同帧的值和视口变化，并使过期查询失效。 */
function scheduleMeasure() {
  if (disposed) return
  const ticket = ++generation
  clearTimeout(timer)
  timer = setTimeout(() => measure(ticket), 0)
}

watch(() => props.text, scheduleMeasure, { flush: 'post' })
onMounted(() => {
  unsubscribe = subscribeAmountResize(scheduleMeasure)
  if (typeof ResizeObserver !== 'undefined') {
    const parent = proxy?.$el?.parentElement
    if (parent) {
      resizeObserver = new ResizeObserver(scheduleMeasure)
      resizeObserver.observe(parent)
    }
  }
  scheduleMeasure()
})
onActivated(scheduleMeasure)
onShow(scheduleMeasure)
onBeforeUnmount(() => {
  disposed = true
  generation++
  clearTimeout(timer)
  resizeObserver?.disconnect()
  unsubscribe?.()
})
</script>

<style scoped>
.amount-text {
  position: relative;
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  flex-shrink: 1;
  box-sizing: border-box;
  align-items: baseline;
  vertical-align: baseline;
  font-size: var(--type-money-size, 18px);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap !important;
  word-break: keep-all !important;
  overflow-wrap: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
}
.amount-text__value, .amount-text__probe {
  display: block;
  flex: none;
  white-space: nowrap !important;
  word-break: keep-all !important;
  overflow-wrap: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  letter-spacing: inherit;
}
.amount-text__probe {
  position: absolute;
  top: 0;
  left: 0;
  width: max-content;
  max-width: none;
  visibility: hidden;
  pointer-events: none;
  line-height: 1.2;
}
</style>
