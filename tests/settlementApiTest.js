import { describe, expect, it } from 'vitest'
import {
  normalizeBill,
  normalizeBillItem,
  normalizeFundFlow,
  normalizeRechargeRecord,
} from '@/subPackages/account/api/settlement.js'

describe('dealer settlement api normalization', () => {
  it('keeps backend decimal amounts in yuan', () => {
    expect(normalizeBill({ TotalAmount: 26800.5, PaidAmount: 800.5, OutstandingAmount: 26000 }))
      .toMatchObject({ totalAmount: 26800.5, paidAmount: 800.5, outstandingAmount: 26000 })
    expect(normalizeRechargeRecord({ Amount: 5000 })).toMatchObject({ amount: 5000 })
  })

  it('supports camelCase payloads and normalizes bill items', () => {
    expect(normalizeBillItem({ billItemId: '7', businessType: 'order', amount: '99.90' }))
      .toMatchObject({ billItemId: 7, businessType: 'order', amount: 99.9 })
  })

  it('normalizes recharge status and identifiers', () => {
    expect(normalizeRechargeRecord({ RechargeId: '18', RechargeNo: 'RC001', Status: '6' }))
      .toMatchObject({ rechargeId: 18, rechargeNo: 'RC001', status: 6 })
  })

  it('normalizes real account transaction fields without converting yuan to cents', () => {
    expect(normalizeFundFlow({
      TransactionId: '21', BusinessType: 'order_payment', BalanceDelta: '-12600.50',
      FrozenDelta: '0', BalanceAfter: '37400.25', FrozenAfter: '800',
    })).toMatchObject({
      transactionId: 21,
      businessType: 'order_payment',
      balanceDelta: -12600.5,
      balanceAfter: 37400.25,
      frozenAfter: 800,
    })
  })
})
