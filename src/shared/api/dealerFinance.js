import { dispatch } from './dispatchClient.js'

function normalizeAccount(item = {}) {
  return {
    accountId: Number(item.accountId ?? item.AccountId ?? 0),
    accountCustomerId: Number(item.accountCustomerId ?? item.AccountCustomerId ?? 0),
    fundAccountCode: item.fundAccountCode ?? item.FundAccountCode ?? '',
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
      fundAccountCode: credit.fundAccountCode ?? credit.FundAccountCode ?? '',
      creditAccountId: Number(credit.creditAccountId ?? credit.CreditAccountId ?? 0),
      totalAmount: Number(credit.totalAmount ?? credit.TotalAmount ?? 0),
      reservedAmount: Number(credit.reservedAmount ?? credit.ReservedAmount ?? 0),
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

/**
 * 创建或复用微信 APP 充值意图。
 * 仅返回服务端签发的短期 SDK 调起数据；客户端支付回调不能作为余额到账依据。
 */
export async function createWeChatAppRecharge(params = {}) {
  const result = await dispatch('Finance', 'Mini.DealerFinanceController', 'CreateWeChatAppRecharge', {
    Amount: Number(params.amount || 0),
    ClientRequestId: params.clientRequestId,
    FundAccountCode: params.fundAccountCode || null,
  })
  return {
    rechargeNo: String(result?.rechargeNo ?? result?.RechargeNo ?? ''),
    status: Number(result?.status ?? result?.Status ?? 0),
    resultCertainty: Number(result?.resultCertainty ?? result?.ResultCertainty ?? 0),
    clientPayload: result?.clientPayload ?? result?.ClientPayload ?? null,
    expiresAtUtc: result?.expiresAtUtc ?? result?.ExpiresAtUtc ?? null,
    nextQueryAtUtc: result?.nextQueryAtUtc ?? result?.NextQueryAtUtc ?? null,
    failureCode: result?.failureCode ?? result?.FailureCode ?? null,
    failureMessage: result?.failureMessage ?? result?.FailureMessage ?? null,
  }
}

/**
 * 创建或复用统一 APP 充值意图。
 * 渠道由服务端白名单和配置决定，客户端只传渠道代码与业务幂等键。
 */
export async function createAppRecharge(params = {}) {
  const result = await dispatch('Finance', 'Mini.DealerFinanceController', 'CreateAppRecharge', {
    Channel: params.channel,
    Amount: Number(params.amount || 0),
    ClientRequestId: params.clientRequestId,
    FundAccountCode: params.fundAccountCode || null,
  })
  return {
    rechargeNo: String(result?.rechargeNo ?? result?.RechargeNo ?? ''),
    channel: String(result?.channel ?? result?.Channel ?? params.channel ?? ''),
    status: Number(result?.status ?? result?.Status ?? 0),
    resultCertainty: Number(result?.resultCertainty ?? result?.ResultCertainty ?? 0),
    clientPayload: result?.clientPayload ?? result?.ClientPayload ?? null,
    expiresAtUtc: result?.expiresAtUtc ?? result?.ExpiresAtUtc ?? null,
    nextQueryAtUtc: result?.nextQueryAtUtc ?? result?.NextQueryAtUtc ?? null,
    failureCode: result?.failureCode ?? result?.FailureCode ?? null,
    failureMessage: result?.failureMessage ?? result?.FailureMessage ?? null,
    codeUrl: result?.codeUrl ?? result?.CodeUrl ?? null,
  }
}

/** 创建或复用微信 Native 扫码充值意图；只返回二维码链接，不调用手机支付 SDK。 */
export async function createNativeRecharge(params = {}) {
  const result = await dispatch('Finance', 'Mini.DealerFinanceController', 'CreateNativeRecharge', {
    Amount: Number(params.amount || 0),
    ClientRequestId: params.clientRequestId,
    FundAccountCode: params.fundAccountCode || null,
  })
  return {
    rechargeNo: String(result?.rechargeNo ?? result?.RechargeNo ?? ''),
    channel: 'wechat_native',
    status: Number(result?.status ?? result?.Status ?? 0),
    resultCertainty: Number(result?.resultCertainty ?? result?.ResultCertainty ?? 0),
    clientPayload: result?.clientPayload ?? result?.ClientPayload ?? null,
    codeUrl: result?.codeUrl ?? result?.CodeUrl ?? null,
    expiresAtUtc: result?.expiresAtUtc ?? result?.ExpiresAtUtc ?? null,
    nextQueryAtUtc: result?.nextQueryAtUtc ?? result?.NextQueryAtUtc ?? null,
    failureCode: result?.failureCode ?? result?.FailureCode ?? null,
    failureMessage: result?.failureMessage ?? result?.FailureMessage ?? null,
  }
}

/** 只读查询当前登录经销商的本地充值结果；不预支付、不触发支付机构查单。 */
export async function getRechargeStatus(rechargeNo) {
  const result = await dispatch('Finance', 'Mini.DealerFinanceController', 'GetRechargeStatus', {
    RechargeNo: String(rechargeNo || ''),
  })
  return {
    rechargeNo: String(result?.rechargeNo ?? result?.RechargeNo ?? ''),
    status: Number(result?.status ?? result?.Status ?? 0),
    amount: Number(result?.amount ?? result?.Amount ?? 0),
    completedAtUtc: result?.completedAtUtc ?? result?.CompletedAtUtc ?? null,
    failureCode: result?.failureCode ?? result?.FailureCode ?? null,
  }
}

export function confirmDealerOrderPayment(params = {}) {
  return dispatch('Finance', 'Mini.DealerFinanceController', 'ConfirmOrderPayment', {
    OrderId: Number(params.orderId || 0),
    ClientRequestId: params.clientRequestId,
    PaymentMode: Number(params.paymentMode || 0),
    FundAccountCode: params.fundAccountCode ?? params.FundAccountCode ?? null,
    Allocations: (params.allocations || []).map(item => ({
      PayMethod: item.payMethod,
      AccountCustomerId: item.payMethod === 'balance'
        ? Number(item.accountCustomerId)
        : null,
      Amount: Number(item.amount || 0),
    })),
  })
}

export function repayDealerCreditFromBalance(params = {}) {
  return dispatch('Finance', 'Mini.DealerFinanceController', 'RepayCreditFromBalance', {
    AccountCustomerId: Number(params.accountCustomerId || 0),
    Amount: Number(params.amount || 0),
    ClientRequestId: params.clientRequestId,
  })
}
