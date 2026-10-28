import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRechargeRealtime, resolvePaymentRealtimeUrl } from '@/subPackages/account/services/rechargeRealtime.js'

const clients = []
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-28T00:00:00Z')) })
afterEach(() => { clients.splice(0).forEach(client => client.stop()); vi.useRealTimers() })

/** 独立 SocketTask 替身，模拟原生事件及发送失败，不访问支付或网络。 */
function harness(options = {}) {
  let token = 'test.jwt.token'
  const tasks = []
  const connectSocket = vi.fn(config => {
    const handlers = {}
    const task = { config, handlers, send: vi.fn(), close: vi.fn(),
      onOpen: fn => { handlers.open = fn }, onMessage: fn => { handlers.message = fn },
      onClose: fn => { handlers.close = fn }, onError: fn => { handlers.error = fn },
      message: data => handlers.message({ data: JSON.stringify(data) }) }
    tasks.push(task)
    return task
  })
  const refresh = vi.fn(async () => 0)
  const client = createRechargeRealtime({ getToken: () => token, refresh, connectSocket,
    getUrl: () => 'wss://api.example.test/api/realtime/payment', random: () => 0, ...options })
  clients.push(client)
  return { client, tasks, connectSocket, refresh, setToken: value => { token = value },
    subscribe: () => { const task = tasks.at(-1); task.handlers.open(); task.message({ type: 'subscribed', rechargeNo: 'RC-1' }); return task } }
}

describe('充值实时通知生命周期', () => {
  it('推导地址支持绝对 API、H5 同源和代理前缀，拒绝 query token', () => {
    expect(resolvePaymentRealtimeUrl({ dispatchUrl: '/api/dispatch', baseUrl: 'https://api.test', override: '', origin: '' }))
      .toBe('wss://api.test/api/realtime/payment')
    expect(resolvePaymentRealtimeUrl({ dispatchUrl: '/api/dispatch', baseUrl: '/mini', override: '', origin: 'https://shop.test' }))
      .toBe('wss://shop.test/mini/api/realtime/payment')
    expect(resolvePaymentRealtimeUrl({ dispatchUrl: 'http://localhost:5002/api/dispatch', override: '' }))
      .toBe('ws://localhost:5002/api/realtime/payment')
    expect(resolvePaymentRealtimeUrl({ override: 'wss://api.test/api/realtime/payment?token=secret' })).toBe('')
    expect(resolvePaymentRealtimeUrl({ dispatchUrl: '/custom', baseUrl: '', override: '', origin: '' })).toBe('')
  })

  it('只订阅当前单，认证不进入 URL；健康时只发送心跳，收到变化才补查', async () => {
    const h = harness()
    h.client.start('RC-1')
    h.client.start('RC-1')
    expect(h.tasks).toHaveLength(1)
    const task = h.subscribe()
    expect(task.config.url).not.toContain('token')
    expect(task.config.protocols).toEqual(['xunfeng.payment.v1', 'auth.jwt.test.jwt.token'])
    expect(JSON.parse(task.send.mock.calls[0][0].data)).toEqual({ type: 'subscribe', rechargeNo: 'RC-1' })
    await vi.advanceTimersByTimeAsync(0)
    expect(h.refresh).toHaveBeenCalledTimes(1)
    for (let i = 0; i < 5; i++) { await vi.advanceTimersByTimeAsync(25000); task.message({ type: 'pong' }) }
    expect(h.refresh).toHaveBeenCalledTimes(1)
    task.message({ type: 'changed', rechargeNo: 'OTHER', version: 1 })
    task.message({ type: 'changed', rechargeNo: 'RC-1', version: 3 })
    task.message({ type: 'changed', rechargeNo: 'RC-1', version: 2 })
    task.message({ type: 'changed', rechargeNo: 'RC-1', version: 3 })
    await vi.advanceTimersByTimeAsync(0)
    expect(h.refresh).toHaveBeenCalledTimes(2)
  })

  it('回调重复、断线及重连不会创建充值；断线仅每分钟补查，恢复后停止补查', async () => {
    const h = harness()
    h.client.start('RC-1')
    const task = h.subscribe()
    await vi.advanceTimersByTimeAsync(0)
    task.handlers.error(); task.handlers.close()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.refresh).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(2000)
    expect(h.tasks).toHaveLength(2)
    h.subscribe()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.refresh).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(25000)
    h.tasks[1].message({ type: 'pong' })
    await vi.advanceTimersByTimeAsync(25000)
    h.tasks[1].message({ type: 'pong' })
    expect(h.refresh).toHaveBeenCalledTimes(3)
  })

  it.each([2, 3, 4])('读到已提交终态 %s 后清理所有连接与后台定时器', async status => {
    const h = harness()
    h.refresh.mockResolvedValue(status)
    h.client.start('RC-1'); const task = h.subscribe()
    await vi.advanceTimersByTimeAsync(0)
    expect(task.close).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(31 * 60 * 1000)
    expect(h.tasks).toHaveLength(1)
    expect(h.refresh).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('通知落在旧查询期间时，完成后追加一次查询，不丢失最后一次状态变化', async () => {
    let release
    const h = harness()
    h.refresh.mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
    h.client.start('RC-1'); const task = h.subscribe()
    await vi.advanceTimersByTimeAsync(0)
    task.message({ type: 'changed', rechargeNo: 'RC-1', version: 4 })
    task.message({ type: 'changed', rechargeNo: 'RC-1', version: 5 })
    release(0)
    await vi.advanceTimersByTimeAsync(0)
    expect(h.refresh).toHaveBeenCalledTimes(2)
  })

  it('切换单号、停止或退出登录后忽略旧连接与旧查询结果', async () => {
    const h = harness()
    h.client.start('RC-1'); const old = h.subscribe()
    await vi.advanceTimersByTimeAsync(0)
    h.client.start('RC-2')
    old.message({ type: 'changed', rechargeNo: 'RC-1', version: 99 }); old.handlers.close()
    expect(h.tasks).toHaveLength(2)
    expect(h.refresh).toHaveBeenCalledTimes(1)
    h.setToken(''); h.client.start('RC-2')
    await vi.advanceTimersByTimeAsync(120000)
    expect(h.tasks).toHaveLength(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('平台不支持 SocketTask 时低频降级，三十分钟后释放重试资源', async () => {
    const refresh = vi.fn(async () => 0)
    const h = harness({ connectSocket: () => undefined, refresh })
    h.client.start('RC-1')
    await vi.advanceTimersByTimeAsync(1799000)
    expect(refresh.mock.calls.length).toBeLessThanOrEqual(31)
    expect(refresh.mock.calls.length).toBeGreaterThan(20)
    await vi.advanceTimersByTimeAsync(1001)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('订阅后本地读失败只做有界重试，恢复成功后不继续轮询', async () => {
    const h = harness()
    h.refresh.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(0)
    h.client.start('RC-1'); const task = h.subscribe()
    await vi.advanceTimersByTimeAsync(12000)
    expect(h.refresh).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(25000); task.message({ type: 'pong' })
    expect(h.refresh).toHaveBeenCalledTimes(3)
  })
})
