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

