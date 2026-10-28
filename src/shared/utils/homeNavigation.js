import { routes } from '@/app/config/routes.js'

/** 将有限业务目标转换为已注册路由，拒绝任意路径。 */
export function homeTargetRoute(item, home) {
  const target = item?.target || {}, id = target.id
  switch (item?.targetType) {
    case 1: return id ? routes.commerce.productDetail(id) : null
    case 2: return id ? routes.commerce.productList({ categoryId: id }) : null
    case 3: {
      const component = home.components.find(c => c.componentType === 5 && (c.homeComponentId === String(id) || c.clientKey === target.componentClientKey))
      return component ? routes.commerce.homeSection({ homePageId: home.homePageId, componentId: component.homeComponentId, configStamp: home.configStamp }) : null
    }
    case 4: return id ? routes.content.announcementDetail(id) : null
    case 5: return id ? routes.content.newsDetail(id) : null
    case 6: return id ? routes.content.manualPreview(id) : null
    case 7: return { catalog: routes.commerce.productList(), news: routes.content.news(), manual: routes.content.manual(), cart: routes.commerce.cart(), account: routes.account.center() }[target.feature] || null
    default: return null
  }
}
