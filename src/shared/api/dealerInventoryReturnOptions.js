import { dispatch } from './dispatchClient.js'

/** Fetches only the inventory fields needed to prepare a return request. */
export async function getDealerInventoryReturnOptions(skuId) {
  const result = await dispatch('MallInventory', 'Mini.DealerInventoryController', 'GetInventoryDetail', {
    SkuId: Number(skuId || 0),
  })
  if (!result) return null
  const value = (camel, pascal, fallback = undefined) => result?.[camel] ?? result?.[pascal] ?? fallback
  const warehouses = value('warehouses', 'Warehouses', [])
  return {
    skuId: Number(value('skuId', 'SkuId', skuId) || 0),
    productName: String(value('productName', 'ProductName', '') || ''),
    skuName: String(value('skuName', 'SkuName', '') || ''),
    imageUrl: String(value('imageUrl', 'ImageUrl', '') || ''),
    unit: String(value('unit', 'Unit', '件') || '件'),
    availableQuantity: Number(value('availableQuantity', 'AvailableQuantity', 0) || 0),
    warehouses: (Array.isArray(warehouses) ? warehouses : []).map(item => ({
      warehouseId: Number(item?.warehouseId ?? item?.WarehouseId ?? 0),
      warehouseCode: String(item?.warehouseCode ?? item?.WarehouseCode ?? ''),
      warehouseName: String(item?.warehouseName ?? item?.WarehouseName ?? ''),
      availableQuantity: Number(item?.availableQuantity ?? item?.AvailableQuantity ?? 0),
    })),
  }
}
