/**
 * @file 公共工具函数
 * @description
 * 集中管理金额格式化、日期处理、路由参数、校验等通用函数
 * 所有页面/组件应优先使用此文件中的函数，避免各自重复实现
 */

// ==================== 金额工具 ====================

/**
 * 分转元（整数分 → 展示用元字符串）
 * @param {number} cents - 金额（单位：分）
 * @param {Object} [options={}] - 格式选项
 * @param {boolean} [options.showSymbol=true] - 是否显示 ¥ 符号
 * @param {number} [options.precision=2] - 小数位数
 * @returns {string} 格式化后的金额字符串
 *
 * @example
 * formatMoney(123456)  // "¥1,234.56"
 * formatMoney(0)       // "¥0.00"
 */
export function formatMoney(cents, options = {}) {
  const { showSymbol = true, precision = 2 } = options
  const yuan = Number(cents) / 100
  const formatted = yuan.toLocaleString('zh-CN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })
  return showSymbol ? `¥${formatted}` : formatted
}

/**
 * 元转分（展示用元 → 存储用整数分）
 * @param {string|number} yuan - 金额（单位：元）
 * @returns {number} 金额（单位：分，向下取整）
 *
 * @example
 * parseMoneyToCents("1,234.56")  // 123456
 * parseMoneyToCents(100)          // 10000
 */
export function parseMoneyToCents(yuan) {
  const num = typeof yuan === 'string'
    ? parseFloat(yuan.replace(/,/g, ''))
    : yuan
  return Math.floor(num * 100)
}

/**
 * 格式化大额金额（万元为单位）
 * @param {number} cents - 金额（分）
 * @returns {string}
 */
export function formatMoneyInWan(cents) {
  const wan = cents / 1000000
  if (wan >= 1) {
    return `${wan.toFixed(2)}万`
  }
  return formatMoney(cents)
}

// ==================== 日期时间工具 ====================

/**
 * 格式化日期为本地显示
 * @param {string|Date} date - 日期
 * @param {string} [pattern='YYYY-MM-DD'] - 格式模式
 * @returns {string}
 */
export function formatDate(date, pattern = 'YYYY-MM-DD') {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const pad = (n) => String(n).padStart(2, '0')

  const replacements = {
    'YYYY': d.getFullYear(),
    'MM': pad(d.getMonth() + 1),
    'DD': pad(d.getDate()),
    'HH': pad(d.getHours()),
    'mm': pad(d.getMinutes()),
    'ss': pad(d.getSeconds()),
  }

  let result = pattern
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(key, value)
  }
  return result
}

/**
 * 获取相对时间描述
 * @param {string|Date} date - 日期
 * @returns {string} 如 "刚刚"、"5分钟前"、"昨天"
 */
export function getRelativeTime(date) {
  const now = Date.now()
  const target = new Date(date).getTime()
  const diff = now - target

  if (diff < 0) return '刚刚'
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}天前`

  return formatDate(date, 'YYYY-MM-DD')
}

// ==================== 校验工具 ====================

/**
 * 校验手机号
 * @param {string} phone
 * @returns {string|null} 错误信息或 null（通过）
 */
export function validatePhone(phone) {
  if (!phone) return '请输入手机号'
  const REGEX_PHONE = /^1[3-9]\d{9}$/
  if (!REGEX_PHONE.test(phone)) return '请输入正确的手机号'
  return null
}

/**
 * 校验数量（MOQ、库存等）
 * @param {number} value
 * @param {Object} [rules={}]
 * @param {number} [rules.min=0]
 * @param {number} [rules.max=999999]
 * @param {number} [rules.multipleOf=1]
 * @returns {string|null}
 */
export function validateQuantity(value, rules = {}) {
  const { min = 0, max = 999999, multipleOf = 1 } = rules
  const num = Number(value)

  if (isNaN(num)) return '请输入有效数字'
  if (num < min) return `不能小于${min}`
  if (num > max) return `不能大于${max}`
  if (multipleOf > 1 && num % multipleOf !== 0) {
    return `必须是${multipleOf}的倍数`
  }
  return null
}

// ==================== 图片工具 ====================

/**
 * 获取七牛云缩略图 URL
 * @param {string} url - 原图 URL
 * @param {number} [width=200] - 宽度
 * @param {number} [height=200] - 高度
 * @returns {string}
 */
export function getThumbnailUrl(url, width = 200, height = 200) {
  if (!url) return ''
  // 七牛缩略图规则：URL + ?imageView2/1/w/200/h/200
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}imageView2/1/w/${width}/h/${height}`
}

/** 默认商品占位图 */
export const DEFAULT_PRODUCT_IMG = '/static/images/default-product.png'

/** 默认头像 */
export const DEFAULT_AVATAR = '/static/images/default-avatar.png'

/**
 * 安全获取图片 URL（失败时返回默认图）
 * @param {string} url
 * @param {string} [fallback=''] - 默认图
 * @returns {string}
 */
export function safeImageUrl(url, fallback = DEFAULT_PRODUCT_IMG) {
  return url || fallback
}

// ==================== 设备与布局工具 ====================

/**
 * 获取系统信息（带缓存）
 * @returns {Promise<UniApp.GetSystemInfoSyncResult>}
 */
let _sysInfoCache = null
let _sysInfoTime = 0
const SYS_INFO_CACHE_TTL = 60000 // 1 分钟缓存

export async function getSystemInfo() {
  const now = Date.now()
  if (_sysInfoCache && (now - _sysInfoTime) < SYS_INFO_CACHE_TTL) {
    return _sysInfoCache
  }

  return new Promise((resolve) => {
    uni.getSystemInfo({
      success: (res) => {
        _sysInfoCache = res
        _sysInfoTime = now
        resolve(res)
      },
      fail: () => {
        // 返回兜底值
        resolve({
          windowWidth: 375,
          windowHeight: 812,
          pixelRatio: 2,
          platform: 'ios',
          statusBarHeight: 44,
          safeArea: { bottom: 34 },
        })
      },
    })
  })
}

/**
 * 判断是否为平板设备
 * @returns {Promise<boolean>}
 */
export async function isTabletDevice() {
  const sysInfo = await getSystemInfo()
  // 平板判断：宽度 >= 768 或屏幕比例接近 4:3
  return sysInfo.windowWidth >= 768 ||
         (sysInfo.screenWidth / sysInfo.screenHeight > 1.3)
}

/**
 * 计算内容区域可用高度（减去状态栏、导航栏等）
 * @param {Object} [options={}]
 * @param {boolean} [options.withStatusBar=true]
 * @param {boolean} [options.withNavBar=false]
 * @param {number} [options.extraOffset=0]
 * @returns {Promise<number>} 可用高度(px)
 */
export async function getAvailableHeight(options = {}) {
  const { withStatusBar = true, withNavBar = false, extraOffset = 0 } = options
  const sysInfo = await getSystemInfo()

  let height = sysInfo.windowHeight

  if (withStatusBar) {
    height -= sysInfo.statusBarHeight || 0
  }

  if (withNavBar) {
    height -= 44 // 默认导航栏高度
  }

  height -= extraOffset

  return Math.max(height, 300) // 最小高度保护
}

// ==================== 语言工具 ====================

/**
 * 归一化语言代码
 * @param {string} lang
 * @returns {'zh-CN' | 'en-US'}
 */
export function normalizeLanguage(lang) {
  const lower = (lang || '').toLowerCase()
  if (lower.startsWith('zh') || lower === 'cn' || lower === 'chinese') {
    return 'zh-CN'
  }
  return 'en-US'
}
