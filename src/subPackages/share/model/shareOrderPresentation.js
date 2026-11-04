/** 页面金额只用于估算展示；成交金额始终取服务端结算，超安全范围不显示伪精确数字。 */
export function selectionAmount(rows) {
  let total = 0
  for (const row of rows.filter(item => item.selected)) {
    if (!row.quote) return null
    const [whole, fraction = ''] = String(row.quote.unitPrice).split('.')
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
    total += cents * row.quantity
    if (!Number.isSafeInteger(total)) return null
  }
  return (total / 100).toFixed(2)
}
/** 按商品分组保持SKU数量编辑，订单与购物车共用真实规格字段。 */
export function shareProductGroups(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = String(row.quote?.productId || row.productId || row.productName || row.skuId)
    if (!groups.has(key)) groups.set(key, { key, name: row.quote?.productName || row.productName || '商品暂不可用', items: [], quantity: 0 })
    const group = groups.get(key); group.items.push(row); group.quantity += row.quantity
  }
  return [...groups.values()]
}

/** SPU小计只用于展示，按已核价行计算，不丢弃未选中的规格。 */
export function shareGroupAmount(group) {
  return selectionAmount(group.items.map(row => ({ ...row, selected:true, quote:row.quote || {unitPrice:row.unitPrice} })))
}
