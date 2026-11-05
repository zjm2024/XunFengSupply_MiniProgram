import { dispatch } from '@/shared/api/dispatchClient.js'

const controller = 'Mini.InvoiceController'
const pick = (source, key) => source?.[key] ?? source?.[key[0].toUpperCase() + key.slice(1)]

/** 统一发票响应并保留Int64标识为字符串。 */
export function normalizeInvoice(source = {}) {
  return {
    invoiceId: String(pick(source, 'invoiceId') ?? ''),
    invoiceNo: String(pick(source, 'invoiceNo') ?? ''),
    invoiceType: String(pick(source, 'invoiceType') ?? ''),
    title: String(pick(source, 'title') ?? ''),
    taxNo: String(pick(source, 'taxNo') ?? ''),
    amount: Number(pick(source, 'amount') ?? 0),
    status: Number(pick(source, 'status') ?? 0),
    fileUrl: String(pick(source, 'fileUrl') ?? ''),
    auditRemark: String(pick(source, 'auditRemark') ?? ''),
    createdAt: pick(source, 'createdAt') ?? null,
  }
}

/** 从服务端读取本经销商常用抬头，换设备也使用同一份资料。 */
export async function getInvoiceTitle() {
  const result = await dispatch('Finance', controller, 'GetInvoiceTitle', {})
  return result ? { invoiceTitleId: String(pick(result, 'invoiceTitleId') || ''), isDefault: Boolean(pick(result, 'isDefault')), title: String(pick(result, 'title') || ''), taxNo: String(pick(result, 'taxNo') || '') } : null
}

/** 常用抬头保存到专表，不向服务端传入主体标识。 */
export function saveInvoiceTitle(params) {
  return dispatch('Finance', controller, 'SaveInvoiceTitle', { ...(params.isDefault ? { IsDefault: true } : {}), ...(params.invoiceTitleId ? { InvoiceTitleId: params.invoiceTitleId } : {}), Title: params.title.trim(), TaxNo: params.taxNo?.trim() || null })
}

/** 读取本人真实金额汇总，缺失金额拒绝伪装成零余额。 */
export async function getInvoiceSummary() {
  const result = await dispatch('Finance', controller, 'GetInvoiceSummary', {})
  const summary = {}
  for (const key of ['orderAmount', 'pendingAmount', 'issuedAmount', 'availableAmount']) {
    const value = pick(result, key)
    if (value == null || !Number.isFinite(Number(value))) throw new Error('Invoice amount response is invalid')
    summary[key] = Number(value)
  }
  return summary
}

/** 申请按元提交，不接收主体ID，重试复用请求标识。 */
export function applyInvoice(params) {
  return dispatch('Finance', controller, 'ApplyInvoice', {
    Title: params.title.trim(), TaxNo: params.taxNo?.trim() || null,
    Amount: Number(params.amount), ClientRequestId: params.clientRequestId,
  })
}

/** 分页读取登录经销商的申请及PDF。 */
export async function getInvoiceList(params = {}) {
  const result = await dispatch('Finance', controller, 'GetInvoiceList', {
    PageNum: params.pageNum || 1, PageSize: params.pageSize || 20,
    ...(params.status == null ? {} : { Status: params.status }),
  })
  return { items: (pick(result, 'items') || []).map(normalizeInvoice), totalCount: Number(pick(result, 'totalCount') || 0) }
}

/** 预览前重新查询归属并获取后端文件地址，路由中不放PDF地址。 */
export async function getInvoiceDetail(invoiceId) {
  return normalizeInvoice(await dispatch('Finance', controller, 'GetInvoiceDetail', { InvoiceId: invoiceId }))
}

/** 创建跨平台UUID请求键，不用于身份或安全令牌。 */
export function createInvoiceRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.floor(Math.random() * 16)
    return (char === 'x' ? value : (value & 3) | 8).toString(16)
  })
}

/** 分页读取本人抬头，保留Int64标识并隔离调用者伪造的主体参数。 */
export async function getInvoiceTitles(params = {}) {
  const result = await dispatch('Finance', controller, 'GetInvoiceTitles', { PageNum: params.pageNum || 1, PageSize: params.pageSize || 20 })
  return { items: (pick(result, 'items') || []).map(item => ({ invoiceTitleId: String(pick(item, 'invoiceTitleId')), isDefault: Boolean(pick(item, 'isDefault')), title: String(pick(item, 'title') || ''), taxNo: String(pick(item, 'taxNo') || '') })), totalCount: Number(pick(result, 'totalCount') || 0) }
}

/** 删除本人抬头，服务端重新校验标识归属。 */
export function deleteInvoiceTitle(invoiceTitleId) {
  return dispatch('Finance', controller, 'DeleteInvoiceTitle', { InvoiceTitleId: invoiceTitleId })
}
