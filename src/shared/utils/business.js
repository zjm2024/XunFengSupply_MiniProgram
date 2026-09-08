/**
 * @file 业务工具函数
 * @description
 * 包含用户业务等级、账户状态映射等纯函数工具
 */

import { getCreditLevel } from '../session/userProfile.js'

export { getCreditLevel }

/**
 * 格式化账单状态
 * @param {number} status - 账单状态码
 * @returns {{ label: string, color: string }}
 */
export function formatBillStatus(status) {
  const statusMap = {
    0: { label: '未结算', color: '#FF9800' },
    1: { label: '部分结算', color: '#E6A23C' },
    2: { label: '已结清', color: '#67C23A' },
    3: { label: '已逾期', color: '#F56C6C' }
  }
  return statusMap[status] || { label: '未知', color: '#909399' }
}

/**
 * 格式化订单状态
 * @param {number} status - 订单状态码
 * @returns {{ label: string, color: string }}
 */
export function formatOrderStatus(status) {
  const statusMap = {
    0: { label: '待审核', color: '#FF9800' },
    1: { label: '待付款', color: '#E6A23C' },
    2: { label: '已付款', color: '#409EFF' },
    3: { label: '已发货', color: '#67C23A' },
    4: { label: '已收货', color: '#909399' },
    5: { label: '已完成', color: '#909399' },
    6: { label: '售后中', color: '#E6A23C' },
    '-1': { label: '已取消', color: '#F56C6C' }
  }
  return statusMap[status] || { label: '未知', color: '#909399' }
}
