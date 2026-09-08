/**
 * @file 公共工具函数
 * @description
 * 集中管理通用工具函数（不包含业务逻辑）
 */

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
  return sysInfo.windowWidth >= 768 ||
         (sysInfo.screenWidth / sysInfo.screenHeight > 1.3)
}

/**
 * 计算内容区域可用高度
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
    height -= 44
  }

  height -= extraOffset

  return Math.max(height, 300)
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
 * 校验数量
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
