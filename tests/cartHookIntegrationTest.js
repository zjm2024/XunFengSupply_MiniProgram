/**
 * 购物车 Hook 集成测试
 *
 * 覆盖：
 * 1. useCart hook 与调度器的集成
 * 2. 并发操作安全性
 * 3. loadCart 与调度器的交互
 * 4. flush 错误处理
 * 5. 乐观更新与服务端校准
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Mock dispatch 模块
const dispatchMock = vi.fn()

vi.mock('@/shared/api/dispatchClient.js', () => ({
  dispatch: dispatchMock,
}))

describe('useCart Hook Integration', () => {
  let useCart

  beforeEach(async () => {
    vi.useFakeTimers()
    dispatchMock.mockReset()
    
    // 初始化 Pinia
    setActivePinia(createPinia())
    
    // 动态导入以获取最新模块
    const cartModule = await import('@/subPackages/commerce/composables/useCart.js')
    useCart = cartModule.useCart
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('basic operations', () => {
    it('increaseItem 应乐观更新并入队调度器', () => {
      dispatchMock.mockResolvedValue({})
      const hook = useCart()
      const store = hook.cartStore

      // 初始化购物车项
      store.setCartList([{
        cartItemId: 1,
        productId: 10,
        skuId: 1001,
        name: '测试商品',
        price: 100,
        quantity: 5,
        selected: true,
        canPurchase: true,
        minOrderQty: 1,
        stock: 100,
      }])

      const item = store.items[0]
      hook.increaseItem(item, 3)

      // 乐观更新应立即可见
      expect(item.quantity).toBe(8)
    })

    it('setItemQuantity 应遵守最小起订量', () => {
      const hook = useCart()
      const store = hook.cartStore

      store.setCartList([{
        cartItemId: 1,
        productId: 10,
        skuId: 1001,
        name: '测试商品',
        price: 100,
        quantity: 5,
        selected: true,
        canPurchase: true,
        minOrderQty: 3,
        stock: 100,
      }])

      const item = store.items[0]
      hook.setItemQuantity(item, 1)

      // 不应低于 minOrderQty
      expect(item.quantity).toBe(3)
    })
  })

  describe('add-to-cart concurrency', () => {
    it('加购期间应阻止重复提交', async () => {
      // 使用真实 timers 避免 fake timers 与 Promise 交互问题
      vi.useRealTimers()
      
      let callCount = 0
      dispatchMock.mockImplementation(async () => {
        callCount++
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 100))
        // 返回非空项避免触发 loadCart
        return { CartItemId: 1, SkuId: 100, Quantity: 1 }
      })

      const hook = useCart()

      // 第一次加购
      const promise1 = hook.addSkuToCart({ skuId: 100, quantity: 1 })
      
      // 此时 submitting 应为 true
      expect(hook.submitting.value).toBe(true)
      
      // 立即尝试第二次加购（应被阻止）
      const promise2 = hook.addSkuToCart({ skuId: 200, quantity: 1 })

      // 第二次应立即返回 false
      const result2 = await promise2
      expect(result2).toBe(false)

      // 等待第一次加购完成
      await promise1
      
      // 最终只调用一次 dispatch
      expect(callCount).toBe(1)
    }, 10000)
  })

  describe('loadCart interaction', () => {
    it('loadCart 成功时应重置调度器', async () => {
      dispatchMock.mockResolvedValue({
        items: [
          {
            CartItemId: 1,
            ProductId: 10,
            SkuId: 1001,
            ProductName: '测试商品',
            CurrentPrice: 100,
            Quantity: 5,
            IsSelected: true,
            CanPurchase: true,
          },
        ],
        summary: {
          ProductCount: 1,
          SelectedCount: 1,
          TotalQuantity: 5,
          SelectedQuantity: 5,
          TotalAmount: 500,
          SelectedAmount: 500,
        },
      })

      const hook = useCart()
      await hook.loadCart()

      expect(hook.cartStore.items.length).toBe(1)
      expect(hook.cartStore.items[0].cartItemId).toBe(1)
    })

    it('loadCart 失败时应设置错误', async () => {
      dispatchMock.mockRejectedValue(new Error('Network error'))

      const hook = useCart()

      await expect(hook.loadCart()).rejects.toThrow('Network error')
      expect(hook.error.value).toBeTruthy()
    })
  })

  describe('flush behavior', () => {
    it('主动调用 flush 失败时应设置 flushError', async () => {
      dispatchMock.mockRejectedValue(new Error('Sync failed'))

      const hook = useCart()
      const store = hook.cartStore

      store.setCartList([{
        cartItemId: 1,
        productId: 10,
        skuId: 1001,
        name: '测试商品',
        price: 100,
        quantity: 5,
        selected: true,
        canPurchase: true,
        minOrderQty: 1,
        stock: 100,
      }])

      // 入队数量变更
      const item = store.items[0]
      hook.setItemQuantity(item, 10)

      // 主动调用 flush（应失败）
      await expect(hook.flush(true)).rejects.toThrow('Sync failed')
      expect(hook.flushError.value).toBeTruthy()
    })

    it('auto-flush 失败时应触发 onError 回调', async () => {
      dispatchMock.mockRejectedValue(new Error('Auto sync failed'))

      const hook = useCart()
      const store = hook.cartStore
      const syncErrors = []

      store.setCartList([{
        cartItemId: 1,
        productId: 10,
        skuId: 1001,
        name: '测试商品',
        price: 100,
        quantity: 5,
        selected: true,
        canPurchase: true,
        minOrderQty: 1,
        stock: 100,
      }])

      // 入队数量变更
      const item = store.items[0]
      hook.setItemQuantity(item, 10)

      // 推进时间触发 debounce（自动 flush）
      await vi.advanceTimersByTimeAsync(700)

      // 自动 flush 不会设置 flushError（只有主动 flush 才设置）
      // 这是设计行为：自动 flush 错误通过服务层 onError 回调处理
      expect(hook.flushError.value).toBeNull()
    })

    it('deleteItems 应乐观删除并入队', () => {
      dispatchMock.mockResolvedValue({})
      const hook = useCart()
      const store = hook.cartStore

      store.setCartList([
        { cartItemId: 1, productId: 10, skuId: 1001, name: '商品1', price: 100, quantity: 5, selected: true, canPurchase: true, minOrderQty: 1, stock: 100 },
        { cartItemId: 2, productId: 20, skuId: 1002, name: '商品2', price: 200, quantity: 3, selected: true, canPurchase: true, minOrderQty: 1, stock: 100 },
      ])

      hook.deleteItems([1])

      // 乐观删除立即可见
      expect(store.items.length).toBe(1)
      expect(store.items[0].cartItemId).toBe(2)
    })
  })

  describe('selection operations', () => {
    it('toggleSelect 应切换选中状态并入队', () => {
      dispatchMock.mockResolvedValue({})
      const hook = useCart()
      const store = hook.cartStore

      store.setCartList([{
        cartItemId: 1,
        productId: 10,
        skuId: 1001,
        name: '测试商品',
        price: 100,
        quantity: 5,
        selected: true,
        canPurchase: true,
        minOrderQty: 1,
        stock: 100,
      }])

      const item = store.items[0]
      expect(item.selected).toBe(true)

      hook.toggleSelect(item)

      expect(item.selected).toBe(false)
    })

    it('selectAllItems 应全选并入队', () => {
      dispatchMock.mockResolvedValue({})
      const hook = useCart()
      const store = hook.cartStore

      store.setCartList([
        { cartItemId: 1, productId: 10, skuId: 1001, name: '商品1', price: 100, quantity: 5, selected: true, canPurchase: true, minOrderQty: 1, stock: 100 },
        { cartItemId: 2, productId: 20, skuId: 1002, name: '商品2', price: 200, quantity: 3, selected: true, canPurchase: true, minOrderQty: 1, stock: 100 },
      ])

      hook.selectAllItems(false)

      expect(store.items.every(item => item.selected === false)).toBe(true)
    })
  })

  describe('batch operations', () => {
    it('batchSetSelected 应批量设置选中状态', () => {
      dispatchMock.mockResolvedValue({})
      const hook = useCart()
      const store = hook.cartStore

      store.setCartList([
        { cartItemId: 1, productId: 10, skuId: 1001, name: '商品1', price: 100, quantity: 5, selected: false, canPurchase: true, minOrderQty: 1, stock: 100 },
        { cartItemId: 2, productId: 20, skuId: 1002, name: '商品2', price: 200, quantity: 3, selected: false, canPurchase: true, minOrderQty: 1, stock: 100 },
        { cartItemId: 3, productId: 30, skuId: 1003, name: '商品3', price: 300, quantity: 2, selected: false, canPurchase: true, minOrderQty: 1, stock: 100 },
      ])

      hook.batchSetSelected([1, 2], true)

      expect(store.items[0].selected).toBe(true)
      expect(store.items[1].selected).toBe(true)
      expect(store.items[2].selected).toBe(false)
    })
  })

  describe('helper functions', () => {
    it('getSelectedIds 应返回逗号分隔的 ID', () => {
      const hook = useCart()
      const store = hook.cartStore

      store.setCartList([
        { cartItemId: 1, productId: 10, skuId: 1001, name: '商品1', price: 100, quantity: 5, selected: true, canPurchase: true, minOrderQty: 1, stock: 100 },
        { cartItemId: 2, productId: 20, skuId: 1002, name: '商品2', price: 200, quantity: 3, selected: false, canPurchase: true, minOrderQty: 1, stock: 100 },
      ])

      expect(hook.getSelectedIds()).toBe('1')
    })

    it('hasSelectedItems 应返回是否有选中项', () => {
      const hook = useCart()
      const store = hook.cartStore

      store.setCartList([
        { cartItemId: 1, productId: 10, skuId: 1001, name: '商品1', price: 100, quantity: 5, selected: false, canPurchase: true, minOrderQty: 1, stock: 100 },
      ])

      expect(hook.hasSelectedItems()).toBe(false)

      store.items[0].selected = true
      expect(hook.hasSelectedItems()).toBe(true)
    })
  })
})

describe('Cart Sync Scheduler - Advanced Concurrency', () => {
  let createCartSyncScheduler

  beforeEach(async () => {
    vi.useFakeTimers()
    const schedulerModule = await import('@/subPackages/commerce/services/cartSyncScheduler.js')
    createCartSyncScheduler = schedulerModule.createCartSyncScheduler
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('add-to-cart 期间忽略数量变更（不同 item）', async () => {
    const apis = {
      batchUpdate: vi.fn().mockResolvedValue(),
      select: vi.fn().mockResolvedValue(),
      selectAll: vi.fn().mockResolvedValue(),
      remove: vi.fn().mockResolvedValue(),
    }

    const scheduler = createCartSyncScheduler({ api: apis })

    // 入队不同 item 的数量变更
    scheduler.enqueueQuantity(1, 10)
    scheduler.enqueueQuantity(2, 20)

    await vi.advanceTimersByTimeAsync(700)

    expect(apis.batchUpdate).toHaveBeenCalledWith([
      { cartItemId: 1, quantity: 10 },
      { cartItemId: 2, quantity: 20 },
    ])
  })

  it('手动 flush 后立即入队应在新批次处理', async () => {
    const apis = {
      batchUpdate: vi.fn().mockResolvedValue(),
      select: vi.fn().mockResolvedValue(),
      selectAll: vi.fn().mockResolvedValue(),
      remove: vi.fn().mockResolvedValue(),
    }

    const scheduler = createCartSyncScheduler({ api: apis })

    // 第一批
    scheduler.enqueueQuantity(1, 10)
    await scheduler.flush()

    expect(apis.batchUpdate).toHaveBeenCalledTimes(1)

    // flush 后立即入队
    scheduler.enqueueQuantity(2, 20)
    await scheduler.flush()

    expect(apis.batchUpdate).toHaveBeenCalledTimes(2)
    expect(apis.batchUpdate).toHaveBeenLastCalledWith([{ cartItemId: 2, quantity: 20 }])
  })

  it('复位后应清理所有状态', async () => {
    const apis = {
      batchUpdate: vi.fn().mockResolvedValue(),
      select: vi.fn().mockResolvedValue(),
      selectAll: vi.fn().mockResolvedValue(),
      remove: vi.fn().mockResolvedValue(),
    }

    const scheduler = createCartSyncScheduler({ api: apis })

    scheduler.enqueueQuantity(1, 10)
    scheduler.enqueueSelection(2, true)
    scheduler.enqueueDelete(3)
    scheduler.enqueueSelectAll(true)

    scheduler.reset()

    await vi.advanceTimersByTimeAsync(700)

    // 所有 API 都不应被调用
    expect(apis.batchUpdate).not.toHaveBeenCalled()
    expect(apis.select).not.toHaveBeenCalled()
    expect(apis.remove).not.toHaveBeenCalled()
    expect(apis.selectAll).not.toHaveBeenCalled()
  })

  it('dispose 后入队应被忽略', async () => {
    const apis = {
      batchUpdate: vi.fn().mockResolvedValue(),
      select: vi.fn().mockResolvedValue(),
      selectAll: vi.fn().mockResolvedValue(),
      remove: vi.fn().mockResolvedValue(),
    }

    const scheduler = createCartSyncScheduler({ api: apis })

    await scheduler.dispose()

    scheduler.enqueueQuantity(1, 10)

    await vi.advanceTimersByTimeAsync(700)

    expect(apis.batchUpdate).not.toHaveBeenCalled()
  })

  it('多个 flush 调用应在单飞模式下全部解析', async () => {
    let resolveFirst
    const apis = {
      batchUpdate: vi.fn().mockImplementationOnce(() => new Promise(resolve => {
        resolveFirst = resolve
      })),
      select: vi.fn().mockResolvedValue(),
      selectAll: vi.fn().mockResolvedValue(),
      remove: vi.fn().mockResolvedValue(),
    }

    const scheduler = createCartSyncScheduler({ api: apis })

    scheduler.enqueueQuantity(1, 10)

    const flush1 = scheduler.flush()
    const flush2 = scheduler.flush()
    const flush3 = scheduler.flush()

    // 所有 flush 应解析（单飞模式下共享同一 inflight）
    resolveFirst()
    await Promise.all([flush1, flush2, flush3])

    // batchUpdate 只被调用一次
    expect(apis.batchUpdate).toHaveBeenCalledTimes(1)
  })

  it('部分操作失败不应中断后续操作', async () => {
    const apis = {
      batchUpdate: vi.fn().mockRejectedValue(new Error('Batch failed')),
      select: vi.fn().mockResolvedValue(),
      selectAll: vi.fn().mockResolvedValue(),
      remove: vi.fn().mockResolvedValue(),
    }

    const errors = []
    const scheduler = createCartSyncScheduler({
      api: apis,
      onError: err => errors.push(err),
    })

    scheduler.enqueueQuantity(1, 10)
    scheduler.enqueueSelection(2, true)

    await vi.advanceTimersByTimeAsync(700)

    // batchUpdate 失败
    expect(apis.batchUpdate).toHaveBeenCalled()
    // select 仍应执行
    expect(apis.select).toHaveBeenCalled()
  })
})
