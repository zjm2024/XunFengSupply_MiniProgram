/**
 * 消息推送相关接口 - 系统消息通知
 *
 * 后端映射：
 *   Module: MallDealer
 *   - Mini.MessageController → GetMessages / MarkRead / MarkAllRead / GetUnreadCount
 *
 * ⚠️ 参数由页面层构建 PascalCase 实体，API 层直接透传
 */

import { dispatch } from './base.js'

// ==================== 消息列表接口 ====================

/**
 * 获取系统消息列表（分页）
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {number} [params.PageNum] - 页码
 * @param {number} [params.PageSize] - 每页条数
 * @param {number} [params.MsgType] - 消息类型筛选
 * @param {number} [params.IsRead] - 是否已读筛选：0未读、1已读
 * @returns {Promise<{ totalCount, items, pageNum, pageSize, totalPages }>}
 */
export function getMessageList(params) {
  const source = params || {}
  return dispatch('MallDealer', 'Mini.MessageController', 'GetMessages', {
    pageNum: source.pageNum ?? source.PageNum ?? source.page ?? 1,
    pageSize: source.pageSize ?? source.PageSize ?? 20,
    msgType: source.msgType ?? source.MsgType ?? source.type ?? source.Type ?? null,
    isRead: source.isRead ?? source.IsRead ?? null,
  })
}

/**
 * 获取消息未读数量
 * @returns {Promise<number>} 未读数量
 */
export function getUnreadCount() {
  return dispatch('MallDealer', 'Mini.MessageController', 'GetUnreadCount', {})
}

// ==================== 消息操作接口 ====================

/**
 * 标记消息为已读
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {number} params.MessageId - 消息ID
 * @returns {Promise<boolean>}
 */
export function markAsRead(params) {
  const messageId = typeof params === 'object'
    ? (params.messageId ?? params.MessageId)
    : params
  return dispatch('MallDealer', 'Mini.MessageController', 'MarkRead', { messageId })
}

/**
 * 一键全部标记已读
 * @returns {Promise<number>} 标记已读的消息数量
 */
export function markAllAsRead() {
  return dispatch('MallDealer', 'Mini.MessageController', 'MarkAllRead', {})
}

// 以下接口后端尚未实现，保留占位

/**
 * 获取消息详情
 * ⚠️ 后端未实现
 */
export function getMessageDetail(messageId) {
  return Promise.reject(new Error('消息详情功能尚未实现'))
}

/**
 * 删除消息
 * ⚠️ 后端未实现
 */
export function deleteMessage(messageId) {
  return Promise.reject(new Error('删除消息功能尚未实现'))
}

/**
 * 清空所有已读消息
 * ⚠️ 后端未实现
 */
export function clearReadMessages() {
  return Promise.reject(new Error('清空已读消息功能尚未实现'))
}
