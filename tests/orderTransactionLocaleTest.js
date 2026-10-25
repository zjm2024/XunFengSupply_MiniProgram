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
  hooks = { onLoad: [], onShow: [], onUnmounted: [] }
  pages = []
  navigation = { redirectTo: vi.fn(), navigateTo: vi.fn() }
  orderApi = { getOrderDetail: vi.fn().mockResolvedValue({ orderNo: 'O-88', payableAmount: 120.5,
    orderStatus: 20, paymentStatus: 0, allowedActions: ['pay'], erpReviewStatus: 1 }),
    cancelOrder: vi.fn().mockResolvedValue({}), generateClientRequestId: vi.fn(() => 'fixed-cancel-key') }
  saleApi = { getAfterSaleableItems: vi.fn().mockResolvedValue([{ orderItemId: 101, availableQuantity: 3,
    refundAmount: 120.5, productName: '原商品', skuName: '原规格' }]), applyAfterSale: vi.fn().mockResolvedValue({}),
    getAfterSaleList: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }), cancelAfterSale: vi.fn().mockResolvedValue({}) }
  financeApi = { confirmDealerOrderPayment: vi.fn().mockResolvedValue({}),
    getDealerFinanceContext: vi.fn().mockResolvedValue({ credit: { status: 1, fundAccountCode: 'KEEP-FUND' },
      accounts: [{ accountCustomerId: 7, accountStatus: 1, financeStatus: 1, canParticipateCombinationPay: true, availableBalance: 200, isMaster: true }] }) }
  vi.stubGlobal('uni', { showToast: vi.fn(), showModal: vi.fn() })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  for (const fn of hooks.onUnmounted) fn()
  for (const p of pages) p.stop()
  runtime.setLocale('zh-CN')
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** 加载实际订单页面，支付/售后请求和平台生命周期分别计数。 */
async function load(relative) {
  const page = await loadPageSetup('subPackages/order/pages/' + relative, async id => {
    if (id === 'vue') return { ...vue, onUnmounted: fn => hooks.onUnmounted.push(fn) }
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
  })
  pages.push(page)
  return page.bindings
}

describe('订单写操作在语言切换期间的真实页面回归', () => {
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
    expect(page.form.quantity).toBe(2)
    expect(page.afterSaleTypes.value[1].label).toBe('Return and refund')
    expect(page.requestFingerprint.value).toBe(fingerprint)
    expect(saleApi.applyAfterSale).toHaveBeenCalledTimes(1)
    await page.handleSubmit()
    expect(saleApi.applyAfterSale.mock.calls[1][0]).toEqual(original)
    expect(original).toMatchObject({ orderId: 88, afterSaleType: 2, reason: '原因 user text', items: [{ orderItemId: 101, quantity: 2 }] })
  })

  it('售后读取错误重新显示当前语言，切换不重新拉取列表', async () => {
    const page = await load('after-sale/list.vue')
    saleApi.getAfterSaleList.mockRejectedValueOnce({})
    await page.loadRecords()
    expect(page.loadErrorText.value).toBe('请检查网络后重试')
    runtime.setLocale('en')
    await vue.nextTick()
    expect(page.loadErrorText.value).toBe('Please check your network and try again.')
    expect(saleApi.getAfterSaleList).toHaveBeenCalledTimes(1)
  })
})
