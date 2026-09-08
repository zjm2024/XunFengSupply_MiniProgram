/**
 * 购物车同步调度器测试
 *
 * 覆盖：
 * 1. 防抖 (debounce 650ms)
 * 2. maxWait (1500ms)
 * 3. 单飞队列（同一时刻只有一个写请求在途）
 * 4. 同一项数量最终值合并
 * 5. 数量和勾选同时变化不会互相丢失
 * 6. 删除覆盖同项待更新
 * 7. 失败重试与非重试业务错误
 * 8. dispose / flush
 * 9. 实例隔离
 * 10. 错误传播
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCartSyncScheduler } from '@/subPackages/commerce/services/cartSyncScheduler.js'

// 模拟 API
const createMockApis = () => ({
  batchUpdate: vi.fn().mockResolvedValue(),
  select: vi.fn().mockResolvedValue(),
  selectAll: vi.fn().mockResolvedValue(),
  remove: vi.fn().mockResolvedValue(),
})

describe('CartSyncScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ==================== 实例隔离测试 ====================

  describe('instance isolation', () => {
    it('每次 createCartSyncScheduler 应返回独立实例', () => {
      const instance1 = createCartSyncScheduler({ api: createMockApis() })
      const instance2 = createCartSyncScheduler({ api: createMockApis() })

      expect(instance1).not.toBe(instance2)
    })

    it('实例间入队操作应隔离', () => {
      const apis1 = createMockApis()
      const apis2 = createMockApis()
      const instance1 = createCartSyncScheduler({ api: apis1 })
      const instance2 = createCartSyncScheduler({ api: apis2 })

      instance1.enqueueQuantity(1, 5)

      expect(instance1.getStatus().pendingCount).toBe(1)
      expect(instance2.getStatus().pendingCount).toBe(0)
    })
  })

  // ==================== 防抖测试 ====================

  describe('debounce', () => {
    it('应该在 debounce 时间内合并多次数量变更', async () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 5)
      scheduler.enqueueQuantity(1, 8)
      scheduler.enqueueQuantity(1, 12)

      // debounce 还未触发，API 不应被调用
      expect(apis.batchUpdate).not.toHaveBeenCalled()

      // 推进到 debounce 后
      await vi.advanceTimersByTimeAsync(700)

      expect(apis.batchUpdate).toHaveBeenCalledTimes(1)
      expect(apis.batchUpdate).toHaveBeenCalledWith([{ cartItemId: 1, quantity: 12 }])
    })

    it('应该存储最终绝对值而不是增量', async () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 10)
      scheduler.enqueueQuantity(1, 20)
      scheduler.enqueueQuantity(1, 15)

      await vi.advanceTimersByTimeAsync(700)

      expect(apis.batchUpdate).toHaveBeenCalledWith([{ cartItemId: 1, quantity: 15 }])
    })
  })

  // ==================== maxWait 测试 ====================

  describe('maxWait', () => {
    it('应该 maxWait 后立即触发 flush', async () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      // 持续添加变更，但 debounce 被重置
      for (let i = 0; i < 20; i++) {
        scheduler.enqueueQuantity(1, i + 1)
        await vi.advanceTimersByTimeAsync(100) // 每次小于 debounce 650ms
      }

      // maxWait (1500ms) 应已触发
      // batchUpdate 应该至少被调用一次
      expect(apis.batchUpdate).toHaveBeenCalled()
    })
  })

  // ==================== 单飞队列测试 ====================

  describe('single-flight queue', () => {
    it('同一时刻只允许一个写请求在途', async () => {
      let concurrentRequests = 0
      let maxConcurrent = 0

      const apis = {
        batchUpdate: vi.fn().mockImplementation(async () => {
          concurrentRequests++
          maxConcurrent = Math.max(maxConcurrent, concurrentRequests)
          await new Promise(resolve => setTimeout(resolve, 100))
          concurrentRequests--
        }),
        select: vi.fn().mockResolvedValue(),
        selectAll: vi.fn().mockResolvedValue(),
        remove: vi.fn().mockResolvedValue(),
      }
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 10)
      scheduler.enqueueQuantity(2, 20)

      await vi.advanceTimersByTimeAsync(700)
      await vi.advanceTimersByTimeAsync(500) // 等待请求完成

      expect(maxConcurrent).toBeLessThanOrEqual(1)
    })
  })

  // ==================== 数量与勾选共存测试 ====================

  describe('coexistence', () => {
    it('数量和选择变更不应互相丢失', async () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 10)
      scheduler.enqueueSelection(1, true)

      await vi.advanceTimersByTimeAsync(700)

      // batchUpdate 應該被调用
      expect(apis.batchUpdate).toHaveBeenCalledWith([{ cartItemId: 1, quantity: 10 }])
      // select 也應該被调用
      expect(apis.select).toHaveBeenCalledWith({ cartItemIds: [1], selected: true })
    })

    it('修改选择状态不应删除数量变更', async () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 5)
      scheduler.enqueueSelection(1, false)

      await vi.advanceTimersByTimeAsync(700)

      expect(apis.batchUpdate).toHaveBeenCalledTimes(1)
      expect(apis.select).toHaveBeenCalledTimes(1)
    })
  })

  // ==================== 删除优先测试 ====================

  describe('delete priority', () => {
    it('删除操作应覆盖同项的数量和选择待办', async () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 10)
      scheduler.enqueueSelection(1, true)
      scheduler.enqueueDelete(1)

      await vi.advanceTimersByTimeAsync(700)

      // 删除应被调用，但 batchUpdate 和 select 不应包含该项
      expect(apis.remove).toHaveBeenCalledWith([1])
      expect(apis.batchUpdate).not.toHaveBeenCalled()
      expect(apis.select).not.toHaveBeenCalled()
    })
  })

  // ==================== 重试逻辑测试 ====================

  describe('retry logic', () => {
    it('网络错误应触发重试', async () => {
      let attempts = 0
      const apis = {
        batchUpdate: vi.fn().mockImplementation(async () => {
          attempts++
          if (attempts < 2) {
            const err = new Error('Network error')
            err.code = 'NETWORK_ERROR'
            throw err
          }
        }),
        select: vi.fn().mockResolvedValue(),
        selectAll: vi.fn().mockResolvedValue(),
        remove: vi.fn().mockResolvedValue(),
      }

      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 10)
      await vi.advanceTimersByTimeAsync(700)
      await vi.advanceTimersByTimeAsync(500) // 等待重试

      // 应该尝试了多次
      expect(attempts).toBeGreaterThanOrEqual(2)
    })

    it('4xx 业务错误不应重试', async () => {
      let attempts = 0
      const apis = {
        batchUpdate: vi.fn().mockImplementation(async () => {
          attempts++
          const err = new Error('Bad request')
          err.code = 400
          throw err
        }),
        select: vi.fn().mockResolvedValue(),
        selectAll: vi.fn().mockResolvedValue(),
        remove: vi.fn().mockResolvedValue(),
      }

      const errors = []
      const scheduler = createCartSyncScheduler({
        api: apis,
        onError: (err) => errors.push(err),
      })

      scheduler.enqueueQuantity(1, 10)
      await vi.advanceTimersByTimeAsync(700)
      await vi.advanceTimersByTimeAsync(500)

      // 只尝试一次，不应重试
      expect(attempts).toBe(1)
      expect(errors.length).toBe(1)
    })

    it('5xx 错误应触发重试', async () => {
      let attempts = 0
      const apis = {
        batchUpdate: vi.fn().mockImplementation(async () => {
          attempts++
          if (attempts < 2) {
            const err = new Error('Server error')
            err.code = 500
            throw err
          }
        }),
        select: vi.fn().mockResolvedValue(),
        selectAll: vi.fn().mockResolvedValue(),
        remove: vi.fn().mockResolvedValue(),
      }

      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 10)
      await vi.advanceTimersByTimeAsync(700)
      await vi.advanceTimersByTimeAsync(500)

      expect(attempts).toBeGreaterThanOrEqual(2)
    })
  })

  // ==================== flush 测试 ====================

  describe('flush', () => {
    it('手动 flush 应立即执行待同步变更', async () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 5)
      scheduler.enqueueSelection(2, true)

      // 不等待 debounce，立即 flush
      await scheduler.flush()

      expect(apis.batchUpdate).toHaveBeenCalledWith([{ cartItemId: 1, quantity: 5 }])
      expect(apis.select).toHaveBeenCalledWith({ cartItemIds: [2], selected: true })
    })

    it('自动后台 flush 失败不抛出错误', async () => {
      let attempts = 0
      const apis = {
        batchUpdate: vi.fn().mockImplementation(async () => {
          attempts++
          const err = new Error('Bad request')
          err.code = 400
          throw err
        }),
        select: vi.fn().mockResolvedValue(),
        selectAll: vi.fn().mockResolvedValue(),
        remove: vi.fn().mockResolvedValue(),
      }

      const errors = []
      const scheduler = createCartSyncScheduler({
        api: apis,
        onError: (err) => errors.push(err),
      })

      scheduler.enqueueQuantity(1, 10)
      await vi.advanceTimersByTimeAsync(700)

      // 不应该抛出错误
      expect(errors.length).toBe(1)
    })

    it('强制 flush 失败会 reject', async () => {
      const apis = {
        batchUpdate: vi.fn().mockRejectedValue(new Error('Server error')),
        select: vi.fn().mockResolvedValue(),
        selectAll: vi.fn().mockResolvedValue(),
        remove: vi.fn().mockResolvedValue(),
      }

      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 10)

      await expect(scheduler.flush({ throwOnError: true })).rejects.toThrow('Server error')
    })

    it('flush 应等待当前在途请求完成', async () => {
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

      // 第一次 flush 启动请求
      const flushPromise1 = scheduler.flush()

      // 此时 batchUpdate 应已被调用
      expect(apis.batchUpdate).toHaveBeenCalledTimes(1)

      // 第二次 flush 应等待第一个完成
      scheduler.enqueueQuantity(2, 20)
      const flushPromise2 = scheduler.flush()

      // 完成第一个请求
      resolveFirst()

      await flushPromise1
      await flushPromise2
    })
  })

  // ==================== dispose 测试 ====================

  describe('dispose', () => {
    it('dispose 应先 flush 残留变更', async () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 10)
      scheduler.enqueueDelete(2)

      await scheduler.dispose()

      // dispose 前应该先调用 API 完成 flush
      expect(apis.batchUpdate).toHaveBeenCalledWith([{ cartItemId: 1, quantity: 10 }])
      expect(apis.remove).toHaveBeenCalledWith([2])
    })
  })

  // ==================== reset 测试 ====================

  describe('reset', () => {
    it('reset 应该清空所有待同步变更', async () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 10)
      scheduler.enqueueSelection(2, true)
      scheduler.enqueueDelete(3)

      scheduler.reset()

      await vi.advanceTimersByTimeAsync(700)

      // 所有 API 都不应被调用
      expect(apis.batchUpdate).not.toHaveBeenCalled()
      expect(apis.select).not.toHaveBeenCalled()
      expect(apis.remove).not.toHaveBeenCalled()
    })
  })

  // ==================== 批量选择测试 ====================

  describe('batch selection', () => {
    it('应支持批量选择变更', async () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueSelection([1, 2, 3], true)
      scheduler.enqueueSelection([4, 5], false)

      await vi.advanceTimersByTimeAsync(700)

      expect(apis.select).toHaveBeenCalledWith({ cartItemIds: [1, 2, 3], selected: true })
      expect(apis.select).toHaveBeenCalledWith({ cartItemIds: [4, 5], selected: false })
    })

    it('全选操作应清除单项选择', async () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueSelection(1, true)
      scheduler.enqueueSelectAll(true)

      await vi.advanceTimersByTimeAsync(700)

      expect(apis.selectAll).toHaveBeenCalledWith(true)
      // 单项选择不应再触发（已被全选覆盖）
      expect(apis.select).not.toHaveBeenCalled()
    })
  })

  // ==================== 数量合并测试 ====================

  describe('quantity merge', () => {
    it('同 item 连续变更应只发送最终值', async () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 1)
      scheduler.enqueueQuantity(1, 3)
      scheduler.enqueueQuantity(1, 5)
      scheduler.enqueueQuantity(1, 2)
      scheduler.enqueueQuantity(1, 8)

      await scheduler.flush()

      expect(apis.batchUpdate).toHaveBeenCalledTimes(1)
      expect(apis.batchUpdate).toHaveBeenCalledWith([{ cartItemId: 1, quantity: 8 }])
    })

    it('不同 item 变更应分别保留', async () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 5)
      scheduler.enqueueQuantity(2, 10)
      scheduler.enqueueQuantity(3, 15)

      await scheduler.flush()

      expect(apis.batchUpdate).toHaveBeenCalledWith([
        { cartItemId: 1, quantity: 5 },
        { cartItemId: 2, quantity: 10 },
        { cartItemId: 3, quantity: 15 },
      ])
    })
  })

  // ==================== 状态测试 ====================

  describe('status', () => {
    it('getStatus 应返回当前状态', () => {
      const apis = createMockApis()
      const scheduler = createCartSyncScheduler({ api: apis })

      scheduler.enqueueQuantity(1, 10)
      scheduler.enqueueSelection(2, true)

      const status = scheduler.getStatus()

      expect(status.pendingCount).toBe(2)
      expect(status.isSyncing).toBe(false)
      expect(status.disposed).toBe(false)
    })
  })
})
