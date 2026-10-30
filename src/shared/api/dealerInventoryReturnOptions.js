import { dispatch } from './dispatchClient.js'

/** Read current return quantities in one authenticated batch without any warehouse data. */
export async function getDealerInventoryReturnItems(skuIds) {
  const result = await dispatch('MallInventory', 'Mini.DealerInventoryController', 'GetReturnItems', {
    SkuIds: [...new Set(skuIds.map(Number))],
  })
  return (Array.isArray(result) ? result : []).map(item => ({
    productId: Number(item.productId ?? item.ProductId ?? 0),
    skuId: Number(item.skuId ?? item.SkuId ?? 0),
    productName: String(item.productName ?? item.ProductName ?? ''),
    skuName: String(item.skuName ?? item.SkuName ?? ''),
    imageUrl: String(item.imageUrl ?? item.ImageUrl ?? ''),
    unit: String(item.unit ?? item.Unit ?? ''),
    availableQuantity: Number(item.availableQuantity ?? item.AvailableQuantity ?? 0),
  }))
}

/** Preserve the single-SKU entry while using the same warehouse-free contract as batch returns. */
export async function getDealerInventoryReturnOptions(skuId) {
  const rows = await getDealerInventoryReturnItems([skuId])
  return rows.find(item => item.skuId === Number(skuId)) || null
}
