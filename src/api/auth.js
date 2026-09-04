/**
 * 认证相关接口 - 登录、退出、改密、用户信息、入驻申请、子账号管理
 *
 * 后端动态调度协议（POST /api/dispatch）：
 *   Module: System（认证模块）
 *   - Mini.LoginController      → Login / AutoLogin / Logout / ChangePassword / 验证码
 *
 *   Module: MallDealer（经销商模块）
 *   - Mini.SubAccountController → Create / GetList / ToggleStatus
 *   - Mini.ProfileController    → GetProfile / UpdateProfile / GetBootstrapContext
 *   - Mini.ApplicationController → SubmitApplication
 *
 * ⚠️ systemType 由后端宿主自动判断（Mini=2），无需前端传入
 * ⚠️ 参数由页面层构建 PascalCase 实体，API 层直接透传
 */

import { dispatch } from './base.js'

// ==================== 登录认证接口 ====================

/**
 * 账号密码登录（匿名访问，无需 Token）
 * MallDealer.AuthController.Login
 * @param {string} username - 账号
 * @param {string} password - 密码
 * @param {{ captchaToken?: string }} [verification] - 滑块验证通过后的一次性凭证
 * @returns {Promise<{ token, customerId, username, realName, grade, isMaster, expiresAt }>}
 */
export function login(username, password, verification = {}) {
  return dispatch('MallDealer', 'Mini.LoginController', 'Login', {
    username,
    password,
    captchaToken: verification.captchaToken || null,
  }, { anonymous: true })
}

/**
 * 获取一次性登录图形验证码（匿名访问）
 * @param {string} username - 验证码绑定的登录账号
 * @returns {Promise<{ captchaId: string, backgroundImageBase64: string, pieceImageBase64: string }>}
 */
export function getLoginCaptcha(username) {
  return dispatch('MallDealer', 'Mini.LoginController', 'GetLoginCaptcha', { username }, { anonymous: true })
}

/**
 * 校验滑块位置，成功后返回登录用的一次性凭证
 * @param {string} username
 * @param {string} captchaId
 * @param {number} offsetX - 原始图片坐标系中的 X 坐标
 * @returns {Promise<{ verificationToken: string, expiresIn: number }>}
 */
export function verifyLoginCaptcha(username, captchaId, offsetX) {
  return dispatch('MallDealer', 'Mini.LoginController', 'VerifyLoginCaptcha', { username, captchaId, offsetX }, { anonymous: true })
}

/**
 * 设备免登（匿名访问，无需 Token）
 * @param {string} deviceCode - 设备编码
 * @returns {Promise<{ token, customerId, username, realName, grade, isMaster, expiresAt }>}
 */
export function autoLogin(deviceCode) {
  return dispatch('MallDealer', 'Mini.LoginController', 'AutoLogin', {
    deviceCode,
  }, { anonymous: true })
}

/**
 * 退出登录
 * MallDealer.AuthController.Logout
 * @returns {Promise<boolean>}
 */
export function logout() {
  return dispatch('MallDealer', 'Mini.LoginController', 'Logout', {})
}

/**
 * 修改密码（需认证）
 * MallDealer.AuthController.ChangePassword
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {string} params.OldPassword - 旧密码
 * @param {string} params.NewPassword - 新密码
 * @returns {Promise<boolean>}
 */
export function changePassword(params) {
  return dispatch('MallDealer', 'Mini.LoginController', 'ChangePassword', params)
}

// ==================== 用户信息接口 ====================

/**
 * 获取当前用户详细信息（需认证）
 * MallDealer.AuthController.GetCurrentUser
 * @returns {Promise<{ customerId, username, realName, companyName, status, isMaster }>}
 */
export function getCurrentUser() {
  return getProfile()
}

/**
 * 获取 Mini 端启动上下文（需认证）
 * 后端：MallDealer.Mini.ProfileController.GetBootstrapContext
 * @param {Object} [options={}] - 配置选项
 * @param {string} [options.authStrategy='passive'] - 401 处理策略（默认 passive）
 * @param {number} [options.timeout=8000] - 超时时间
 * @returns {Promise<{ customerId, username, realName, companyName, status, signStatus }>}
 */
export function getBootstrapContext(options = {}) {
  return dispatch('MallDealer', 'Mini.ProfileController', 'GetBootstrapContext', {}, {
    authStrategy: options.authStrategy || 'passive',
    timeout: options.timeout || 8000,
  })
}

/**
 * 当前 Mini 后端不提供 RefreshToken 接口。
 * 保留此导出仅用于兼容旧代码，避免再请求不存在的 Mini.AuthController。
 */
export function refreshToken() {
  return Promise.reject(new Error('当前版本不支持 Token 刷新，请重新登录'))
}

// ==================== 入驻申请接口 ====================

/**
 * 提交经销商入驻申请（匿名访问）
 * @param {Object} params - 后端实体参数（PascalCase）
 * @returns {Promise<number>} 新创建的申请ID
 */
export function submitApplication(params) {
  return dispatch('MallDealer', 'Mini.ApplicationController', 'SubmitApplication', params, { anonymous: true })
}

// ==================== 子账号管理接口 ====================

/**
 * 创建子账号（需认证，仅主账号）
 * @param {Object} params - 后端实体参数（PascalCase）
 * @returns {Promise<number>} 新创建的子账号ID
 */
export function createSubAccount(params) {
  return dispatch('MallDealer', 'Mini.SubAccountController', 'Create', params)
}

/**
 * 获取子账号列表（需认证，仅主账号）
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {number} [params.Page=1] - 页码
 * @param {number} [params.PageSize=20] - 每页条数
 * @returns {Promise<{ total, items }>}
 */
export function getSubAccountList(params) {
  const source = params || {}
  return dispatch('MallDealer', 'Mini.SubAccountController', 'GetList', {
    page: source.page ?? source.Page ?? source.pageNum ?? source.PageNum ?? 1,
    pageSize: source.pageSize ?? source.PageSize ?? 20,
  })
}

/**
 * 启用/禁用子账号（需认证）
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {number} params.SubAccountId - 子账号ID
 * @param {number} params.Status - 1启用 0禁用
 * @returns {Promise<boolean>}
 */
export function toggleSubAccountStatus(params) {
  return dispatch('MallDealer', 'Mini.SubAccountController', 'ToggleStatus', params)
}

// ==================== 个人资料接口 ====================

/**
 * 获取当前用户资料（需认证）
 * @returns {Promise<Object>} 用户资料
 */
export function getProfile() {
  return dispatch('MallDealer', 'Mini.ProfileController', 'GetProfile', {})
}

/**
 * 更新个人资料（需认证）
 * @param {Object} params - 后端实体参数（PascalCase）
 * @returns {Promise<boolean>}
 */
export function updateProfile(params) {
  return dispatch('MallDealer', 'Mini.ProfileController', 'UpdateProfile', params)
}

/**
 * 更新语言偏好（需认证）
 * @param {string} languageCode - 语言代码（如 zh-CN、en）
 * @returns {Promise<boolean>}
 */
export function updateLanguage(languageCode) {
  return dispatch('MallDealer', 'Mini.ProfileController', 'UpdateLanguage', { LanguageCode: languageCode })
}

/**
 * 检查 App 版本更新
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {string} params.Platform - 平台：android / ios
 * @param {number} params.VersionCode - 当前版本号（数字）
 * @param {string} params.VersionName - 当前版本名称（如 1.0.0）
 * @returns<{ latestVersionCode, minSupportedVersionCode, forceUpdate, downloadUrl, releaseNotes }>}
 */
export function checkAppVersion(params) {
  return dispatch('System', 'Mini.AppVersionController', 'CheckVersion', params, {
    anonymous: true,
    timeout: 10000,
  })
}

// ==================== 向后兼容方法（旧调用名） ====================

/**
 * 提交签约资质申请（等价于 submitApplication，向后兼容旧调用名）
 * @param {Object} params - 后端实体参数（PascalCase）
 * @returns {Promise<number>} 新创建的申请ID
 */
export function applySign(params) {
  return submitApplication(params)
}

/**
 * 查询签约状态
 * ⚠️ 后端未实现单独的状态查询接口
 */
export function getSignStatus() {
  return Promise.reject(new Error('签约状态查询功能尚未实现'))
}

/**
 * 查询资质审核详情
 * ⚠️ 后端未实现
 */
export function getSignDetail() {
  return Promise.reject(new Error('签约详情功能尚未实现'))
}

/**
 * 校验账号当前状态（是否冻结、是否正常）
 * ⚠️ 后端未实现单独的账号状态接口，登录时后端会返回冻结信息
 */
export function checkAccountStatus() {
  return Promise.reject(new Error('账号状态查询功能尚未实现'))
}

/**
 * 发送验证码
 * ⚠️ 后端未实现验证码功能
 */
export function sendCode(phone) {
  return Promise.reject(new Error('验证码功能尚未实现'))
}

/**
 * 修改子账号权限
 * ⚠️ 后端未实现
 */
export function updateSubAccountPermission(accountId, permissions) {
  return Promise.reject(new Error('子账号权限修改功能尚未实现'))
}

/**
 * 删除子账号
 * ⚠️ 后端未实现
 */
export function deleteSubAccount(accountId) {
  return Promise.reject(new Error('删除子账号功能尚未实现'))
}
