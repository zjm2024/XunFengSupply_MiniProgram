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
      omitUnavailableGifts: true,
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
        OmitUnavailableGifts: true,
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
      GiftOmitted: true,
      OmittedGiftSkus: ['GIFT-001'],
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
    expect(result.giftOmitted).toBe(true)
    expect(result.omittedGiftSkus).toEqual(['GIFT-001'])
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

describe('Fulfillment Address API Layer', () => {
  it('getFulfillmentAddressList 应兼容分页对象并保留全部地址', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({
      Items: [
        {
          AddressId: 11,
          ContactName: '张三',
          ContactPhone: '13800000001',
          Province: '广东省',
          City: '广州市',
          District: '番禺区',
          AddressDetail: '地址一',
          IsDefault: true,
        },
        {
          AddressId: 12,
          ContactName: '李四',
          ContactPhone: '13800000002',
          Province: '广东省',
          City: '广州市',
          District: '海珠区',
          AddressDetail: '地址二',
          IsDefault: false,
        },
      ],
      TotalCount: 2,
    })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { getFulfillmentAddressList } = await import('@/subPackages/order/api/orderApi.js')
    const result = await getFulfillmentAddressList()

    expect(result).toHaveLength(2)
    expect(result.map(item => item.id)).toEqual([11, 12])
    expect(result[0]).toEqual(expect.objectContaining({
      name: '张三',
      fullAddress: '广东省广州市番禺区地址一',
      isDefault: true,
    }))
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
      items: [{ orderItemId: 2001, quantity: 2 }],
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
        Items: [{ OrderItemId: 2001, Quantity: 2 }],
        ClientRequestId: 'test-123',
      },
    )
  })
})
