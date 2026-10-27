/** 按实测宽度分配单行操作；不足时优先保留高优先级动作，完整动作留在菜单。 */
export function fitActionRow(actions, availableWidth, widths = [], moreWidth = 60, gap = 8) {
  if (!actions.length) return { visible: [], overflow: [] }
  const sizes = actions.map((_, index) => Math.max(112, widths[index] || 112))
  if (sizes.reduce((sum, size) => sum + size, 0) + gap * (actions.length - 1) <= availableWidth) {
    return { visible: actions, overflow: [] }
  }
  let remaining = Math.max(0, availableWidth - moreWidth - gap)
  const chosen = new Set()
  const ranked = actions.map((action, index) => ({ action, index }))
    .sort((a, b) => (a.action.priority ?? 5) - (b.action.priority ?? 5) || a.index - b.index)
  for (const { index } of ranked) {
    if (sizes[index] <= remaining) {
      chosen.add(index)
      remaining -= sizes[index] + gap
    }
  }
  // 极窄屏也保留一个主要动作，其文字可在按钮内部换行。
  if (!chosen.size) chosen.add(ranked[0].index)
  return { visible: actions.filter((_, index) => chosen.has(index)), overflow: actions.filter((_, index) => !chosen.has(index)) }
}
