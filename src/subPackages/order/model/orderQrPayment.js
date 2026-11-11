/** 订单页扫码收银：沿用线上到账事实，只有订单确认成功才结束；不跳充值页。 */
export function createOrderQrPayment({ storage, createIntent, readStatus, confirmOrder, onChange, onPaid, isCurrent = () => true }) {
  let state = { phase: 'idle', intent: null, error: '' }
  let opening = null
  let checking = null
  let disposed = false
  const active = () => !disposed && isCurrent()
  const publish = patch => { if (active()) { state = { ...state, ...patch }; onChange({ ...state }) } }
  const remember = intent => { if (active()) { storage.set(intent); publish({ intent }) } }
  const cents = value => Math.round(Number(value) * 100)

  /** 到账后只重试同一笔订单确认，失败不创建第二张收款码。 */
  async function settle(intent) {
    publish({ phase: 'confirming', error: '' })
    try {
      const paymentResult = await confirmOrder(intent)
      if (!active()) return
      storage.remove()
      publish({ phase: 'paid', intent, paymentResult, error: '' })
      onPaid(paymentResult)
    } catch (error) {
      publish({ phase: 'confirm-error', error: error?.message || '', intent })
    }
  }

  /** 只读服务端到账状态；金额或单号不符时拒绝自动扣款。 */
  function check() {
    if (checking) return checking
    checking = (async () => {
      const intent = state.intent
      if (!intent?.rechargeNo || !active() || state.phase === 'paid') return
      try {
        const result = await readStatus(intent.rechargeNo)
        if (!active()) return
        if (String(result.rechargeNo) !== String(intent.rechargeNo) || cents(result.amount) !== cents(intent.amount)) {
          publish({ phase: 'error', error: 'PAYMENT_FACT_MISMATCH' }); return
        }
        if (result.status === 2) {
          const received = { ...intent, received: true, codeUrl: '' }
          remember(received)
          await settle(received)
        } else if ([3, 4].includes(result.status)) {
          storage.remove()
          publish({ phase: 'closed', intent: { ...intent, codeUrl: '' }, error: '' })
        } else {
          publish({ phase: intent.codeUrl ? 'pending' : 'unknown', error: '' })
        }
      } catch (error) {
        publish({ error: error?.message || '' })
      }
    })().finally(() => { checking = null })
    return checking
  }

  /** 同一订单重复点击、关窗或刷新均复用原请求；金额变化时不覆盖未终结的收款。 */
  function open(context) {
    if (opening) return opening
    opening = (async () => {
      if (!active() || state.phase === 'paid') return
      let saved = state.phase === 'closed' ? null : storage.get()
      if (saved && (cents(saved.amount) !== cents(context.amount) || saved.accountCustomerId !== context.accountCustomerId
        || saved.fundAccountCode !== context.fundAccountCode)) {
        publish({ phase: 'error', intent: saved, error: 'PAYMENT_CONTEXT_CHANGED' }); return
      }
      const intent = saved || { ...context, clientRequestId: 'order-qr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12) }
      remember(intent)
      if (intent.received || intent.rechargeNo) {
        await check()
        if (!active() || ['paid', 'confirm-error', 'closed', 'error'].includes(state.phase)) return
        if (intent.codeUrl) return
      }
      publish({ phase: 'creating', error: '' })
      try {
        const response = await createIntent(intent)
        if (!active()) return
        if (!response?.rechargeNo) { publish({ phase: 'unknown', error: '' }); return }
        const next = { ...intent, rechargeNo: response.rechargeNo, codeUrl: response.codeUrl || '', expiresAtUtc: response.expiresAtUtc }
        remember(next)
        publish({ phase: next.codeUrl ? 'pending' : 'unknown' })
        await check()
      } catch (error) {
        publish({ phase: 'error', error: error?.message || '' })
      }
    })().finally(() => { opening = null })
    return opening
  }
  return { open, check, dispose() { disposed = true }, getState: () => ({ ...state }) }
}
