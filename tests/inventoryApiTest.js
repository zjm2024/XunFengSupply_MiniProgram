import { describe, expect, it } from 'vitest'
import { normalizeInventoryItem } from '@/subPackages/account/api/inventory.js'

describe('dealer inventory api normalization', () => {
  it('normalizes PascalCase quantities and identifiers', () => {
    expect(normalizeInventoryItem({
      ProductId: '12', SkuId: '34', OnHandQuantity: '18', ReservedQuantity: '3',
      UnavailableQuantity: '2', AvailableQuantity: '13', WarehouseCount: '2',
    })).toMatchObject({
      productId: 12, skuId: 34, onHandQuantity: 18, reservedQuantity: 3,
      unavailableQuantity: 2, availableQuantity: 13, warehouseCount: 2,
    })
  })

  it('extracts color, size and sku code from serialized order snapshot', () => {
    expect(normalizeInventoryItem({
      specSnapshot: JSON.stringify({ colorName: '黑色', sizeName: 'XL', skuCode: 'XF-XL-BLK' }),
    })).toMatchObject({ colorName: '黑色', sizeName: 'XL', skuCode: 'XF-XL-BLK' })
  })

  it('keeps malformed snapshots safe for rendering', () => {
    expect(normalizeInventoryItem({ specSnapshot: '{invalid', Unit: null }))
      .toMatchObject({ colorName: '', sizeName: '', unit: '件' })
  })
})
