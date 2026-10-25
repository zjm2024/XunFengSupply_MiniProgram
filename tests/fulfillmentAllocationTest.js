import { describe, expect, it } from 'vitest'
import {
  addAllocation,
  allocationBalance,
  allocateRemainingToAddress,
  buildFulfillmentGroups,
  changeAllocationAddress,
  changeAllocationQuantity,
  clearAddressAllocation,
  createAllocationPlan,
  removeAllocation,
  setAddressAllocationQuantity,
  transferAddressAllocation,
  validateAllocationPlan,
} from '../src/subPackages/order/domain/fulfillmentAllocation.js'

const items = [
  { orderItemId: 101, quantity: 3 },
  { orderItemId: 102, quantity: 4 },
  { orderItemId: 103, quantity: 5 },
]

/** 汇总一个订单明细已经分到地址的数量。 */
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


describe('显式调入与本地化校验', () => {
  it('部分调入保持总量、其他地址和原输入不变', () => {
    const original = createAllocationPlan([{ orderItemId: 1, quantity: 6 }], 11)[0]
    const snapshot = JSON.stringify(original)
    const moved = transferAddressAllocation(original, 11, 29, 2)
    expect(allocationBalance(moved, 11).current).toBe(4)
    expect(allocationBalance(moved, 29).current).toBe(2)
    expect(allocationBalance(moved).allocated).toBe(6)
    expect(JSON.stringify(original)).toBe(snapshot)
    const movedAgain = transferAddressAllocation(moved, 29, 57, 1)
    expect(allocationBalance(movedAgain, 11).current).toBe(4)
    expect(allocationBalance(movedAgain, 29).current).toBe(1)
    expect(allocationBalance(movedAgain, 57).current).toBe(1)
    expect(allocationBalance(movedAgain).remaining).toBe(0)
  })

  it.each([0, -1, 1.5, 99, NaN])('拒绝无效调入数量 %s，不产生越界分配', quantity => {
    const item = createAllocationPlan([{ orderItemId: 1, quantity: 3 }], 11)[0]
    expect(transferAddressAllocation(item, 11, 29, quantity)).toBe(item)
    expect(transferAddressAllocation(item, 11, 11, 1)).toBe(item)
    expect(transferAddressAllocation(item, 0, 29, 1)).toBe(item)
  })

  it('可本地化校验显示，但默认中文和可提交判定保持原样', () => {
    const plan = createAllocationPlan([{ orderItemId: 1, quantity: 3 }], 11)
    expect(validateAllocationPlan(plan, [11], 10, key => 'translated:' + key)).toBe('')
    expect(validateAllocationPlan(plan, [], 10, key => 'translated:' + key)).toBe('translated:invalidAddress')
    expect(validateAllocationPlan(plan, [])).toBe('请选择有效的收货地址')
    plan[0] = setAddressAllocationQuantity(plan[0], 11, 1)
    expect(validateAllocationPlan(plan, [11], 10, key => 'translated:' + key)).toBe('translated:quantityMismatch')
  })
})

describe('按地址批量操作多规格数量', () => {
  it('跨 SKU 按真实剩余追加到当前数量，三个地址互不挪量且重复分配不超配', () => {
    let plan = createAllocationPlan([
      { orderItemId: 101, quantity: 3 },
      { orderItemId: 102, quantity: 4 },
      { orderItemId: 103, quantity: 1 },
      { orderItemId: 104, quantity: 2 },
    ], 11)
    plan[0] = setAddressAllocationQuantity(plan[0], 11, 1)
    plan[1] = setAddressAllocationQuantity(plan[1], 11, 2)
    plan[1] = setAddressAllocationQuantity(plan[1], 29, 1)
    plan[3] = setAddressAllocationQuantity(plan[3], 11, 0)
    plan[3] = setAddressAllocationQuantity(plan[3], 57, 1)
    const snapshot = JSON.parse(JSON.stringify(plan))
    const next = allocateRemainingToAddress(plan, '29')
    expect(plan).toEqual(snapshot)
    expect(next.map(item => allocationBalance(item, 29).current)).toEqual([2, 2, 0, 1])
    for (let i = 0; i < next.length; i++) {
      for (const otherAddress of [11, 57]) {
        expect(allocationBalance(next[i], otherAddress).current).toBe(allocationBalance(plan[i], otherAddress).current)
      }
      const balance = allocationBalance(next[i], 29)
      expect(balance.remaining).toBe(0)
      expect(balance.allocated).toBe(balance.total)
    }
    expect(validateAllocationPlan(next, [11, 29, 57])).toBe('')
    expect(allocateRemainingToAddress(next, 29)).toEqual(next)
    expect(allocateRemainingToAddress(next, 57)).toEqual(next)
  })

  it('批量清空仅释放目标地址；清空后再分配精确保留各 SKU 总量与其他地址', () => {
    let plan = createAllocationPlan(items, 11)
    plan = plan.map(item => setAddressAllocationQuantity(item, 11, 1))
    plan = allocateRemainingToAddress(plan, 29)
    const snapshot = JSON.parse(JSON.stringify(plan))
    const cleared = clearAddressAllocation(plan, 29)
    expect(plan).toEqual(snapshot)
    expect(cleared.map(item => allocationBalance(item, 29).current)).toEqual([0, 0, 0])
    expect(cleared.map(item => allocationBalance(item, 11).current)).toEqual([1, 1, 1])
    expect(cleared.map(item => allocationBalance(item).remaining)).toEqual([2, 3, 4])
    expect(clearAddressAllocation(cleared, 29)).toEqual(cleared)
    const restored = allocateRemainingToAddress(cleared, 57)
    expect(restored.map(item => item.totalQuantity)).toEqual([3, 4, 5])
    expect(validateAllocationPlan(restored, [11, 29, 57])).toBe('')
    const groups = buildFulfillmentGroups(restored)
    expect(groups.map(group => group.addressId).sort()).toEqual([11, 57])
    expect(groups.find(group => group.addressId === 57).items).toEqual([
      { orderItemId: 101, quantity: 2 }, { orderItemId: 102, quantity: 3 }, { orderItemId: 103, quantity: 4 },
    ])
  })

  it('20 个尺码一键清空、一键转移和重复执行，不丢量、不产生零数量提交项', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ orderItemId: 1000 + i, quantity: i % 3 + 1 }))
    const initial = createAllocationPlan(many, 11)
    let plan = clearAddressAllocation(initial, 11)
    expect(plan.every(item => allocationBalance(item).remaining === item.totalQuantity)).toBe(true)
    plan = allocateRemainingToAddress(plan, 29)
    plan = clearAddressAllocation(plan, 29)
    plan = allocateRemainingToAddress(plan, 57)
    plan = allocateRemainingToAddress(plan, 57)
    expect(buildFulfillmentGroups(plan)).toEqual([
      { name: '配送单1', addressId: 57, items: many.map(item => ({ orderItemId: item.orderItemId, quantity: item.quantity })) },
    ])
    expect(initial.every(item => allocationBalance(item, 11).current === item.totalQuantity)).toBe(true)
    expect(allocateRemainingToAddress(plan, 0)).toEqual(plan)
    expect(clearAddressAllocation(plan, NaN)).toEqual(plan)
    expect(validateAllocationPlan(plan, [11, 29, 57])).toBe('')
  })
})

describe('按地址独立编辑数量', () => {
  it('允许原地址归零并将整件商品分到新地址，剩余与已分配始终等于订单量', () => {
    const original = createAllocationPlan([{ orderItemId: 801, quantity: 1 }], 11)[0]
    let item = setAddressAllocationQuantity(original, 11, 0)
    expect(item.allocations).toEqual([])
    expect(allocationBalance(item, 29)).toEqual({ total: 1, allocated: 0, remaining: 1, current: 0, maximum: 1 })
    expect(validateAllocationPlan([item], [11, 29])).not.toBe('')
    item = setAddressAllocationQuantity(item, '29', 1)
    expect(buildFulfillmentGroups([item])).toEqual([
      { name: '配送单1', addressId: 29, items: [{ orderItemId: 801, quantity: 1 }] },
    ])
    expect(validateAllocationPlan([item], [11, 29])).toBe('')
    expect(original.allocations[0].quantity).toBe(1)
  })

  it('新增地址仅使用剩余，禁止超配或暗中减少另一个地址的数量', () => {
    let item = createAllocationPlan([{ orderItemId: 802, quantity: 5 }], 11)[0]
    expect(setAddressAllocationQuantity(item, 29, 99).allocations).toEqual(item.allocations)
    item = setAddressAllocationQuantity(item, 11, 3)
    expect(allocationBalance(item, 29)).toEqual({ total: 5, allocated: 3, remaining: 2, current: 0, maximum: 2 })
    item = setAddressAllocationQuantity(item, 29, 99)
    expect(item.allocations.map(row => [row.addressId, row.quantity])).toEqual([[11, 3], [29, 2]])
    expect(allocationBalance(item, 11)).toEqual({ total: 5, allocated: 5, remaining: 0, current: 3, maximum: 3 })
    expect(validateAllocationPlan([item], [11, 29])).toBe('')
  })

  it('手输数量取整数、允许负数归零，非数字或无限数不破坏原分配', () => {
    let item = createAllocationPlan([{ orderItemId: 803, quantity: 5 }], 11)[0]
    item = setAddressAllocationQuantity(item, 11, '2.9')
    expect(allocationBalance(item, 11).current).toBe(2)
    for (const invalid of ['abc', Infinity, NaN, -Infinity]) {
      expect(setAddressAllocationQuantity(item, 11, invalid)).toEqual(item)
    }
    const original = item
    item = setAddressAllocationQuantity(item, 11, -1)
    expect(allocationBalance(item, 11).remaining).toBe(5)
    expect(allocationBalance(original, 11).current).toBe(2)
  })

  it('多尺码跨三个地址反复编辑，各尺码独立守恒且没有负数和超配', () => {
    let plan = createAllocationPlan(Array.from({ length: 20 }, (_, i) => ({
      orderItemId: 900 + i, quantity: i + 1,
    })), 11)
    for (let i = 0; i < plan.length; i++) {
      const total = i + 1
      plan[i] = setAddressAllocationQuantity(plan[i], 11, 0)
      plan[i] = setAddressAllocationQuantity(plan[i], 29, Math.floor(total / 2))
      plan[i] = setAddressAllocationQuantity(plan[i], 57, 9999)
      plan[i] = setAddressAllocationQuantity(plan[i], 57, 0)
      plan[i] = setAddressAllocationQuantity(plan[i], 11, 9999)
      const balance = allocationBalance(plan[i], 11)
      expect(balance.allocated + balance.remaining).toBe(total)
      expect(balance.allocated).toBe(total)
      expect(plan[i].allocations.every(row => Number.isInteger(row.quantity) && row.quantity > 0)).toBe(true)
    }
    expect(validateAllocationPlan(plan, [11, 29, 57])).toBe('')
    for (const item of plan) {
      expect(buildFulfillmentGroups(plan).flatMap(group => group.items)
        .filter(row => row.orderItemId === item.orderItemId).reduce((sum, row) => sum + row.quantity, 0))
        .toBe(item.totalQuantity)
    }
  })

  it('零数量不提交，数字与字符串的同一地址仍按重复地址拦截', () => {
    const plan = createAllocationPlan([{ orderItemId: 804, quantity: 2 }], 11)
    plan[0].allocations.push({ key: 'empty', addressId: 29, quantity: 0 })
    expect(validateAllocationPlan(plan, [11, 29])).toBe('')
    expect(buildFulfillmentGroups(plan)).toHaveLength(1)
    expect(buildFulfillmentGroups(plan)[0].items).toEqual([{ orderItemId: 804, quantity: 2 }])
    plan[0].allocations = [
      { key: 'numeric', addressId: 11, quantity: 1 },
      { key: 'string', addressId: '11', quantity: 1 },
    ]
    expect(validateAllocationPlan(plan, [11])).toBe('同一商品不能重复选择相同地址')
    const switched = changeAllocationAddress(plan[0], 0, '11')
    expect(totalOf(switched)).toBe(2)
  })
})
