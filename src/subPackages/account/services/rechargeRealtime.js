/** 由同一 API 配置推导实时通知地址；认证令牌只放在握手子协议中。 */
export function resolvePaymentRealtimeUrl({ dispatchUrl = import.meta.env.VITE_DISPATCH_URL || '',
  baseUrl = import.meta.env.VITE_API_BASE_URL || '',
  override = import.meta.env.VITE_PAYMENT_WS_URL || '',
  origin = typeof location === 'undefined' ? '' : location.origin } = {}) {
  let url = override
  if (!url) {
    const endpoint = /^https?:\/\//i.test(dispatchUrl) ? dispatchUrl : baseUrl.replace(/\/$/, '') + (dispatchUrl || '/api/dispatch')
    url = endpoint.replace(/\/api\/dispatch(?:\?.*)?$/, '/api/realtime/payment')
    if (url === endpoint) return ''
  }
  if (url.startsWith('/')) url = origin + url
  url = url.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:')
  return /^wss?:\/\/[^/?#]+\/[^?#]*$/i.test(url) ? url : ''
}

/** 仅在可见的待充值页面连接；SocketTask 独立监听，重连/心跳不查询渠道。 */
export function createRechargeRealtime({ getToken, refresh, connectSocket = options => uni.connectSocket(options),
  getUrl = resolvePaymentRealtimeUrl, random = Math.random, now = Date.now }) {
  let generation = 0, current = null, socket = null, connected = false, attempts = 0, lastVersion = 0
  let reconnectTimer, heartbeatTimer, handshakeTimer, fallbackTimer, recoveryTimer, deadlineTimer
  let lastPong = 0, lastFallback = -Infinity, refreshPromise = null, dirty = false, retryReads = 0

  /** 停止连接、计时器和旧回调，已经提交的支付由前台补查恢复。 */
  function stop() {
    generation++
    current = null
    connected = false
    for (const timer of [reconnectTimer, heartbeatTimer, handshakeTimer, fallbackTimer, recoveryTimer, deadlineTimer]) clearTimeout(timer)
    const old = socket
    socket = null
    try { old?.close({ code: 1000, reason: 'inactive' }) } catch (_) { /* 已断开的 SocketTask 无需重复关闭。 */ }
  }

  /** 合并重复通知；通知到达已有查询期间时在完成后再读取，避免读取提交前的旧结果。 */
  function readStatus(id, reason) {
    if (id !== generation || !current) return
    if (refreshPromise) { dirty = true; return }
    refreshPromise = Promise.resolve().then(() => id === generation ? refresh({ reason, afterCurrent: true }) : null)
      .then(status => {
        if (id !== generation) return
        if ([2, 3, 4].includes(status)) { stop(); return }
        if (status == null && retryReads++ < 2) {
          clearTimeout(recoveryTimer)
          recoveryTimer = setTimeout(() => readStatus(id, 'read-retry'), retryReads * 4000)
        } else if (status == null) scheduleFallback(id)
        else {
          retryReads = 0
          clearTimeout(recoveryTimer)
          if (connected) { clearTimeout(fallbackTimer); fallbackTimer = null }
        }
      }).catch(() => { if (id === generation) scheduleFallback(id) })
      .finally(() => {
        refreshPromise = null
        if (dirty) { dirty = false; if (current) readStatus(generation, 'coalesced') }
      })
  }

  /** 仅断线或状态读取失败时低频补查，单连接有抖动且最长三十分钟，正常连接不轮询。 */
  function scheduleFallback(id) {
    if (id !== generation || !current || fallbackTimer) return
    fallbackTimer = setTimeout(() => {
      fallbackTimer = null
      if (id !== generation || !current) return
      lastFallback = now()
      readStatus(id, 'fallback')
      if (!connected) scheduleFallback(id)
    }, Math.max(0, 60000 - (now() - lastFallback)) + Math.floor(random() * 15000))
  }

  /** SocketTask 发送失败统一进入断线恢复，调用方不操作全局 socket。 */
  function send(task, data, id) {
    try { task.send({ data: JSON.stringify(data), fail: () => disconnected(task, id) }) }
    catch (_) { disconnected(task, id) }
  }

  /** 关闭旧连接并指数退避重连；重复 error/close 回调只安排一次。 */
  function disconnected(task, id) {
    if (id !== generation || (task && task !== socket)) return
    connected = false
    const old = socket
    socket = null
    clearTimeout(handshakeTimer)
    clearTimeout(heartbeatTimer)
    try { old?.close({ code: 1000, reason: 'reconnect' }) } catch (_) { /* 失效连接由原生层回收。 */ }
    scheduleFallback(id)
    if (!reconnectTimer && current) {
      const delay = Math.min(30000, 2000 * 2 ** Math.min(attempts++, 4)) + Math.floor(random() * 2000)
      reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(id) }, delay)
    }
  }

  /** 应用层心跳只检查传输存活；超时后通过重连补查恢复。 */
  function heartbeat(task, id) {
    heartbeatTimer = setTimeout(() => {
      if (id !== generation || task !== socket) return
      if (now() - lastPong > 55000) { disconnected(task, id); return }
      send(task, { type: 'ping' }, id)
      if (task === socket) heartbeat(task, id)
    }, 25000)
  }

  /** 连接后先订阅当前单号，只有收到授权确认才标记健康并补查本地状态。 */
  function connect(id) {
    if (id !== generation || !current) return
    const token = String(getToken() || '')
    if (!token || token !== current.token) { stop(); return }
    const url = getUrl()
    if (!url) { disconnected(null, id); return }
    let task
    try {
      task = connectSocket({ url, protocols: ['xunfeng.payment.v1', 'auth.jwt.' + token],
        complete: () => {} })
      if (!task?.onOpen || !task?.onMessage || !task?.onClose || !task?.onError) throw new Error('SocketTask unavailable')
      socket = task
      handshakeTimer = setTimeout(() => disconnected(task, id), 12000)
      task.onOpen(() => {
        if (id === generation && task === socket) send(task, { type: 'subscribe', rechargeNo: current.rechargeNo }, id)
      })
      task.onMessage(({ data }) => {
        if (id !== generation || task !== socket || typeof data !== 'string' || data.length > 2048) return
        let message
        try { message = JSON.parse(data) } catch (_) { return }
        if (!message || typeof message !== 'object') return
        if (message.type === 'pong') { lastPong = now(); return }
        if (message.type === 'denied') { stop(); return }
        if (message.rechargeNo !== current.rechargeNo) return
        if (message.type === 'subscribed') {
          if (connected) return
          connected = true
          attempts = 0
          lastPong = now()
          clearTimeout(handshakeTimer)
          clearTimeout(fallbackTimer)
          fallbackTimer = null
          readStatus(id, 'subscribed')
          heartbeat(task, id)
        } else if (message.type === 'changed' && connected && Number.isSafeInteger(message.version)
          && message.version > lastVersion) {
          lastVersion = message.version
          readStatus(id, 'changed')
        }
      })
      task.onClose(event => {
        if (id !== generation || task !== socket) return
        if (event?.code === 1008) stop()
        else disconnected(task, id)
      })
      task.onError(() => disconnected(task, id))
    } catch (_) { disconnected(null, id) }
  }

  /** 同一待支付上下文只保留一个连接，账号或充值单改变时隔离全部旧回调。 */
  function start(rechargeNo) {
    const token = String(getToken() || '')
    if (!rechargeNo || !token) { stop(); return }
    if (current?.rechargeNo === rechargeNo && current.token === token) return
    stop()
    const id = generation
    current = { rechargeNo: String(rechargeNo), token }
    attempts = 0
    lastVersion = 0
    lastFallback = -Infinity
    retryReads = 0
    dirty = false
    fallbackTimer = null
    reconnectTimer = null
    deadlineTimer = setTimeout(stop, 30 * 60 * 1000)
    connect(id)
  }
  return { start, stop }
}
