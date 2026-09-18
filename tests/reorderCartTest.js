import { describe, expect, it } from 'vitest'
import { buildReorderCartItems } from '@/subPackages/order/domain/reorderCart.js'

describe('订单再来一单购物车明细', () => {
  it('保留普通商品原数量并排除促销赠品', () => {
    const result = buildReorderCartItems([
      { skuId: 101, quantity: 3, isGift: false },
      { skuId: 202, quantity: 4, isGift: false },
      { skuId: 303, quantity: 1, isGift: true },
    ])

    expect(result).toEqual([
      { skuId: 101, quantity: 3 },
      { skuId: 202, quantity: 4 },
    ])
  })

  it('兼容 PascalCase 响应并合并重复 SKU', () => {
    const result = buildReorderCartItems([
      { SkuId: 101, Quantity: 2, IsGift: false },
      { skuId: 101, quantity: 1, isGift: false },
    ])

    expect(result).toEqual([{ skuId: 101, quantity: 3 }])
  })

  it('过滤缺少 SKU、非正整数数量和只有赠品的明细', () => {
    expect(buildReorderCartItems([
      { skuId: 0, quantity: 1 },
      { skuId: 101, quantity: 0 },
      { skuId: 202, quantity: 1.5 },
      { skuId: 303, quantity: 1, isGift: true },
    ])).toEqual([])
  })
})
