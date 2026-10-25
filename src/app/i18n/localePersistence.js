import storage from '@/shared/utils/storage.js'
import { LANGUAGE_KEY } from '@/shared/session/sessionKeys.js'
import { getLocale, normalizeLocale, setLocale } from '@/shared/i18n/index.js'

/** 迁移旧语言键；主键一旦存在即优先，存储不可用仍可中文启动。 */
export function initializeAppLocale() {
  let legacy = ''
  try {
    legacy = uni.getStorageSync('app_language')
  } catch {}
  const value = normalizeLocale(storage.get(LANGUAGE_KEY, legacy || 'zh-CN'))
  storage.set(LANGUAGE_KEY, value)
  setLocale(value)
  if (storage.get(LANGUAGE_KEY) === value) {
    try { uni.removeStorageSync('app_language') } catch {}
  }
  return value
}

/** 只持久化本机选择并更新响应式语言，不重建页面、不请求或重试任何业务接口。 */
export function setAppLocale(value) {
  const normalized = normalizeLocale(value)
  storage.set(LANGUAGE_KEY, normalized)
  setLocale(normalized)
  return getLocale()
}
