/**
 * 子账号管理相关接口
 *
 * 后端映射：
 *   Module: MallDealer
 *   - Mini.SubAccountController → Create / GetList / ToggleStatus
 *
 * ⚠️ 参数由页面层构建 PascalCase 实体，API 层直接透传
 */

import { dispatch } from '../../../shared/api/dispatchClient.js'

// ==================== 子账号接口 ====================

/**
 * 子账号领域模型（camelCase）
 * @typedef {Object} SubAccount
 * @property {number} id - 子账号ID
 * @property {string} username - 登录账号
 * @property {string} name - 使用人姓名
 * @property {string} role - 角色标签
 * @property {string} phone - 手机号
 * @property {string} email - 邮箱
 * @property {string} status - 状态：'active' | 'inactive'
 * @property {string} createdAt - 创建时间
 */

/**
 * 将后端返回的 MallDealerCustomer 实体映射为前端 camelCase 领域模型
 * @param {Object} item - 后端返回的 PascalCase DTO
 * @returns {SubAccount} 子账号领域模型
 */
function normalizeSubAccount(item = {}) {
  const customerId = item.customerId ?? item.CustomerId ?? 0
  const username = item.username ?? item.Username ?? ''
  const realName = (item.realName ?? item.RealName) || username
  const rawStatus = item.status ?? item.Status
  // 后端状态：0冻结/1正常 → 前端：inactive/active
  const status = Number(rawStatus) === 1 ? 'active' : 'inactive'
  const createdAt = item.createdAt ?? item.CreatedAt ?? ''

  return {
    id: customerId,
    customerId,
    username,
    name: realName,
    role: realName ? `${realName}（${username}）` : username,
    phone: item.mobile ?? item.Mobile ?? '',
    email: item.email ?? item.Email ?? '',
    status,
    createdAt: createdAt ? String(createdAt).slice(0, 10) : '',
    permissions: derivePermissions(realName),
  }
}

/**
 * 根据使用人姓名推导权限标签（待后端正式字段后替换）
 * @param {string} realName
 * @returns {string[]}
 */
function derivePermissions(realName) {
  if (!realName) return []
  // 占位逻辑：根据已确认字段显示通用权限，后续可由后端下发 permission 字段替换
  return ['商品浏览', '下单']
}

/**
 * 创建子账号（需认证，仅主账号）
 * @param {Object} params - camelCase 参数
 * @param {string} params.username - 登录账号
 * @param {string} params.password - 密码
 * @param {string} [params.realName] - 使用人姓名
 * @param {string} [params.mobile] - 手机号
 * @returns {Promise<number>} 新创建的子账号ID
 */
export function createSubAccount(params = {}) {
  return dispatch('MallDealer', 'Mini.SubAccountController', 'Create', {
    Username: params.username ?? params.Username ?? '',
    Password: params.password ?? params.Password ?? '',
    RealName: params.realName ?? params.RealName ?? null,
    Mobile: params.mobile ?? params.Mobile ?? null,
  })
}

/**
 * 获取子账号列表（需认证，仅主账号）
 * @param {Object} [params] - camelCase 参数
 * @param {number} [params.pageNum=1] - 页码
 * @param {number} [params.pageSize=20] - 每页条数
 * @returns {Promise<{items: SubAccount[], totalCount: number, pageNum: number, pageSize: number, totalPages: number}>}
 */
export function getSubAccountList(params = {}) {
  const source = params || {}
  return dispatch('MallDealer', 'Mini.SubAccountController', 'GetList', {
    Page: source.pageNum ?? source.Page ?? source.page ?? 1,
    PageSize: source.pageSize ?? source.PageSize ?? 20,
  }).then(result => {
    if (!result) {
      return { items: [], totalCount: 0, pageNum: 1, pageSize: 20, totalPages: 0 }
    }
    const rawItems = Array.isArray(result.items) ? result.items
      : Array.isArray(result.Items) ? result.Items
      : []
    return {
      items: rawItems.map(normalizeSubAccount),
      totalCount: Number(result.totalCount ?? result.TotalCount ?? rawItems.length),
      pageNum: Number(result.pageNum ?? result.PageNum ?? 1),
      pageSize: Number(result.pageSize ?? result.PageSize ?? 20),
      totalPages: Number(result.totalPages ?? result.TotalPages ?? 0),
    }
  })
}

/**
 * 启用/禁用子账号（需认证）
 * @param {Object} params - camelCase 参数
 * @param {number} params.subAccountId - 子账号ID
 * @param {boolean} active - true=启用, false=禁用
 * @returns {Promise<boolean>}
 */
export function toggleSubAccountStatus(params = {}) {
  const targetStatus = params.active === undefined
    ? (params.Status ?? (params.subAccountId != null ? 1 : 0))
    : (params.active ? 1 : 0)
  return dispatch('MallDealer', 'Mini.SubAccountController', 'ToggleStatus', {
    SubAccountId: params.subAccountId ?? params.SubAccountId ?? params.id ?? 0,
    Status: targetStatus,
  })
}

// ==================== 向后兼容方法（旧调用名，逐步废弃） ====================

/**
 * 禁用子账号（toggleSubAccountStatus 的别名，保留旧调用名）
 * @param {number} accountId - 子账号ID
 * @returns {Promise<boolean>}
 */
export function disableSubAccount(accountId) {
  return toggleSubAccountStatus({ subAccountId: accountId, active: false })
}

/**
 * 启用子账号（toggleSubAccountStatus 的别名，保留旧调用名）
 * @param {number} accountId - 子账号ID
 * @returns {Promise<boolean>}
 */
export function enableSubAccount(accountId) {
  return toggleSubAccountStatus({ subAccountId: accountId, active: true })
}
