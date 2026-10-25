import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocaleReadCoordinator } from '@/shared/composables/localeReadCoordinator.js'
import { setLocale } from '@/shared/i18n/index.js'

/** 创建可控的只读响应，不使用真实网络或时间等待。 */
function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

/** 允许 Promise 调度开始下一个已排队的只读请求。 */
async function settle() {
  for (let i = 0; i < 6; i++) await Promise.resolve()
}

beforeEach(() => setLocale('zh-CN'))

describe('explicit locale-sensitive readonly projection coordinator', () => {
  it('does not apply a hidden-page response and resumes a single fresh read on return', async () => {
    const oldRead = deferred()
    const read = vi.fn().mockReturnValueOnce(oldRead.promise).mockResolvedValueOnce('resumed')
    const apply = vi.fn()
    const coordinator = createLocaleReadCoordinator({ read, apply })
    const pending = coordinator.activate()
    await settle()
    coordinator.deactivate()
    oldRead.resolve('hidden')
    await pending
    expect(apply).not.toHaveBeenCalled()
    expect(read).toHaveBeenCalledTimes(1)
    await coordinator.activate()
    expect(apply.mock.calls.map(call => call[0])).toEqual(['resumed'])
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('discards a late old-language read and applies one fresh read without changing facts', async () => {
    const oldRead = deferred()
    const latest = { customerStatus: { code: 'SERVER_ONLY', text: 'Server label' }, amount: 120.50,
      quantity: 3, occurredAt: '2026-10-25T00:00:00Z' }
    const read = vi.fn().mockReturnValueOnce(oldRead.promise).mockResolvedValueOnce(latest)
    const apply = vi.fn()
    const busy = vi.fn()
    const coordinator = createLocaleReadCoordinator({ read, apply, onBusy: busy })
    const pending = coordinator.activate()
    await settle()
    expect(read).toHaveBeenCalledTimes(1)
    setLocale('en-US')
    coordinator.localeChanged()
    expect(read).toHaveBeenCalledTimes(1)
    oldRead.resolve({ customerStatus: { text: '旧中文' } })
    await pending
    expect(read).toHaveBeenCalledTimes(2)
    expect(apply).toHaveBeenCalledTimes(1)
    expect(apply.mock.calls[0][0]).toBe(latest)
    expect(apply.mock.calls[0][1].locale).toBe('en-US')
    expect(busy.mock.calls).toEqual([[true], [false]])
  })

  it('defers hidden-page reload and marks the resumed projection as a locale-only refresh', async () => {
    const read = vi.fn().mockResolvedValue({ id: 18 })
    const apply = vi.fn()
    const coordinator = createLocaleReadCoordinator({ read, apply })
    await coordinator.activate()
    coordinator.deactivate()
    setLocale('en')
    await coordinator.localeChanged()
    expect(read).toHaveBeenCalledTimes(1)
    await coordinator.activate()
    expect(read).toHaveBeenCalledTimes(2)
    expect(apply.mock.calls[1][1]).toMatchObject({ locale: 'en-US', localeChanged: true })
  })

  it('coalesces language ABA changes and rejects the earlier generation even when the language matches again', async () => {
    const oldRead = deferred()
    const read = vi.fn().mockReturnValueOnce(oldRead.promise).mockResolvedValueOnce('fresh')
    const apply = vi.fn()
    const coordinator = createLocaleReadCoordinator({ read, apply })
    const pending = coordinator.activate()
    await settle()
    setLocale('en')
    coordinator.localeChanged()
    setLocale('zh-CN')
    coordinator.localeChanged()
    oldRead.resolve('stale')
    await pending
    expect(read).toHaveBeenCalledTimes(2)
    expect(apply.mock.calls.map(call => call[0])).toEqual(['fresh'])
  })

  it('does not retry a failed current-language read without explicit refresh', async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('ok')
    const onError = vi.fn()
    const coordinator = createLocaleReadCoordinator({ read, apply: vi.fn(), onError })
    await coordinator.activate()
    await settle()
    expect(read).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)
    await coordinator.refresh()
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('ignores stale-language errors and never shows them as a current-language failure', async () => {
    const oldRead = deferred()
    const read = vi.fn().mockReturnValueOnce(oldRead.promise).mockResolvedValueOnce('English')
    const onError = vi.fn()
    const apply = vi.fn()
    const coordinator = createLocaleReadCoordinator({ read, apply, onError })
    const pending = coordinator.activate()
    await settle()
    setLocale('en')
    coordinator.localeChanged()
    oldRead.reject(new Error('旧错误'))
    await pending
    expect(onError).not.toHaveBeenCalled()
    expect(apply.mock.calls.map(call => call[0])).toEqual(['English'])
  })

  it('queues only the latest read criteria without clearing the caller form', async () => {
    const oldRead = deferred()
    const form = { keyword: 'first', quantity: 3, remark: '原始备注' }
    const read = vi.fn().mockImplementationOnce(() => oldRead.promise)
      .mockImplementationOnce(() => Promise.resolve(form.keyword))
    const apply = vi.fn()
    const coordinator = createLocaleReadCoordinator({ read, apply })
    const pending = coordinator.activate()
    await settle()
    form.keyword = 'latest'
    coordinator.refresh()
    coordinator.refresh()
    oldRead.resolve('first')
    await pending
    expect(read).toHaveBeenCalledTimes(2)
    expect(apply.mock.calls.map(call => call[0])).toEqual(['latest'])
    expect(form).toEqual({ keyword: 'latest', quantity: 3, remark: '原始备注' })
  })

  it('does not create a second initial read when activate is called twice', async () => {
    const read = vi.fn().mockResolvedValue('ok')
    const coordinator = createLocaleReadCoordinator({ read, apply: vi.fn() })
    const first = coordinator.activate()
    const second = coordinator.activate()
    await Promise.all([first, second])
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('does not apply or create more reads after the page is unloaded', async () => {
    const oldRead = deferred()
    const read = vi.fn().mockReturnValueOnce(oldRead.promise)
    const apply = vi.fn()
    const coordinator = createLocaleReadCoordinator({ read, apply })
    const pending = coordinator.activate()
    await settle()
    coordinator.dispose()
    setLocale('en')
    coordinator.localeChanged()
    oldRead.resolve('stale')
    await pending
    await coordinator.activate()
    expect(read).toHaveBeenCalledTimes(1)
    expect(apply).not.toHaveBeenCalled()
  })
})
