import { dispatch } from './dispatchClient.js'

function normalizeAccount(item = {}) {
  return {
    accountId: Number(item.accountId ?? item.AccountId ?? 0),
    accountCustomerId: Number(item.accountCustomerId ?? item.AccountCustomerId ?? 0),
    username: item.username ?? item.Username ?? '',
    realName: item.realName ?? item.RealName ?? '',
    isMaster: Boolean(item.isMaster ?? item.IsMaster),
    accountStatus: Number(item.accountStatus ?? item.AccountStatus ?? 0),
    financeStatus: Number(item.financeStatus ?? item.FinanceStatus ?? 0),
    balance: Number(item.balance ?? item.Balance ?? 0),
    frozenBalance: Number(item.frozenBalance ?? item.FrozenBalance ?? 0),
    availableBalance: Number(item.availableBalance ?? item.AvailableBalance ?? 0),
    canParticipateCombinationPay: Boolean(
      item.canParticipateCombinationPay ?? item.CanParticipateCombinationPay
    ),
  }
}

export function normalizeFinanceContext(result = {}) {
  const credit = result.credit ?? result.Credit ?? {}
  const rawAccounts = result.accounts ?? result.Accounts ?? []
  return {
    dealerId: Number(result.dealerId ?? result.DealerId ?? 0),
    subjectTotalBalance: Number(result.subjectTotalBalance ?? result.SubjectTotalBalance ?? 0),
    subjectFrozenBalance: Number(result.subjectFrozenBalance ?? result.SubjectFrozenBalance ?? 0),
    subjectAvailableBalance: Number(result.subjectAvailableBalance ?? result.SubjectAvailableBalance ?? 0),
    currentAccount: result.currentAccount || result.CurrentAccount
      ? normalizeAccount(result.currentAccount ?? result.CurrentAccount)
      : null,
    accounts: rawAccounts.map(normalizeAccount),
    credit: {
      creditAccountId: Number(credit.creditAccountId ?? credit.CreditAccountId ?? 0),
      totalAmount: Number(credit.totalAmount ?? credit.TotalAmount ?? 0),
      usedAmount: Number(credit.usedAmount ?? credit.UsedAmount ?? 0),
      frozenAmount: Number(credit.frozenAmount ?? credit.FrozenAmount ?? 0),
      availableAmount: Number(credit.availableAmount ?? credit.AvailableAmount ?? 0),
      status: Number(credit.status ?? credit.Status ?? 0),
      isFrozen: Boolean(credit.isFrozen ?? credit.IsFrozen)
        || Number(credit.status ?? credit.Status ?? 0) === 2,
    },
  }
}

export function getDealerFinanceContext() {
  return dispatch('Finance', 'Mini.DealerFinanceController', 'GetContext', {})
    .then(normalizeFinanceContext)
}

export function transferDealerBalance(params = {}) {
  return dispatch('Finance', 'Mini.DealerFinanceController', 'TransferBalance', {
    FromAccountCustomerId: params.fromAccountCustomerId,
    ToAccountCustomerId: params.toAccountCustomerId,
    Amount: Number(params.amount || 0),
    ClientRequestId: params.clientRequestId,
    Remark: params.remark || null,
  })
}

export function changeDealerFrozenBalance(params = {}) {
  return dispatch('Finance', 'Mini.DealerFinanceController', 'ChangeFrozenBalance', {
    AccountCustomerId: params.accountCustomerId,
    Amount: Number(params.amount || 0),
    Freeze: Boolean(params.freeze),
    ClientRequestId: params.clientRequestId,
    Remark: params.remark || null,
  })
}

export function confirmDealerOrderPayment(params = {}) {
  return dispatch('Finance', 'Mini.DealerFinanceController', 'ConfirmOrderPayment', {
    OrderId: Number(params.orderId || 0),
    ClientRequestId: params.clientRequestId,
    Allocations: (params.allocations || []).map(item => ({
      PayMethod: item.payMethod,
      AccountCustomerId: item.payMethod === 'balance'
        ? Number(item.accountCustomerId)
        : null,
      Amount: Number(item.amount || 0),
    })),
  })
}
