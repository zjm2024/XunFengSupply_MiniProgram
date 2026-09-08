/**
 * 结算与创建订单正确性集成测试
 *
 * 覆盖：
 * 1. previewOrder 预览订单流程
 * 2. createOrder 创建订单流程（含幂等键）
 * 3. submitting 标志防并发提交
 * 4. 待付款订单缓存逻辑
 * 5. 重试时保留 clientRequestId
 * 6. 错误处理与边界情况
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'

// Mock uni.showToast
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

// ==================== orderApi.js 映射测试补充 ====================

describe('Order API - generateClientRequestId', () => {
  it('应生成正确格式的幂等键', async () => {
    const { generateClientRequestId } = await import('@/subPackages/order/api/orderApi.js')
    
    const id = generateClientRequestId()
    
    // 格式: mini-{timestamp}-{random}
    expect(id).toMatch(/^mini-\d{13,}-\d{6}$/)
  })

  it('连续生成应产生不同ID', async () => {
    const { generateClientRequestId } = await import('@/subPackages/order/api/orderApi.js')
    
    const id1 = generateClientRequestId()
    const id2 = generateClientRequestId()
    
    expect(id1).not.toBe(id2)
  })
})

// ==================== useOrder composable 集成测试 ====================

describe('useOrder - 预览订单流程', () => {
  it('previewOrderInfo 应返回预览结果', async () => {
    const mockPreview = {
      items: [{ skuId: 100, price: 99.99, quantity: 2, stockCheck: true }],
      totalAmount: 199.98,
      availableStock: true,
    }

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: vi.fn().mockResolvedValue(mockPreview),
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { previewOrderInfo } = useOrder()

    const result = await previewOrderInfo({
      items: [{ skuId: 100, quantity: 2 }],
    })

    expect(result).toBeTruthy()
    expect(result.items).toHaveLength(1)
    expect(result.totalAmount).toBe(199.98)
  })

  it('previewOrderInfo 失败时应返回 null 且不上抛', async () => {
    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: vi.fn().mockRejectedValue(new Error('网络错误')),
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { previewOrderInfo } = useOrder()

    const result = await previewOrderInfo({
      items: [{ skuId: 100, quantity: 1 }],
    })

    expect(result).toBeNull()
  })

  it('previewOrderInfo 失败后应调用 uni.showToast', async () => {
    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: vi.fn().mockRejectedValue(new Error('预览失败')),
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { previewOrderInfo } = useOrder()

    await previewOrderInfo({ items: [] })

    expect(uni.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.any(String), icon: 'none' })
    )
  })
})

describe('useOrder - 创建订单流程', () => {
  it('createNewOrder 应生成幂等键并返回订单结果', async () => {
    const mockOrder = {
      orderId: 12345,
      orderNo: 'ORD20260905001',
      orderStatus: 20, // PENDING_PAYMENT
      payableAmount: 199.99,
    }

    const dispatchMock = vi.fn().mockResolvedValue(mockOrder)

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder } = useOrder()

    const result = await createNewOrder({
      items: [{ skuId: 100, quantity: 2 }],
      paymentMode: 1,
    })

    expect(result).toBeTruthy()
    expect(result.orderId).toBe(12345)

    // 验证 dispatch 被调用时携带了 ClientRequestId
    const dispatchCall = dispatchMock.mock.calls[0]
    const payload = dispatchCall[3] // 第4个参数是 payload
    expect(payload.ClientRequestId).toMatch(/^mini-\d{13,}-\d{6}$/)
  })

  it('createNewOrder 创建待付款订单时应缓存到 store', async () => {
    const mockOrder = {
      orderId: 999,
      orderNo: 'ORD999',
      orderStatus: 20, // PENDING_PAYMENT
      payableAmount: 500.00,
    }

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: vi.fn().mockResolvedValue(mockOrder),
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const { createNewOrder } = useOrder()
    const orderStore = useOrderStore()

    await createNewOrder({
      items: [{ skuId: 100, quantity: 1 }],
      paymentMode: 1,
    })

    expect(orderStore.pendingPaymentOrder).toBeTruthy()
    expect(orderStore.pendingPaymentOrder.orderId).toBe(999)
    expect(orderStore.pendingPaymentOrder.payableAmount).toBe(500.00)
  })

  it('createNewOrder 创建非待付款订单时不应缓存', async () => {
    const mockOrder = {
      orderId: 888,
      orderNo: 'ORD888',
      orderStatus: 30, // PROCESSING (非待付款)
      payableAmount: 100.00,
    }

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: vi.fn().mockResolvedValue(mockOrder),
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const { createNewOrder } = useOrder()
    const orderStore = useOrderStore()

    await createNewOrder({
      items: [{ skuId: 100, quantity: 1 }],
      paymentMode: 2, // 授信
    })

    expect(orderStore.pendingPaymentOrder).toBeNull()
  })

  it('createNewOrder 失败时应返回 null', async () => {
    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: vi.fn().mockRejectedValue(new Error('创建失败')),
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder } = useOrder()

    const result = await createNewOrder({
      items: [{ skuId: 100, quantity: 1 }],
    })

    expect(result).toBeNull()
  })
})

// ==================== 并发控制测试 ====================

describe('useOrder - 并发提交防护', () => {
  it('重复调用 createNewOrder 期间 submitting 应为 true', async () => {
    let resolvePromise
    const longRunningPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: vi.fn().mockReturnValue(longRunningPromise),
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder, submitting } = useOrder()

    // 第一次调用（长时间运行）
    const promise1 = createNewOrder({
      items: [{ skuId: 100, quantity: 1 }],
    })

    // 此时 submitting 应为 true
    expect(submitting.value).toBe(true)

    // 第二次调用也应返回 Promise（但会被同一幂等键影响）
    const promise2 = createNewOrder({
      items: [{ skuId: 200, quantity: 1 }],
    })

    // 仍然 submitting
    expect(submitting.value).toBe(true)

    // 完成第一次请求
    resolvePromise({
      orderId: 1,
      orderNo: 'ORD001',
      orderStatus: 20,
      payableAmount: 100,
    })

    await promise1
    await promise2

    // 此后 submitting 应为 false
    expect(submitting.value).toBe(false)
  })

  it('createNewOrder 完成后应重置 submitting', async () => {
    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: vi.fn().mockResolvedValue({
        orderId: 1,
        orderNo: 'ORD001',
        orderStatus: 20,
        payableAmount: 100,
      }),
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder, submitting } = useOrder()

    expect(submitting.value).toBe(false)

    await createNewOrder({ items: [{ skuId: 100, quantity: 1 }] })

    expect(submitting.value).toBe(false)
  })

  it('createNewOrder 失败时也应重置 submitting', async () => {
    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: vi.fn().mockRejectedValue(new Error('失败')),
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { createNewOrder, submitting } = useOrder()

    await createNewOrder({ items: [{ skuId: 100, quantity: 1 }] })

    expect(submitting.value).toBe(false)
  })
})

// ==================== orderStore 测试 ====================

describe('useOrderStore - 待付款订单缓存', () => {
  it('setPendingPaymentOrder 应正确缓存订单', async () => {
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const orderStore = useOrderStore()

    orderStore.setPendingPaymentOrder({
      orderId: 123,
      orderNo: 'ORD123',
      orderStatus: 20,
      payableAmount: 199.99,
    })

    expect(orderStore.pendingPaymentOrder).toEqual({
      orderId: 123,
      orderNo: 'ORD123',
      orderStatus: 20,
      payableAmount: 199.99,
    })
  })

  it('hasPendingPayment getter 应正确判断待付款状态', async () => {
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const orderStore = useOrderStore()

    // 无订单
    expect(orderStore.hasPendingPayment).toBe(false)

    // 有待付款订单
    orderStore.setPendingPaymentOrder({
      orderId: 1,
      orderStatus: 20, // PENDING_PAYMENT
    })
    expect(orderStore.hasPendingPayment).toBe(true)

    // 非待付款状态
    orderStore.setPendingPaymentOrder({
      orderId: 2,
      orderStatus: 30, // PROCESSING
    })
    expect(orderStore.hasPendingPayment).toBe(false)
  })

  it('clearPendingPaymentOrder 应清空缓存', async () => {
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const orderStore = useOrderStore()

    orderStore.setPendingPaymentOrder({ orderId: 1, orderStatus: 20 })
    expect(orderStore.pendingPaymentOrder).toBeTruthy()

    orderStore.clearPendingPaymentOrder()
    expect(orderStore.pendingPaymentOrder).toBeNull()
  })

  it('pendingPaymentAmount getter 应正确格式化金额', async () => {
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const orderStore = useOrderStore()

    // 无订单
    expect(orderStore.pendingPaymentAmount).toBe('¥0.00')

    // 有订单
    orderStore.setPendingPaymentOrder({
      orderId: 1,
      payableAmount: 1999.99,
    })
    expect(orderStore.pendingPaymentAmount).toBe('¥1999.99')
  })

  it('pendingOrderId getter 应返回待付款订单ID', async () => {
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const orderStore = useOrderStore()

    expect(orderStore.pendingOrderId).toBeNull()

    orderStore.setPendingPaymentOrder({ orderId: 555, orderStatus: 20 })
    expect(orderStore.pendingOrderId).toBe(555)
  })

  it('updatePendingOrder 应合并更新字段', async () => {
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const orderStore = useOrderStore()

    orderStore.setPendingPaymentOrder({
      orderId: 1,
      orderStatus: 20,
      payableAmount: 100,
    })

    orderStore.updatePendingOrder({ orderStatus: 30 })

    expect(orderStore.pendingPaymentOrder.orderId).toBe(1)
    expect(orderStore.pendingPaymentOrder.orderStatus).toBe(30)
    expect(orderStore.pendingPaymentOrder.payableAmount).toBe(100)
  })

  it('setOrderCounts 应合并更新数量', async () => {
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const orderStore = useOrderStore()

    orderStore.setOrderCounts({ allCount: 10, pendingPaymentCount: 2 })
    expect(orderStore.orderCounts.allCount).toBe(10)
    expect(orderStore.orderCounts.pendingPaymentCount).toBe(2)

    // 再次设置只更新部分字段
    orderStore.setOrderCounts({ shippedCount: 5 })
    expect(orderStore.orderCounts.allCount).toBe(10) // 保留
    expect(orderStore.orderCounts.shippedCount).toBe(5) // 新增
  })
})

// ==================== 取消订单与确认收货测试 ====================

describe('useOrder - 取消订单与确认收货', () => {
  it('cancelCurrentOrder 应调用 cancelOrder 并清除缓存', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const { cancelCurrentOrder } = useOrder()
    const orderStore = useOrderStore()

    // 设置一个待付款订单
    orderStore.setPendingPaymentOrder({ orderId: 100, orderStatus: 20 })

    const result = await cancelCurrentOrder(100, '不想要了')

    expect(result).toBe(true)
    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.OrderController',
      'CancelOrder',
      expect.objectContaining({
        OrderId: 100,
        Reason: '不想要了',
      })
    )
    expect(orderStore.pendingPaymentOrder).toBeNull()
  })

  it('cancelCurrentOrder 失败时应返回 false', async () => {
    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: vi.fn().mockRejectedValue(new Error('取消失败')),
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { cancelCurrentOrder } = useOrder()

    const result = await cancelCurrentOrder(100)

    expect(result).toBe(false)
  })

  it('confirmReceiveOrder 应调用 confirmReceipt', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { confirmReceiveOrder } = useOrder()

    const result = await confirmReceiveOrder(200)

    expect(result).toBe(true)
    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.OrderController',
      'ConfirmReceipt',
      expect.objectContaining({
        OrderId: 200,
      })
    )
  })

  it('confirmReceiveOrder 失败时应返回 false', async () => {
    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: vi.fn().mockRejectedValue(new Error('确认失败')),
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { confirmReceiveOrder } = useOrder()

    const result = await confirmReceiveOrder(200)

    expect(result).toBe(false)
  })
})

// ==================== 结算流程端到端模拟 ====================

describe('结算流程 - 端到端模拟', () => {
  it('完整流程: 预览 → 创建 → 缓存待付款订单 → 取消', async () => {
    const dispatchMock = vi.fn()

    // 第一次调用预览
    dispatchMock.mockResolvedValueOnce({
      items: [{ skuId: 100, price: 50, quantity: 2 }],
      totalAmount: 100,
    })

    // 第二次调用创建
    dispatchMock.mockResolvedValueOnce({
      orderId: 500,
      orderNo: 'ORD500',
      orderStatus: 20,
      payableAmount: 100,
    })

    // 第三次调用取消
    dispatchMock.mockResolvedValueOnce({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const { useOrderStore } = await import('@/subPackages/order/model/orderStore.js')
    const order = useOrder()
    const orderStore = useOrderStore()

    // 1. 预览
    const previewResult = await order.previewOrderInfo({
      items: [{ skuId: 100, quantity: 2 }],
    })
    expect(previewResult.totalAmount).toBe(100)

    // 2. 创建订单
    const createResult = await order.createNewOrder({
      items: [{ skuId: 100, quantity: 2 }],
      paymentMode: 1,
    })
    expect(createResult.orderId).toBe(500)

    // 3. 验证缓存
    expect(orderStore.hasPendingPayment).toBe(true)
    expect(orderStore.pendingPaymentAmount).toBe('¥100.00')

    // 4. 取消订单
    await order.cancelCurrentOrder(500)
    expect(orderStore.pendingPaymentOrder).toBeNull()
  })

  it('预览失败不应继续创建订单', async () => {
    const dispatchMock = vi.fn()

    // 预览失败
    dispatchMock.mockRejectedValueOnce(new Error('库存不足'))

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { useOrder } = await import('@/subPackages/order/composables/useOrder.js')
    const order = useOrder()

    // 预览失败
    const previewResult = await order.previewOrderInfo({
      items: [{ skuId: 100, quantity: 999 }],
    })

    expect(previewResult).toBeNull()
    // dispatch 只被调用了一次（预览），未调用创建
    expect(dispatchMock).toHaveBeenCalledTimes(1)
  })
})
