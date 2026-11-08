/** Content package facade; shared lifecycle and pages use the same normalized contract. */
export { getMessageList, getMessageDetail, getUnreadCount, getUnreadSummary, markAsRead, markAllAsRead, normalizeMessage } from '../../../shared/api/messageApi.js'
