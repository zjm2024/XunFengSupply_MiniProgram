/**
 * 路由守卫测试
 *
 * 覆盖：
 * 1. 判定顺序：注册 -> 公开 -> 登录 -> 冻结 -> 签约 -> 主账号
 * 2. 带 query 的公开协议页仍公开
 * 3. 未登录访问商品详情跳登录，保留完整 redirect
 * 4. 已登录未签约访问购物车跳 applySign
 * 5. 冻结用户只能访问 allowFrozen 页面
 * 6. 非主账号访问 subAccount 被拒绝
 * 7. 未注册内部路径被拒绝
 * 8. query 不影响 routeMeta 匹配
 */
import { describe, it, expect } from 'vitest'
import { canAccess, isPublicRoute, isFrozenAllowed } from '@/app/navigation/routeGuard.js'
import { PRODUCT_LIST, PRODUCT_DETAIL, CART, SUB_ACCOUNT, ACCOUNT_STATUS, AGREEMENT, HELP, ABOUT, HOME, LOGIN, STARTUP } from '@/app/config/routes.js'

describe('RouteGuard - 公开页面', () => {
  it('STARTUP 应始终允许', () => {
    const result = canAccess(STARTUP, { isLogin: false, isSigned: false, isFrozen: false, isMainAccount: false })
    expect(result.allowed).toBe(true)
  })

  it('LOGIN 应始终允许（无需登录状态）', () => {
    const result = canAccess(LOGIN, { isLogin: false, isSigned: false, isFrozen: false, isMainAccount: false })
    expect(result.allowed).toBe(true)
  })

  it('带 query 的公开协议页仍公开', () => {
    const result = canAccess(`${AGREEMENT}?type=privacy`, { isLogin: false })
    expect(result.allowed).toBe(true)
  })

  it('ACCOUNT_STATUS 应始终允许', () => {
    const result = canAccess(ACCOUNT_STATUS, { isLogin: false })
    expect(result.allowed).toBe(true)
  })

  it('isPublicRoute 识别公开路由', () => {
    expect(isPublicRoute(LOGIN)).toBe(true)
    expect(isPublicRoute(`${LOGIN}?redirect=xxx`)).toBe(true)
    expect(isPublicRoute(HOME)).toBe(false)
  })
})

describe('RouteGuard - 未登录访问受保护页面', () => {
  it('未登录访问 HOME 应拒绝', () => {
    const result = canAccess(HOME, { isLogin: false })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('NOT_LOGGED_IN')
  })

  it('未登录访问商品详情应拒绝', () => {
    const result = canAccess(`${PRODUCT_DETAIL}?productId=5`, { isLogin: false })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('NOT_LOGGED_IN')
  })

  it('未登录访问购物车应拒绝', () => {
    const result = canAccess(CART, { isLogin: false })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('NOT_LOGGED_IN')
  })
})

describe('RouteGuard - 已登录未签约', () => {
  const loggedInUnsigned = { isLogin: true, isSigned: false, isFrozen: false, isMainAccount: true }

  it('已登录未签约访问商品列表应放行 (商品浏览不需要签约)', () => {
    const result = canAccess(PRODUCT_LIST, loggedInUnsigned)
    expect(result.allowed).toBe(true)
  })

  it('已登录未签约访问购物车应拒绝 (NOT_SIGNED)', () => {
    const result = canAccess(CART, loggedInUnsigned)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('NOT_SIGNED')
  })

  it('已登录未签约访问 HOME 应放行', () => {
    const result = canAccess(HOME, loggedInUnsigned)
    expect(result.allowed).toBe(true)
  })

  it('已登录未签约访问 ACCOUNT_STATUS 应放行', () => {
    const result = canAccess(ACCOUNT_STATUS, loggedInUnsigned)
    expect(result.allowed).toBe(true)
  })
})

describe('RouteGuard - 冻结账号', () => {
  const frozen = { isLogin: true, isSigned: true, isFrozen: true, isMainAccount: true }

  it('冻结用户访问 HOME 应拒绝', () => {
    const result = canAccess(HOME, frozen)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('ACCOUNT_FROZEN')
  })

  it('冻结用户访问 ACCOUNT_STATUS 应放行', () => {
    const result = canAccess(ACCOUNT_STATUS, frozen)
    expect(result.allowed).toBe(true)
  })

  it('冻结用户访问 HELP 应放行', () => {
    const result = canAccess(HELP, frozen)
    expect(result.allowed).toBe(true)
  })

  it('冻结用户访问 ABOUT 应放行', () => {
    const result = canAccess(ABOUT, frozen)
    expect(result.allowed).toBe(true)
  })

  it('isFrozenAllowed 识别冻结友好路由', () => {
    expect(isFrozenAllowed(ACCOUNT_STATUS)).toBe(true)
    expect(isFrozenAllowed(HELP)).toBe(true)
    expect(isFrozenAllowed(HOME)).toBe(false)
    expect(isFrozenAllowed(PRODUCT_LIST)).toBe(false)
  })
})

describe('RouteGuard - 主账号限制', () => {
  const loggedInNonMaster = { isLogin: true, isSigned: true, isFrozen: false, isMainAccount: false }

  it('非主账号访问 subAccount 应拒绝', () => {
    const result = canAccess(SUB_ACCOUNT, loggedInNonMaster)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('MAIN_ACCOUNT_ONLY')
  })

  it('主账号访问 subAccount 应放行', () => {
    const master = { isLogin: true, isSigned: true, isFrozen: false, isMainAccount: true }
    const result = canAccess(SUB_ACCOUNT, master)
    expect(result.allowed).toBe(true)
  })
})

describe('RouteGuard - 未注册路由', () => {
  it('未注册内部路径应拒绝', () => {
    const result = canAccess('/pages/secret/index', { isLogin: true })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('NOT_REGISTERED')
  })

  it('空字符串应拒绝', () => {
    const result = canAccess('', { isLogin: true })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('NOT_REGISTERED')
  })

  it('null / undefined 应拒绝', () => {
    const result = canAccess(null, { isLogin: true })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('NOT_REGISTERED')
  })
})

describe('RouteGuard - query 不影响 routeMeta 匹配', () => {
  it('带 query 的商品详情仍能正确判定 (未签约可浏览)', () => {
    const result = canAccess(`${PRODUCT_DETAIL}?productId=10`, { isLogin: true, isSigned: false })
    expect(result.allowed).toBe(true)
  })

  it('带 query 的商品详情仍能正确判定 (已签约)', () => {
    const result = canAccess(`${PRODUCT_DETAIL}?productId=10`, { isLogin: true, isSigned: true })
    expect(result.allowed).toBe(true)
    expect(result.path).toBe(PRODUCT_DETAIL)
  })
})
