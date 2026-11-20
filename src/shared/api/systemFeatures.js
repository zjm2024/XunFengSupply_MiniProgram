import { dispatch } from './dispatchClient.js'

/** 只读取APP可见的功能白名单，不访问通用配置值。 */
export async function getSystemFeatures() {
  const result = await dispatch('System', 'Mini.SystemFeatureController', 'GetFeatures', {})
  if (typeof result?.afterSaleApplicationEnabled !== 'boolean') throw new Error('SYSTEM_FEATURES_INVALID')
  return result
}
