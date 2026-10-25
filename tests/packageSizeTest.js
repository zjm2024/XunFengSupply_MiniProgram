/**
 * analyzeMpPackage.js package size script tests
 */
import { describe, it, expect } from 'vitest'
import path from 'path'
import fs from 'fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { calculatePackageSizes } = require('../scripts/analyzeMpPackage.js')

const SCRIPT_PATH = path.resolve(__dirname, '../scripts/analyzeMpPackage.js')
const PROJECT_ROOT = path.resolve(__dirname, '..')
const DIST_DIR = path.join(PROJECT_ROOT, 'dist/build/mp-weixin')

describe('analyzeMpPackage.js package size script', () => {
  it('counts common, app.js and every non-subpackage file in the main package', () => {
    const files = [
      ['app.js', 10], ['common/vendor.js', 20], ['common/assets.js', 30], ['shared/runtime.js', 40],
      ['static/logo.svg', 50], ['pages/home.js', 60], ['new-main-folder/content.js', 70],
      ['subPackages/commerce/page.js', 80], ['subPackages/commerce-old/page.js', 90], ['features/auth/page.js', 100],
    ].map(([relativePath, size]) => ({ relativePath, size }))
    const result = calculatePackageSizes(files, [{ key: 'subPackages/commerce', name: 'commerce' },
      { key: 'features/auth', name: 'auth' }])
    expect(result.mainSize).toBe(370)
    expect(result.results.map(item => item.size)).toEqual([80, 100])
    expect(result.mainSize + result.totalSubSize).toBe(550)
  })

  it('uses directory boundaries so similarly named unregistered folders stay in main', () => {
    const result = calculatePackageSizes([{ relativePath: 'subPackages/shop-old/file.js', size: 30 },
      { relativePath: 'subPackages/shop/file.js', size: 20 }], [{ key: 'subPackages/shop', name: 'shop' }])
    expect(result.mainSize).toBe(30)
    expect(result.totalSubSize).toBe(20)
  })

  it('counts all files in main when there are no registered subpackages', () => {
    const result = calculatePackageSizes([{ relativePath: 'common/vendor.js', size: 70 },
      { relativePath: 'app.js', size: 10 }], [])
    expect(result.mainSize).toBe(80)
    expect(result.totalSubSize).toBe(0)
  })

  it('normalizes Windows file separators before matching registered subpackage roots', () => {
    const result = calculatePackageSizes([{ relativePath: 'common\\vendor.js', size: 70 },
      { relativePath: 'subPackages\\shop\\page.js', size: 20 }], [{ key: 'subPackages/shop', name: 'shop' }])
    expect(result.mainSize).toBe(70)
    expect(result.totalSubSize).toBe(20)
  })

  it('script file exists', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true)
  })

  it('package.json has audit:size script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf-8'))
    expect(pkg.scripts['audit:size']).toBeDefined()
    expect(pkg.scripts['audit:size']).toContain('analyzeMpPackage.js')
  })

  it('script contains required analysis functions', () => {
    const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8')
    expect(scriptContent).toContain('analyzeMainPackage')
    expect(scriptContent).toContain('analyzeSubpackages')
    expect(scriptContent).toContain('analyzeTotalSize')
    expect(scriptContent).toContain('analyzeLargestFiles')
    expect(scriptContent).toContain('checkLargeFiles')
    expect(scriptContent).toContain('checkDuplicateFiles')
    expect(scriptContent).toContain('checkMainPackageBusinessContent')
  })

  it('script checks correct dist directory', () => {
    const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8')
    expect(scriptContent).toContain('dist/build/mp-weixin')
  })

  it('package size limits are defined', () => {
    const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8')
    expect(scriptContent).toContain('MAIN_MAX')
    expect(scriptContent).toContain('SUBPACKAGE_MAX')
    expect(scriptContent).toContain('TOTAL_MAX')
  })
})
