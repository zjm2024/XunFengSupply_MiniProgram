import { t } from '@/shared/i18n/index.js'
/** 只显示服务端已知不可用原因，不向用户暴露内部机器码。 */
export function dealerShareReason(codes = []) {
  const known = ['NO_PERMISSION', 'FEATURE_DISABLED', 'PLATFORM_UNAVAILABLE', 'NO_RETAIL_PRICE', 'DAILY_LIMIT_REACHED']
  return t('share.dealer.reasons.' + (known.includes(codes[0]) ? codes[0] : 'UNAVAILABLE'))
}
