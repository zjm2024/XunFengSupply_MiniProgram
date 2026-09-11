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

export async function getAddressList() {
  const data = await dispatch('MallOrder', 'Mini.AddressController', 'GetAddressList', {})
  return (Array.isArray(data) ? data : []).map(normalizeAddress).filter(item => item.id > 0)
}

export function createAddress(address) {
  return dispatch('MallOrder', 'Mini.AddressController', 'CreateAddress', toAddressPayload(address))
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
