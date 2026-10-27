import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse, compileScript, compileTemplate, compileStyle } from '@vue/compiler-sfc'
import { parse as parseJs } from '@babel/parser'
import { compile } from '@vue/compiler-dom'
import { renderToString } from '@vue/server-renderer'
import * as vue from 'vue'
import * as allocation from '../src/subPackages/order/domain/fulfillmentAllocation.js'
import { registerMainLocales } from '../src/app/i18n/registerMain.js'

const relative = 'src/subPackages/order/pages/split/index.vue'
const source = readFileSync(resolve(relative), 'utf8')
const descriptor = parse(source).descriptor
const pages = []
const addresses = [
  { id: 11, name: '张三', phone: '13800000001', fullAddress: '广州市天河区一号仓', isDefault: true },
  { id: 29, name: '张三', phone: '13800000002', fullAddress: '深圳市南山区二号仓' },
  { id: 57, name: '李四', phone: '13800000003', fullAddress: '杭州市西湖区三号仓' },
]
const items = [
  { orderItemId: 101, productId: 41, productName: '训练服', skuName: '红色 / S', quantity: 3 },
  { orderItemId: 102, productId: 41, productName: '训练服', skuName: '红色 / M', quantity: 4 },
  { orderItemId: 103, productId: 41, productName: '训练服', skuName: '蓝色 / L', quantity: 1 },
  { orderItemId: 104, productId: 42, productName: '训练服', skuName: '黑色 / XL', quantity: 2 },
]

afterEach(() => {
  for (const stop of pages.splice(0)) stop()
  vi.unstubAllGlobals()
})


describe('拆单用户操作与双语响应', () => {
  it('核对展示两个地址的原 SKU 数量，关闭或切换语言均不提交和重置草稿', async () => {
    const { view, api } = await openPage()
    select(view, 0, 29)
    view.openTransfer(29, 101)
    view.transferQuantity.value = 2
    view.confirmTransfer()
    const snapshot = JSON.stringify(view.allocationPlan.value)
    view.openReview()
    expect(view.reviewVisible.value).toBe(true)
    expect(view.reviewGroups.value.map(group => group.quantity)).toEqual([8, 2])
    expect(view.reviewGroups.value[1].items).toEqual([{ orderItemId: 101, quantity: 2, name: '训练服', spec: '红色 / S' }])
    const runtime = await import('../src/shared/i18n/index.js')
    runtime.setLocale('en-US')
    try {
      expect(view.reviewVisible.value).toBe(true)
      expect(await renderPage(view)).toContain('深圳市南山区二号仓')
      view.reviewVisible.value = false
      expect(JSON.stringify(view.allocationPlan.value)).toBe(snapshot)
      expect(api.createFulfillmentSplits).not.toHaveBeenCalled()
    } finally { runtime.setLocale('zh-CN') }
  })

  it('核对确认只提交一次，失败保留全部分配和可展示的后端原因', async () => {
    const { view, api } = await openPage()
    const failure = new Error('ERP 原订单尚未成功建立')
    api.createFulfillmentSplits.mockRejectedValueOnce(failure)
    const original = JSON.stringify(view.allocationPlan.value)
    view.openReview()
    const submission = view.confirmReview()
    await view.confirmReview()
    await submission
    expect(api.createFulfillmentSplits).toHaveBeenCalledTimes(1)
    expect(api.generateClientRequestId).toHaveBeenCalledTimes(1)
    expect(view.reviewVisible.value).toBe(false)
    expect(view.submitFailure.value).toBe(failure)
    expect(JSON.stringify(view.allocationPlan.value)).toBe(original)
    expect(await renderPage(view)).toContain('ERP 原订单尚未成功建立')
  })

  it('分配未完成时不能打开核对层，也不能通过确认入口发写请求', async () => {
    const { view, api } = await openPage()
    view.setAddressItemQuantity(11, 101, 0)
    view.openReview()
    expect(view.reviewVisible.value).toBe(false)
    await view.confirmReview()
    expect(api.createFulfillmentSplits).not.toHaveBeenCalled()
  })

  it('调入弹层确认前不改数量，取消不改，确认只调整两个地址的一个规格', async () => {
    const { view, api } = await openPage()
    select(view, 0, 29)
    const original = JSON.stringify(view.allocationPlan.value)
    view.openTransfer(29, 101)
    expect(view.transferMaximum.value).toBe(3)
    expect(view.transferSources.value[0].label).toContain('广州市天河区一号仓')
    expect(JSON.stringify(view.allocationPlan.value)).toBe(original)
    view.transferVisible.value = false
    expect(JSON.stringify(view.allocationPlan.value)).toBe(original)
    view.openTransfer(29, 101)
    view.transferQuantity.value = 2
    view.confirmTransfer()
    expect(view.balanceFor(11, 101).current).toBe(1)
    expect(view.balanceFor(29, 101).current).toBe(2)
    expect(view.balanceFor(11, 102).current).toBe(4)
    expect(view.unallocatedQuantity.value).toBe(0)
    expect(view.transferVisible.value).toBe(false)
    expect(api.createFulfillmentSplits).not.toHaveBeenCalled()
  })

  it('确认时重查来源数量，来源减少或正在提交时不越界调入', async () => {
    const { view } = await openPage()
    select(view, 0, 29)
    view.openTransfer(29, 101)
    view.transferQuantity.value = 3
    view.setAddressItemQuantity(11, 101, 1)
    const snapshot = JSON.stringify(view.allocationPlan.value)
    view.confirmTransfer()
    expect(JSON.stringify(view.allocationPlan.value)).toBe(snapshot)
    expect(uni.showToast).toHaveBeenCalled()
    view.transferQuantity.value = 1
    view.submitting.value = true
    view.confirmTransfer()
    expect(JSON.stringify(view.allocationPlan.value)).toBe(snapshot)
    view.submitting.value = false
    view.confirmTransfer()
    expect(view.balanceFor(29, 101).current).toBe(1)
    expect(view.unallocatedQuantity.value).toBe(2)
  })

  it('移除有商品的地址需要确认，取消保留所有数量', async () => {
    const { view } = await openPage()
    select(view, 0, 29)
    view.openTransfer(29, 101)
    view.transferQuantity.value = 2
    view.confirmTransfer()
    const snapshot = JSON.stringify(view.allocationPlan.value)
    const firstRemove = view.requestRemoveAddress(29)
    expect(uni.showModal.mock.calls[0][0].content).toContain('2')
    uni.showModal.mock.calls[0][0].success({ confirm: false })
    await firstRemove
    expect(JSON.stringify(view.allocationPlan.value)).toBe(snapshot)
    const secondRemove = view.requestRemoveAddress(29)
    uni.showModal.mock.calls[1][0].success({ confirm: true })
    await secondRemove
    expect(view.selectedAddressIds.value).toEqual([11])
    expect(view.unallocatedQuantity.value).toBe(2)
    expect(view.balanceFor(11, 101).current).toBe(1)
  })

  it('已提交但读刷新失败时保留成功事实，不生成第二次写请求', async () => {
    const { view, api } = await openPage()
    api.getFulfillmentSplitContext.mockRejectedValueOnce(new Error('read failed'))
    await view.submitSplits()
    expect(view.submissionAccepted.value).toBe(true)
    expect(view.loadError.value.message).toBe('read failed')
    expect(view.canSubmit.value).toBe(false)
    await view.submitSplits()
    view.selectAddress(0, { detail: { value: '1' } })
    expect(api.createFulfillmentSplits).toHaveBeenCalledTimes(1)
    expect(api.generateClientRequestId).toHaveBeenCalledTimes(1)
    expect(view.selectedAddressIds.value).toEqual([11])
    await view.loadData()
    expect(api.createFulfillmentSplits).toHaveBeenCalledTimes(1)
  })

  it('切换英语保留地址、筛选、调入草稿和分配，校验即时更新且不重发请求', async () => {
    const { view, api } = await openPage()
    const runtime = await import('../src/shared/i18n/index.js')
    select(view, 0, 29)
    view.openTransfer(29, 101)
    view.transferQuantity.value = 2
    view.itemFilter.value = 'remaining'
    view.guideExpanded.value = true
    const snapshot = JSON.stringify(view.allocationPlan.value)
    const reads = api.getFulfillmentSplitContext.mock.calls.length
    runtime.setLocale('en-US')
    try {
      expect(view.submitButtonText.value).toBe('Confirm delivery plan')
      expect(view.transferMaximum.value).toBe(3)
      expect(view.transferQuantity.value).toBe(2)
      expect(view.activeAddressId.value).toBe(29)
      expect(view.itemFilter.value).toBe('remaining')
      expect(view.guideExpanded.value).toBe(true)
      expect(JSON.stringify(view.allocationPlan.value)).toBe(snapshot)
      expect(api.getFulfillmentSplitContext).toHaveBeenCalledTimes(reads)
      expect(api.createFulfillmentSplits).not.toHaveBeenCalled()
      view.transferVisible.value = false
      view.setAddressItemQuantity(11, 101, 1)
      expect(view.validationError.value).toBe('Allocate every variant to its full ordered quantity.')
      expect(await renderPage(view)).toContain('items left to allocate')
    } finally { runtime.setLocale('zh-CN') }
  })
})

/** 执行真实拆单页 setup，只替换网络、原生生命周期和视觉组件边界。 */
async function openPage(orderItems = items, addressList = addresses, splitContext = {}) {
  registerMainLocales()
  const hooks = {}
  const api = {
    getFulfillmentSplitContext: vi.fn().mockResolvedValue({ canSplit: true, items: orderItems, splits: [], ...splitContext }),
    getFulfillmentAddressList: vi.fn().mockResolvedValue(addressList),
    createFulfillmentSplits: vi.fn().mockResolvedValue({}),
    generateClientRequestId: vi.fn(() => 'split-request'),
  }
  vi.stubGlobal('uni', { showToast: vi.fn(), showModal: vi.fn() })
  const imports = {}
  let script = compileScript(descriptor, { id: 'split-page-test' }).content
  const importNodes = parseJs(script, { sourceType: 'module' }).program.body
    .filter(node => node.type === 'ImportDeclaration').reverse()
  for (const node of importNodes) {
    const id = node.source.value
    if (id === 'vue') imports[id] = vue
    else if (id === '@dcloudio/uni-app') imports[id] = {
      onLoad: callback => { hooks.load = callback },
      onShow: callback => { hooks.show = callback },
    }
    else if (id.endsWith('/domain/fulfillmentAllocation.js')) imports[id] = allocation
    else if (id.endsWith('/api/orderApi.js')) imports[id] = api
    else if (id.endsWith('/config/constant.js')) imports[id] = await import('../src/app/config/constant.js')
    else if (id.endsWith('/shared/i18n/index.js')) imports[id] = await import('../src/shared/i18n/index.js')
    else if (id.endsWith('/i18n/register.js')) imports[id] = await import('../src/subPackages/order/i18n/register.js')
    else if (id.endsWith('/navigation/navigator.js')) imports[id] = { navigator: { navigateTo: vi.fn() } }
    else if (id.endsWith('/composables/useAppDialog.js')) imports[id] = {
      openAppDialog: vi.fn(options => new Promise(resolve => {
        uni.showModal({ ...options, content: options.description, success: result => resolve(Boolean(result.confirm)) })
      })),
    }
    else if (id.endsWith('/config/routes.js')) imports[id] = { routes: { account: { address: () => '/addresses' } } }
    else if (id.endsWith('/utils/format.js')) imports[id] = { formatDateTime: value => value }
    else if (id.endsWith('.vue')) imports[id] = { default: {} }
    else throw new Error('Unexpected split page import: ' + id)
    const declarations = node.specifiers.map(specifier => {
      const key = specifier.type === 'ImportDefaultSpecifier' ? 'default' : specifier.imported.name
      return 'const ' + specifier.local.name + ' = imports[' + JSON.stringify(id) + '][' + JSON.stringify(key) + '];'
    }).join('\n')
    script = script.slice(0, node.start) + declarations + script.slice(node.end)
  }
  const component = new Function('imports', script.replace('export default', 'return'))(imports)
  const scope = vue.effectScope()
  const view = scope.run(() => component.setup({}, { expose: () => {} }))
  pages.push(() => scope.stop())
  await hooks.load({ orderId: '88' })
  return { view, hooks, api }
}

/** 使用真实模板在服务端渲染编辑区，检查实际尺码、数量和地址文案。 */
async function renderPage(view) {
  const code = compile(descriptor.template.content, {
    mode: 'function',
    isCustomElement: tag => ['view', 'text', 'picker', 'scroll-view'].includes(tag),
  }).code
  const render = new Function('Vue', code)(vue)
  const app = vue.createSSRApp({ setup: () => () => render(vue.proxyRefs(view), []) })
  const shell = { setup: (_, { slots }) => () => vue.h('section', Object.values(slots).flatMap(slot => slot())) }
  for (const name of ['AppPageShell', 'AppContent', 'FixedActionBar']) app.component(name, shell)
  for (const name of ['AppHeader', 'AppIcon', 'AppImage']) app.component(name, { render: () => null })
  app.component('ConfirmPopup', {
    props: ['modelValue'],
    setup: (props, { slots }) => () => props.modelValue ? vue.h('aside', slots.default?.()) : null,
  })
  app.component('QuantityStepper', {
    props: ['modelValue', 'min', 'max', 'allowZero', 'allowInput'],
    setup: props => () => vue.h('output', {
      'data-min': props.min, 'data-max': props.max, 'data-zero': props.allowZero, 'data-input': props.allowInput,
    }, String(props.modelValue)),
  })
  return renderToString(app)
}

/** 按真实 picker 的选项索引选择指定业务地址。 */
function select(view, currentAddressId, targetAddressId, asString = true) {
  const index = view.addressOptions(currentAddressId).findIndex(address => address.id === targetAddressId)
  expect(index).toBeGreaterThan(0)
  view.selectAddress(currentAddressId, { detail: { value: asString ? String(index) : index } })
}

describe('SPU 折叠与 SKU 查找', () => {
  it('同名不同 SPU 独立折叠，赠品明细不合并或丢失', async () => {
    const data = [...items.map(item => ({ ...item, skuId: item.orderItemId + 1000 })), { ...items[0], orderItemId: 105, skuId: 1101, isGift: true, quantity: 2 }]
    const { view } = await openPage(data)
    expect(view.productGroups.value).toHaveLength(2)
    expect(view.productGroups.value.map(product => view.isProductExpanded(product))).toEqual([false, false])
    expect((await renderPage(view))).not.toContain('<output')
    view.toggleProduct(view.productGroups.value[0])
    expect((await renderPage(view)).match(/<output/g)).toHaveLength(4)
    expect(view.visibleProductGroups.value[0].totalVariantCount).toBe(3)
    expect(view.allocationPlan.value).toHaveLength(5)
    expect(view.totalQuantity.value).toBe(12)
  })

  it('真实 SKU 编码、规格多关键词和全角输入可查找，不拿内部 SKU ID 代替编码', async () => {
    const data = [
      { orderItemId: 101, productId: 41, productName: '羽鞋 KH-G826S', skuId: 9001, skuCode: 'RUN-WH-36', skuName: '白色 / 36', quantity: 2 },
      { orderItemId: 102, productId: 41, productName: '羽鞋 KH-G826S', skuId: 9002, skuCode: 'RUN-BK-36', skuName: '黑色 / 36', quantity: 1 },
      { orderItemId: 103, productId: 42, productName: '羽鞋 KH-G826S', skuId: 9003, skuCode: 'OTHER-WH-36', skuName: '白色 / 36', quantity: 1 },
    ]
    const { view, api } = await openPage(data)
    const facts = JSON.stringify(view.allocationPlan.value)
    view.searchQuery.value = 'ＲＵＮ-ＷＨ-３６'
    expect(view.visibleProductGroups.value.map(product => product.items.map(item => item.orderItemId))).toEqual([[101]])
    expect(view.isProductExpanded(view.visibleProductGroups.value[0])).toBe(true)
    expect(await renderPage(view)).toContain('RUN-WH-36')
    view.searchQuery.value = '羽鞋 白色 36'
    expect(view.visibleProductGroups.value).toHaveLength(2)
    expect(view.visibleItemCount.value).toBe(2)
    view.searchQuery.value = '9001'
    expect(view.visibleProductGroups.value).toEqual([])
    expect(await renderPage(view)).toContain('没有找到匹配商品')
    expect(JSON.stringify(view.allocationPlan.value)).toBe(facts)
    expect(api.getFulfillmentSplitContext).toHaveBeenCalledTimes(1)
    expect(api.createFulfillmentSplits).not.toHaveBeenCalled()
  })

  it('清除搜索恢复普通 SPU 折叠和滚动位置，语言和地址切换保留查询', async () => {
    const { view, api } = await openPage()
    view.toggleProduct(view.productGroups.value[0])
    view.onPageScroll({ detail: { scrollTop: 700 } })
    view.searchQuery.value = '红色'
    view.toggleProduct(view.visibleProductGroups.value[0])
    expect(view.isProductExpanded(view.visibleProductGroups.value[0])).toBe(false)
    select(view, 0, 29)
    expect(view.searchQuery.value).toBe('红色')
    const runtime = await import('../src/shared/i18n/index.js')
    runtime.setLocale('en-US')
    try {
      expect(view.itemFilterOptions.value.map(item => item.label)).toEqual(['All', 'To assign', 'This address'])
      expect(view.searchQuery.value).toBe('红色')
      view.onPageScroll({ detail: { scrollTop: 100 } })
      view.clearSearch(); await vue.nextTick()
      expect(view.scrollTopCommand.value).toBe(700)
      expect(view.productGroups.value.map(product => view.isProductExpanded(product))).toEqual([true, false])
      expect(api.createFulfillmentSplits).not.toHaveBeenCalled()
      expect(api.getFulfillmentSplitContext).toHaveBeenCalledTimes(1)
    } finally { runtime.setLocale('zh-CN') }
  })

  it('待分配和本地址筛选保留刚编辑的行，切换筛选后才移出', async () => {
    const { view } = await openPage()
    view.setAddressItemQuantity(11, 101, 0)
    view.itemFilter.value = 'remaining'
    expect(view.visibleProductGroups.value[0].items.map(item => item.orderItemId)).toEqual([101])
    view.setAddressItemQuantity(11, 101, 3)
    expect(view.visibleProductGroups.value[0].items.map(item => item.orderItemId)).toEqual([101])
    expect(view.isRetainedItem(items[0])).toBe(true)
    expect(await renderPage(view)).toContain('数量已更新')
    view.itemFilter.value = 'address'
    view.setAddressItemQuantity(11, 101, 0)
    expect(view.visibleProductGroups.value[0].items.map(item => item.orderItemId)).toContain(101)
    view.searchQuery.value = '红色'
    expect(view.visibleProductGroups.value[0].items.map(item => item.orderItemId)).toEqual([102])
    view.itemFilter.value = 'remaining'
    expect(view.visibleProductGroups.value[0].items.map(item => item.orderItemId)).toEqual([101])
    view.setAddressItemQuantity(11, 101, 3)
    view.searchQuery.value = '蓝色'
    expect(view.visibleProductGroups.value).toEqual([])
    expect(view.searchMatchedItemCount.value).toBe(1)
    view.resetItemFilters()
    expect(view.searchQuery.value).toBe('蓝色')
    expect(view.visibleItemCount.value).toBe(1)
    expect(view.totalQuantity.value).toBe(10)
  })

  it('搜索和折叠不缩小全单分配、核对和提交范围；批量动作需确认', async () => {
    const { view, api } = await openPage()
    select(view, 0, 29)
    for (const item of items) view.setAddressItemQuantity(11, item.orderItemId, 0)
    view.setAddressItemQuantity(29, 101, 1)
    view.activeAddressId.value = 11
    view.searchQuery.value = '蓝色'
    expect(view.visibleItemCount.value).toBe(1)
    const snapshot = JSON.stringify(view.allocationPlan.value)
    let pending = view.requestAssignAllRemaining(11)
    expect(uni.showModal.mock.calls[0][0].content).toContain('9')
    expect(uni.showModal.mock.calls[0][0].content).toContain('隐藏')
    uni.showModal.mock.calls[0][0].success({ confirm: false }); await pending
    expect(JSON.stringify(view.allocationPlan.value)).toBe(snapshot)
    pending = view.requestAssignAllRemaining(11)
    uni.showModal.mock.calls[1][0].success({ confirm: true }); await pending
    expect(view.allocatedQuantity.value).toBe(10)
    expect(Object.fromEntries(view.reviewGroups.value.map(group => [group.addressId, group.quantity]))).toEqual({ 11: 9, 29: 1 })
    view.openReview(); await view.confirmReview()
    const request = api.createFulfillmentSplits.mock.calls[0][0]
    expect(new Set(request.groups.flatMap(group => group.items.map(item => item.orderItemId)))).toEqual(new Set([101, 102, 103, 104]))
    expect(api.createFulfillmentSplits).toHaveBeenCalledTimes(1)
  })

  it('大量 SKU 默认只渲染 SPU 标题，精准搜索只渲染匹配规格', async () => {
    const data = Array.from({ length: 240 }, (_, index) => ({ orderItemId: index + 1, productId: Math.floor(index / 5) + 1, productName: '同名商品', skuId: 1000 + index, skuCode: 'SKU-' + (1000 + index), skuName: '规格 ' + index, quantity: 1 }))
    const { view, api } = await openPage(data)
    expect(view.productGroups.value).toHaveLength(48)
    expect(await renderPage(view)).not.toContain('<output')
    view.searchQuery.value = 'sku-1123'
    expect(view.visibleItemCount.value).toBe(1)
    expect((await renderPage(view)).match(/<output/g)).toHaveLength(1)
    expect(view.totalQuantity.value).toBe(240)
    expect(view.allocatedQuantity.value).toBe(240)
    expect(api.createFulfillmentSplits).not.toHaveBeenCalled()
  })

  it('缺少或无效 SPU 的旧响应按订单行独立展示，不按同名猜测归组', async () => {
    const { view } = await openPage([{ orderItemId: 1, productId: '0', productName: '同名', quantity: 1 }, { orderItemId: 2, productName: '同名', quantity: 1 }])
    expect(view.productGroups.value.map(product => product.key)).toEqual(['line:1', 'line:2'])
    expect(view.allocationPlan.value).toHaveLength(2)
  })
})

describe('拆单页地址及尺码数量回归', () => {
  it('真实模板和 setup 均可编译', () => {
    expect(compileTemplate({ source: descriptor.template.content, filename: relative, id: 'split-compile' }).errors).toEqual([])
    expect(() => compileScript(descriptor, { id: 'split-compile' })).not.toThrow()
    expect(compileStyle({
      source: descriptor.styles[0].content,
      filename: relative,
      id: 'data-v-split-compile',
      scoped: true,
      preprocessLang: 'scss',
    }).errors).toEqual([])
  })

  it('字符串 picker 索引映射到真实 ID；同名联系人也能按完整地址区分和更换', async () => {
    const { view } = await openPage()
    expect(view.addressOptions()[1].label).toContain('深圳市南山区二号仓')
    // 可用列表为占位、29、57；"2" 必须选择 57，不能成为地址 2。
    view.selectAddress(0, { detail: { value: '2' } })
    expect(view.selectedAddressIds.value).toEqual([11, 57])
    expect(view.activeAddressId.value).toBe(57)
    expect(view.groupTotalQuantity(57)).toBe(0)
    expect(view.groupTotalQuantity(11)).toBe(10)
    select(view, 11, 29, false)
    expect(view.selectedAddressIds.value).toEqual([29, 57])
    expect(view.activeAddressId.value).toBe(29)
    expect(view.groupTotalQuantity(29)).toBe(10)
    expect(view.allocationPlan.value.map(item => item.totalQuantity)).toEqual([3, 4, 1, 2])
    expect(view.addressOptionIndex(29)).toBe(view.addressOptions(29).findIndex(address => address.id === 29))
    expect(view.addressOptions(29).some(address => address.id === 57)).toBe(false)
  })

  it('占位、取消、越界、旧地址事件不会增加重复地址或改变数量', async () => {
    const { view } = await openPage()
    const original = JSON.stringify(view.allocationPlan.value)
    for (const value of [undefined, null, '', '0', '-1', '999', 'abc', '1.5']) {
      view.selectAddress(0, { detail: { value } })
    }
    view.selectAddress(0, {})
    select(view, 11, 11)
    view.selectAddress(999, { detail: { value: '1' } })
    expect(view.selectedAddressIds.value).toEqual([11])
    expect(JSON.stringify(view.allocationPlan.value)).toBe(original)
  })

  it('多尺码转移前显示剩余、切换地址不改数量，0 和新去向均可编辑且不超配', async () => {
    const { view, api } = await openPage()
    select(view, 0, 29)
    // 已分配完时，新地址加量不得挪动原地址。
    view.setAddressItemQuantity(29, 101, 99)
    expect(view.balanceFor(29, 101).current).toBe(0)
    view.activeAddressId.value = 11
    view.setAddressItemQuantity(11, 101, 1)
    view.setAddressItemQuantity(11, 103, 0)
    expect(view.unallocatedQuantity.value).toBe(3)
    expect(view.canSubmit.value).toBe(false)
    await view.submitSplits()
    expect(api.createFulfillmentSplits).not.toHaveBeenCalled()
    view.activeAddressId.value = 29
    expect(view.balanceFor(29, 101)).toEqual({ total: 3, allocated: 1, remaining: 2, current: 0, maximum: 2 })
    view.setAddressItemQuantity(29, 101, 99)
    view.setAddressItemQuantity(29, 103, 1)
    expect(view.balanceFor(11, 101).current).toBe(1)
    expect(view.balanceFor(29, 101).current).toBe(2)
    expect(view.balanceFor(29, 103).current).toBe(1)
    expect(view.unallocatedQuantity.value).toBe(0)
    expect(view.canSubmit.value).toBe(true)
    // 再换一个收货地址，所有尺码分配原样保留。
    select(view, 29, 57)
    expect(view.groupTotalQuantity(57)).toBe(3)
    expect(view.balanceFor(57, 101).current).toBe(2)
    expect(view.balanceFor(57, 103).current).toBe(1)
    await view.submitSplits()
    const payload = api.createFulfillmentSplits.mock.calls[0][0]
    expect(payload.orderId).toBe(88)
    expect(payload.clientRequestId).toBe('split-request')
    expect(payload.groups.map(group => group.addressId).sort()).toEqual([11, 57])
    for (const item of items) {
      expect(payload.groups.flatMap(group => group.items).filter(row => row.orderItemId === item.orderItemId)
        .reduce((sum, row) => sum + row.quantity, 0)).toBe(item.quantity)
    }
    expect(payload.groups.flatMap(group => group.items).every(row => row.quantity > 0)).toBe(true)
  })

  it('同名不同商品不合组，实际模板展示每个尺码和当前地址上限', async () => {
    const { view } = await openPage()
    expect(view.productGroups.value.map(group => group.items.map(item => item.orderItemId))).toEqual([[101, 102, 103], [104]])
    view.setAddressItemQuantity(11, 101, 1)
    for (const product of view.productGroups.value) view.toggleProduct(product)
    const html = await renderPage(view)
    for (const item of items) expect(html).toContain(item.skuName)
    expect(html).toContain('10 件')
    expect(html).toContain('剩余 2')
    expect(html).toContain('订单 3')
    expect(html).toContain('data-max="3"')
    expect(html).not.toContain('本地址最多')
    expect(html.match(/<output/g)).toHaveLength(4)
    expect(html).toContain('data-zero="true"')
    expect(html).toContain('data-input="true"')
    expect(html).toContain('剩余 2 件待分配')
    expect(html).not.toContain('拆分子单')
  })

  it('20 个尺码可在地址间来回转移，输入中的剩余总量准确保留', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      orderItemId: 1000 + i, productId: 41, productName: '运动鞋', skuName: '尺码 ' + (30 + i), quantity: i % 3 + 1,
    }))
    const { view } = await openPage(many)
    select(view, 0, 29)
    for (const item of many) {
      view.setAddressItemQuantity(11, item.orderItemId, 0)
      expect(view.allocatedQuantity.value + view.unallocatedQuantity.value).toBe(view.totalQuantity.value)
      view.setAddressItemQuantity(29, item.orderItemId, item.quantity)
    }
    view.activeAddressId.value = 11
    expect(view.groupTotalQuantity(11)).toBe(0)
    expect(view.addressGroups.value.map(group => group.addressId)).toEqual([11, 29])
    for (const item of many) {
      view.setAddressItemQuantity(29, item.orderItemId, 0)
      view.setAddressItemQuantity(11, item.orderItemId, item.quantity)
    }
    expect(view.deliveryGroupCount.value).toBe(1)
    expect(view.unallocatedQuantity.value).toBe(0)
    expect(view.canSubmit.value).toBe(true)
    const html = await renderPage(view)
    expect(html.match(/<output/g)).toHaveLength(20)
    expect(html).toContain('尺码 49')
  })

  it('移除地址释放其所有数量，再添加同地址也不丢失订单或改变其他地址', async () => {
    const { view } = await openPage()
    select(view, 0, 29)
    view.setAddressItemQuantity(11, 101, 1)
    view.setAddressItemQuantity(29, 101, 2)
    view.removeAddressGroup(29)
    expect(view.groupTotalQuantity(11)).toBe(8)
    expect(view.unallocatedQuantity.value).toBe(2)
    expect(view.activeAddressId.value).toBe(11)
    select(view, 0, 29)
    view.setAddressItemQuantity(29, 101, 2)
    expect(view.canSubmit.value).toBe(true)
  })

  it('地址管理返回保留原分配；删除地址后释放数量而不静默配送到别人', async () => {
    const { view, hooks, api } = await openPage()
    select(view, 0, 29)
    view.setAddressItemQuantity(11, 101, 1)
    view.setAddressItemQuantity(29, 101, 2)
    const before = JSON.stringify(view.allocationPlan.value)
    api.getFulfillmentAddressList.mockResolvedValue(addresses.map(address => ({ ...address, fullAddress: address.fullAddress + '（新）' })))
    await hooks.show()
    expect(JSON.stringify(view.allocationPlan.value)).toBe(before)
    expect(view.addressGroups.value[1].address.fullAddress).toContain('（新）')
    api.getFulfillmentAddressList.mockResolvedValue(addresses.filter(address => address.id !== 29))
    await hooks.show()
    expect(view.selectedAddressIds.value).toEqual([11])
    expect(view.groupTotalQuantity(11)).toBe(8)
    expect(view.unallocatedQuantity.value).toBe(2)
    expect(view.canSubmit.value).toBe(false)
  })

  it('首次没有地址时，新增地址后能分配；请求提交期间锁住地址与数量编辑', async () => {
    const { view, hooks, api } = await openPage([{ orderItemId: 101, quantity: 1 }], [])
    expect(view.addressGroups.value).toEqual([])
    api.getFulfillmentAddressList.mockResolvedValue(addresses)
    await hooks.show()
    expect(view.balanceFor(11, 101).remaining).toBe(1)
    view.setAddressItemQuantity(11, 101, 1)
    view.submitting.value = true
    view.setAddressItemQuantity(11, 101, 0)
    select(view, 0, 29)
    expect(view.selectedAddressIds.value).toEqual([11])
    expect(view.balanceFor(11, 101).current).toBe(1)
  })

  it('最多选十个地址，达到上限仍可更换现有地址且不会重复或偷分数量', async () => {
    const manyAddresses = Array.from({ length: 12 }, (_, i) => ({
      id: 100 + i, name: '收货人 ' + i, phone: '13800000000', fullAddress: '仓库 ' + i, isDefault: i === 0,
    }))
    const { view } = await openPage([{ orderItemId: 101, quantity: 1 }], manyAddresses)
    for (let i = 1; i < 10; i++) select(view, 0, 100 + i)
    expect(view.selectedAddressIds.value).toHaveLength(10)
    expect(view.canAddAddressGroup.value).toBe(false)
    select(view, 0, 110)
    expect(view.selectedAddressIds.value).toHaveLength(10)
    select(view, 100, 111)
    expect(view.selectedAddressIds.value).toEqual([111, 101, 102, 103, 104, 105, 106, 107, 108, 109])
    expect(view.balanceFor(111, 101).current).toBe(1)
    expect(view.unallocatedQuantity.value).toBe(0)
    expect(view.canSubmit.value).toBe(true)
  })

  it('批量入口解释初始分配，清空可取消；20 尺码两次批量动作完成换址', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      orderItemId: 1000 + i, productId: 41, productName: '运动鞋', skuName: '尺码 ' + (30 + i), quantity: i % 3 + 1,
    }))
    const { view, api } = await openPage(many)
    const original = JSON.stringify(view.allocationPlan.value)
    const initialHtml = await renderPage(view)
    expect(initialHtml).toContain('更多')
    expect(initialHtml).not.toContain('只调整当前地址')
    view.actionsExpanded.value = true
    view.guideExpanded.value = true
    expect(await renderPage(view)).toContain('只调整当前地址')
    expect(initialHtml).not.toMatch(/<button(?=[^>]*class="bulk-button button-center")(?=[^>]*disabled)[^>]*>/)
    view.assignAllRemaining(11)
    expect(JSON.stringify(view.allocationPlan.value)).toBe(original)
    const firstClear = view.clearCurrentAddress(11)
    expect(uni.showModal.mock.calls[0][0].content).toContain('全部规格')
    uni.showModal.mock.calls[0][0].success({ confirm: false })
    await firstClear
    expect(JSON.stringify(view.allocationPlan.value)).toBe(original)
    const secondClear = view.clearCurrentAddress(11)
    uni.showModal.mock.calls[1][0].success({ confirm: true })
    await secondClear
    expect(view.selectedAddressIds.value).toEqual([11])
    expect(view.groupTotalQuantity(11)).toBe(0)
    expect(view.unallocatedQuantity.value).toBe(many.reduce((sum, item) => sum + item.quantity, 0))
    expect(view.canSubmit.value).toBe(false)
    select(view, 0, 29)
    view.assignAllRemaining(29)
    expect(view.unallocatedQuantity.value).toBe(0)
    expect(view.groupTotalQuantity(29)).toBe(view.totalQuantity.value)
    view.assignAllRemaining(57) // 未选择的地址不允许写入。
    expect(view.selectedAddressIds.value).toEqual([11, 29])
    expect(view.canSubmit.value).toBe(true)
    await view.submitSplits()
    expect(api.createFulfillmentSplits.mock.calls[0][0].groups).toEqual([
      { name: '配送单1', addressId: 29, items: many.map(item => ({ orderItemId: item.orderItemId, quantity: item.quantity })) },
    ])
  })

  it('三地址混合批量追加不会挪走其他地址，当前上限始终等于当前加剩余', async () => {
    const { view } = await openPage()
    select(view, 0, 29)
    select(view, 0, 57)
    view.setAddressItemQuantity(11, 101, 1)
    view.setAddressItemQuantity(11, 102, 2)
    view.setAddressItemQuantity(29, 102, 1)
    view.setAddressItemQuantity(11, 104, 0)
    view.setAddressItemQuantity(57, 104, 1)
    const before = view.allocationPlan.value.map(item => ({
      id: item.orderItemId,
      quantityAt11: view.balanceFor(11, item.orderItemId).current,
      quantityAt57: view.balanceFor(57, item.orderItemId).current,
    }))
    expect(view.balanceFor(29, 102)).toEqual({ total: 4, allocated: 3, remaining: 1, current: 1, maximum: 2 })
    view.assignAllRemaining(29)
    expect(view.allocationPlan.value.map(item => view.balanceFor(29, item.orderItemId).current)).toEqual([2, 2, 0, 1])
    for (const row of before) {
      expect(view.balanceFor(11, row.id).current).toBe(row.quantityAt11)
      expect(view.balanceFor(57, row.id).current).toBe(row.quantityAt57)
    }
    for (const address of [11, 29, 57]) {
      for (const item of items) {
        const balance = view.balanceFor(address, item.orderItemId)
        expect(balance.maximum).toBe(balance.current + balance.remaining)
        expect(balance.allocated).toBe(item.quantity)
      }
    }
    const finished = JSON.stringify(view.allocationPlan.value)
    view.assignAllRemaining(57)
    expect(JSON.stringify(view.allocationPlan.value)).toBe(finished)
  })

  it('只看待分配保留商品分组和总量，筛选不限制批量清空或分配的规格范围', async () => {
    const { view } = await openPage()
    select(view, 0, 29)
    select(view, 0, 57)
    view.setAddressItemQuantity(11, 101, 1)
    view.setAddressItemQuantity(11, 102, 2)
    view.setAddressItemQuantity(29, 102, 1)
    view.setAddressItemQuantity(11, 104, 0)
    view.setAddressItemQuantity(57, 104, 1)
    view.activeAddressId.value = 11
    view.itemFilter.value = 'remaining'
    view.actionsExpanded.value = true
    expect(view.visibleProductGroups.value.map(group => group.items.map(item => item.orderItemId))).toEqual([[101, 102], [104]])
    expect(view.productGroups.value.map(group => group.items.map(item => item.orderItemId))).toEqual([[101, 102, 103], [104]])
    const filteredHtml = await renderPage(view)
    expect(filteredHtml.match(/<output/g)).toHaveLength(3)
    expect(filteredHtml).not.toContain('蓝色 / L')
    expect(view.allocatedQuantity.value).toBe(6)
    expect(filteredHtml).toContain('剩余 4 件待分配')
    // 已完全分配的 L 尺码虽隐藏，清空仍会释放它在本地址的 1 件。
    const clear = view.clearCurrentAddress(11)
    uni.showModal.mock.calls[0][0].success({ confirm: true })
    await clear
    expect(view.balanceFor(11, 103).remaining).toBe(1)
    expect(view.groupTotalQuantity(29)).toBe(1)
    expect(view.groupTotalQuantity(57)).toBe(1)
    expect(view.unallocatedQuantity.value).toBe(8)
    expect(view.totalQuantity.value).toBe(10)
    view.activeAddressId.value = 29
    view.assignAllRemaining(29)
    expect(view.visibleProductGroups.value).toEqual([])
    expect(view.groupTotalQuantity(29)).toBe(9)
    expect(view.groupTotalQuantity(57)).toBe(1)
    expect(view.canSubmit.value).toBe(true)
    const emptyHtml = await renderPage(view)
    expect(emptyHtml).toContain('所有规格均已分配')
    expect(emptyHtml).toContain('已分配 10/10 件')
    view.itemFilter.value = 'all'
    expect(view.visibleProductGroups.value).toHaveLength(2)
    for (const product of view.productGroups.value) view.toggleProduct(product)
    expect((await renderPage(view)).match(/<output/g)).toHaveLength(4)
  })

  it('批量动作在提交时被锁定，清空确认返回时会重新检查地址及提交状态', async () => {
    const { view } = await openPage()
    select(view, 0, 29)
    view.setAddressItemQuantity(11, 101, 1)
    const original = JSON.stringify(view.allocationPlan.value)
    view.submitting.value = true
    view.assignAllRemaining(29)
    view.clearCurrentAddress(11)
    expect(uni.showModal).not.toHaveBeenCalled()
    expect(JSON.stringify(view.allocationPlan.value)).toBe(original)
    view.submitting.value = false
    view.clearCurrentAddress(11)
    view.submitting.value = true
    uni.showModal.mock.calls[0][0].success({ confirm: true })
    expect(JSON.stringify(view.allocationPlan.value)).toBe(original)
    view.submitting.value = false
    view.clearCurrentAddress(11)
    select(view, 11, 57)
    const changed = JSON.stringify(view.allocationPlan.value)
    uni.showModal.mock.calls[1][0].success({ confirm: true })
    expect(JSON.stringify(view.allocationPlan.value)).toBe(changed)
    view.clearCurrentAddress(29) // 空地址不弹出无意义的清空确认。
    expect(uni.showModal).toHaveBeenCalledTimes(2)
  })

  it('原接口返回 PascalCase 多尺码时仍正确分组、归零、换址并提交', async () => {
    const { view, api } = await openPage([], addresses, {
      canSplit: undefined, CanSplit: true, items: undefined,
      Items: [
        { OrderItemId: 101, ProductId: 41, ProductName: '运动服', SkuName: '白色 / S', Quantity: 2 },
        { OrderItemId: 102, ProductId: 41, ProductName: '运动服', SkuName: '白色 / M', Quantity: 1 },
      ],
    })
    expect(view.productGroups.value).toHaveLength(1)
    expect(view.totalQuantity.value).toBe(3)
    select(view, 11, 57)
    view.setAddressItemQuantity(57, 101, 0)
    expect(view.unallocatedQuantity.value).toBe(2)
    view.setAddressItemQuantity(57, 101, 2)
    await view.submitSplits()
    expect(api.createFulfillmentSplits.mock.calls[0][0].groups).toEqual([
      { name: '配送单1', addressId: 57, items: [{ orderItemId: 101, quantity: 2 }, { orderItemId: 102, quantity: 1 }] },
    ])
  })
})
