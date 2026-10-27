import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse, compileScript } from '@vue/compiler-sfc'
import { compile } from '@vue/compiler-dom'
import { parse as parseJs } from '@babel/parser'

let vue
let i18n

beforeEach(async () => {
  vi.resetModules()
  vue = await import('vue')
  i18n = await import('@/shared/i18n/index.js')
  const { registerMainLocales } = await import('@/app/i18n/registerMain.js')
  registerMainLocales()
})

/** 执行真实 SFC setup 与模板生成的虚拟节点，不模拟 DOM、生命周期或真机布局。 */
async function loadView(relative, supplied = {}, root = 'src/shared/ui') {
  const source = readFileSync(resolve(root, relative), 'utf8')
  const { descriptor } = parse(source)
  let code = compileScript(descriptor, { id: relative }).content
  const imports = {}
  for (const node of parseJs(code, { sourceType: 'module' }).program.body.filter(node => node.type === 'ImportDeclaration').reverse()) {
    const id = node.source.value
    imports[id] = id === 'vue' ? { ...vue, onMounted: () => {} }
      : id.includes('i18n/index') ? i18n
      : id.includes('model/pageState') ? await import('@/shared/model/pageState.js')
      : { default: { render: () => null } }
    const declarations = node.specifiers.map(specifier => {
      const member = specifier.type === 'ImportDefaultSpecifier' ? 'default'
        : specifier.type === 'ImportNamespaceSpecifier' ? null : specifier.imported.name
      return 'const ' + specifier.local.name + ' = __imports[' + JSON.stringify(id) + ']'
        + (member ? '[' + JSON.stringify(member) + ']' : '') + ';'
    }).join('\n')
    code = code.slice(0, node.start) + declarations + code.slice(node.end)
  }
  const component = new Function('__imports', code.replace('export default', 'return'))(imports)
  const props = vue.reactive(Object.fromEntries(Object.entries(component.props).map(([name, definition]) =>
    [name, supplied[name] !== undefined ? supplied[name] : definition?.default])))
  const events = []
  const scope = vue.effectScope()
  const bindings = scope.run(() => component.setup(props, { expose: () => {},
    emit: (...args) => events.push(args) }))
  const context = vue.proxyRefs({ ...props, ...bindings, $slots: {} })
  const render = new Function('Vue', compile(descriptor.template.content, { mode: 'function' }).code)(vue)
  const detach = (node) => {
    if (!node.parent) return
    const siblings = node.parent.children
    siblings.splice(siblings.indexOf(node), 1)
    node.parent = null
  }
  const renderer = vue.createRenderer({
    createElement: type => ({ type, children: [], text: '', props: {} }),
    createText: text => ({ text, children: [] }),
    createComment: () => ({ text: '', children: [] }),
    insert: (node, parent, anchor) => {
      detach(node)
      node.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
    },
    remove: detach,
    setText: (node, value) => { node.text = value },
    setElementText: (node, value) => { node.text = value; node.children = [] },
    parentNode: node => node.parent,
    nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1],
    patchProp: (node, key, previous, value) => { node.props[key] = value },
  })
  const container = { children: [], text: '' }
  const app = renderer.createApp({ render: () => render(context, []) })
  app.config.warnHandler = () => {}
  for (const [name, value] of Object.entries(bindings)) {
    if (value && typeof value === 'object' && typeof value.render === 'function') app.component(name, value)
  }
  app.mount(container)
  const text = node => (node.text || '') + (node.children || []).map(text).join('')
  return { props, bindings, events, stop: () => { app.unmount(); scope.stop() },
    text: async () => { await vue.nextTick(); return text(container) } }
}

describe('shared UI localization virtual rendering', () => {
  it('refreshes a retained startup error without changing its mode or update action', async () => {
    const view = await loadView('StartupError.vue', { mode: 'force-update' }, 'src/pages/startup/components')
    expect(await view.text()).toContain('发现新版本')
    i18n.setLocale('en')
    expect(await view.text()).toContain('New version available')
    expect(view.props.mode).toBe('force-update')
    expect(view.events).toEqual([])
    view.bindings.onPrimaryClick()
    expect(view.events).toEqual([['update']])
    view.stop()
  })

  it('refreshes retained empty-state labels while keeping the state and button visibility', async () => {
    const view = await loadView('AppPageState/AppPageState.vue', { state: 'empty' })
    expect(await view.text()).toContain('暂无数据')
    i18n.setLocale('en')
    expect(await view.text()).toContain('No data')
    expect(view.props.state).toBe('empty')
    expect(view.props.actionText).toBe('')
    expect(view.events).toEqual([])
    view.stop()
  })

  it('refreshes the offline banner and preserves caller-provided display data', async () => {
    const view = await loadView('AppNetworkBanner/AppNetworkBanner.vue', { visible: true, type: 'offline' })
    expect(await view.text()).toContain('当前无网络连接')
    i18n.setLocale('en')
    expect(await view.text()).toContain('You are offline')
    view.props.message = '用户提供的原始提示'
    expect(view.bindings.displayMessage.value).toBe('用户提供的原始提示')
    expect(view.events).toEqual([])
    view.stop()
  })

  it('refreshes already-open confirmation controls without confirming or canceling', async () => {
    const view = await loadView('ConfirmPopup/ConfirmPopup.vue', { modelValue: true })
    expect(await view.text()).toContain('取消')
    expect(await view.text()).toContain('确认')
    i18n.setLocale('en')
    expect(await view.text()).toContain('Cancel')
    expect(await view.text()).toContain('Confirm')
    expect(view.bindings.visible.value).toBe(true)
    expect(view.events).toEqual([])
    view.stop()
  })

  it('keeps an in-flight editor open until saving finishes, then allows cancellation', async () => {
    const view = await loadView('ConfirmPopup/ConfirmPopup.vue', { modelValue: true, dismissDisabled: true, closeOnOverlay: true })
    view.bindings.handleClose(); view.bindings.handleCancel(); view.bindings.handleOverlayClick()
    expect(view.bindings.visible.value).toBe(true)
    expect(view.events).toEqual([])
    view.props.dismissDisabled = false
    view.bindings.handleCancel()
    expect(view.bindings.visible.value).toBe(false)
    expect(view.events).toEqual([['update:modelValue', false], ['close'], ['cancel']])
    view.stop()
  })

  it('keeps confirmation actions usable across short and long labels', () => {
    const source = readFileSync(resolve('src/shared/ui/ConfirmPopup/ConfirmPopup.vue'), 'utf8')
    expect(source).toContain('min-width: 112px')
    expect(source).toContain('grid-template-columns: repeat(auto-fit')
    expect(source).toContain('.popup-actions.is-single')
    expect(source).toContain('white-space: normal')
  })

  it('keeps quantity facts and events unchanged when the language changes', async () => {
    const view = await loadView('QuantityStepper/QuantityStepper.vue', { modelValue: 2, min: 0, max: 10,
      step: 1, disabled: false })
    i18n.setLocale('en')
    expect(view.events).toEqual([])
    expect(view.props.modelValue).toBe(2)
    view.bindings.increase()
    expect(view.events).toEqual([['update:modelValue', 3], ['change', 3], ['plus', 3]])
    view.stop()
  })

  it('corrects an over-limit typed display even when the controlled value stays unchanged', async () => {
    const view = await loadView('QuantityStepper/QuantityStepper.vue', { modelValue: 2, min: 1, max: 2,
      allowInput: true, allowZero: true })
    view.bindings.handleInput({ detail: { value: '99' } })
    await vue.nextTick()
    expect(view.bindings.inputValue.value).toBe(2)
    expect(view.props.modelValue).toBe(2)
    expect(view.events).toEqual([['update:modelValue', 2]])
    view.bindings.handleBlur({ target: { value: '99' } })
    await vue.nextTick()
    expect(view.bindings.inputValue.value).toBe(2)
    expect(view.events.slice(-2)).toEqual([['update:modelValue', 2], ['change', 2]])
    view.stop()
  })

  it('keeps zero capacity at zero and ignores disabled input events', async () => {
    const view = await loadView('QuantityStepper/QuantityStepper.vue', { modelValue: 0, min: 1, max: 0,
      allowInput: true, allowZero: true })
    view.bindings.handleInput({ detail: { value: '3' } })
    await vue.nextTick()
    expect(view.bindings.inputValue.value).toBe(0)
    expect(view.events).toEqual([['update:modelValue', 0]])
    view.props.disabled = true
    view.bindings.handleInput({ detail: { value: '9' } })
    view.bindings.handleBlur({ detail: { value: '9' } })
    expect(view.events).toHaveLength(1)
    view.stop()
  })

  it('lets a newer external quantity override pending input correction', async () => {
    const view = await loadView('QuantityStepper/QuantityStepper.vue', { modelValue: 2, min: 0, max: 10,
      allowInput: true })
    view.bindings.handleInput({ detail: { value: '99' } })
    view.props.modelValue = 4
    await vue.nextTick()
    expect(view.bindings.inputValue.value).toBe(4)
    view.stop()
  })
})
