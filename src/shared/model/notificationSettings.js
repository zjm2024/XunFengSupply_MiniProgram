import storage from '../utils/storage.js'
import { getNotificationPreferences, saveNotificationPreferences } from '../api/notificationApi.js'

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
  const accountId = String(storage.get('userId', ''))
  const saved = accountId ? storage.get(NOTIFICATION_SETTINGS_KEY + ':' + accountId, {}) : {}
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) }
}

export function saveNotificationSettings(settings = {}) {
  const next = { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings }
  const accountId = String(storage.get('userId', ''))
  if (accountId) storage.set(NOTIFICATION_SETTINGS_KEY + ':' + accountId, next)
  return next
}

export function updateNotificationSetting(key, value) {
  return saveNotificationSettings({ ...getNotificationSettings(), [key]: Boolean(value) })
}

/** Normalize either serializer casing while preserving server-owned boolean values. */
export function normalizeNotificationSettings(value = {}) {
  return Object.fromEntries(Object.entries(DEFAULT_NOTIFICATION_SETTINGS).map(([key, fallback]) => {
    const raw = value[key] ?? value[key[0].toUpperCase()+key.slice(1)]
    return [key, typeof raw === 'boolean' ? raw : fallback]
  }))
}
/** Ignore a response if the account changed during the request. */
export async function loadNotificationSettings() {
  const id = String(storage.get('userId', ''))
  const result = normalizeNotificationSettings(await getNotificationPreferences())
  if (id !== String(storage.get('userId', ''))) throw new Error('Session changed')
  return saveNotificationSettings(result)
}
/** Only persist after the service has accepted the update. */
export async function persistNotificationSettings(settings) {
  const id = String(storage.get('userId', ''))
  const result = normalizeNotificationSettings(await saveNotificationPreferences(settings))
  if (id !== String(storage.get('userId', ''))) throw new Error('Session changed')
  return saveNotificationSettings(result)
}
