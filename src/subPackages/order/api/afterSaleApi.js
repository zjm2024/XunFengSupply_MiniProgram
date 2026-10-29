/** 订单分包复用统一售后契约，避免两个适配副本逐渐不一致。 */
export {
  normalizeAfterSaleItem, applyAfterSale, applyInventoryAfterSale, getAfterSaleableItems, getAfterSaleDetail,
  getAfterSaleList, getAfterSaleCount, getAfterSaleCarriers, cancelAfterSale, submitReturnLogistics,
} from '@/shared/api/afterSale.js'
