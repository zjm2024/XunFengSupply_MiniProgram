/**
 * 产品手册接口。
 *
 * APP 只调用我们的 ThirdParty/Mini.ProductManualController，
 * 不直接访问第三方域名，也不感知第三方字段结构。
 */
import { dispatch } from './dispatchClient.js'

const MODULE = 'ThirdParty'
const CONTROLLER = 'Mini.ProductManualController'
const ROOT_CATEGORY_ID = 'd244l5QtSn'

function normalizeCategory(item) {
  return {
    ...item,
    id: String(item?.id ?? item?.cid ?? item?.categoryId ?? ''),
    title: item?.title || item?.name || '未命名分类',
    children: Array.isArray(item?.children) ? item.children.map(normalizeCategory) : [],
  }
}

function normalizeManual(item) {
  const files = Array.isArray(item?.files) ? item.files : []
  return {
    ...item,
    id: String(item?.id ?? item?.cid ?? ''),
    title: item?.title || '未命名手册',
    coverUrl: item?.coverUrl || item?.cover || '',
    fileUrl: item?.fileUrl || files[0]?.url || '',
    files,
    publishedAt: item?.publishedAt || '',
    date: item?.publishedAt ? String(item.publishedAt).slice(0, 10) : '',
  }
}

/** 获取产品手册分类树。 */
export function getManualCategories(languageCode = 'zh-cn') {
  return dispatch(MODULE, CONTROLLER, 'GetCategories', { languageCode }).then(result => {
    const root = result?.root ? normalizeCategory(result.root) : null
    const categories = Array.isArray(result?.categories)
      ? result.categories.map(normalizeCategory)
      : []
    // 供应商只有一个产品手册根节点时，children/categories 为空是正常响应。
    // 根节点仍保留给页面作为默认查询分类，子分类仅使用 root.children。
    return {
      ...result,
      root,
      categories,
    }
  })
}

/** 获取产品手册分页列表，未指定分类时默认查询全部手册。 */
export function getManualList(params = {}) {
  const source = params || {}
  return dispatch(MODULE, CONTROLLER, 'GetArticles', {
    categoryId: source.categoryId || ROOT_CATEGORY_ID,
    page: Math.max(Number(source.pageNum ?? source.page ?? 1), 1),
    perPage: Math.min(Math.max(Number(source.pageSize ?? source.perPage ?? 10), 1), 100),
    languageCode: source.languageCode ?? source.lang ?? 'zh-cn',
  }).then(result => ({
    ...result,
    items: Array.isArray(result?.items) ? result.items.map(normalizeManual) : [],
  }))
}

/** 获取产品手册详情。 */
export function getManualDetail(articleId, languageCode = 'zh-cn') {
  if (articleId === undefined || articleId === null || String(articleId).trim() === '') {
    return Promise.reject(new Error('产品手册编号不能为空'))
  }

  return dispatch(MODULE, CONTROLLER, 'GetDetail', {
    articleId: String(articleId),
    languageCode,
  }).then(item => (item ? normalizeManual(item) : item))
}

/** 获取手册附件直接访问地址。 */
export async function getManualDownloadUrl(articleId, languageCode = 'zh-cn') {
  const detail = await getManualDetail(articleId, languageCode)
  return detail?.fileUrl || ''
}
