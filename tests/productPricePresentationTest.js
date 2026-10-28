import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { compile } from '@vue/compiler-dom'
import { renderToString } from '@vue/server-renderer'
import { loadPageSetup } from './helpers/sfcHarness.js'

let vue, i18n
beforeEach(async () => {
  vi.resetModules()
  vue = await import('vue')
  i18n = await import('@/shared/i18n/index.js')
  const { registerMainLocales } = await import('@/app/i18n/registerMain.js')
  registerMainLocales()
  await import('@/subPackages/commerce/i18n/register.js')
})

/** 执行真实组件setup与模板，仅替换原生生命周期和无关子组件。 */
async function open(relative, props) {
  return loadPageSetup(relative, async id => {
    if (id === 'vue') return vue
    if (id === '@dcloudio/uni-app') return { onShow: vi.fn() }
    if (id.includes('i18n/index.js')) return i18n
    if (id.includes('priceDisplay.js')) return import('@/shared/utils/priceDisplay.js')
    return { default: { render: () => null } }
  }, props)
}

/** 渲染真实模板的价格文本和类名，不将SSR当作真机布局验收。 */
async function render(view, relative) {
  const template = parse(readFileSync(resolve('src', relative), 'utf8')).descriptor.template.content
  const renderFn = new Function('Vue', compile(template, { mode: 'function',
    isCustomElement: tag => ['view', 'text', 'button', 'scroll-view'].includes(tag) }).code)(vue)
  const context = vue.proxyRefs({ ...view.props, ...view.bindings, $slots: {} })
  const app = vue.createSSRApp({ render: () => renderFn(context, []) })
  app.config.warnHandler = () => {}
  app.component('AmountText', { props: ['text'], setup: props => () => vue.h('span', props.text) })
  for (const name of ['AppProductImage', 'QuantityStepper']) app.component(name, { render: () => null })
  return renderToString(app)
}

describe('product price surfaces', () => {
  it('catalog shows the minimum as a starting price and only its matching tag price; locale changes in place', async () => {
    const relative = 'shared/ui/AppProductCard/AppProductCard.vue'
    const view = await open(relative, { product: { name: '鞋', price: 0.01, hasPriceRange: true,
      listPrice: 699, priceRuleId: 7, priceSource: 'TEMPORARY_SPECIAL', unit: '双', stock: 10, moq: 1 },
    variant: 'row', showCode: true, showStock: true, showImageStockBadge: true })
    try {
      expect(await render(view, relative)).toContain('¥0.01起')
      expect(await render(view, relative)).toContain('¥699.00')
      expect(view.bindings.priceDisplay.value.showListPrice).toBe(true)
      i18n.setLocale('en-US')
      expect(await render(view, relative)).toContain('From ¥0.01')
      expect(await render(view, relative)).toContain('10 双 left')
      view.props.product.priceRuleId = null
      view.props.product.priceSource = 'BASE'
      expect(await render(view, relative)).not.toContain('¥699.00')
      view.props.product.hasPriceRange = false
      expect(await render(view, relative)).not.toContain('From')
    } finally { view.stop() }
  })

  it('purchase sheet switches reference with the selected SKU, without applying another SKU policy', async () => {
    const relative = 'subPackages/commerce/components/SingleSkuPurchaseSheet/SingleSkuPurchaseSheet.vue'
    const view = await open(relative, { visible: true, initialSkuId: 35, submitting: false,
      product: { price: 358, moq: 1, skus: [
        { skuId: 35, colorId: 1, sizeName: '35', price: 358, listPrice: 699, priceSource: 'BASE', stock: 10, canPurchase: true },
        { skuId: 36, colorId: 1, sizeName: '36', price: 0.01, listPrice: 699, priceRuleId: 7, priceSource: 'TEMPORARY_SPECIAL', stock: 10, canPurchase: true },
      ] } })
    try {
      expect(view.bindings.selectedPriceDisplay.value.showListPrice).toBe(false)
      expect(await render(view, relative)).not.toContain('¥699.00')
      view.bindings.selectedSkuId.value = 36
      expect(await render(view, relative)).toContain('¥0.01')
      expect(await render(view, relative)).toContain('¥699.00')
      expect(view.events).toEqual([])
    } finally { view.stop() }
  })
})
