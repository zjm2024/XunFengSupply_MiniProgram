/**
 * 经销商财务只读接口：充值记录、月度账单与账单明细。
 * 金额字段统一使用“元”，禁止再做 / 100 换算。
 */
import { dispatch } from '../../../shared/api/dispatchClient.js'
import {
  getDealerFinanceContext,
  repayDealerCreditFromBalance,
} from '../../../shared/api/dealerFinance.js'

const FINANCE_CONTROLLER = 'Mini.DealerStatementController'

function pick(source, camelKey, pascalKey, fallback = undefined) {
  return source?.[camelKey] ?? source?.[pascalKey] ?? fallback
}

function numberOf(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function normalizeRechargeRecord(source = {}) {
  return {
    rechargeId: numberOf(pick(source, 'rechargeId', 'RechargeId', 0)),
    rechargeNo: String(pick(source, 'rechargeNo', 'RechargeNo', '') || ''),
    accountId: numberOf(pick(source, 'accountId', 'AccountId', 0)),
    amount: numberOf(pick(source, 'amount', 'Amount', 0)),
    payMethod: String(pick(source, 'payMethod', 'PayMethod', '') || ''),
    transactionId: String(pick(source, 'transactionId', 'TransactionId', '') || ''),
    status: numberOf(pick(source, 'status', 'Status', 0)),
    resultCertainty: numberOf(pick(source, 'resultCertainty', 'ResultCertainty', 0)),
    voucherUrl: String(pick(source, 'voucherUrl', 'VoucherUrl', '') || ''),
    auditedAt: pick(source, 'auditedAt', 'AuditedAt', null),
    completedAt: pick(source, 'completedAt', 'CompletedAt', null),
    createdAt: pick(source, 'createdAt', 'CreatedAt', null),
  }
}

export function normalizeBill(source = {}) {
  return {
    billId: numberOf(pick(source, 'billId', 'BillId', 0)),
    billNo: String(pick(source, 'billNo', 'BillNo', '') || ''),
    billPeriod: String(pick(source, 'billPeriod', 'BillPeriod', '') || ''),
    totalAmount: numberOf(pick(source, 'totalAmount', 'TotalAmount', 0)),
    paidAmount: numberOf(pick(source, 'paidAmount', 'PaidAmount', 0)),
    outstandingAmount: numberOf(pick(source, 'outstandingAmount', 'OutstandingAmount', 0)),
    status: numberOf(pick(source, 'status', 'Status', 0)),
    generatedAt: pick(source, 'generatedAt', 'GeneratedAt', null),
    settledAt: pick(source, 'settledAt', 'SettledAt', null),
    closedAt: pick(source, 'closedAt', 'ClosedAt', null),
    createdAt: pick(source, 'createdAt', 'CreatedAt', null),
  }
}

export function normalizeBillItem(source = {}) {
  return {
    billItemId: numberOf(pick(source, 'billItemId', 'BillItemId', 0)),
    businessType: String(pick(source, 'businessType', 'BusinessType', '') || ''),
    businessNo: String(pick(source, 'businessNo', 'BusinessNo', '') || ''),
    orderId: numberOf(pick(source, 'orderId', 'OrderId', 0)),
    amount: numberOf(pick(source, 'amount', 'Amount', 0)),
    createdAt: pick(source, 'createdAt', 'CreatedAt', null),
  }
}

export function normalizeFundFlow(source = {}) {
  return {
    transactionId: numberOf(pick(source, 'transactionId', 'TransactionId', 0)),
    transactionNo: String(pick(source, 'transactionNo', 'TransactionNo', '') || ''),
    accountId: numberOf(pick(source, 'accountId', 'AccountId', 0)),
    customerId: numberOf(pick(source, 'customerId', 'CustomerId', 0)),
    businessType: String(pick(source, 'businessType', 'BusinessType', '') || ''),
    businessNo: String(pick(source, 'businessNo', 'BusinessNo', '') || ''),
    balanceDelta: numberOf(pick(source, 'balanceDelta', 'BalanceDelta', 0)),
    frozenDelta: numberOf(pick(source, 'frozenDelta', 'FrozenDelta', 0)),
    balanceAfter: numberOf(pick(source, 'balanceAfter', 'BalanceAfter', 0)),
    frozenAfter: numberOf(pick(source, 'frozenAfter', 'FrozenAfter', 0)),
    remark: String(pick(source, 'remark', 'Remark', '') || ''),
    createdAt: pick(source, 'createdAt', 'CreatedAt', null),
  }
}

function normalizePaged(result, mapper) {
  const rawItems = pick(result, 'items', 'Items', [])
  return {
    items: (Array.isArray(rawItems) ? rawItems : []).map(mapper),
    totalCount: numberOf(pick(result, 'totalCount', 'TotalCount', 0)),
    pageNum: numberOf(pick(result, 'pageNum', 'PageNum', 1)) || 1,
    pageSize: numberOf(pick(result, 'pageSize', 'PageSize', 20)) || 20,
    totalPages: numberOf(pick(result, 'totalPages', 'TotalPages', 0)),
  }
}

export async function getRechargeList(params = {}) {
  const result = await dispatch('Finance', FINANCE_CONTROLLER, 'GetRechargeList', {
    PageNum: numberOf(params.pageNum || params.page || 1) || 1,
    PageSize: numberOf(params.pageSize || 20) || 20,
    ...(params.status === undefined || params.status === null || params.status === ''
      ? {}
      : { Status: numberOf(params.status) }),
    ...(params.accountId ? { AccountId: numberOf(params.accountId) } : {}),
    ...(params.payMethod ? { PayMethod: params.payMethod } : {}),
  })
  return normalizePaged(result, normalizeRechargeRecord)
}

export async function getBillList(params = {}) {
  const result = await dispatch('Finance', FINANCE_CONTROLLER, 'GetBillList', {
    PageNum: numberOf(params.pageNum || params.page || 1) || 1,
    PageSize: numberOf(params.pageSize || 20) || 20,
    ...(params.billPeriod ? { BillPeriod: params.billPeriod } : {}),
    ...(params.status === undefined || params.status === null || params.status === ''
      ? {}
      : { Status: numberOf(params.status) }),
  })
  return normalizePaged(result, normalizeBill)
}

export async function getBillDetail(billId) {
  const result = await dispatch('Finance', FINANCE_CONTROLLER, 'GetBillDetail', {
    BillId: numberOf(billId),
  })
  const bill = normalizeBill(result || {})
  const rawItems = pick(result, 'items', 'Items', [])
  return {
    ...bill,
    items: (Array.isArray(rawItems) ? rawItems : []).map(normalizeBillItem),
  }
}

export async function getFundFlowList(params = {}) {
  const result = await dispatch('Finance', FINANCE_CONTROLLER, 'GetFundFlowList', {
    PageNum: numberOf(params.pageNum || params.page || 1) || 1,
    PageSize: numberOf(params.pageSize || 20) || 20,
    ...(params.businessType ? { BusinessType: params.businessType } : {}),
    ...(params.businessNo ? { BusinessNo: params.businessNo } : {}),
    ...(params.startTime ? { StartTime: params.startTime } : {}),
    ...(params.endTime ? { EndTime: params.endTime } : {}),
  })
  return normalizePaged(result, normalizeFundFlow)
}

export function applyInvoice(params) {
  return dispatch('MallOrder', 'Mini.InvoiceController', 'ApplyInvoice', params)
}

function unavailable(feature) {
  return Promise.reject(new Error(`${feature}尚未开放，请联系财务人员`))
}

export function payBill(_billId, params = {}) {
  return repayDealerCreditFromBalance({
    accountCustomerId: params.accountCustomerId,
    amount: params.amount,
    clientRequestId: params.clientRequestId,
  })
}
export function repayCredit(params = {}) { return repayDealerCreditFromBalance(params) }
export function exportBillVoucher() { return unavailable('账单导出') }
export function getBillDownloadUrl() { return unavailable('账单下载') }
export async function getSettlementOverview() {
  const [finance, bills] = await Promise.all([
    getDealerFinanceContext(),
    getBillList({ pageNum: 1, pageSize: 100, status: 0 }),
  ])
  return {
    totalOutstanding: bills.items.reduce((sum, item) => sum + item.outstandingAmount, 0),
    unpaidBillCount: bills.totalCount,
    subjectAvailableBalance: finance.subjectAvailableBalance,
  }
}
export function getCreditInfo() { return getDealerFinanceContext().then(result => result.credit) }
