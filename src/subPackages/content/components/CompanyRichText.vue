<template>
  <view class="company-article">
    <rich-text class="company-article-body" :nodes="renderedContent" :selectable="true" />
  </view>
</template>

<script setup>
import { ref, watch, onScopeDispose } from 'vue'
import { useResponsive } from '@/shared/composables/useResponsive.js'
import { formatCompanyRichText } from '../utils/companyRichText.js'
import { cacheRichTextImages, getCachedResourcePath, isWebResourcePlatform } from '@/shared/utils/resourceCache.js'

const props = defineProps({ content: { type: String, default: '' } })
const renderedContent = ref('')
const { layout } = useResponsive()
const imagePlaceholder = '/static/images/image-placeholder.svg'
let generation = 0

// 文本先显示；APP已缓存图片直显，未命中先占位，再由共用缓存按原四槽下载替换。
watch(() => [props.content, layout.value.windowWidth], async ([value, width]) => {
  const current = ++generation
  const html = formatCompanyRichText(value, { inlineStyles: !isWebResourcePlatform(), width })
  // 小程序原生rich-text只接受网络图片；APP才替换为本地缓存路径。
  const platform = typeof uni !== 'undefined' ? uni.getSystemInfoSync?.()?.uniPlatform : ''
  if (String(platform || '').startsWith('mp-')) { renderedContent.value = html; return }
  renderedContent.value = isWebResourcePlatform() ? html : html.replace(
    /(<img\b[^>]*?\s+src\s*=\s*)(["'])(https?:\/\/[^"']+)\2/gi,
    (_all, prefix, quote, url) => prefix + quote + (getCachedResourcePath(url, { kind: 'image' }) || imagePlaceholder) + quote,
  )
  try {
    const cached = await cacheRichTextImages(html, { fallbackUrl: imagePlaceholder })
    if (generation === current) renderedContent.value = cached
  } catch {
    // 单张或缓存准备失败时仍保留原可用正文和图片占位，不阻塞整篇阅读。
  }
}, { immediate: true })
onScopeDispose(() => { generation++ })
</script>

<!-- 富文本内部class只在本组件样式中定义；使用唯一前缀，不依赖父页scoped或官网外链CSS。 -->
<style lang="scss">
.company-article {
  min-width: 0;
  padding: 44px 32px;
  color: #fff;
  background: radial-gradient(ellipse at 14% 0%, #54151e 0%, #200d14 35%, #0c090e 78%);
}
.company-article-body { display: block; max-width: 1100px; margin: 0 auto; color: #e7dfe3; font-size: var(--type-body-size, 14px); line-height: 1.9; overflow-wrap: anywhere; }
.company-article .company-section { display: flex; align-items: flex-start; gap: 40px; min-width: 0; margin-bottom: 76px; }
.company-article .company-section:last-child { margin-bottom: 0; }
.company-article .company-section-title { width: 168px; flex: none; position: sticky; top: 20px; }
.company-article .company-section-heading { margin: 0; padding-left: 16px; border-left: 2px solid #e33e43; color: #fff; font-size: 26px; line-height: 1.35; font-weight: 600; }
.company-article .company-title-rule { width: 52px; height: 2px; margin: 18px 0 0 18px; background: #d7192d; }
.company-article .company-section-body { flex: 1; width: 0; min-width: 0; }
.company-article .at1 { margin: 0 0 12px; font-size: 20px; font-weight: 600; line-height: 1.5; color: #fff; }
.company-article .at2 { margin-bottom: 28px; color: #d0bec6; font-size: var(--type-body-size, 14px); line-height: 1.9; }
.company-article .at5 { margin-top: 20px; }
.company-article .at3 { display: block !important; }
.company-article .at3 .ls { display: flex; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,.1); }
.company-article .at3 .a2 { display: flex; flex: 1; min-width: 0; gap: 12px; }
.company-article .at3 .b1 { width: 96px; flex: none; color: #baa6b0; }
.company-article .at3 .b2 { flex: 1; min-width: 0; color: #f6edf1; }
.company-article .company-timeline-entry { position: relative; margin-left: 5px; padding: 0 0 32px 24px; border-left: 1px solid rgba(255,255,255,.22); }
.company-article .company-timeline-entry:last-child { border-left-color: transparent; padding-bottom: 0; }
.company-article .company-timeline-dot { position: absolute; display: block; left: -5px; top: 9px; width: 9px; height: 9px; border-radius: 50%; background: #fff; box-shadow: 0 0 12px rgba(255,255,255,.28); }
.company-article .company-timeline-inner { display: flex; align-items: flex-start; gap: 20px; min-width: 0; }
.company-article .company-year { flex: none; width: 68px; margin: 0; color: #fff; font-size: 24px; font-weight: 400; line-height: 1.4; }
.company-article .company-timeline-copy { flex: 1; min-width: 0; color: #d0bec6; line-height: 1.9; }
.company-article .at7 { display: flex; flex-wrap: wrap; margin: 32px -10px 0; }
.company-article .at7 .ls { width: 25%; min-width: 0; box-sizing: border-box; padding: 0 10px 28px; text-align: center; }
.company-article .at7 .a1 { display: flex; align-items: center; justify-content: center; height: 92px; margin-bottom: 12px; }
.company-article .at7 .company-rt-image { width: 80px !important; max-width: 80px !important; height: 80px !important; object-fit: contain; filter: brightness(0) invert(1); opacity: .85; }
.company-article .at7 .a2 { color: #d0bec6; font-size: var(--type-caption-size, 12px); line-height: 1.6; }
.company-article .at3.at8 .a1 { width: 6px; height: 6px; flex: none; margin: 10px 14px 0 0; border-radius: 50%; background: #e7dfe3; }
.company-article .at3.at8 .b1 { width: auto; flex: 1; color: #e7dfe3; }
.company-article .company-rt-image { max-width: 100%; height: auto; }
@media (max-width: 767px) {
  .company-article { padding: 32px 20px; }
  .company-article .company-section { flex-direction: column; gap: 26px; margin-bottom: 56px; }
  .company-article .company-section-title { position: static; width: 100%; }
  .company-article .company-section-heading { font-size: 24px; }
  .company-article .company-section-body { width: 100%; }
  .company-article .at7 .ls { width: 33.333333%; }
}
@media (max-width: 420px) {
  .company-article { padding: 28px 18px; }
  .company-article .at7 .ls { width: 50%; }
  .company-article .company-timeline-inner { flex-direction: column; gap: 8px; }
  .company-article .at3 .b1 { width: 82px; }
}
</style>
