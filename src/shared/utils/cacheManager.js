import { clearResourceCache, RESOURCE_CACHE_PREFIX } from './resourceCache.js'

const SEARCH_HISTORY_KEY = 'commerce.product.search.history'
const CACHE_KEY_PREFIXES = Object.freeze([
  'xf_b2b_cache:',
  'xf_b2b_cache_',
])

function isClearableKey(key) {
  return key === SEARCH_HISTORY_KEY
    || key.startsWith(RESOURCE_CACHE_PREFIX)
    || CACHE_KEY_PREFIXES.some(prefix => key.startsWith(prefix))
}

function getClearableStorageKeys() {
  try {
    return (uni.getStorageInfoSync()?.keys || []).filter(isClearableKey)
  } catch (error) {
    console.warn('[CacheManager] 获取缓存信息失败:', error)
    return []
  }
}

/** 获取可清理缓存的概览，仅统计可重建缓存，不读取或暴露登录信息。 */
export function getCacheSummary() {
  const keys = getClearableStorageKeys()
  return {
    count: keys.length,
    label: keys.length > 0 ? `${keys.length} 项可清理` : '暂无可清理缓存',
  }
}

/**
 * 清理应用缓存。
 * 明确保留 token、用户资料、语言偏好、购物车、待付款订单和通知设置。
 */
export async function clearAppCache() {
  const resourceResult = await clearResourceCache()
  let removedCount = Number(resourceResult?.count || 0)

  getClearableStorageKeys().forEach((key) => {
    if (key.startsWith(RESOURCE_CACHE_PREFIX)) return
    try {
      uni.removeStorageSync(key)
      removedCount += 1
    } catch (error) {
      console.warn('[CacheManager] 清理缓存失败:', key, error)
    }
  })

  return { count: removedCount }
}
