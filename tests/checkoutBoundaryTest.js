/**
 * 结算流程边界情况测试
 *
 * 覆盖：
 * 1. 空购物车结算
 * 2. 库存不足结算
 * 3. 网络错误处理
 * 4. 幂等键重用
 * 5. 并发CreateRequest幂等性
 * 6. 订单金额边界值
 * 7. 待付款订单缓存边界
 * 8. 取消/确认收货边界
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock uni 对象
global.uni = global.uni || {}
global.uni.showToast = vi.fn()

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetModules()
  vi.useRealTimers()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('结算边界 - 空购物车', () => {
  it('空 items 预览应返回 null', async () => {
    const dispatchMock = vi.fn().mockRejectedValue(new Error('购物车为空'))

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { previewOrderInfo } = useOrder()

    const result = await previewOrderInfo({ items: [] })

    expect(result).toBeNull()
  })

  it('空 items 创建订单应失败', async () => {
    const dispatchMock = vi.fn().mockRejectedValue(new Error('请选择商品'))

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder } = useOrder()

    const result = await createNewOrder({ items: [] })

    expect(result).toBeNull()
  })
})

describe('结算边界 - 库存不足', () => {
  it('库存不足预览应返回错误', async () => {
    const dispatchMock = vi.fn().mockRejectedValue(new Error('库存不足'))

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { previewOrderInfo } = useOrder()

    const result = await previewOrderInfo({
      items: [{ skuId: 100, quantity: 9999 }],
    })

    expect(result).toBeNull()
  })
})

describe('结算边界 - 网络错误处理', () => {
  it('网络超时应返回 null 且显示 toast', async () => {
    const dispatchMock = vi.fn().mockRejectedValue(new Error('request timeout'))

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { previewOrderInfo } = useOrder()

    const result = await previewOrderInfo({
      items: [{ skuId: 100, quantity: 1 }],
    })

    expect(result).toBeNull()
    expect(uni.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('request timeout'), icon: 'none' })
    )
  })

  it('服务不可用应返回 null', async () => {
    const dispatchMock = vi.fn().mockRejectedValue(new Error('503 Service Unavailable'))

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder } = useOrder()

    const result = await createNewOrder({
      items: [{ skuId: 100, quantity: 1 }],
    })

    expect(result).toBeNull()
  })
})

describe('结算边界 - 幂等键重用', () => {
  it('重试创建订单应生成新的 clientRequestId', async () => {
    const dispatchMock = vi.fn()
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce({
        orderId: 100,
        orderNo: 'ORD100',
        orderStatus: 20,
        payableAmount: 199.99,
      })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder } = useOrder()

    // 第一次失败
    const result1 = await createNewOrder({
      items: [{ skuId: 100, quantity: 2 }],
    })
    expect(result1).toBeNull()

    // 第二次成功
    const result2 = await createNewOrder({
      items: [{ skuId: 100, quantity: 2 }],
    })
    expect(result2).toBeTruthy()
    expect(result2.orderId).toBe(100)

    // 使用了不同的 clientRequestId
    const firstCallPayload = dispatchMock.mock.calls[0][3]
    const secondCallPayload = dispatchMock.mock.calls[1][3]
    expect(firstCallPayload.ClientRequestId).not.toBe(secondCallPayload.ClientRequestId)
  })
})

describe('结算边界 - 并发幂等性', () => {
  it('快速连续提交应保持 submitting 状态', async () => {
    let resolveFirst
    const longRunningPromise = new Promise((resolve) => {
      resolveFirst = resolve
    })

    const dispatchMock = vi.fn().mockReturnValue(longRunningPromise)

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder, submitting } = useOrder()

    // 第一次调用
    const promise1 = createNewOrder({
      items: [{ skuId: 100, quantity: 1 }],
    })

    // submitting 应为 true
    expect(submitting.value).toBe(true)

    // 第二次调用也返回 Promise
    const promise2 = createNewOrder({
      items: [{ skuId: 200, quantity: 1 }],
    })

    // 仍然 submitting
    expect(submitting.value).toBe(true)

    // 完成
    resolveFirst({
      orderId: 1,
      orderNo: 'ORD001',
      orderStatus: 20,
      payableAmount: 100,
    })

    await promise1
    await promise2

    // submitting 已重置
    expect(submitting.value).toBe(false)
  })
})

describe('结算边界 - 订单金额边界值', () => {
  it('极小金额订单应正常处理', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({
      orderId: 1,
      orderNo: 'ORD001',
      orderStatus: 20,
      payableAmount: 0.01,
    })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder } = useOrder()

    const result = await createNewOrder({
      items: [{ skuId: 100, quantity: 1 }],
    })

    expect(result).toBeTruthy()
    expect(result.payableAmount).toBe(0.01)
  })

  it('极大金额订单应正常处理', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({
      orderId: 999,
      orderNo: 'ORD999',
      orderStatus: 20,
      payableAmount: 9999999.99,
    })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder } = useOrder()

    const result = await createNewOrder({
      items: [{ skuId: 100, quantity: 1 }],
    })

    expect(result).toBeTruthy()
    expect(result.payableAmount).toBe(9999999.99)
  })
})

describe('结算边界 - 待付款订单缓存', () => {
  it('PENDING_PAYMENT 状态订单应缓存', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({
      orderId: 100,
      orderNo: 'ORD100',
      orderStatus: 20, // PENDING_PAYMENT
      payableAmount: 199.99,
    })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const { createNewOrder } = useOrder()
    const orderStore = useOrderStore()

    await createNewOrder({
      items: [{ skuId: 100, quantity: 2 }],
      paymentMode: 1,
    })

    expect(orderStore.hasPendingPayment).toBe(true)
    expect(orderStore.pendingPaymentOrder.orderId).toBe(100)
    expect(orderStore.pendingPaymentAmount).toBe('¥199.99')
  })

  it('PROCESSING 状态订单不应缓存', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({
      orderId: 200,
      orderNo: 'ORD200',
      orderStatus: 30, // PROCESSING
      payableAmount: 500,
    })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const { createNewOrder } = useOrder()
    const orderStore = useOrderStore()

    await createNewOrder({
      items: [{ skuId: 100, quantity: 1 }],
      paymentMode: 2, // 授信
    })

    expect(orderStore.hasPendingPayment).toBe(false)
    expect(orderStore.pendingPaymentOrder).toBeNull()
  })

  it('覆盖已有待付款订单应更新缓存', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({
      orderId: 300,
      orderNo: 'ORD300',
      orderStatus: 20,
      payableAmount: 299.99,
    })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const { createNewOrder } = useOrder()
    const orderStore = useOrderStore()

    // 先设置一个旧订单
    orderStore.setPendingPaymentOrder({
      orderId: 100,
      orderStatus: 20,
      payableAmount: 100,
    })

    // 创建新订单覆盖
    await createNewOrder({
      items: [{ skuId: 100, quantity: 1 }],
    })

    expect(orderStore.pendingPaymentOrder.orderId).toBe(300)
    expect(orderStore.pendingPaymentAmount).toBe('¥299.99')
  })
})

describe('结算边界 - 取消订单', () => {
  it('取消不存在的订单应失败', async () => {
    const dispatchMock = vi.fn().mockRejectedValue(new Error('订单不存在'))

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { cancelCurrentOrder } = useOrder()

    const result = await cancelCurrentOrder(99999)

    expect(result).toBe(false)
  })

  it('取消已成功订单应失败', async () => {
    const dispatchMock = vi.fn().mockRejectedValue(new Error('订单状态不允许取消'))

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { cancelCurrentOrder } = useOrder()

    const result = await cancelCurrentOrder(100)

    expect(result).toBe(false)
  })

  it('取消订单应清除待付款缓存', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const { cancelCurrentOrder } = useOrder()
    const orderStore = useOrderStore()

    // 设置一个待付款订单
    orderStore.setPendingPaymentOrder({
      orderId: 100,
      orderStatus: 20,
      payableAmount: 199.99,
    })

    await cancelCurrentOrder(100)

    expect(orderStore.pendingPaymentOrder).toBeNull()
    expect(orderStore.hasPendingPayment).toBe(false)
  })
})

describe('结算边界 - 确认收货', () => {
  it('确认不存在的订单应失败', async () => {
    const dispatchMock = vi.fn().mockRejectedValue(new Error('订单不存在'))

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { confirmReceiveOrder } = useOrder()

    const result = await confirmReceiveOrder(99999)

    expect(result).toBe(false)
  })

  it('确认未发货订单应失败', async () => {
    const dispatchMock = vi.fn().mockRejectedValue(new Error('订单未发货'))

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { confirmReceiveOrder } = useOrder()

    const result = await confirmReceiveOrder(100)

    expect(result).toBe(false)
  })
})

describe('结算边界 - submitting 状态机', () => {
  it('submitting 应在成功时重置', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({
      orderId: 1,
      orderNo: 'ORD001',
      orderStatus: 20,
      payableAmount: 100,
    })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder, submitting } = useOrder()

    expect(submitting.value).toBe(false)
    await createNewOrder({ items: [{ skuId: 100, quantity: 1 }] })
    expect(submitting.value).toBe(false)
  })

  it('submitting 应在失败时重置', async () => {
    const dispatchMock = vi.fn().mockRejectedValue(new Error('失败'))

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder, submitting } = useOrder()

    expect(submitting.value).toBe(false)
    await createNewOrder({ items: [{ skuId: 100, quantity: 1 }] })
    expect(submitting.value).toBe(false)
  })

  it('异常中断也应重置 submitting', async () => {
    const dispatchMock = vi.fn().mockImplementation(() => {
      throw new Error('同步错误')
    })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder, submitting } = useOrder()

    // dispatch 同步抛出异常会导致 Promise 异常
    let caughtError = null
    try {
      await createNewOrder({ items: [{ skuId: 100, quantity: 1 }] })
    } catch (e) {
      caughtError = e
    }

    // submitting 应在 finally 块中被重置
    expect(submitting.value).toBe(false)
  })

  it('complete() 后 pendingOrderId 应为 null（清除缓存后）', async () => {
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const orderStore = useOrderStore()

    orderStore.setPendingPaymentOrder({ orderId: 555, orderStatus: 20 })
    expect(orderStore.pendingOrderId).toBe(555)

    orderStore.clearPendingPaymentOrder()
    expect(orderStore.pendingOrderId).toBeNull()
  })

  it('无待付款订单时 pendingPaymentAmount 应为 ¥0.00', async () => {
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const orderStore = useOrderStore()

    expect(orderStore.pendingPaymentAmount).toBe('¥0.00')
  })
})
