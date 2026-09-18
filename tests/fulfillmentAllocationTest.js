import { describe, expect, it } from 'vitest'
import {
  addAllocation,
  buildFulfillmentGroups,
  changeAllocationAddress,
  changeAllocationQuantity,
  createAllocationPlan,
  removeAllocation,
  validateAllocationPlan,
} from '../src/subPackages/order/domain/fulfillmentAllocation.js'

const items = [
  { orderItemId: 101, quantity: 3 },
  { orderItemId: 102, quantity: 4 },
  { orderItemId: 103, quantity: 5 },
]

function totalOf(planItem) {
  return planItem.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0)
}

describe('配送安排商品数量分配', () => {
  it('支持 A×3 整行换地址、B×4 部分拆分、C×5 保持原地址', () => {
    const plan = createAllocationPlan(items, 1)
    plan[0] = changeAllocationAddress(plan[0], 0, 2)
    plan[1] = addAllocation(plan[1], 2)
    plan[1] = changeAllocationQuantity(plan[1], 1, 2)

    expect(plan[0].allocations).toEqual([expect.objectContaining({ addressId: 2, quantity: 3 })])
    expect(plan[1].allocations.map(row => [row.addressId, row.quantity])).toEqual([[1, 2], [2, 2]])
    expect(plan[2].allocations).toEqual([expect.objectContaining({ addressId: 1, quantity: 5 })])
    expect(plan.map(totalOf)).toEqual([3, 4, 5])

    const groups = buildFulfillmentGroups(plan)
    expect(groups).toHaveLength(2)
    expect(groups.find(group => group.addressId === 1)?.items).toEqual([
      { orderItemId: 102, quantity: 2 },
      { orderItemId: 103, quantity: 5 },
    ])
    expect(groups.find(group => group.addressId === 2)?.items).toEqual([
      { orderItemId: 101, quantity: 3 },
      { orderItemId: 102, quantity: 2 },
    ])
    expect(validateAllocationPlan(plan, [1, 2])).toBe('')
  })

  it('同一商品支持拆到三个地址且每次操作总数恒定', () => {
    let item = createAllocationPlan([{ orderItemId: 201, quantity: 4 }], 1)[0]
    item = addAllocation(item, 2)
    item = addAllocation(item, 3)

    expect(item.allocations.map(row => row.quantity)).toEqual([2, 1, 1])
    item = changeAllocationQuantity(item, 2, 2)
    expect(item.allocations.map(row => row.quantity)).toEqual([1, 1, 2])
    expect(totalOf(item)).toBe(4)
  })

  it('删除任意去向时自动合并数量，不产生待分配件数', () => {
    let item = createAllocationPlan([{ orderItemId: 301, quantity: 5 }], 1)[0]
    item = addAllocation(item, 2)
    item = changeAllocationQuantity(item, 1, 3)
    item = removeAllocation(item, 0)

    expect(item.allocations).toHaveLength(1)
    expect(item.allocations[0]).toEqual(expect.objectContaining({ addressId: 2, quantity: 5 }))
  })

  it('一个商品在两个去向间选择重复地址时交换地址而不是产生重复行', () => {
    let item = createAllocationPlan([{ orderItemId: 401, quantity: 2 }], 1)[0]
    item = addAllocation(item, 2)
    item = changeAllocationAddress(item, 1, 1)

    expect(item.allocations.map(row => row.addressId)).toEqual([2, 1])
    expect(totalOf(item)).toBe(2)
  })

  it('数量为 1 的商品不能继续拆分，但可以整行更换地址', () => {
    let item = createAllocationPlan([{ orderItemId: 501, quantity: 1 }], 1)[0]
    item = addAllocation(item, 2)
    expect(item.allocations).toHaveLength(1)
    item = changeAllocationAddress(item, 0, 2)
    expect(item.allocations[0]).toEqual(expect.objectContaining({ addressId: 2, quantity: 1 }))
  })

  it('拦截无效地址、数量缺失以及超过十个配送地址', () => {
    const plan = createAllocationPlan([{ orderItemId: 601, quantity: 2 }], 1)
    expect(validateAllocationPlan(plan, [2])).toBe('请选择有效的收货地址')

    plan[0].allocations[0].quantity = 1
    expect(validateAllocationPlan(plan, [1])).toBe('每件商品都必须按原数量完整分配')

    const many = Array.from({ length: 11 }, (_, index) => ({
      orderItemId: 700 + index,
      totalQuantity: 1,
      allocations: [{ key: String(index), addressId: index + 1, quantity: 1 }],
    }))
    expect(validateAllocationPlan(many, Array.from({ length: 11 }, (_, index) => index + 1))).toBe('一次最多安排到 10 个收货地址')
  })
})
