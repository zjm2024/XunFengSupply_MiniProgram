const { readFileSync, readdirSync } = require('node:fs')
const { resolve, relative } = require('node:path')

const issues = []
let count = 0
/** 检查页面和共用样式是否绕过统一字体、图标尺寸入口。 */
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = resolve(dir, entry.name)
    if (entry.isDirectory()) { scan(file); continue }
    if (!/\.(vue|scss)$/.test(file) || /(?:uni|variable)\.scss$/.test(file)) continue
    count++
    const source = readFileSync(file, 'utf8')
    const css = file.endsWith('.vue') ? [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n') : source
    if (/font-size:\s*\d+(?:\.\d+)?(?:r?px)\b/.test(css)) issues.push(relative(process.cwd(), file) + ': font-size应使用语义token')
    for (const tag of source.matchAll(/<AppIcon\b[^>]*>/g)) {
      const size = tag[0].match(/\s:?size="(\d+)"/)
      if (size && ![14,16,18,20,24,28,40,48].includes(Number(size[1]))) issues.push(relative(process.cwd(), file) + ': 图标尺寸不在标准档位 ' + size[1])
    }
  }
}
scan(resolve('src'))
console.log('尺寸规范扫描：' + count + '个样式/组件文件，' + issues.length + '个问题')
issues.forEach(issue => console.error(issue))
if (issues.length) process.exitCode = 1
