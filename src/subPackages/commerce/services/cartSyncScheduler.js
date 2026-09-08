/**
 * 购物车同步调度器（工厂模式）
 *
 * 核心职责：
 * 1. 本地乐观更新：立即更新 UI，记录最终绝对数量到 Map<CartItemId, Quantity>
 * 2. 合并策略：trailing debounce 650ms + maxWait 1500ms，同 item 连续点击只发最终数量
 * 3. 单飞队列：同一时刻只有一个写请求在途，下一批排队
 * 4. 旧响应保护：本地 revision/request sequence，旧响应不覆盖新状态
 * 5. 强制 flush：进入结算页 / 预览订单前 / 页面隐藏时立即同步
 * 6. 错误处理：4xx 业务错误不重试，网络/5xx 最多 2 次指数退避 + 抖动
 *
 * 约定：
 * - 调度器只使用 camelCase 领域对象调用 API
 * - API 文件负责转换为后端 PascalCase DTO
 * - 数量和选择变更不互斥，可共存
 * - 删除操作可清理同一项的数量和选择待办
 *
 * @module cartSyncScheduler
 */

const DEBOUNCE_MS = 650
const MAX_WAIT_MS = 1500
const BATCH_LIMIT = 50
const MAX_RETRIES = 2
const BASE_BACKOFF_MS = 300

/** 业务错误码：不应自动重试 */
const NON_RETRYABLE_CODES = new Set([400, 403, 404, 409, 413, 422])

// ==================== 工具函数 ====================

/**
 * 判断错误是否可重试
 * @param {Error} error
 * @param {number} attempt - 当前尝试次数
 * @returns {boolean}
 */
function shouldRetry(error, attempt) {
  if (attempt >= MAX_RETRIES) return false
  const rawCode = error?.code ?? error?.statusCode
  
  // 明确的网络错误标识（字符串）
  if (rawCode === 'NETWORK_ERROR' || rawCode === 'TIMEOUT') return true
  
  const code = Number(rawCode || 0)
  if (NON_RETRYABLE_CODES.has(code)) return false
  if (code >= 500 && code < 600) return true
  
  // 没有明确错误码的普通错误不重试
  return false
}

/**
 * 指数退避延迟
 * @param {number} attempt
 * @returns {number} 毫秒
 */
function backoffDelay(attempt) {
  const jitter = Math.random() * 150
  return BASE_BACKOFF_MS * Math.pow(2, attempt) + jitter
}

/**
 * 延时
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ==================== 实例状态工厂 ====================

/**
 * 创建全新的调度器实例
 * @param {Object} dependencies - 依赖注入
 * @param {Object} dependencies.api - API 方法集合
 * @param {Function} dependencies.api.batchUpdate - 批量更新数量
 * @param {Function} dependencies.api.select - 设置选择状态
 * @param {Function} dependencies.api.selectAll - 全选/取消全选
 * @param {Function} dependencies.api.remove - 删除购物车项
 * @param {Function} [dependencies.onError] - 错误回调
 * @param {Function} [dependencies.onStatusChange] - 状态变化回调
 * @param {Function} [dependencies.onStateReconciled] - 状态对账完成回调
 * @returns {Object} 调度器实例
 */
export function createCartSyncScheduler(dependencies = {}) {
  const { api: apis, onError, onStatusChange, onStateReconciled } = dependencies

  // 实例级状态（每次创建都是全新的）
  const pendingQuantities = new Map()
  const pendingSelections = new Map()
  const pendingDeletes = new Set()
  const pendingSelectAll = { value: null }

  let inflight = false
  let debounceTimer = null
  let maxWaitTimer = null
  let localRevision = 0
  let disposed = false
  let inflightPromise = null

  // ==================== 内部状态管理 ====================

  function emitStatus(loading, syncingCount) {
    if (typeof onStatusChange === 'function') {
      onStatusChange({ loading, syncingCount: syncingCount ?? computePendingCount() })
    }
  }

  function emitError(error) {
    if (typeof onError === 'function') onError(error)
  }

  function emitReconciled(revision, op) {
    if (typeof onStateReconciled === 'function') {
      onStateReconciled({ revision, op })
    }
  }

  function clearTimers() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (maxWaitTimer) {
      clearTimeout(maxWaitTimer)
      maxWaitTimer = null
    }
  }

  function computePendingCount() {
    return pendingQuantities.size
      + pendingSelections.size
      + pendingDeletes.size
      + (pendingSelectAll.value !== null ? 1 : 0)
  }

  // ==================== 入队操作 ====================

  /**
   * 登记数量变更（不删除同 item 的选择状态，二者可共存）
   * @param {number} cartItemId
   * @param {number} quantity - 最终绝对值
   */
  function enqueueQuantity(cartItemId, quantity) {
    if (disposed) return
    const id = Number(cartItemId)
    if (!id || !Number.isFinite(quantity)) return
    const finalQty = Math.max(1, Math.floor(quantity))
    // 存最终绝对值，不存增量
    pendingQuantities.set(id, finalQty)
    ensureMaxWait()
    scheduleFlush()
  }

  /**
   * 登记选择状态变更（不删除同 item 的数量状态，二者可共存）
   * @param {number|number[]} cartItemIds
   * @param {boolean} selected
   */
  function enqueueSelection(cartItemIds, selected) {
    if (disposed) return
    const target = Boolean(selected)
    const ids = (Array.isArray(cartItemIds) ? cartItemIds : [cartItemIds])
      .map(Number)
      .filter(Boolean)
    if (ids.length === 0) return
    ids.forEach(id => {
      // 仅当待删除队列中不存在时才登记选择变更
      if (!pendingDeletes.has(id)) {
        pendingSelections.set(id, target)
      }
    })
    ensureMaxWait()
    scheduleFlush()
  }

  /**
   * 登记全选（清空单项选择变更，保留数量变更）
   * @param {boolean} selected
   */
  function enqueueSelectAll(selected) {
    if (disposed) return
    pendingSelectAll.value = Boolean(selected)
    // 全选不清除单项数量变更
    pendingSelections.clear()
    ensureMaxWait()
    scheduleFlush()
  }

  /**
   * 登记删除（清理同一项的数量和选择待办）
   * @param {number|number[]} cartItemIds
   */
  function enqueueDelete(cartItemIds) {
    if (disposed) return
    const ids = (Array.isArray(cartItemIds) ? cartItemIds : [cartItemIds])
      .map(Number)
      .filter(Boolean)
    ids.forEach(id => {
      pendingDeletes.add(id)
      // 删除优先：清理该 item 的其他待同步变更
      pendingQuantities.delete(id)
      pendingSelections.delete(id)
    })
    ensureMaxWait()
    scheduleFlush()
  }

  // ==================== 防抖/调度 ====================

  function ensureMaxWait() {
    if (!maxWaitTimer) {
      maxWaitTimer = setTimeout(() => {
        maxWaitTimer = null
        flush()
      }, MAX_WAIT_MS)
    }
  }

  /** 防抖触发 */
  function scheduleFlush() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      flush()
    }, DEBOUNCE_MS)
  }

  // ==================== 快照与清空 ====================

  /**
   * 取出当前待同步操作清单（不修改队列）
   * @returns {Array<{kind: string, *}>}
   */
  function snapshotPending() {
    const ops = []
    // 删除优先级最高
    if (pendingDeletes.size > 0) {
      ops.push({ kind: 'remove', ids: Array.from(pendingDeletes) })
    }
    // 全选（清空单项选择）
    if (pendingSelectAll.value !== null) {
      ops.push({ kind: 'selectAll', selected: pendingSelectAll.value })
    }
    // 数量变更
    if (pendingQuantities.size > 0) {
      ops.push({
        kind: 'batchUpdate',
        items: Array.from(pendingQuantities.entries()).map(([cartItemId, quantity]) => ({
          cartItemId,
          quantity,
        })),
      })
    }
    // 选择变更
    if (pendingSelections.size > 0) {
      const selected = []
      const unselected = []
      for (const [id, sel] of pendingSelections.entries()) {
        if (sel) selected.push(id)
        else unselected.push(id)
      }
      if (selected.length) ops.push({ kind: 'select', ids: selected, value: true })
      if (unselected.length) ops.push({ kind: 'select', ids: unselected, value: false })
    }
    return ops
  }

  /** 清空已快照的变更 */
  function drainPending() {
    pendingDeletes.clear()
    pendingSelectAll.value = null
    pendingQuantities.clear()
    pendingSelections.clear()
  }

  /** 是否还有未处理的变更 */
  function hasPending() {
    return pendingQuantities.size > 0
      || pendingSelections.size > 0
      || pendingDeletes.size > 0
      || pendingSelectAll.value !== null
  }

  // ==================== 单飞队列执行器 ====================

  /**
   * 执行单个 API 操作，含有限重试与旧响应保护
   * @param {{kind: string, *}} op
   * @param {number} batchRevision
   * @param {number} attempt
   */
  async function executeOperation(op, batchRevision, attempt) {
    // 此批次已被刷新 revision，放弃回写，由后续 flush 重新校准
    if (batchRevision !== localRevision && hasPending()) return

    try {
      switch (op.kind) {
        case 'remove':
          await apis.remove(op.ids)
          break
        case 'selectAll':
          await apis.selectAll(op.selected)
          break
        case 'batchUpdate':
          // 按 BATCH_LIMIT 分批提交
          for (let i = 0; i < op.items.length; i += BATCH_LIMIT) {
            const chunk = op.items.slice(i, i + BATCH_LIMIT)
            await apis.batchUpdate(chunk)
          }
          break
        case 'select':
          await apis.select({ cartItemIds: op.ids, selected: op.value })
          break
        default:
          return
      }
      // 仅当 revision 仍是最新的情况下触发回执
      if (batchRevision !== localRevision && hasPending()) return
      emitReconciled(batchRevision, op)
    } catch (error) {
      // 旧响应保护：版本已变更说明有新的待同步，直接放弃本次错误处理
      if (batchRevision !== localRevision && hasPending()) return
      if (shouldRetry(error, attempt)) {
        await sleep(backoffDelay(attempt))
        return executeOperation(op, batchRevision, attempt + 1)
      }
      // 发出错误并继续抛出，让调用者知道失败
      emitError(error)
      throw error
    }
  }

  /**
   * 单飞队列执行器：一次只允许一批在途
   * @returns {Promise<void>}
   * @throws {Error} 当所有重试仍失败时抛出最后一个错误
   */
  async function processQueue() {
    if (disposed) return
    // 如果已有在途请求，返回该 Promise
    if (inflight) return inflightPromise

    inflight = true
    inflightPromise = (async () => {
      emitStatus(true)
      let lastError = null
      try {
        // 循环直到 pending 清空，避免丢掉拦截期间新增的变更
        while (!disposed) {
          const ops = snapshotPending()
          if (ops.length === 0) break
          // 推进 revision，标记本批次本地快照版本
          const batchRevision = ++localRevision
          drainPending()
          for (const op of ops) {
            if (disposed) break
            try {
              await executeOperation(op, batchRevision, 0)
            } catch (err) {
              lastError = err
              // 继续处理后续操作，不中断
            }
          }
        }
      } finally {
        inflight = false
        inflightPromise = null
        emitStatus(false)
        // 如果执行期间又有新变更入队，主动再调度一轮
        if (hasPending() && !disposed) {
          scheduleFlush()
        }
        // 最终抛出最后一个错误（如果存在）
        if (lastError) {
          throw lastError
        }
      }
    })()

    return inflightPromise
  }

  // ==================== 公开 API ====================

  /**
   * 强制 flush：进入结算页/预览订单前调用
   * @param {Object} [options]
   * @param {boolean} [options.throwOnError=false] - 失败时是否抛错
   * @returns {Promise<void>}
   */
  function flush(options = {}) {
    if (disposed) return Promise.resolve()
    clearTimers()
    return processQueue().catch(err => {
      if (options.throwOnError) {
        throw err
      }
      // 自动后台 flush 只记录错误，不抛出
    })
  }

  /**
   * 清空本地 pending，仅在完成 GetCart 全量校准后调用
   */
  function reset() {
    clearTimers()
    pendingQuantities.clear()
    pendingSelections.clear()
    pendingDeletes.clear()
    pendingSelectAll.value = null
    localRevision++
    disposed = false
  }

  /**
   * 关闭调度器（尽力 flush 残留变更后再设置 disposed）
   * @returns {Promise<void>}
   */
  async function dispose() {
    clearTimers()
    // 先 flush，再设置 disposed
    if (hasPending()) {
      disposed = false
      try {
        await processQueue()
      } catch (err) {
        // dispose 时的错误只记录，不抛出
        emitError(err)
      }
    }
    disposed = true
  }

  /**
   * 获取调度器状态
   * @returns {{pendingCount: number, isSyncing: boolean, disposed: boolean, hasError: boolean}}
   */
  function getStatus() {
    return {
      pendingCount: computePendingCount(),
      isSyncing: inflight,
      disposed,
    }
  }

  return {
    enqueueQuantity,
    enqueueSelection,
    enqueueSelectAll,
    enqueueDelete,
    flush,
    reset,
    dispose,
    getStatus,
    // 内部方法暴露用于测试
    hasPending: () => hasPending(),
  }
}

// ==================== 生产环境单例 ====================

/** 延迟初始化的单例 */
let cartSyncServiceInstance = null

/**
 * 获取购物车同步服务单例（生产环境使用）
 * @param {Object} [apis] - API 方法集合（首次调用时注入）
 * @returns {Object}
 */
export function getCartSyncService(apis) {
  if (!cartSyncServiceInstance) {
    cartSyncServiceInstance = createCartSyncScheduler({
      api: apis,
      onError: err => {
        console.error('[CartSyncService] 同步失败:', err)
      },
      onStatusChange: ({ loading, syncingCount }) => {
        // 可由外部监听
      },
    })
  }
  return cartSyncServiceInstance
}

/**
 * 重置单例（用于测试）
 * @internal
 */
export function __resetCartSyncService() {
  cartSyncServiceInstance = null
}
