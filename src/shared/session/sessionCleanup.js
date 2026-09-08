/**
 * @file 会话清理注册中心
 * @description
 * 提供退出登录时的业务 store 清理注册机制。
 *
 * 设计原则：
 *   - userStore 不直接 import 各业务 store（避免循环依赖）
 *   - 各分包在加载时注册自己的清理函数
 *   - 未加载分包不会被主包强制 import
 *
 * 使用方式：
 *   // commerce 分包注册
 *   import { registerSessionCleanup } from '@/shared/session/sessionCleanup.js'
 *   registerSessionCleanup('commerce', async () => {
 *     const { useCartStore } = await import('../model/cartStore.js')
 *     useCartStore().clearCart()
 *   })
 *
 *   // userStore.logout() 时自动触发
 *   await runSessionCleanup()
 */

/** @type {Map<string, () => Promise<void>>} */
const _cleanupHandlers = new Map()

/**
 * 注册会话清理函数
 * @param {string} name - 唯一标识（通常为分包名）
 * @param {() => Promise<void>} callback - 清理函数
 */
export function registerSessionCleanup(name, callback) {
  if (typeof callback !== 'function') {
    console.warn(`[SessionCleanup] 注册失败: ${name} 的 callback 不是函数`)
    return
  }
  _cleanupHandlers.set(name, callback)
}

/**
 * 执行所有已注册的会话清理函数
 * @returns {Promise<void>}
 */
export async function runSessionCleanup() {
  if (_cleanupHandlers.size === 0) {
    return
  }

  console.log(`[SessionCleanup] 开始执行 ${_cleanupHandlers.size} 个清理函数`)

  const tasks = []
  for (const [name, callback] of _cleanupHandlers) {
    tasks.push(
      Promise.resolve()
        .then(() => callback())
        .catch((err) => {
          console.error(`[SessionCleanup] ${name} 清理失败:`, err)
        })
    )
  }

  await Promise.all(tasks)
  console.log('[SessionCleanup] 清理完成')
}

/**
 * 注销指定的清理函数
 * @param {string} name - 注册时的唯一标识
 */
export function unregisterSessionCleanup(name) {
  _cleanupHandlers.delete(name)
}

/**
 * 获取已注册的清理函数数量（用于测试）
 * @returns {number}
 */
export function getCleanupHandlerCount() {
  return _cleanupHandlers.size
}

/**
 * 清空所有注册（仅用于测试）
 */
export function _clearAllCleanupHandlers() {
  _cleanupHandlers.clear()
}
