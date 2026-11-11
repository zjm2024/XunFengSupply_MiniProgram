/** 读取后端报价或订单快照的价格显示事实；不推断策略、不改变成交金额。 */
export function getPriceDisplay(item = {}) {
  const value = (name, fallback) => item[name] ?? item[name[0].toUpperCase() + name.slice(1)] ?? fallback
  const finite = input => Number.isFinite(Number(input)) ? Number(input) : 0
  const currentPrice = finite(value('salePrice', value('currentPrice', value('price', 0))))
  const listPrice = finite(value('listPrice', 0))
  const source = String(value('priceSource', 'BASE')).toUpperCase()
  const ruleId = finite(value('priceRuleId', 0))
  const hasPolicy = !value('isGift', false) && (ruleId > 0 || ['GRADE', 'CUSTOMER_EXCLUSIVE', 'TEMPORARY_SPECIAL'].includes(source))
  return {
    currentPrice,
    listPrice,
    hasPolicy,
    showListPrice: hasPolicy && listPrice > 0 && Math.round(listPrice * 100) !== Math.round(currentPrice * 100),
    strikeListPrice: hasPolicy && listPrice > currentPrice,
    strategyDiscount: hasPolicy && listPrice > currentPrice ? Math.round((listPrice - currentPrice) * 100) / 100 : 0,
  }
}


/** 订单快照金额汇总：策略优惠已计入goodsAmount，恢复优惠前展示基数，绝不重算应付。 */
export function getOrderPriceSummary(order = {}) {
  const value = order || {}
  const cents = input => Number.isFinite(Number(input)) ? Math.max(0, Math.round(Number(input) * 100)) : 0
  const items = value.items ?? value.Items
  const strategyCents = (Array.isArray(items) ? items : []).reduce((sum, item) => {
    if (!item) return sum
    const quantity = Number(item.quantity ?? item.Quantity ?? 0)
    if (!Number.isSafeInteger(quantity) || quantity <= 0) return sum
    return sum + cents(getPriceDisplay(item).strategyDiscount) * quantity
  }, 0)
  return {
    goodsSubtotal: (cents(value.goodsAmount ?? value.GoodsAmount) + strategyCents) / 100,
    strategyDiscount: strategyCents / 100,
    promotionDiscount: cents(value.discountAmount ?? value.DiscountAmount) / 100,
    discountAmount: (strategyCents + cents(value.discountAmount ?? value.DiscountAmount)) / 100,
  }
}
