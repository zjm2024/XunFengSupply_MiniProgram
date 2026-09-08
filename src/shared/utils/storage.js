/**
 * 本地缓存封装 - 统一管理本地存储
 *
 * 存储键命名规范（xf_b2b_ 前缀）：
 *   认证域：token, refreshToken, tokenExpiresIn
 *   用户域：userId, username, realName, nickname, avatarUrl, isAdmin, roleIds, permissions, dealerInfo, creditScore
 *   业务域：cart_items（购物车）, order_pending（待付款订单）
 */

const STORAGE_PREFIX = 'xf_b2b_'

/**
 * 登出时需要清理的完整 Key 清单
 */
const AUTH_KEYS = ['token', 'refreshToken', 'tokenExpiresIn']
const USER_KEYS = [
  'userId', 'username', 'realName', 'nickname', 'avatarUrl',
  'isAdmin', 'roleIds', 'permissions', 'dealerInfo', 'creditScore'
]
const BUSINESS_KEYS = ['cart_items', 'order_pending', 'order_detail_cache']

/** 登出清理完整清单 */
const LOGOUT_CLEAR_KEYS = [...AUTH_KEYS, ...USER_KEYS, ...BUSINESS_KEYS]

class Storage {
  /**
   * 设置缓存
   * @param {string} key - 键名
   * @param {*} value - 值
   */
  set(key, value) {
    try {
      const data = typeof value === 'object' ? JSON.stringify(value) : value
      uni.setStorageSync(STORAGE_PREFIX + key, data)
    } catch (e) {
      console.error('[Storage] set error:', e)
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 键名
   * @param {*} defaultValue - 默认值
   * @returns {*} 缓存值
   */
  get(key, defaultValue = null) {
    try {
      const value = uni.getStorageSync(STORAGE_PREFIX + key)
      if (value === '') return defaultValue

      // 尝试JSON解析
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    } catch (e) {
      return defaultValue
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 键名
   */
  remove(key) {
    try {
      uni.removeStorageSync(STORAGE_PREFIX + key)
    } catch (e) {
      console.error('[Storage] remove error:', e)
    }
  }

  /**
   * 清空所有应用缓存（按前缀匹配）
   */
  clear() {
    try {
      const res = uni.getStorageInfoSync()
      res.keys.forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          uni.removeStorageSync(key)
        }
      })
    } catch (e) {
      console.error('[Storage] clear error:', e)
    }
  }

  /**
   * 登出专用清理 - 按清单精确清除，保留非登录相关缓存（如主题、语言偏好等）
   * 比 clear() 更安全，不会误删全局配置
   */
  clearAllForLogout() {
    LOGOUT_CLEAR_KEYS.forEach(key => {
      try {
        uni.removeStorageSync(STORAGE_PREFIX + key)
      } catch (e) {
        // 忽略单个 key 删除失败
      }
    })
  }

  /**
   * 是否存在该key
   * @param {string} key - 键名
   * @returns {boolean}
   */
  has(key) {
    return uni.getStorageSync(STORAGE_PREFIX + key) !== ''
  }

  /** 获取存储前缀（供调试用） */
  get prefix() {
    return STORAGE_PREFIX
  }

  /** 获取登出清理清单（供调试/审计用） */
  get logoutKeys() {
    return [...LOGOUT_CLEAR_KEYS]
  }
}

export default new Storage()
