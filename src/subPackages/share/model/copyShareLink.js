import { t } from '@/shared/i18n/index.js'

/** 只在显式操作后复制完整链接，过期入口不复制、不记录或持久化。 */
export function copyShareLink(entry) {
  if (!entry?.url || (entry.expiresAt && Date.now() >= Date.parse(entry.expiresAt))) return Promise.resolve(false)
  return new Promise(resolve => uni.setClipboardData({
    data: entry.url, showToast: false,
    success: () => { uni.showToast({ title: t('share.dealer.copied'), icon: 'none' }); resolve(true) },
    fail: () => { uni.showToast({ title: t('share.dealer.copyFailed'), icon: 'none' }); resolve(false) },
  }))
}
