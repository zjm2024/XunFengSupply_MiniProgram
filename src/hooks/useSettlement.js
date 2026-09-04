/**
 * 对账结算逻辑组合式钩子
 * 对应业务流程节点：
 * 收货对账结算 → 月度账单查看、还款、导出凭证、恢复授信额度
 */
import { ref } from 'vue'
import { useUserStore } from '../store/modules/user.js'
import { 
  getBillList, 
  getBillDetail, 
  payBill, 
  repayCredit,
  exportBillVoucher,
  getSettlementOverview,
  getCreditInfo
} from '../../api/settlement.js'
import { formatMoney, formatMonth } from '../../utils/format.js'
import { addCreditScore, deductCreditScore } from '../../utils/business.js'

export function useSettlement() {
  const userStore = useUserStore()
  const loading = ref(false)

  /**
   * 加载月度账单列表
   * @param {Object} params - { year, month }
   * @returns {Promise<Array>}
   */
  async function fetchBillList(params) {
    loading.value = true
    try {
      const res = await getBillList(params)
      return res.list || []
    } catch (e) {
      console.error('加载账单列表失败:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载账单详情
   * @param {string} billId
   * @returns {Promise<Object|null>}
   */
  async function fetchBillDetail(billId) {
    try {
      const res = await getBillDetail(billId)
      return res
    } catch (e) {
      console.error('加载账单详情失败:', e)
      return null
    }
  }

  /**
   * 还款/结清账单
   * @param {string} billId
   * @param {Object} params - { payType, amount }
   * @returns {Promise<boolean>}
   */
  async function settleBill(billId, params) {
    loading.value = true
    
    try {
      await payBill(billId, params)
      
      // 更新授信额度（还款后恢复可用额度）
      await refreshCreditInfo()
      
      // 如果是逾期还款完成，恢复部分信誉分
      // TODO: 根据实际业务规则处理
      
      uni.showToast({ title: '还款成功', icon: 'success' })
      return true
    } catch (e) {
      uni.showToast({ title: e.message || '还款失败', icon: 'none' })
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 导出PDF凭证
   * @param {string} billId
   * @returns {Promise<boolean>}
   */
  async function exportVoucher(billId) {
    uni.showLoading({ title: '导出中...' })
    
    try {
      await exportBillVoucher(billId)
      uni.hideLoading()
      uni.showToast({ title: '导出成功', icon: 'success' })
      return true
    } catch (e) {
      uni.hideLoading()
      uni.showToast({ title: '导出失败', icon: 'none' })
      return false
    }
  }

  /**
   * 刷新结算概览和授信信息
   */
  async function refreshSettlementData() {
    try {
      const [overview, credit] = await Promise.all([
        getSettlementOverview(),
        getCreditInfo()
      ])
      
      // 更新用户store中的授信信息
      userStore.updateCreditInfo({
        totalLimit: credit.totalLimit,
        usedLimit: credit.usedLimit,
        score: credit.score
      })
      
      return { overview, credit }
    } catch (e) {
      console.error('刷新结算数据失败:', e)
      return null
    }
  }

  /**
   * 仅刷新授信额度信息
   */
  async function refreshCreditInfo() {
    try {
      const credit = await getCreditInfo()
      userStore.updateCreditInfo({
        totalLimit: credit.totalLimit,
        usedLimit: credit.usedLimit,
        score: credit.score
      })
    } catch (e) {
      console.error('刷新授信信息失败:', e)
    }
  }

  /**
   * 格式化账单金额显示
   * @param {number} amount - 单位：分
   * @returns {string}
   */
  function formatBillAmount(amount) {
    return formatMoney(amount)
  }

  /**
   * 格式化月份显示
   * @param {number} year
   * @param {number} month
   * @returns {string}
   */
  function formatBillMonth(year, month) {
    return formatMonth(year, month)
  }

  /**
   * 判断账单是否逾期
   * @param {Object} bill - 账单对象
   * @returns {boolean}
   */
  function isOverdue(bill) {
    return bill.status === 3
  }

  /**
   * 获取账单剩余天数（距离截止日）
   * @param {string} dueDate - 截止日期
   * @returns {number} 正数=剩余天数 负数=逾期天数
   */
  function getRemainingDays(dueDate) {
    if (!dueDate) return 0
    const due = new Date(dueDate)
    const now = new Date()
    const diff = Math.ceil((due - now) / (24 * 60 * 60 * 1000))
    return diff
  }

  return {
    loading,
    fetchBillList,
    fetchBillDetail,
    settleBill,
    exportVoucher,
    refreshSettlementData,
    refreshCreditInfo,
    formatBillAmount,
    formatBillMonth,
    isOverdue,
    getRemainingDays
  }
}
