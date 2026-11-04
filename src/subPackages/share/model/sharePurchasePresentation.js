/** 把分享报价映射到通用选规格组件，不伪造精确库存、不带采购价。 */
export function sharePurchaseProduct(detail) {
 if (!detail) return null
 return { name: detail.product.productName, image: detail.product.imageUrl, price: detail.product.fromPrice, unit: detail.unit || '件', moq: 1,
  skus: detail.skus.items.map(sku => ({ skuId: sku.skuId, skuCode: sku.skuCode, image: sku.imageUrl || detail.product.imageUrl, price: sku.unitPrice, specName: sku.specDesc, colorName: sku.colorName || '默认', sizeName: sku.sizeName || sku.specDesc || sku.skuCode, minOrderQty: 1, stockKnown: false, stockState: sku.stockState, canPurchase: sku.stockState !== 'OUT_OF_STOCK' })) }
}
