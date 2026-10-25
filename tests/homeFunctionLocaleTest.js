import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPageSetup } from './helpers/sfcHarness.js'

let vue
let runtime
let user
let navigate
let queries
let cart

beforeEach(async () => {
  vi.resetModules()
  vue = await import('vue')
  runtime = await import('@/shared/i18n/index.js')
  const { registerMainLocales } = await import('@/app/i18n/registerMain.js')
  registerMainLocales()
  await import('@/subPackages/account/i18n/register.js')
  user = vue.reactive({
    displayName: '测试经销商原名', realName: '联系人原名', username: 'dealer',
    creditLevel: '', dealerId: 10, userId: 21, isMainAccount: true,
    dealerInfo: { dealerCode: 'D001' }, isAccountNormal: true, creditScore: 88,
    financeContext: { credit: { availableAmount: 1234, totalAmount: 2000, usedAmount: 500, frozenAmount: 0 },
      subjectAvailableBalance: 456, currentAccount: { availableBalance: 100, frozenBalance: 20 } },
    hasPermission: () => true, setDealerInfo: vi.fn(), updateFinanceContext: vi.fn(), logout: vi.fn(),
  })
  navigate = vi.fn()
  queries = vi.fn().mockResolvedValue({})
  cart = vue.reactive({ loaded: true, isEmpty: false, validItems: [{ cartItemId: 1,
    productId: 2, name: '原始商品名称', quantity: 3, price: 100 }], summary: { productCount: 1, totalQuantity: 3 },
    cartBadgeCount: 3, formattedTotalAmount: '¥300.00' })
})

/** 执行真实主包/账户页 setup，禁止语言变化带出真实接口或原生生命周期副作用。 */
async function setup(path) {
  const routeArea = new Proxy({}, { get: (_, name) => (...args) => String(name) + JSON.stringify(args) })
  return loadPageSetup(path, async id => {
    if (id === 'vue') return vue
    if (id.includes('shared/i18n/index.js')) return runtime
    if (id.endsWith('i18n/register.js')) return {}
    if (id.includes('navigation/navigator')) return { navigator: { navigateTo: navigate, reLaunch: navigate } }
    if (id.includes('config/routes')) return { routes: { account: routeArea, commerce: routeArea, content: routeArea, order: routeArea, auth: routeArea } }
    if (id.includes('config/constant')) return { ORDER_STATUS: { PENDING_PAYMENT: 10, PROCESSING: 20, COMPLETED: 30 } }
    if (id.includes('session/userStore')) return { useUserStore: () => user }
    if (id.includes('composables/useCart')) return { useCart: () => ({ cartStore: cart, loading: vue.ref(false), loadCart: queries }) }
    if (id.includes('/api/')) return {
      getProfile: queries, getDealerFinanceContext: queries, getDealerInventoryOverview: queries,
      getOrderCounts: queries, getAfterSaleCount: queries, getCategoryList: queries, getGoodsList: queries,
    }
    if (id === '@dcloudio/uni-app') return { onShow: () => {} }
    return { default: {} }
  })
}

describe('retained real home function names', () => {
  it('updates homepage feature labels in place and keeps the news entry action', async () => {
    const page = await setup('pages/home/tabs/TabHome.vue')
    expect(page.bindings.features.value.map(item => item.label)).toContain('批量采购')
    runtime.setLocale('en')
    expect(page.bindings.features.value.map(item => item.label)).toContain('Bulk orders')
    expect(page.bindings.t('main.home.purchase')).toBe('Order products')
    expect(navigate).not.toHaveBeenCalled()
    expect(queries).not.toHaveBeenCalled()
    await page.bindings.openNewsList()
    expect(navigate).toHaveBeenCalledWith('news[]')
    page.stop()
  })

  it('updates the actual hidden account tab without resetting expansion, account data or routes', async () => {
    const page = await setup('pages/home/tabs/TabAccount.vue')
    const actions = page.bindings.functionEntries.value.map(item => item.action)
    const metrics = page.bindings.metricEntries.value.map(item => item.value)
    page.bindings.functionsExpanded.value = false
    expect(page.bindings.functionEntries.value.map(item => item.label)).toContain('充值中心')
    runtime.setLocale('en-US')
    expect(page.bindings.accountCopy.value.sections.functions).toBe('My tools')
    expect(page.bindings.functionEntries.value.map(item => item.label)).toContain('Top up')
    expect(page.bindings.functionEntries.value.map(item => item.action)).toEqual(actions)
    expect(page.bindings.metricEntries.value.map(item => item.value)).toEqual(metrics)
    expect(page.bindings.functionsExpanded.value).toBe(false)
    expect(page.bindings.displayName.value).toBe('测试经销商原名')
    expect(queries).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    runtime.setLocale('zh-CN')
    expect(page.bindings.functionEntries.value.map(item => item.label)).toContain('充值中心')
    page.stop()
  })

  it('keeps subaccount visibility rules when translating account function names', async () => {
    user.isMainAccount = false
    user.hasPermission = () => false
    const page = await setup('pages/home/tabs/TabAccount.vue')
    const keys = page.bindings.functionEntries.value.map(item => item.key)
    runtime.setLocale('en')
    expect(page.bindings.accountCopy.value.roles.sub).toBe('Subaccount')
    expect(page.bindings.functionEntries.value.map(item => item.key)).toEqual(keys)
    expect(keys).toEqual(['address'])
    expect(queries).not.toHaveBeenCalled()
    page.stop()
  })

  it('changes cart shell copy while retaining product data, totals and loaded items', async () => {
    const page = await setup('pages/home/tabs/TabCart.vue')
    const item = page.bindings.previewItems.value[0]
    runtime.setLocale('en')
    expect(page.bindings.t('main.cart.open')).toBe('Open cart')
    expect(page.bindings.previewItems.value[0]).toBe(item)
    expect(item.name).toBe('原始商品名称')
    expect(cart.formattedTotalAmount).toBe('¥300.00')
    expect(queries).not.toHaveBeenCalled()
    page.stop()
  })

  it('translates only category summary wording and keeps the category name and selection', async () => {
    const page = await setup('pages/home/tabs/TabCategory.vue')
    const section = { id: 9, name: '原始分类名称', children: [{ id: 10 }] }
    page.bindings.activeRootId.value = 9
    expect(page.bindings.getGroupSubtitle(section)).toBe('1 个更深层分类')
    runtime.setLocale('en')
    expect(page.bindings.getGroupSubtitle(section)).toBe('1 subcategories')
    expect(page.bindings.activeRootId.value).toBe(9)
    expect(section.name).toBe('原始分类名称')
    expect(queries).not.toHaveBeenCalled()
    page.stop()
  })

  it('updates the independent dealer center without changing services or finance values', async () => {
    const page = await setup('subPackages/account/pages/center/index.vue')
    const actions = page.bindings.serviceGroups.value.flatMap(group => group.items.map(item => item.action))
    const usage = page.bindings.creditUsage.value
    runtime.setLocale('en')
    expect(page.bindings.businessEntries.value.map(item => item.label)).toContain('Order center')
    expect(page.bindings.serviceGroups.value.flatMap(group => group.items.map(item => item.label))).toContain('Language')
    expect(page.bindings.serviceGroups.value.flatMap(group => group.items.map(item => item.action))).toEqual(actions)
    expect(page.bindings.creditUsage.value).toBe(usage)
    expect(page.bindings.dealerName.value).toBe('测试经销商原名')
    expect(queries).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    page.stop()
  })
})

