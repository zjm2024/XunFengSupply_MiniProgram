/**
 * @file 冷启动最小 API
 * @description
 * 冷启动需要的最小请求集合，从 auth 分包独立出来。
 * 包括：GetBootstrapContext、CheckAppVersion
 *
 * 注意：登录、验证码、签约等 auth 分包业务接口仍在 auth/api/authApi.js
 */

import { dispatch } from '../../shared/api/dispatchClient.js'

/**
 * 获取 Mini 端启动上下文（需认证）
 * 后端: MallDealer.Mini.ProfileController.GetBootstrapContext
 * @param {Object} [options]
 * @param {'passive'|'interactive'} [options.authStrategy='passive'] - 401 策略
 * @param {number} [options.timeout] - 超时时间
 * @returns {Promise<BootstrapContext>}
 */
export async function getBootstrapContext(options = {}) {
  const { authStrategy = 'passive', timeout } = options

  return dispatch('MallDealer', 'Mini.ProfileController', 'GetBootstrapContext', {}, {
    authStrategy,
    timeout,
  })
}

/**
 * 检查 App 版本更新
 * 后端: System.Mini.AppVersionController.CheckVersion
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

/**
 * @typedef {Object} BootstrapContext
 * @property {string} customerId
 * @property {string} username
 * @property {string} realName
 * @property {string} companyName
 * @property {number} status - 账号状态
 * @property {number} signStatus - 签约状态
 * @property {boolean} isMaster
 * @property {string[]} roles
 * @property {string[]} permissions
 */
