/** 优先整篇正文；只有缺失时才按供应商顺序生成分区，不复制官网文案。 */
export function getCompanyArticleContent(company) {
  if (typeof company?.content === 'string' && company.content.trim()) return company.content
  const sections = Array.isArray(company?.sections) ? company.sections : []
  return sections.filter(section => typeof section?.content === 'string' && section.content.trim())
    .map(section => '<section>' + (section.title ? '<h2>' + escapeText(section.title) + '</h2>' : '') + section.content + '</section>')
    .join('')
}

function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 为原生富文本生成受信任结构：左标题/右正文、时间轴实际节点及专属图片class。输入已由API安全清理。 */
export function formatCompanyRichText(content, options = {}) {
  let html = String(content || '').replace(/<\/br\s*>/gi, '<br/>')
  // 原响应的同一section内有多个正文兄弟节点，必须整体包成右栏，不能让每块都成为横向flex项。
  html = html.replace(/<section\b[^>]*>([\s\S]*?)<\/section\s*>/gi, (_section, inner) => {
    const heading = inner.match(/<h2\b[^>]*>([\s\S]*?)<\/h2\s*>/i)
    const body = heading ? inner.replace(heading[0], '') : inner
    return '<div class="company-section">'
      + (heading ? '<div class="company-section-title"><h2 class="company-section-heading">' + heading[1] + '</h2><div class="company-title-rule"></div></div>' : '')
      + '<div class="company-section-body">' + body + '</div></div>'
  })
  html = html.replace(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/gi, (_article, body) => {
    const year = body.match(/<h3\b[^>]*>[\s\S]*?<\/h3\s*>/i)
    const copy = year ? body.replace(year[0], '') : body
    return '<div class="company-timeline-entry"><span class="company-timeline-dot"></span><div class="company-timeline-inner">'
      + (year?.[0] || '') + '<div class="company-timeline-copy">' + copy + '</div></div></div>'
  })
  // 不用原生rich-text不支持的section/article；非标准响应也保持子内容。
  html = html.replace(/<(\/?)\s*(section|article)\b/gi, '<$1div')
  html = html.replace(/<(img|h3)\b([^>]*)>/gi, (_tag, name, attrs) => {
    const marker = name.toLowerCase() === 'img' ? 'company-rt-image' : 'company-year'
    attrs = attrs.replace(/\/\s*$/, '')
    const existing = attrs.match(/\bclass\s*=\s*(["'])(.*?)\1/i)
    const attributes = existing ? attrs.replace(existing[0], 'class="' + existing[2] + ' ' + marker + '"') : attrs + ' class="' + marker + '"'
    return '<' + name + attributes + (name.toLowerCase() === 'img' ? ' />' : '>')
  })
  return options.inlineStyles ? inlineCompanyStyles(html, options.width) : html
}


/** App/小程序rich-text不依赖外部样式表；按实际窗口宽度将关键层级与排版写入受信任节点。 */
function inlineCompanyStyles(html, windowWidth) {
  const width = Number(windowWidth) || 375
  const wide = width >= 768
  const phone = width <= 420
  const stack = []
  const voidTags = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'col', 'area', 'source', 'wbr'])
  const hasAncestor = name => stack.some(item => item.classes.includes(name))
  return html.replace(/<\/?[a-z][\w:-]*(?:"[^"]*"|'[^']*'|[^'">])*>/gi, tag => {
    const closing = /^<\//.test(tag)
    const name = tag.match(/^<\/?([\w:-]+)/)?.[1].toLowerCase()
    if (closing) {
      const index = stack.map(item => item.name).lastIndexOf(name)
      if (index >= 0) stack.splice(index)
      return tag
    }
    const classes = (tag.match(/\sclass\s*=\s*(["'])(.*?)\1/i)?.[2] || '').split(/\s+/)
    const style = []
    const set = value => style.push(value)
    const own = key => classes.includes(key)
    const products = hasAncestor('at7')
    const facts = hasAncestor('at3')
    const honors = hasAncestor('at8')
    if (name === 'div') set('box-sizing:border-box;max-width:100%;color:#e7dfe3;font-size:14px;line-height:1.9;')
    if (own('company-section')) set('display:flex;align-items:flex-start;flex-direction:' + (wide ? 'row' : 'column') + ';margin:0 0 ' + (wide ? 76 : 56) + 'px;min-width:0;')
    if (own('company-section-title')) set('position:static;flex:none;width:' + (wide ? '168px' : '100%') + ';margin:' + (wide ? '0 40px 0 0' : '0 0 26px') + ';')
    if (own('company-section-heading')) set('margin:0;padding-left:16px;border-left:2px solid #e33e43;color:#fff;font-size:' + (wide ? 26 : 24) + 'px;line-height:1.35;font-weight:600;')
    if (own('company-title-rule')) set('width:52px;height:2px;margin:18px 0 0 18px;background:#d7192d;')
    if (own('company-section-body')) set('flex:' + (wide ? '1' : 'none') + ';width:' + (wide ? '0' : '100%') + ';min-width:0;')
    if (own('at1')) set('margin:0 0 12px;font-size:20px;font-weight:600;line-height:1.5;color:#fff;')
    if (own('at2')) set('margin-bottom:28px;color:#d0bec6;font-size:14px;line-height:1.9;')
    if (own('at5')) set('margin-top:20px;')
    if (own('at3')) set('display:block;')
    if (facts && own('ls')) set('display:flex;align-items:flex-start;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.1);')
    if (facts && own('a2')) set('display:flex;flex:1;min-width:0;')
    if (facts && own('b1')) set('width:' + (phone ? 82 : 96) + 'px;flex:none;margin-right:12px;color:#baa6b0;font-size:14px;line-height:1.9;')
    if (facts && own('b2')) set('flex:1;min-width:0;color:#f6edf1;font-size:14px;line-height:1.9;')
    if (own('company-timeline-entry')) set('position:relative;margin-left:5px;padding:0 0 32px 24px;border-left:1px solid rgba(255,255,255,.22);')
    if (own('company-timeline-dot')) set('position:absolute;display:block;left:-5px;top:9px;width:9px;height:9px;border-radius:50%;background:#fff;')
    if (own('company-timeline-inner')) set('display:flex;align-items:flex-start;flex-direction:' + (phone ? 'column' : 'row') + ';min-width:0;')
    if (own('company-year')) set('flex:none;width:68px;margin:' + (phone ? '0 0 8px' : '0 20px 0 0') + ';color:#fff;font-size:24px;font-weight:400;line-height:1.4;')
    if (own('company-timeline-copy')) set('flex:1;min-width:0;color:#d0bec6;font-size:14px;line-height:1.9;')
    if (own('at7')) set('display:flex;flex-wrap:wrap;margin:32px -10px 0;')
    if (products && own('ls')) set('width:' + (phone ? '50%' : wide ? '25%' : '33.333333%') + ';min-width:0;padding:0 10px 28px;text-align:center;')
    if (products && own('a1')) set('display:flex;align-items:center;justify-content:center;height:92px;margin-bottom:12px;')
    if (products && own('a2')) set('color:#d0bec6;font-size:12px;line-height:1.6;')
    if (name === 'img') set('max-width:100%;height:auto;')
    if (products && name === 'img') set('width:80px!important;max-width:80px!important;height:80px!important;object-fit:contain;filter:brightness(0) invert(1);opacity:.85;')
    if (honors && own('a1')) set('width:6px;height:6px;flex:none;margin:10px 14px 0 0;border-radius:50%;background:#e7dfe3;')
    if (honors && own('b1')) set('width:auto;flex:1;color:#e7dfe3;')
    if (!voidTags.has(name) && !/\/\s*>$/.test(tag)) stack.push({ name, classes })
    if (!style.length) return tag
    const previous = tag.match(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/i)?.[2] || ''
    const clean = tag.replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/i, '').replace(/\s*\/?\s*>$/, '')
    return clean + ' style="' + (previous + ';' + style.join('')).replace(/"/g, '&quot;') + '"' + (voidTags.has(name) ? ' />' : '>')
  })
}
