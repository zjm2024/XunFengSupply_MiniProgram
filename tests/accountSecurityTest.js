import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPageSetup } from './helpers/sfcHarness.js'

let vue, i18n, dialogs, api, user, navigation, facts
const stops = []
beforeEach(async () => {
  vi.resetModules()
  vue = await import('vue')
  i18n = await import('@/shared/i18n/index.js')
  dialogs = await import('@/shared/composables/useAppDialog.js')
  const { registerMainLocales } = await import('@/app/i18n/registerMain.js'); registerMainLocales()
  await import('@/subPackages/account/i18n/register.js')
  facts = { customerId: 22, username: 'buyer22', realName: 'Actual buyer', companyName: 'Actual company', dealerCode: 'CU_ACTUAL', grade: 'B', mobile: '138****5678', email: 'actual@example.com', landlinePhone: '02012345678', isMaster: false }
  api = { getAccountProfile: vi.fn(async () => ({ ...facts })), saveAccountProfile: vi.fn(async () => true), saveAccountContact: vi.fn(async () => true), saveAccountPassword: vi.fn(async () => true), getAccountDevices: vi.fn(async () => [{ deviceId: 5, deviceName: 'Actual device' }]), removeAccountDevice: vi.fn(async () => true) }
  user = { userId: 22, realName: 'Actual buyer', updateOwnProfile: vi.fn(), logout: vi.fn(async () => {}) }
  navigation = { navigateTo: vi.fn(), reLaunch: vi.fn(async () => true) }
  vi.stubGlobal('uni', { showToast: vi.fn(), setClipboardData: vi.fn(), setStorageSync: vi.fn() })
})
afterEach(() => { dialogs.settleAppDialog(false); stops.splice(0).forEach(stop => stop()); vi.unstubAllGlobals() })

/** 运行真实资料或安全页 setup，接口仅使用已审查替身。 */
async function open(name) {
  const hooks = {}
  const page = await loadPageSetup('subPackages/account/pages/' + name + '/index.vue', async id => {
    if (id === 'vue') return vue
    if (id === '@dcloudio/uni-app') return { onShow: fn => { hooks.show = fn }, onHide: fn => { hooks.hide = fn }, onUnload: fn => { hooks.unload = fn } }
    if (id.includes('/i18n/index.js')) return i18n
    if (id.includes('/useAppDialog.js')) return dialogs
    if (id.includes('/accountSecurity.js')) return api
    if (id.includes('/userStore.js')) return { useUserStore: () => user }
    if (id.includes('/navigator.js')) return { navigator: navigation }
    if (id.includes('/routes.js')) return { routes: { auth: { login: () => '/login' }, account: { security: () => '/security' } } }
    if (id.includes('/format.js')) return import('@/shared/utils/format.js')
    return { default: {} }
  })
  stops.push(page.stop)
  return { v: page.bindings, hooks }
}

/** 创建仅由测试控制完成时机的请求。 */
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

describe('real account profile and security workflows', () => {
  it('profile rows edit one field, cancel discards locally and save retains the other allowed field', async () => {
    const { v } = await open('profile'); await v.loadProfile()
    v.startProfileEdit('realName'); v.editValue.value = 'Draft name'
    i18n.setLocale('en-US'); expect(v.editValue.value).toBe('Draft name')
    expect(api.saveAccountProfile).not.toHaveBeenCalled()
    v.closeProfileEdit(); expect(v.profile.realName).toBe(facts.realName)
    expect(v.dirty.value).toBe(false)
    v.startProfileEdit('landlinePhone'); v.editValue.value = '02112345678'
    await v.confirmProfileEdit()
    expect(api.saveAccountProfile).toHaveBeenCalledWith({ realName: facts.realName, landlinePhone: '02112345678' })
    expect(v.profile.landlinePhone).toBe('02112345678')
    expect(v.editVisible.value).toBe(false)
  })

  it('profile unchanged values do not write; failed row save retains its input and editor', async () => {
    const { v } = await open('profile'); await v.loadProfile()
    v.startProfileEdit('realName'); await v.confirmProfileEdit()
    expect(api.saveAccountProfile).not.toHaveBeenCalled()
    v.startProfileEdit('realName'); v.editValue.value = 'Keep failed input'
    api.saveAccountProfile.mockResolvedValue(false)
    await v.confirmProfileEdit()
    expect(v.editVisible.value).toBe(true)
    expect(v.editValue.value).toBe('Keep failed input')
    expect(v.profile.realName).toBe(facts.realName)
    expect(v.saveError.value).not.toBe('')
  })

  it('password editors open empty each time, recreate fields and do not persist cached values', async () => {
    const { v, hooks } = await open('security'); await v.loadProfile()
    v.startEdit('password'); const firstSession = v.editSession.value
    v.currentPassword.value = 'OldPass123'; v.newPassword.value = 'NewPass456'; v.confirmPassword.value = 'NewPass456'
    v.closeEditor(); v.startEdit('password')
    expect([v.currentPassword.value, v.newPassword.value, v.confirmPassword.value]).toEqual(['', '', ''])
    expect(v.editSession.value).toBeGreaterThan(firstSession)
    v.currentPassword.value = 'Typed by user'
    i18n.setLocale('en-US'); expect(v.currentPassword.value).toBe('Typed by user')
    hooks.hide(); expect(v.currentPassword.value).toBe('')
    expect(uni.setStorageSync).not.toHaveBeenCalled()
    expect(api.saveAccountPassword).not.toHaveBeenCalled()
  })

  it('reads real values, copies the full dealer code and preserves drafts across language changes', async () => {
    const { v } = await open('profile'); await v.loadProfile()
    expect(v.profile).toMatchObject(facts)
    expect(v.draft.realName).toBe('Actual buyer')
    v.draft.realName = 'Edited buyer'
    i18n.setLocale('en-US')
    expect(v.draft.realName).toBe('Edited buyer')
    expect(v.dirty.value).toBe(true)
    expect(api.getAccountProfile).toHaveBeenCalledTimes(1)
    expect(api.saveAccountProfile).not.toHaveBeenCalled()
    v.copyCode(); expect(uni.setClipboardData).toHaveBeenCalledWith(expect.objectContaining({ data: 'CU_ACTUAL' }))
    const copy = uni.setClipboardData.mock.calls[0][0]
    expect(copy.showToast).toBe(false); copy.success()
    expect(uni.showToast).toHaveBeenCalledWith({ title: 'Customer ID copied', icon: 'none' })
    await v.loadProfile(); expect(v.draft.realName).toBe('Edited buyer')
  })

  it('saves only allowed fields once and updates the store only after confirmed success', async () => {
    const { v } = await open('profile'); await v.loadProfile(); v.draft.realName = ' New buyer '
    const request = deferred(); api.saveAccountProfile.mockReturnValue(request.promise)
    const pending = v.save(); await v.save()
    expect(api.saveAccountProfile).toHaveBeenCalledTimes(1)
    expect(api.saveAccountProfile).toHaveBeenCalledWith({ realName: 'New buyer', landlinePhone: '02012345678' })
    expect(user.updateOwnProfile).not.toHaveBeenCalled()
    request.resolve(true); await pending
    expect(user.updateOwnProfile).toHaveBeenCalledWith({ realName: 'New buyer' })
    expect(v.dirty.value).toBe(false)
  })

  it('retains edits on save failure and rejects stale reads after successful saves', async () => {
    const { v } = await open('profile'); await v.loadProfile()
    const read = deferred(); api.getAccountProfile.mockReturnValueOnce(read.promise)
    const pendingRead = v.loadProfile(); v.draft.realName = 'New buyer'
    await v.save(); read.resolve(facts); await pendingRead
    expect(v.draft.realName).toBe('New buyer')
    v.draft.realName = 'Another'; api.saveAccountProfile.mockResolvedValue(false)
    await v.save(); expect(v.dirty.value).toBe(true); expect(v.saveError.value).not.toBe('')
    expect(user.updateOwnProfile).toHaveBeenCalledTimes(1)
  })

  it('validates passwords without sending, and canceled confirmation does not modify credentials', async () => {
    const { v } = await open('security'); await v.loadProfile(); v.startEdit('password')
    v.currentPassword.value = 'OldPass123'; v.newPassword.value = 'short'; v.confirmPassword.value = 'short'
    await v.submitEdit(); expect(api.saveAccountPassword).not.toHaveBeenCalled()
    v.newPassword.value = 'NewPass456'; v.confirmPassword.value = 'Different'
    await v.submitEdit(); expect(v.validationKey.value).toBe('account.security.passwordMismatch')
    v.confirmPassword.value = 'NewPass456'
    const pending = v.submitEdit(); dialogs.settleAppDialog(false); await pending
    expect(api.saveAccountPassword).not.toHaveBeenCalled(); expect(user.logout).not.toHaveBeenCalled()
  })

  it('handles one confirmed password write across language change and page hide, then signs out', async () => {
    const { v, hooks } = await open('security'); await v.loadProfile(); v.startEdit('password')
    v.currentPassword.value = 'OldPass123'; v.newPassword.value = 'NewPass456'; v.confirmPassword.value = 'NewPass456'
    const request = deferred(); api.saveAccountPassword.mockReturnValue(request.promise)
    const pending = v.submitEdit(); dialogs.settleAppDialog(true); await vue.nextTick()
    i18n.setLocale('en-US'); await v.submitEdit()
    expect(api.saveAccountPassword).toHaveBeenCalledTimes(1)
    expect(api.saveAccountPassword).toHaveBeenCalledWith({ oldPassword: 'OldPass123', newPassword: 'NewPass456' })
    expect(user.logout).not.toHaveBeenCalled()
    hooks.hide(); expect(v.currentPassword.value).toBe(''); request.resolve(true); await pending
    expect(user.logout).toHaveBeenCalledTimes(1); expect(navigation.reLaunch).toHaveBeenCalledWith('/login')
    expect(uni.setStorageSync).not.toHaveBeenCalled()
  })

  it('saves a contact once and distinguishes saved-but-refresh-failed from a failed write', async () => {
    const { v } = await open('security'); await v.loadProfile(); v.startEdit('mobile')
    expect(v.contactValue.value).toBe('')
    v.currentPassword.value = 'OldPass123'; v.contactValue.value = '+44 1234567890'
    i18n.setLocale('en-US'); expect(v.currentPassword.value).toBe('OldPass123')
    api.getAccountProfile.mockRejectedValueOnce(new Error('Read failed'))
    await v.submitEdit()
    expect(api.saveAccountContact).toHaveBeenCalledTimes(1)
    expect(api.saveAccountContact).toHaveBeenCalledWith({ currentPassword: 'OldPass123', mobile: '+441234567890' })
    expect(v.editing.value).toBe(''); expect(v.editError.value).toBe(''); expect(v.profileError.value).toBe('Read failed')
    expect(v.currentPassword.value).toBe('')
  })

  it('does not remove devices locally when canceled or rejected by the backend', async () => {
    const { v } = await open('security'); await v.loadDevices(); const device = v.devices.value[0]
    let pending = v.removeDevice(device); dialogs.settleAppDialog(false); await pending
    expect(api.removeAccountDevice).not.toHaveBeenCalled(); expect(v.devices.value).toHaveLength(1)
    api.removeAccountDevice.mockResolvedValueOnce(false)
    pending = v.removeDevice(device); dialogs.settleAppDialog(true); await pending
    expect(v.devices.value).toHaveLength(1); expect(v.deviceActionError.value).not.toBe('')
    pending = v.removeDevice(device); dialogs.settleAppDialog(true); await pending
    expect(v.devices.value).toHaveLength(0); expect(api.removeAccountDevice).toHaveBeenLastCalledWith(5)
  })

  it('security sign-out now clears the real session instead of showing a fake success', async () => {
    const { v } = await open('security')
    const pending = v.handleLogout(); dialogs.settleAppDialog(true); await pending
    expect(user.logout).toHaveBeenCalledTimes(1); expect(navigation.reLaunch).toHaveBeenCalledWith('/login')
  })
})
