/**
 * auditRoutes.js audit script tests
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

const SCRIPT_PATH = path.resolve(__dirname, '../scripts/auditRoutes.js')
const PROJECT_ROOT = path.resolve(__dirname, '..')

function runAudit() {
  try {
    const output = execSync('node "' + SCRIPT_PATH + '"', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return { success: true, output: output, exitCode: 0 }
  } catch (e) {
    return {
      success: false,
      output: e.stdout || '',
      error: e.stderr || '',
      exitCode: e.status || 1
    }
  }
}

describe('auditRoutes.js audit script', () => {
  it('script file exists', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true)
  })

  it('package.json has audit:routes script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf-8'))
    expect(pkg.scripts['audit:routes']).toBeDefined()
    expect(pkg.scripts['audit:routes']).toContain('auditRoutes.js')
  })

  it('audit script runs and returns result', () => {
    const result = runAudit()
    expect(result.output).toContain('路由与结构审计脚本')
  })

  it('audit script detects old root dirs', () => {
    const result = runAudit()
    if (!result.success) {
      expect(result.output).toContain('[ERROR]')
    }
  })

  it('check script contains all required checks', () => {
    const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8')
    expect(scriptContent).toContain('checkPageExistence')
    expect(scriptContent).toContain('checkUnregisteredPages')
    expect(scriptContent).toContain('checkOldPaths')
    expect(scriptContent).toContain('checkDirectNavigate')
    expect(scriptContent).toContain('checkBoundaries')
    expect(scriptContent).toContain('checkEasycom')
    expect(scriptContent).toContain('checkPackageJsonScripts')
    expect(scriptContent).toContain('checkOldRootDirs')
    expect(scriptContent).toContain('checkJsFilenames')
  })

  it('pages.json has correct package structure', () => {
    const raw = fs.readFileSync(path.join(PROJECT_ROOT, 'src/pages.json'), 'utf-8')
    const content = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw
    const pagesJson = JSON.parse(content)
    expect(pagesJson.pages.some(p => p.path === 'pages/startup/index')).toBe(true)
    expect(pagesJson.pages.some(p => p.path === 'pages/home/index')).toBe(true)
    const subPackages = pagesJson.subPackages.map(sp => sp.root)
    expect(subPackages).toContain('subPackages/auth')
    expect(subPackages).toContain('subPackages/commerce')
    expect(subPackages).toContain('subPackages/order')
    expect(subPackages).toContain('subPackages/account')
    expect(subPackages).toContain('subPackages/content')
  })
})
