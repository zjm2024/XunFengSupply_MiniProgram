/**
 * 购物车 DTO 映射测试
 *
 * 覆盖：
 * 1. PascalCase → camelCase 转换
 * 2. 多字段兼容（新旧 DTO 字段）
 * 3. 默认值和安全解析
 * 4. 数值边界处理
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('Cart API Layer', () => {
  it('batchUpdateQuantity 应将 camelCase 转换为 PascalCase', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { batchUpdateQuantity } = await import('@/subPackages/commerce/api/cartApi.js')

    await batchUpdateQuantity([
      { cartItemId: 1, quantity: 5 },
      { cartItemId: 2, quantity: 10 },
    ])

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.CartController',
      'BatchUpdateQuantity',
      {
        Items: [
          { CartItemId: 1, Quantity: 5 },
          { CartItemId: 2, Quantity: 10 },
        ],
      },
    )
  })

  it('removeItems 应接收数组并转为 PascalCase', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { removeItems } = await import('@/subPackages/commerce/api/cartApi.js')

    await removeItems([1, 2, 3])

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.CartController',
      'RemoveItems',
      { CartItemIds: [1, 2, 3] },
    )
  })

  it('selectItems 应接收 camelCase 对象并转为 PascalCase', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { selectItems } = await import('@/subPackages/commerce/api/cartApi.js')

    await selectItems({ cartItemIds: [1, 2], selected: true })

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.CartController',
      'SelectItems',
      { CartItemIds: [1, 2], Selected: true },
    )
  })

  it('selectAll 应接收布尔值并转为 PascalCase', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { selectAll } = await import('@/subPackages/commerce/api/cartApi.js')

    await selectAll(false)

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.CartController',
      'SelectAll',
      { Selected: false },
    )
  })

  it('addToCart 应接收 camelCase 参数并转为 PascalCase', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { addToCart } = await import('@/subPackages/commerce/api/cartApi.js')

    await addToCart({ skuId: 123, quantity: 5 })

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.CartController',
      'AddToCart',
      { SkuId: 123, Quantity: 5 },
    )
  })

  it('batchAddToCart 应把多个 SKU 合并为一次后端请求并携带幂等键', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({ items: [] })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { batchAddToCart } = await import('@/subPackages/commerce/api/cartApi.js')

    await batchAddToCart({
      items: [
        { skuId: 101, quantity: 6 },
        { skuId: 102, quantity: 12 },
      ],
      clientRequestId: 'batch-request-1',
    })

    expect(dispatchMock).toHaveBeenCalledTimes(1)
    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.CartController',
      'BatchAddToCart',
      {
        Items: [
          { SkuId: 101, Quantity: 6 },
          { SkuId: 102, Quantity: 12 },
        ],
        ClientRequestId: 'batch-request-1',
      },
    )
  })

  it('batchAddToCart 空明细应 reject 且不能请求后端', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { batchAddToCart } = await import('@/subPackages/commerce/api/cartApi.js')

    await expect(batchAddToCart({ items: [] })).rejects.toThrow('请选择需要采购的商品规格')
    expect(dispatchMock).not.toHaveBeenCalled()
  })

  it('batchUpdateQuantity 最小数量限制为 1', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { batchUpdateQuantity } = await import('@/subPackages/commerce/api/cartApi.js')

    await batchUpdateQuantity([{ cartItemId: 1, quantity: 0 }])

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.CartController',
      'BatchUpdateQuantity',
      { Items: [{ CartItemId: 1, Quantity: 1 }] },
    )
  })

  it('空数组 batchUpdateQuantity 应 reject', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { batchUpdateQuantity } = await import('@/subPackages/commerce/api/cartApi.js')

    await expect(batchUpdateQuantity([])).rejects.toThrow('批量修改数量需要至少一条变更')
    expect(dispatchMock).not.toHaveBeenCalled()
  })

  it('空数组 removeItems 应 reject', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({})

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { removeItems } = await import('@/subPackages/commerce/api/cartApi.js')

    await expect(removeItems([])).rejects.toThrow('请选择需要删除的商品')
    expect(dispatchMock).not.toHaveBeenCalled()
  })
})

describe('Cart Mapper - normalizeCartItem (indirect test)', () => {
  it('getCartList 应将后端响应转换为领域模型', async () => {
    const backendResponse = {
      items: [
        {
          CartItemId: 100,
          ProductId: 10,
          SkuId: 1001,
          ProductName: '测试商品',
          SkuName: '红色-L',
          CurrentPrice: 99.5,
          Quantity: 5,
          DisplayStock: 100,
          IsSelected: true,
          SubTotal: 497.5,
          MinOrderQty: 2,
          CanPurchase: true,
          ImageUrl: 'https://example.com/image.jpg',
        },
      ],
      summary: {
        ProductCount: 1,
        SelectedCount: 1,
        TotalQuantity: 5,
        SelectedQuantity: 5,
        TotalAmount: 497.5,
        SelectedAmount: 497.5,
      },
    }

    const dispatchMock = vi.fn().mockResolvedValue(backendResponse)

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { getCartList } = await import('@/subPackages/commerce/api/cartApi.js')
    const result = await getCartList()

    expect(result.items[0]).toMatchObject({
      cartItemId: 100,
      productId: 10,
      skuId: 1001,
      name: '测试商品',
      skuName: '红色-L',
      price: 99.5,
      quantity: 5,
      stock: 100,
      selected: true,
      subtotal: 497.5,
      minOrderQty: 2,
      canPurchase: true,
    })
  })

  it('getCartList 应兼容 camelCase 后端响应', async () => {
    const backendResponse = {
      items: [
        {
          cartItemId: 200,
          product_id: 20,
          sku_id: 2001,
          product_name: '商品2',
          sku_name: '蓝色-M',
          current_price: 50,
          quantity: 3,
          display_stock: 50,
          is_selected: false,
          sub_total: 150,
          min_order_qty: 1,
          can_purchase: true,
        },
      ],
    }

    const dispatchMock = vi.fn().mockResolvedValue(backendResponse)

    vi.doMock('@/shared/api/dispatchClient.js', () => ({
      dispatch: dispatchMock,
    }))

    const { getCartList } = await import('@/subPackages/commerce/api/cartApi.js')
    const result = await getCartList()

    expect(result.items[0]).toMatchObject({
      cartItemId: 200,
      productId: 20,
      skuId: 2001,
      name: '商品2',
      price: 50,
      quantity: 3,
      selected: false,
    })
  })
})
