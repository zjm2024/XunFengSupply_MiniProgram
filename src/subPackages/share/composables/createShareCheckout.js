import { prepareShareOrder, createShareOrder } from '../api/shareOrderApi.js'
import { newShareRequestId } from '../model/dealerShareIntent.js'
import { getShareCheckoutAreas, getShareCheckoutCarriers, previewShareCheckout } from '../api/shareCheckoutApi.js'

/** 独立结算编排；收件信息只随当前请求经过，不写状态/草稿，预览凭证留闭包。 */
export function createShareCheckout({ getAccess, getDraft, onChange, onSessionError, onCreated,
  api = { getShareCheckoutAreas, getShareCheckoutCarriers, previewShareCheckout, prepareShareOrder, createShareOrder }, schedule = setTimeout, cancel = clearTimeout, clock = () => Date.now() }) {
  let generation = 0, previewGeneration = 0, active = false, timer = null, quote = null, submission = null
  const state = { phase: 'idle', busy: false, locked: false, error: '', provinces: [], carriers: [], preview: null }
  /** 状态只有安全展示字段，不含收件表单、CSRF或预览凭证。 */
  function emit() { onChange(JSON.parse(JSON.stringify(state))) }
  /** 清除旧预览及计时，购买/收件信息变化不自动重新请求。 */
  function invalidate() {
    previewGeneration++; quote = null; submission = null; state.locked = false; state.preview = null
    if (timer !== null) cancel(timer); timer = null
    if (state.phase === 'preview') state.phase = 'editing'
    state.busy = false; emit()
  }
  /** 当前访客仍有效且页面可见才接受异步结果。 */
  function current(version) { return active && generation === version && !!getAccess() }
  /** 购物意向仅取本地勾选项，修订与内容共同用于迟到响应检测。 */
  function selection() {
    const draft = getDraft()
    if (!draft || !Number.isSafeInteger(draft.localCartRevision) || draft.localCartRevision < 0 || !Array.isArray(draft.items)) return null
    const items = draft.items.filter(item => item.selected).map(item => ({ skuId: item.skuId, quantity: item.quantity }))
      .sort((left, right) => left.skuId < right.skuId ? -1 : left.skuId > right.skuId ? 1 : 0)
    return items.length ? { items, localCartRevision: draft.localCartRevision } : null
  }
  /** 错误信息不携带请求或原始响应；鉴权终态交回父级会话处理。 */
  function fail(error) {
    state.busy = false; quote = null; submission = null; state.preview = null
    if ([401, 403, 410].includes(error?.httpStatus)) { reset(); onSessionError?.(error); return }
    state.error = error?.httpStatus === 429 ? 'limited' : error?.httpStatus === 409 ? 'changed' : error instanceof TypeError ? 'input' : 'retry'
    state.phase = 'editing'; emit()
  }
  /** 获取独立地区及承运商，不从经销商地址簿加载资料。 */
  async function open() {
    reset(); active = true
    if (!getAccess()) return false
    if (!selection()) { state.phase = 'editing'; state.error = 'empty'; emit(); return false }
    const version = generation; state.phase = 'loading'; state.busy = true; emit()
    try {
      const access = getAccess(), [provinces, carriers] = await Promise.all([
        api.getShareCheckoutAreas({ ...access, expectedLevel: 1 }), api.getShareCheckoutCarriers(access)])
      if (!current(version)) return false
      state.provinces = provinces; state.carriers = carriers; state.phase = 'editing'; state.busy = false
      if (!provinces.length || !carriers.length) state.error = 'unavailable'
      emit(); return true
    } catch (error) { if (current(version)) fail(error); return false }
  }
  /** 级联地区请求不带收件信息，父表单负责丢弃旧父级响应。 */
  async function areas(parentCode, expectedLevel) {
    if (!active || !getAccess()) return []
    const version = generation
    try {
      const rows = await api.getShareCheckoutAreas({ ...getAccess(), parentCode, expectedLevel })
      return current(version) ? rows : []
    } catch (error) { if (current(version)) fail(error); throw error }
  }
  /** 预览只取当前勾选意向和手填字段，禁止陈旧响应覆盖新表单/草稿。 */
  async function preview(input) {
    if (!active || !getAccess() || state.busy || submission || !['editing', 'preview'].includes(state.phase)) return false
    invalidate(); const selected = selection()
    if (!selected) { state.error = 'empty'; emit(); return false }
    const version = generation, requestVersion = ++previewGeneration, started = clock(), stamp = JSON.stringify(selected)
    state.busy = true; state.error = ''; emit()
    try {
      const result = await api.previewShareCheckout({ ...getAccess(), ...selected,
        address: input?.address, expressCompanyCode: input?.expressCompanyCode, remark: input?.remark })
      if (!current(version) || requestVersion !== previewGeneration) return false
      if (stamp !== JSON.stringify(selection())) { state.busy = false; state.error = 'changed'; emit(); return false }
      const remaining = Date.parse(result.expiresAtUtc) - Date.parse(result.serverNowUtc) - Math.max(0, clock() - started)
      if (!(remaining > 0)) { state.busy = false; state.error = 'changed'; emit(); return false }
      quote = result
      state.preview = { items: result.items, goodsAmount: result.goodsAmount, freightAmount: result.freightAmount,
        payableAmount: result.payableAmount, expiresAtUtc: result.expiresAtUtc, serverNowUtc: result.serverNowUtc }
      state.phase = 'preview'; state.busy = false
      timer = schedule(() => { if (!current(version) || requestVersion !== previewGeneration) return; invalidate(); if (active) { state.error = 'expired'; emit() } }, remaining)
      emit(); return true
    } catch (error) { if (current(version) && requestVersion === previewGeneration) fail(error); return false }
  }
  /** 只提交已确认的预览；重复点击及未知重试都复用同一意图/票据。 */
  async function submit() {
    if (!active || !getAccess() || state.busy || !quote || state.phase !== 'preview') return false
    const version = generation
    if (!submission) submission = { ...quote, clientRequestId: newShareRequestId(), ticket: null }
    const pending = submission
    state.locked = true
    state.busy = true; state.error = ''; if (timer !== null) cancel(timer); timer = null; emit()
    try {
      if (!pending.ticket) pending.ticket = await api.prepareShareOrder(getAccess(), pending)
      if (!current(version)) return false
      const result = await api.createShareOrder(getAccess(), pending, pending.ticket)
      if (!current(version)) return false
      state.busy = false; state.phase = 'created'; emit(); await onCreated?.(result); return true
    } catch (error) {
      if (!current(version)) return false
      if ([401,403,409,410].includes(error?.httpStatus)) { fail(error); return false }
      state.busy = false; state.error = 'retry'; emit(); return false
    }
  }
  /** 草稿或表单改变后取消旧预览，仍保留当前页手填表单供用户修改。 */
  function changed() { if (!active || submission) return; invalidate(); state.error = ''; emit() }
  /** 隐藏/退出丢弃凭据、价格和选项，恢复必须重新授权并手填。 */
  function reset() {
    active = false; generation++; invalidate()
    state.phase = 'idle'; state.error = ''; state.provinces = []; state.carriers = []; emit()
  }
  emit()
  return { open, areas, preview, submit, changed, reset }
}
