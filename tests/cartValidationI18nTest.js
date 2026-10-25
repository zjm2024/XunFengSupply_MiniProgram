import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ dispatch: vi.fn() }))
vi.mock('@/shared/api/dispatchClient.js', () => ({ dispatch: mocks.dispatch }))
let i18n

beforeEach(async () => {
  vi.resetModules()
  mocks.dispatch.mockReset()
  i18n = await import('@/shared/i18n/index.js')
  const { registerMainLocales } = await import('@/app/i18n/registerMain.js')
  registerMainLocales()
  vi.stubGlobal('uni', { showToast: vi.fn(), getStorageSync: vi.fn(), setStorageSync: vi.fn(), removeStorageSync: vi.fn() })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** 加载两条实际使用的购物车 API 路径，不注册或导入分包资源。 */
async function apiFor(owner) {
  return owner === 'shared' ? import('@/shared/api/cartApi.js') : import('@/subPackages/commerce/api/cartApi.js')
}

describe.each(['shared', 'commerce'])('%s 购物车本地错误与请求契约', owner => {
  it.each([
    ['addToCart', { skuId: 0, quantity: 1 }, 'A valid SKU ID is required'],
    ['batchAddToCart', { items: [] }, 'Select product variants to purchase'],
    ['batchAddToCart', { items: Array.from({ length: 51 }, (_, index) => ({ skuId: index + 1, quantity: 1 })) },
      'Select up to 50 variants in one batch'],
    ['batchUpdateQuantity', [], 'At least one quantity change is required'],
    ['removeItems', [], 'Select items to delete'],
    ['selectItems', { cartItemIds: [] }, 'Select items whose selection should change'],
  ])('%s 无效输入保留同一个可重新取词的 Error，不派发请求或新增错误码', async (method, input, english) => {
    const api = await apiFor(owner)
    const error = await api[method](input).catch(value => value)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toMatch(/[一-龥]/)
    expect(error.errorCode).toBeUndefined()
    expect(error.code).toBeUndefined()
    expect(error.httpStatus).toBeUndefined()
    expect(error.retryable).toBe(false)
    i18n.setLocale('en')
    expect(error.message).toBe(english)
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })

  it('在途批量请求只发原模块/方法/字段，语言不进入 SKU、数量和幂等键', async () => {
    let complete
    mocks.dispatch.mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    const api = await apiFor(owner)
    const pending = api.batchAddToCart({ items: [{ skuId: 11, quantity: 2 }], clientRequestId: 'batch-stable' })
    i18n.setLocale('en')
    expect(mocks.dispatch).toHaveBeenCalledTimes(1)
    expect(mocks.dispatch).toHaveBeenCalledWith('MallOrder', 'Mini.CartController', 'BatchAddToCart', {
      Items: [{ SkuId: 11, Quantity: 2 }], ClientRequestId: 'batch-stable',
    })
    complete({ accepted: true })
    await expect(pending).resolves.toEqual({ accepted: true })
    expect(mocks.dispatch).toHaveBeenCalledTimes(1)
  })
})

describe('主包实际使用的 shared 购物车路径', () => {
  it.each([true, false])('真实 shared Hook 在途切换保留原合并或读回路径（返回条目=%s）', async hasItem => {
    const { createPinia, setActivePinia } = await import('pinia')
    setActivePinia(createPinia())
    let complete
    mocks.dispatch.mockImplementation((_module, _controller, method) => method === 'AddToCart'
      ? new Promise(resolve => { complete = resolve }) : Promise.resolve({ Items: [] }))
    const { useCart } = await import('@/shared/composables/useCart.js')
    const hook = useCart({ autoSchedule: false })
    const pending = hook.addCartItem({ skuId: 11, quantity: 2 })
    i18n.setLocale('en')
    expect(mocks.dispatch).toHaveBeenCalledTimes(1)
    const serverItem = { cartItemId: 1, skuId: 11, quantity: 2, name: '原商品' }
    complete(hasItem ? serverItem : null)
    await expect(pending).resolves.toBe(true)
    expect(mocks.dispatch.mock.calls.map(call => call[2])).toEqual(hasItem ? ['AddToCart'] : ['AddToCart', 'GetCart'])
    if (hasItem) expect(hook.cartStore.items).toEqual([serverItem])
    else expect(hook.cartStore.items).toEqual([])
    expect(uni.showToast).toHaveBeenLastCalledWith({ title: 'Added to cart', icon: 'success' })
  })

  it('新本地 Error 仍不可自动重试，语言变化不触发调度器写入', async () => {
    vi.useFakeTimers()
    const api = await apiFor('shared')
    const error = await api.batchUpdateQuantity([]).catch(value => value)
    const { createCartSyncScheduler } = await import('@/shared/services/cartSyncScheduler.js')
    const batchUpdate = vi.fn().mockRejectedValue(error)
    const scheduler = createCartSyncScheduler({ api: { batchUpdate, select: vi.fn(), selectAll: vi.fn(), remove: vi.fn() } })
    scheduler.enqueueQuantity(1, 2)
    await expect(scheduler.flush({ throwOnError: true })).rejects.toBe(error)
    i18n.setLocale('en')
    await vi.advanceTimersByTimeAsync(3000)
    expect(batchUpdate).toHaveBeenCalledTimes(1)
    expect(error.message).toBe('At least one quantity change is required')
    scheduler.dispose()
  })
})
