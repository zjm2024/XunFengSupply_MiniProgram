import { describe, expect, it, vi } from 'vitest'
import { getPriceDisplay } from '../src/shared/utils/priceDisplay.js'

vi.mock('@/shared/api/dispatchClient.js', () => ({ dispatch: vi.fn() }))

describe('price match evidence and tag-price presentation', () => {
  it('unmatched base price never pretends to be a tag-price discount', () => {
    expect(getPriceDisplay({ price: 75, basePrice: 75, listPrice: 188, priceSource: 'BASE' }))
      .toMatchObject({ hasPolicy: false, showListPrice: false, strategyDiscount: 0 })
  })
  it('matched price may exceed base price; reference and discount still use tag price', () => {
    expect(getPriceDisplay({ price: 112.8, basePrice: 75, listPrice: 188, priceSource: 'GRADE', priceRuleId: 7 }))
      .toMatchObject({ currentPrice: 112.8, listPrice: 188, showListPrice: true, strikeListPrice: true, strategyDiscount: 75.2 })
  })
  it('a price above the tag price keeps a neutral reference without a false strike-through', () => {
    expect(getPriceDisplay({ salePrice: 200, listPrice: 188, priceSource: 'CUSTOMER_EXCLUSIVE' }))
      .toMatchObject({ showListPrice: true, strikeListPrice: false, strategyDiscount: 0 })
  })
  it('equal or missing tag prices do not substitute the base price', () => {
    expect(getPriceDisplay({ price: 90, basePrice: 100, priceRuleId: 7 }).showListPrice).toBe(false)
    expect(getPriceDisplay({ price: 90, listPrice: 90, priceRuleId: 7 }).showListPrice).toBe(false)
  })
  it('zero strategy price is a valid price and not replaced with the base price', () => {
    expect(getPriceDisplay({ price: 0, basePrice: 75, listPrice: 188, priceRuleId: 7 }))
      .toMatchObject({ currentPrice: 0, showListPrice: true, strategyDiscount: 188 })
  })
  it('unknown source and gift do not invent a strategy match', () => {
    expect(getPriceDisplay({ price: 75, listPrice: 188, priceSource: 'UNKNOWN' }).hasPolicy).toBe(false)
    expect(getPriceDisplay({ price: 0, listPrice: 188, priceRuleId: 7, isGift: true }).hasPolicy).toBe(false)
  })
  it('order history can read PascalCase snapshot facts without a live repricing request', () => {
    expect(getPriceDisplay({ SalePrice: 90, ListPrice: 188, PriceRuleId: 7, PriceSource: 'GRADE' }))
      .toMatchObject({ currentPrice: 90, listPrice: 188, showListPrice: true })
  })
  it('both product adapters retain actual match evidence', async () => {
    const adapters = await Promise.all([import('@/shared/api/product.js'), import('@/subPackages/commerce/api/productApi.js')])
    for (const api of adapters) {
      const sku = api.normalizeProduct({ productId: 10, skus: [{ skuId: 1, currentPrice: 112.8, basePrice: 75, listPrice: 188, priceSource: 'GRADE', priceRuleId: 7, matchedScope: 'SKC' }] }).skus[0]
      expect(sku).toMatchObject({ price: 112.8, listPrice: 188, priceRuleId: 7, priceSource: 'GRADE', matchedScope: 'SKC' })
      expect(getPriceDisplay(sku).strategyDiscount).toBe(75.2)
    }
  })
  it('account profile keeps numeric grades and dictionary labels, with null for ungraded', async () => {
    const { normalizeAccountProfile } = await import('@/subPackages/account/api/accountSecurity.js')
    expect(normalizeAccountProfile({ Grade: 3, GradeName: '三级', GradeNameEn: 'Tier 3' })).toMatchObject({ grade: 3, gradeName: '三级', gradeNameEn: 'Tier 3' })
    expect(normalizeAccountProfile({ Grade: null }).grade).toBe(null)
    expect(normalizeAccountProfile({ Grade: 'A' }).grade).toBe(null)
  })
  it('list adapters keep the server-selected SKU reference and mark a range without inventing a policy', async () => {
    const adapters = await Promise.all([import('@/shared/api/product.js'), import('@/subPackages/commerce/api/productApi.js')])
    for (const api of adapters) {
      const product = api.normalizeProduct({ productId: 1, minCurrentPrice: 0.01, maxCurrentPrice: 358,
        displaySkuId: 36, listPrice: 699, priceRuleId: 7, priceSource: 'TEMPORARY_SPECIAL', matchedScope: 'SKU', unit: '双' })
      expect(product).toMatchObject({ price: 0.01, hasPriceRange: true, displaySkuId: 36, listPrice: 699,
        priceRuleId: 7, priceSource: 'TEMPORARY_SPECIAL', matchedScope: 'SKU', unit: '双' })
      expect(getPriceDisplay(product)).toMatchObject({ currentPrice: 0.01, showListPrice: true, listPrice: 699 })
      const oldProduct = api.normalizeProduct({ minCurrentPrice: 0.01, maxCurrentPrice: 358 })
      expect(oldProduct.hasPriceRange).toBe(true)
      expect(getPriceDisplay(oldProduct).showListPrice).toBe(false)
      expect(api.normalizeProduct({ minCurrentPrice: 0, maxCurrentPrice: 0 }).hasPriceRange).toBe(false)
    }
  })
})

