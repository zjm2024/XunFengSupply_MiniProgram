/** 估计原始展示文本宽度，不解析金额或转换计价单位。 */
export function estimateAmountWidth(text, fontSize) {
  const units = Array.from(String(text ?? '')).reduce((sum, character) =>
    sum + (/[^\x00-\xff]/.test(character) ? 1 : /[.,\s]/.test(character) ? 0.35 : 0.68), 0)
  return Math.max(1, units * fontSize)
}

/** 按容器宽度缩小字号；保留最低可读字号，避免金额被压成不可辨认的细线。 */
export function fitAmountFontSize(baseSize, naturalWidth, availableWidth) {
  if (!(baseSize > 0) || !(naturalWidth > 0) || !(availableWidth > 0)) return baseSize
  return Math.max(12, Math.floor(baseSize * Math.min(1, availableWidth / naturalWidth) * 100) / 100)
}

const resizeListeners = new Set()
/** 分发窗口变化。 */
function notifyResize() { resizeListeners.forEach(listener => listener()) }

/** 共用原生窗口监听，最后一个金额卸载时释放。 */
export function subscribeAmountResize(listener) {
  if (!resizeListeners.size && typeof uni !== 'undefined') uni.onWindowResize?.(notifyResize)
  resizeListeners.add(listener)
  return () => {
    resizeListeners.delete(listener)
    if (!resizeListeners.size && typeof uni !== 'undefined') uni.offWindowResize?.(notifyResize)
  }
}
