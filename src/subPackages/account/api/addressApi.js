import { dispatch } from '../../../shared/api/dispatchClient.js'

function valueOf(source, camelKey, pascalKey, fallback = undefined) {
  return source?.[camelKey] ?? source?.[pascalKey] ?? fallback
}

export function normalizeAddress(source = {}) {
  const province = String(valueOf(source, 'province', 'Province', '') || '')
  const city = String(valueOf(source, 'city', 'City', '') || '')
  const district = String(valueOf(source, 'district', 'District', '') || '')
  const detail = String(valueOf(source, 'addressDetail', 'AddressDetail', '') || '')

  return {
    id: Number(valueOf(source, 'addressId', 'AddressId', 0)) || 0,
    name: String(valueOf(source, 'contactName', 'ContactName', '') || ''),
    phone: String(valueOf(source, 'contactPhone', 'ContactPhone', '') || ''),
    province,
    city,
    district,
    detail,
    fullAddress: String(valueOf(source, 'fullAddress', 'FullAddress', '') || '')
      || `${province}${city}${district}${detail}`,
    isDefault: Boolean(valueOf(source, 'isDefault', 'IsDefault', false)),
  }
}

function toAddressPayload(address = {}) {
  return {
    ContactName: String(address.name || '').trim(),
    ContactPhone: String(address.phone || '').trim(),
    Province: String(address.province || '').trim(),
    City: String(address.city || '').trim(),
    District: String(address.district || '').trim(),
    AddressDetail: String(address.detail || '').trim(),
    IsDefault: Boolean(address.isDefault),
  }
}

export async function getAddressList(params = {}) {
  const source = params || {}
  const hasExplicitPagination = Object.prototype.hasOwnProperty.call(source, 'pageNum')
    || Object.prototype.hasOwnProperty.call(source, 'PageNum')
    || Object.prototype.hasOwnProperty.call(source, 'pageSize')
    || Object.prototype.hasOwnProperty.call(source, 'PageSize')
  const data = await dispatch('MallOrder', 'Mini.AddressController', 'GetAddressList', {
    PageNum: Number(source.pageNum ?? source.PageNum ?? 1) || 1,
    PageSize: Number(source.pageSize ?? source.PageSize ?? 20) || 20,
  })
  const items = Array.isArray(data) ? data : (data?.items ?? data?.Items ?? [])
  const normalizedItems = items.map(normalizeAddress).filter(item => item.id > 0)
  if (!hasExplicitPagination) return normalizedItems
  return {
    items: normalizedItems,
    totalCount: Number(data?.totalCount ?? data?.TotalCount ?? items.length) || 0,
    pageNum: Number(data?.pageNum ?? data?.PageNum ?? source.pageNum ?? 1) || 1,
    pageSize: Number(data?.pageSize ?? data?.PageSize ?? source.pageSize ?? 20) || 20,
    totalPages: Number(data?.totalPages ?? data?.TotalPages ?? 0) || 0,
  }
}

export async function createAddress(address) {
  const result = await dispatch('MallOrder', 'Mini.AddressController', 'CreateAddress', toAddressPayload(address))
  return Number(
    result?.addressId
    ?? result?.AddressId
    ?? result?.id
    ?? result?.Id
    ?? result,
  ) || 0
}

export function updateAddress(address) {
  return dispatch('MallOrder', 'Mini.AddressController', 'UpdateAddress', {
    AddressId: Number(address?.id) || 0,
    ...toAddressPayload(address),
  })
}

export function setDefaultAddress(addressId) {
  return dispatch('MallOrder', 'Mini.AddressController', 'SetDefaultAddress', {
    AddressId: Number(addressId) || 0,
  })
}

export function deleteAddress(addressId) {
  return dispatch('MallOrder', 'Mini.AddressController', 'DeleteAddress', {
    AddressId: Number(addressId) || 0,
  })
}
