/** 按数量均衡分行；最后一行由Flex平铺剩余宽度。 */
export function quickEntryColumns(count, maxColumns = 4) {
  const total = Math.max(1, Math.floor(Number(count) || 0))
  const limit = Math.max(1, Math.floor(Number(maxColumns) || 4))
  return Math.ceil(total / Math.ceil(total / limit))
}
