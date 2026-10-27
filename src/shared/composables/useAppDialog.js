import { computed, reactive, shallowRef } from 'vue'

const activeHost = shallowRef(null)

const state = reactive({
  visible: false,
  title: '',
  description: '',
  confirmText: '',
  cancelText: '',
  showCancel: true,
  danger: false,
  closeOnOverlay: true,
  input: null,
  resolve: null,
})

/** 统一打开应用内确认框，返回用户是否确认；不调用系统原生弹框。 */
export function openAppDialog(options = {}) {
  if (state.visible) settleAppDialog(false)
  state.title = String(options.title ?? '')
  state.description = String(options.description ?? options.content ?? '')
  state.confirmText = options.confirmText == null ? '' : String(options.confirmText)
  state.cancelText = options.cancelText == null ? '' : String(options.cancelText)
  state.showCancel = options.showCancel !== false
  state.danger = options.danger === true
  state.closeOnOverlay = options.closeOnOverlay !== false
  state.input = null
  state.visible = true
  return new Promise(resolve => { state.resolve = resolve })
}

/** 打开带单行输入的应用内弹框，返回 { confirmed, content }。 */
export function openAppPrompt(options = {}) {
  const result = openAppDialog(options)
  state.input = { placeholder: String(options.placeholder ?? ''), value: String(options.value ?? '') }
  return result
}

/** 提供共享内容及当前页面宿主的显示状态，调用方仍使用统一弹框入口。 */
export function useAppDialog(hostId = null) {
  return {
    state: computed(() => state),
    visible: computed(() => state.visible && (hostId === null || activeHost.value === hostId)),
  }
}

/** 激活当前页面宿主；其他页面尚未结束的确认按取消处理。 */
export function activateAppDialogHost(hostId) {
  if (activeHost.value !== null && activeHost.value !== hostId && state.visible) settleAppDialog(false)
  activeHost.value = hostId
}

/** 页面隐藏或销毁时取消待确认操作，旧页面不能关闭新页面的弹框。 */
export function deactivateAppDialogHost(hostId) {
  if (activeHost.value !== hostId) return
  settleAppDialog(false)
  activeHost.value = null
}

/** 结束当前弹框并将结果交给调用方；关闭、取消都视为未确认。 */
export function settleAppDialog(confirmed, hostId = null) {
  if (hostId !== null && activeHost.value !== hostId) return
  const resolve = state.resolve
  const result = state.input ? { confirmed: Boolean(confirmed), content: state.input.value } : Boolean(confirmed)
  state.resolve = null
  state.visible = false
  state.input = null
  if (typeof resolve === 'function') resolve(result)
}

/** 更新全局输入框的临时值，不触碰任何业务数据或接口请求。 */
export function updateAppDialogInput(value, hostId = null) {
  if (hostId !== null && activeHost.value !== hostId) return
  if (state.input) state.input.value = String(value ?? '')
}
