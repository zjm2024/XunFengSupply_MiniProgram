/**
 * 购物车状态管理 (SKU 级维度)。
 *
 * 服务端是唯一事实来源，但本地维护乐观更新状态以支撑流畅交互：
 * - 以 CartItemId 作为明细粒度唯一键
 * - 每项保留 SKU 标识、经销商实时价格、展示库存、起订量、失效原因
 * - 支持本地 revision 追踪，防止异步响应覆盖较新状态
 */
import { defineStore } from 'pinia'

const MAX_CART_AMOUNT = 100000

function keyOf(item) {
  return String(item.cartItemId ?? item.id ?? `${item.skuId ?? ''}-${item.productId ?? ''}`)
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    loading: false,
    loaded: false,
    lastSyncedAt: 0,
    /** 本地 revision，单调递增；用于防止异步响应覆盖较新状态 */
    revision: 0,
    /** 远程同步提示文案 */
    syncHint: '',
  }),

  getters: {
    isEmpty: state => state.items.length === 0,
    validItems: state => state.items.filter(item => item.canPurchase !== false),
    invalidItems: state => state.items.filter(item => item.canPurchase === false),
    selectedItems: state => state.items.filter(item => item.selected !== false && item.canPurchase !== false),
    selectedIds() {
      return this.selectedItems.map(item => keyOf(item))
    },
    hasSelected() {
      return this.selectedItems.length > 0
    },
    isSelectAll() {
      return this.items.length > 0 && this.items.every(item => item.selected !== false)
    },
    summary() {
      const selected = this.selectedItems
      const round2 = value => Math.round((value + Number.EPSILON) * 100) / 100
      const totalQuantity = this.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      const selectedQuantity = selected.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      const totalAmount = round2(this.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0))
      const selectedAmount = round2(selected.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0))
      return {
        productCount: this.items.length,
        skuCount: this.items.length,
        selectedCount: selected.length,
        totalQuantity,
        selectedQuantity,
        totalAmount,
        selectedAmount,
        allQuantity: totalQuantity,
        invalidCount: this.invalidItems.length,
        isOverLimit: selectedAmount > MAX_CART_AMOUNT,
        remainingLimit: Math.max(0, MAX_CART_AMOUNT - selectedAmount),
      }
    },
    cartBadgeCount() {
      return this.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    },
    formattedTotalAmount() {
      return this.formatMoney(this.summary.selectedAmount)
    },
    invalidSummaryText() {
      if (this.invalidItems.length === 0) return ''
      return `${this.invalidItems.length} 件商品已失效（下架、库存不足或未达起订量），建议移除`
    },
  },

  actions: {
    formatMoney(value) {
      return `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    setLoading(value) {
      this.loading = Boolean(value)
    },
    setSyncHint(value) {
      this.syncHint = value || ''
    },
    /** 全量替换购物车明细（来自 GetCart 响应） */
    setCartList(items = []) {
      this.items = Array.isArray(items) ? items : []
      this.loaded = true
      this.lastSyncedAt = Date.now()
      this.revision++
    },
    /** 本地乐观更新数量（不等待服务端响应） */
    optimisticUpdateQuantity(cartItemId, quantity) {
      const item = this.items.find(row => keyOf(row) === String(cartItemId))
      if (!item) return
      item.quantity = Math.max(1, Math.floor(quantity))
      this.revision++
    },
    /** 本地乐观更新选中状态 */
    optimisticToggleSelect(cartItemId) {
      const item = this.items.find(row => keyOf(row) === String(cartItemId))
      if (!item) return
      item.selected = item.selected === false
      this.revision++
    },
    optimisticSelectAll(selected) {
      this.items.forEach(item => { item.selected = selected })
      this.revision++
    },
    /** 本地乐观删除 */
    optimisticRemove(cartItemIds) {
      const idSet = new Set((Array.isArray(cartItemIds) ? cartItemIds : [cartItemIds]).map(String))
      this.items = this.items.filter(item => !idSet.has(keyOf(item)))
      this.revision++
    },
    /** 单条合并更新服务端返回的明细（如 AddToCart 后局部刷新） */
    mergeServerItem(serverItem) {
      if (!serverItem) return
      const idx = this.items.findIndex(item => keyOf(item) === keyOf(serverItem))
      if (idx >= 0) this.items.splice(idx, 1, serverItem)
      else this.items.unshift(serverItem)
      this.revision++
    },
    isItemSelected(item) {
      return item.selected !== false && (item.canPurchase !== false || Boolean(item.selected))
    },
    toggleItem(item) {
      item.selected = item.selected === false
      this.revision++
    },
    selectAll(selected) {
      this.items.forEach(item => { item.selected = selected })
      this.revision++
    },
    clearCart() {
      this.items = []
      this.loading = false
      this.loaded = false
      this.lastSyncedAt = 0
      this.revision++
    },
  },
})
