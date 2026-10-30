import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => { vi.resetModules() })

describe('Inventory after-sale API', () => {
  it('normalizes waiting finance pricing without presenting zero as a final refund', async () => {
    const { normalizeAfterSaleItem } = await import('@/shared/api/afterSale.js')
    const waiting = normalizeAfterSaleItem({
      AfterSaleId: 92,
      OrderId: null,
      SourceType: 2,
      WorkflowVersion: 2,
      InventoryStatus: 1,
      ErpSubmissionStatus: 2,
      ErpReviewStatus: 1,
      ReceiptStatus: 3,
      PricingStatus: 0,
      PricingVersion: 4,
      RefundAmount: 0,
    })
    const order = normalizeAfterSaleItem({ AfterSaleId: 93, OrderId: 88, RefundAmount: 40 })
    expect(waiting.sourceType).toBe(2)
    expect(waiting.workflowVersion).toBe(2)
    expect(waiting.inventoryStatus).toBe(1)
    expect(waiting.erpSubmissionStatus).toBe(2)
    expect(waiting.erpReviewStatus).toBe(1)
    expect(waiting.receiptStatus).toBe(3)
    expect(waiting.pricingStatus).toBe(0)
    expect(waiting.pricingVersion).toBe(4)
    expect(order.pricingStatus).toBe(1)
  })
  it('maps account and SKU intent without exposing a warehouse to the inventory endpoint contract', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({ AfterSaleId: 91, AfterSaleNo: 'AS-91', Status: 1 })
    vi.doMock('@/shared/api/dispatchClient.js', () => ({ dispatch: dispatchMock }))
    const { applyInventoryAfterSale } = await import('@/shared/api/afterSale.js')
    const result = await applyInventoryAfterSale({
      refundAccountId: 8, clientRequestId: 'inventory-1', reason: '仓库退货',
      items: [{ warehouseId: 3, skuId: 12, quantity: 2 }],
    })
    expect(dispatchMock).toHaveBeenCalledWith('MallOrder', 'Mini.AfterSaleController', 'ApplyInventoryAfterSale', {
      RefundAccountId: 8, ClientRequestId: 'inventory-1', Reason: '仓库退货',
      Items: [{ SkuId: 12, Quantity: 2 }],
    })
    expect(result.afterSaleId).toBe(91)
    expect(result.afterSaleNo).toBe('AS-91')
  })
})
