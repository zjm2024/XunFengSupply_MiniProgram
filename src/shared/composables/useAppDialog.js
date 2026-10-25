import { computed, reactive } from 'vue'

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
  if (state.visible && typeof state.resolve === 'function') state.resolve(false)
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
  state.input = { placeholder: String(options.placeholder ?? ''), value: String(options.value ?? '') }
  const result = openAppDialog(options)
  state.input = { placeholder: String(options.placeholder ?? ''), value: String(options.value ?? '') }
  return result
}

/** 返回全局弹框状态给 App 宿主组件，页面只使用 openAppDialog。 */
export function useAppDialog() {
  return { state: computed(() => state) }
}

/** 结束当前弹框并将结果交给调用方；关闭、取消都视为未确认。 */
export function settleAppDialog(confirmed) {
  const resolve = state.resolve
  const result = state.input ? { confirmed: Boolean(confirmed), content: state.input.value } : Boolean(confirmed)
  state.resolve = null
  state.visible = false
  state.input = null
  if (typeof resolve === 'function') resolve(result)
}

/** 更新全局输入框的临时值，不触碰任何业务数据或接口请求。 */
export function updateAppDialogInput(value) {
  if (state.input) state.input.value = String(value ?? '')
}
