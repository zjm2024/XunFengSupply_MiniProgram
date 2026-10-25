import { describe, expect, it } from 'vitest'
import { estimateAmountWidth, fitAmountFontSize } from '@/shared/ui/AmountText/amountSizing.js'

describe('AmountText 自适应规则', () => {
  it('按实际字符长度估算宽度，不改写金额内容', () => {
    expect(estimateAmountWidth('¥12,345.67', 18)).toBeGreaterThan(80)
    expect(estimateAmountWidth('可用 ¥12.00', 18)).toBeGreaterThan(100)
  })

  it('宽度足够时保持字号，空间不足时缩小但不换行', () => {
    expect(fitAmountFontSize(18, 100, 140)).toBe(18)
    expect(fitAmountFontSize(18, 200, 100)).toBe(12)
    expect(fitAmountFontSize(18, 200, 160)).toBe(14.4)
  })
})
