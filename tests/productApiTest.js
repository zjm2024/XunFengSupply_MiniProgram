import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('Product API adapter', () => {
  it('分类树应递归映射全部层级', async () => {
    const dispatchMock = vi.fn().mockResolvedValue([
      {
        categoryId: 1,
        categoryName: '球类',
        children: [
          {
            categoryId: 11,
            categoryName: '羽毛球',
            children: [{ categoryId: 111, categoryName: '比赛用球' }],
          },
        ],
      },
    ])

    vi.doMock('@/shared/api/dispatchClient.js', () => ({ dispatch: dispatchMock }))

    const { getCategoryList } = await import('@/subPackages/commerce/api/productApi.js')
    const result = await getCategoryList()

    expect(result[0]).toMatchObject({ id: 1, name: '球类' })
    expect(result[0].children[0]).toMatchObject({ id: 11, name: '羽毛球' })
    expect(result[0].children[0].children[0]).toMatchObject({ id: 111, name: '比赛用球' })
  })

  it('商品列表应透传分类、库存和排序参数', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({ items: [], totalCount: 0 })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({ dispatch: dispatchMock }))

    const { getGoodsList } = await import('@/subPackages/commerce/api/productApi.js')
    await getGoodsList({
      pageNum: 2,
      pageSize: 30,
      categoryId: 111,
      stockFilter: 'inStock',
      sortField: 'price',
      sortOrder: 'asc',
    })

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallProduct',
      'Mini.ProductController',
      'GetProductList',
      expect.objectContaining({
        pageNum: 2,
        page: 2,
        pageSize: 30,
        categoryId: 111,
        stockFilter: 'inStock',
        sortField: 'price',
        sortOrder: 'asc',
      }),
    )
  })

  it('商品详情应保留后台富文本并正确映射 SKU 规格、库存与价格', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({
      productId: 9,
      productCode: 'KPDH26001',
      productName: '测试鞋子A02',
      imageUrl: 'https://img.example.com/main.jpg',
      description: '<p>详情</p><img src="https://img.example.com/detail.jpg">',
      unit: '件',
      skus: [
        {
          skuId: 901,
          skuCode: 'KPDH26001014S',
          colorId: 14,
          colorName: '红色',
          sizeValueId: 1,
          sizeName: 'S',
          specDesc: '红色 / S',
          currentPrice: 135,
          listPrice: 159,
          minOrderQty: 6,
          displayStock: 88,
          canPurchase: true,
        },
      ],
    })

    vi.doMock('@/shared/api/dispatchClient.js', () => ({ dispatch: dispatchMock }))

    const { getGoodsDetail } = await import('@/subPackages/commerce/api/productApi.js')
    const result = await getGoodsDetail(9)

    expect(result).toMatchObject({
      productId: 9,
      code: 'KPDH26001',
      name: '测试鞋子A02',
      description: '<p>详情</p><img src="https://img.example.com/detail.jpg">',
    })
    expect(result.skus[0]).toMatchObject({
      skuId: 901,
      specName: '红色 / S',
      price: 135,
      listPrice: 159,
      minOrderQty: 6,
      stock: 88,
      canPurchase: true,
    })
  })
})
