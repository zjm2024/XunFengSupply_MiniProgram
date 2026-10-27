import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPageSetup } from './helpers/sfcHarness.js'
import { dialogHarness } from './helpers/dialogHarness.js'

let runtime
let vue
let api
let hooks
let pages
let navigator
let routes
let cartWrite

/** 控制真实页面中写请求何时完成，不使用网络或等待真实时间。 */
function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

/** 推进已知 Promise 链，不触发业务计时器或任何自动重试。 */
async function settle() {
  for (let i = 0; i < 15; i++) await Promise.resolve()
}

/** 返回服务端拥有的状态文案，金额、数量、UTC、allowedActions 不随语言改变。 */
function order(language, id = 88) {
  return {
    orderId: id, orderNo: 'O-' + id, itemCount: 1, totalQuantity: 3, payableAmount: 120.50,
    createdAt: '2026-10-25T00:00:00Z', allowedActions: ['confirmReceipt'],
    customerStatus: { code: 'SERVER_ONLY', text: language === 'en-US' ? 'Server status' : '服务端状态',
      description: language === 'en-US' ? 'Server description' : '服务端说明', metadataComplete: true,
      tone: 'info', showProgress: false },
    items: [{ skuId: 101, productId: 1, quantity: 3, salePrice: 40.1666667, productName: '原始商品名称' }],
    fulfillmentSplits: [],
  }
}

/** 模拟按页返回的后端列表，语种仅决定后端投影文本。 */
function listResult(query, language) {
  return { items: Array.from({ length: 10 }, (_, index) => order(language, (query.pageNum - 1) * 10 + index + 1)),
    totalCount: 25 }
}

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  runtime = await import('@/shared/i18n/index.js')
  vue = await import('vue')
  const { registerMainLocales } = await import('@/app/i18n/registerMain.js')
  registerMainLocales()
  await import('@/subPackages/order/i18n/register.js')
  hooks = { onLoad: [], onShow: [], onHide: [], onUnload: [] }
  pages = []
  navigator = { navigateTo: vi.fn(), back: vi.fn() }
  routes = (await import('@/app/config/routes.js')).routes
  api = {
    getOrderList: vi.fn(query => Promise.resolve(listResult(query, runtime.getLocale()))),
    getOrderDetail: vi.fn(() => Promise.resolve(order(runtime.getLocale()))),
    confirmReceipt: vi.fn().mockResolvedValue({}),
    generateClientRequestId: vi.fn(() => 'preserved-write-key'),
  }
  cartWrite = vi.fn().mockResolvedValue({})
  vi.stubGlobal('uni', { showToast: vi.fn(), showModal: vi.fn(), setClipboardData: vi.fn() })
})

afterEach(async () => {
  for (const callback of hooks.onUnload) callback()
  for (const page of pages) page.stop()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/** 真实页面仅在查询模块替身上执行网络边界，写调用单独计数。 */
async function page(relative) {
  const loaded = await loadPageSetup(relative, async id => {
    if (id === 'vue') return vue
    if (id === '@dcloudio/uni-app') return Object.fromEntries(Object.keys(hooks).map(name =>
      [name, callback => hooks[name].push(callback)]))
    if (id === '@/shared/i18n/index.js') return runtime
    if (id.endsWith('/useAppDialog.js')) return dialogHarness()
    if (id === '@/shared/composables/localeReadCoordinator.js') return import('@/shared/composables/localeReadCoordinator.js')
    if (id.endsWith('/i18n/register.js')) return import('@/subPackages/order/i18n/register.js')
    if (id.endsWith('/api/orderApi.js')) return api
    if (id === '@/shared/api/cartApi.js') return { batchAddToCart: cartWrite }
    if (id === '@/app/navigation/navigator.js') return { navigator }
    if (id === '@/app/config/routes.js') return { routes }
    if (id === '@/app/config/constant.js') return import('@/app/config/constant.js')
    if (id.endsWith('/model/orderActions.js')) return import('@/subPackages/order/model/orderActions.js')
    if (id.endsWith('/model/orderDisplay.js')) return import('@/subPackages/order/model/orderDisplay.js')
    if (id.endsWith('/domain/reorderCart.js')) return import('@/subPackages/order/domain/reorderCart.js')
    if (id.endsWith('/utils/format.js')) return { formatDateTime: value => value }
    if (id.endsWith('/utils/refreshAnimation.js')) return { waitForRefreshAnimation: async () => {} }
    if (id.endsWith('.vue')) return { default: { render: () => null } }
    throw new Error('Unreviewed test import: ' + id)
  })
  pages.push(loaded)
  return loaded.bindings
}

/** 执行页面显示钩子并等待其当前只读流程，避免人为再创建刷新。 */
async function show(bindings) {
  for (const callback of hooks.onShow) callback()
  await bindings.orderRead.activate({ refresh: false })
}

describe('order page locale refresh and transaction safety', () => {
  it('详情菜单重新检查允许动作，刷新后取消动作不会继续导航', async () => {
    const view = await page('subPackages/order/pages/detail/index.vue')
    view.orderId.value = 88
    await show(view)
    view.detail.value.allowedActions = ['pay', 'cancel']
    view.actionMenu.value = { keys: ['cancel'], anchor: { top: 500, bottom: 544, left: 16 } }
    expect(view.overflowActions.value.map(action => action.key)).toEqual(['cancel'])
    view.detail.value.allowedActions = ['pay']
    expect(view.overflowActions.value).toEqual([])
    view.selectOrderAction('cancel')
    expect(navigator.navigateTo).not.toHaveBeenCalled()
    expect(view.actionMenu.value).toBeNull()
    view.selectOrderAction('pay')
    expect(navigator.navigateTo).toHaveBeenCalledTimes(1)
    expect(api.confirmReceipt).not.toHaveBeenCalled()
  })

  it('列表菜单绑定正确订单，空白关闭无写入，已失效菜单动作不可执行', async () => {
    const view = await page('subPackages/order/pages/list/index.vue')
    await show(view)
    const current = view.orderList.value[0]
    current.allowedActions = ['pay', 'cancel']
    view.openActionMenu({ keys: ['cancel'], anchor: { top: 200, bottom: 244, left: 16 } }, current)
    expect(view.overflowActions.value.map(action => action.key)).toEqual(['cancel'])
    current.allowedActions = ['pay']
    view.selectMenuAction('cancel')
    expect(navigator.navigateTo).not.toHaveBeenCalled()
    view.openActionMenu({ keys: ['pay'], anchor: {} }, current)
    view.selectMenuAction('pay')
    expect(navigator.navigateTo).toHaveBeenCalledWith(routes.order.pay(current.orderId))
    expect(view.actionMenu.value).toBeNull()
    expect(cartWrite).not.toHaveBeenCalled()
    expect(api.confirmReceipt).not.toHaveBeenCalled()
  })

  it('translates the filter headings while preserving review exclusions, selection and query facts', async () => {
    const view = await page('subPackages/order/pages/list/index.vue')
    view.currentTab.value = 'erp-pending'
    const queryFacts = () => view.displayTabs.value.map(({ value, orderStatus, erpReviewStatus, excludePendingErpReview }) => ({ value, orderStatus, erpReviewStatus, excludePendingErpReview }))
    const original = queryFacts()
    expect(view.displayTabs.value.map(tab => tab.label)).toEqual(['全部', '待付款', '待确认', '处理中', '交易完成', '已取消'])
    runtime.setLocale('en-US')
    expect(view.displayTabs.value.map(tab => tab.label)).toEqual(['All', 'To pay', 'To confirm', 'Processing', 'Completed', 'Cancelled'])
    expect(queryFacts()).toEqual(original)
    expect(view.currentTab.value).toBe('erp-pending')
    expect(view.currentErpReviewStatus.value).toBe(original[2].erpReviewStatus)
    expect(view.currentExcludePendingErpReview.value).toBe(false)
    expect(view.displayTabs.value[3].excludePendingErpReview).toBe(true)
    expect(api.getOrderList).not.toHaveBeenCalled()
    expect(api.confirmReceipt).not.toHaveBeenCalled()
  })
  it('does not query hidden list pages on language change and preserves the loaded window on return', async () => {
    const view = await page('subPackages/order/pages/list/index.vue')
    await show(view)
    view.loadMore()
    await view.orderRead.activate({ refresh: false })
    view.keywordInput.value = 'keep hidden draft'
    for (const callback of hooks.onHide) callback()
    runtime.setLocale('en')
    await settle()
    expect(api.getOrderList).toHaveBeenCalledTimes(2)
    await show(view)
    expect(api.getOrderList).toHaveBeenCalledTimes(4)
    expect(view.page.current).toBe(2)
    expect(view.orderList.value).toHaveLength(20)
    expect(view.keywordInput.value).toBe('keep hidden draft')
    expect(view.orderList.value[0].customerStatus.text).toBe('Server status')
    expect(api.confirmReceipt).not.toHaveBeenCalled()
    expect(cartWrite).not.toHaveBeenCalled()
  })

  it('re-reads the loaded list window while retaining filters, draft text, pagination and expanded actions', async () => {
    const view = await page('subPackages/order/pages/list/index.vue')
    for (const callback of hooks.onLoad) await callback({})
    await show(view)
    view.loadMore()
    await view.orderRead.activate({ refresh: false })
    expect(view.orderList.value).toHaveLength(20)
    view.keyword.value = 'committed filter'
    view.keywordInput.value = 'unsubmitted draft'
    view.actionMenu.value = { orderId: 1, keys: ['reorder'], anchor: { top: 100, bottom: 144, left: 16 } }
    runtime.setLocale('en')
    await view.orderRead.activate({ refresh: false })
    expect(api.getOrderList).toHaveBeenCalledTimes(4)
    expect(api.getOrderList.mock.calls.slice(-2).map(call => call[0].pageNum)).toEqual([1, 2])
    expect(view.page.current).toBe(2)
    expect(view.orderList.value).toHaveLength(20)
    expect(view.orderList.value[0].customerStatus).toMatchObject({ code: 'SERVER_ONLY', text: 'Server status' })
    expect(view.orderList.value[0].payableAmount).toBe(120.50)
    expect(view.keyword.value).toBe('committed filter')
    expect(view.keywordInput.value).toBe('unsubmitted draft')
    expect(view.actionMenu.value).toBeNull()
    expect(api.confirmReceipt).not.toHaveBeenCalled()
    expect(cartWrite).not.toHaveBeenCalled()
    expect(api.generateClientRequestId).not.toHaveBeenCalled()
  })

  it('never applies a late old-language list response', async () => {
    const old = deferred()
    api.getOrderList.mockImplementationOnce(() => old.promise)
    const view = await page('subPackages/order/pages/list/index.vue')
    const applied = []
    const stop = vue.watch(view.orderList, value => applied.push(value[0]?.customerStatus?.text), { flush: 'sync' })
    const pending = show(view)
    await settle()
    runtime.setLocale('en')
    old.resolve(listResult({ pageNum: 1 }, 'zh-CN'))
    await pending
    expect(api.getOrderList).toHaveBeenCalledTimes(2)
    expect(applied).toEqual(['Server status'])
    expect(view.loadError.value).toBe('')
    stop()
  })

  it('retains detail expansion on language refresh and completes an in-flight confirmation exactly once', async () => {
    const write = deferred()
    api.confirmReceipt.mockReturnValueOnce(write.promise)
    const view = await page('subPackages/order/pages/detail/index.vue')
    for (const callback of hooks.onLoad) await callback({ orderId: '88' })
    await show(view)
    view.collapsedProductGroups.value = { 'spu-1': false }
    view.expandedSplitItems.value = { 5: true }
    view.showSplitHistory.value = true
    const confirmed = view.handleAction('confirmReceipt')
    uni.showModal.mock.calls[0][0].success({ confirm: true })
    await settle()
    expect(api.confirmReceipt).toHaveBeenCalledTimes(1)
    runtime.setLocale('en')
    await view.orderRead.activate({ refresh: false })
    expect(view.detail.value.customerStatus.text).toBe('Server status')
    expect(view.collapsedProductGroups.value).toEqual({ 'spu-1': false })
    expect(view.expandedSplitItems.value).toEqual({ 5: true })
    expect(view.showSplitHistory.value).toBe(true)
    expect(api.confirmReceipt.mock.calls[0][0]).toEqual({ orderId: 88, clientRequestId: 'preserved-write-key' })
    write.resolve({ receiptId: 8 })
    await confirmed
    expect(uni.showToast).toHaveBeenCalledWith({ title: 'Receipt confirmed', icon: 'success' })
    await vi.runAllTimersAsync()
    expect(api.confirmReceipt).toHaveBeenCalledTimes(1)
    expect(api.generateClientRequestId).toHaveBeenCalledTimes(1)
  })

  it('does not discard an in-flight write failure when the display language changes', async () => {
    const write = deferred()
    api.confirmReceipt.mockReturnValueOnce(write.promise)
    const view = await page('subPackages/order/pages/detail/index.vue')
    for (const callback of hooks.onLoad) await callback({ orderId: '88' })
    await show(view)
    const pending = view.handleAction('confirmReceipt')
    uni.showModal.mock.calls[0][0].success({ confirm: true })
    await settle()
    runtime.setLocale('en')
    await view.orderRead.activate({ refresh: false })
    write.reject({ message: '原请求公开错误', errorCode: 'EXISTING_ERROR_CODE', traceId: 'keep-trace' })
    await pending
    expect(uni.showToast).toHaveBeenCalledWith({ title: '原请求公开错误', icon: 'none' })
    expect(api.confirmReceipt).toHaveBeenCalledTimes(1)
  })

  it('does not replay a pending reorder cart write or regenerate its idempotency key', async () => {
    const write = deferred()
    cartWrite.mockReturnValueOnce(write.promise)
    const view = await page('subPackages/order/pages/list/index.vue')
    await show(view)
    const pending = view.reorderOrder({ orderId: 88 })
    await settle()
    const payload = structuredClone(cartWrite.mock.calls[0][0])
    runtime.setLocale('en')
    await view.orderRead.activate({ refresh: false })
    expect(view.reorderingOrderId.value).toBe(88)
    expect(cartWrite).toHaveBeenCalledTimes(1)
    expect(cartWrite.mock.calls[0][0]).toEqual(payload)
    write.resolve({ accepted: true })
    await pending
    await vi.runAllTimersAsync()
    expect(view.reorderingOrderId.value).toBeNull()
    expect(cartWrite).toHaveBeenCalledTimes(1)
    expect(api.generateClientRequestId).toHaveBeenCalledTimes(1)
    expect(navigator.navigateTo).toHaveBeenCalledTimes(1)
  })

  it('translates only whitelisted action labels without mutating the allowedActions response', async () => {
    const { getOrderActionButtons } = await import('@/subPackages/order/model/orderActions.js')
    const allowed = ['pay', 'viewLogistics', 'internalAction', '__proto__']
    const original = [...allowed]
    expect(getOrderActionButtons(allowed).map(item => item.key)).toEqual(['pay', 'viewLogistics'])
    runtime.setLocale('en')
    expect(getOrderActionButtons(allowed).map(item => item.label)).toEqual(['Pay now', 'View tracking'])
    expect(allowed).toEqual(original)
    expect(api.confirmReceipt).not.toHaveBeenCalled()
    expect(cartWrite).not.toHaveBeenCalled()
  })
})
