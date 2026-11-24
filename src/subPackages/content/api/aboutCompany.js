import { dispatch } from '@/shared/api/dispatchClient.js'
import { normalizeDetailHtml } from '@/shared/utils/productRichText.js'

/** 保留官网隐藏图片语义，避免通用图片自适应处理把隐藏装饰图重新显示。 */
function normalizeCompanyContent(value) {
  const source = String(value || '').replace(/<img\b(?=[^>]*\bstyle\s*=\s*["'][^"']*\bdisplay\s*:\s*none\b)[^>]*>/gi, '')
  return normalizeDetailHtml(source)
}

/** 查询公司介绍，页面不接触供应商地址、文章编号和凭据。 */
export function getAboutCompany(languageCode = 'zh-cn') {
  return dispatch('ThirdParty', 'Mini.AboutCompanyController', 'GetDetail', {
    LanguageCode: languageCode,
  }).then(detail => {
    if (!detail) return null
    const sections = Array.isArray(detail.sections) ? detail.sections : []
    return {
      ...detail,
      id: detail.id ?? 0,
      cid: String(detail.cid || ''),
      title: String(detail.title || ''),
      content: normalizeCompanyContent(detail.content),
      sections: sections.filter(section => section?.content?.trim()).map(section => ({
        key: String(section.key || ''),
        title: String(section.title || ''),
        content: normalizeCompanyContent(section.content),
      })),
    }
  })
}
