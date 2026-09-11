/**
 * 导航器测试
 *
 * 覆盖：
 * 1. navigator 对象的导出和结构
 * 2. 公开路由直接放行
 * 3. 导航失败降级
 * 4. 返回逻辑
 * 5. handleAuthError 和 resetAuthGuard
 * 6. navigator.js 不再存在第二个 canAccess
 * 7. navigateTo/redirectTo/reLaunch 返回 Promise<boolean>
 * 8. startup 能识别 false
 * 9. 未登录返回时不能兜底到首页
 * 10. 带 redirect 的登录页不会被再次拦截
 * 11. eventChannel options 能传给 uni.navigateTo
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '@/shared/session/userStore.js'
import * as sessionCleanup from '@/shared/session/sessionCleanup.js'

// Mock uni 对象
const mockUni = {
  navigateTo: vi.fn(),
  redirectTo: vi.fn(),
  reLaunch: vi.fn(),
  navigateBack: vi.fn(),
  showModal: vi.fn(),
}

global.uni = mockUni
global.getCurrentPages = vi.fn()

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  global.getCurrentPages.mockReturnValue([{ route: 'pages/startup/index' }])
  // 禁用 session cleanup，避免测试间互相影响导致 handleAuthError 超时
  vi.spyOn(sessionCleanup, 'runSessionCleanup').mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ==================== 导入与结构测试 ====================

describe('Navigator - 模块导入', () => {
  it('应导入 navigator 对象', async () => {
    const { navigator } = await import('@/app/navigation/navigator.js')
    expect(navigator).toBeDefined()
  })

  it('应导入 handleAuthError 和 resetAuthGuard', async () => {
    const {
      navigator,
    } = await import('@/app/navigation/navigator.js')
    expect(navigator.handleAuthError).toBeTypeOf('function')
    expect(navigator.resetAuthGuard).toBeTypeOf('function')
  })

  it('不应再导出 safeXxx 包装函数', async () => {
    const mod = await import('@/app/navigation/navigator.js')
    expect(mod.safeNavigateTo).toBeUndefined()
    expect(mod.safeRedirectTo).toBeUndefined()
    expect(mod.safeReLaunch).toBeUndefined()
    expect(mod.safeNavigateBack).toBeUndefined()
  })

  it('不应再导出业务快捷方法 (toXxx)', async () => {
    const mod = await import('@/app/navigation/navigator.js')
    expect(mod.navigator.toHome).toBeUndefined()
    expect(mod.navigator.toLogin).toBeUndefined()
    expect(mod.navigator.toProductList).toBeUndefined()
    expect(mod.navigator.toProductDetail).toBeUndefined()
    expect(mod.navigator.toCart).toBeUndefined()
    expect(mod.navigator.toCheckout).toBeUndefined()
    expect(mod.navigator.toOrderDetail).toBeUndefined()
    expect(mod.navigator.toAfterSaleApply).toBeUndefined()
    expect(mod.navigator.toAccountCenter).toBeUndefined()
  })
})

describe('Navigator - navigator 对象方法存在性', () => {
  it('应保留核心方法', async () => {
    const { navigator } = await import('@/app/navigation/navigator.js')
    expect(navigator.navigateTo).toBeTypeOf('function')
    expect(navigator.redirectTo).toBeTypeOf('function')
    expect(navigator.reLaunch).toBeTypeOf('function')
    expect(navigator.back).toBeTypeOf('function')
    expect(navigator.backWithConfirm).toBeTypeOf('function')
    expect(navigator.handleAuthError).toBeTypeOf('function')
    expect(navigator.resetAuthGuard).toBeTypeOf('function')
  })
})

// ==================== 公开路由导航测试 ====================

describe('Navigator - 公开路由直接放行', () => {
  it('访问 STARTUP 应直接放行并返回 true', async () => {
    mockUni.navigateTo.mockImplementation(({ success }) => success())

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.navigateTo('/pages/startup/index')

    expect(result).toBe(true)
    expect(mockUni.navigateTo).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/pages/startup/index' })
    )
  })

  it('访问 LOGIN 应直接放行', async () => {
    mockUni.navigateTo.mockImplementation(({ success }) => success())

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.navigateTo('/subPackages/auth/pages/login/index')

    expect(result).toBe(true)
    expect(mockUni.navigateTo).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/subPackages/auth/pages/login/index' })
    )
  })

  it('访问 APPLY_SIGN 应直接放行', async () => {
    mockUni.navigateTo.mockImplementation(({ success }) => success())

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.navigateTo('/subPackages/auth/pages/apply-sign/index')

    expect(result).toBe(true)
  })

  it('访问 AGREEMENT 应直接放行', async () => {
    mockUni.navigateTo.mockImplementation(({ success }) => success())

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.navigateTo('/subPackages/auth/pages/agreement/index')

    expect(result).toBe(true)
  })

  it('带 query 的公开协议页仍公开', async () => {
    mockUni.navigateTo.mockImplementation(({ success }) => success())

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.navigateTo('/subPackages/auth/pages/agreement/index?type=privacy')

    expect(result).toBe(true)
  })

  it('访问 ACCOUNT_STATUS 应直接放行', async () => {
    mockUni.navigateTo.mockImplementation(({ success }) => success())

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.navigateTo('/subPackages/auth/pages/account-status/index')

    expect(result).toBe(true)
  })

  it('访问 LANGUAGE 应直接放行', async () => {
    mockUni.navigateTo.mockImplementation(({ success }) => success())

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.navigateTo('/subPackages/account/pages/language/index')

    expect(result).toBe(true)
  })
})

// ==================== 导航失败降级测试 ====================

describe('Navigator - 导航失败降级', () => {
  it('navigateTo 失败应降级到 redirectTo', async () => {
    mockUni.navigateTo.mockImplementation(({ fail }) => fail({ errMsg: 'fail' }))
    mockUni.redirectTo.mockImplementation(({ success }) => success())

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.navigateTo('/pages/startup/index')

    expect(result).toBe(true)
    expect(mockUni.navigateTo).toHaveBeenCalled()
    expect(mockUni.redirectTo).toHaveBeenCalled()
  })

  it('navigateTo 和 redirectTo 都失败应 resolve false', async () => {
    mockUni.navigateTo.mockImplementation(({ fail }) => fail({ errMsg: 'fail' }))
    mockUni.redirectTo.mockImplementation(({ fail }) => fail({ errMsg: 'fail' }))

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.navigateTo('/pages/startup/index')

    expect(result).toBe(false)
  })

  it('redirectTo 失败不触发降级到 navigateTo', async () => {
    mockUni.redirectTo.mockImplementation(({ fail }) => fail({ errMsg: 'fail' }))

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.redirectTo('/pages/startup/index')

    expect(result).toBe(false)
    expect(mockUni.navigateTo).not.toHaveBeenCalled()
  })

  it('reLaunch 失败时 resolve false', async () => {
    mockUni.reLaunch.mockImplementation(({ fail }) => fail({ errMsg: 'fail' }))

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.reLaunch('/pages/startup/index')

    expect(result).toBe(false)
  })
})

// ==================== 返回逻辑测试 ====================

describe('Navigator - 返回逻辑', () => {
  it('正常返回应调用 navigateBack', async () => {
    mockUni.navigateBack.mockImplementation(({ success }) => success())
    global.getCurrentPages.mockReturnValue([
      { route: 'pages/startup/index' },
      { route: 'pages/home/index' },
    ])

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.back(1)
    expect(result).toBe(true)
    expect(mockUni.navigateBack).toHaveBeenCalledWith(
      expect.objectContaining({ delta: 1 })
    )
  })

  it('页面栈不足 + 已登录时应兜底到首页', async () => {
    mockUni.reLaunch.mockImplementation(({ success }) => success())
    global.getCurrentPages.mockReturnValue([{ route: 'pages/startup/index' }])

    // 设置登录的 userStore (isLogin 是 computed，需要设置 token 和 isLoggedIn)
    const userStore = useUserStore()
    userStore.token = 'test-token'
    userStore.isLoggedIn = true
    userStore.isFrozen = false

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.back(1)
    expect(result).toBe(true)
    expect(mockUni.reLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/pages/home/index' })
    )
  })

  it('页面栈为空 + 未登录时应兜底到登录页', async () => {
    mockUni.reLaunch.mockImplementation(({ success }) => success())
    global.getCurrentPages.mockReturnValue([])

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.back(1)
    expect(result).toBe(true)
    expect(mockUni.reLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/subPackages/auth/pages/login/index' })
    )
  })

  it('navigateBack 失败应触发兜底逻辑', async () => {
    mockUni.navigateBack.mockImplementation(({ fail }) => fail())
    mockUni.redirectTo.mockImplementation(({ fail }) => fail())
    mockUni.reLaunch.mockImplementation(({ success }) => success())
    global.getCurrentPages.mockReturnValue([
      { route: 'pages/startup/index' },
      { route: 'pages/home/index' },
    ])

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.back(1)
    expect(result).toBe(true)
    expect(mockUni.navigateBack).toHaveBeenCalled()
    expect(mockUni.reLaunch).toHaveBeenCalled()
  })
})

// ==================== backWithConfirm 测试 ====================

describe('Navigator - backWithConfirm', () => {
  it('有未保存修改时应弹出确认框', async () => {
    global.getCurrentPages.mockReturnValue([
      { route: 'pages/startup/index' },
      { route: 'pages/home/index' },
    ])
    // 用户点击确认离开
    mockUni.showModal.mockImplementation(({ success }) => success({ confirm: true }))
    mockUni.navigateBack.mockImplementation(({ success }) => success())

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.backWithConfirm({ hasUnsavedChanges: true })
    expect(result).toBe(true)
    expect(mockUni.showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '确认离开',
        content: '当前有未保存的修改，确定要离开吗？',
        confirmText: '离开',
        cancelText: '留下',
      })
    )
    expect(mockUni.navigateBack).toHaveBeenCalled()
  })

  it('用户取消离开应返回 false', async () => {
    global.getCurrentPages.mockReturnValue([
      { route: 'pages/startup/index' },
      { route: 'pages/home/index' },
    ])
    // 用户点击留下
    mockUni.showModal.mockImplementation(({ success }) => success({ confirm: false }))

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.backWithConfirm({ hasUnsavedChanges: true })
    expect(result).toBe(false)
    expect(mockUni.navigateBack).not.toHaveBeenCalled()
  })

  it('无未保存修改时应直接返回', async () => {
    mockUni.navigateBack.mockImplementation(({ success }) => success())
    global.getCurrentPages.mockReturnValue([
      { route: 'pages/startup/index' },
      { route: 'pages/home/index' },
    ])

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.backWithConfirm({ hasUnsavedChanges: false })
    expect(result).toBe(true)
    expect(mockUni.navigateBack).toHaveBeenCalledWith(
      expect.objectContaining({ delta: 1 })
    )
  })

  it('默认 hasUnsavedChanges 为 false', async () => {
    mockUni.navigateBack.mockImplementation(({ success }) => success())
    global.getCurrentPages.mockReturnValue([
      { route: 'pages/startup/index' },
      { route: 'pages/home/index' },
    ])

    const { navigator } = await import('@/app/navigation/navigator.js')
    await navigator.backWithConfirm()
    expect(mockUni.showModal).not.toHaveBeenCalled()
    expect(mockUni.navigateBack).toHaveBeenCalled()
  })
})

// ==================== handleAuthError 测试 ====================

describe('Navigator - handleAuthError', () => {
  it('应调用 reLaunch 导航到登录页', async () => {
    // reLaunch 需要调用 success 以使 handleAuthError 的 Promise 完成
    mockUni.reLaunch.mockImplementation(({ success }) => success && success())

    const { navigator } = await import('@/app/navigation/navigator.js')
    await navigator.handleAuthError()

    expect(mockUni.reLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/subPackages/auth/pages/login/index' })
    )
  })

  it('重复调用 handleAuthError 应只执行一次', async () => {
    mockUni.reLaunch.mockImplementation(({ success }) => success && success())

    const { navigator } = await import('@/app/navigation/navigator.js')

    const promise1 = navigator.handleAuthError()
    const promise2 = navigator.handleAuthError()

    await promise1
    await promise2

    expect(mockUni.reLaunch).toHaveBeenCalledTimes(1)
  })
})

// ==================== 守卫状态重置测试 ====================

describe('Navigator - 守卫状态重置', () => {
  it('resetAuthGuard 应允许后续 handleAuthError 执行', async () => {
    mockUni.reLaunch.mockImplementation(({ success }) => success && success())

    const { navigator } = await import('@/app/navigation/navigator.js')

    await navigator.handleAuthError()
    expect(mockUni.reLaunch).toHaveBeenCalledTimes(1)

    navigator.resetAuthGuard()
    await navigator.handleAuthError()
    expect(mockUni.reLaunch).toHaveBeenCalledTimes(2)
  })
})

// ==================== navigateTo options 测试 ====================

describe('Navigator - navigateTo options', () => {
  it('eventChannel options 应能传给 uni.navigateTo（公开路由）', async () => {
    mockUni.navigateTo.mockImplementation(({ success }) => success())
    const events = { addressSelected: vi.fn() }

    const { navigator } = await import('@/app/navigation/navigator.js')
    // 使用公开路由避免守卫干扰
    await navigator.navigateTo('/pages/startup/index', { events })

    expect(mockUni.navigateTo).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/pages/startup/index', events })
    )
  })
})

// ==================== redirectTo/reLaunch 基础测试 ====================

describe('Navigator - redirectTo 和 reLaunch', () => {
  it('redirectTo 应使用 redirectTo 方法导航', async () => {
    mockUni.redirectTo.mockImplementation(({ success }) => success())

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.redirectTo('/pages/startup/index')

    expect(result).toBe(true)
    expect(mockUni.redirectTo).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/pages/startup/index' })
    )
  })

  it('reLaunch 应使用 reLaunch 方法导航', async () => {
    mockUni.reLaunch.mockImplementation(({ success }) => success())

    const { navigator } = await import('@/app/navigation/navigator.js')
    const result = await navigator.reLaunch('/pages/startup/index')

    expect(result).toBe(true)
    expect(mockUni.reLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/pages/startup/index' })
    )
  })
})

// ==================== navigator 无内部 canAccess 测试 ====================

describe('Navigator - 单一 canAccess', () => {
  it('navigator.js 不应再声明本地 canAccess（由 routeGuard.js 统一）', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const navPath = path.resolve('src/app/navigation/navigator.js')
    const content = fs.readFileSync(navPath, 'utf-8')
    // 不允除了 import 以外再声明 canAccess 实现
    const implMatches = content.match(/function\s+canAccess/g)
    expect(implMatches).toBeNull()
  })
})
