import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPageSetup } from './helpers/sfcHarness.js'

let runtime, vue, api, cache, storage, navigation, hooks, pages, upload

/** 控制验证码、资料提交和上传的返回时机。 */
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

beforeEach(async () => {
  runtime = await import('@/shared/i18n/index.js')
  runtime.setLocale('zh-CN')
  vue = await import('vue')
  const { registerMainLocales } = await import('@/app/i18n/registerMain.js')
  registerMainLocales()
  await import('@/subPackages/auth/i18n/register.js')
  hooks = { onLoad: [], onUnload: [], onBackPress: [] }
  pages = []
  cache = new Map()
  storage = { get: vi.fn((key, fallback) => cache.get(key) ?? fallback),
    set: vi.fn((key, value) => cache.set(key, JSON.parse(JSON.stringify(value)))), remove: vi.fn(key => cache.delete(key)) }
  navigation = { navigateTo: vi.fn(), reLaunch: vi.fn() }
  api = { applySign: vi.fn().mockResolvedValue(88), getSignStatus: vi.fn(), queryApplicationStatus: vi.fn(),
    getApplicationCaptcha: vi.fn().mockResolvedValue({ captchaId: 'c-1', imageWidth: 300, imageHeight: 150,
      pieceSize: 40, pieceY: 20, backgroundImageBase64: 'abc', pieceImageBase64: 'def', expiresIn: 120 }),
    verifyApplicationCaptcha: vi.fn().mockResolvedValue({ verificationToken: 'token-1', expiresIn: 120 }) }
  upload = vi.fn()
  vi.stubGlobal('uni', { showToast: vi.fn(), showModal: vi.fn(), showLoading: vi.fn(), hideLoading: vi.fn(), chooseImage: vi.fn() })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  for (const page of pages) page.stop()
  runtime.setLocale('zh-CN')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** 执行真实 setup，仅替换平台、存储和接口边界。 */
async function load(relative = 'subPackages/auth/pages/apply-sign/index.vue', props = {}) {
  const loaded = await loadPageSetup(relative, async id => {
    if (id === 'vue') return vue
    if (id === '@dcloudio/uni-app') return Object.fromEntries(Object.keys(hooks).map(name => [name, fn => hooks[name].push(fn)]))
    if (id.endsWith('/i18n/index.js')) return runtime
    if (id.endsWith('/i18n/register.js')) return import('@/subPackages/auth/i18n/register.js')
    if (id.endsWith('/api/auth.js')) return api
    if (id.endsWith('/api/appError.js')) return import('@/shared/api/appError.js')
    if (id.endsWith('/api/uploadClient.js')) return { uploadFile: upload }
    if (id.endsWith('/utils/validate.js')) return import('@/shared/utils/validate.js')
    if (id.endsWith('/utils/format.js')) return import('@/shared/utils/format.js')
    if (id.endsWith('/utils/storage.js')) return { default: storage }
    if (id.endsWith('/session/userStore.js')) return { useUserStore: () => ({ isLogin: false }) }
    if (id.endsWith('/navigation/navigator.js')) return { navigator: navigation }
    if (id.endsWith('/config/routes.js')) return import('@/app/config/routes.js')
    if (id.endsWith('.vue')) return { default: { render: () => null } }
    throw new Error('Unreviewed import: ' + id)
  }, props)
  pages.push(loaded)
  return loaded
}

/** 填入真实表单契约，保留地区编码和业务原文。 */
async function fill(page) {
  Object.assign(page.formData, { companyName: '测试企业', contactName: '张三', mobile: '13800000000',
    landlinePhone: '0571-12345678', password: 'Example123', confirmPassword: 'Example123', addressDetail: '原文地址1号' })
  page.regionValue.value = { provinceCode: '330000', cityCode: '330100', districtCode: '330102', province: '浙江省', city: '杭州市', district: '上城区' }
  page.licenseImages.value = ['https://example.test/license.png']
  page.agreed.value = true
  await vue.nextTick()
}

describe('签约语言切换与提交边界', () => {
  it('已显示校验错误切换语言后重新取词，草稿不变且不请求验证码', async () => {
    const { bindings: page } = await load()
    page.formData.companyName = '保留草稿'
    await page.handleSubmit()
    expect(page.displayError(page.errors.contactName)).toBe('请输入联系人姓名')
    await vue.nextTick()
    const writes = storage.set.mock.calls.length
    runtime.setLocale('en')
    await vue.nextTick()
    expect(page.displayError(page.errors.contactName)).toBe('Enter the contact name')
    expect(page.formData.companyName).toBe('保留草稿')
    expect(storage.set).toHaveBeenCalledTimes(writes)
    expect(api.getApplicationCaptcha).not.toHaveBeenCalled()
    expect(api.applySign).not.toHaveBeenCalled()
  })

  it('验证在途切换语言，原挑战只验证一次且只提交一次原始资料', async () => {
    const { bindings: page } = await load()
    await fill(page)
    await page.handleSubmit()
    const verification = deferred()
    const submission = deferred()
    api.verifyApplicationCaptcha.mockReturnValueOnce(verification.promise)
    api.applySign.mockReturnValueOnce(submission.promise)
    const running = page.verifyCaptcha(82)
    runtime.setLocale('en')
    await vue.nextTick()
    expect(page.captchaVerifying.value).toBe(true)
    expect(api.verifyApplicationCaptcha).toHaveBeenCalledTimes(1)
    expect(api.verifyApplicationCaptcha).toHaveBeenCalledWith('13800000000', 'c-1', 82)
    verification.resolve({ verificationToken: 'token-1', expiresIn: 120 })
    await vi.waitFor(() => expect(api.applySign).toHaveBeenCalledTimes(1))
    const payload = api.applySign.mock.calls[0][0]
    expect(payload).toMatchObject({ companyName: '测试企业', province: '浙江省', addressDetail: '原文地址1号', password: 'Example123', captchaToken: 'token-1' })
    runtime.setLocale('zh-CN')
    await vue.nextTick()
    expect(page.formData.password).toBe('Example123')
    expect(api.applySign).toHaveBeenCalledTimes(1)
    submission.resolve(88)
    await running
    expect(page.applicationState.value).toMatchObject({ applicationId: 88, status: 'pending' })
    expect(page.formData.password).toBe('')
    expect(JSON.stringify(storage.set.mock.calls)).not.toContain('Example123')
    expect(navigation.reLaunch).not.toHaveBeenCalled()
  })

  it('验证码本地错误按新语言显示，原始服务端错误仍被保留', async () => {
    const { bindings: page } = await load()
    await page.openCaptchaModal()
    expect(page.captchaErrorText.value).toBe('请先填写联系人手机号码')
    runtime.setLocale('en-US')
    expect(page.captchaErrorText.value).toBe("Enter the contact's mobile number first.")
    const server = Object.assign(new Error('后端原始提示'), { errorCode: 'KEEP', traceId: 'trace-1' })
    expect(page.getCaptchaErrorMessage(server)).toBe(server)
    runtime.setLocale('zh-CN')
    expect(server.errorCode).toBe('KEEP')
    expect(server.message).toBe('后端原始提示')
  })

  it('失效验证码仍只按原错误码更换挑战，不因切换语言额外重试', async () => {
    const { bindings: page } = await load()
    await fill(page)
    await page.handleSubmit()
    api.verifyApplicationCaptcha.mockRejectedValueOnce(Object.assign(new Error('过期'), { errorCode: 'DEALER_LOGIN_CAPTCHA_EXPIRED' }))
    await page.verifyCaptcha(60)
    expect(api.getApplicationCaptcha).toHaveBeenCalledTimes(2)
    runtime.setLocale('en')
    await vue.nextTick()
    expect(page.captchaErrorText.value).toContain('verification expired')
    expect(api.getApplicationCaptcha).toHaveBeenCalledTimes(2)
    expect(api.applySign).not.toHaveBeenCalled()
  })

  it('默认校验中文结果与可选本地化描述具有相同字段和优先顺序', async () => {
    const { validateSignForm } = await import('@/shared/utils/validate.js')
    const data = { companyName: 'a'.repeat(121), contactName: 'b'.repeat(51), mobile: '123',
      password: 'weak', confirmPassword: 'different', landlinePhone: 'abc', taxNo: 'c'.repeat(33), email: 'bad',
      addressDetail: 'd'.repeat(201), registeredAddress: 'e'.repeat(201) }
    const original = validateSignForm(data)
    const localized = validateSignForm(data, (key, fallback) => ({ key, fallback }))
    expect(Object.keys(localized.errors)).toEqual(Object.keys(original.errors))
    for (const key of Object.keys(original.errors)) expect(localized.errors[key].fallback).toBe(original.errors[key])
    expect(localized.firstError).toBe(localized.errors.companyName)
    expect(original.valid).toBe(false)
  })

  it('语言切换不更换已加载协议正文或改变协议类型', async () => {
    const { bindings: page } = await load('subPackages/auth/pages/agreement/index.vue')
    hooks.onLoad[0]({ type: 'sign' })
    const content = page.content.value
    expect(runtime.t(page.pageTitle.value)).toBe('经销商合作协议')
    runtime.setLocale('en')
    expect(runtime.t(page.pageTitle.value)).toBe('Dealer Cooperation Agreement')
    expect(page.content.value).toBe(content)
    expect(content).toContain('薰风体育经销商合作协议')
  })

  it('上传在途切换语言仍发一次原场景请求并追加原URL', async () => {
    const loaded = await load('shared/ui/FileUploader/FileUploader.vue', { modelValue: [], maxCount: 1, scene: 'dealer-application-license', disabled: false })
    const pending = deferred()
    upload.mockReturnValueOnce(pending.promise)
    const running = loaded.bindings.uploadSingleFile('/local/license.jpg')
    runtime.setLocale('en')
    await vue.nextTick()
    expect(upload).toHaveBeenCalledTimes(1)
    expect(upload).toHaveBeenCalledWith('/local/license.jpg', { scene: 'dealer-application-license' })
    pending.resolve({ url: 'https://example.test/original-url' })
    await running
    expect(loaded.events).toEqual([['update:modelValue', ['https://example.test/original-url']]])
    expect(uni.showToast).not.toHaveBeenCalled()
  })
})
