function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function groupKey(item, index) {
  const productId = number(item?.productId)
  if (productId > 0) return `spu-${productId}`
  const skuId = number(item?.skuId)
  if (skuId > 0) return `sku-${skuId}`
  return `cart-item-${item?.cartItemId ?? index}`
}

/**
 * 将扁平购物车/结算明细按 SPU 聚合，同时保留原始 SKU 顺序。
 * 没有 productId 的旧数据会退化为单 SKU 分组，避免错误合并。
 */
export function groupItemsBySpu(items = []) {
  const groups = new Map()

  ;(Array.isArray(items) ? items : []).forEach((item, index) => {
    const key = groupKey(item, index)
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        productId: number(item?.productId) || null,
        name: item?.name || `商品 ${item?.productId || item?.skuId || ''}`.trim(),
        image: item?.image || '',
        items: [],
      })
    }
    groups.get(key).items.push(item)
  })

  return Array.from(groups.values()).map(group => {
    const selectedItems = group.items.filter(item => item?.selected !== false && item?.canPurchase !== false)
    const purchasableItems = group.items.filter(item => item?.canPurchase !== false)
    return {
      ...group,
      skuCount: group.items.length,
      totalQuantity: group.items.reduce((sum, item) => sum + number(item?.quantity), 0),
      totalAmount: group.items.reduce((sum, item) => {
        const price = number(item?.salePrice, number(item?.price))
        return sum + number(item?.totalAmount, price * number(item?.quantity))
      }, 0),
      allSelected: purchasableItems.length > 0 && selectedItems.length === purchasableItems.length,
      partiallySelected: selectedItems.length > 0 && selectedItems.length < purchasableItems.length,
    }
  })
}
