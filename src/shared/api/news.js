/**
 * 新闻资讯接口。
 *
 * APP 只调用我们的 ThirdParty/Mini.NewsController，
 * 不直接访问第三方域名，也不感知第三方字段结构。
 */
import { dispatch } from './dispatchClient.js'

export const ANNOUNCEMENT_TYPE = Object.freeze({
  POLICY: 1,
  NEWS: 2,
  NEW_PRODUCT: 3,
  SETTLEMENT: 4,
})

function normalizeDate(value) {
  return value ? String(value).slice(0, 10) : ''
}

/** 补全第三方返回的协议相对地址和站内相对地址。 */
function normalizeRemoteUrl(value, baseUrl = '') {
  const url = String(value || '').trim()
  if (!url || /^(https?:|data:|blob:)/i.test(url)) return url
  if (url.startsWith('//')) return `https:${url}`

  const origin = String(baseUrl || '').match(/^(https?:\/\/[^/]+)/i)?.[1] || ''
  if (!origin) return url
  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`
}

function normalizeArticle(item) {
  const id = item?.id ?? item?.cid ?? item?.articleId ?? item?.announcementId ?? ''
  const articleUrl = normalizeRemoteUrl(item?.articleUrl || item?.url || '')
  const categoryId = item?.categoryId ?? item?.typeCode ?? ''
  const categoryTitle = item?.categoryTitle || item?.type || '品牌资讯'
  const summary = item?.summary || item?.description || item?.desc || ''
  const coverUrl = normalizeRemoteUrl(
    item?.coverUrl || item?.imageUrl || item?.cover || item?.image || '',
    articleUrl,
  )
  const publishedAt = item?.publishedAt || item?.publishTime || item?.date || ''
  return {
    ...item,
    id: String(id),
    categoryId: String(categoryId),
    categoryTitle,
    title: item?.title || '',
    summary,
    content: item?.content || '',
    publishedAt,
    desc: summary,
    type: categoryTitle,
    typeCode: categoryId,
    date: normalizeDate(publishedAt),
    coverUrl,
    imageUrl: coverUrl,
    articleUrl,
    isManual: false,
  }
}

function normalizeCategory(category) {
  return {
    ...category,
    id: String(category?.id ?? category?.cid ?? ''),
    label: category?.title || category?.name || '未命名分类',
    children: Array.isArray(category?.children)
      ? category.children.map(normalizeCategory)
      : [],
  }
}

/** 获取新闻分类树 */
export function getNewsCategories(languageCode = 'zh-cn') {
  return dispatch('ThirdParty', 'Mini.NewsController', 'GetCategories', {
    languageCode,
  }).then(result => {
    const root = result?.root ? normalizeCategory(result.root) : null
    const categories = Array.isArray(result?.categories) && result.categories.length
      ? result.categories.map(normalizeCategory)
      : (root?.children || [])
    return { root, categories }
  })
}

/** 获取新闻列表 */
export function getNewsList(params = {}) {
  const source = params || {}
  const categoryId = source.categoryId ?? source.category_id ?? null
  return dispatch('ThirdParty', 'Mini.NewsController', 'GetArticles', {
    categoryId: categoryId || undefined,
    page: Math.max(Number(source.pageNum ?? source.page ?? 1), 1),
    perPage: Math.min(Math.max(Number(source.pageSize ?? source.perPage ?? 20), 1), 100),
    languageCode: source.languageCode ?? source.lang ?? 'zh-cn',
  }).then(result => ({
    ...result,
    items: Array.isArray(result?.items) ? result.items.map(normalizeArticle) : [],
  }))
}

/** 获取新闻详情 */
export function getNewsDetail(articleId, languageCode = 'zh-cn') {
  if (articleId === undefined || articleId === null || String(articleId).trim() === '') {
    return Promise.reject(new Error('新闻编号不能为空'))
  }

  return dispatch('ThirdParty', 'Mini.NewsController', 'GetDetail', {
    articleId: String(articleId),
    languageCode,
  }).then(item => (item ? normalizeArticle(item) : item))
}
