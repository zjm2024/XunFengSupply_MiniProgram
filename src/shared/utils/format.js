/**
 * 格式化工具 - 通用格式化函数
 * 金额格式化、日期格式化等纯工具函数
 *
 * 时区说明：数据库使用 DateTime.UtcNow 存储时间，前端需转换为本地时区展示。
 * 所有时间格式化函数均会自动处理 UTC 时间字符串的本地转换，页面层无需额外处理。
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

// ==================== 时区转换 ====================

/**
 * 将 UTC 时间字符串/时间戳转换为本地时区的 Date 对象
 *
 * 后端数据库使用 DateTime.UtcNow，常见返回格式：
 * - "2026-09-20T10:00:00.000Z"  (ISO 8601 + Z)
 * - "2026-09-20T10:00:00"       (无时区标记，语义为 UTC)
 *
 * JS 的 new Date() 对 ISO 8601 + Z 的字符串会自动转换为本地时区；
 * 但对无 Z 的日期时间字符串会按 UTC 解析当成本地（仅带 T 无 Z 的按 UTC 解析，空格的按本地解析）。
 * 此处统一识别无 Z 结尾的日期时间字符串，补上 Z 后再解析，确保转换为本地时区。
 *
 * @param {string|Date|number} dateTime - UTC 时间字符串或时间戳或 Date 对象
 * @returns {Date} 本地时区的 Date 对象，解析失败返回 Invalid Date
 */
export function parseUtcToLocal(dateTime) {
  if (!dateTime) return new Date(NaN)

  // 已经是 Date 对象
  if (dateTime instanceof Date) return isNaN(dateTime.getTime()) ? new Date(NaN) : dateTime

  // 纯数字时间戳
  if (typeof dateTime === 'number') return new Date(dateTime)

  if (typeof dateTime === 'string') {
    let str = dateTime.trim()
    if (!str) return new Date(NaN)

    // 纯数字字符串（时间戳）
    if (/^\d+$/.test(str)) return new Date(Number(str))

    // 如果末尾不是 Z/z，且是 ISO 日期时间格式（以 T 分隔），则补 Z 标记为 UTC
    if (!/[zZ]$/.test(str) && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(str)) {
      str = str.replace(/ /, 'T') + 'Z'
    }
    return new Date(str)
  }

  return new Date(NaN)
}

// ==================== 时间格式化 ====================

/**
 * 格式化日期（仅年月日）
 * @param {string|Date|number} dateTime - UTC 时间字符串或时间戳
 * @param {string} fmt - 格式模板，默认 YYYY-MM-DD
 * @returns {string}
 */
export function formatDate(dateTime, fmt = 'YYYY-MM-DD') {
  const date = parseUtcToLocal(dateTime)
  if (isNaN(date.getTime())) return ''

  const map = {
    'YYYY': date.getFullYear(),
    'MM': String(date.getMonth() + 1).padStart(2, '0'),
    'DD': String(date.getDate()).padStart(2, '0'),
  }

  let result = fmt
  for (const [key, value] of Object.entries(map)) {
    result = result.replace(new RegExp(key, 'g'), value)
  }
  return result
}

/**
 * 格式化日期时间
 * @param {string|Date|number} dateTime - UTC 时间字符串或时间戳
 * @param {string} fmt - 格式模板，默认 YYYY-MM-DD HH:mm:ss
 * @returns {string}
 */
export function formatDateTime(dateTime, fmt = 'YYYY-MM-DD HH:mm:ss') {
  if (!dateTime) return ''

  const date = parseUtcToLocal(dateTime)
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
 * @param {string|Date|number} dateTime - UTC 时间字符串或时间戳
 * @returns {string}
 */
export function formatRelativeTime(dateTime) {
  if (!dateTime) return ''

  const timestamp = parseUtcToLocal(dateTime).getTime()
  if (isNaN(timestamp)) return ''

  const now = Date.now()
  const diff = now - timestamp

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

/**
 * 解析 "YYYY-MM" 格式字符串为 "YYYY年MM月"
 * @param {string} value - 月份字符串，如 "2026-01"
 * @returns {string}
 */
export function formatMonthDisplay(value) {
  const [year, month] = String(value || '').split('-')
  return year && month ? `${year}年${month}月` : '-'
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
