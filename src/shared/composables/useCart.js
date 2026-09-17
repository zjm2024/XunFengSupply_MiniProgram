/**
 * 购物车真实数据流：调度器 + 乐观更新 + 服务端校准。
 *
 * - AddToCart 走 AddCartItemRequest（SkuId, Quantity）
 * - 数量修改、选择变更经调度器合并后批量同步
 * - 强制 flush 时机：进入结算页、预览订单、页面隐藏
 *
 * 调度器使用 createCartSyncScheduler 工厂创建独立实例
 */
import { ref } from 'vue'
import { useCartStore } from '../model/cartStore.js'
import {
  addToCart,
  batchAddToCart,
  batchUpdateQuantity,
  removeItems,
  selectItems,
  selectAll,
  clearCart,
  getCartList,
} from '../api/cartApi.js'
import { getCartSyncService } from '../services/cartSyncScheduler.js'

/** API 集合单例 */
const cartApis = { batchUpdate: batchUpdateQuantity, select: selectItems, selectAll, remove: removeItems }

/** 获取调度器实例 */
const cartSyncScheduler = getCartSyncService(cartApis)

/**
 * 购物车封装
 * @param {Object} [options]
 * @param {boolean} [options.autoSchedule=true] 是否自动配置调度器
 */
export function useCart(options = {}) {
  const autoSchedule = options.autoSchedule !== false
  const cartStore = useCartStore()
  const loading = ref(false)
  const submitting = ref(false)
  const error = ref(null)
  const flushError = ref(null)

  if (autoSchedule) {
    // 重新配置调度器以注入回调
    // 注意：由于 getCartSyncService 是单例，回调会在首次配置后固定
  }

  async function loadCart({ silent = false } = {}) {
    if (loading.value) return cartStore.items
    loading.value = true
    error.value = null
    flushError.value = null
    if (!silent) cartStore.setLoading(true)
    try {
      const result = await getCartList()
      cartStore.setCartList(result.items)
      cartSyncScheduler.reset()
      return result.items
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
      cartStore.setLoading(false)
    }
  }

  /** 数量 +1（本地立即反馈，由调度器合并） */
  function increaseItem(item, delta = 1) {
    if (!item || submitting.value) return false
    const current = Number(item.quantity) || 0
    const target = Math.max(1, current + delta)
    cartStore.optimisticUpdateQuantity(item.cartItemId, target)
    cartSyncScheduler.enqueueQuantity(item.cartItemId, target)
    return true
  }

  /** 直接设置数量（本地立即反馈，由调度器合并） */
  function setItemQuantity(item, quantity) {
    if (!item) return
    const target = Math.max(Number(item.minOrderQty) || 1, Number(quantity) || 1)
    cartStore.optimisticUpdateQuantity(item.cartItemId, target)
    cartSyncScheduler.enqueueQuantity(item.cartItemId, target)
  }

  /** 提交 SKU 加购（立即发送，不走合并，带防重复） */
  async function addSkuToCart(params = {}) {
    if (submitting.value) return false
    submitting.value = true
    error.value = null
    try {
      const serverItem = await addToCart(params)
      if (serverItem) cartStore.mergeServerItem(serverItem)
      else await loadCart({ silent: true })
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      submitting.value = false
    }
  }

  /** 批量采购一次提交，避免按 SKU 循环调用接口放大并发。 */
  async function batchAddSkuToCart(items = [], clientRequestId = null) {
    if (submitting.value) return false
    submitting.value = true
    error.value = null
    try {
      await batchAddToCart({ items, clientRequestId })
      await loadCart({ silent: true })
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      submitting.value = false
    }
  }

  /** 兼容原 interface：quantity 步进（加 delta） */
  async function addCartItem(item, options = {}) {
    if (!item) return false
    // 兼容旧 interface（params 内可能是 productId），优先走 SKU 语法
    const skuId = item.skuId ?? item.SkuId ?? item.productId
    if (skuId && item.quantity) {
      const success = await addSkuToCart({ skuId, quantity: item.quantity })
      if (success && !options.silent) {
        if (typeof uni !== 'undefined') uni.showToast({ title: '已加入购物车', icon: 'success' })
      }
      return success
    }
    if (typeof uni !== 'undefined') {
      uni.showToast({ title: '缺少商品规格信息', icon: 'none' })
    }
    return false
  }

  /** 切换选择：本地同步 + 调度器合并 */
  function toggleSelect(item) {
    if (!item) return
    cartStore.optimisticToggleSelect(item.cartItemId)
    const target = cartStore.isItemSelected(item)
    cartSyncScheduler.enqueueSelection(item.cartItemId, target)
  }

  /** 批量选择 */
  function batchSetSelected(ids, selected) {
    if (!Array.isArray(ids) || ids.length === 0) return
    ids.forEach(id => {
      const item = cartStore.items.find(row => String(row.cartItemId) === String(id))
      if (item) item.selected = selected
    })
    cartStore.revision++
    cartSyncScheduler.enqueueSelection(ids, selected)
  }

  /** 全选 */
  function selectAllItems(selected) {
    cartStore.optimisticSelectAll(selected)
    cartSyncScheduler.enqueueSelectAll(selected)
  }

  /** 删除：本地乐观删除 + 调度器合并 */
  function deleteItems(cartItemIds) {
    const ids = (Array.isArray(cartItemIds) ? cartItemIds : [cartItemIds]).map(Number).filter(Boolean)
    if (ids.length === 0) return
    cartStore.optimisticRemove(ids)
    cartSyncScheduler.enqueueDelete(ids)
  }

  /** 清空购物车 */
  async function clearAll() {
    try {
      await clearCart()
      cartStore.clearCart()
      cartSyncScheduler.reset()
    } catch (err) {
      error.value = err
      throw err
    }
  }

  /** 强制 flush（进入结算页 / 预览订单前调用） */
  async function flush(throwOnError = true) {
    flushError.value = null
    try {
      await cartSyncScheduler.flush({ throwOnError })
    } catch (err) {
      flushError.value = err
      throw err
    }
  }

  /** 重置购物车（退出登录时调用） */
  function resetScheduler() {
    cartSyncScheduler.reset()
  }

  return {
    cartStore,
    loading,
    submitting,
    error,
    flushError,
    loadCart,
    addCartItem,
    addSkuToCart,
    batchAddSkuToCart,
    increaseItem,
    setItemQuantity,
    toggleSelect,
    batchSetSelected,
    selectAllItems,
    deleteItems,
    clearAll,
    flush,
    resetScheduler,
    getSelectedIds() {
      return cartStore.selectedIds.join(',')
    },
    hasSelectedItems() {
      return cartStore.hasSelected
    },
  }
}
