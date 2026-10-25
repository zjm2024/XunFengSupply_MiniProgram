import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mocks = vi.hoisted(() => ({ user: { token: 'test-token' }, savePreference: vi.fn() }))
vi.mock('@/shared/session/userStore.js', () => ({ useUserStore: () => mocks.user }))
vi.mock('@/shared/api/auth.js', () => ({ updateLanguage: mocks.savePreference }))
vi.mock('@/app/navigation/navigator.js', () => ({ navigator: { handleAuthError: vi.fn() } }))

let runtime
let persistence
let values
let requestSpy

beforeEach(async () => {
  vi.resetModules()
  mocks.user.token = 'test-token'
  mocks.savePreference.mockReset().mockResolvedValue(undefined)
  values = new Map()
  requestSpy = vi.fn()
  vi.stubGlobal('uni', {
    getStorageSync: vi.fn(key => values.get(key) ?? ''),
    setStorageSync: vi.fn((key, value) => values.set(key, value)),
    removeStorageSync: vi.fn(key => values.delete(key)),
    request: requestSpy,
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    setLocale: vi.fn(),
    reLaunch: vi.fn(),
  })
  runtime = await import('@/shared/i18n/index.js')
  const { registerMainLocales } = await import('@/app/i18n/registerMain.js')
  registerMainLocales()
  persistence = await import('@/app/i18n/localePersistence.js')
})

afterEach(() => vi.unstubAllGlobals())

describe('i18n runtime and storage', () => {
  it.each([['en', 'en-US'], ['EN_gb', 'en-US'], ['zh-TW', 'zh-CN'], ['ja', 'zh-CN'],
    ['', 'zh-CN'], [null, 'zh-CN']])('normalizes %s', (input, expected) => {
    expect(runtime.normalizeLocale(input)).toBe(expected)
  })

  it('migrates legacy language to the single prefixed storage key', () => {
    values.set('app_language', 'en')
    expect(persistence.initializeAppLocale()).toBe('en-US')
    expect(values.get('xf_b2b_language')).toBe('en-US')
    expect(values.has('app_language')).toBe(false)
    expect(runtime.getLocale()).toBe('en-US')
    expect(uni.setLocale).not.toHaveBeenCalled()
    expect(uni.reLaunch).not.toHaveBeenCalled()
  })

  it('gives the existing unified key priority and preserves the preference on logout', async () => {
    values.set('app_language', 'en')
    values.set('xf_b2b_language', 'zh-CN')
    persistence.initializeAppLocale()
    const { default: storage } = await import('@/shared/utils/storage.js')
    storage.clearAllForLogout()
    expect(values.get('xf_b2b_language')).toBe('zh-CN')
  })

  it('changes already-created and hidden view consumers without clearing form state', async () => {
    const { computed, reactive } = await import('vue')
    const form = reactive({ quantity: 3, remark: '不要翻译我的备注' })
    const visibleTitle = computed(() => runtime.t('main.nav.home'))
    const hiddenTab = computed(() => runtime.t('main.nav.cart'))
    expect(visibleTitle.value).toBe('首页')
    expect(hiddenTab.value).toBe('购物车')
    persistence.setAppLocale('en')
    expect(visibleTitle.value).toBe('Home')
    expect(hiddenTab.value).toBe('Cart')
    expect(form).toEqual({ quantity: 3, remark: '不要翻译我的备注' })
    expect(requestSpy).not.toHaveBeenCalled()
    expect(uni.setLocale).not.toHaveBeenCalled()
    expect(uni.reLaunch).not.toHaveBeenCalled()
  })

  it('falls back to Chinese and interpolates only named display parameters', () => {
    runtime.registerNamespace('fixture', { owner: 'test', zhCN: { missing: '中文回退', greeting: '您好 {name}' },
      enUS: { greeting: 'Hello {name}' } })
    runtime.setLocale('en-US')
    expect(runtime.t('fixture.missing')).toBe('中文回退')
    expect(runtime.t('fixture.greeting', { name: '用户' })).toBe('Hello 用户')
  })

  it('is idempotent for the same registration but rejects namespace collisions', () => {
    const entry = { owner: 'fixture', zhCN: { title: '标题' }, enUS: { title: 'Title' } }
    runtime.registerNamespace('fixture', entry)
    expect(() => runtime.registerNamespace('fixture', entry)).not.toThrow()
    expect(() => runtime.registerNamespace('fixture', { ...entry, owner: 'another' })).toThrow(/Duplicate/)
  })

  it('registers account resources before page render without loading them in the main entry', async () => {
    await import('@/subPackages/account/i18n/register.js')
    runtime.setLocale('en')
    expect(runtime.t('account.language.title')).toBe('Language')
    const main = readFileSync(resolve('src/app/i18n/registerMain.js'), 'utf8')
    const core = readFileSync(resolve('src/shared/i18n/index.js'), 'utf8')
    const page = readFileSync(resolve('src/subPackages/account/pages/language/index.vue'), 'utf8')
    expect(main).not.toMatch(/subPackages/)
    expect(core).not.toMatch(/from ['"][^'"]*(?:api|session|store|subPackages)/)
    expect(page).not.toMatch(/import .*\.json/)
    expect(page).toContain("import '../../i18n/register.js'")
  })
})

describe('account language preference synchronization', () => {
  it('does not resubmit a successfully saved current language', async () => {
    const { useLanguageSettings } = await import('@/subPackages/account/composables/useLanguageSettings.js')
    const settings = useLanguageSettings()
    await expect(settings.selectLanguage('en-US')).resolves.toBe('saved')
    await expect(settings.selectLanguage('en-US')).resolves.toBeNull()
    expect(runtime.getLocale()).toBe('en-US')
    expect(mocks.savePreference).toHaveBeenCalledTimes(1)
    expect(values.get('xf_b2b_language')).toBe('en-US')
    expect(uni.setLocale).not.toHaveBeenCalled()
    expect(uni.reLaunch).not.toHaveBeenCalled()
  })

  it('saves once for an explicit selection and blocks overlapping preference writes', async () => {
    let complete
    mocks.savePreference.mockImplementation(() => new Promise(resolve => { complete = resolve }))
    const { useLanguageSettings } = await import('@/subPackages/account/composables/useLanguageSettings.js')
    const settings = useLanguageSettings()
    const pending = settings.selectLanguage('en-US')
    expect(runtime.getLocale()).toBe('en-US')
    expect(settings.saving.value).toBe(true)
    expect(mocks.savePreference).toHaveBeenCalledTimes(1)
    expect(mocks.savePreference).toHaveBeenCalledWith('en-US')
    await expect(settings.selectLanguage('zh-CN')).resolves.toBeNull()
    complete()
    await expect(pending).resolves.toBe('saved')
    expect(settings.saving.value).toBe(false)
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('does not write account preference when signed out', async () => {
    mocks.user.token = ''
    const { useLanguageSettings } = await import('@/subPackages/account/composables/useLanguageSettings.js')
    await expect(useLanguageSettings().selectLanguage('en-US')).resolves.toBe('local')
    expect(mocks.savePreference).not.toHaveBeenCalled()
    expect(runtime.getLocale()).toBe('en-US')
  })

  it('keeps local language on failure and only retries when the user explicitly selects it again', async () => {
    mocks.savePreference.mockRejectedValueOnce(new Error('offline'))
    const { useLanguageSettings } = await import('@/subPackages/account/composables/useLanguageSettings.js')
    const settings = useLanguageSettings()
    await expect(settings.selectLanguage('en-US')).resolves.toBe('local-only')
    expect(runtime.getLocale()).toBe('en-US')
    expect(settings.syncFailed.value).toBe(true)
    expect(mocks.savePreference).toHaveBeenCalledTimes(1)
    mocks.savePreference.mockResolvedValueOnce(undefined)
    await expect(settings.selectLanguage('en-US')).resolves.toBe('saved')
    expect(mocks.savePreference).toHaveBeenCalledTimes(2)
    expect(settings.syncFailed.value).toBe(false)
    expect(requestSpy).not.toHaveBeenCalled()
  })
})

describe('maintained resource consistency', () => {
  it.each(['shared/locales/common', 'app/locales/main', 'subPackages/account/i18n', 'subPackages/auth/i18n', 'subPackages/order/i18n', 'subPackages/commerce/i18n', 'subPackages/content/i18n'])(
    'has matching keys and display parameters: %s', (directory) => {
      const flatten = (value, prefix = '') => Object.entries(value).flatMap(([key, text]) =>
        typeof text === 'string' ? [[prefix + key, text]] : flatten(text, prefix + key + '.'))
      const chinese = Object.fromEntries(flatten(JSON.parse(readFileSync(resolve('src', directory, 'zh-CN.json'), 'utf8'))))
      const english = Object.fromEntries(flatten(JSON.parse(readFileSync(resolve('src', directory, 'en-US.json'), 'utf8'))))
      expect(Object.keys(english).sort()).toEqual(Object.keys(chinese).sort())
      for (const key of Object.keys(chinese)) {
        expect(english[key].trim()).not.toBe('')
        expect((english[key].match(/\{[A-Za-z][A-Za-z0-9_]*\}/g) || []).sort())
          .toEqual((chinese[key].match(/\{[A-Za-z][A-Za-z0-9_]*\}/g) || []).sort())
      }
    })
})

describe('request language and business-result invariants', () => {
  it('sends the current language and fully handles an in-flight write exactly once', async () => {
    const { dispatch } = await import('@/shared/api/dispatchClient.js')
    const facts = { clientRequestId: 'unchanged-key', amount: 120.50, quantity: 3,
      occurredAt: '2026-10-25T01:00:00Z' }
    const pending = dispatch('MallOrder', 'Mini.OrderController', 'CreateOrder', facts)
    const config = requestSpy.mock.calls[0][0]
    expect(config.header['Accept-Language']).toBe('zh-CN')
    persistence.setAppLocale('en-US')
    expect(requestSpy).toHaveBeenCalledTimes(1)
    expect(config.data.params).toEqual(facts)
    config.success({ statusCode: 200, data: { code: 200, data: { orderId: 18, amount: 120.50 } } })
    await expect(pending).resolves.toEqual({ orderId: 18, amount: 120.50 })
    expect(requestSpy).toHaveBeenCalledTimes(1)
  })

  it('keeps existing order Language parameter aligned with the header and server status projection', async () => {
    persistence.setAppLocale('en')
    const { getOrderDetail } = await import('@/subPackages/order/api/orderApi.js')
    const pending = getOrderDetail(88)
    const config = requestSpy.mock.calls[0][0]
    expect(config.header['Accept-Language']).toBe('en-US')
    expect(config.data.params.Language).toBe('en-US')
    config.success({ statusCode: 200, data: { code: 200, data: {
      OrderId: 88, CustomerStatus: { Code: 'SERVER_CODE', Text: 'Server-owned status',
        MetadataComplete: true, ShowProgress: false }, AllowedActions: ['unchanged'] } } })
    const order = await pending
    expect(order.customerStatus.text).toBe('Server-owned status')
    expect(order.customerStatus.code).toBe('SERVER_CODE')
    expect(requestSpy).toHaveBeenCalledTimes(1)
  })

  it('updates local network messages reactively and preserves remote error identity', async () => {
    const { AppError, ErrorKind } = await import('@/shared/api/appError.js')
    const { computed } = await import('vue')
    const network = AppError.fromUniFail({ errMsg: 'request:fail timeout' })
    const display = computed(() => network.message)
    expect(display.value).toBe('请求超时，请稍后重试')
    persistence.setAppLocale('en')
    expect(display.value).toContain('timed out')
    const server = AppError.fromHttpStatus(500, { code: 500, errorCode: 'SYSTEM_ERROR',
      message: 'Public server message', traceId: 'trace-keep' })
    expect(server.kind).toBe(ErrorKind.HTTP)
    expect(server.errorCode).toBe('SYSTEM_ERROR')
    expect(server.traceId).toBe('trace-keep')
    expect(server.message).toBe('Public server message')
    const auth = AppError.fromBusinessResponse({ code: 401, errorCode: 'EXISTING_CODE', message: 'Sign in',
      traceId: 'auth-trace' })
    expect(auth.errorCode).toBe('EXISTING_CODE')
    expect(auth.kind).toBe(ErrorKind.AUTH)
  })
})
