import { computed, ref } from 'vue'
import { getProgressCaptcha, queryApplicationStatus, verifyProgressCaptcha } from '../api/auth.js'

/** 查询交互：只在主动点击时取图，条件/关闭/离开变化使在途结果失效，凭证不保存。 */
export function useApplicationProgressQuery({ onResult, now = Date.now, api = {} } = {}) {
  const identifier = ref(''), challenge = ref(null), visible = ref(false)
  const loading = ref(false), verifying = ref(false), querying = ref(false), verified = ref(false)
  const error = ref(null), notFound = ref(false), nextRefreshAt = ref(0), nextQueryAt = ref(0)
  let revision = 0
  const busy = computed(() => loading.value || verifying.value || querying.value)
  const normalized = () => identifier.value.trim().toUpperCase()
  const valid = () => /^(1[3-9]\d{9}|APP[A-Z0-9]{1,47})$/.test(normalized())
  const local = key => ({ key: 'auth.progress.' + key })
  const current = (version, value) => revision === version && visible.value && normalized() === value
  const get = api.get || getProgressCaptcha, check = api.verify || verifyProgressCaptcha, query = api.query || queryApplicationStatus

  /** 关闭立即作废原请求标识，迟到的成功不能触发查询或导航。 */
  function close() {
    revision++; visible.value = false; challenge.value = null
    loading.value = false; verifying.value = false; querying.value = false; verified.value = false
  }
  /** 输入变更只清理旧挑战，不自动请求新图。 */
  function invalidate() { close(); error.value = null; notFound.value = false }
  /** 查询按钮校验后直接弹出图片验证，避免输入过程请求。 */
  async function start() {
    if (busy.value || visible.value) return
    error.value = null; notFound.value = false
    if (!valid()) { error.value = local('invalidIdentifier'); return }
    if (now() < Math.max(nextRefreshAt.value, nextQueryAt.value)) { error.value = local('frequent'); return }
    visible.value = true
    await refresh()
  }
  /** 单次主动取图，三秒冷却，图片失败或错位均不递归自动刷新。 */
  async function refresh() {
    if (busy.value || !visible.value) return
    if (now() < nextRefreshAt.value) { error.value = local('frequent'); return }
    const value = normalized(), version = ++revision
    nextRefreshAt.value = now() + 3000
    loading.value = true; challenge.value = null; verified.value = false; error.value = null
    try {
      const result = await get(value)
      if (!current(version, value)) return
      if (!result?.captchaId || !result?.backgroundImageBase64 || !result?.pieceImageBase64) throw local('imageFailed')
      challenge.value = { ...result, expiresAt: now() + Number(result.expiresIn || 300) * 1000 }
    } catch (failure) { if (current(version, value)) error.value = failure?.message || failure?.key ? failure : local('imageFailed') }
    finally { if (revision === version) loading.value = false }
  }
  /** 双图失败只提示并禁用拖动，保留输入，由用户主动换图。 */
  function imageError() { error.value = local('imageFailed') }
  /** 每张挑战仅发一次验证；通过后自动提交一次查询，结果复用现有详情。 */
  async function verify(offsetX) {
    if (busy.value || !visible.value || !challenge.value) return
    if (now() >= challenge.value.expiresAt) { error.value = local('expired'); challenge.value = null; return }
    const value = normalized(), version = revision, captchaId = challenge.value.captchaId
    verifying.value = true; error.value = null
    try {
      const proof = await check(value, captchaId, offsetX)
      if (!current(version, value)) return
      if (!proof?.verificationToken) throw local('verificationFailed')
      verified.value = true; querying.value = true; nextQueryAt.value = now() + 5000
      const result = await query(value, proof.verificationToken)
      if (!current(version, value)) return
      visible.value = false; challenge.value = null
      if (!result) { notFound.value = true; return }
      await onResult?.(result, value)
    } catch (failure) {
      if (revision === version) { error.value = failure?.message || failure?.key ? failure : local('verificationFailed'); challenge.value = null; visible.value = false }
    } finally {
      if (revision === version) { verifying.value = false; querying.value = false; verified.value = false }
    }
  }
  return { identifier, challenge, visible, loading, verifying, querying, verified, error, notFound, busy, nextQueryAt, nextRefreshAt, start, close, invalidate, refresh, verify, imageError }
}
