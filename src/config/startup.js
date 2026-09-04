/**
 * @file 启动页配置 - brand / 极速启动 可配置模式
 * @description
 * 系统支持两种可配置启动模式：
 *   - brand  品牌启动模式：展示品牌 Logo 至少 2.2 秒，用于正式版本
 *   - fast   极速启动模式：不展示品牌，快速进入目标页面
 *
 * 配置方式：通过环境变量 VITE_STARTUP_MODE 控制
 *   - 环境变量是构建期配置，切换后重新构建 App 即可
 *   - 不允许使用接口远程读取启动模式（会形成启动依赖闭环）
 *
 * 时长校验规则：
 *   - 非法配置自动回退 brand
 *   - 时长必须为非负有限数字
 */

// ==================== 模式解析 ====================

/**
 * 解析启动模式
 * 'fast' → fast，其他非法值 → brand（安全回退）
 */
function resolveStartupMode() {
  const mode = import.meta.env.VITE_STARTUP_MODE
  return mode === 'fast' ? 'fast' : 'brand'
}

/**
 * 解析时长配置
 * @param {string} envValue - 环境变量原始值
 * @param {number} defaultValue - 默认值
 * @returns {number} 合法的非负有限数字
 */
function parseDuration(envValue, defaultValue) {
  if (envValue === undefined || envValue === null || envValue === '') {
    return defaultValue
  }
  const num = Number(envValue)
  // 校验：必须是有限数字且非负
  if (!Number.isFinite(num) || num < 0) {
    return defaultValue
  }
  return num
}

// ==================== 导出配置 ====================

/** 当前启动模式 */
export const STARTUP_MODE = resolveStartupMode()

/** 启动配置（只读） */
export const STARTUP_CONFIG = Object.freeze({
  /** 启动模式：brand | fast */
  mode: STARTUP_MODE,
  /** 是否启用品牌展示 */
  brandEnabled: STARTUP_MODE === 'brand',
  /** 品牌最短展示时长（毫秒），仅 brand 模式有效 */
  brandMinDuration: parseDuration(
    import.meta.env.VITE_BRAND_MIN_DURATION,
    2200
  ),
  /** fast 模式下的 Loading 延迟显示阈值（毫秒） */
  fastLoadingDelay: parseDuration(
    import.meta.env.VITE_FAST_LOADING_DELAY,
    180
  ),
})

// ==================== 便捷判断 ====================

/** 是否为品牌启动模式 */
export const IS_BRAND_MODE = STARTUP_MODE === 'brand'

/** 是否为极速启动模式 */
export const IS_FAST_MODE = STARTUP_MODE === 'fast'
