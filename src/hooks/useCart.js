/**
 * 购物车批量操作逻辑组合式钩子
 * 对应业务流程节点：
 * 1. 购物车&下单结算 → 批量勾选、批量改量、批量删除
 * 2. 工作台选购 → 加入购物车
 */
import { ref } from 'vue'
import { useCartStore } from '../store/modules/cart.js'
import { 
  getCartList, 
  addToCart as cartAddApi, 
  batchSelect, 
  batchUnselect, 
  selectAll,
  batchUpdateQuantity,
  batchRemove 
} from '../api/cart.js'

export function useCart() {
  const cartStore = useCartStore()
  const loading = ref(false)

  /**
   * 加载购物车数据
   */
  async function loadCart() {
    cartStore.setLoading(true)
    try {
      const res = await getCartList()
      cartStore.setCartList(res.list || [])
      if (res.summary) {
        cartStore.setSummary(res.summary)
      }
    } catch (e) {
      console.error('加载购物车失败:', e)
    } finally {
      cartStore.setLoading(false)
    }
  }

  /**
   * 加入购物车
   * @param {Object} item - { goodsId, skuId, quantity }
   * @returns {Promise<boolean>}
   */
  async function addCartItem(item) {
    try {
      await cartAddApi(item)
      uni.showToast({ title: '已加入购物车', icon: 'success' })
      // 刷新购物车列表
      await loadCart()
      return true
    } catch (e) {
      uni.showToast({ title: e.message || '加入失败', icon: 'none' })
      return false
    }
  }

  /**
   * 批量选中
   * @param {Array<string>} ids
   */
  async function doBatchSelect(ids) {
    try {
      await batchSelect(ids)
      cartStore.batchSelect(ids)
      await refreshSummary()
    } catch (e) {
      console.error('批量选中失败:', e)
    }
  }

  /**
   * 批量取消选中
   * @param {Array<string>} ids
   */
  async function doBatchUnselect(ids) {
    try {
      await batchUnselect(ids)
      cartStore.batchUnselect(ids)
      await refreshSummary()
    } catch (e) {
      console.error('批量取消选中失败:', e)
    }
  }

  /**
   * 全选/取消全选
   * @param {boolean} selected
   */
  async function doSelectAll(selected) {
    try {
      await selectAll(selected)
      cartStore.selectAll(selected)
      await refreshSummary()
    } catch (e) {
      console.error('全选操作失败:', e)
    }
  }

  /**
   * 批量修改数量
   * @param {Array<{cartItemId: string, quantity: number}>} items
   */
  async function doBatchUpdateQty(items) {
    try {
      await batchUpdateQuantity(items)
      items.forEach(({ cartItemId, quantity }) => {
        cartStore.updateItemQuantity(cartItemId, quantity)
      })
      await refreshSummary()
    } catch (e) {
      console.error('批量修改数量失败:', e)
    }
  }

  /**
   * 批量删除
   * @param {Array<string>} ids
   */
  async function doBatchRemove(ids) {
    try {
      await batchRemove(ids)
      cartStore.removeItems(ids)
      await refreshSummary()
      return true
    } catch (e) {
      uni.showToast({ title: '删除失败', icon: 'none' })
      return false
    }
  }

  /**
   * 刷新统计数据
   */
  async function refreshSummary() {
    try {
      const summary = await import('../api/cart.js').then(m => m.getCartSummary())
      cartStore.setSummary(summary)
    } catch (e) {}
  }

  /**
   * 获取已选中的商品ID（用于提交订单）
   * @returns {string} 逗号分隔的ID字符串
   */
  function getSelectedIds() {
    return cartStore.selectedIds.join(',')
  }

  /**
   * 是否有选中商品
   */
  function hasSelectedItems() {
    return cartStore.hasSelected
  }

  return {
    loading,
    loadCart,
    addCartItem,
    doBatchSelect,
    doBatchUnselect,
    doSelectAll,
    doBatchUpdateQty,
    doBatchRemove,
    getSelectedIds,
    hasSelectedItems
  }
}
