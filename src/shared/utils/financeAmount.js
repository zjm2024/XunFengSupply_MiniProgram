/** 资金接口以元返回金额，保留两位小数及分组显示。 */
export function formatFinanceAmount(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const amount = Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return '¥' + amount
}
