import { describe, expect, it } from 'vitest'
import { groupItemsBySpu, filterCartItems } from '@/subPackages/commerce/model/cartGrouping.js'

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

describe('cart local search', () => {
  const items = [
    {cartItemId:1,productId:10,skuId:11,name:'比赛服',skuName:'蓝色 / M',skuCode:'KH-001',barcode:'0012345678901',selected:false,quantity:2},
    {cartItemId:2,productId:10,skuId:12,name:'比赛服',skuName:'红色 / L',skuCode:'KH-002',barcode:'0012345678902',selected:true,quantity:3},
    {cartItemId:3,productId:20,skuId:13,name:'球鞋',skuName:'白色 / 42',code:'SHOE-01',selected:true,quantity:1,canPurchase:false},
  ]
  it('matches product, specification, case-insensitive SKU and exact barcode including leading zeros', () => {
    for (const word of ['比赛服 蓝色','ｋｈ－００１','0012345678901']) expect(filterCartItems(items,word)).toEqual([items[0]])
    expect(filterCartItems(items,'shoe-01')).toEqual([items[2]])
    expect(filterCartItems(items,'missing')).toEqual([])
    expect(filterCartItems(items,'  ')).toBe(items)
  })
  it('retains the SPU wrapper and original selection when only one SKU matches', () => {
    const result=filterCartItems(items,'KH-002'),groups=groupItemsBySpu(result)
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({key:'spu-10',name:'比赛服',skuCount:1,totalQuantity:3})
    expect(groups[0].items[0]).toBe(items[1])
    expect(items.map(item=>item.selected)).toEqual([false,true,true])
  })
  it('keeps missing product records as separate named SPU cards without guessing a parent', () => {
    const groups=groupItemsBySpu([{cartItemId:90,skuId:91,skuName:'L'},{cartItemId:92,skuId:93,skuName:'L'}])
    expect(groups).toHaveLength(2)
    expect(groups.every(group=>group.name && group.items.length===1)).toBe(true)
  })
})
