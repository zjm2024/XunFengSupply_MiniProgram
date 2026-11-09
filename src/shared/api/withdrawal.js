import { dispatch } from '@/shared/api/dispatchClient.js'

const controller = 'Mini.WithdrawalController'
const send = (method, params = {}) => dispatch('Finance', controller, method, params)
const pick = (row, key) => row?.[key] ?? row?.[key[0].toUpperCase() + key.slice(1)]
const text = (row, key) => String(pick(row, key) ?? '')
const page = ({ pageNum, pageSize = 20 }) => ({ PageNum: pageNum, PageSize: pageSize })
const paged = (result, normalize) => ({
  items: (pick(result, 'items') || []).map(normalize),
  totalCount: Number(pick(result, 'totalCount') || 0),
})

/** 读取本人银行卡，只接收尾号。 */
export async function getBankCards(params) {
  return paged(await send('GetBankCards', page(params)), row => ({
    bankCardId: text(row, 'bankCardId'), bankName: text(row, 'bankName'),
    accountHolder: text(row, 'accountHolder'), accountLast4: text(row, 'accountLast4'),
  }))
}

/** 仅保存本经销商银行卡，空卡号更新时保留原卡号。 */
export function saveBankCard(card) {
  return send('SaveBankCard', { BankCardId: card.bankCardId || undefined, BankName: card.bankName,
    AccountHolder: card.accountHolder, BankAccount: card.bankAccount || undefined })
}

/** 删除本人卡片资料，已有申请沿用原快照。 */
export function deleteBankCard(bankCardId) {
  return send('DeleteBankCard', { BankCardId: bankCardId })
}

/** 查询服务端可提现的本金账户。 */
export async function getWithdrawalAccounts() {
  return (await send('GetAccounts')).map(row => ({
    accountId: text(row, 'accountId'), accountName: text(row, 'accountName'),
    availableCash: Number(pick(row, 'availableCash')),
  }))
}

/** 同一笔表单重试保留客户端请求键，身份从登录会话读取。 */
export function applyWithdrawal(form, clientRequestId) {
  return send('ApplyWithdrawal', { AccountId: form.accountId, BankCardId: form.bankCardId,
    Amount: form.amount, ClientRequestId: clientRequestId })
}

/** 分页读取经销商本人的提现申请。 */
export async function getWithdrawalList(params) {
  return paged(await send('GetWithdrawalList', page(params)), row => ({
    withdrawalId: text(row, 'withdrawalId'), withdrawalNo: text(row, 'withdrawalNo'),
    accountName: text(row, 'accountName'), bankName: text(row, 'bankName'),
    accountLast4: text(row, 'accountLast4'), auditRemark: text(row, 'auditRemark'),
    createdAt: text(row, 'createdAt'), amount: Number(pick(row, 'amount')),
    status: Number(pick(row, 'status')), hasReceipt: Boolean(pick(row, 'hasReceipt')),
  }))
}

/** 凭证通过登录会话按申请归属读取，不生成公共链接。 */
export async function getWithdrawalReceipt(withdrawalId) {
  const result = await send('GetWithdrawalReceipt', { WithdrawalId: withdrawalId })
  return text(result, 'receiptBase64')
}
