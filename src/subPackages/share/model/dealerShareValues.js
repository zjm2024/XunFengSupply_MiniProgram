/** 分享Int64标识保持十进制字符串，拒绝已舍入数字。 */
export function shareId(value) {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value <= 0)) return ''
  if (typeof value !== 'number' && typeof value !== 'string') return ''
  const id = String(value)
  return /^[1-9]\d{0,18}$/.test(id) && (id.length < 19 || id <= '9223372036854775807') ? id : ''
}
/** 金额只接受协议规定的精确十进制字符串，不经Number。 */
export function shareMoney(value) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,15})(\.\d{1,28})?$/.test(value)) return ''
  const [whole, fraction = ''] = value.split('.')
  if (/[^0]/.test(fraction.slice(2))) return ''
  return whole + '.' + fraction.slice(0, 2).padEnd(2, '0')
}
/** 仅展示合法UTC日期，不用无时区字符串猜测服务器时间。 */
export function shareUtc(value) {
  return typeof value === 'string' && /Z$/.test(value) && Number.isFinite(Date.parse(value)) ? value : ''
}
/** 公共入口不带归因参数；零售URI只允许后端规范随机码fragment。 */
export function shareUrl(value, retail = false) {
  if (typeof value !== 'string' || value.length > 2300 || /[<>"'\\\u0000-\u0020]/.test(value)
    || !/^https?:\/\/[^\s/?#@]+(?:\/[^\s?#]*)?(?:#[^\s]*)?$/.test(value)) return ''
  if (!value.startsWith('https://')) {
    if (!import.meta.env.DEV || !/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?\//.test(value)) return ''
  }
  if (retail) return /\/#\/s\/[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(value) ? value : ''
  const fragment = value.indexOf('#')
  return fragment < 0 || ['#/stock', '#/subPackages/share/pages/public-stock/index'].includes(value.slice(fragment))
    || /^#\/(?:stock|subPackages\/share\/pages\/public-stock\/index)\?access=[A-Za-z0-9_-]{40,2048}&expires=\d{10}$/.test(value.slice(fragment)) ? value : ''
}
