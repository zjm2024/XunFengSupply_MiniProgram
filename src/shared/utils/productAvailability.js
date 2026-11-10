/** 未返回库存的商品不能当作零库存；分享目录仅使用公开的库存状态。 */
export function knownProductStock(product = {}) {
  if (product.stockKnown === false || product.stock === null || product.stock === undefined || product.stock === '') return null
  const value = Number(product.stock)
  return Number.isFinite(value) ? Math.max(0, value) : null
}

export function isProductOutOfStock(product = {}) {
  if (product.stockState) return product.stockState === 'OUT_OF_STOCK'
  return knownProductStock(product) === 0
}

/** 返回新数组，库存数量优先、同库存有图优先，保持其余项目原始稳定顺序。 */
export function sortProductsByStock(products = []) {
  return [...products].sort((a, b) => {
    const stockA = knownProductStock(a) ?? -1
    const stockB = knownProductStock(b) ?? -1
    return stockB - stockA || Number(Boolean(String(b.image || '').trim())) - Number(Boolean(String(a.image || '').trim()))
  })
}
