import { dispatch } from '@/shared/api/dispatchClient.js'

/** 仅投影真实账号资料，兼容后端字段大小写。 */
export function normalizeAccountProfile(data = {}) {
  const field = name => data[name] ?? data[name[0].toUpperCase() + name.slice(1)]
  const profile = Object.fromEntries(['customerId', 'username', 'dealerCode', 'erpCustomerCode', 'realName', 'companyName', 'contactName', 'mobile', 'landlinePhone', 'email', 'gradeName', 'gradeNameEn', 'isMaster', 'createdAt'].map(name => [name, field(name) ?? '']))
  const grade = field('grade')
  profile.grade = Number.isInteger(grade) && grade >= 1 && grade <= 3 ? grade : null
  return profile
}
/** 读取当前账号与所属经销商资料，身份由后端确定。 */
export async function getAccountProfile() {
  const profile = normalizeAccountProfile(await dispatch('MallDealer', 'Mini.ProfileController', 'GetAccountProfile', {}))
  if (!profile.customerId) throw new Error()
  return profile
}
/** 仅保存当前账号允许编辑的姓名及电话。 */
export function saveAccountProfile({ realName, landlinePhone }) { return dispatch('MallDealer', 'Mini.ProfileController', 'UpdateAccountProfile', { RealName: realName, LandlinePhone: landlinePhone }) }
/** 验证当前密码后更新一种联系信息，不传账号标识。 */
export function saveAccountContact({ currentPassword, mobile, email }) {
  return dispatch('MallDealer', 'Mini.ProfileController', 'UpdateAccountContact', { CurrentPassword: currentPassword, ...(mobile !== undefined ? { Mobile: mobile } : {}), ...(email !== undefined ? { Email: email } : {}) })
}
/** 修改当前账号密码，仅随当前请求发送密码。 */
export function saveAccountPassword({ oldPassword, newPassword }) { return dispatch('MallDealer', 'Mini.LoginController', 'ChangePassword', { OldPassword: oldPassword, NewPassword: newPassword }) }
/** 读取设备摘要，不保存设备免登编码。 */
export async function getAccountDevices() {
  const list = await dispatch('MallDealer', 'Mini.DeviceController', 'GetDevices', {})
  return (Array.isArray(list) ? list : []).map(item => ({ deviceId: item.deviceId ?? item.DeviceId, deviceName: item.deviceName ?? item.DeviceName ?? '', lastLoginTime: item.lastLoginTime ?? item.LastLoginTime, boundAt: item.boundAt ?? item.BoundAt }))
}
/** 服务端校验归属后解除免登授权。 */
export function removeAccountDevice(deviceId) { return dispatch('MallDealer', 'Mini.DeviceController', 'UnbindDevice', { DeviceId: deviceId }) }
