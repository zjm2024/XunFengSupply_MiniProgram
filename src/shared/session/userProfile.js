/**
 * @file 用户展示信息工具
 * @description
 * 提供用户等级、展示名称等纯函数工具
 */

/**
 * 根据信誉分获取等级信息
 * @param {number} score - 信誉分 (0-100)
 * @returns {{ label: string, maxCredit: number }}
 */
export function getCreditLevel(score) {
  if (score >= 90) {
    return { label: 'AAA', maxCredit: 50000 }
  }
  if (score >= 80) {
    return { label: 'AA', maxCredit: 30000 }
  }
  if (score >= 60) {
    return { label: 'A', maxCredit: 10000 }
  }
  if (score >= 40) {
    return { label: 'B', maxCredit: 5000 }
  }
  return { label: 'C', maxCredit: 0 }
}

/**
 * 获取用户显示名称
 * @param {Object} userInfo
 * @returns {string}
 */
export function getUserDisplayName(userInfo) {
  if (!userInfo) return '经销商'
  return userInfo.storeName ||
         userInfo.contactName ||
         userInfo.realName ||
         userInfo.username ||
         '经销商'
}
