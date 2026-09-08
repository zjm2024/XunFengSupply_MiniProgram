/**
 * 订单 API 层映射测试
 *
 * 覆盖：
 * 1. camelCase → PascalCase 请求转换
 * 2. PascalCase → camelCase 响应映射
 * 3. 数值安全解析和默认值
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('Order API Layer - Request Mapping', () => {
  it('previewOrder 应将 camelCase 转换为 PascalCase', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { previewOrder } = await import('@/subPackages/order/api/orderApi.js')

    await previewOrder({
      items: [{ skuId: 100, quantity: 3 }, { skuId: 200, quantity: 5 }],
      addressId: 42,
      deliveryType: 1,
    })

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.OrderController',
      'PreviewOrder',
      {
        Items: [
          { SkuId: 100, Quantity: 3 },
          { SkuId: 200, Quantity: 5 },
        ],
        AddressId: 42,
        DeliveryType: 1,
      },
    )
  })

  it('createOrder 应将 camelCase 转换为 PascalCase', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { createOrder } = await import('@/subPackages/order/api/orderApi.js')

    await createOrder({
      clientRequestId: 'mini-123-456',
      items: [{ skuId: 100, quantity: 2 }],
      addressId: 10,
      paymentMode: 1,
      deliveryType: 2,
      customerRemark: '请尽快发货',
    })

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.OrderController',
      'CreateOrder',
      {
        ClientRequestId: 'mini-123-456',
        Items: [{ SkuId: 100, Quantity: 2 }],
        AddressId: 10,
        PaymentMode: 1,
        DeliveryType: 2,
        CustomerRemark: '请尽快发货',
      },
    )
  })

  it('cancelOrder 应将 camelCase 转换为 PascalCase', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { cancelOrder } = await import('@/subPackages/order/api/orderApi.js')

    await cancelOrder({
      orderId: 999,
      clientRequestId: 'mini-789-000',
      reason: '不想要了',
    })

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.OrderController',
      'CancelOrder',
      {
        OrderId: 999,
        ClientRequestId: 'mini-789-000',
        ReasonCode: null,
        Reason: '不想要了',
      },
    )
  })

  it('confirmReceipt 应将 camelCase 转换为 PascalCase', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { confirmReceipt } = await import('@/subPackages/order/api/orderApi.js')

    await confirmReceipt({
      orderId: 888,
      clientRequestId: 'mini-111-222',
    })

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.OrderController',
      'ConfirmReceipt',
      {
        OrderId: 888,
        ClientRequestId: 'mini-111-222',
      },
    )
  })

  it('createOrder 数量最小限制为 1', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { createOrder } = await import('@/subPackages/order/api/orderApi.js')

    await createOrder({
      clientRequestId: 'test',
      items: [{ skuId: 100, quantity: 0 }],
    })

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.OrderController',
      'CreateOrder',
      expect.objectContaining({
        Items: [{ SkuId: 100, Quantity: 1 }],
      }),
    )
  })
})

describe('Order API Layer - Response Mapping', () => {
  it('createOrder 应将 PascalCase 响应转换为 camelCase', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({
      OrderId: 12345,
      OrderNo: 'ORD20260905001',
      OrderStatus: 20,
      PayableAmount: 1999.99,
    })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { createOrder } = await import('@/subPackages/order/api/orderApi.js')
    const result = await createOrder({
      clientRequestId: 'test',
      items: [{ skuId: 100, quantity: 1 }],
    })

    expect(result.orderId).toBe(12345)
    expect(result.orderNo).toBe('ORD20260905001')
    expect(result.orderStatus).toBe(20)
    expect(result.payableAmount).toBe(1999.99)
  })

  it('getOrderList 应将 PascalCase 响应转换为 camelCase', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({
      Items: [
        { OrderId: 1, OrderNo: 'ORD001', OrderStatus: 20 },
        { OrderId: 2, OrderNo: 'ORD002', OrderStatus: 40 },
      ],
      TotalCount: 2,
      PageNum: 1,
      PageSize: 10,
      TotalPages: 1,
    })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { getOrderList } = await import('@/subPackages/order/api/orderApi.js')
    const result = await getOrderList({ pageNum: 1, pageSize: 10 })

    expect(result.items).toHaveLength(2)
    expect(result.items[0].orderId).toBe(1)
    expect(result.items[0].orderNo).toBe('ORD001')
    expect(result.items[0].orderStatus).toBe(20)
    expect(result.totalCount).toBe(2)
  })

  it('getOrderCounts 应兼容 camelCase 和 PascalCase', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({
      AllCount: 10,
      PendingPaymentCount: 2,
      ProcessingCount: 3,
      ShippedCount: 4,
      CompletedCount: 1,
      CancelledCount: 0,
    })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { getOrderCounts } = await import('@/subPackages/order/api/orderApi.js')
    const result = await getOrderCounts()

    expect(result.allCount).toBe(10)
    expect(result.pendingPaymentCount).toBe(2)
    expect(result.processingCount).toBe(3)
    expect(result.shippedCount).toBe(4)
    expect(result.completedCount).toBe(1)
    expect(result.cancelledCount).toBe(0)
  })
})

describe('AfterSale API Layer', () => {
  it('applyAfterSale 应将 camelCase 转换为 PascalCase', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { applyAfterSale } = await import('@/subPackages/order/api/afterSaleApi.js')

    await applyAfterSale({
      orderId: 100,
      afterSaleType: 1,
      reason: '商品质量问题',
      refundAmount: 99.9,
      clientRequestId: 'test-123',
    })

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.AfterSaleController',
      'ApplyAfterSale',
      {
        OrderId: 100,
        AfterSaleType: 1,
        ReasonCode: null,
        Reason: '商品质量问题',
        RefundAmount: 99.9,
        ClientRequestId: 'test-123',
      },
    )
  })
})
