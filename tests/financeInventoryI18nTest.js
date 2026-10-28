import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPageSetup } from './helpers/sfcHarness.js'
import { dialogHarness } from './helpers/dialogHarness.js'

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
  const storage = new Map()
  vi.stubGlobal('uni', { showToast: vi.fn(), showModal: vi.fn(), requestPayment: vi.fn(), setClipboardData: vi.fn(),
    getStorageSync: vi.fn(key => storage.get(key)), setStorageSync: vi.fn((key, value) => storage.set(key, value)),
    removeStorageSync: vi.fn(key => storage.delete(key)), showLoading: vi.fn(), hideLoading: vi.fn(), getProvider: vi.fn() })
})

afterEach(() => {
  stops.splice(0).forEach(stop => stop())
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** 运行真实页面 setup，隔离后端、原生支付和生命周期，禁止真实资金操作。 */
async function open(relative, supplied = {}) {
  const context = { currentAccount: { accountCustomerId: 100, fundAccountCode: 'FA-100', availableBalance: 200,
    frozenBalance: 10 }, accounts: [], subjectAvailableBalance: 200,
  credit: { totalAmount: 1000, availableAmount: 700, usedAmount: 200, frozenAmount: 100, isFrozen: false } }
  const api = {
    getDealerInventoryList: vi.fn(async () => ({ items: [], totalCount: 0 })), getDealerInventoryDetail: vi.fn(),
    getFundFlowList: vi.fn(async () => ({ items: [], totalCount: 0 })),
    getCreditUsageList: vi.fn(async () => ({ items: [], totalCount: 0 })),
    getBillList: vi.fn(async () => ({ items: [], totalCount: 0 })), getBillDetail: vi.fn(async () => ({})),
    getRechargeList: vi.fn(async () => ({ items: [], totalCount: 0 })), payBill: vi.fn(),
    getDealerFinanceContext: vi.fn(async () => context), createAppRecharge: vi.fn(), createNativeRecharge: vi.fn(),
    getRechargeStatus: vi.fn(async rechargeNo => ({ rechargeNo, status: 0 })), ...supplied.api,
  }
  const hooks = {}, user = vue.reactive({ financeContext: context, updateFinanceContext: vi.fn(),
    hasPermission: vi.fn(() => true) })
  const navigator = { navigateTo: vi.fn(), redirectTo: vi.fn(), back: vi.fn() }
  const routes = { order: { detail: id => '/order/' + id, pay: id => '/pay/' + id, list: params => params },
    account: { inventoryDetail: id => '/inventory/' + id, billDetail: id => '/bill/' + id,
      fundFlow: () => '/fund-flow', creditFlow: () => '/credit-flow', rechargeRecords: () => '/records' },
    content: { help: () => '/help' } }
  const page = await loadPageSetup('subPackages/account/pages/' + relative, async id => {
    if (id === 'vue') return vue
    if (id === '@dcloudio/uni-app') return { onLoad: fn => { hooks.load = fn }, onShow: fn => { hooks.show = fn }, onHide: fn => { hooks.hide = fn }, onUnload: fn => { hooks.unload = fn } }
    if (id.includes('i18n/index')) return i18n
    if (id.includes('/useAppDialog.js')) return dialogHarness()
    if (id.includes('pageState')) return import('@/shared/model/pageState.js')
    if (id.includes('userStore')) return { useUserStore: () => user }
    if (id.includes('navigator')) return { navigator }
    if (id.includes('config/routes')) return { routes }
    if (id.includes('config/constant')) return import('@/app/config/constant.js')
    if (id.includes('utils/format')) return import('@/shared/utils/format.js')
    if (id.includes('utils/qrMatrix')) return import('@/shared/utils/qrMatrix.js')
    if (id.includes('refreshAnimation')) return { waitForRefreshAnimation: vi.fn() }
    if (id.includes('/api/')) return api
    return { default: {} }
  })
  stops.push(page.stop)
  return { v: page.bindings, hooks, api, user, navigator }
}

/** 创建可用的资金账户，测试只修改与准入相关的显式字段。 */
function account(overrides = {}) {
  return { accountCustomerId: 101, accountStatus: 1, financeStatus: 1, canParticipateCombinationPay: true,
    availableBalance: 80, isMaster: true, realName: '张三', username: 'sub-user', ...overrides }
}

/** 设置本地渠道可用及金额，不调用设备或真实支付接口。 */
function readyRecharge(v, channel = 'wechat') {
  v.availableProviders.value = { wechat: true, wechat_native: true, alipay: true }
  v.selectedChannel.value = channel
  v.rechargeAmount.value = '12.50'
}

describe('库存与财务页面显示语言边界', () => {
  it('库存筛选重新取词但保留搜索、原产品、数量和分页参数', async () => {
    const item = { skuId: 9, productName: '原商品', skuName: '蓝色/S', unit: '件', availableQuantity: 1234.5 }
    const { v, api } = await open('inventory/index.vue', {
      api: { getDealerInventoryList: vi.fn(async () => ({ items: [item], totalCount: 1 })) },
    })
    v.keywordInput.value = ' 用户输入 '
    v.keyword.value = '用户输入'
    v.activeTab.value = 'low'
    await v.reload()
    const facts = JSON.stringify(v.items.value)
    expect(v.tabs.value.map(tab => tab.key)).toEqual(['all', 'available', 'low', 'out'])
    expect(v.activeTabLabel.value).toBe('低库存')
    const quantity = v.formatQty(1234.5)
    i18n.setLocale('en')
    expect(v.activeTabLabel.value).toBe('Low stock')
    expect(v.keywordInput.value).toBe(' 用户输入 ')
    expect(v.activeTab.value).toBe('low')
    expect(JSON.stringify(v.items.value)).toBe(facts)
    expect(v.formatQty(1234.5)).toBe(quantity)
    expect(api.getDealerInventoryList).toHaveBeenCalledTimes(1)
    expect(api.getDealerInventoryList).toHaveBeenCalledWith({ pageNum: 1, pageSize: 16,
      keyword: '用户输入', stockStatus: 'low' })
  })

  it('库存详情错误和流水类型更新，SKU 与订单权限判断不变', async () => {
    const { v, api, user, navigator } = await open('inventory/detail.vue')
    await v.loadDetail()
    expect(v.loadError.value).toBe('缺少商品规格参数')
    i18n.setLocale('en')
    expect(v.loadError.value).toBe('Product variant reference is missing')
    expect(v.businessTypeText('PURCHASE_RECEIPT')).toBe('Purchase receipt')
    expect(api.getDealerInventoryDetail).not.toHaveBeenCalled()
    const item = { sourceType: 'ORDER', sourceId: 77 }
    user.hasPermission.mockReturnValue(false)
    v.openSource(item)
    expect(navigator.navigateTo).not.toHaveBeenCalled()
    user.hasPermission.mockReturnValue(true)
    v.openSource(item)
    expect(navigator.navigateTo).toHaveBeenCalledWith('/order/77')
    expect(v.canOpenOrder({ ...item, sourceType: 'TRANSFER' })).toBe(false)
  })

  it.each(['inventory/index.vue', 'fund-flow/index.vue', 'credit-flow/index.vue', 'bill/list.vue', 'recharge/records.vue'])(
    '%s 保留可重新取词的网络错误及原错误身份，不因语言变化重读', async relative => {
      const network = new errors.AppError('', errors.ErrorKind.NETWORK,
        { messageKey: 'common.errors.network', traceId: 'keep-trace', errorCode: 'KEEP-CODE' })
      const api = Object.fromEntries(['getDealerInventoryList', 'getFundFlowList', 'getCreditUsageList',
        'getBillList', 'getRechargeList'].map(name => [name, vi.fn().mockRejectedValue(network)]))
      const { v } = await open(relative, { api })
      await (v.reload || v.resetAndLoad || v.loadBillList)()
      expect(v.loadFailure.value).toBe(network)
      expect(v.loadError.value).toContain('网络')
      i18n.setLocale('en')
      await vue.nextTick()
      expect(v.loadError.value).toContain('Unable to connect')
      expect(network.errorCode).toBe('KEEP-CODE')
      expect(network.traceId).toBe('keep-trace')
      expect(Object.values(api).reduce((n, fn) => n + fn.mock.calls.length, 0)).toBe(1)
    },
  )

  it('无 message 的本地读取兜底可重新取词，后端业务 message 不猜译', async () => {
    const getFundFlowList = vi.fn().mockRejectedValueOnce({}).mockRejectedValueOnce(
      Object.assign(new Error('财务原始提示'), { errorCode: 'EXISTING-CODE' }))
    const { v } = await open('fund-flow/index.vue', { api: { getFundFlowList } })
    await v.resetAndLoad()
    i18n.setLocale('en')
    expect(v.loadError.value).toBe('Unable to load transactions. Please try again later.')
    await v.resetAndLoad()
    i18n.setLocale('zh')
    expect(v.loadError.value).toBe('财务原始提示')
    expect(v.loadFailure.value.errorCode).toBe('EXISTING-CODE')
  })

  it('资金业务类型翻译不改变符号、精度、冻结金额或筛选值', async () => {
    const { v, api } = await open('fund-flow/index.vue')
    const cases = [
      [{ businessType: 'payment', balanceDelta: -12.5, frozenDelta: 0 }, '−¥12.50', 'negative'],
      [{ businessType: 'freeze', balanceDelta: 0, frozenDelta: 10 }, '+¥10.00', 'positive'],
      [{ businessType: 'unfreeze', balanceDelta: 0, frozenDelta: 10 }, '−¥10.00', 'negative'],
      [{ businessType: 'adjustment', balanceDelta: 0, frozenDelta: 0 }, '¥0.00', 'neutral'],
    ]
    v.currentType.value = 'transfer'
    const filters = v.filters.value.map(item => item.value)
    i18n.setLocale('en')
    expect(v.businessTitle('payment')).toBe('Order payment')
    expect(v.businessDescription('freeze')).toContain('frozen')
    expect(v.filters.value.map(item => item.value)).toEqual(filters)
    for (const [item, text, tone] of cases) {
      expect(v.formatChange(item)).toBe(text)
      expect(v.amountClass(item)).toBe(tone)
    }
    expect(v.currentType.value).toBe('transfer')
    expect(api.getFundFlowList).not.toHaveBeenCalled()
  })

  it('授信变动和顶部筛选翻译不改变正负方向及原类型值', async () => {
    const { v, api } = await open('credit-flow/index.vue')
    const values = v.filters.value.map(item => item.value)
    i18n.setLocale('en')
    expect(v.usageTitle(1)).toBe('Order reservation')
    expect(v.filters.value.map(item => item.value)).toEqual(values)
    expect(v.filters.value[4]).toEqual({ label: 'Settled', value: 4 })
    for (const [usageType, text] of [[1, '−¥10.00'], [2, '+¥10.00'], [3, '+¥10.00'], [4, '−¥10.00']]) {
      expect(v.formatChange({ usageType, changedAmount: 10 })).toBe(text)
    }
    expect(api.getCreditUsageList).not.toHaveBeenCalled()
  })

  it('账期显示切换不改变查询 YYYY-MM、状态 0 与金额汇总', async () => {
    const row = { billId: 7, status: 0, totalAmount: 100.5, paidAmount: 20, outstandingAmount: 80.5 }
    const { v, api } = await open('bill/list.vue', {
      api: { getBillList: vi.fn(async () => ({ items: [row], totalCount: 1 })) },
    })
    v.currentMonth.value = '2026-10'
    v.activeStatus.value = 'open'
    await v.loadBillList()
    const display = vue.computed(() => v.formatMonthDisplay(v.currentMonth.value, v.monthDisplayLabel))
    expect(display.value).toBe('2026年10月')
    i18n.setLocale('en')
    expect(display.value).toBe('2026-10')
    expect(v.statusTabs[0].label).toBe('All')
    expect(v.statusTabs.map(tab => tab.label)).toEqual(['All', 'Unsettled', 'Settled', 'Closed'])
    expect(v.statusTabs.map(tab => tab.status)).toEqual([undefined, 0, 1, 2])
    expect(v.statusText(0)).toBe('Unsettled')
    expect(v.visibleBills.value).toHaveLength(1)
    expect(v.overview).toMatchObject({ totalAmount: 100.5, paidAmount: 20, outstandingAmount: 80.5 })
    expect(api.getBillList).toHaveBeenCalledTimes(1)
    expect(api.getBillList).toHaveBeenCalledWith({ billPeriod: '2026-10', status: 0, pageNum: 1, pageSize: 20 })
  })

  it.each(['bill/list.vue', 'bill/detail.vue'])('账单固定状态名称原地切换且保留账单事实：%s', async relative => {
    const { v, api } = await open(relative)
    if (v.bill) Object.assign(v.bill, { billId: 7, status: 0, totalAmount: 2022, paidAmount: 0, outstandingAmount: 2022 })
    const facts = v.bill ? JSON.stringify(v.bill) : JSON.stringify(v.bills.value)
    const statuses = [0, 1, 2, 99]
    expect(statuses.map(v.statusText)).toEqual(['未结清', '已结清', '已关闭', '未知状态'])
    i18n.setLocale('en-US')
    expect(statuses.map(v.statusText)).toEqual(['Unsettled', 'Settled', 'Closed', 'Unknown status'])
    expect(statuses.map(v.statusType)).toEqual(['warning', 'success', 'info', 'default'])
    expect(v.bill ? JSON.stringify(v.bill) : JSON.stringify(v.bills.value)).toBe(facts)
    expect(api.getBillList).not.toHaveBeenCalled()
    expect(api.payBill).not.toHaveBeenCalled()
    i18n.setLocale('zh-CN')
    expect(v.statusText(0)).toBe('未结清')
  })

  it('账期缺省、非法输入与无回调兼容，不改变月份参数', async () => {
    const { v } = await open('bill/list.vue')
    const label = vi.fn(() => 'display')
    expect(v.formatMonthDisplay('2026-01')).toBe('2026年01月')
    expect(v.formatMonthDisplay('2026-01', label)).toBe('display')
    expect(label).toHaveBeenCalledWith('2026', '01')
    expect(v.formatMonthDisplay('', label)).toBe('-')
    expect(v.formatMonthDisplay('invalid', label)).toBe('-')
    expect(v.formatMonthDisplay('2026-01', () => null)).toBe('2026年01月')
  })

  it('还款菜单保留原资格筛选与账户快照，语言更新不会自动选中或提交', async () => {
    const { v, api } = await open('bill/detail.vue')
    const valid = account(), named = account({ accountCustomerId: 102, isMaster: false, realName: '李四' })
    v.finance.value.accounts = [valid, named, account({ accountCustomerId: 103, accountStatus: 0 }),
      account({ accountCustomerId: 104, financeStatus: 0 }), account({ accountCustomerId: 105, availableBalance: 0 }),
      account({ accountCustomerId: 106, canParticipateCombinationPay: false })]
    v.startRepayment()
    expect(v.repaymentAccountOptions.value.map(item => item.account.accountCustomerId)).toEqual([101, 102])
    expect(v.repaymentAccountOptions.value[0].label).toContain('主账户')
    i18n.setLocale('en')
    expect(v.repaymentAccountOptions.value[0].label).toBe('Main account · Available ¥80.00')
    expect(v.repaymentAccountOptions.value[1].label).toContain('李四')
    expect(v.repaymentPickerVisible.value).toBe(true)
    expect(api.payBill).not.toHaveBeenCalled()
    expect(uni.showModal).not.toHaveBeenCalled()
    v.repaymentPickerVisible.value = false
    expect(api.payBill).not.toHaveBeenCalled()
  })

  it('还款取消不提交，选择账户后确认原 min 金额与原幂等字段', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(12345)
    const { v, api } = await open('bill/detail.vue')
    Object.assign(v.bill, { billId: 7, outstandingAmount: 50.25, status: 0 })
    const selected = account({ availableBalance: 80 })
    i18n.setLocale('en')
    v.selectRepaymentAccount(selected)
    const modal = uni.showModal.mock.lastCall[0]
    expect(modal.content).toBe('Deduct ¥50.25 from Main account and restore the same amount of credit?')
    expect(modal.cancelText).toBe('Cancel')
    modal.success({ confirm: false })
    expect(api.payBill).not.toHaveBeenCalled()
    i18n.setLocale('zh')
    const pending = v.submitRepayment(selected, 50.25)
    await pending
    expect(api.payBill).toHaveBeenCalledTimes(1)
    expect(api.payBill).toHaveBeenCalledWith(7, { accountCustomerId: 101, amount: 50.25,
      clientRequestId: 'bill-repay-7-12345' })
  })

  it('还款在途切换和重复点击不重发，成功后继续处理原结果', async () => {
    let complete
    const { v, api } = await open('bill/detail.vue', {
      api: { payBill: vi.fn(() => new Promise(resolve => { complete = resolve })) },
    })
    v.billId.value = 7
    v.bill.billId = 7
    const pending = v.submitRepayment(account(), 12.5)
    i18n.setLocale('en')
    await v.submitRepayment(account(), 12.5)
    expect(api.payBill).toHaveBeenCalledTimes(1)
    complete()
    await pending
    expect(uni.showToast).toHaveBeenLastCalledWith({ title: 'Repayment completed', icon: 'success' })
    expect(api.getBillDetail).toHaveBeenCalledTimes(1)
    expect(v.repaying.value).toBe(false)
  })

  it('充值记录换语言保留服务器状态、错误消息、渠道代码与查询状态参数', async () => {
    const row = { rechargeId: 9, status: 5, failureMessage: '后端原文', payMethod: 'wechat', amount: 12.5 }
    const { v, api } = await open('recharge/records.vue', {
      api: { getRechargeList: vi.fn(async () => ({ items: [row], totalCount: 1 })) },
    })
    v.activeTab.value = 'processing'
    await v.reload()
    const facts = JSON.stringify(v.records.value)
    i18n.setLocale('en')
    expect(v.payMethodText('wechat')).toBe('WeChat top-up')
    expect(v.tabs[0].label).toBe('All')
    expect(v.tabs.map(tab => tab.label)).toEqual(['All', 'To review', 'Processing', 'Credited', 'Failed'])
    expect(v.tabs.map(tab => tab.status)).toEqual([undefined, 6, 1, 2, 3])
    expect(v.statusText(5)).toBe('待确认')
    expect(v.isConfirming(row)).toBe(true)
    expect(JSON.stringify(v.records.value)).toBe(facts)
    expect(api.getRechargeList).toHaveBeenCalledTimes(1)
    expect(api.getRechargeList).toHaveBeenCalledWith({ pageNum: 1, pageSize: 12, status: 1 })
  })

  it('发票和优惠券仅迁移原占位显示，保留入口状态码、优惠券状态与输入', async () => {
    const invoice = await open('invoice/index.vue')
    const voucher = await open('voucher/index.vue')
    voucher.v.exchangeCode.value = ' keep-code '
    voucher.v.voucherList.value = [{ id: 1, status: 'available', name: '原券名', amount: 10, minAmount: 100 }]
    i18n.setLocale('en')
    expect(invoice.v.capabilities.value[0].title).toBe('Company details')
    expect(invoice.v.activeTab.value).toBe('title')
    invoice.v.viewCompletedOrders()
    const constants = await import('@/app/config/constant.js')
    expect(invoice.navigator.navigateTo).toHaveBeenCalledWith({ status: constants.ORDER_STATUS.COMPLETED })
    expect(voucher.v.filteredList.value[0].name).toBe('原券名')
    expect(voucher.v.exchangeCode.value).toBe(' keep-code ')
    expect(voucher.v.renderTabs.value[0].label).toBe('Available(1)')
    expect(voucher.v.renderTabs.value.map(tab => tab.key)).toEqual(['available', 'used', 'expired'])
    expect(voucher.v.renderTabs.value.slice(1).map(tab => tab.label)).toEqual(['Used(0)', 'Expired(0)'])
    expect(uni.showLoading).not.toHaveBeenCalled()
  })
})

describe('充值语言切换与原生支付边界', () => {
  it('订单充值保存上下文、隔离普通充值幂等键，到账后需主动返回收银台', async () => {
    const { v, api, hooks, navigator } = await open('recharge/index.vue', {
      api: { createNativeRecharge: vi.fn(async () => ({ rechargeNo: 'RC-ORDER', status: 2 })) },
    })
    uni.setStorageSync('finance:pending-app-recharge', { clientRequestId: 'ordinary', amount: '12.50', createdAt: Date.now() })
    hooks.load({ orderId: '88', amount: '12.50', channel: 'wechat_native', fundAccountCode: 'FA-ORDER' })
    v.restorePendingRequest()
    expect(v.pendingClientRequestId.value).toBe('')
    await v.startRecharge()
    expect(api.createNativeRecharge).toHaveBeenCalledWith(expect.objectContaining({ amount: 12.5, fundAccountCode: 'FA-ORDER' }))
    expect(api.createNativeRecharge.mock.calls[0][0]).not.toHaveProperty('orderId')
    expect(uni.getStorageSync('finance:pending-app-recharge').clientRequestId).toBe('ordinary')
    expect(navigator.redirectTo).not.toHaveBeenCalled()
    expect(uni.requestPayment).not.toHaveBeenCalled()
    expect(v.confirmedRechargeNo.value).toBe('RC-ORDER')
    v.continueOrderPayment()
    expect(navigator.redirectTo).toHaveBeenCalledWith('/pay/88')
  })

  it('不同订单即使金额与渠道相同也不能复用充值幂等键', async () => {
    const { v, hooks } = await open('recharge/index.vue')
    hooks.load({ orderId: '88' })
    const first = v.ensureClientRequestId('12.50', 'wechat_native')
    hooks.load({ orderId: '99' })
    const next = v.ensureClientRequestId('12.50', 'wechat_native')
    expect(first).not.toBe(next)
    expect(uni.getStorageSync('finance:pending-app-recharge:order:88').clientRequestId).toBe(first)
    expect(uni.getStorageSync('finance:pending-app-recharge:order:99').clientRequestId).toBe(next)
  })

  it('渠道名称响应式更新，渠道代码、provider、金额、能力和幂等上下文不变', async () => {
    const { v, api } = await open('recharge/index.vue')
    readyRecharge(v)
    const channels = v.paymentChannels.map(({ key, provider, disabled }) => ({ key, provider, disabled }))
    expect(v.paymentChannels.map(({ key, icon, useOriginalColor }) => ({ key, icon, useOriginalColor }))).toEqual([
      { key: 'wechat', icon: 'pay-wechat', useOriginalColor: true },
      { key: 'wechat_native', icon: 'pay-wechat', useOriginalColor: true },
      { key: 'alipay', icon: 'pay-alipay', useOriginalColor: true },
      { key: 'abc_cashier', icon: 'bank', useOriginalColor: false },
    ])
    const id = v.ensureClientRequestId('12.50', 'wechat')
    const stored = uni.setStorageSync.mock.lastCall[1]
    expect(v.selectedPaymentChannel.value.title).toBe('微信支付')
    i18n.setLocale('en')
    expect(v.selectedPaymentChannel.value.title).toBe('WeChat Pay')
    expect(v.rechargeButtonText.value).toBe('Top up with WeChat Pay')
    expect(v.paymentChannels.map(({ key, provider, disabled }) => ({ key, provider, disabled }))).toEqual(channels)
    expect(v.ensureClientRequestId('12.50', 'wechat')).toBe(id)
    expect(v.pendingClientRequestId.value).toBe(id)
    expect(v.rechargeAmount.value).toBe('12.50')
    expect(uni.setStorageSync).toHaveBeenCalledTimes(1)
    expect(stored).toMatchObject({ clientRequestId: id, amount: '12.50', channel: 'wechat' })
    expect(api.createAppRecharge).not.toHaveBeenCalled()
    expect(uni.requestPayment).not.toHaveBeenCalled()
  })

  it.each(['wechat', 'alipay'])('%s 创建与 SDK 调起在途切换不重发、不改签名数据', async channel => {
    let complete
    const { v, api, user } = await open('recharge/index.vue', {
      api: { createAppRecharge: vi.fn(() => new Promise(resolve => { complete = resolve })) },
    })
    readyRecharge(v, channel)
    const pending = v.startRecharge()
    const request = api.createAppRecharge.mock.lastCall[0]
    i18n.setLocale('en')
    expect(api.createAppRecharge).toHaveBeenCalledTimes(1)
    expect(request).toMatchObject({ channel, amount: 12.5, fundAccountCode: 'FA-100' })
    expect(Object.keys(request).sort()).toEqual(['amount', 'channel', 'clientRequestId', 'fundAccountCode'])
    const payload = channel === 'alipay' ? 'server-signed-order' : { appid: 'app-test', partnerid: 'merchant-test',
      prepayid: 'prepay-test', package: 'Sign=WXPay', noncestr: 'nonce', timestamp: '12345', sign: 'server-signature' }
    const facts = JSON.stringify(payload)
    complete({ status: 0, clientPayload: payload })
    await vi.waitFor(() => expect(uni.requestPayment).toHaveBeenCalledTimes(1))
    const sdk = uni.requestPayment.mock.lastCall[0]
    expect(sdk.provider).toBe(channel === 'alipay' ? 'alipay' : 'wxpay')
    expect(sdk.orderInfo).toBe(payload)
    expect(JSON.stringify(sdk.orderInfo)).toBe(facts)
    await v.startRecharge()
    expect(api.createAppRecharge).toHaveBeenCalledTimes(1)
    expect(user.updateFinanceContext).not.toHaveBeenCalled()
    sdk.success({})
    await vi.waitFor(() => expect(uni.showModal).toHaveBeenCalledTimes(1))
    const modal = uni.showModal.mock.lastCall[0]
    expect(modal.title).toBe('Confirming payment result')
    expect(modal.content).toContain('Check top-up history')
    expect(v.finance.value.currentAccount.availableBalance).toBe(200)
    modal.success({ confirm: false })
    await pending
    expect(api.createAppRecharge).toHaveBeenCalledTimes(1)
    expect(uni.requestPayment).toHaveBeenCalledTimes(1)
    expect(v.pendingClientRequestId.value).toBe(request.clientRequestId)
    expect(api.getDealerFinanceContext).toHaveBeenCalledTimes(1)
    expect(v.submitting.value).toBe(false)
  })

  it('Native 入口创建扫码充值单并展示二维码，不调用手机支付 SDK', async () => {
    const { v, api } = await open('recharge/index.vue', {
      api: { createNativeRecharge: vi.fn(async () => ({
        status: 0,
        rechargeNo: 'RC-NATIVE-001',
        codeUrl: 'weixin://wxpay/bizpayurl?pr=test',
      })) },
    })
    readyRecharge(v, 'wechat_native')
    await v.startRecharge()
    expect(api.createNativeRecharge).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'wechat_native', amount: 12.5, fundAccountCode: 'FA-100',
    }))
    expect(v.nativeQrVisible.value).toBe(true)
    expect(v.nativeQrNumber.value).toBe('RC-NATIVE-001')
    expect(v.nativeQrMatrix.value.length).toBeGreaterThan(0)
    expect(uni.requestPayment).not.toHaveBeenCalled()
    v.closeNativeQr()
    expect(v.nativeQrVisible.value).toBe(false)
  })

  it('扫码到账单次查询合并在途请求，成功后二维码变结果，不重复充值或本地增加金额', async () => {
    let complete
    const { v, api } = await open('recharge/index.vue', { api: {
      createNativeRecharge: vi.fn(async () => ({ status: 0, rechargeNo: 'RC-SUCCESS', codeUrl: 'weixin://wxpay/bizpayurl?pr=test' })),
      getRechargeStatus: vi.fn(() => new Promise(resolve => { complete = resolve })),
    } })
    readyRecharge(v, 'wechat_native')
    await v.startRecharge()
    const first = v.checkRechargeResult()
    expect(v.checkRechargeResult()).toBe(first)
    expect(api.getRechargeStatus).toHaveBeenCalledTimes(1)
    i18n.setLocale('en')
    complete({ rechargeNo: 'RC-SUCCESS', status: 2 })
    await first
    expect(v.nativeQrStatus.value).toBe(2)
    expect(v.nativeQrVisible.value).toBe(true)
    expect(v.nativeQrMatrix.value).toEqual([])
    expect(v.nativeQrLink.value).toBe('')
    expect(v.pendingClientRequestId.value).toBe('')
    expect(v.finance.value.currentAccount.availableBalance).toBe(200)
    expect(uni.showToast).toHaveBeenCalledWith({ title: 'Top-up successful', icon: 'success' })
    await v.checkRechargeResult()
    expect(api.getRechargeStatus).toHaveBeenCalledTimes(1)
    expect(api.createNativeRecharge).toHaveBeenCalledTimes(1)
    expect(uni.requestPayment).not.toHaveBeenCalled()
  })

  it.each([false, true])('SDK成功和前台补查先后顺序 %s 都只确认一次，不回退确认中', async confirmedBeforeSdk => {
    const payload = { appid: 'a', partnerid: 'p', prepayid: 'pre', package: 'pkg', noncestr: 'n', timestamp: 't', sign: 's' }
    const { v, api } = await open('recharge/index.vue', { api: {
      createAppRecharge: vi.fn(async () => ({ status: 0, rechargeNo: 'RC-SDK', clientPayload: payload })),
      getRechargeStatus: vi.fn(async () => ({ rechargeNo: 'RC-SDK', status: 2 })),
    } })
    readyRecharge(v)
    const pending = v.startRecharge()
    await vi.waitFor(() => expect(uni.requestPayment).toHaveBeenCalledTimes(1))
    if (confirmedBeforeSdk) await v.checkRechargeResult({ silent: true })
    uni.requestPayment.mock.lastCall[0].success({})
    await pending
    expect(api.getRechargeStatus).toHaveBeenCalledWith('RC-SDK')
    expect(api.getRechargeStatus).toHaveBeenCalledTimes(1)
    expect(api.createAppRecharge).toHaveBeenCalledTimes(1)
    expect(uni.showModal).not.toHaveBeenCalled()
    expect(uni.showToast).toHaveBeenCalledWith({ title: i18n.t('account.recharge.successTitle'), icon: 'success' })
  })

  it('回到前台恢复原单号并只查一次，查到成功不重建充值', async () => {
    const { v, hooks, api } = await open('recharge/index.vue', { api: {
      getRechargeStatus: vi.fn(async () => ({ rechargeNo: 'RC-RESUME', status: 2 })),
    } })
    uni.getStorageSync.mockReturnValue({ clientRequestId: 'original-key', rechargeNo: 'RC-RESUME',
      amount: '100', channel: 'wechat_native', createdAt: Date.now() })
    hooks.show()
    await vi.waitFor(() => expect(v.pendingClientRequestId.value).toBe(''))
    expect(api.getRechargeStatus).toHaveBeenCalledWith('RC-RESUME')
    expect(api.getRechargeStatus).toHaveBeenCalledTimes(1)
    expect(api.createNativeRecharge).not.toHaveBeenCalled()
    expect(api.createAppRecharge).not.toHaveBeenCalled()
    expect(uni.requestPayment).not.toHaveBeenCalled()
    expect(uni.showToast).toHaveBeenCalledWith({ title: i18n.t('account.recharge.successTitle'), icon: 'success' })
  })

  it('页面隐藏期间确认成功，返回前台后补显示一次成功提示，不重复查询或充值', async () => {
    let complete
    const { v, hooks, api } = await open('recharge/index.vue', { api: {
      createNativeRecharge: vi.fn(async () => ({ status: 0, rechargeNo: 'RC-HIDDEN', codeUrl: 'weixin://wxpay/bizpayurl?pr=test' })),
      getRechargeStatus: vi.fn(() => new Promise(resolve => { complete = resolve })),
    } })
    readyRecharge(v, 'wechat_native')
    await v.startRecharge()
    const pending = v.checkRechargeResult()
    hooks.hide()
    complete({ rechargeNo: 'RC-HIDDEN', status: 2 })
    await pending
    expect(uni.showToast).not.toHaveBeenCalledWith(expect.objectContaining({ icon: 'success' }))
    i18n.setLocale('en')
    hooks.show()
    hooks.show()
    expect(uni.showToast).toHaveBeenCalledTimes(1)
    expect(uni.showToast).toHaveBeenCalledWith({ title: 'Top-up successful', icon: 'success' })
    expect(api.getRechargeStatus).toHaveBeenCalledTimes(1)
    expect(api.createNativeRecharge).toHaveBeenCalledTimes(1)
    expect(v.nativeQrStatus.value).toBe(2)
  })

  it.each([0, 1, 5])('扫码状态 %s 保留二维码和原请求，不报成功也不启动持续轮询', async status => {
    const { v, api } = await open('recharge/index.vue', { api: {
      createNativeRecharge: vi.fn(async () => ({ status: 0, rechargeNo: 'RC-PENDING', codeUrl: 'weixin://wxpay/bizpayurl?pr=test' })),
      getRechargeStatus: vi.fn(async () => ({ rechargeNo: 'RC-PENDING', status })),
    } })
    readyRecharge(v, 'wechat_native')
    await v.startRecharge()
    const id = v.pendingClientRequestId.value
    await v.checkRechargeResult()
    expect(v.nativeQrMatrix.value.length).toBeGreaterThan(0)
    expect(v.pendingClientRequestId.value).toBe(id)
    expect(v.nativeQrStatus.value).toBe(0)
    expect(uni.showToast).toHaveBeenCalledWith({ title: i18n.t('account.recharge.stillPending'), icon: 'none' })
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(api.getRechargeStatus).toHaveBeenCalledTimes(1)
  })

  it.each([3, 4])('扫码终态 %s 移除二维码并释放当前充值上下文，不显示成功', async status => {
    const { v } = await open('recharge/index.vue', { api: {
      createNativeRecharge: vi.fn(async () => ({ status: 0, rechargeNo: 'RC-CLOSED', codeUrl: 'weixin://wxpay/bizpayurl?pr=test' })),
      getRechargeStatus: vi.fn(async () => ({ rechargeNo: 'RC-CLOSED', status })),
    } })
    readyRecharge(v, 'wechat_native')
    await v.startRecharge()
    await v.checkRechargeResult()
    expect(v.nativeQrStatus.value).toBe(status)
    expect(v.nativeQrMatrix.value).toEqual([])
    expect(v.pendingClientRequestId.value).toBe('')
    expect(uni.showToast).not.toHaveBeenCalledWith(expect.objectContaining({ icon: 'success' }))
  })

  it('查询网络失败保留原支付上下文，旧单查询返回不覆盖后来新建的充值', async () => {
    let complete
    const { v, api } = await open('recharge/index.vue', { api: {
      createNativeRecharge: vi.fn(async () => ({ status: 0, rechargeNo: 'RC-OLD', codeUrl: 'weixin://wxpay/bizpayurl?pr=test' })),
      getRechargeStatus: vi.fn().mockRejectedValueOnce(new Error('network'))
        .mockImplementationOnce(() => new Promise(resolve => { complete = resolve })),
    } })
    readyRecharge(v, 'wechat_native')
    await v.startRecharge()
    const id = v.pendingClientRequestId.value
    await v.checkRechargeResult()
    expect(v.pendingClientRequestId.value).toBe(id)
    expect(v.nativeQrMatrix.value.length).toBeGreaterThan(0)
    const pending = v.checkRechargeResult()
    v.pendingRechargeNo.value = 'RC-NEW'
    complete({ rechargeNo: 'RC-OLD', status: 2 })
    await pending
    expect(v.pendingRechargeNo.value).toBe('RC-NEW')
    expect(v.pendingClientRequestId.value).toBe(id)
    expect(uni.showToast).not.toHaveBeenCalledWith(expect.objectContaining({ icon: 'success' }))
    expect(api.createNativeRecharge).toHaveBeenCalledTimes(1)
  })

  it.each(['0', '-1', '1.234', 'abc'])('无效充值金额 %s 不创建订单或调用原生支付', async amount => {
    const { v, api } = await open('recharge/index.vue')
    readyRecharge(v)
    v.rechargeAmount.value = amount
    i18n.setLocale('en')
    await v.startRecharge()
    expect(uni.showToast).toHaveBeenLastCalledWith({ title: 'Enter a positive amount with up to 2 decimal places', icon: 'none' })
    expect(api.createAppRecharge).not.toHaveBeenCalled()
    expect(uni.requestPayment).not.toHaveBeenCalled()
  })

  it('未配置渠道只提示，不创建充值、生成幂等键或原生调起', async () => {
    const { v, api } = await open('recharge/index.vue')
    readyRecharge(v)
    v.availableProviders.value.wechat = false
    i18n.setLocale('en')
    uni.showModal.mockImplementationOnce(options => options.success({ confirm: true }))
    await v.startRecharge()
    expect(uni.showModal.mock.lastCall[0]).toMatchObject({ title: 'WeChat Pay is unavailable', confirmText: 'Confirm', showCancel: false })
    expect(api.createAppRecharge).not.toHaveBeenCalled()
    expect(uni.setStorageSync).not.toHaveBeenCalled()
    expect(uni.requestPayment).not.toHaveBeenCalled()
  })

  it('原生取消保留未确认的请求标识，语言不改变取消识别和重试事实', async () => {
    const { v, api } = await open('recharge/index.vue', {
      api: { createAppRecharge: vi.fn(async () => ({ status: 0, clientPayload: 'server-signed-order' })) },
    })
    readyRecharge(v, 'alipay')
    i18n.setLocale('en')
    uni.requestPayment.mockImplementation(options => options.fail({ errMsg: 'requestPayment:fail cancel' }))
    await v.startRecharge()
    expect(uni.showToast.mock.lastCall[0].title).toBe('Alipay was canceled. You can try again before the request expires.')
    expect(v.pendingClientRequestId.value).toBe(api.createAppRecharge.mock.lastCall[0].clientRequestId)
    expect(api.createAppRecharge).toHaveBeenCalledTimes(1)
    expect(uni.showModal).not.toHaveBeenCalled()
  })

  it('服务器已到账时仅清理旧请求并提示，不再次调起支付或本地增加余额', async () => {
    const { v, api } = await open('recharge/index.vue', {
      api: { createAppRecharge: vi.fn(async () => ({ status: 2, clientPayload: null })) },
    })
    readyRecharge(v)
    i18n.setLocale('en')
    uni.showModal.mockImplementation(options => options.success?.({ confirm: false }))
    await v.startRecharge()
    expect(api.createAppRecharge).toHaveBeenCalledTimes(1)
    expect(uni.requestPayment).not.toHaveBeenCalled()
    expect(v.pendingClientRequestId.value).toBe('')
    expect(v.finance.value.currentAccount.availableBalance).toBe(200)
    expect(uni.showModal).not.toHaveBeenCalled()
    expect(uni.showToast).toHaveBeenCalledWith({ title: 'Top-up successful', icon: 'success' })
  })

  it('失败响应保留后端原 message，缺失 SDK 参数仍按原边界拒绝支付', async () => {
    const { v, api } = await open('recharge/index.vue', {
      api: { createAppRecharge: vi.fn(async () => ({ status: 3, failureMessage: '服务端失败原因', failureCode: 'KEEP-CODE' })) },
    })
    readyRecharge(v)
    i18n.setLocale('en')
    await v.startRecharge()
    expect(uni.showToast).toHaveBeenLastCalledWith({ title: '服务端失败原因', icon: 'none' })
    expect(v.pendingClientRequestId.value).toBe('')
    expect(uni.requestPayment).not.toHaveBeenCalled()
    expect(() => v.parseWeChatPayOrderInfo('{')).toThrow('Invalid WeChat Pay parameters')
    expect(() => v.parseWeChatPayOrderInfo({ appid: 'test' })).toThrow('parameters are incomplete')
    const payload = { appid: 'a', partnerid: 'p', prepayid: 'pre', package: 'pkg', noncestr: 'n', timestamp: 't', sign: 's' }
    expect(v.parseWeChatPayOrderInfo(payload)).toBe(payload)
    expect(api.createAppRecharge).toHaveBeenCalledTimes(1)
  })
})
