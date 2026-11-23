/**
 * Keep the native pull-to-refresh indicator visible long enough to complete
 * one visual cycle, even when the API responds immediately.
 */
export function waitForRefreshAnimation(startedAt, minimumDuration = 560) {
  const elapsed = Date.now() - startedAt
  const remaining = Math.max(0, minimumDuration - elapsed)
  if (!remaining) return Promise.resolve()
  return new Promise(resolve => setTimeout(resolve, remaining))
}


/** 全部下一页请求共用的最短反馈时间；不等同于图标动画周期。 */
export const PAGINATION_FEEDBACK_MIN_MS = 400

/**
 * 等待原请求和最短分页反馈，再把成功结果或原异常交还调用方。
 * 首屏/刷新传false，不增加等待；调用方必须在返回后复核原请求身份再提交状态。
 */
export async function waitForPaginationResult(request, append = true) {
  const startedAt = Date.now()
  try { return await request }
  finally { if (append) await waitForRefreshAnimation(startedAt, PAGINATION_FEEDBACK_MIN_MS) }
}
