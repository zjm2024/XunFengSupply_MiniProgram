import { describe, expect, it } from 'vitest'
import { groupItemsBySpu } from '@/subPackages/commerce/model/cartGrouping.js'

describe('cart SPU grouping', () => {
  it('groups multiple SKUs under the same product', () => {
    const groups = groupItemsBySpu([
      { cartItemId: 1, productId: 10, skuId: 101, name: '训练服', quantity: 2, price: 20, selected: true },
      { cartItemId: 2, productId: 10, skuId: 102, name: '训练服', quantity: 3, price: 30, selected: false },
      { cartItemId: 3, productId: 20, skuId: 201, name: '比赛服', quantity: 1, price: 50, selected: true },
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ key: 'spu-10', skuCount: 2, totalQuantity: 5, totalAmount: 130 })
    expect(groups[0].allSelected).toBe(false)
    expect(groups[0].partiallySelected).toBe(true)
  })

  it('keeps legacy rows without productId in separate groups', () => {
    const groups = groupItemsBySpu([
      { cartItemId: 1, skuId: 101, quantity: 1 },
      { cartItemId: 2, skuId: 102, quantity: 1 },
    ])

    expect(groups.map(group => group.key)).toEqual(['sku-101', 'sku-102'])
  })

  it('uses preview totalAmount when grouping checkout items', () => {
    const [group] = groupItemsBySpu([
      { productId: 10, skuId: 101, quantity: 2, salePrice: 88, totalAmount: 160 },
    ])

    expect(group.totalAmount).toBe(160)
  })
})
