/**
 * 路由常量与工厂函数测试
 *
 * 覆盖：
 * 1. 路由常量正确性
 * 2. 路由工厂函数生成正确 URL
 * 3. REGISTERED_ROUTES 完整性
 * 4. pages.json 注册页面与 routes/routeMeta 一一对应
 * 5. 每个详情工厂缺 ID 都抛错
 * 6. buildQuery 严格校验
 * 7. normalizeRoutePath / isRegisteredRoute / sanitizeRedirect
 */
import { describe, it, expect } from 'vitest'
import {
  // 主包页面
  STARTUP,
  HOME,
  // auth 分包
  LOGIN,
  APPLY_SIGN,
  AGREEMENT,
  ACCOUNT_STATUS,
  // commerce 分包
  PRODUCT_LIST,
  PRODUCT_DETAIL,
  PRODUCT_VARIANTS,
  CART,
  CHECKOUT,
  // order 分包
  ORDER_LIST,
  ORDER_DETAIL,
  PAY_PAGE,
  APPLY_AFTER_SALE,
  AFTER_SALE_LIST,
  // account 分包
  ACCOUNT_CENTER,
  ACCOUNT_PROFILE,
  ADDRESS,
  SUB_ACCOUNT,
  SUB_ACCOUNT_FORM,
  SECURITY,
  RECHARGE,
  FUND_FLOW,
  BILL_LIST,
  BILL_DETAIL,
  INVOICE,
  VOUCHER,
  LANGUAGE,
  SETTINGS,
  // content 分包
  NEWS,
  NEWS_DETAIL,
  MANUAL,
  MANUAL_PREVIEW,
  MESSAGE,
  HELP,
  ABOUT,
  // 集合
  REGISTERED_ROUTES,
  // 默认目标
  DEFAULT_LOGIN_REDIRECT,
  DEFAULT_LOGOUT_REDIRECT,
  // 工厂
  routes,
  // 工具
  normalizeRoutePath,
  isRegisteredRoute,
  sanitizeRedirect,
  buildQuery,
} from '@/app/config/routes.js'

import {
  PUBLIC_ROUTES,
  FROZEN_ALLOWED_ROUTES,
  ROUTE_META,
  getRouteMeta,
} from '@/app/config/routes.js'

describe('Routes - 主包页面常量', () => {
  it('STARTUP 应为冷启动页', () => {
    expect(STARTUP).toBe('/pages/startup/index')
  })

  it('HOME 应为首页', () => {
    expect(HOME).toBe('/pages/home/index')
  })
})

describe('Routes - auth 分包常量', () => {
  it('LOGIN 指向正确路径', () => {
    expect(LOGIN).toBe('/subPackages/auth/pages/login/index')
  })

  it('APPLY_SIGN 指向正确路径', () => {
    expect(APPLY_SIGN).toBe('/subPackages/auth/pages/apply-sign/index')
  })

  it('AGREEMENT 指向正确路径', () => {
    expect(AGREEMENT).toBe('/subPackages/auth/pages/agreement/index')
  })

  it('ACCOUNT_STATUS 指向正确路径', () => {
    expect(ACCOUNT_STATUS).toBe('/subPackages/auth/pages/account-status/index')
  })
})

describe('Routes - commerce 分包常量', () => {
  it('PRODUCT_LIST 指向正确路径', () => {
    expect(PRODUCT_LIST).toBe('/subPackages/commerce/pages/product/list')
  })

  it('PRODUCT_DETAIL 指向正确路径', () => {
    expect(PRODUCT_DETAIL).toBe('/subPackages/commerce/pages/product/detail')
  })

  it('CART 指向正确路径', () => {
    expect(CART).toBe('/subPackages/commerce/pages/cart/index')
  })

  it('CHECKOUT 指向正确路径', () => {
    expect(CHECKOUT).toBe('/subPackages/commerce/pages/checkout/index')
  })
})

describe('Routes - order 分包常量', () => {
  it('ORDER_LIST 指向正确路径', () => {
    expect(ORDER_LIST).toBe('/subPackages/order/pages/list/index')
  })

  it('ORDER_DETAIL 指向正确路径', () => {
    expect(ORDER_DETAIL).toBe('/subPackages/order/pages/detail/index')
  })

  it('PAY_PAGE 指向正确路径', () => {
    expect(PAY_PAGE).toBe('/subPackages/order/pages/pay/index')
  })

  it('APPLY_AFTER_SALE 指向正确路径', () => {
    expect(APPLY_AFTER_SALE).toBe('/subPackages/order/pages/after-sale/apply')
  })

  it('AFTER_SALE_LIST 指向正确路径', () => {
    expect(AFTER_SALE_LIST).toBe('/subPackages/order/pages/after-sale/list')
  })
})

describe('Routes - account 分包常量', () => {
  it('ACCOUNT_CENTER 指向正确路径', () => {
    expect(ACCOUNT_CENTER).toBe('/subPackages/account/pages/center/index')
  })

  it('ADDRESS 指向正确路径', () => {
    expect(ADDRESS).toBe('/subPackages/account/pages/address/index')
  })

  it('SUB_ACCOUNT 指向正确路径', () => {
    expect(SUB_ACCOUNT).toBe('/subPackages/account/pages/sub-account/index')
  })

  it('SECURITY 指向正确路径', () => {
    expect(SECURITY).toBe('/subPackages/account/pages/security/index')
  })

  it('RECHARGE 指向正确路径', () => {
    expect(RECHARGE).toBe('/subPackages/account/pages/recharge/index')
  })
})

describe('Routes - content 分包常量', () => {
  it('NEWS 指向正确路径', () => {
    expect(NEWS).toBe('/subPackages/content/pages/news/index')
  })

  it('NEWS_DETAIL 指向正确路径', () => {
    expect(NEWS_DETAIL).toBe('/subPackages/content/pages/news/detail')
  })

  it('MESSAGE 指向正确路径', () => {
    expect(MESSAGE).toBe('/subPackages/content/pages/message/index')
  })

  it('HELP 指向正确路径', () => {
    expect(HELP).toBe('/subPackages/content/pages/help/index')
  })

  it('ABOUT 指向正确路径', () => {
    expect(ABOUT).toBe('/subPackages/content/pages/about/index')
  })
})

describe('Routes - REGISTERED_ROUTES 完整性', () => {
  it('应包含所有页面路由', () => {
    const expected = [
      STARTUP, HOME,
      LOGIN, APPLY_SIGN, AGREEMENT, ACCOUNT_STATUS,
      PRODUCT_LIST, PRODUCT_DETAIL, PRODUCT_VARIANTS, CART, CHECKOUT,
      ORDER_LIST, ORDER_DETAIL, PAY_PAGE, APPLY_AFTER_SALE, AFTER_SALE_LIST,
      ACCOUNT_CENTER, ACCOUNT_PROFILE, ADDRESS, SUB_ACCOUNT, SUB_ACCOUNT_FORM, SECURITY,
      RECHARGE, FUND_FLOW, BILL_LIST, BILL_DETAIL, INVOICE, VOUCHER, LANGUAGE, SETTINGS,
      NEWS, NEWS_DETAIL, MANUAL, MANUAL_PREVIEW, MESSAGE, HELP, ABOUT,
    ]
    expect(REGISTERED_ROUTES).toEqual(expected)
  })

  it('应包含 37 个路由', () => {
    expect(REGISTERED_ROUTES.length).toBe(37)
  })

  it('不应有重复路由', () => {
    const unique = new Set(REGISTERED_ROUTES)
    expect(unique.size).toBe(REGISTERED_ROUTES.length)
  })
})

describe('Routes - PUBLIC_ROUTES 白名单', () => {
  it('STARTUP 应为公开路由', () => {
    expect(PUBLIC_ROUTES.has(STARTUP)).toBe(true)
  })

  it('LOGIN 应为公开路由', () => {
    expect(PUBLIC_ROUTES.has(LOGIN)).toBe(true)
  })

  it('APPLY_SIGN 应为公开路由', () => {
    expect(PUBLIC_ROUTES.has(APPLY_SIGN)).toBe(true)
  })

  it('HOME 不应为公开路由', () => {
    expect(PUBLIC_ROUTES.has(HOME)).toBe(false)
  })

  it('CART 不应为公开路由', () => {
    expect(PUBLIC_ROUTES.has(CART)).toBe(false)
  })
})

describe('Routes - FROZEN_ALLOWED_ROUTES', () => {
  it('ACCOUNT_STATUS 应在允许列表中', () => {
    expect(FROZEN_ALLOWED_ROUTES.has(ACCOUNT_STATUS)).toBe(true)
  })

  it('HELP 应在允许列表中', () => {
    expect(FROZEN_ALLOWED_ROUTES.has(HELP)).toBe(true)
  })

  it('ABOUT 应在允许列表中', () => {
    expect(FROZEN_ALLOWED_ROUTES.has(ABOUT)).toBe(true)
  })

  it('HOME 不应在允许列表中', () => {
    expect(FROZEN_ALLOWED_ROUTES.has(HOME)).toBe(false)
  })

  it('子账号管理页应允许冻结主账号只读访问', () => {
    expect(FROZEN_ALLOWED_ROUTES.has(SUB_ACCOUNT)).toBe(true)
    expect(FROZEN_ALLOWED_ROUTES.has(SUB_ACCOUNT_FORM)).toBe(true)
  })
})

describe('Routes - ROUTE_META 元数据覆盖全部 35 个页面', () => {
  it('每个 REGISTERED_ROUTES 都应在 ROUTE_META 中', () => {
    for (const path of REGISTERED_ROUTES) {
      expect(ROUTE_META[path], `缺少 ${path} 的元数据`).toBeDefined()
      expect(typeof ROUTE_META[path].requireAuth).toBe('boolean')
      expect(typeof ROUTE_META[path].requireSign).toBe('boolean')
      expect(typeof ROUTE_META[path].allowFrozen).toBe('boolean')
    }
  })

  it('LOGIN 元数据应正确', () => {
    expect(ROUTE_META[LOGIN]).toMatchObject({
      requireAuth: false,
      requireSign: false,
    })
  })

  it('PRODUCT_LIST 元数据 requireSign 应为 false (商品浏览不需要签约)', () => {
    expect(ROUTE_META[PRODUCT_LIST]).toMatchObject({
      requireAuth: true,
      requireSign: false,
    })
  })

  it('SUB_ACCOUNT 元数据应标记为主账号权限', () => {
    expect(ROUTE_META[SUB_ACCOUNT]).toMatchObject({
      requireAuth: true,
      owner: 'main',
    })
  })
})

describe('Routes - getRouteMeta', () => {
  it('已知路由应返回元数据', () => {
    const meta = getRouteMeta(HOME)
    expect(meta).not.toBeNull()
    expect(meta.requireAuth).toBe(true)
  })

  it('未知路由应返回 null', () => {
    const meta = getRouteMeta('/unknown/path')
    expect(meta).toBeNull()
  })
})

describe('Routes - 默认导航目标', () => {
  it('DEFAULT_LOGIN_REDIRECT 应为 HOME', () => {
    expect(DEFAULT_LOGIN_REDIRECT).toBe(HOME)
  })

  it('DEFAULT_LOGOUT_REDIRECT 应为 LOGIN', () => {
    expect(DEFAULT_LOGOUT_REDIRECT).toBe(LOGIN)
  })
})

describe('Routes - routes 工厂函数', () => {
  it('startup() 应返回 STARTUP', () => {
    expect(routes.startup()).toBe(STARTUP)
  })

  it('home() 应返回 HOME', () => {
    expect(routes.home()).toBe(HOME)
  })

  it('auth.login() 應返回 LOGIN 路径', () => {
    expect(routes.auth.login()).toBe(LOGIN)
  })

  it('auth.login({ redirect: "/pages/home/index" }) 應返回带参数的 URL', () => {
    const url = routes.auth.login({ redirect: '/pages/home/index' })
    expect(url).toContain(LOGIN)
    expect(url).toContain('redirect=')
  })

  it('auth.agreement() 默认应包含 type=user', () => {
    const url = routes.auth.agreement()
    expect(url).toContain(AGREEMENT)
    expect(url).toContain('type=user')
  })

  it('auth.agreement({ type: "privacy" }) 应包含 type=privacy', () => {
    const url = routes.auth.agreement({ type: 'privacy' })
    expect(url).toContain('type=privacy')
  })

  it('commerce.productList() 应返回 PRODUCT_LIST', () => {
    expect(routes.commerce.productList()).toBe(PRODUCT_LIST)
  })

  it('commerce.productList({ categoryId, keyword, mode }) 应包含参数', () => {
    const url = routes.commerce.productList({ categoryId: 5, keyword: 'test', mode: 'search' })
    expect(url).toContain(PRODUCT_LIST)
    expect(url).toContain('categoryId=5')
    expect(url).toContain('keyword=test')
    expect(url).toContain('mode=search')
  })

  it('commerce.productDetail(id) 应包含 productId 参数', () => {
    const url = routes.commerce.productDetail(123)
    expect(url).toContain(PRODUCT_DETAIL)
    expect(url).toContain('productId=123')
  })

  it('commerce.productVariants(id) 应包含 productId 参数', () => {
    const url = routes.commerce.productVariants(456)
    expect(url).toContain(PRODUCT_VARIANTS)
    expect(url).toContain('productId=456')
  })

  it('order.list() 应返回 ORDER_LIST', () => {
    expect(routes.order.list()).toBe(ORDER_LIST)
  })

  it('order.list({ status }) 应包含 status 参数', () => {
    const url = routes.order.list({ status: 'pending' })
    expect(url).toContain('status=pending')
  })

  it('order.detail(id) 应包含 orderId 参数', () => {
    const url = routes.order.detail(456)
    expect(url).toContain(ORDER_DETAIL)
    expect(url).toContain('orderId=456')
  })

  it('order.pay(orderId) 应包含 orderId', () => {
    const url = routes.order.pay(123)
    expect(url).toContain(PAY_PAGE)
    expect(url).toContain('orderId=123')
  })

  it('order.pay 应携带结算模式和支付通道', () => {
    const url = routes.order.pay(123, { paymentMode: 1, paymentChannel: 'bank-card' })
    expect(url).toContain('paymentMode=1')
    expect(url).toContain('paymentChannel=bank-card')
  })

  it('order.pay({ orderId: 123 }) 必须抛错，防止两种签名并存', () => {
    expect(() => routes.order.pay({ orderId: 123 })).toThrow()
  })

  it('order.afterSaleApply(id) 应包含 orderId 参数', () => {
    const url = routes.order.afterSaleApply(789)
    expect(url).toContain(APPLY_AFTER_SALE)
    expect(url).toContain('orderId=789')
  })

  it('account.center() 应返回 ACCOUNT_CENTER', () => {
    expect(routes.account.center()).toBe(ACCOUNT_CENTER)
  })

  it('account.address({ selectMode }) 应包含 selectMode', () => {
    const url = routes.account.address({ selectMode: 'checkout' })
    expect(url).toContain('selectMode=checkout')
  })

  it('account.billDetail(id) 应包含 billId 参数', () => {
    const url = routes.account.billDetail('BILL001')
    expect(url).toContain(BILL_DETAIL)
    expect(url).toContain('billId=BILL001')
  })

  it('account.billPay(id) 应包含 billId 和 source=bill 参数', () => {
    const url = routes.account.billPay('BILL001')
    expect(url).toContain(PAY_PAGE)
    expect(url).toContain('billId=BILL001')
    expect(url).toContain('source=bill')
  })

  it('content.news() 应返回 NEWS', () => {
    expect(routes.content.news()).toBe(NEWS)
  })

  it('content.newsDetail(id) 应包含 id 参数', () => {
    const url = routes.content.newsDetail(100)
    expect(url).toContain(NEWS_DETAIL)
    expect(url).toContain('id=100')
  })

  it('content.manualPreview(id) 应包含 manualId 参数', () => {
    const url = routes.content.manualPreview('manual01')
    expect(url).toContain(MANUAL_PREVIEW)
    expect(url).toContain('manualId=manual01')
  })

  it('content.help() 应返回 HELP', () => {
    expect(routes.content.help()).toBe(HELP)
  })

  it('content.about() 应返回 ABOUT', () => {
    expect(routes.content.about()).toBe(ABOUT)
  })
})

describe('Routes - 必填 ID 缺失时抛错', () => {
  it('productDetail() 缺少 ID 应抛错', () => {
    expect(() => routes.commerce.productDetail()).toThrow()
    expect(() => routes.commerce.productDetail(undefined)).toThrow()
    expect(() => routes.commerce.productDetail(null)).toThrow()
    expect(() => routes.commerce.productDetail('')).toThrow()
    expect(() => routes.commerce.productDetail(0)).toThrow()
    expect(() => routes.commerce.productDetail(-1)).toThrow()
  })

  it('productVariants() 缺少 ID 应抛错', () => {
    expect(() => routes.commerce.productVariants()).toThrow()
    expect(() => routes.commerce.productVariants(null)).toThrow()
    expect(() => routes.commerce.productVariants('  ')).toThrow()
  })

  it('order.detail() 缺少 ID 应抛错', () => {
    expect(() => routes.order.detail()).toThrow()
    expect(() => routes.order.detail(null)).toThrow()
    expect(() => routes.order.detail('')).toThrow()
    expect(() => routes.order.detail(NaN)).toThrow()
  })

  it('order.pay() 缺少 ID 应抛错', () => {
    expect(() => routes.order.pay()).toThrow()
    expect(() => routes.order.pay(undefined)).toThrow()
    expect(() => routes.order.pay(null)).toThrow()
    expect(() => routes.order.pay(0)).toThrow()
  })

  it('order.afterSaleApply() 缺少 ID 应抛错', () => {
    expect(() => routes.order.afterSaleApply()).toThrow()
    expect(() => routes.order.afterSaleApply(null)).toThrow()
    expect(() => routes.order.afterSaleApply('')).toThrow()
  })

  it('account.billDetail() 缺少 ID 应抛错', () => {
    expect(() => routes.account.billDetail()).toThrow()
    expect(() => routes.account.billDetail(null)).toThrow()
    expect(() => routes.account.billDetail('')).toThrow()
  })

  it('account.billPay() 缺少 ID 应抛错', () => {
    expect(() => routes.account.billPay()).toThrow()
    expect(() => routes.account.billPay(null)).toThrow()
    expect(() => routes.account.billPay('')).toThrow()
  })

  it('content.newsDetail() 缺少 ID 应抛错', () => {
    expect(() => routes.content.newsDetail()).toThrow()
    expect(() => routes.content.newsDetail(null)).toThrow()
    expect(() => routes.content.newsDetail('')).toThrow()
  })

  it('content.manualPreview() 缺少 ID 应抛错', () => {
    expect(() => routes.content.manualPreview()).toThrow()
    expect(() => routes.content.manualPreview(null)).toThrow()
    expect(() => routes.content.manualPreview('')).toThrow()
  })

  it('字符串 ID 应支持 trim', () => {
    const url = routes.content.newsDetail('  abc  ')
    expect(url).toContain('id=abc')
  })
})

describe('Routes - buildQuery 严格校验', () => {
  it('undefined / null / 空对象 不输出', () => {
    expect(buildQuery(undefined)).toBe('')
    expect(buildQuery(null)).toBe('')
    expect(buildQuery({})).toBe('')
  })

  it('拒绝 primitive（字符串）参数', () => {
    expect(() => buildQuery('foo')).toThrow(TypeError)
  })

  it('拒绝 primitive（数字）参数', () => {
    expect(() => buildQuery(123)).toThrow(TypeError)
  })

  it('拒绝数组参数', () => {
    expect(() => buildQuery([1, 2, 3])).toThrow(TypeError)
  })

  it('拒绝对象 value（避免 [object Object]）', () => {
    expect(() => buildQuery({ key: { nested: 1 } })).toThrow(TypeError)
  })

  it('过滤 undefined / null 值', () => {
    const qs = buildQuery({ a: 1, b: undefined, c: null, d: 'x' })
    expect(qs).toBe('a=1&d=x')
  })

  it('key 和 value 都 encodeURIComponent', () => {
    const qs = buildQuery({ 'key space': 'a&b=c' })
    expect(qs).toContain(encodeURIComponent('key space'))
    expect(qs).toContain(encodeURIComponent('a&b=c'))
  })
})

describe('Routes - normalizeRoutePath', () => {
  it('移除 query', () => {
    expect(normalizeRoutePath('/subPackages/auth/pages/agreement/index?type=privacy'))
      .toBe('/subPackages/auth/pages/agreement/index')
  })

  it('移除 hash', () => {
    expect(normalizeRoutePath('/pages/home/index#section'))
      .toBe('/pages/home/index')
  })

  it('移除 query + hash', () => {
    expect(normalizeRoutePath('/pages/home/index?a=1#section'))
      .toBe('/pages/home/index')
  })

  it('保留开头 /', () => {
    expect(normalizeRoutePath('pages/home/index'))
      .toBe('/pages/home/index')
  })

  it('空值返回空字符串', () => {
    expect(normalizeRoutePath('')).toBe('')
    expect(normalizeRoutePath(null)).toBe('')
    expect(normalizeRoutePath(undefined)).toBe('')
  })
})

describe('Routes - isRegisteredRoute', () => {
  it('已注册路径返回 true', () => {
    expect(isRegisteredRoute('/pages/home/index')).toBe(true)
    expect(isRegisteredRoute('/subPackages/commerce/pages/cart/index')).toBe(true)
  })

  it('带 query 的已注册路径返回 true', () => {
    expect(isRegisteredRoute('/pages/home/index?foo=bar')).toBe(true)
  })

  it('未注册路径返回 false', () => {
    expect(isRegisteredRoute('/pages/unknown/index')).toBe(false)
    expect(isRegisteredRoute('/foo/bar')).toBe(false)
  })

  it('空值返回 false', () => {
    expect(isRegisteredRoute('')).toBe(false)
    expect(isRegisteredRoute(null)).toBe(false)
  })
})

describe('Routes - sanitizeRedirect', () => {
  it('拒绝 http 外链', () => {
    expect(sanitizeRedirect('http://evil.com')).toBe(HOME)
    expect(sanitizeRedirect('https://evil.com')).toBe(HOME)
  })

  it('拒绝 // 伪协议', () => {
    expect(sanitizeRedirect('//evil.com')).toBe(HOME)
  })

  it('拒绝 javascript: 协议', () => {
    expect(sanitizeRedirect('javascript:alert(1)')).toBe(HOME)
  })

  it('拒绝 data: 协议', () => {
    expect(sanitizeRedirect('data:text/html,<h1>1</h1>')).toBe(HOME)
  })

  it('拒绝路径穿越', () => {
    expect(sanitizeRedirect('/pages/home/../../etc/passwd')).toBe(HOME)
  })

  it('拒绝未注册内部路由', () => {
    expect(sanitizeRedirect('/pages/secret/index')).toBe(HOME)
  })

  it('拒绝 login 自循环', () => {
    expect(sanitizeRedirect(LOGIN)).toBe(HOME)
  })

  it('拒绝 startup 目标', () => {
    expect(sanitizeRedirect(STARTUP)).toBe(HOME)
  })

  it('允许合法已注册内部路径', () => {
    expect(sanitizeRedirect('/pages/home/index')).toBe('/pages/home/index')
    expect(sanitizeRedirect('/subPackages/commerce/pages/cart/index')).toBe('/subPackages/commerce/pages/cart/index')
  })

  it('空值返回 fallback', () => {
    expect(sanitizeRedirect('')).toBe(HOME)
    expect(sanitizeRedirect(null, LOGIN)).toBe(LOGIN)
  })
})

describe('Routes - 工厂函数 query 编码', () => {
  it('应正确编码特殊字符', () => {
    const url = routes.auth.login({ redirect: '/pages/home/index?foo=bar&baz=qux' })
    expect(url).toContain(encodeURIComponent('/pages/home/index?foo=bar&baz=qux'))
  })

  it('应过滤 undefined 和 null 参数', () => {
    const url = routes.commerce.productList({ categoryId: 1, sort: undefined, filter: null })
    expect(url).toContain('categoryId=1')
    expect(url).not.toContain('sort=')
    expect(url).not.toContain('filter=')
  })

  it('无参数时不应添加 query string', () => {
    const url = routes.account.center()
    expect(url).not.toContain('?')
  })
})
