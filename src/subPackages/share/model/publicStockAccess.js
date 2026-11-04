let current = { access: '', expires: '' }

/** 库存链接凭据仅保留在当前页面文档内，列表与规格页沿用同一绝对期限。 */
export function setPublicStockAccess(access, expires = '') {
  current = typeof access === 'string' && /^[A-Za-z0-9_-]{40,2048}$/.test(access)
    ? { access, expires: /^\d{10}$/.test(String(expires)) ? String(expires) : '' }
    : { access: '', expires: '' }
}
/** 路由复制不改变原有效期，不产生经销商身份字段。 */
export function getPublicStockAccess() { return { ...current } }
/** 无查询凭据禁止发起数据请求；密码学真实性和绝对期限仍由服务端逐次复核。 */
export function publicStockAccessParams() {
  if (!current.access || !/^\d{10}$/.test(current.expires)) {
    throw Object.assign(new Error('Invalid stock enquiry link'), { httpStatus: 410, errorCode: 'PUBLIC_STOCK_LINK_EXPIRED' })
  }
  return { AccessToken: current.access }
}
