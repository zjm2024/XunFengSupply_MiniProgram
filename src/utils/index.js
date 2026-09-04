/**
 * 工具函数统一导出入口
 *
 * 使用方式：
 *   import { formatMoney, formatDate, validatePhone } from '@/utils'
 *
 * 模块说明：
 *   - helpers.js  : 核心工具（金额、日期、校验、图片、设备）
 *   - format.js   : 格式化扩展（状态码映射等）→ 已合并到此入口
 *   - validate.js : 表单校验规则集
 *   - storage.js  : 本地存储封装
 *   - business.js : 业务常量与计算
 *   - routeGuard.js: 路由守卫
 */

// ==================== 核心工具（来自 helpers.js）====================
export {
  formatMoney,
  parseMoneyToCents,
  formatMoneyInWan,
  formatDate,
  getRelativeTime,
  validatePhone,
  validateQuantity,
  getThumbnailUrl,
  DEFAULT_PRODUCT_IMG,
  DEFAULT_AVATAR,
  safeImageUrl,
  getSystemInfo,
  isTabletDevice,
  getAvailableHeight,
  normalizeLanguage,
} from './helpers.js'

// ==================== 格式化扩展（来自 format.js 独有函数）====================
export {
  formatBigMoney,
  formatDateTime,       // formatDate 的别名，保持兼容
  formatRelativeTime,   // getRelativeTime 的别名，保持兼容
  formatMonth,
  formatBillStatus,
  formatOrderStatus,
  formatNumber,
} from './format.js'

// ==================== 校验规则（来自 validate.js）====================
export * from './validate.js'

// ==================== 存储（来自 storage.js）====================
export { default as storage } from './storage.js'

// ==================== 业务常量（来自 business.js）====================
export * from './business.js'

// ==================== 路由守卫（来自 routeGuard.js）====================
export * from './routeGuard.js'
