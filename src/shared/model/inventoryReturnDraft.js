import { reactive } from 'vue'
import { registerSessionCleanup } from '@/shared/session/sessionCleanup.js'

const state = reactive({ owner: '', items: [], requestFingerprint: '', clientRequestId: '', reason: '', expressNo: '', refundAccountId: 0, pendingIntent: null })
export const INVENTORY_RETURN_LIMIT = 500

/** Bind the in-memory selection to one signed-in account; never persist stock or drafts across accounts. */
export function useInventoryReturnDraft(owner) {
  const key = String(owner || '')
  if (state.owner !== key) { state.owner = key; state.items = []; state.requestFingerprint = ''; state.clientRequestId = ''; state.reason = ''; state.expressNo = ''; state.refundAccountId = 0; state.pendingIntent = null }
  /** Refuse a stale page attempting to edit another account's draft. */
  function owns() { return Boolean(key && state.owner === key) }
  /** Keep one row per SKU, preserving edits when searching or paging. */
  function set(item, quantity = 1) {
    if (!owns() || state.pendingIntent || !Number.isSafeInteger(Number(item.skuId)) || item.skuId <= 0) return false
    const index = state.items.findIndex(row => row.skuId === item.skuId)
    if (index < 0 && state.items.length >= INVENTORY_RETURN_LIMIT) return false
    const maximum = Math.max(0, Math.floor(Number(item.availableQuantity) || 0))
    if (!maximum) return false
    const row = { ...item, quantity: Math.min(maximum, Math.max(1, Math.floor(Number(quantity) || 1))) }
    if (index < 0) state.items.push(row); else state.items[index] = row
    return true
  }
  /** Remove a SKU without clearing other products. */
  function remove(skuId) { if (owns() && !state.pendingIntent) state.items = state.items.filter(item => item.skuId !== skuId) }
  /** Clear selection after successful submission or explicit user cancellation. */
  function clear() { if (owns() && !state.pendingIntent) { state.items = []; state.requestFingerprint = ''; state.clientRequestId = ''; state.reason = ''; state.expressNo = ''; state.refundAccountId = 0 } }
  /** Reuse the exact submission key after a timeout, including a return to the selection page. */
  function requestId(payload) {
    if (!owns()) return ''
    const fingerprint = JSON.stringify({ ...payload, items: [...payload.items].sort((a,b)=>a.skuId-b.skuId) })
    if (fingerprint !== state.requestFingerprint) {
      state.requestFingerprint = fingerprint
      state.clientRequestId = 'inventory-return-' + Date.now() + '-' + Math.random().toString(36).slice(2,10)
    }
    return state.clientRequestId
  }
  return { state, set, remove, clear, requestId, owns }
}

registerSessionCleanup('inventory-return-draft', async () => {
  state.owner = ''; state.items = []; state.requestFingerprint = ''; state.clientRequestId = ''; state.reason = ''; state.expressNo = ''; state.refundAccountId = 0; state.pendingIntent = null
})
