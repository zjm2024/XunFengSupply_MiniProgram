import { dispatch } from '../../../shared/api/dispatchClient.js'

const CONTROLLER = 'Mini.DealerInventoryController'

function pick(source, camelKey, pascalKey, fallback = undefined) {
  return source?.[camelKey] ?? source?.[pascalKey] ?? fallback
}

function numberOf(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function normalizeSpec(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try { return JSON.parse(value) || {} } catch { return {} }
}

export function normalizeInventoryItem(source = {}) {
  const spec = normalizeSpec(pick(source, 'specSnapshot', 'SpecSnapshot', null))
  return {
    productId: numberOf(pick(source, 'productId', 'ProductId', 0)),
    skuId: numberOf(pick(source, 'skuId', 'SkuId', 0)),
    productName: String(pick(source, 'productName', 'ProductName', '') || ''),
    skuName: String(pick(source, 'skuName', 'SkuName', '') || ''),
    spec,
    colorName: String(spec.colorName ?? spec.ColorName ?? ''),
    sizeName: String(spec.sizeName ?? spec.SizeName ?? ''),
    skuCode: String(spec.skuCode ?? spec.SkuCode ?? ''),
    barcode: String(spec.barcode ?? spec.Barcode ?? ''),
    imageUrl: String(pick(source, 'imageUrl', 'ImageUrl', '') || ''),
    unit: String(pick(source, 'unit', 'Unit', '') || '件'),
    onHandQuantity: numberOf(pick(source, 'onHandQuantity', 'OnHandQuantity', 0)),
    reservedQuantity: numberOf(pick(source, 'reservedQuantity', 'ReservedQuantity', 0)),
    unavailableQuantity: numberOf(pick(source, 'unavailableQuantity', 'UnavailableQuantity', 0)),
    availableQuantity: numberOf(pick(source, 'availableQuantity', 'AvailableQuantity', 0)),
    warehouseCount: numberOf(pick(source, 'warehouseCount', 'WarehouseCount', 0)),
    lastInboundAt: pick(source, 'lastInboundAt', 'LastInboundAt', null),
  }
}

function normalizeOverview(source = {}) {
  return {
    productCount: numberOf(pick(source, 'productCount', 'ProductCount', 0)),
    skuCount: numberOf(pick(source, 'skuCount', 'SkuCount', 0)),
    onHandQuantity: numberOf(pick(source, 'onHandQuantity', 'OnHandQuantity', 0)),
    reservedQuantity: numberOf(pick(source, 'reservedQuantity', 'ReservedQuantity', 0)),
    unavailableQuantity: numberOf(pick(source, 'unavailableQuantity', 'UnavailableQuantity', 0)),
    availableQuantity: numberOf(pick(source, 'availableQuantity', 'AvailableQuantity', 0)),
    lowStockSkuCount: numberOf(pick(source, 'lowStockSkuCount', 'LowStockSkuCount', 0)),
    lastInboundAt: pick(source, 'lastInboundAt', 'LastInboundAt', null),
  }
}

export async function getDealerInventoryOverview() {
  return normalizeOverview(await dispatch('MallInventory', CONTROLLER, 'GetOverview', {}))
}

export async function getDealerInventoryList(params = {}) {
  const result = await dispatch('MallInventory', CONTROLLER, 'GetInventoryList', {
    PageNum: numberOf(params.pageNum || 1) || 1,
    PageSize: numberOf(params.pageSize || 20) || 20,
    Keyword: params.keyword?.trim() || null,
    StockStatus: params.stockStatus || 'all',
    LowStockThreshold: numberOf(params.lowStockThreshold || 10) || 10,
  })
  const rawItems = pick(result, 'items', 'Items', [])
  return {
    items: (Array.isArray(rawItems) ? rawItems : []).map(normalizeInventoryItem),
    totalCount: numberOf(pick(result, 'totalCount', 'TotalCount', 0)),
    pageNum: numberOf(pick(result, 'pageNum', 'PageNum', 1)) || 1,
    pageSize: numberOf(pick(result, 'pageSize', 'PageSize', 20)) || 20,
  }
}

export async function getDealerInventoryDetail(skuId) {
  const result = await dispatch('MallInventory', CONTROLLER, 'GetInventoryDetail', {
    SkuId: numberOf(skuId),
  })
  if (!result) return null
  const detail = normalizeInventoryItem(result)
  const rawWarehouses = pick(result, 'warehouses', 'Warehouses', [])
  const rawTransactions = pick(result, 'recentTransactions', 'RecentTransactions', [])
  return {
    ...detail,
    warehouses: (Array.isArray(rawWarehouses) ? rawWarehouses : []).map(item => ({
      warehouseId: numberOf(pick(item, 'warehouseId', 'WarehouseId', 0)),
      warehouseCode: String(pick(item, 'warehouseCode', 'WarehouseCode', '') || ''),
      warehouseName: String(pick(item, 'warehouseName', 'WarehouseName', '') || ''),
      onHandQuantity: numberOf(pick(item, 'onHandQuantity', 'OnHandQuantity', 0)),
      reservedQuantity: numberOf(pick(item, 'reservedQuantity', 'ReservedQuantity', 0)),
      unavailableQuantity: numberOf(pick(item, 'unavailableQuantity', 'UnavailableQuantity', 0)),
      availableQuantity: numberOf(pick(item, 'availableQuantity', 'AvailableQuantity', 0)),
      lastInboundAt: pick(item, 'lastInboundAt', 'LastInboundAt', null),
    })),
    recentTransactions: (Array.isArray(rawTransactions) ? rawTransactions : []).map(item => ({
      transactionId: numberOf(pick(item, 'transactionId', 'TransactionId', 0)),
      businessType: String(pick(item, 'businessType', 'BusinessType', '') || ''),
      quantityDelta: numberOf(pick(item, 'quantityDelta', 'QuantityDelta', 0)),
      sourceType: String(pick(item, 'sourceType', 'SourceType', '') || ''),
      sourceId: numberOf(pick(item, 'sourceId', 'SourceId', 0)),
      sourceNo: String(pick(item, 'sourceNo', 'SourceNo', '') || ''),
      remark: String(pick(item, 'remark', 'Remark', '') || ''),
      occurredAt: pick(item, 'occurredAt', 'OccurredAt', null),
    })),
  }
}
