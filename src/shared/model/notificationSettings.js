import storage from '../utils/storage.js'

export const NOTIFICATION_SETTINGS_KEY = 'notificationSettings'

export const DEFAULT_NOTIFICATION_SETTINGS = Object.freeze({
  enabled: true,
  order: true,
  audit: true,
  bill: true,
  afterSale: true,
  announcement: true,
  sound: true,
  vibration: true,
})

export function getNotificationSettings() {
  const saved = storage.get(NOTIFICATION_SETTINGS_KEY, {})
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) }
}

export function saveNotificationSettings(settings = {}) {
  const next = { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings }
  storage.set(NOTIFICATION_SETTINGS_KEY, next)
  return next
}

export function updateNotificationSetting(key, value) {
  return saveNotificationSettings({ ...getNotificationSettings(), [key]: Boolean(value) })
}
