/**
 * 将订单明细转换为“再来一单”的购物车明细。
 * 促销赠品由结算时重新计算，不作为普通商品加入购物车。
 *
 * @param {Array<object>} orderItems - 订单商品明细。
 * @returns {Array<{skuId: number, quantity: number}>} 聚合后的可加购 SKU 明细。
 */
export function buildReorderCartItems(orderItems = []) {
  const quantities = new Map()

  orderItems.forEach(item => {
    const isGift = item?.isGift ?? item?.IsGift ?? false
    const skuId = Number(item?.skuId ?? item?.SkuId)
    const quantity = Number(item?.quantity ?? item?.Quantity)
    if (isGift || !Number.isInteger(skuId) || skuId <= 0 || !Number.isInteger(quantity) || quantity <= 0) return
    quantities.set(skuId, (quantities.get(skuId) || 0) + quantity)
  })

  return Array.from(quantities, ([skuId, quantity]) => ({ skuId, quantity }))
}
