/**
 * 格式化工具 - 通用格式化函数
 * 金额格式化、日期格式化等纯工具函数
 */

// ==================== 金额格式化 ====================

/**
 * 格式化金额（分→元，保留两位小数）
 * @param {number} amount - 金额（单位：分）
 * @param {boolean} showSymbol - 是否显示¥符号
 * @returns {string} 格式化后的金额字符串
 */
export function formatMoney(amount, showSymbol = true) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? '¥0.00' : '0.00'
  }
  const value = (amount / 100).toFixed(2)
  return showSymbol ? `¥${value}` : value
}

/**
 * 格式化大额金额（万元为单位）
 * @param {number} amount - 金额（单位：分）
 * @returns {string}
 */
export function formatBigMoney(amount) {
  if (!amount || isNaN(amount)) return '¥0.00'
  const wan = (amount / 100 / 10000).toFixed(2)
  return `¥${wan}万`
}

// ==================== 时间格式化 ====================

/**
 * 格式化日期时间
 * @param {string|Date|number} dateTime - 时间戳或日期字符串
 * @param {string} fmt - 格式模板，默认 YYYY-MM-DD HH:mm:ss
 * @returns {string}
 */
export function formatDateTime(dateTime, fmt = 'YYYY-MM-DD HH:mm:ss') {
  if (!dateTime) return ''

  const date = new Date(dateTime)
  if (isNaN(date.getTime())) return ''

  const map = {
    'YYYY': date.getFullYear(),
    'MM': String(date.getMonth() + 1).padStart(2, '0'),
    'DD': String(date.getDate()).padStart(2, '0'),
    'HH': String(date.getHours()).padStart(2, '0'),
    'mm': String(date.getMinutes()).padStart(2, '0'),
    'ss': String(date.getSeconds()).padStart(2, '0')
  }

  let result = fmt
  for (const [key, value] of Object.entries(map)) {
    result = result.replace(new RegExp(key, 'g'), value)
  }
  return result
}

/**
 * 格式化为相对时间（如：3分钟前、昨天）
 * @param {string|Date|number} dateTime
 * @returns {string}
 */
export function formatRelativeTime(dateTime) {
  if (!dateTime) return ''

  const now = Date.now()
  const target = new Date(dateTime).getTime()
  const diff = now - target

  if (diff < 0) return '刚刚'

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`

  return formatDateTime(dateTime, 'YYYY-MM-DD')
}

/**
 * 格式化月份
 * @param {number} year - 年份
 * @param {number} month - 月份
 * @returns {string} 如 "2026年01月"
 */
export function formatMonth(year, month) {
  return `${year}年${String(month).padStart(2, '0')}月`
}

// ==================== 数字格式化 ====================

/**
 * 数字千分位格式化
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  if (!num && num !== 0) return '0'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
