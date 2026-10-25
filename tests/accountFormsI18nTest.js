import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPageSetup } from './helpers/sfcHarness.js'

let vue, i18n, errors
const stops = []

beforeEach(async () => {
  vi.resetModules()
  vue = await import('vue')
  i18n = await import('@/shared/i18n/index.js')
  errors = await import('@/shared/api/appError.js')
  const { registerMainLocales } = await import('@/app/i18n/registerMain.js')
  registerMainLocales()
  await import('@/subPackages/account/i18n/register.js')
  vi.stubGlobal('uni', { showToast: vi.fn(), showModal: vi.fn(), hideKeyboard: vi.fn() })
  vi.stubGlobal('getCurrentPages', () => [])
})

afterEach(() => {
  stops.splice(0).forEach(stop => stop())
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** 运行真实页面 setup，以隔离 API 验证语言变化不会改写业务事实。 */
async function open(relative, supplied = {}) {
  const api = {
    getAddressList: vi.fn(async () => []), createAddress: vi.fn(async () => 12), updateAddress: vi.fn(),
    deleteAddress: vi.fn(), setDefaultAddress: vi.fn(),
    createSubAccount: vi.fn(), updateSubAccount: vi.fn(), toggleSubAccountStatus: vi.fn(),
    getSubAccountList: vi.fn(async () => ({ items: [], totalCount: 0 })),
    getDealerFinanceContext: vi.fn(async () => ({ accounts: [], currentAccount: null })),
    transferDealerBalance: vi.fn(), changeDealerFrozenBalance: vi.fn(),
    getAreaChildren: vi.fn(async () => []), ROOT_AREA_CODE: '0',
    ...supplied.api,
  }
  const hooks = {}, user = vue.reactive({ isFrozen: false })
  const notification = {
    getNotificationSettings: vi.fn(() => ({ enabled: true, order: true, audit: true, bill: true,
      afterSale: true, announcement: true, sound: true, vibration: false })),
    saveNotificationSettings: vi.fn(value => value),
  }
  const navigator = { back: vi.fn(), redirectTo: vi.fn(), navigateTo: vi.fn() }
  const page = await loadPageSetup(relative, async id => {
    if (id === 'vue') return { ...vue, onBeforeUnmount: () => {} }
    if (id === '@dcloudio/uni-app') return { onLoad: fn => { hooks.load = fn }, onShow: fn => { hooks.show = fn } }
    if (id.includes('i18n/index')) return i18n
    if (id.includes('appError')) return errors
    if (id.includes('pageState')) return import('@/shared/model/pageState.js')
    if (id.includes('notificationSettings')) return notification
    if (id.includes('userStore')) return { useUserStore: () => user }
    if (id.includes('navigator')) return { navigator }
    if (id.includes('config/routes')) return { routes: { account: { address: () => '/address',
      addressForm: value => value, subAccountForm: value => value } } }
    if (id.includes('refreshAnimation')) return { waitForRefreshAnimation: vi.fn() }
    if (id.includes('useAppDialog')) {
      return {
        openAppDialog: vi.fn(options => new Promise(resolve => {
          uni.showModal({ ...options, content: options.description, success: result => resolve(Boolean(result.confirm)) })
        })),
        openAppPrompt: vi.fn(options => new Promise(resolve => {
          uni.showModal({ ...options, editable: true, placeholderText: options.placeholder, success: result => resolve({ confirmed: Boolean(result.confirm), content: result.content }) })
        })),
      }
    }
    if (id.includes('/api/') || id.endsWith('/area.js')) return api
    return { default: {} }
  })
  stops.push(page.stop)
  return { v: page.bindings, hooks, api, user, notification, navigator }
}

/** 填入真实格式的地址草稿，保留中文行政区数据。 */
function fillAddress(v) {
  Object.assign(v.form, { name: '张三', phone: '+86 13800000000', detail: '一号仓', isDefault: true })
  v.regionValue.value = { provinceCode: '44', province: '广东省', cityCode: '4401', city: '广州市',
    districtCode: '440106', district: '天河区' }
}

describe('账户表单与操作的中英文边界', () => {
  it('已显示的地址校验随语言刷新，草稿和写请求保持不变', async () => {
    const { v, api } = await open('subPackages/account/pages/address/form.vue')
    v.form.detail = '保留输入'
    await v.saveAddress()
    expect(v.formError.value).toBe('请输入收货人姓名')
    i18n.setLocale('en')
    expect(v.formError.value).toBe('Enter the recipient name')
    expect(v.form.detail).toBe('保留输入')
    expect(api.createAddress).not.toHaveBeenCalled()
    expect(api.updateAddress).not.toHaveBeenCalled()
    v.clearError()
    expect(v.formError.value).toBe('')
  })

  it('地址保存途中切换语言只处理一次成功结果，地址代码和中文输入不变', async () => {
    let complete
    const createAddress = vi.fn(() => new Promise(resolve => { complete = resolve }))
    const { v, api, navigator } = await open('subPackages/account/pages/address/form.vue', { api: { createAddress } })
    fillAddress(v)
    const draft = JSON.stringify({ ...v.form, ...v.regionValue.value, id: 0 })
    const pending = v.saveAddress()
    expect(v.saving.value).toBe(true)
    i18n.setLocale('en')
    await vue.nextTick()
    expect(api.createAddress).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(api.createAddress.mock.calls[0][0])).toBe(draft)
    complete(12)
    await pending
    expect(v.saving.value).toBe(false)
    expect(uni.showToast).toHaveBeenLastCalledWith({ title: 'Address added', icon: 'success' })
    expect(navigator.redirectTo).toHaveBeenCalledTimes(1)
    expect(api.createAddress).toHaveBeenCalledTimes(1)
  })

  it('保留后端原始 message、errorCode 和 traceId，不按中文猜测翻译', async () => {
    const raw = new errors.AppError('后端业务提示', errors.ErrorKind.BUSINESS,
      { errorCode: 'ADDRESS_EXISTING_CODE', traceId: 'trace-unchanged', code: 400 })
    const { v } = await open('subPackages/account/pages/address/form.vue', {
      api: { createAddress: vi.fn().mockRejectedValue(raw) },
    })
    fillAddress(v)
    await v.saveAddress()
    i18n.setLocale('en')
    expect(v.formFailure.value).toBe(raw)
    expect(v.formError.value).toBe('后端业务提示')
    expect(raw.errorCode).toBe('ADDRESS_EXISTING_CODE')
    expect(raw.traceId).toBe('trace-unchanged')
  })

  it('不存在的编辑地址和无 message 的本地兜底错误可以重新取词', async () => {
    const { v, hooks } = await open('subPackages/account/pages/address/form.vue')
    await hooks.load({ addressId: '88' })
    expect(v.formError.value).toBe('该收货地址不存在或已删除')
    i18n.setLocale('en')
    expect(v.formError.value).toBe('This address does not exist or has been deleted')
  })

  it('地址列表保留网络错误对象，操作菜单翻译时不执行任何地址操作', async () => {
    const network = new errors.AppError('', errors.ErrorKind.NETWORK, { messageKey: 'common.errors.network' })
    const { v, api } = await open('subPackages/account/pages/address/index.vue', {
      api: { getAddressList: vi.fn().mockRejectedValue(network) },
    })
    await v.loadAddresses()
    expect(v.stateDescription.value).toContain('网络')
    v.manageAddress({ id: 25, name: '张三', isDefault: false })
    expect(v.addressActions.value.map(a => a.key)).toEqual(['edit', 'default', 'delete'])
    i18n.setLocale('en')
    expect(v.stateDescription.value).toContain('Unable to connect')
    expect(v.addressActions.value.map(a => a.label)).toEqual(['Edit address', 'Set as default', 'Delete address'])
    expect(api.getAddressList).toHaveBeenCalledTimes(1)
    expect(api.deleteAddress).not.toHaveBeenCalled()
    expect(api.setDefaultAddress).not.toHaveBeenCalled()
    expect(v.manageVisible.value).toBe(true)
    v.manageAddress({ id: 25, isDefault: true })
    expect(v.addressActions.value.map(a => a.key)).toEqual(['edit', 'delete'])
  })

  it('取消删除不写入，主动确认只删除原地址 ID', async () => {
    const { v, api } = await open('subPackages/account/pages/address/index.vue')
    i18n.setLocale('en')
    v.manageAddress({ id: 25, name: '张三', isDefault: false })
    const cancelledDelete = v.selectAddressAction('delete')
    let modal = uni.showModal.mock.lastCall[0]
    expect(modal.cancelText).toBe('Cancel')
    expect(modal.content).toBe('Delete the shipping address for 张三?')
    modal.success({ confirm: false })
    await cancelledDelete
    expect(api.deleteAddress).not.toHaveBeenCalled()
    const confirmedDelete = v.removeAddress({ id: 25, name: '张三' })
    modal = uni.showModal.mock.lastCall[0]
    i18n.setLocale('zh')
    modal.success({ confirm: true })
    await confirmedDelete
    expect(api.deleteAddress).toHaveBeenCalledTimes(1)
    expect(api.deleteAddress).toHaveBeenCalledWith(25)
  })

  it('通知选项重新取词但不保存偏好，只有用户切换原业务字段才保存', async () => {
    const { v, notification } = await open('subPackages/account/pages/notification-settings/index.vue')
    const snapshot = JSON.stringify(v.settings)
    expect(v.businessItems.value[0].label).toBe('订单消息')
    i18n.setLocale('en')
    expect(v.businessItems.value[0].label).toBe('Order alerts')
    expect(v.businessItems.value.map(item => item.key)).toEqual(['order', 'audit', 'bill', 'afterSale'])
    expect(JSON.stringify(v.settings)).toBe(snapshot)
    expect(notification.saveNotificationSettings).not.toHaveBeenCalled()
    v.toggle('vibration', { detail: { value: true } })
    expect(notification.saveNotificationSettings).toHaveBeenCalledWith({ ...JSON.parse(snapshot), vibration: true })
  })

  it('权限名称更新但权限码不变，创建过程中切换不再次提交', async () => {
    vi.useFakeTimers()
    let complete
    const { v, api, navigator } = await open('subPackages/account/pages/sub-account/sub-account-form/index.vue', {
      api: { createSubAccount: vi.fn(() => new Promise(resolve => { complete = resolve })) },
    })
    const codes = v.permissionOptions.value.map(item => item.code)
    Object.assign(v.formData, { username: ' user ', password: ' pass ', realName: ' 张三 ', mobile: '13800000000' })
    v.togglePermission('ORDER_CREATE')
    const pending = v.submitForm()
    i18n.setLocale('en')
    expect(v.permissionOptions.value.map(item => item.code)).toEqual(codes)
    expect(v.permissionOptions.value[0].name).toBe('View orders')
    expect(api.createSubAccount).toHaveBeenCalledTimes(1)
    expect(api.createSubAccount).toHaveBeenCalledWith({ username: 'user', password: ' pass ', realName: '张三',
      mobile: '13800000000', permissions: ['ORDER_CREATE'] })
    complete()
    await pending
    await vi.runAllTimersAsync()
    expect(api.createSubAccount).toHaveBeenCalledTimes(1)
    expect(navigator.back).toHaveBeenCalledTimes(1)
  })

  it('语言不改变冻结主账户或停用子账户的原有权限编辑限制', async () => {
    const { v, user, api } = await open('subPackages/account/pages/sub-account/sub-account-form/index.vue')
    user.isFrozen = true
    i18n.setLocale('en')
    v.togglePermission('ORDER_CREATE')
    await v.submitForm()
    expect(v.formData.permissions).toEqual([])
    expect(api.createSubAccount).not.toHaveBeenCalled()
    user.isFrozen = false
    v.isEdit.value = true
    v.formData.status = 'inactive'
    v.togglePermission('ORDER_CREATE')
    expect(v.formData.permissions).toEqual([])
  })

  it('资金分配保留方向、金额和幂等键，弹窗期间切换语言不执行操作', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(12345)
    const { v, api } = await open('subPackages/account/pages/sub-account/index.vue')
    v.finance.value = { accounts: [{ isMaster: true, accountCustomerId: 100 }], currentAccount: null }
    const account = { id: 7, customerId: 200, name: '张三', status: 'active' }
    const transfer = v.adjustBalance(account, 'allocate')
    const modal = uni.showModal.mock.lastCall[0]
    expect(modal.cancelText).toBe('取消')
    i18n.setLocale('en')
    expect(api.transferDealerBalance).not.toHaveBeenCalled()
    modal.success({ confirm: true, content: '12.50' })
    await transfer
    expect(api.transferDealerBalance).toHaveBeenCalledTimes(1)
    expect(api.transferDealerBalance).toHaveBeenCalledWith({
      fromAccountCustomerId: 100, toAccountCustomerId: 200, amount: 12.5, clientRequestId: 'transfer_12345',
    })
  })

  it('停用确认使用翻译文案但发送原状态事实，取消和无效金额均不提交', async () => {
    const { v, api } = await open('subPackages/account/pages/sub-account/index.vue')
    const account = { id: 7, name: '张三', status: 'active' }
    i18n.setLocale('en')
    const cancelledToggle = v.toggleStatus(account)
    let modal = uni.showModal.mock.lastCall[0]
    expect(modal.title).toBe('Disable account?')
    expect(modal.cancelText).toBe('Cancel')
    i18n.setLocale('zh')
    modal.success({ confirm: false })
    await cancelledToggle
    expect(api.toggleSubAccountStatus).not.toHaveBeenCalled()
    const confirmedToggle = v.toggleStatus(account)
    modal = uni.showModal.mock.lastCall[0]
    modal.success({ confirm: true })
    await confirmedToggle
    expect(api.toggleSubAccountStatus).toHaveBeenCalledTimes(1)
    expect(api.toggleSubAccountStatus).toHaveBeenCalledWith({ subAccountId: 7, active: false })
    const action = vi.fn()
    const invalidAmount = v.promptAmount('title', 'placeholder', action)
    uni.showModal.mock.lastCall[0].success({ confirm: true, content: '-1' })
    await invalidAmount
    expect(action).not.toHaveBeenCalled()
  })

  it('地区面板的保留错误和空白标签刷新，不翻译地区代码名称或重发读取', async () => {
    const getAreaChildren = vi.fn().mockRejectedValue({})
    const { v, api } = await open('subPackages/auth/components/AreaCascadePicker/AreaCascadePickerPanel.vue', {
      api: { getAreaChildren },
    })
    await v.loadOptions(0, '0')
    expect(v.loadErrorMessage.value).toContain('地区加载失败')
    v.draft.provinceCode = '44'
    v.draft.province = '广东省'
    i18n.setLocale('en')
    expect(v.loadErrorMessage.value).toBe('Unable to load regions. Please try again later.')
    expect(v.tabs.value.map(tab => tab.label)).toEqual(['广东省', 'Select city', 'Select district'])
    expect(v.draft.provinceCode).toBe('44')
    expect(api.getAreaChildren).toHaveBeenCalledTimes(1)
    expect(api.getAreaChildren).toHaveBeenCalledWith('0')
  })
})
