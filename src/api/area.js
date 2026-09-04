/**
 * 行政区划接口 - 省市区联动选择
 *
 * 后端映射：
 *   Module: System
 *   - Mini.SysAreaController → GetAreaChildren
 *
 * 特性：
 *   - 内存缓存：避免重复请求同一父级
 *   - single-flight：并发同一父级只发一次请求
 *   - 响应归一化：兼容后端 PascalCase 字段和 camelCase 字段
 *
 * ⚠️ 参数由页面层构建 PascalCase 实体，API 层直接透传
 */

import { dispatch } from './base.js'

// ==================== 常量 ====================

/** 根级行政区划编码（全国） */
const ROOT_AREA_CODE = '000000'

// ==================== 缓存 ====================

/** 父级编码 → 子级列表的内存缓存 */
const childrenCache = new Map()

/** 父级编码 → 进行中的请求（single-flight） */
const inflightRequests = new Map()

// ==================== 内部方法 ====================

/**
 * 归一化行政区划数据，兼容 PascalCase 和 camelCase 字段。
 * @param {Object} item - 后端返回的单条行政区划数据
 * @returns {{ code: string, name: string, parentCode: string, level: number }}
 */
function normalizeArea(item) {
  return {
    code: String(item?.code ?? item?.Code ?? ''),
    name: String(item?.name ?? item?.Name ?? ''),
    parentCode: String(item?.parentCode ?? item?.ParentCode ?? ''),
    level: Number(item?.level ?? item?.Level ?? 0),
  }
}

// ==================== 公开方法 ====================

/**
 * 按父级国标编码获取已启用的行政区划子级列表。
 *
 * @param {string} [parentCode='000000'] - 父级行政区划编码
 * @returns {Promise<Array<{ code: string, name: string, parentCode: string, level: number }>>}
 */
export function getAreaChildren(parentCode = ROOT_AREA_CODE) {
  const normalizedParentCode = String(parentCode || ROOT_AREA_CODE)

  // 命中缓存直接返回
  if (childrenCache.has(normalizedParentCode)) {
    return Promise.resolve(childrenCache.get(normalizedParentCode))
  }

  // 进行中的请求直接复用
  if (inflightRequests.has(normalizedParentCode)) {
    return inflightRequests.get(normalizedParentCode)
  }

  // 发起请求
  const request = dispatch(
    'System',
    'Mini.SysAreaController',
    'GetAreaChildren',
    { ParentCode: normalizedParentCode },
    { anonymous: true },
  )
    .then((data) => {
      const list = (Array.isArray(data) ? data : [])
        .map(normalizeArea)
        .filter(item => item.code && item.name)

      childrenCache.set(normalizedParentCode, list)
      return list
    })
    .finally(() => inflightRequests.delete(normalizedParentCode))

  inflightRequests.set(normalizedParentCode, request)
  return request
}

/**
 * 清空行政区划缓存。
 * 在需要重置缓存（如语言切换、账号切换）时调用。
 */
export function clearAreaCache() {
  childrenCache.clear()
  inflightRequests.clear()
}

export { ROOT_AREA_CODE }
