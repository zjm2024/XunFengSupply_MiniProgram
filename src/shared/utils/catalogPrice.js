/** 读取有效价格；空值不能转成0，明确的0元价格必须保留。 */
export function firstCatalogPrice(...values) {
  for (const value of values) {
    if (value === null || value === undefined || (typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') continue
    const price = Number(value)
    if (Number.isFinite(price)) return price
  }
  return null
}

/** 商品现价优先，基础价为空时回退本SKU吊牌价，最后才兼容父商品价格。 */
export function resolveCatalogPrice(item = {}, fallback = null) {
  return firstCatalogPrice(
    item.currentPrice, item.CurrentPrice, item.current_price,
    item.salePrice, item.SalePrice, item.unitPrice, item.UnitPrice,
    item.price, item.Price, item.basePrice, item.BasePrice, item.base_price,
    item.regularShipPrice, item.RegularShipPrice,
    item.listPrice, item.ListPrice, item.list_price, item.standardPrice,
    fallback,
  )
}
