/** 分享站公开地址与真实页面映射；保留内部路由用于UniApp页面注册。 */
export const SHARE_PUBLIC_ROUTES = Object.freeze({
 '/subPackages/share/pages/retail/search': '/shop/search',
 '/subPackages/share/pages/public-stock/search': '/stock/search',
 '/subPackages/share/pages/retail/index': '/shop',
 '/subPackages/share/pages/public-stock/index': '/stock',
 '/subPackages/share/pages/public-stock/detail': '/stock/item',
})
/** 仅替换路径，授权参数原样保留。 */
export function publicShareUrl(url) {
 const [path, ...query] = url.split('?')
 return (SHARE_PUBLIC_ROUTES[path] || path) + (query.length ? '?' + query.join('?') : '')
}
/** 公开别名转为内部注册路径，继续使用同一权限元数据。 */
export function internalSharePath(path) {
 return Object.keys(SHARE_PUBLIC_ROUTES).find(key => SHARE_PUBLIC_ROUTES[key] === path) || path
}
