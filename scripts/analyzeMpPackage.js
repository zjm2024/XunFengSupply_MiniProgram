/**
 * 微信小程序包体分析脚本
 *
 * 分析真实构建产物 dist/build/mp-weixin
 * 检查项：
 * 1. 构建产物合法性校验
 * 2. 主包 bytes 和 MiB
 * 3. 每个分包 bytes 和 MiB
 * 4. 总包 bytes 和 MiB
 * 5. 最大 30 个文件
 * 6. 大于 100KB 的文件
 * 7. 相同 hash 的重复文件
 * 8. 主包中疑似业务 API、Store、页面资源
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.resolve(__dirname, '../dist/build/mp-weixin')

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
function info(msg) {
  console.log(`[INFO] ${msg}`)
}

// 内部门槛 (bytes)
const LIMITS = {
  MAIN_MAX: 1.5 * 1024 * 1024,      // 主包 1.5MiB
  SUBPACKAGE_MAX: 1.5 * 1024 * 1024, // 单分包 1.5MiB
  TOTAL_MAX: 15 * 1024 * 1024,       // 总包 15MiB
  FILE_WARN: 100 * 1024,             // 单文件 100KB 预警
  MAIN_IMAGE_MAX: 100 * 1024         // 主包业务图片 100KB
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`
}

// 格式化 MiB
function toMiB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2)
}

// ==================== 扫描目录 ====================

function scanDir(dir) {
  const stats = {
    totalSize: 0,
    files: [],
    dirs: {}
  }

  if (!fs.existsSync(dir)) return stats

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      const dirStats = scanDir(fullPath)
      stats.dirs[entry.name] = dirStats
      stats.totalSize += dirStats.totalSize
      for (const f of dirStats.files) {
        stats.files.push({ ...f, dir: entry.name })
      }
    } else {
      const stat = fs.statSync(fullPath)
      const ext = path.extname(entry.name).toLowerCase()
      const fileInfo = {
        path: fullPath,
        relativePath: path.relative(ROOT, fullPath),
        size: stat.size,
        ext
      }
      stats.totalSize += stat.size
      stats.files.push(fileInfo)
    }
  }
  return stats
}

// ==================== 计算文件 hash ====================

function computeFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath)
    return crypto.createHash('md5').update(content).digest('hex')
  } catch (e) {
    return null
  }
}

// ==================== 检查 1: 构建产物合法性校验 ====================

/**
 * 验证 dist/build/mp-weixin 是否真正是微信小程序构建产物。
 * 小程序产物应包含：app.json / app.wxss / project.config.json / sitemap.json 等。
 */
function checkBuildArtifactIntegrity() {
  console.log('\n=== 1. 构建产物合法性校验 ===\n')

  const requiredFiles = ['app.json', 'app.wxss']
  const recommendedFiles = ['project.config.json', 'sitemap.json']

  for (const f of requiredFiles) {
    const filePath = path.join(ROOT, f)
    if (fs.existsSync(filePath)) {
      ok(`必要文件存在: ${f}`)
    } else {
      error(`缺少必要文件: ${f}（可能不是微信小程序构建产物）`)
    }
  }

  for (const f of recommendedFiles) {
    const filePath = path.join(ROOT, f)
    if (fs.existsSync(filePath)) {
      ok(`推荐文件存在: ${f}`)
    } else {
      warn(`缺少推荐文件: ${f}`)
    }
  }

  // 校验 app.json 中能解析出 pages
  try {
    const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf-8'))
    if (appJson.pages && appJson.pages.length > 0) {
      ok(`app.json pages 数量: ${appJson.pages.length}`)
    } else {
      error('app.json 缺少 pages 配置')
    }
    if (appJson.subPackages && appJson.subPackages.length > 0) {
      ok(`app.json subPackages 数量: ${appJson.subPackages.length}`)
    } else {
      warn('app.json 缺少 subPackages 配置')
    }
  } catch (e) {
    error(`app.json 解析失败: ${e.message}`)
  }
}

// ==================== 检查 2: 主包分析 ====================

function analyzeMainPackage(stats) {
  console.log('\n=== 主包分析 ===\n')

  const appPages = stats.dirs['pages']
  const appCode = stats.files.filter(f =>
    f.relativePath.startsWith('app/') ||
    f.relativePath.startsWith('shared/')
  )
  const staticFiles = stats.dirs['static']

  let mainSize = 0
  // 主包包含: app, shared, static, main.js, pages
  if (appPages) mainSize += appPages.totalSize
  if (staticFiles) mainSize += staticFiles.totalSize

  // app 和 shared 目录
  for (const f of stats.files) {
    if (f.relativePath.startsWith('app/') ||
        f.relativePath.startsWith('shared/') ||
        f.relativePath === 'main.js' ||
        f.relativePath === 'app.json' ||
        f.relativePath === 'app.wxss') {
      mainSize += f.size
    }
  }

  info(`主包大小: ${formatSize(mainSize)} (${toMiB(mainSize)} MiB)`)

  if (mainSize > LIMITS.MAIN_MAX) {
    error(`主包大小 ${toMiB(mainSize)} MiB 超过限制 ${toMiB(LIMITS.MAIN_MAX)} MiB`)
  } else {
    ok(`主包大小在限制范围内`)
  }

  return mainSize
}

// ==================== 检查 3: 分包分析 ====================

function analyzeSubpackages(stats) {
  console.log('\n=== 分包分析 ===\n')

  const subpackages = [
    { key: 'subPackages/auth', name: 'auth' },
    { key: 'subPackages/commerce', name: 'commerce' },
    { key: 'subPackages/order', name: 'order' },
    { key: 'subPackages/account', name: 'account' },
    { key: 'subPackages/content', name: 'content' }
  ]

  let totalSubSize = 0
  const results = []

  for (const sp of subpackages) {
    const dir = stats.dirs[sp.key]
    if (!dir) {
      warn(`分包目录不存在: ${sp.key}`)
      continue
    }
    totalSubSize += dir.totalSize
    results.push({ ...sp, size: dir.totalSize })

    info(`${sp.name}: ${formatSize(dir.totalSize)} (${toMiB(dir.totalSize)} MiB)`)

    if (dir.totalSize > LIMITS.SUBPACKAGE_MAX) {
      error(`分包 ${sp.name} 大小 ${toMiB(dir.totalSize)} MiB 超过限制 ${toMiB(LIMITS.SUBPACKAGE_MAX)} MiB`)
    }
  }

  return { totalSubSize, results }
}

// ==================== 检查 4: 总体积 ====================

function analyzeTotalSize(mainSize, subSize) {
  console.log('\n=== 总体积 ===\n')

  const total = mainSize + subSize
  info(`总包大小: ${formatSize(total)} (${toMiB(total)} MiB)`)

  if (total > LIMITS.TOTAL_MAX) {
    error(`总包大小 ${toMiB(total)} MiB 超过限制 ${toMiB(LIMITS.TOTAL_MAX)} MiB`)
  } else {
    ok(`总包大小在限制范围内`)
  }
}

// ==================== 检查 5: 最大文件 ====================

function analyzeLargestFiles(stats) {
  console.log('\n=== 最大 30 个文件 ===\n')

  const sorted = [...stats.files].sort((a, b) => b.size - a.size).slice(0, 30)

  console.log(`${'大小'.padEnd(12)} ${'文件路径'}`)
  console.log('-'.repeat(70))
  for (const f of sorted) {
    console.log(`${formatSize(f.size).padEnd(12)} ${f.relativePath}`)
  }
}

// ==================== 检查 6: 大文件预警 ====================

function checkLargeFiles(stats) {
  console.log('\n=== 大于 100KB 的文件 ===\n')

  const largeFiles = stats.files.filter(f => f.size > LIMITS.FILE_WARN)

  if (largeFiles.length === 0) {
    ok('无超过 100KB 的文件')
    return
  }

  const sorted = largeFiles.sort((a, b) => b.size - a.size)
  for (const f of sorted) {
    warn(`${f.relativePath}: ${formatSize(f.size)}`)
  }
}

// ==================== 检查 7: 重复文件 ====================

function checkDuplicateFiles(stats) {
  console.log('\n=== 重复文件检查 ===\n')

  const hashMap = new Map()

  for (const f of stats.files) {
    if (f.size > 50 * 1024) { // 只检查大于 50KB 的文件
      const hash = computeFileHash(f.path)
      if (hash) {
        if (!hashMap.has(hash)) {
          hashMap.set(hash, [])
        }
        hashMap.get(hash).push(f)
      }
    }
  }

  let hasDuplicates = false
  for (const [hash, files] of hashMap) {
    if (files.length > 1) {
      hasDuplicates = true
      warn(`重复文件 (hash: ${hash.substring(0, 8)}...):`)
      for (const f of files) {
        warn(`  - ${f.relativePath} (${formatSize(f.size)})`)
      }
    }
  }

  if (!hasDuplicates) {
    ok('未发现重复文件')
  }
}

// ==================== 检查 8: 主包业务占位检查 ====================

function checkMainPackageBusinessContent(stats) {
  console.log('\n=== 主包业务内容检查 ===\n')

  const suspiciousPatterns = [
    /api\//,
    /store\//,
    /hooks\//,
    /jersey-/,
    /product/i,
    /cart/i,
    /order/i
  ]

  const suspiciousFiles = []

  for (const f of stats.files) {
    if (f.size > LIMITS.MAIN_IMAGE_MAX) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(f.relativePath)) {
          suspiciousFiles.push(f)
          break
        }
      }
    }
  }

  if (suspiciousFiles.length === 0) {
    ok('主包未发现疑似业务占位内容')
  } else {
    for (const f of suspiciousFiles) {
      warn(`主包疑似业务文件: ${f.relativePath} (${formatSize(f.size)})`)
    }
  }
}

// ==================== main ====================

function main() {
  console.log('='.repeat(60))
  console.log('微信小程序包体分析脚本')
  console.log('='.repeat(60))

  if (!fs.existsSync(ROOT)) {
    error(`构建产物目录不存在: ${ROOT}`)
    console.log('请先运行: npm run build:weixin')
    process.exit(1)
  }

  checkBuildArtifactIntegrity()

  const stats = scanDir(ROOT)
  info(`构建产物总大小: ${formatSize(stats.totalSize)} (${toMiB(stats.totalSize)} MiB)`)
  info(`文件总数: ${stats.files.length}`)

  const mainSize = analyzeMainPackage(stats)
  const { totalSubSize, results: subResults } = analyzeSubpackages(stats)
  analyzeTotalSize(mainSize, totalSubSize)
  analyzeLargestFiles(stats)
  checkLargeFiles(stats)
  checkDuplicateFiles(stats)
  checkMainPackageBusinessContent(stats)

  // 最终汇总
  console.log('\n' + '='.repeat(60))
  console.log('汇总:')
  console.log(`  主包: ${formatSize(mainSize)} (${toMiB(mainSize)} MiB)`)
  for (const sp of subResults) {
    console.log(`  ${sp.name}: ${formatSize(sp.size)} (${toMiB(sp.size)} MiB)`)
  }
  console.log(`  总包: ${formatSize(mainSize + totalSubSize)} (${toMiB(mainSize + totalSubSize)} MiB)`)
  console.log('='.repeat(60))
  console.log(`分析完成: ${errorCount} 错误, ${warnCount} 警告`)
  console.log('='.repeat(60))

  process.exit(errorCount > 0 ? 1 : 0)
}

main()
