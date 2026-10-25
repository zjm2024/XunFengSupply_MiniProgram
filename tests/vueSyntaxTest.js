import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { parseExpression } from '@babel/parser'

/** 枚举实际源码，排除打包产物，不依赖固定页面数量。 */
function vueFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? vueFiles(resolve(directory, entry.name))
      : entry.name.endsWith('.vue') ? [resolve(directory, entry.name)] : [])
}

describe('Vue source syntax and editor-compatible amount bindings', () => {
  it('parses and compiles every actual SFC template and setup', () => {
    const failures = []
    for (const file of vueFiles(resolve('src'))) {
      const source = readFileSync(file, 'utf8')
      const result = parse(source, { filename: file })
      for (const error of result.errors) failures.push(relative('src', file) + ': ' + String(error))
      const descriptor = result.descriptor
      try {
        if (descriptor.script || descriptor.scriptSetup) compileScript(descriptor, { id: file })
        if (descriptor.template) {
          const compiled = compileTemplate({ source: descriptor.template.content, filename: file, id: file })
          for (const error of compiled.errors) failures.push(relative('src', file) + ': ' + String(error))
        }
      } catch (error) { failures.push(relative('src', file) + ': ' + error.message) }
    }
    expect(failures).toEqual([])
  })

  it('keeps raw bound text expressions valid JavaScript for editor tooling', () => {
    const failures = []
    for (const file of vueFiles(resolve('src'))) {
      const source = parse(readFileSync(file, 'utf8')).descriptor.template?.content || ''
      for (const match of source.matchAll(/:text="([^"]*)"/g)) {
        try { parseExpression(match[1]) }
        catch (error) { failures.push(relative('src', file) + ': ' + match[1] + ' → ' + error.message) }
      }
    }
    expect(failures).toEqual([])
  })

  it('preserves currency and precision in the reported order-detail expression', () => {
    const source = readFileSync(resolve('src/subPackages/order/pages/detail/index.vue'), 'utf8')
    const expression = source.match(/class="spu-order-total"\s+:text="([^"]*)"/)[1]
    const amount = new Function('group', 'return ' + expression)
    expect(amount({ totalAmount: 123.456 })).toBe('¥123.46')
    expect(amount({ totalAmount: 0 })).toBe('¥0.00')
    expect(expression).not.toContain('&quot;')
  })
})

