import { isAppError } from '@/shared/api/appError.js'
import { t } from '@/shared/i18n/index.js'

/** 保留后端公开错误提示；本地异常不泄露技术细节，也不误报为网络失败。 */
export function dealerShareErrorMessage(error, fallbackKey = 'share.dealer.pullToRetry') {
  if (isAppError(error)) return error.message
  return t(fallbackKey)
}
