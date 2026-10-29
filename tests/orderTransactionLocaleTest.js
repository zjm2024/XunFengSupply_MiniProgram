import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPageSetup } from './helpers/sfcHarness.js'

let vue, runtime, orderApi, saleApi, financeApi, navigation, hooks, pages

/** 控制写操作返回时机，检查切换语言期间是否保留原结果。 */
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

beforeEach(async () => {
  vi.useFakeTimers()
  runtime = await import('@/shared/i18n/index.js')
  runtime.setLocale('zh-CN')
  vue = await import('vue')
  const { registerMainLocales } = await import('@/app/i18n/registerMain.js')
  registerMainLocales()
  await import('@/subPackages/order/i18n/register.js')
  hooks = { onLoad: [], onShow: [], onUnload: [], onUnmounted: [], onMounted: [] }
  pages = []
  navigation = { redirectTo: vi.fn(), navigateTo: vi.fn() }
  orderApi = { getOrderDetail: vi.fn().mockResolvedValue({ orderNo: 'O-88', payableAmount: 120.5,
    orderStatus: 20, paymentStatus: 0, allowedActions: ['pay'], erpReviewStatus: 1 }),
    cancelOrder: vi.fn().mockResolvedValue({}), generateClientRequestId: vi.fn(() => 'fixed-cancel-key') }
  saleApi = { getAfterSaleableItems: vi.fn().mockResolvedValue([{ orderItemId: 101, availableQuantity: 3,
    refundAmount: 120.5, productName: '原商品', skuName: '原规格' }]), applyAfterSale: vi.fn().mockResolvedValue({}),
    getAfterSaleList: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }), cancelAfterSale: vi.fn().mockResolvedValue({}),
    getAfterSaleDetail: vi.fn(), getAfterSaleCarriers: vi.fn().mockResolvedValue([{ code: 'ZTO', name: '中通快递' }]),
    submitReturnLogistics: vi.fn().mockResolvedValue(true) }
  financeApi = { confirmDealerOrderPayment: vi.fn().mockResolvedValue({}),
    getDealerFinanceContext: vi.fn().mockResolvedValue({ credit: { status: 1, fundAccountCode: 'KEEP-FUND' },
      accounts: [{ accountCustomerId: 7, accountStatus: 1, financeStatus: 1, canParticipateCombinationPay: true, availableBalance: 200, isMaster: true }] }) }
  vi.stubGlobal('uni', { showToast: vi.fn(), showModal: vi.fn() })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  for (const fn of hooks.onUnload) fn()
  for (const fn of hooks.onUnmounted) fn()
  for (const p of pages) p.stop()
  runtime.setLocale('zh-CN')
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** 加载实际订单页面，支付/售后请求和平台生命周期分别计数。 */
async function load(relative, props = {}) {
  const page = await loadPageSetup('subPackages/order/pages/' + relative, async id => {
    if (id === 'vue') return { ...vue, onUnmounted: fn => hooks.onUnmounted.push(fn), onMounted: fn => hooks.onMounted.push(fn) }
    if (id === '@dcloudio/uni-app') return Object.fromEntries(Object.keys(hooks).map(name => [name, fn => hooks[name].push(fn)]))
    if (id.endsWith('/i18n/index.js')) return runtime
    if (id.endsWith('/i18n/register.js')) return import('@/subPackages/order/i18n/register.js')
    if (id.endsWith('/api/orderApi.js')) return orderApi
    if (id.endsWith('/api/afterSaleApi.js')) return saleApi
    if (id.endsWith('/api/dealerFinance.js')) return financeApi
    if (id.endsWith('/api/appError.js')) return import('@/shared/api/appError.js')
    if (id.endsWith('/session/userStore.js')) return { useUserStore: () => ({}) }
    if (id.endsWith('/utils/format.js')) return import('@/shared/utils/format.js')
    if (id.endsWith('/utils/refreshAnimation.js')) return { waitForRefreshAnimation: async () => {} }
    if (id.endsWith('/navigation/navigator.js')) return { navigator: navigation }
    if (id.endsWith('/composables/useAppDialog.js')) return { openAppDialog: vi.fn(() => Promise.resolve(false)) }
    if (id.endsWith('/config/routes.js')) return import('@/app/config/routes.js')
    if (id.endsWith('/config/constant.js')) return import('@/app/config/constant.js')
    if (id.endsWith('.vue')) return { default: { render: () => null } }
    throw new Error('Unreviewed import: ' + id)
  }, props)
  pages.push(page)
  return page.bindings
}

describe('订单写操作在语言切换期间的真实页面回归', () => {
  it('多 SKU 申请独立限制数量，稳定顺序汇总并阻止双击重复提交', async () => {
    saleApi.getAfterSaleableItems.mockResolvedValueOnce([
      { orderItemId: 102, availableQuantity: 2, refundAmount: 10.01 },
      { orderItemId: 101, availableQuantity: 3, refundAmount: 120.5 },
    ])
    const page = await load('after-sale/apply.vue')
    page.orderId.value = '88'
    await page.loadAfterSaleableItems('88')
    page.selectGoods(page.afterSaleItems.value[1])
    page.setQuantity(1, page.afterSaleItems.value[0])
    page.setQuantity(99, page.afterSaleItems.value[1])
    page.form.reason = '多个规格质量问题'
    expect(page.totalQuantity.value).toBe(4)
    expect(page.estimatedRefundAmount.value).toBe(125.51)
    const pending = deferred()
    saleApi.applyAfterSale.mockReturnValueOnce(pending.promise)
    const writing = page.handleSubmit()
    await page.handleSubmit()
    page.toggleAll()
    expect(page.totalQuantity.value).toBe(4)
    expect(saleApi.applyAfterSale).toHaveBeenCalledTimes(1)
    expect(saleApi.applyAfterSale.mock.calls[0][0].items).toEqual([{ orderItemId: 101, quantity: 3 }, { orderItemId: 102, quantity: 1 }])
    pending.resolve({ afterSaleId: 55 })
    await writing
    await page.handleSubmit()
    await vi.advanceTimersByTimeAsync(500)
    expect(saleApi.applyAfterSale).toHaveBeenCalledTimes(1)
    expect(navigation.redirectTo).toHaveBeenCalledWith('/subPackages/order/pages/after-sale/detail?afterSaleId=55')
  })

  it('快速切换售后筛选后丢弃旧读取结果，避免列表被旧状态覆盖', async () => {
    const page = await load('after-sale/list.vue')
    const previous = deferred()
    saleApi.getAfterSaleList.mockReturnValueOnce(previous.promise)
    const first = page.resetAndLoad()
    page.currentStatus.value = 2
    saleApi.getAfterSaleList.mockResolvedValueOnce({ items: [{ afterSaleId: 2, status: 2 }], totalCount: 1 })
    await page.resetAndLoad()
    previous.resolve({ items: [{ afterSaleId: 1, status: 1 }], totalCount: 1 })
    await first
    expect(page.afterSaleList.value).toEqual([{ afterSaleId: 2, status: 2 }])
  })

  it('待退货详情提交原物流快照，语言切换与双击不会重复写，成功刷新真实状态', async () => {
    saleApi.getAfterSaleDetail.mockResolvedValueOnce({ afterSaleId: 55, status: 2, afterSaleType: 2,
      statusName: '待退货', statusNameEn: 'Pending Return', items: [], refundAmount: 10 })
    const page = await load('after-sale/detail.vue')
    hooks.onLoad.at(-1)({ afterSaleId: '55' })
    await hooks.onShow.at(-1)()
    page.chooseCarrier({ detail: { value: '0' } })
    page.logistics.trackingNo = ' 123ABC '
    const pending = deferred()
    saleApi.submitReturnLogistics.mockReturnValueOnce(pending.promise)
    const writing = page.saveLogistics()
    runtime.setLocale('en')
    await page.saveLogistics()
    expect(page.statusName.value).toBe('Pending Return')
    expect(saleApi.submitReturnLogistics).toHaveBeenCalledTimes(1)
    expect(saleApi.submitReturnLogistics).toHaveBeenCalledWith({ afterSaleId: 55, carrierCode: 'ZTO', trackingNo: '123ABC' })
    saleApi.getAfterSaleDetail.mockResolvedValueOnce({ afterSaleId: 55, status: 3, afterSaleType: 2, statusName: '退货中', statusNameEn: '', items: [] })
    pending.resolve(true)
    await writing
    expect(page.detail.value.status).toBe(3)
    expect(page.statusName.value).toBe('退货中')
    await page.saveLogistics()
    expect(saleApi.submitReturnLogistics).toHaveBeenCalledTimes(1)
  })

  it('物流写入失败保留输入、错误和待退货状态，允许明确重试', async () => {
    saleApi.getAfterSaleDetail.mockResolvedValueOnce({ afterSaleId: 55, status: 2, afterSaleType: 2, items: [] })
    const page = await load('after-sale/detail.vue')
    hooks.onLoad.at(-1)({ afterSaleId: '55' })
    await hooks.onShow.at(-1)()
    page.logistics.carrierCode = 'ZTO'
    page.logistics.trackingNo = '123ABC'
    saleApi.submitReturnLogistics.mockRejectedValueOnce(new Error('状态已变更'))
    await page.saveLogistics()
    expect(page.saveError.value).toBe('状态已变更')
    expect(page.logistics.trackingNo).toBe('123ABC')
    expect(page.detail.value.status).toBe(2)
    expect(page.saving.value).toBe(false)
  })

  it('在线充值入口只传本地订单上下文，返回后刷新余额但不自动确认扣款', async () => {
    const page = await load('pay/index.vue')
    await hooks.onLoad[0]({ orderId: '88' })
    page.payMode.value = 1
    page.payType.value = 'wechat_native'
    await page.handleConfirmPay()
    expect(navigation.navigateTo).toHaveBeenCalledTimes(1)
    const target = navigation.navigateTo.mock.lastCall[0]
    expect(target).toContain('orderId=88')
    expect(target).toContain('channel=wechat_native')
    expect(target).not.toContain('erp_order_no')
    expect(financeApi.confirmDealerOrderPayment).not.toHaveBeenCalled()
    for (const show of hooks.onShow) show()
    await Promise.resolve()
    expect(page.payMode.value).toBe(3)
    expect(financeApi.getDealerFinanceContext).toHaveBeenCalledTimes(2)
    expect(financeApi.confirmDealerOrderPayment).not.toHaveBeenCalled()
  })

  it.each([2, 3])('支付模式 %s 的在途请求保持原参数和幂等键，成功结果仍导航原订单', async mode => {
    const page = await load('pay/index.vue')
    await hooks.onLoad[0]({ orderId: '88' })
    page.payMode.value = mode
    const pending = deferred()
    financeApi.confirmDealerOrderPayment.mockReturnValueOnce(pending.promise)
    const running = page.handleConfirmPay()
    const payload = JSON.parse(JSON.stringify(financeApi.confirmDealerOrderPayment.mock.calls[0][0]))
    runtime.setLocale('en')
    await vue.nextTick()
    expect(page.confirmButtonText.value).toBe('Paying...')
    expect(page.paying.value).toBe(true)
    expect(financeApi.confirmDealerOrderPayment).toHaveBeenCalledTimes(1)
    expect(financeApi.confirmDealerOrderPayment.mock.calls[0][0]).toEqual(payload)
    expect(payload).toMatchObject({ orderId: 88, paymentMode: mode })
    expect(payload.clientRequestId).toMatch(mode === 2 ? /^credit-pay-88-/ : /^balance-pay-88-/)
    expect(payload.allocations).toEqual(mode === 2 ? [{ payMethod: 'credit', accountCustomerId: null, amount: 120.5 }]
      : [{ payMethod: 'balance', accountCustomerId: 7, amount: 120.5 }])
    if (mode === 2) expect(payload.fundAccountCode).toBe('KEEP-FUND')
    pending.resolve({})
    await running
    await vi.advanceTimersByTimeAsync(500)
    expect(navigation.redirectTo).toHaveBeenCalledWith('/subPackages/order/pages/detail/index?orderId=88')
    expect(financeApi.getDealerFinanceContext).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['changed_mind', '不想要了/改变主意'], ['duplicate_order', '重复下单'], ['wrong_info', '商品信息/地址填写错误'],
    ['price_reason', '价格原因/更便宜的选择'], ['delivery_too_slow', '发货太慢'],
  ])('英文界面取消原因 %s 仍提交原code及中文事实', async (code, reason) => {
    const page = await load('cancel/index.vue')
    hooks.onLoad[0]({ orderId: '88', orderNo: 'O-88' })
    page.selectedReasonCode.value = code
    runtime.setLocale('en')
    const pending = deferred()
    orderApi.cancelOrder.mockReturnValueOnce(pending.promise)
    const running = page.handleSubmit()
    const payload = { orderId: 88, clientRequestId: 'fixed-cancel-key', reasonCode: code, reason }
    expect(orderApi.cancelOrder).toHaveBeenCalledWith(payload)
    runtime.setLocale('zh-CN')
    await vue.nextTick()
    expect(page.submitting.value).toBe(true)
    expect(orderApi.cancelOrder).toHaveBeenCalledTimes(1)
    pending.resolve({})
    await running
    expect(page.selectedReasonCode.value).toBe(code)
    expect(orderApi.generateClientRequestId).toHaveBeenCalledTimes(1)
  })

  it('售后申请切换语言保留草稿、数量及原指纹，显式失败重试复用原幂等键', async () => {
    const page = await load('after-sale/apply.vue')
    page.orderId.value = '88'
    await page.loadAfterSaleableItems('88')
    page.form.type = 2
    page.form.reason = '  原因 user text  '
    page.setQuantity(2)
    saleApi.applyAfterSale.mockRejectedValueOnce(new Error('原始拒绝'))
    await page.handleSubmit()
    const original = saleApi.applyAfterSale.mock.calls[0][0]
    const fingerprint = page.requestFingerprint.value
    runtime.setLocale('en')
    await vue.nextTick()
    expect(page.form.reason).toBe('  原因 user text  ')
    expect(page.quantities[101]).toBe(2)
    expect(page.form.type).toBe(2)
    expect(page).not.toHaveProperty('afterSaleTypes')
    expect(page.requestFingerprint.value).toBe(fingerprint)
    expect(saleApi.applyAfterSale).toHaveBeenCalledTimes(1)
    await page.handleSubmit()
    expect(saleApi.applyAfterSale.mock.calls[1][0]).toEqual(original)
    expect(original).toMatchObject({ orderId: 88, afterSaleType: 2, reason: '原因 user text', items: [{ orderItemId: 101, quantity: 2 }] })
  })

  it('新版售后展示真实处理节点，并隐藏后端禁止的本地取消入口', async () => {
    const page = await load('after-sale/list.vue')
    expect(page.canCancel({ workflowVersion: 2, status: 1 })).toBe(false)
    expect(page.canCancel({ workflowVersion: 1, status: 1 })).toBe(true)
    expect(page.getProgressHelp({ workflowVersion: 2, status: 1, inventoryStatus: 2, erpSubmissionStatus: 2,
      erpReviewStatus: 1, receiptStatus: 3, pricingStatus: 0 })).toBe('仓库实收数量存在差异，正在核对。')
    runtime.setLocale('en')
    await vue.nextTick()
    expect(page.getProgressHelp({ workflowVersion: 2, status: 1, inventoryStatus: 2, erpSubmissionStatus: 2,
      erpReviewStatus: 1, receiptStatus: 2, pricingStatus: 0 })).toBe('The return is closed. Finance is confirming the refund amount.')
  })

  it('售后读取错误重新显示当前语言，切换不重新拉取列表', async () => {
    const page = await load('after-sale/list.vue')
    saleApi.getAfterSaleList.mockRejectedValueOnce({})
    await page.loadRecords()
    expect(page.loadErrorText.value).toBe('请检查网络后重试')
    const filterValues = page.statusTabs.value.map(tab => tab.value)
    runtime.setLocale('en')
    await vue.nextTick()
    expect(page.loadErrorText.value).toBe('Please check your network and try again.')
    expect(page.statusTabs.value.map(tab => tab.label)).toEqual(['All', 'To review', 'To return', 'Returning', 'Refunding', 'Completed'])
    expect(page.statusTabs.value.map(tab => tab.value)).toEqual(filterValues)
    expect(saleApi.getAfterSaleList).toHaveBeenCalledTimes(1)
  })
})

describe('售后独立详情页与列表导航', () => {
  it('列表进入独立详情，旧带单号链接也直接转详情且不请求列表', async () => {
    const page = await load('after-sale/list.vue')
    page.viewAfterSale({ afterSaleId: 55 })
    expect(navigation.navigateTo).toHaveBeenCalledWith('/subPackages/order/pages/after-sale/detail?afterSaleId=55')
    hooks.onLoad.at(-1)({ afterSaleId: '56' })
    await hooks.onShow.at(-1)()
    expect(navigation.redirectTo).toHaveBeenCalledWith('/subPackages/order/pages/after-sale/detail?afterSaleId=56')
    expect(saleApi.getAfterSaleList).not.toHaveBeenCalled()
  })

  it('无效详情参数不请求接口，卸载后迟到读取不修改状态', async () => {
    const page = await load('after-sale/detail.vue')
    hooks.onLoad.at(-1)({ afterSaleId: 'invalid' })
    await hooks.onShow.at(-1)()
    expect(saleApi.getAfterSaleDetail).not.toHaveBeenCalled()
    expect(page.error.value).toBeTruthy()
    hooks.onLoad.at(-1)({ afterSaleId: '55' })
    const pending = deferred()
    saleApi.getAfterSaleDetail.mockReturnValueOnce(pending.promise)
    const reading = hooks.onShow.at(-1)()
    hooks.onUnload.at(-1)()
    pending.resolve({ afterSaleId: 55, items: [] })
    await reading
    expect(page.detail.value).toBeNull()
  })

  it('从详情返回列表重新读取进度，历史金额不被误标记为待定价', async () => {
    const page = await load('after-sale/list.vue')
    hooks.onLoad.at(-1)({})
    await hooks.onShow.at(-1)()
    await hooks.onShow.at(-1)()
    expect(saleApi.getAfterSaleList).toHaveBeenCalledTimes(2)
    expect(page.isAwaitingPrice({ workflowVersion: 1, sourceType: 1, pricingStatus: 0 })).toBe(false)
    expect(page.isAwaitingPrice({ workflowVersion: 2, sourceType: 2, pricingStatus: 0 })).toBe(true)
  })

  it('申请成功后离开页面取消延迟跳转，避免打断用户新页面', async () => {
    const page = await load('after-sale/apply.vue')
    page.orderId.value = '88'
    await page.loadAfterSaleableItems('88')
    page.form.reason = '原因'
    saleApi.applyAfterSale.mockResolvedValueOnce({ afterSaleId: 55 })
    await page.handleSubmit()
    hooks.onUnload.at(-1)()
    await vi.advanceTimersByTimeAsync(500)
    expect(navigation.redirectTo).not.toHaveBeenCalled()
  })
})

describe('售后导航失败和卸载期间写入', () => {
  it('旧详情链接跳转失败时仍可读取列表', async () => {
    const page = await load('after-sale/list.vue')
    navigation.redirectTo.mockResolvedValueOnce(false)
    await hooks.onLoad.at(-1)({ afterSaleId: '55' })
    expect(saleApi.getAfterSaleList).toHaveBeenCalledTimes(1)
  })
  it('离开申请页后迟到的成功提交不再创建导航定时器', async () => {
    const page = await load('after-sale/apply.vue')
    page.orderId.value = '88'
    await page.loadAfterSaleableItems('88')
    page.form.reason = '原因'
    const pending = deferred()
    saleApi.applyAfterSale.mockReturnValueOnce(pending.promise)
    const writing = page.handleSubmit()
    hooks.onUnload.at(-1)()
    pending.resolve({ afterSaleId: 55 })
    await writing
    await vi.advanceTimersByTimeAsync(500)
    expect(navigation.redirectTo).not.toHaveBeenCalled()
    expect(uni.showToast).not.toHaveBeenCalled()
  })
})
