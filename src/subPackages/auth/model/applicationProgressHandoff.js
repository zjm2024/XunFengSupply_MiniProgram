let pendingDetail = null

/** 仅为查询页到现有详情的一次导航传递结果，不记录本机/当前账号申请状态。 */
export function setApplicationProgressDetail(detail) { pendingDetail = { ...detail } }

/** 详情读取后立即清空；刷新页面或重启后必须从查询入口重新验证。 */
export function takeApplicationProgressDetail() {
  const detail = pendingDetail
  pendingDetail = null
  return detail
}

/** 导航失败时丢弃尚未交付的查询结果，避免后续入口取到旧结果。 */
export function clearApplicationProgressDetail() { pendingDetail = null }
