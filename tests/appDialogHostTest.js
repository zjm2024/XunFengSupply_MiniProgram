import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { loadPageSetup } from './helpers/sfcHarness.js'

let vue, dialogs, runtime
const stops = []

beforeEach(async () => {
  vi.resetModules()
  vue = await import('vue')
  dialogs = await import('@/shared/composables/useAppDialog.js')
  runtime = await import('@/shared/i18n/index.js')
  const { registerMainLocales } = await import('@/app/i18n/registerMain.js')
  registerMainLocales()
  await import('@/subPackages/account/i18n/register.js')
})

afterEach(() => {
  dialogs.settleAppDialog(false)
  stops.splice(0).forEach(stop => stop())
})

/** 使用真实设置页和弹框状态，隔离会话清理及导航副作用。 */
async function settings() {
  const user = { logout: vi.fn().mockResolvedValue() }
  const navigator = { reLaunch: vi.fn().mockResolvedValue(true) }
  const page = await loadPageSetup('subPackages/account/pages/settings/index.vue', async id => {
    if (id === 'vue') return vue
    if (id === '@dcloudio/uni-app') return { onShow: () => {} }
    if (id.includes('/i18n/index.js')) return runtime
    if (id.includes('/useAppDialog.js')) return dialogs
    if (id.includes('/userStore.js')) return { useUserStore: () => user }
    if (id.includes('/navigator.js')) return { navigator }
    if (id.includes('/routes.js')) return { routes: { auth: { login: () => '/login' } } }
    if (id.includes('/cacheManager.js')) return { getCacheSummary: () => ({ count: 0 }), clearAppCache: vi.fn() }
    return { default: {} }
  })
  stops.push(page.stop)
  return { page, user, navigator }
}

describe('page-owned application confirmations', () => {
  it('renders an early request when its real page host becomes ready', async () => {
    const host = Symbol('settings')
    const pending = dialogs.openAppDialog({ title: '退出登录' })
    expect(dialogs.useAppDialog(host).visible.value).toBe(false)
    dialogs.activateAppDialogHost(host)
    expect(dialogs.useAppDialog(host).visible.value).toBe(true)
    dialogs.settleAppDialog(true, host)
    expect(await pending).toBe(true)
    expect(dialogs.useAppDialog(host).visible.value).toBe(false)
  })

  it('shows one host and cancels the previous page operation on navigation', async () => {
    const oldHost = Symbol('old'), newHost = Symbol('new')
    dialogs.activateAppDialogHost(oldHost)
    const previous = dialogs.openAppDialog({ title: 'Old operation' })
    dialogs.activateAppDialogHost(newHost)
    expect(await previous).toBe(false)
    const pending = dialogs.openAppDialog({ title: 'New operation' })
    expect(dialogs.useAppDialog(oldHost).visible.value).toBe(false)
    expect(dialogs.useAppDialog(newHost).visible.value).toBe(true)
    dialogs.deactivateAppDialogHost(oldHost)
    dialogs.settleAppDialog(true, oldHost)
    expect(dialogs.useAppDialog(newHost).visible.value).toBe(true)
    dialogs.settleAppDialog(true, newHost)
    expect(await pending).toBe(true)
  })

  it('page hide settles a pending prompt as canceled and rejects stale input', async () => {
    const host = Symbol('active'), stale = Symbol('hidden')
    dialogs.activateAppDialogHost(host)
    const pending = dialogs.openAppPrompt({ value: 'original' })
    dialogs.updateAppDialogInput('wrong', stale)
    expect(dialogs.useAppDialog().state.value.input.value).toBe('original')
    dialogs.updateAppDialogInput('edited', host)
    dialogs.deactivateAppDialogHost(host)
    expect(await pending).toEqual({ confirmed: false, content: 'edited' })
    expect(dialogs.useAppDialog(host).visible.value).toBe(false)
  })

  it('keeps prompt cancellation shape when another dialog replaces it', async () => {
    const first = dialogs.openAppPrompt({ value: 'draft' })
    const second = dialogs.openAppDialog({ title: 'Replacement' })
    expect(await first).toEqual({ confirmed: false, content: 'draft' })
    dialogs.settleAppDialog(false)
    expect(await second).toBe(false)
  })

  it('connects host visibility to page show, hide and unload hooks', async () => {
    const hooks = {}
    const page = await loadPageSetup('shared/ui/ConfirmPopup/ConfirmHost.vue', async id => {
      if (id === 'vue') return { ...vue, onMounted: fn => { hooks.mount = fn }, onBeforeUnmount: fn => { hooks.unmount = fn } }
      if (id === '@dcloudio/uni-app') return { onShow: fn => { hooks.show = fn }, onHide: fn => { hooks.hide = fn }, onUnload: fn => { hooks.unload = fn } }
      if (id.includes('/useAppDialog.js')) return dialogs
      return { default: {} }
    })
    stops.push(page.stop)
    hooks.mount()
    const first = dialogs.openAppDialog({ title: 'Confirm' })
    expect(page.bindings.visible.value).toBe(true)
    hooks.hide()
    expect(await first).toBe(false)
    hooks.show()
    const second = dialogs.openAppDialog({ title: 'Again' })
    expect(page.bindings.visible.value).toBe(true)
    hooks.unload()
    expect(await second).toBe(false)
    hooks.unmount()
  })

  it('logout cancel leaves the session intact, confirm waits for cleanup before navigation', async () => {
    const { page, user, navigator } = await settings()
    const host = Symbol('settings')
    dialogs.activateAppDialogHost(host)
    const canceled = page.bindings.handleLogout()
    expect(dialogs.useAppDialog(host).visible.value).toBe(true)
    dialogs.settleAppDialog(false, host)
    await canceled
    expect(user.logout).not.toHaveBeenCalled()
    expect(navigator.reLaunch).not.toHaveBeenCalled()
    runtime.setLocale('en-US')
    let finishCleanup
    user.logout.mockImplementation(() => new Promise(resolve => { finishCleanup = resolve }))
    const confirmed = page.bindings.handleLogout()
    expect(dialogs.useAppDialog().state.value.title).toBe(runtime.t('account.settings.logoutTitle'))
    dialogs.settleAppDialog(true, host)
    await vue.nextTick()
    expect(user.logout).toHaveBeenCalledTimes(1)
    expect(navigator.reLaunch).not.toHaveBeenCalled()
    finishCleanup()
    await confirmed
    expect(navigator.reLaunch).toHaveBeenCalledTimes(1)
    expect(navigator.reLaunch).toHaveBeenCalledWith('/login')
  })

  it('page hide cancels pending logout instead of clearing the session later', async () => {
    const { page, user, navigator } = await settings()
    const host = Symbol('settings')
    dialogs.activateAppDialogHost(host)
    const pending = page.bindings.handleLogout()
    dialogs.deactivateAppDialogHost(host)
    await pending
    expect(user.logout).not.toHaveBeenCalled()
    expect(navigator.reLaunch).not.toHaveBeenCalled()
  })

  it('mounts the host in real page roots instead of the non-rendering App template', () => {
    expect(parse(readFileSync('src/App.vue', 'utf8')).descriptor.template).toBeNull()
    for (const file of ['src/shared/ui/AppPageShell/AppPageShell.vue', 'src/pages/home/index.vue']) {
      const ast = parse(readFileSync(file, 'utf8')).descriptor.template.ast
      const root = ast.children.find(node => node.type === 1)
      expect(root.children.some(node => node.type === 1 && node.tag === 'ConfirmHost')).toBe(true)
    }
  })
})
