import { dispatch } from './dispatchClient.js'
const call = (method, params = {}, options = {}) => dispatch('MallDealer', 'Mini.NotificationController', method, params, { authStrategy: 'passive', ...options })
export const getNotificationPreferences = () => call('GetPreferences')
export const saveNotificationPreferences = (settings) => call('SavePreferences', Object.fromEntries(Object.entries(settings).map(([key,value]) => [key[0].toUpperCase()+key.slice(1), Boolean(value)])))
export const bindPushDevice = (request) => call('BindPushDevice', { InstallationId: request.installationId, PushClientId: request.pushClientId, Platform: request.platform, PermissionGranted: request.permissionGranted })
export const unbindPushDevice = (request, token) => call('UnbindPushDevice', { InstallationId: request.installationId, BindingVersion: request.bindingVersion }, { timeout: 1500, header: token ? { Authorization: 'Bearer '+token } : {} })

/** A click receipt is separate from station read state and must not block navigation. */
export const trackNotificationClick = (request) => call('TrackClick', { MessageId: String(request.messageId), InstallationId: request.installationId, BindingVersion: request.bindingVersion }, { timeout: 5000 })
