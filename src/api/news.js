/**
 * 新闻/公告/产品手册相关接口
 *
 * 后端映射：
 *   Module: System
 *   - Mini.AnnouncementController → GetList / GetDetail
 *
 * ⚠️ 参数由页面层构建 PascalCase 实体，API 层直接透传
 */

import { dispatch } from './base.js'

export const ANNOUNCEMENT_TYPE = Object.freeze({
  POLICY: 1,
  NEWS: 2,
  NEW_PRODUCT: 3,
  SETTLEMENT: 4,
})

const TYPE_ALIAS = Object.freeze({
  policy: ANNOUNCEMENT_TYPE.POLICY,
  product: ANNOUNCEMENT_TYPE.NEWS,
  news: ANNOUNCEMENT_TYPE.NEWS,
  new: ANNOUNCEMENT_TYPE.NEW_PRODUCT,
  settlement: ANNOUNCEMENT_TYPE.SETTLEMENT,
})

const TYPE_LABEL = Object.freeze({
  [ANNOUNCEMENT_TYPE.POLICY]: '政策公告',
  [ANNOUNCEMENT_TYPE.NEWS]: '产品新闻',
  [ANNOUNCEMENT_TYPE.NEW_PRODUCT]: '新品上新',
  [ANNOUNCEMENT_TYPE.SETTLEMENT]: '结算通知',
})

function normalizeType(type) {
  if (type === undefined || type === null || type === '' || type === 'all') return null
  return typeof type === 'string' ? (TYPE_ALIAS[type] ?? Number(type)) : Number(type)
}

function normalizeAnnouncement(item) {
  const type = Number(item?.type || 0)
  const publishTime = item?.publishTime || ''
  return {
    ...item,
    id: item?.announcementId,
    typeCode: type,
    type: TYPE_LABEL[type] || '系统公告',
    date: publishTime ? String(publishTime).slice(0, 10) : '',
    isManual: false,
  }
}

// ==================== 新闻/公告接口 ====================

/**
 * 获取新闻/公告列表（分页）
 * @param {Object} params - 后端实体参数（PascalCase）
 * @param {string} [params.Type] - 类型筛选：all/product/new/policy/manual
 * @param {number} [params.PageNum] - 页码
 * @param {number} [params.PageSize] - 每页条数
 * @returns {Promise<{ total, items }>}
 */
export function getNewsList(params) {
  const source = params || {}
  return dispatch('System', 'Mini.AnnouncementController', 'GetList', {
    pageNum: source.pageNum ?? source.PageNum ?? source.page ?? 1,
    pageSize: source.pageSize ?? source.PageSize ?? 20,
    type: normalizeType(source.type ?? source.Type),
    languageCode: source.languageCode ?? source.LanguageCode ?? 'zh-CN',
  }).then(result => ({
    ...result,
    items: Array.isArray(result?.items) ? result.items.map(normalizeAnnouncement) : [],
  }))
}

/**
 * 获取新闻详情
 * @param {number} newsId - 新闻ID
 * @returns {Promise<Object>} 新闻详情
 */
export function getNewsDetail(newsId, languageCode = 'zh-CN') {
  return dispatch('System', 'Mini.AnnouncementController', 'GetDetail', {
    announcementId: newsId,
    languageCode,
  }).then(item => (item ? normalizeAnnouncement(item) : item))
}

// ==================== 产品手册接口 ====================

/**
 * 获取产品手册列表
 * @param {Object} params - 后端实体参数（PascalCase）
 * @returns {Promise<{ total, items }>}
 */
export function getManualList(params) {
  return Promise.reject(new Error('产品手册接口尚未实现'))
}

/**
 * 获取产品电子手册下载链接
 * @param {number} manualId - 手册ID
 * @returns {Promise<string>} 下载URL
 */
export function getManualDownloadUrl(manualId) {
  return Promise.reject(new Error('手册下载功能尚未实现'))
}
