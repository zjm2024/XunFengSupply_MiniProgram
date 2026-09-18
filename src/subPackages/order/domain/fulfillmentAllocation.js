let allocationSequence = 0

function positiveInteger(value, fallback = 0) {
  const parsed = Math.floor(Number(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function clonePlanItem(item) {
  return {
    ...item,
    allocations: (item.allocations || []).map(allocation => ({ ...allocation })),
  }
}

function nextAllocationKey(orderItemId) {
  allocationSequence += 1
  return `${orderItemId}-${allocationSequence}`
}

/**
 * 为每个订单商品创建一条完整数量的默认配送去向。
 * 后续可以整行切换地址，也可以从该行拆出部分数量到其他地址。
 */
export function createAllocationPlan(items = [], preferredAddressId = 0) {
  return items.map(item => {
    const orderItemId = positiveInteger(item?.orderItemId ?? item?.OrderItemId)
    const totalQuantity = positiveInteger(item?.quantity ?? item?.Quantity)
    return {
      orderItemId,
      totalQuantity,
      allocations: totalQuantity > 0
        ? [{
            key: nextAllocationKey(orderItemId),
            addressId: positiveInteger(preferredAddressId),
            quantity: totalQuantity,
          }]
        : [],
    }
  })
}

/**
 * 将商品当前某一去向改为目标地址；目标地址已存在时交换两条去向，避免重复地址。
 */
export function changeAllocationAddress(planItem, allocationIndex, addressId) {
  const next = clonePlanItem(planItem)
  const target = next.allocations[allocationIndex]
  const normalizedAddressId = positiveInteger(addressId)
  if (!target || normalizedAddressId <= 0) return next

  const duplicateIndex = next.allocations.findIndex((allocation, index) => (
    index !== allocationIndex && allocation.addressId === normalizedAddressId
  ))
  if (duplicateIndex >= 0) {
    next.allocations[duplicateIndex].addressId = target.addressId
  }
  target.addressId = normalizedAddressId
  return next
}

/**
 * 从数量最多的现有去向拆出 1 件到新地址，并始终保持商品总数量不变。
 */
export function addAllocation(planItem, addressId) {
  const next = clonePlanItem(planItem)
  const normalizedAddressId = positiveInteger(addressId)
  if (normalizedAddressId <= 0
    || next.allocations.some(allocation => allocation.addressId === normalizedAddressId)
    || next.allocations.length >= next.totalQuantity) {
    return next
  }

  const donor = [...next.allocations]
    .sort((left, right) => right.quantity - left.quantity)
    .find(allocation => allocation.quantity > 1)
  if (!donor) return next

  donor.quantity -= 1
  next.allocations.push({
    key: nextAllocationKey(next.orderItemId),
    addressId: normalizedAddressId,
    quantity: 1,
  })
  return next
}

/**
 * 删除一个配送去向，并把其数量自动合并到剩余第一条去向，避免出现待分配数量。
 */
export function removeAllocation(planItem, allocationIndex) {
  const next = clonePlanItem(planItem)
  if (next.allocations.length <= 1 || !next.allocations[allocationIndex]) return next
  const [removed] = next.allocations.splice(allocationIndex, 1)
  next.allocations[0].quantity += removed.quantity
  return next
}

/**
 * 调整某一去向的数量，并自动从其他去向增减相同数量，保证每条至少 1 件且总数恒定。
 */
export function changeAllocationQuantity(planItem, allocationIndex, requestedQuantity) {
  const next = clonePlanItem(planItem)
  const target = next.allocations[allocationIndex]
  if (!target || next.allocations.length <= 1) return next

  const maximum = Math.max(1, next.totalQuantity - (next.allocations.length - 1))
  const requested = Math.min(maximum, Math.max(1, positiveInteger(requestedQuantity, 1)))
  let delta = requested - target.quantity
  if (delta === 0) return next

  if (delta > 0) {
    for (let index = 0; index < next.allocations.length && delta > 0; index += 1) {
      if (index === allocationIndex) continue
      const donor = next.allocations[index]
      const transferable = Math.min(delta, Math.max(0, donor.quantity - 1))
      donor.quantity -= transferable
      delta -= transferable
    }
  } else {
    const recipientIndex = allocationIndex === 0 ? 1 : 0
    next.allocations[recipientIndex].quantity += Math.abs(delta)
    delta = 0
  }

  target.quantity = next.totalQuantity
    - next.allocations.reduce((sum, allocation, index) => (
        index === allocationIndex ? sum : sum + allocation.quantity
      ), 0)
  return next
}

/** 返回单条去向在保留其他去向至少 1 件时允许设置的最大数量。 */
export function maximumAllocationQuantity(planItem) {
  return Math.max(1, Number(planItem?.totalQuantity || 0) - Math.max(0, (planItem?.allocations?.length || 1) - 1))
}

/**
 * 校验商品维度的分配方案，返回可直接展示给客户的错误提示；空字符串表示通过。
 */
export function validateAllocationPlan(plan = [], availableAddressIds = [], maximumGroups = 10) {
  if (!plan.length) return '订单没有可安排配送的商品'
  const addressSet = new Set(availableAddressIds.map(value => positiveInteger(value)).filter(Boolean))
  const usedAddressIds = new Set()

  for (const item of plan) {
    if (!item.orderItemId || item.totalQuantity <= 0 || !item.allocations?.length) {
      return '存在未完成配送安排的商品'
    }
    const itemAddressIds = new Set()
    let allocated = 0
    for (const allocation of item.allocations) {
      if (!addressSet.has(positiveInteger(allocation.addressId))) return '请选择有效的收货地址'
      if (itemAddressIds.has(allocation.addressId)) return '同一商品不能重复选择相同地址'
      if (!Number.isInteger(allocation.quantity) || allocation.quantity <= 0) return '配送数量必须是大于 0 的整数'
      itemAddressIds.add(allocation.addressId)
      usedAddressIds.add(allocation.addressId)
      allocated += allocation.quantity
    }
    if (allocated !== item.totalQuantity) return '每件商品都必须按原数量完整分配'
  }

  if (usedAddressIds.size > maximumGroups) return `一次最多安排到 ${maximumGroups} 个收货地址`
  return ''
}

/**
 * 将商品维度的分配结果按地址归并成后端需要的配送分组。
 */
export function buildFulfillmentGroups(plan = []) {
  const groupMap = new Map()
  for (const item of plan) {
    for (const allocation of item.allocations || []) {
      if (!groupMap.has(allocation.addressId)) {
        groupMap.set(allocation.addressId, {
          addressId: allocation.addressId,
          items: [],
        })
      }
      groupMap.get(allocation.addressId).items.push({
        orderItemId: item.orderItemId,
        quantity: allocation.quantity,
      })
    }
  }

  return [...groupMap.values()].map((group, index) => ({
    name: `配送单${index + 1}`,
    addressId: group.addressId,
    items: group.items,
  }))
}
