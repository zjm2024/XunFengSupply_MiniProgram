let allocationSequence = 0

/** 将地址、订单明细标识和原始数量转换为正整数。 */
function positiveInteger(value, fallback = 0) {
  const parsed = Math.floor(Number(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** 复制商品分配行，避免编辑时改写调用方的旧方案。 */
function clonePlanItem(item) {
  return {
    ...item,
    allocations: (item.allocations || []).map(allocation => ({ ...allocation })),
  }
}

/** 为新增配送去向生成稳定的页面行标识。 */
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
    index !== allocationIndex && positiveInteger(allocation.addressId) === normalizedAddressId
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

/** 返回单个 SKU 的订单、已分配、剩余及当前地址可设置的数量上限。 */
export function allocationBalance(planItem, addressId) {
  const total = positiveInteger(planItem?.totalQuantity)
  const normalizedAddressId = positiveInteger(addressId)
  let allocated = 0
  let current = 0
  for (const allocation of planItem?.allocations || []) {
    const quantity = positiveInteger(allocation.quantity)
    allocated += quantity
    if (positiveInteger(allocation.addressId) === normalizedAddressId) current += quantity
  }
  return {
    total,
    allocated,
    remaining: Math.max(0, total - allocated),
    current,
    maximum: Math.max(0, total - (allocated - current)),
  }
}

/** 独立编辑当前地址的数量；减量回到待分配、增量仅取剩余，零分配不进入提交明细。 */
export function setAddressAllocationQuantity(planItem, addressId, requestedQuantity) {
  const next = clonePlanItem(planItem)
  const normalizedAddressId = positiveInteger(addressId)
  const parsed = Number(requestedQuantity)
  if (!normalizedAddressId || !Number.isFinite(parsed)) return next
  const balance = allocationBalance(next, normalizedAddressId)
  const quantity = Math.min(balance.maximum, Math.max(0, Math.floor(parsed)))
  const existing = next.allocations.find(allocation => positiveInteger(allocation.addressId) === normalizedAddressId)
  next.allocations = next.allocations.filter(allocation => positiveInteger(allocation.addressId) !== normalizedAddressId)
  if (quantity > 0) {
    next.allocations.push({
      key: existing?.key || nextAllocationKey(next.orderItemId),
      addressId: normalizedAddressId,
      quantity,
    })
  }
  return next
}

/** 逐 SKU 将真实剩余追加到目标地址，保留其他地址数量，不修改原方案。 */
export function allocateRemainingToAddress(plan = [], addressId) {
  const id = positiveInteger(addressId)
  if (!id) return plan
  return plan.map(item => {
    const balance = allocationBalance(item, id)
    return balance.remaining > 0
      ? setAddressAllocationQuantity(item, id, balance.current + balance.remaining)
      : item
  })
}

/** 清空指定地址的所有 SKU 分配并释放为剩余，保留其他地址及订单原数量。 */
export function clearAddressAllocation(plan = [], addressId) {
  const id = positiveInteger(addressId)
  if (!id) return plan
  return plan.map(item => allocationBalance(item, id).current > 0
    ? setAddressAllocationQuantity(item, id, 0)
    : item)
}


/** 显式将一个规格从来源地址调到目标地址，守恒总量且不修改原方案或其他地址。 */
export function transferAddressAllocation(planItem, fromAddressId, toAddressId, requestedQuantity) {
  const from = positiveInteger(fromAddressId)
  const to = positiveInteger(toAddressId)
  const parsed = Number(requestedQuantity)
  if (!from || !to || from === to || !Number.isInteger(parsed) || parsed <= 0) return planItem
  const source = allocationBalance(planItem, from)
  if (parsed > source.current) return planItem
  const target = allocationBalance(planItem, to)
  const reduced = setAddressAllocationQuantity(planItem, from, source.current - parsed)
  return setAddressAllocationQuantity(reduced, to, target.current + parsed)
}

/**
 * 校验商品维度的分配方案，返回可直接展示给客户的错误提示；空字符串表示通过。
 */
export function validateAllocationPlan(plan = [], availableAddressIds = [], maximumGroups = 10, translate = null) {
  const message = (key, fallback, parameters = {}) => translate ? translate(key, parameters) : fallback
  if (!plan.length) return message('noItems', '订单没有可安排配送的商品')
  const addressSet = new Set(availableAddressIds.map(value => positiveInteger(value)).filter(Boolean))
  const usedAddressIds = new Set()

  for (const item of plan) {
    if (!item.orderItemId || item.totalQuantity <= 0 || !item.allocations?.length) {
      return message('incomplete', '存在未完成配送安排的商品')
    }
    const itemAddressIds = new Set()
    let allocated = 0
    for (const allocation of item.allocations) {
      if (!Number.isInteger(allocation.quantity) || allocation.quantity < 0) return message('invalidQuantity', '配送数量必须是大于或等于 0 的整数')
      if (allocation.quantity === 0) continue
      const addressId = positiveInteger(allocation.addressId)
      if (!addressSet.has(addressId)) return message('invalidAddress', '请选择有效的收货地址')
      if (itemAddressIds.has(addressId)) return message('duplicateAddress', '同一商品不能重复选择相同地址')
      itemAddressIds.add(addressId)
      usedAddressIds.add(addressId)
      allocated += allocation.quantity
    }
    if (allocated !== item.totalQuantity) return message('quantityMismatch', '每件商品都必须按原数量完整分配')
  }

  if (usedAddressIds.size > maximumGroups) return message('tooManyAddresses', `一次最多安排到 ${maximumGroups} 个收货地址`, { maximum: maximumGroups })
  return ''
}

/**
 * 将商品维度的分配结果按地址归并成后端需要的配送分组。
 */
export function buildFulfillmentGroups(plan = []) {
  const groupMap = new Map()
  for (const item of plan) {
    for (const allocation of item.allocations || []) {
      if (!Number.isInteger(allocation.quantity) || allocation.quantity <= 0) continue
      const addressId = positiveInteger(allocation.addressId)
      if (!groupMap.has(addressId)) {
        groupMap.set(addressId, {
          addressId,
          items: [],
        })
      }
      groupMap.get(addressId).items.push({
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
