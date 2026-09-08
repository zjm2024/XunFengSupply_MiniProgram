/**
 * analyzeMpPackage.js package size script tests
 */
import { describe, it, expect } from 'vitest'
import path from 'path'
import fs from 'fs'

const SCRIPT_PATH = path.resolve(__dirname, '../scripts/analyzeMpPackage.js')
const PROJECT_ROOT = path.resolve(__dirname, '..')
const DIST_DIR = path.join(PROJECT_ROOT, 'dist/build/mp-weixin')

describe('analyzeMpPackage.js package size script', () => {
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
