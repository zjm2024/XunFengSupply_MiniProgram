import { dispatch } from '@/shared/api/dispatchClient.js'
import { shareAccessCode } from './shareAccessApi.js'
import { shareId, shareMoney, shareUtc } from '../model/dealerShareValues.js'

const CONTROLLER = 'Mini.ShareCheckoutController'
/** 结算仅使用当前访客Cookie及闭包凭据，不读取经销商JWT。 */
function options(access) {
  if (!shareAccessCode(access?.contextId) || !shareAccessCode(access?.csrfToken)) throw new TypeError('Invalid sharing checkout context')
  return { shareSession: true, anonymous: true, authStrategy: 'passive', timeout: 15000,
    header: { 'X-Share-Context': access.contextId, 'X-Share-CSRF': access.csrfToken } }
}
/** 收件文本规范化且拒绝控制字符，不截断用户输入。 */
function text(value, maximum, required = true) {
  if (!required && (value == null || value === '')) return null
  if (typeof value !== 'string') throw new TypeError('Invalid sharing checkout text')
  const result = value.trim().normalize('NFC')
  if ((!result && required) || result.length > maximum || /[\u0000-\u001f\u007f-\u009f]/.test(result)) throw new TypeError('Invalid sharing checkout text')
  return result || null
}
/** 地区只接六位ASCII编码，名称一律由服务端核验。 */
function areaCode(value) {
  if (typeof value !== 'string' || !/^\d{6}$/.test(value)) throw new TypeError('Invalid sharing delivery area')
  return value
}
/** 安全整型修订用于界面并发，不充当授权。 */
function revision(value) {
  if (typeof value === 'string' && /^(0|[1-9]\d{0,15})$/.test(value)) value = Number(value)
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Invalid sharing cart revision')
  return value
}
/** 标识不能经过有损的JS浮点转换。 */
function id(value) { const result = shareId(value); if (!result) throw new TypeError('Invalid sharing checkout id'); return result }
/** 正数商品/应付或可零运费均保持分字符串，不在浏览器计算成交价。 */
function money(value, positive = false) {
  const result = shareMoney(value)
  if (!result || (positive && !/[1-9]/.test(result))) throw new TypeError('Invalid sharing checkout amount')
  return result
}
/** 只取本地勾选的SKU/数量意向，重复规格拒绝，不传价格或账号。 */
function items(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) throw new TypeError('Invalid sharing checkout items')
  const seen = new Set()
  return value.map(item => {
    const skuId = id(item?.skuId), quantity = item?.quantity
    if (seen.has(skuId) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 9999) throw new TypeError('Invalid sharing checkout quantity')
    seen.add(skuId); return { SkuId: skuId, Quantity: quantity }
  }).sort((left, right) => left.SkuId.length - right.SkuId.length || left.SkuId.localeCompare(right.SkuId))
}
/** 收件信息只送独立预览，不能通过旧地址ID或来源字段选址。 */
function address(value) {
  const phone = text(value?.contactPhone, 30).replace(/ /g, '')
  if (phone.length < 6 || !/^[0-9+()\-]+$/.test(phone)) throw new TypeError('Invalid sharing contact phone')
  return { ContactName: text(value?.contactName, 50), ContactPhone: phone,
    ProvinceCode: areaCode(value?.provinceCode), CityCode: areaCode(value?.cityCode), DistrictCode: areaCode(value?.districtCode),
    AddressDetail: text(value?.addressDetail, 300), PostalCode: text(value?.postalCode, 20, false) }
}
/** 出站商品严格白名单，完整接收数量须与本次意向一致。 */
function line(value, expected) {
  const skuId = id(value?.skuId), quantity = value?.quantity
  if (!expected.has(skuId) || expected.get(skuId) !== quantity) throw new TypeError('Invalid sharing preview item')
  expected.delete(skuId)
  return { skuId, productId: id(value.productId), productName: text(value.productName, 500), skuCode: text(value.skuCode, 100),
    specDesc: text(value.specDesc, 1000, false) || '', imageUrl: text(value.imageUrl, 2000, false) || '', quantity,
    unitPrice: money(value.unitPrice, true), lineAmount: money(value.lineAmount, true) }
}
/** 精确恢复短期预览，不让服务端额外字段进入页面或本地草稿。 */
function preview(value, request) {
  const expires = shareUtc(value?.expiresAtUtc), now = shareUtc(value?.serverNowUtc)
  if (!shareAccessCode(value?.previewId) || !/^[a-f0-9]{64}$/.test(value?.quoteFingerprint || '')
    || revision(value?.localCartRevision) !== request.LocalCartRevision || !expires || !now || Date.parse(expires) <= Date.parse(now)
    || !Array.isArray(value.items) || value.items.length !== request.Items.length) throw new TypeError('Invalid sharing checkout preview')
  const expected = new Map(request.Items.map(item => [item.SkuId, item.Quantity])), rows = value.items.map(item => line(item, expected))
  if (expected.size) throw new TypeError('Incomplete sharing checkout preview')
  return { previewId: value.previewId, quoteFingerprint: value.quoteFingerprint, localCartRevision: request.LocalCartRevision, items: rows,
    goodsAmount: money(value.goodsAmount, true), freightAmount: money(value.freightAmount), payableAmount: money(value.payableAmount, true),
    expiresAtUtc: expires, serverNowUtc: now }
}
/** 独立地区接口，选择结果须属于请求父节点且层级正确。 */
export async function getShareCheckoutAreas({ contextId, csrfToken, parentCode = null, expectedLevel = 1 } = {}) {
  if (![1, 2, 3].includes(expectedLevel) || (parentCode == null) !== (expectedLevel === 1)) throw new TypeError('Invalid sharing area level')
  const request = parentCode == null ? {} : { ParentCode: areaCode(parentCode) }
  const rows = await dispatch('MallOrder', CONTROLLER, 'GetAreas', request, options({ contextId, csrfToken }))
  if (!Array.isArray(rows) || rows.length > 5000) throw new TypeError('Invalid sharing checkout areas')
  const seen = new Set()
  return rows.map(row => {
    const code = areaCode(row?.code), parent = areaCode(row?.parentCode)
    if (seen.has(code) || row.level !== expectedLevel || parent !== (parentCode || '000000')) throw new TypeError('Invalid sharing area hierarchy')
    seen.add(code); return { code, parentCode: parent, level: row.level, name: text(row.name, 120) }
  })
}
/** 不读取或向页面返回平台基础运费设置。 */
export async function getShareCheckoutCarriers(access) {
  const rows = await dispatch('MallOrder', CONTROLLER, 'GetCarriers', {}, options(access))
  if (!Array.isArray(rows) || rows.length > 1000) throw new TypeError('Invalid sharing checkout carriers')
  const seen = new Set()
  return rows.map(row => {
    const code = text(row?.code, 50), name = text(row?.name, 200)
    if (seen.has(code)) throw new TypeError('Duplicate sharing checkout carrier')
    seen.add(code); return { code, name }
  })
}
/** 预览不创建订单/地址或保留库存，只传规范意向及当前页面手填收件资料。 */
export async function previewShareCheckout({ contextId, csrfToken, items: selected, address: recipient, expressCompanyCode, remark, localCartRevision } = {}) {
  const request = { Items: items(selected), Address: address(recipient), ExpressCompanyCode: text(expressCompanyCode, 50),
    Remark: text(remark, 300, false), LocalCartRevision: revision(localCartRevision) }
  return preview(await dispatch('MallOrder', CONTROLLER, 'Preview', request, options({ contextId, csrfToken })), request)
}

/** 只提交原文到访客地址解析入口，不夹带账号身份、地址ID或供应商凭据。 */
export async function parseShareCheckoutAddress({ contextId, csrfToken, addressText } = {}) {
  if (typeof addressText !== 'string') throw new TypeError('Invalid recipient text')
  const input = addressText.trim().normalize('NFC')
  if (!input || input.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(input)) throw new TypeError('Invalid recipient text')
  const value = await dispatch('MallOrder', CONTROLLER, 'ParseAddress', { AddressText: input },
    { ...options({ contextId, csrfToken }), timeout: 35000 })
  if (typeof value?.isComplete !== 'boolean') throw new TypeError('Invalid parsed address')
  return { contactName: text(value.contactName, 50, false) || '', contactPhone: text(value.contactPhone, 30, false) || '',
    province: text(value.province, 120, false) || '', city: text(value.city, 120, false) || '', district: text(value.district, 120, false) || '',
    addressDetail: text(value.addressDetail, 300, false) || '', isComplete: value.isComplete }
}
