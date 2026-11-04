/** 转义普通商品说明中的HTML控制符。 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 后台详情使用富文本编辑器，APP/小程序端需要移除可执行内容，
 * 同时把详情图片统一收敛为内容区全宽，避免后台写死宽高后溢出屏幕。
 */
export function normalizeDetailHtml(value) {
  const source = String(value || '').trim()
  if (!source) return ''

  let html = /<[a-z][\s\S]*>/i.test(source)
    ? source
    : escapeHtml(source).replace(/\r?\n/g, '<br>')

  html = html
    .replace(/<(script|iframe|object|embed|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')

  return html.replace(/<img\b([^>]*)\/?\s*>/gi, (_tag, attributes = '') => {
    const safeAttributes = attributes
      .replace(/\s(?:style|width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .trim()
    const prefix = safeAttributes ? ` ${safeAttributes}` : ''
    return `<img${prefix} style="display:block;width:100%;max-width:100%;height:auto;margin:0;" />`
  })
}

