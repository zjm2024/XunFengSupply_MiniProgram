/**
 * 业务规则工具 - 信誉分增减计算规则
 * 对应业务流程：
 * 1. 授信额度体系 → 信誉分增减规则
 * 2. 收货对账结算 → 履约正常加分、逾期拒收扣分
 * 3. 全流程 → 授信等级计算
 */

import { CREDIT_RULES, CREDIT_LEVEL } from '../config/constant.js'

// ==================== 信誉分计算 ====================

/**
 * 计算履约正常加分
 * @param {number} currentScore - 当前信誉分
 * @param {string} type - 加分类型 'on_time' | 'early' | 'monthly' | 'after_sale_ok'
 * @returns {number} 新的信誉分
 */
export function addCreditScore(currentScore, type) {
  const scoreMap = {
    on_time: CREDIT_RULES.ON_TIME_PAYMENT,       // 按时付款 +5
    early: CREDIT_RULES.EARLY_PAYMENT,             // 提前付款 +8
    monthly: CREDIT_RULES.MONTHLY_RECOVERY,         // 月度正常履约 +3
    after_sale_ok: CREDIT_RULES.SUCCESS_AFTER_SALE  // 正常售后 +2
  }
  
  const addScore = scoreMap[type] || 0
  return clampScore(currentScore + addScore)
}

/**
 * 计算违规扣分
 * @param {number} currentScore - 当前信誉分
 * @param {string} type - 扣分类型 'overdue' | 'reject' | 'fraud_after_sale'
 * @returns {number} 新的信誉分
 */
export function deductCreditScore(currentScore, type) {
  const deductMap = {
    overdue: CREDIT_RULES.OVERDUE_PAYMENT,           // 逾期付款 -15
    reject: CREDIT_RULES.REJECT_RECEIPT,              // 拒收 -20
    fraud_after_sale: CREDIT_RULES.FRAUD_AFTER_SALE   // 恶意售后 -30
  }
  
  const deductScore = deductMap[type] || 0
  return clampScore(currentScore - deductScore)
}

/**
 * 将信誉分限制在合法范围内 [MIN_SCORE, MAX_SCORE]
 * @param {number} score
 * @returns {number}
 */
function clampScore(score) {
  return Math.max(CREDIT_RULES.MIN_SCORE, Math.min(CREDIT_RULES.MAX_SCORE, score))
}

// ==================== 授信等级计算 ====================

/**
 * 根据信誉分获取授信等级和最大授信额度
 * @param {number} creditScore - 信誉分
 * @returns {Object} { level, maxCredit, label }
 */
export function getCreditLevel(creditScore) {
  // 从高到低匹配等级
  const levels = [
    CREDIT_LEVEL.LEVEL_4,  // 核心经销商 ≥95分
    CREDIT_LEVEL.LEVEL_3,  // 优质经销商 ≥80分
    CREDIT_LEVEL.LEVEL_2,  // 标准经销商 ≥60分
    CREDIT_LEVEL.LEVEL_1   // 初级经销商 <60分
  ]
  
  for (const level of levels) {
    if (creditScore >= level.minScore) {
      return level
    }
  }
  
  return CREDIT_LEVEL.LEVEL_1
}

/**
 * 计算可用授信额度
 * @param {number} creditScore - 信誉分
 * @param {number} usedCredit - 已使用授信额度（单位：分）
 * @returns {Object} { totalLimit, usedLimit, availableLimit }
 */
export function getAvailableCredit(creditScore, usedCredit = 0) {
  const level = getCreditLevel(creditScore)
  const totalLimit = level.maxCredit * 100 // 转换为分
  const availableLimit = Math.max(0, totalLimit - usedCredit)
  
  return {
    totalLimit,
    usedLimit: usedCredit,
    availableLimit,
    level: level.label
  }
}

// ==================== 业务判断工具 ====================

/**
 * 判断是否可以使用授信赊账
 * @param {number} creditScore - 信誉分
 * @param {number} availableCredit - 可用授信额度
 * @param {number} orderAmount - 订单金额（分）
 * @returns {Object} { canUse, reason }
 */
export function canUseCreditPayment(creditScore, availableCredit, orderAmount) {
  // 信誉分低于60不可使用授信
  if (creditScore < 60) {
    return { canUse: false, reason: '信誉分不足60分，暂无法使用授信赊账' }
  }
  
  // 可用额度不足
  if (availableCredit < orderAmount) {
    return { canUse: false, reason: '授信额度不足，请选择现款支付或先还款' }
  }
  
  return { canUse: true, reason: '' }
}

/**
 * 判断是否可以发起售后申请
 * @param {string} orderStatus - 订单当前状态
 * @param {Date} receiveTime - 收货时间
 * @returns {Object} { canApply, reason }
 */
export function canApplyAfterSale(orderStatus, receiveTime) {
  // 只有已收货或已完成状态可发起售后
  if (![4, 5].includes(orderStatus)) {
    return { canApply: false, reason: '当前订单状态不支持发起售后' }
  }
  
  // 收货后15天内可发起售后
  if (receiveTime) {
    const daysSinceReceive = Math.floor((Date.now() - new Date(receiveTime).getTime()) / (24 * 60 * 60 * 1000))
    if (daysSinceReceive > 15) {
      return { canApply: false, reason: '已超过售后期限（收货后15天内）' }
    }
  }
  
  return { canApply: true, reason: '' }
}
