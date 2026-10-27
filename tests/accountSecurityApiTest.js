import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let dispatch, api
beforeEach(async () => {
  vi.resetModules()
  dispatch = vi.fn(async () => true)
  vi.doMock('@/shared/api/dispatchClient.js', () => ({ dispatch }))
  api = await import('@/subPackages/account/api/accountSecurity.js')
})
afterEach(() => { vi.doUnmock('@/shared/api/dispatchClient.js') })

describe('account self-service API boundary', () => {
  it('normalizes actual data and rejects an empty successful profile response', async () => {
    dispatch.mockResolvedValueOnce({ CustomerId: 22, Username: 'buyer22', DealerCode: 'CU_REAL', IsMaster: false })
    expect(await api.getAccountProfile()).toMatchObject({ customerId: 22, username: 'buyer22', dealerCode: 'CU_REAL', isMaster: false })
    dispatch.mockResolvedValueOnce({})
    await expect(api.getAccountProfile()).rejects.toThrow()
  })

  it('drops caller-provided account identifiers and noneditable profile data', async () => {
    await api.saveAccountProfile({ realName: 'Name', landlinePhone: '02012345678', customerId: 10, dealerCode: 'FORGED', mobile: '138****0000' })
    expect(dispatch).toHaveBeenCalledWith('MallDealer', 'Mini.ProfileController', 'UpdateAccountProfile', { RealName: 'Name', LandlinePhone: '02012345678' })
    await api.saveAccountContact({ currentPassword: 'test-password', email: 'name@example.com', accountId: 10 })
    expect(dispatch).toHaveBeenLastCalledWith('MallDealer', 'Mini.ProfileController', 'UpdateAccountContact', { CurrentPassword: 'test-password', Email: 'name@example.com' })
  })

  it('keeps credential fields request-local and discards device sign-in codes from responses', async () => {
    await api.saveAccountPassword({ oldPassword: 'old-test', newPassword: 'new-test', customerId: 10 })
    expect(dispatch).toHaveBeenCalledWith('MallDealer', 'Mini.LoginController', 'ChangePassword', { OldPassword: 'old-test', NewPassword: 'new-test' })
    dispatch.mockResolvedValueOnce([{ DeviceId: 5, DeviceName: 'Device', DeviceCode: 'not-for-the-ui', CustomerId: 10 }])
    expect(await api.getAccountDevices()).toEqual([{ deviceId: 5, deviceName: 'Device', lastLoginTime: undefined, boundAt: undefined }])
    await api.removeAccountDevice(5)
    expect(dispatch).toHaveBeenLastCalledWith('MallDealer', 'Mini.DeviceController', 'UnbindDevice', { DeviceId: 5 })
  })
})
