import { getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'

const VISIBLE_SETTLE_MS = 64
const NEARBY_SETTLE_MS = 160

/** 短暂掠过时不放行新下载，可见稳定后优先加载；缓存直显由组件独立处理。 */
export function useImageVisibility(isLazy, selector) {
  const instance = getCurrentInstance()
  const supported = instance?.proxy && typeof uni !== 'undefined' && typeof uni.createIntersectionObserver === 'function'
  let delayed = supported && isLazy()
  const canRequest = ref(!delayed)
  const priority = ref(delayed ? 1 : 0)
  canRequest.priority = priority
  let nearby = canRequest.value, inViewport = false, pageActive = true, disposed = false
  let admissionTimer = null, scheduledPriority = null
  const observers = []

  function stopAdmission() {
    clearTimeout(admissionTimer)
    admissionTimer = null
    scheduledPriority = null
  }

  function update() {
    priority.value = inViewport || !delayed ? 0 : 1
    if (!pageActive || !nearby || disposed) {
      stopAdmission()
      canRequest.value = false
      return
    }
    if (canRequest.value) return
    if (!delayed) { canRequest.value = true; return }
    if (admissionTimer && scheduledPriority === priority.value) return
    stopAdmission()
    scheduledPriority = priority.value
    admissionTimer = setTimeout(() => {
      admissionTimer = null
      if (pageActive && nearby && !disposed) canRequest.value = true
    }, inViewport ? VISIBLE_SETTLE_MS : NEARBY_SETTLE_MS)
  }

  onHide(() => { pageActive = false; update() })
  onShow(() => { pageActive = true; update() })
  onBeforeUnmount(() => {
    disposed = true
    stopAdmission()
    observers.forEach(observer => observer.disconnect())
  })
  if (!delayed) return canRequest
  onMounted(() => {
    try {
      const near = uni.createIntersectionObserver(instance.proxy, { thresholds: [0] })
      observers.push(near)
      near.relativeToViewport({ top: 160, bottom: 240 }).observe(selector, result => {
        if (disposed) return
        nearby = Number(result.intersectionRatio) > 0
        if (!nearby) inViewport = false
        update()
      })
      const visible = uni.createIntersectionObserver(instance.proxy, { thresholds: [0] })
      observers.push(visible)
      visible.relativeToViewport().observe(selector, result => {
        if (disposed) return
        inViewport = Number(result.intersectionRatio) > 0
        if (inViewport) nearby = true
        update()
      })
    } catch (error) {
      observers.forEach(observer => observer.disconnect())
      stopAdmission()
      delayed = false
      nearby = true
      priority.value = 0
      canRequest.value = pageActive
      console.warn('[ImageVisibility] 可见区观察不可用，使用正常图片加载:', error)
    }
  })
  return canRequest
}
