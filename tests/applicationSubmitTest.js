import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPageSetup } from './helpers/sfcHarness.js'
import { validateSignForm } from '@/shared/utils/validate.js'

let vue
let api
let storage
let userStore
let pages
let hooks
let navigation

/** 控制验证码或提交返回时机，覆盖连点和关闭弹层的竞态。 */
function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

beforeEach(async () => {
  vue = await import('vue')
  pages = []
  hooks = { onLoad: [], onUnload: [], onBackPress: [] }
  const cache = new Map()
  storage = { get: vi.fn((key, fallback) => cache.get(key) ?? fallback),
    set: vi.fn((key, value) => cache.set(key, JSON.parse(JSON.stringify(value)))),
    remove: vi.fn(key => cache.delete(key)) }
  userStore = { isLogin: false, setLoginData: vi.fn() }
  navigation = { reLaunch: vi.fn(), navigateTo: vi.fn(), back: vi.fn() }
  api = {
    getApplicationCaptcha: vi.fn().mockResolvedValue({ captchaId: 'challenge-1', imageWidth: 300,
      imageHeight: 150, pieceSize: 40, pieceY: 30, backgroundImageBase64: 'abc', pieceImageBase64: 'def', expiresIn: 120 }),
    verifyApplicationCaptcha: vi.fn().mockResolvedValue({ verificationToken: 'one-use-token', expiresIn: 120 }),
    applySign: vi.fn().mockResolvedValue(88),
    getSignStatus: vi.fn(), queryApplicationStatus: vi.fn(),
    getLoginCaptcha: vi.fn(), verifyLoginCaptcha: vi.fn().mockResolvedValue({ verificationToken: 'login-token' }),
    login: vi.fn().mockResolvedValue({ token: 'session' }),
  }
  vi.stubGlobal('uni', { showToast: vi.fn() })
})

afterEach(() => {
  for (const page of pages) page.stop()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** 加载实际页面 setup，仅替换原生平台、缓存和请求边界。 */
async function loadPage(name = 'apply-sign') {
  const result = await loadPageSetup(`subPackages/auth/pages/${name}/index.vue`, async id => {
    if (id === 'vue') return vue
    if (id === '@dcloudio/uni-app') return Object.fromEntries(Object.entries(hooks).map(([name, list]) => [name, callback => list.push(callback)]))
    if (id.endsWith('/api/auth.js')) return api
    if (id.endsWith('/utils/validate.js')) return { validateSignForm }
    if (id.endsWith('/utils/storage.js')) return { default: storage }
    if (id.endsWith('/session/userStore.js')) return { useUserStore: () => userStore }
    if (id.endsWith('/navigation/navigator.js')) return { navigator: navigation }
    if (id.endsWith('/config/routes.js')) return import('@/app/config/routes.js')
    if (id.endsWith('/utils/format.js')) return import('@/shared/utils/format.js')
    if (id.endsWith('/i18n/index.js')) return import('@/shared/i18n/index.js')
    if (id.endsWith('/i18n/register.js')) return import('@/subPackages/auth/i18n/register.js')
    if (id.endsWith('/api/appError.js')) return import('@/shared/api/appError.js')
    if (id.endsWith('.vue')) return { default: { render: () => null } }
    throw new Error('Unreviewed test import: ' + id)
  })
  pages.push(result)
  return result.bindings
}

/** 填入与真实表单同契约的有效资料，不绕过字段校验。 */
async function fillApplication(page) {
  Object.assign(page.formData, { companyName: '测试企业', contactName: '张三', mobile: '13800000000',
    landlinePhone: '0571-12345678', addressDetail: '测试路1号', password: 'Example123', confirmPassword: 'Example123' })
  page.regionValue.value = { provinceCode: '330000', cityCode: '330100', districtCode: '330102', province: '浙江省', city: '杭州市', district: '上城区' }
  page.licenseImages.value = ['https://example.test/license.png']
  page.agreed.value = true
  await vue.nextTick()
}

describe('application captcha continuation', () => {
  it('submits once immediately after verification and immediately shows the receipt', async () => {
    const page = await loadPage()
    await fillApplication(page)
    await page.handleSubmit()
    expect(api.applySign).not.toHaveBeenCalled()
    expect(page.showCaptchaModal.value).toBe(true)
    const pending = deferred()
    api.applySign.mockReturnValue(pending.promise)
    const verification = page.verifyCaptcha(80)
    await vi.waitFor(() => expect(api.applySign).toHaveBeenCalledTimes(1))
    await page.handleSubmit()
    expect(api.applySign.mock.calls[0][0]).toMatchObject({ password: 'Example123', captchaToken: 'one-use-token' })
    pending.resolve(88)
    await verification
    await page.handleSubmit()
    expect(api.applySign).toHaveBeenCalledTimes(1)
    expect(page.applicationState.value).toMatchObject({ applicationId: 88, status: 'pending', mobile: '13800000000' })
    expect(page.formData.password).toBe('')
    expect(page.formData.confirmPassword).toBe('')
    expect(navigation.reLaunch).not.toHaveBeenCalled()
    expect(JSON.stringify(storage.set.mock.calls)).not.toContain('Example123')
  })

  it('does not submit after the user closes the verification modal', async () => {
    const page = await loadPage()
    await fillApplication(page)
    await page.handleSubmit()
    const pending = deferred()
    api.verifyApplicationCaptcha.mockReturnValue(pending.promise)
    const verification = page.verifyCaptcha(80)
    page.closeCaptchaModal()
    pending.resolve({ verificationToken: 'late-token', expiresIn: 120 })
    await verification
    expect(api.applySign).not.toHaveBeenCalled()
  })

  it('rejects a late verification bound to a different mobile number', async () => {
    const page = await loadPage()
    await fillApplication(page)
    await page.handleSubmit()
    const pending = deferred()
    api.verifyApplicationCaptcha.mockReturnValue(pending.promise)
    const verification = page.verifyCaptcha(80)
    page.formData.mobile = '13900000000'
    await vue.nextTick()
    pending.resolve({ verificationToken: 'late-token', expiresIn: 120 })
    await verification
    expect(api.applySign).not.toHaveBeenCalled()
    expect(page.captchaVerified.value).toBe(false)
  })

  it('requires matching strong passwords before opening verification', async () => {
    const page = await loadPage()
    await fillApplication(page)
    page.formData.password = '12345678'
    page.formData.confirmPassword = 'abcdefgh'
    await page.handleSubmit()
    expect(page.errors.password).toBeTruthy()
    expect(page.errors.confirmPassword).toBeTruthy()
    expect(api.getApplicationCaptcha).not.toHaveBeenCalled()
  })

  it('keeps the current receipt when a status query returns another application', async () => {
    const page = await loadPage()
    page.applicationState.value = { applicationId: 88, mobile: '13800000000', status: 'pending' }
    api.queryApplicationStatus.mockResolvedValue({ applicationId: 99, status: 1 })
    await page.refreshApplicationStatus()
    expect(page.applicationState.value.status).toBe('pending')
    api.queryApplicationStatus.mockResolvedValue({ applicationId: 88, status: 1 })
    await page.refreshApplicationStatus()
    expect(page.applicationState.value.status).toBe('approved')
  })

  it('continues a requested login after slider verification without another click', async () => {
    const page = await loadPage('login')
    page.account.value = '13800000000'
    page.password.value = 'Example123'
    page.agreeProtocol.value = true
    page.captchaRequired.value = true
    page.captchaUsername.value = '13800000000'
    page.captchaChallenge.value = { captchaId: 'login-1' }
    await vue.nextTick()
    await page.handleLogin()
    expect(api.login).not.toHaveBeenCalled()
    await page.verifyCaptcha(80)
    expect(api.login).toHaveBeenCalledTimes(1)
    expect(api.login).toHaveBeenCalledWith('13800000000', 'Example123', { captchaToken: 'login-token' })
  })
})
