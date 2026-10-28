import { dispatch } from './dispatchClient.js'
import { normalizeProduct } from './product.js'

/** 规范化首页商品卡片，缺失报价不能转成零价。 */
export function normalizeHomeProduct(item) {
  if (item?.minCurrentPrice === null || item?.minCurrentPrice === undefined || !Number.isFinite(Number(item.minCurrentPrice))) {
    throw new Error('HOME_PRODUCT_PRICE_UNAVAILABLE')
  }
  return { ...normalizeProduct(item), productId: String(item.productId), badge: item.badge || '' }
}

/** 规范化有限组件并保留long标识的字符串精度。 */
export function normalizeHome(result) {
  if (!result || result.mode !== 'custom') return { mode: 'default', components: [] }
  if (result.contractVersion !== 1 || !Array.isArray(result.components)) throw new Error('HOME_LAYOUT_UNSUPPORTED')
  const components = result.components.filter(c => Number.isInteger(c.componentType) && c.componentType >= 0 && c.componentType <= 5)
    .map(c => ({ ...c, homeComponentId: String(c.homeComponentId), parentComponentId: c.parentComponentId ? String(c.parentComponentId) : null,
      config: { previewCount: 4, columns: 4, showMore: true, layout: 'split', ...c.config },
      items: (c.items || []).map(i => ({ ...i, homeItemId: String(i.homeItemId || ''), productId: i.productId ? String(i.productId) : null, announcementId: i.announcementId ? String(i.announcementId) : null, target: { ...i.target } })) }))
  const ids = new Set(components.map(c => c.homeComponentId))
  const visible = components.filter(c => !c.parentComponentId || ids.has(c.parentComponentId)
    && components.some(parent => parent.homeComponentId === c.parentComponentId && parent.componentType === 0 && !parent.parentComponentId))
  if (!visible.some(c => c.componentType !== 0)) return { mode: 'default', components: [] }
  return { ...result, homePageId: String(result.homePageId), components: visible }
}

/** 获取生效结构；失败由页面使用默认首页兜底。 */
export function getHome() {
  return dispatch('System', 'Mini.HomePageController', 'GetHome', { PageCode: 'app_home' }, { timeout: 5000 }).then(normalizeHome)
}

/** 批量读取有限楼层首屏。 */
export function getHomePreviews(home, componentIds) {
  return dispatch('System', 'Mini.HomePageController', 'GetSectionPreviews', {
    HomePageId: home.homePageId, ConfigStamp: home.configStamp, ComponentIds: componentIds,
  }).then(rows => (rows || []).map(row => ({ ...row, homeComponentId: String(row.homeComponentId),
    items: row.state === 'ready' ? (row.items || []).map(normalizeHomeProduct) : [] })))
}

/** 获取完整楼层范围的一页，分页和身份均由后端约束。 */
export function getHomeSection(params) {
  return dispatch('System', 'Mini.HomePageController', 'GetSectionProducts', {
    HomePageId: params.homePageId, HomeComponentId: params.componentId, ConfigStamp: params.configStamp,
    Keyword: params.keyword || '', Sort: params.sort || 0, PageNum: params.pageNum || 1, PageSize: 20,
  }).then(result => ({ ...result, homePageId: String(result.homePageId), homeComponentId: String(result.homeComponentId), items: (result.items || []).map(normalizeHomeProduct) }))
}
