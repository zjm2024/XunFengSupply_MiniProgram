import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { compile } from '@vue/compiler-dom'
import { renderToString } from '@vue/server-renderer'
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
  await import('@/subPackages/commerce/i18n/register.js')
  vi.stubGlobal('uni', { showToast: vi.fn(), showModal: vi.fn() })
})
afterEach(() => {
  stops.splice(0).forEach(stop => stop())
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** 用真实 setup 运行页面和组件，仅替换网络、导航及原生生命周期。 */
async function open(relative, supplied = {}, props = {}) {
  const item = { cartItemId: 1, productId: 5, skuId: 11, name: '原商品', skuName: '蓝色/S', selected: true,
    quantity: 2, price: 10, stock: 20, minOrderQty: 1, unit: '件' }
  const cartStore = vue.reactive({ items: [item], validItems: [item], invalidItems: [], selectedItems: [item],
    loaded: true, loading: false, hasSelected: true, formattedTotalAmount: '¥20.00',
    summary: { selectedCount: 1, selectedQuantity: 2, totalQuantity: 2, allQuantity: 2, invalidCount: 0,
      isOverLimit: false, remainingLimit: 99980, discountAmount: 0 },
    optimisticRemove: vi.fn(), isItemSelected: row => row.selected !== false })
  const hook = { cartStore, loadCart: vi.fn(async () => cartStore.items), flush: vi.fn(),
    flushError: vue.ref(null), submitting: vue.ref(false), deleteItems: vi.fn(), clearAll: vi.fn(),
    toggleSelect: vi.fn(), batchSetSelected: vi.fn(), selectAllItems: vi.fn(), setItemQuantity: vi.fn(),
    addSkuToCart: vi.fn(async () => true), batchAddSkuToCart: vi.fn(async () => true), ...supplied.hook }
  const quote = { items: [{ skuId: 11, quantity: 2, salePrice: 10, basePrice: 10, availableStock: 20 }],
    goodsAmount: 20, discountAmount: 0, freightAmount: 3, payableAmount: 23, quoteFingerprint: 'stable-quote',
    stockAvailable: true, giftStockAvailable: true }
  const api = { previewOrder: vi.fn(async () => quote), createOrder: vi.fn(async () => ({ orderId: 70 })),
    generateClientRequestId: vi.fn(() => 'stable-order-key'), removeItems: vi.fn(),
    getExpressCompanies: vi.fn(async () => [{ code: 'SF', name: '顺丰' }]),
    getAddressList: vi.fn(async () => [{ id: 19, name: '张三', phone: '13800000000', fullAddress: '原地址', isDefault: true }]),
    getGoodsDetail: vi.fn(async () => null), getGoodsList: vi.fn(async () => ({ items: [], totalCount: 0 })),
    getCategoryList: vi.fn(async () => []), ...supplied.api }
  const user = vue.reactive({ canOrder: true }), hooks = {}
  const navigator = { navigateTo: vi.fn(), redirectTo: vi.fn(), back: vi.fn() }
  const route = name => value => ({ name, value })
  const routes = { commerce: { cart: route('cart'), checkout: route('checkout'), productDetail: route('product'),
    productList: route('catalog'), productVariants: route('variants') }, account: { address: route('address') },
    order: { pay: route('pay'), list: route('orders') } }
  const view = await loadPageSetup('subPackages/commerce/' + relative, async id => {
    if (id === 'vue') return { ...vue, onMounted: () => {}, onBeforeUnmount: () => {}, onUnmounted: () => {} }
    if (id === '@dcloudio/uni-app') return Object.fromEntries(['onLoad', 'onShow', 'onHide', 'onUnload', 'onBackPress']
      .map(name => [name, fn => { hooks[name] = fn }]))
    if (id.includes('i18n/index')) return i18n
    if (id.includes('appError')) return errors
    if (id.includes('/useAppDialog.js')) return dialogHarness()
    if (id.includes('composables/useCart')) return { useCart: () => hook }
    if (id.includes('userStore')) return { useUserStore: () => user }
    if (id.includes('pageState')) return import('@/shared/model/pageState.js')
    if (id.includes('config/constant')) return import('@/app/config/constant.js')
    if (id.includes('navigator')) return { navigator }
    if (id.includes('config/routes')) return { routes }
    if (id.includes('cartGrouping')) return import('@/subPackages/commerce/model/cartGrouping.js')
    if (id.includes('utils/format')) return import('@/shared/utils/format.js')
    if (id.includes('utils/priceDisplay.js')) return import('@/shared/utils/priceDisplay.js')
    if (id.includes('refreshAnimation')) return { waitForRefreshAnimation: vi.fn() }
    if (id.includes('/api/')) return api
    return { default: { render: () => null } }
  }, props)
  stops.push(view.stop)
  return { ...view, v: view.bindings, api, hook, user, navigator, hooks, relative }
}

/** 对保留的真实 setup 绑定渲染模板快照，不冒充原生控件或真机布局。 */
async function renderPanel(view) {
  const file = resolve('src/subPackages/commerce', view.relative)
  const descriptor = parse(readFileSync(file, 'utf8')).descriptor
  const render = new Function('Vue', compile(descriptor.template.content, { mode: 'function',
    isCustomElement: tag => ['view', 'text', 'scroll-view', 'input', 'button'].includes(tag) }).code)(vue)
  const context = vue.proxyRefs({ ...view.props, ...view.bindings, $slots: {} })
  const app = vue.createSSRApp({ render: () => render(context, []) })
  app.config.warnHandler = () => {}
  for (const name of ['AppIcon', 'AppProductImage', 'QuantityStepper']) app.component(name, { render: () => null })
  return renderToString(app)
}

/** 准备一份可提交的真实结算页面状态，不执行写操作。 */
async function checkout(supplied = {}) {
  const view = await open('pages/checkout/index.vue', supplied)
  await view.v.loadCheckoutData()
  view.v.agreed.value = true
  return view
}

describe('购物车与结算语言切换', () => {
  it('已打开删除弹窗换语言时保留原商品名与待删除 ID，确认才执行一次删除', async () => {
    const { v, hook } = await open('pages/cart/index.vue')
    v.deleteOne(1)
    expect(v.deleteConfirmText.value).toBe('确定从购物车移除「原商品」？')
    i18n.setLocale('en')
    expect(v.deleteConfirmTitle.value).toBe('Remove item?')
    expect(v.deleteConfirmText.value).toBe('Remove “原商品” from your cart?')
    expect(v.showDeleteConfirm.value).toBe(true)
    expect(hook.deleteItems).not.toHaveBeenCalled()
    expect(hook.flush).not.toHaveBeenCalled()
    await v.confirmDelete()
    expect(hook.deleteItems).toHaveBeenCalledTimes(1)
    expect(hook.deleteItems).toHaveBeenCalledWith([1])
  })

  it('清空确认文案更新不执行清空，选中数量与管理模式保留', async () => {
    const { v, hook } = await open('pages/cart/index.vue')
    v.isManaging.value = true
    v.requestClearAll()
    i18n.setLocale('en')
    expect(v.deleteConfirmText.value).toBe('Clear all 1 SKUs from your cart? This cannot be undone.')
    expect(v.isManaging.value).toBe(true)
    expect(v.managementSelectedCount.value).toBe(1)
    expect(hook.clearAll).not.toHaveBeenCalled()
    v.showDeleteConfirm.value = false
    expect(hook.clearAll).not.toHaveBeenCalled()
  })

  it('购物车保留网络错误对象供重新取词，不重载或触发数量同步', async () => {
    const raw = new errors.AppError('', errors.ErrorKind.NETWORK, { messageKey: 'common.errors.network', errorCode: 'KEEP' })
    const { v, hook } = await open('pages/cart/index.vue', { hook: { loadCart: vi.fn().mockRejectedValue(raw) } })
    await v.refreshCart()
    i18n.setLocale('en')
    expect(v.loadFailure.value).toBe(raw)
    expect(v.loadError.value).toContain('Unable to connect')
    expect(raw.errorCode).toBe('KEEP')
    expect(hook.loadCart).toHaveBeenCalledTimes(1)
    expect(hook.setItemQuantity).not.toHaveBeenCalled()
  })

  it('结算页换语言保留地址、承运商、备注、金额、草稿与幂等键且不重新核价', async () => {
    const { v, api } = await checkout()
    v.customerRemark.value = ' 保留备注 '
    v.clientRequestId.value = 'existing-key'
    v.collapsedCheckoutGroupKeys.value = { group: false }
    const snapshot = JSON.stringify({ items: v.checkoutItems.value, quote: v.previewData.value,
      address: v.selectedAddress.value, carrier: v.expressCompanyCode.value, payable: v.payableAmount.value })
    i18n.setLocale('en')
    expect(v.submitButtonText.value).toBe('Submit order')
    expect(v.confirmDescription.value).toContain('2 items')
    expect(v.confirmPreviewText.value).toBe('Total due ¥23.00')
    expect(v.customerRemark.value).toBe(' 保留备注 ')
    expect(v.clientRequestId.value).toBe('existing-key')
    expect(v.collapsedCheckoutGroupKeys.value).toEqual({ group: false })
    expect(v.canSubmit.value).toBe(true)
    expect(JSON.stringify({ items: v.checkoutItems.value, quote: v.previewData.value,
      address: v.selectedAddress.value, carrier: v.expressCompanyCode.value, payable: v.payableAmount.value })).toBe(snapshot)
    expect(api.previewOrder).toHaveBeenCalledTimes(1)
    expect(api.createOrder).not.toHaveBeenCalled()
    expect(api.getAddressList).toHaveBeenCalledTimes(1)
  })

  it('下单在途切换不重复提交，原 DTO、核价指纹和购物车清理结果完整处理', async () => {
    let complete
    const { v, api, hook, navigator } = await checkout({ api: { createOrder: vi.fn(() => new Promise(resolve => { complete = resolve })) } })
    v.customerRemark.value = ' 需要包装 '
    const pending = v.confirmSubmit()
    i18n.setLocale('en')
    await v.confirmSubmit()
    expect(api.createOrder).toHaveBeenCalledTimes(1)
    const constants = await import('@/app/config/constant.js')
    expect(api.createOrder.mock.lastCall[0]).toEqual({ ClientRequestId: 'stable-order-key', CartItemIds: [1], Items: [{ SkuId: 11, Quantity: 2 }],
      AddressId: 19, QuoteFingerprint: 'stable-quote', PaymentMode: constants.PAYMENT_MODE.CASH,
      DeliveryType: constants.DELIVERY_TYPE.DELIVERY, ExpressCompanyCode: 'SF', CustomerRemark: '需要包装', OmitUnavailableGifts: false })
    complete({ orderId: 70 })
    await pending
    expect(api.removeItems).not.toHaveBeenCalled()
    expect(hook.cartStore.optimisticRemove).toHaveBeenCalledWith([1])
    expect(navigator.redirectTo).toHaveBeenCalledWith({ name: 'pay', value: 70 })
    expect(v.submitting.value).toBe(false)
    expect(api.createOrder).toHaveBeenCalledTimes(1)
  })

  it('购物车清理由服务端事务完成，不发送迟到删除请求', async () => {
    const { v, api, navigator } = await checkout({ api: { removeItems: vi.fn().mockRejectedValue(new Error('cleanup failed')) } })
    i18n.setLocale('en')
    await v.confirmSubmit()
    expect(api.createOrder).toHaveBeenCalledTimes(1)
    expect(navigator.redirectTo).toHaveBeenCalledWith({ name: 'pay', value: 70 })
    expect(api.removeItems).not.toHaveBeenCalled()
  })

  it('共享购物车冲突保留当前结算快照，不执行本地或服务端删除', async () => {
    const raw = Object.assign(new Error('购物车内容已变化，请刷新'), { httpStatus: 409, errorCode: 'CONFLICT' })
    const { v, api, hook, navigator } = await checkout({ api: { createOrder: vi.fn().mockRejectedValue(raw) } })
    await v.confirmSubmit()
    expect(api.createOrder.mock.lastCall[0].CartItemIds).toEqual([1])
    expect(api.removeItems).not.toHaveBeenCalled()
    expect(hook.cartStore.optimisticRemove).not.toHaveBeenCalled()
    expect(navigator.redirectTo).not.toHaveBeenCalled()
    expect(v.checkoutItems.value).toHaveLength(1)
    expect(v.submitting.value).toBe(false)
  })

  it('网络结果未知后重试复用原订单请求和购物车行，不生成第二个下单意图', async () => {
    const createOrder = vi.fn().mockRejectedValueOnce(new Error('network timeout')).mockResolvedValueOnce({ orderId: 70 })
    const { v, api, hook } = await checkout({ api: { createOrder } })
    await v.confirmSubmit()
    expect(hook.cartStore.optimisticRemove).not.toHaveBeenCalled()
    await v.confirmSubmit()
    expect(api.createOrder.mock.calls.map(([request]) => request.ClientRequestId)).toEqual(['stable-order-key', 'stable-order-key'])
    expect(api.createOrder.mock.calls.map(([request]) => request.CartItemIds)).toEqual([[1], [1]])
    expect(api.removeItems).not.toHaveBeenCalled()
    expect(hook.cartStore.optimisticRemove).toHaveBeenCalledTimes(1)
  })

  it('赠品不足拒绝继续时不重发下单，原 errorCode 不变', async () => {
    const raw = Object.assign(new Error('原赠品提示'), { errorCode: 'ORDER_GIFT_STOCK_INSUFFICIENT' })
    const { v, api } = await checkout({ api: { createOrder: vi.fn().mockRejectedValue(raw) } })
    i18n.setLocale('en')
    uni.showModal.mockImplementation(options => options.success({ confirm: false }))
    await v.confirmSubmit()
    expect(uni.showModal.mock.lastCall[0]).toMatchObject({ title: 'Insufficient gift stock', confirmText: 'Omit gifts', cancelText: 'Do not order yet' })
    expect(api.createOrder).toHaveBeenCalledTimes(1)
    expect(v.omitUnavailableGifts.value).toBe(false)
    expect(raw.errorCode).toBe('ORDER_GIFT_STOCK_INSUFFICIENT')
  })

  it('只有用户确认放弃赠品后才沿用原重试，保持相同 ClientRequestId', async () => {
    const raw = Object.assign(new Error('原赠品提示'), { errorCode: 'ORDER_GIFT_STOCK_INSUFFICIENT' })
    const createOrder = vi.fn().mockRejectedValueOnce(raw).mockResolvedValueOnce({ orderId: 71 })
    const { v, api, navigator } = await checkout({ api: { createOrder } })
    uni.showModal.mockImplementation(options => { i18n.setLocale('en'); options.success({ confirm: true }) })
    await v.confirmSubmit()
    expect(api.createOrder).toHaveBeenCalledTimes(2)
    expect(api.createOrder.mock.calls.map(([request]) => request.ClientRequestId)).toEqual(['stable-order-key', 'stable-order-key'])
    expect(api.createOrder.mock.calls.map(([request]) => request.OmitUnavailableGifts)).toEqual([false, true])
    expect(navigator.redirectTo).toHaveBeenCalledWith({ name: 'pay', value: 71 })
  })

  it('在途核价切换不重读，旧指纹按原响应更新，原料 SKU/地址/承运商不变', async () => {
    let complete
    const { v, api } = await checkout()
    api.previewOrder.mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    const pending = v.refreshPreview()
    const snapshot = JSON.stringify(api.previewOrder.mock.lastCall[0])
    i18n.setLocale('en')
    expect(v.submitButtonText.value).toBe('Calculating…')
    expect(api.previewOrder).toHaveBeenCalledTimes(2)
    complete({ items: [{ skuId: 11, quantity: 2, salePrice: 12, availableStock: 20 }],
      goodsAmount: 24, freightAmount: 3, payableAmount: 27, quoteFingerprint: 'new-quote' })
    await pending
    expect(JSON.stringify(api.previewOrder.mock.lastCall[0])).toBe(snapshot)
    expect(v.previewData.value.quoteFingerprint).toBe('new-quote')
    expect(v.payableAmount.value).toBe(27)
    expect(api.createOrder).not.toHaveBeenCalled()
  })

  it('承运商本地错误经原包装链仍可重新取词，不把错误码加入页面包装错误', async () => {
    const { v, api } = await open('pages/checkout/index.vue', { api: { getExpressCompanies: vi.fn(async () => []) } })
    await v.loadCheckoutData()
    expect(v.errorMessage.value).toContain('暂无可用承运商')
    i18n.setLocale('en')
    expect(v.carrierError.value).toBe('No carriers are available. Contact your administrator.')
    expect(v.errorMessage.value).toBe(v.carrierError.value)
    expect(v.pageFailure.value.errorCode).toBeUndefined()
    expect(api.getExpressCompanies).toHaveBeenCalledTimes(1)
    expect(api.previewOrder).not.toHaveBeenCalled()
  })

  it('核价错误保留原预览与原始后端 message/errorCode，切换不掩盖失败', async () => {
    const { v, api } = await checkout()
    const previous = v.previewData.value
    const raw = Object.assign(new Error('后端原始核价提示'), { errorCode: 'EXISTING-QUOTE-CODE', traceId: 'trace-keep' })
    api.previewOrder.mockRejectedValueOnce(raw)
    await v.refreshPreview({ silent: true })
    i18n.setLocale('en')
    expect(v.previewData.value).toBe(previous)
    expect(v.previewFailure.value).toBe(raw)
    expect(v.previewError.value).toBe('后端原始核价提示')
    expect(raw.errorCode).toBe('EXISTING-QUOTE-CODE')
    expect(v.canSubmit.value).toBe(false)
    expect(api.previewOrder).toHaveBeenCalledTimes(2)
  })
})

describe('商品操作面板语言切换', () => {
  it('商品详情保留原介绍/参数/规格，当前选择和库存状态不会被语言重建', async () => {
    const { v, api } = await open('pages/product/detail.vue')
    const product = { productId: 5, code: 'CODE-1', name: '原商品', unit: '双', description: '<p>原介绍</p>',
      categoryName: '原分类', skus: [{ skuId: 11, specName: '红色/M', price: 10, stock: 150, stockKnown: true, canPurchase: true, minOrderQty: 2 }], promotions: [] }
    v.product.value = product
    v.selectedSkuId.value = 11
    v.purchaseSheetVisible.value = true
    const status = JSON.stringify(v.stockStatus.value)
    i18n.setLocale('en')
    expect(v.selectedSkuSummary.value).toBe('Selected 红色/M; minimum 2 双')
    expect(v.productParams.value[0]).toEqual({ label: 'Product code', value: 'CODE-1' })
    expect(v.productParams.value[2].value).toBe('原分类')
    expect(v.detailHtml.value).toBe('<p>原介绍</p>')
    expect(JSON.stringify(v.stockStatus.value)).toBe(status)
    expect(v.selectedSkuId.value).toBe(11)
    expect(v.purchaseSheetVisible.value).toBe(true)
    expect(api.getGoodsDetail).not.toHaveBeenCalled()
  })

  it('批量采购保留数量、颜色键、折叠与幂等键，在途切换只提交一次原批次', async () => {
    vi.useFakeTimers()
    let complete
    const { v, hook } = await open('pages/product/variants.vue', { hook: {
      batchAddSkuToCart: vi.fn(() => new Promise(resolve => { complete = resolve })),
    } })
    v.product.value = { unit: '件', skus: [{ skuId: 11, colorId: 9, colorName: '原色', specName: '原规格',
      canPurchase: true, price: 10, stock: 20, minOrderQty: 2 }] }
    v.quantities.value = { 11: 4 }
    v.collapsedGroupKeys.value = { 9: true }
    v.batchRequestId.value = 'batch-key'
    const pending = v.submit()
    i18n.setLocale('en')
    expect(v.quantities.value).toEqual({ 11: 4 })
    expect(v.skuGroups.value[0].key).toBe('9')
    expect(v.collapsedGroupKeys.value).toEqual({ 9: true })
    expect(v.totalAmount.value).toBe(40)
    expect(hook.batchAddSkuToCart).toHaveBeenCalledTimes(1)
    expect(hook.batchAddSkuToCart).toHaveBeenCalledWith([{ skuId: 11, quantity: 4 }], 'batch-key')
    complete(true)
    await pending
    expect(uni.showToast.mock.lastCall[0].title).toBe('Added to cart')
  })

  it('批量校验文案换语言仍阻止原低于起订量/超库存输入', async () => {
    const { v, hook } = await open('pages/product/variants.vue')
    v.product.value = { skus: [{ skuId: 11, specName: '原规格', canPurchase: true, minOrderQty: 2, stock: 5 }] }
    v.quantities.value = { 11: 1 }
    expect(v.validationMessage.value).toContain('不得低于')
    i18n.setLocale('en')
    expect(v.validationMessage.value).toBe('原规格 requires at least 2 items')
    expect(v.canSubmit.value).toBe(false)
    await v.submit()
    v.quantities.value = { 11: 6 }
    expect(v.validationMessage.value).toBe('原规格 exceeds available stock')
    expect(hook.batchAddSkuToCart).not.toHaveBeenCalled()
  })

  it('目录筛选与排序显示更新，真实查询只含原字段、顺序和分类代码', async () => {
    const { v, api } = await open('pages/product/list.vue')
    v.keyword.value = ' 原搜索 '
    v.activeCategoryId.value = 7
    v.sortKey.value = 'priceAsc'
    v.stockFilter.value = 'inStock'
    const history = [...v.searchRecommendations.value]
    i18n.setLocale('en')
    expect(v.activeSort.value.label).toBe('Price: low to high')
    expect(v.activeStockFilterLabel.value).toBe('In stock only')
    expect(v.searchRecommendations.value).toEqual(history)
    expect(api.getGoodsList).not.toHaveBeenCalled()
    await v.loadProducts()
    expect(api.getGoodsList).toHaveBeenCalledWith({ pageNum: 1, pageSize: v.pageSize.value, categoryId: 7,
      keyword: '原搜索', stockFilter: 'inStock', sortField: 'price', sortOrder: 'asc' })
  })

  it('单规格抽屉打开后换语言不重置颜色、尺码、数量，只按原值确认', async () => {
    const sku = { skuId: 11, colorId: 9, colorName: '红色', sizeName: 'M', canPurchase: true,
      stockKnown: true, stock: 20, minOrderQty: 2, price: 10 }
    const view = await open('components/SingleSkuPurchaseSheet/SingleSkuPurchaseSheet.vue', {}, {
      visible: true, product: { unit: '件', skus: [sku] }, initialSkuId: 11, submitting: false,
    })
    view.v.quantity.value = 5
    const state = [view.v.selectedColorKey.value, view.v.selectedSkuId.value, view.v.stockText.value]
    i18n.setLocale('en')
    await vue.nextTick()
    expect(view.v.minimumText.value).toBe('Minimum 2 件')
    expect(view.v.quantity.value).toBe(5)
    expect([view.v.selectedColorKey.value, view.v.selectedSkuId.value, view.v.stockText.value]).toEqual(state)
    expect(view.events).toEqual([])
    view.v.confirm()
    expect(view.events).toEqual([['confirm', { sku, quantity: 5 }]])
  })

  it('配送抽屉真实模板换英文，保留草稿代码与原承运商名，确认才发送事件', async () => {
    const option = { code: 'SF', name: '顺丰' }
    const view = await open('components/ExpressCompanyPicker/ExpressCompanyPicker.vue', {},
      { visible: false, modelValue: 'SF', options: [option] })
    view.props.visible = true
    await vue.nextTick()
    expect(await renderPanel(view)).toContain('选择配送方式')
    i18n.setLocale('en')
    const html = await renderPanel(view)
    expect(html).toContain('Choose delivery method')
    expect(html).toContain('Cancel')
    expect(html).toContain('顺丰')
    expect(view.v.draftCode.value).toBe('SF')
    expect(view.events).toEqual([])
    view.v.handleConfirm()
    expect(view.events).toEqual([['update:modelValue', 'SF'], ['confirm', option], ['update:visible', false]])
  })

  it('筛选抽屉草稿不随语言复位，原分类 ID/库存与排序值只在应用时输出', async () => {
    const category = { id: 7, name: '原分类' }
    const view = await open('components/ProductFilterDrawer/ProductFilterDrawer.vue', {}, {
      visible: false, categoryTree: [category], categoryPath: [category], stockFilter: 'inStock', sortKey: 'priceAsc',
    })
    view.props.visible = true
    await vue.nextTick()
    i18n.setLocale('en')
    expect(view.v.stockOptions.value[1].label).toBe('In stock only')
    expect(view.v.draftCategoryPath.value).toEqual([category])
    expect(view.v.draftStockFilter.value).toBe('inStock')
    expect(view.v.draftSortKey.value).toBe('priceAsc')
    expect(view.events).toEqual([])
    view.v.applyFilters()
    expect(view.events).toEqual([['apply', { categoryPath: [category], stockFilter: 'inStock', sortKey: 'priceAsc' }]])
  })
})

describe('购物车搜索与操作范围', () => {
  /** 以可搜索和隐藏的有效、失效明细运行真实页面事件。 */
  async function searchedCart() {
    const view=await open('pages/cart/index.vue'),store=view.hook.cartStore
    store.items=[
      {cartItemId:1,productId:5,skuId:11,name:'训练服',skuName:'蓝色 / S',skuCode:'KH-001',barcode:'00123',selected:true,quantity:2,price:10},
      {cartItemId:2,productId:5,skuId:12,name:'训练服',skuName:'红色 / M',skuCode:'KH-002',selected:true,quantity:3,price:10},
      {cartItemId:3,productId:6,skuId:13,name:'球鞋',skuName:'42',skuCode:'KH-003',selected:true,quantity:1,price:20,canPurchase:false},
      {cartItemId:4,productId:7,skuId:14,name:'袜子',skuName:'均码',skuCode:'KH-004',selected:true,quantity:1,price:5,canPurchase:false},
    ]
    store.validItems=store.items.slice(0,2);store.invalidItems=store.items.slice(2)
    return view
  }
  it('查询与清空保留全部勾选及数量，单个搜索结果仍显示SPU，不发起查询', async () => {
    const {v,hook}=await searchedCart()
    v.toggleGroup('spu-5');expect(v.isGroupCollapsed('spu-5')).toBe(true)
    v.setSearchKeyword('kh-001');expect(v.isGroupCollapsed('spu-5')).toBe(false)
    expect(v.validGroups.value[0]).toMatchObject({key:'spu-5',name:'训练服',skuCount:1})
    expect(v.hiddenSelectedCount.value).toBe(1)
    v.onSelectAll(false)
    expect(hook.batchSetSelected).toHaveBeenCalledWith([1],false)
    expect(hook.selectAllItems).not.toHaveBeenCalled()
    v.setSearchKeyword('00123');expect(v.visibleItems.value.map(x=>x.cartItemId)).toEqual([1])
    v.setSearchKeyword('不存在');expect(v.visibleItems.value).toEqual([])
    expect(v.pageState.value).toBe('content')
    v.clearSearch();expect(v.validGroups.value[0].items).toHaveLength(2)
    expect(hook.cartStore.items.map(x=>[x.quantity,x.selected])).toEqual([[2,true],[3,true],[1,true],[1,true]])
    expect(hook.loadCart).not.toHaveBeenCalled();expect(hook.setItemQuantity).not.toHaveBeenCalled()
    await v.goToCheckout();expect(hook.flush).toHaveBeenCalledTimes(1)
  })
  it('管理全选、删除和清失效只操作匹配行，搜索中禁止一键清空全车', async () => {
    const {v,hook}=await searchedCart();v.toggleManagement();v.setSearchKeyword('KH-003')
    expect(v.invalidGroups.value[0]).toMatchObject({key:'spu-6',name:'球鞋',skuCount:1})
    expect(v.managementSelectedCount.value).toBe(1);expect(v.hiddenSelectedCount.value).toBe(3)
    v.onManagementSelectAll(false);expect(hook.batchSetSelected).toHaveBeenCalledWith([3],false)
    v.requestClearAll();expect(v.showDeleteConfirm.value).toBe(false)
    v.requestDeleteSelected();await v.confirmDelete();expect(hook.deleteItems).toHaveBeenLastCalledWith([3])
    v.removeInvalidItems();await v.confirmDelete();expect(hook.deleteItems).toHaveBeenLastCalledWith([3])
    expect(hook.clearAll).not.toHaveBeenCalled()
    i18n.setLocale('en');expect(i18n.t('commerce.cart.selectResults')).toBe('Select results')
    expect(hook.loadCart).not.toHaveBeenCalled()
  })
})
