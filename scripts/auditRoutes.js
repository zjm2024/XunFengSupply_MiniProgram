/**
 * 路由与结构审计脚本
 *
 * 检查项：
 * 1. pages.json 注册页面文件是否存在
 * 2. src/pages 和各 subPackages/pages 下存在正式 .vue 页面但未注册
 * 3. routes.js 基础 path 不在注册集合
 * 4. 源码中的内部绝对路由不在注册集合
 * 5. 仍有旧路径 /pages/product、/pages/cart、/pages/order 等
 * 6. 除 navigator.js 外直接调用五种 UniApp 导航 API
 * 7. src/pages、src/app、src/shared import subPackages
 * 8. 分包跨包 import
 * 9. shared import subPackages
 * 10. easycom 指向的本地文件不存在
 * 11. package.json script 指向不存在文件
 * 12. src 中残留根 api、hooks、store、config、utils、components
 * 13. 源码和 tests/scripts 中存在 .mjs、.cjs 或多点 JS 文件名
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../src')
const SCRIPTS_DIR = path.resolve(__dirname)
const TESTS_DIR = path.resolve(__dirname, '../tests')
const PACKAGE_JSON = path.resolve(__dirname, '../package.json')

let errorCount = 0
let warnCount = 0

function error(msg) {
  console.log(`[ERROR] ${msg}`)
  errorCount++
}
function warn(msg) {
  console.log(`[WARN] ${msg}`)
  warnCount++
}
function ok(msg) {
  console.log(`[OK] ${msg}`)
}

// ==================== 工具函数 ====================

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkDir(full, callback)
    else callback(full)
  }
}

function extractImports(content) {
  const imports = []
  const regex = /from\s+['"]([^'"]+)['"]/g
  let m
  while ((m = regex.exec(content)) !== null) {
    imports.push(m[1])
  }
  // also check require()
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((m = requireRegex.exec(content)) !== null) {
    imports.push(m[1])
  }
  return imports
}

// ==================== 读取 pages.json ====================

function loadPagesJson() {
  const raw = fs.readFileSync(path.join(ROOT, '../src/pages.json'), 'utf-8')
  const content = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw
  return JSON.parse(content)
}

function getRegisteredRoutes(pagesJson) {
  const routes = new Set()
  for (const p of pagesJson.pages || []) {
    routes.add(p.path)
  }
  for (const sp of pagesJson.subPackages || []) {
    for (const p of sp.pages) {
      routes.add(`${sp.root}/${p.path}`)
    }
  }
  return routes
}

// ==================== 检查 1: 页面文件存在 ====================

function checkPageExistence(pagesJson) {
  console.log('\n=== 1. pages.json 注册页面文件是否存在 ===\n')
  const allPages = []
  for (const p of pagesJson.pages || []) allPages.push(p.path)
  for (const sp of pagesJson.subPackages || []) {
    for (const p of sp.pages) allPages.push(`${sp.root}/${p.path}`)
  }
  for (const page of allPages) {
    const vueFile = path.join(ROOT, page + '.vue')
    if (fs.existsSync(vueFile)) {
      ok(page)
    } else {
      error(`页面文件不存在: ${page}`)
    }
  }
}

// ==================== 检查 2: 未注册页面 ====================

function checkUnregisteredPages(pagesJson) {
  console.log('\n=== 2. 检查未注册的页面文件 ===\n')
  const registeredRoutes = getRegisteredRoutes(pagesJson)
  const registeredSet = new Set(registeredRoutes)

  const pageDirs = [
    path.join(ROOT, 'pages'),
    ...pagesJson.subPackages.map(sp => path.join(ROOT, sp.root, 'pages'))
  ]

  for (const dir of pageDirs) {
    if (!fs.existsSync(dir)) continue
    walkDir(dir, (filePath) => {
      if (!filePath.endsWith('.vue')) return
      // 跳过 components 子目录（局部组件不需要在 pages.json 注册）
      const relForComponentCheck = path.relative(ROOT, filePath).replace(/\\/g, '/')
      if (/\/components\//.test(relForComponentCheck)) return
      const rel = relForComponentCheck.replace(/\.vue$/, '')
      if (!registeredSet.has(rel)) {
        warn(`页面文件未在 pages.json 注册: ${rel}`)
      }
    })
  }
}

// ==================== 检查 3: routes.js 注册 ====================

function checkRoutesJsRegistered(pagesJson) {
  console.log('\n=== 3. routes.js 路由常量是否已注册 ===\n')
  const registeredSet = getRegisteredRoutes(pagesJson)
  const routesFile = path.join(ROOT, 'app/config/routes.js')
  if (!fs.existsSync(routesFile)) {
    warn('routes.js 不存在')
    return
  }
  const content = fs.readFileSync(routesFile, 'utf-8')
  // 校验 1：导出的路径常量都已注册
  const regex = /export\s+const\s+\w+\s*=\s*['"](\/[^'"]+)['"]/g
  let m
  while ((m = regex.exec(content)) !== null) {
    if (m[1].startsWith('/pages/webview')) continue
    if (!registeredSet.has(m[1].substring(1))) {
      warn(`routes.js 中路径未注册: ${m[1]}`)
    }
  }

  // 校验 2：ROUTE_META 覆盖所有注册路由（合并后 routeMeta.js 应不存在）
  checkRouteMetaCoverage(content, registeredSet)

  // 校验 3：routeMeta.js 应已被合并，不再独立存在
  const routeMetaFile = path.join(ROOT, 'app/config/routeMeta.js')
  if (fs.existsSync(routeMetaFile)) {
    error('routeMeta.js 仍然独立存在，应合并到 routes.js')
  } else {
    ok('routeMeta.js 已合并到 routes.js')
  }
}

/**
 * 校验 routes.js 中 ROUTE_META 覆盖所有已注册路由。
 */
function checkRouteMetaCoverage(content, registeredSet) {
  // ROUTE_META 使用 [CONSTANT_NAME] 作为 key，先解析常量再映射到真实 path。
  const constantPaths = new Map()
  const constantRegex = /export\s+const\s+(\w+)\s*=\s*['"](\/[^'"]+)['"]/g
  let constantMatch
  while ((constantMatch = constantRegex.exec(content)) !== null) {
    constantPaths.set(constantMatch[1], constantMatch[2])
  }

  const metaStart = content.indexOf('export const ROUTE_META')
  const metaEnd = content.indexOf('// ==================== 派生集合', metaStart)
  const metaSource = metaStart >= 0
    ? content.slice(metaStart, metaEnd >= 0 ? metaEnd : content.length)
    : ''
  const metaPaths = new Set()
  const metaKeyRegex = /^\s*\[(\w+)\]\s*:/gm
  let metaMatch
  while ((metaMatch = metaKeyRegex.exec(metaSource)) !== null) {
    const routePath = constantPaths.get(metaMatch[1])
    if (routePath) metaPaths.add(routePath.replace(/^\//, ''))
  }

  const missingRoutes = []
  for (const route of registeredSet) {
    if (!metaPaths.has(route)) {
      missingRoutes.push(route)
    }
  }
  if (missingRoutes.length === 0) {
    ok('ROUTE_META 覆盖所有已注册路由')
  } else {
    for (const r of missingRoutes.slice(0, 10)) {
      warn(`ROUTE_META 缺少注册路由: ${r}`)
    }
  }

  // 校验不应独立存在 PUBLIC_ROUTES / FROZEN_ALLOWED_ROUTES 两份派生集合外的手填名单
  if (/PUBLIC_ROUTES\s*=\s*new Set\(\[/.test(content)) {
    // 新版是从 ROUTE_META 推导，仍允许 Set 包装，但应基于 Object.keys(ROUTE_META)
    if (!content.includes('Object.keys(ROUTE_META)')) {
      warn('PUBLIC_ROUTES 未从 ROUTE_META 推导')
    }
  }
}

// ==================== 检查 4: 源码中的绝对路由 ====================

function checkHardcodedRoutes(pagesJson) {
  console.log('\n=== 4. 源码中的绝对路由检查 ===\n')
  const registeredSet = getRegisteredRoutes(pagesJson)
  const violations = []

  walkDir(ROOT, (filePath) => {
    if (!filePath.endsWith('.vue') && !filePath.endsWith('.js')) return
    if (filePath.includes('app/config/routes.js')) return

    const content = fs.readFileSync(filePath, 'utf-8')
    const rel = path.relative(ROOT, filePath)

    // 检查字符串中的路由
    const routeRegex = ['/pages/', '/subPackages/']
    for (const routePrefix of routeRegex) {
      const regex = new RegExp(`['"]${routePrefix}[^'"]+['"]`, 'g')
      let m
      while ((m = regex.exec(content)) !== null) {
        const route = m[0].slice(1, -1)
        const normalized = route.replace(/^\//, '')
        if (!registeredSet.has(normalized) && !route.includes('?')) {
          violations.push(`${rel}: 引用未注册路由 ${route}`)
        }
      }
    }
  })

  if (violations.length === 0) {
    ok('未发现未注册路由引用')
  } else {
    for (const v of violations) warn(v)
  }
}

// ==================== 检查 5: 旧路径 ====================

const OLD_PATHS = [
  'subPackages/authSub/',
  'subPackages/goodsSub/',
  'subPackages/orderSub/',
  'subPackages/paySub/',
  'subPackages/settlementSub/',
  'subPackages/afterSaleSub/',
  'subPackages/systemSub/',
  'subPackages/accountSub/',
  '/pages/product/',
  '/pages/cart/',
  '/pages/order/',
  '/pages/checkout/',
  '/pages/classify/',
  '/pages/mine/',
  '/pages/about/',
]

function checkOldPaths() {
  console.log('\n=== 5. 旧路径检查 ===\n')
  const violations = []
  walkDir(ROOT, (filePath) => {
    if (!filePath.endsWith('.vue') && !filePath.endsWith('.js')) return
    const content = fs.readFileSync(filePath, 'utf-8')
    const rel = path.relative(ROOT, filePath)

    for (const old of OLD_PATHS) {
      // 使用正则查找，并排除 subPackages/xxx/ 前缀的新路径
      const escapedOld = old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?<![\\w/])${escapedOld}`, 'g')
      const match = content.match(regex)
      if (match && match.length > 0) {
        // 进一步验证：不是 /subPackages/<pkg>/pages/xxx 结构
        let realViolation = false
        let idx = 0
        while ((idx = content.indexOf(old, idx)) !== -1) {
          const before = content.substring(0, idx)
          // 检查前面是否是 subPackages/xxx/ 结构
          if (!/subPackages\/\w+\/$/.test(before.slice(-40))) {
            realViolation = true
            break
          }
          idx += old.length
        }
        if (realViolation) {
          violations.push(`${rel}: 包含旧路径 "${old}"`)
        }
      }
    }
  })
  if (violations.length === 0) {
    ok('未发现旧路径引用')
  } else {
    for (const v of violations) warn(v)
  }
}

// ==================== 检查 6: 直接 uni 导航调用 ====================

function checkDirectNavigate() {
  console.log('\n=== 6. 业务页面禁止直接调用 uni 导航 ===\n')
  const excludedFiles = ['routeGuard.js', 'navigator.js']
  const uniNavApis = ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab', 'navigateBack']
  const violations = []

  walkDir(ROOT, (filePath) => {
    if (!filePath.endsWith('.vue') && !filePath.endsWith('.js')) return
    if (excludedFiles.some(e => filePath.endsWith(e))) return
    const content = fs.readFileSync(filePath, 'utf-8')
    const rel = path.relative(ROOT, filePath)

    for (const api of uniNavApis) {
      const regex = new RegExp(`uni\\.${api}\\s*\\(`, 'g')
      let m
      while ((m = regex.exec(content)) !== null) {
        violations.push(`${rel}: 直接调用 uni.${api}`)
      }
    }
  })
  if (violations.length === 0) {
    ok('未发现违规直接调用')
  } else {
    for (const v of violations) warn(v)
  }
}

// ==================== 检查 7-9: 分包边界 ====================

const SUBPACKAGES = [
  'subPackages/auth',
  'subPackages/commerce',
  'subPackages/order',
  'subPackages/account',
  'subPackages/content'
]

function checkBoundaries() {
  console.log('\n=== 7-9. 分包边界检查 ===\n')

  walkDir(ROOT, (filePath) => {
    if (!filePath.endsWith('.vue') && !filePath.endsWith('.js')) return
    const content = fs.readFileSync(filePath, 'utf-8')
    const rel = path.relative(ROOT, filePath).replace(/\\/g, '/')
    const imports = extractImports(content)

    const currentSub = SUBPACKAGES.find(sp => rel.startsWith(sp))

    for (const imp of imports) {
      // 主包页面禁止 import 分包
      if (rel.startsWith('pages/') || rel.startsWith('app/') || rel.startsWith('shared/')) {
        for (const sub of SUBPACKAGES) {
          if (imp.startsWith(`${sub}/`) || imp.startsWith(`@/${sub}/`)) {
            if (rel.startsWith('shared/')) {
              error(`${rel}: shared 引用业务分包 ${imp}`)
            } else {
              error(`${rel}: 主包/app 引用分包 ${imp}`)
            }
          }
        }
      }

      // 分包内禁止 import 其他分包
      if (currentSub) {
        for (const otherSub of SUBPACKAGES) {
          if (otherSub !== currentSub && (imp.startsWith(`${otherSub}/`) || imp.startsWith(`@/${otherSub}/`))) {
            error(`${rel}: 跨包引用 ${imp}`)
          }
        }
      }
    }
  })
  ok('分包边界检查完毕')
}

// ==================== 检查 10: easycom ====================

function checkEasycom(pagesJson) {
  console.log('\n=== 10. easycom 指向组件检查 ===\n')
  if (!pagesJson.easycom || !pagesJson.easycom.custom) {
    warn('无 easycom 配置')
    return
  }
  for (const [pattern, componentPath] of Object.entries(pagesJson.easycom.custom)) {
    if (!componentPath.startsWith('@/')) {
      continue
    }
    const resolved = path.join(ROOT, componentPath.slice(2))
    if (fs.existsSync(resolved)) {
      ok(`${pattern} -> ${componentPath}`)
    } else {
      error(`easycom ${pattern} 指向组件不存在: ${componentPath}`)
    }
  }
}

// ==================== 检查 11: package.json scripts ====================

function checkPackageJsonScripts() {
  console.log('\n=== 11. package.json scripts 文件存在检查 ===\n')
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'))
  for (const [name, script] of Object.entries(pkg.scripts || {})) {
    // Extract file path from script
    const match = script.match(/(\S+\.(?:js|mjs|cjs))/g)
    if (match) {
      for (const file of match) {
        const filePath = path.resolve(__dirname, '..', file)
        if (!fs.existsSync(filePath)) {
          error(`package.json script "${name}" 指向不存在的文件: ${file}`)
        } else {
          ok(`script "${name}" -> ${file}`)
        }
      }
    }
  }
}

// ==================== 检查 12: 根旧目录存在 ====================

const OLD_ROOT_DIRS = [
  'api',
  'hooks',
  'store',
  'config',
  'utils',
  'components',
  'modules',
  'features',
  'services'
]

function checkOldRootDirs() {
  console.log('\n=== 12. 根旧目录检查 ===\n')
  for (const dir of OLD_ROOT_DIRS) {
    const dirPath = path.join(ROOT, dir)
    if (fs.existsSync(dirPath)) {
      // 检查是否有真实文件（非转发）
      let hasRealFiles = false
      walkDir(dirPath, (filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.vue')) {
          hasRealFiles = true
        }
      })
      if (hasRealFiles) {
        error(`旧根目录仍存在: src/${dir}`)
      }
    }
  }
  ok('根旧目录检查完毕')
}

// ==================== 检查 13: 非法 JS 文件名 ====================

function checkJsFilenames() {
  console.log('\n=== 13. JS 文件名规范检查 ===\n')
  const checkDirs = [ROOT, SCRIPTS_DIR, TESTS_DIR]
  const badFiles = []

  for (const dir of checkDirs) {
    if (!fs.existsSync(dir)) continue
    walkDir(dir, (filePath) => {
      if (!filePath.endsWith('.js') && !filePath.endsWith('.mjs') && !filePath.endsWith('.cjs')) return
      const basename = path.basename(filePath, path.extname(filePath))

      // 禁止 .mjs 和 .cjs
      if (filePath.endsWith('.mjs') || filePath.endsWith('.cjs')) {
        badFiles.push(`${path.relative(path.resolve(__dirname, '..'), filePath)}: 使用了禁止的扩展名`)
        return
      }

      // 禁止多点文件名 (如 audit-routes, cart.mapper)
      if (basename.includes('.') || basename.includes('-')) {
        badFiles.push(`${path.relative(path.resolve(__dirname, '..'), filePath)}: 文件名包含非法字符 (. 或 -)`)
      }
    })
  }

  if (badFiles.length === 0) {
    ok('未发现非法 JS 文件名')
  } else {
    for (const f of badFiles) error(f)
  }
}

// ==================== main ====================

function main() {
  console.log('='.repeat(60))
  console.log('路由与结构审计脚本')
  console.log('='.repeat(60))

  const pagesJson = loadPagesJson()
  const routes = getRegisteredRoutes(pagesJson)
  console.log(`\n已注册路由: ${routes.size}`)
  console.log(`分包数: ${(pagesJson.subPackages || []).length}`)

  checkPageExistence(pagesJson)
  checkUnregisteredPages(pagesJson)
  checkRoutesJsRegistered(pagesJson)
  checkHardcodedRoutes(pagesJson)
  checkOldPaths()
  checkDirectNavigate()
  checkBoundaries()
  checkEasycom(pagesJson)
  checkPackageJsonScripts()
  checkOldRootDirs()
  checkJsFilenames()

  console.log('\n' + '='.repeat(60))
  console.log(`审计完成: ${errorCount} 错误, ${warnCount} 警告`)
  console.log('='.repeat(60))

  process.exit(errorCount > 0 ? 1 : 0)
}

main()
