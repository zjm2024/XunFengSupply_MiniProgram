import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse, compileScript } from '@vue/compiler-sfc'
import { parse as parseJs } from '@babel/parser'

/** 在隔离作用域执行真实页面 setup，注入已审查模块及原生生命周期替身。 */
export async function loadPageSetup(relative, resolveImport, suppliedProps = {}) {
  const source = readFileSync(resolve('src', relative), 'utf8')
  const descriptor = parse(source).descriptor
  let code = compileScript(descriptor, { id: relative }).content
  const imports = {}
  const declarations = parseJs(code, { sourceType: 'module' }).program.body
    .filter(node => node.type === 'ImportDeclaration').reverse()
  for (const node of declarations) {
    const id = node.source.value
    imports[id] = await resolveImport(id)
    const replacement = node.specifiers.map(specifier => {
      const member = specifier.type === 'ImportDefaultSpecifier' ? 'default'
        : specifier.type === 'ImportNamespaceSpecifier' ? null : specifier.imported.name
      return 'const ' + specifier.local.name + ' = __imports[' + JSON.stringify(id) + ']'
        + (member ? '[' + JSON.stringify(member) + ']' : '') + ';'
    }).join('\n')
    code = code.slice(0, node.start) + replacement + code.slice(node.end)
  }
  const component = new Function('__imports', code.replace('export default', 'return'))(imports)
  const vue = await import('vue')
  const scope = vue.effectScope()
  const props = vue.reactive(suppliedProps)
  const events = []
  const bindings = scope.run(() => component.setup(props, { expose: () => {}, emit: (...args) => events.push(args) }))
  return { bindings, props, events, stop: () => scope.stop() }
}
