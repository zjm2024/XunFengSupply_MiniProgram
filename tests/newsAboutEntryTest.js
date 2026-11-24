import { describe, it, expect, vi } from 'vitest'
import * as vue from 'vue'
import { readFileSync } from 'node:fs'
import { loadPageSetup } from './helpers/sfcHarness.js'
import { registerMainLocales } from '@/app/i18n/registerMain.js'
import { setLocale, t } from '@/shared/i18n/index.js'

describe('资讯关于我们入口', () => {
  it('品牌入口独立于资讯加载态并使用独立公司路由，8条资讯完整保留', async () => {
    const navigateTo = vi.fn().mockResolvedValue(true)
    const items = Array.from({ length: 8 }, (_, index) => ({ id: String(index) }))
    const getNewsList = vi.fn().mockResolvedValue({ items })
    const page = await loadPageSetup('pages/home/tabs/TabNews.vue', async id => {
      if (id === 'vue') return vue
      if (id.endsWith('/api/news.js')) return { getNewsList }
      if (id.endsWith('/navigator.js')) return { navigator: { navigateTo } }
      if (id.endsWith('/routes.js')) return { routes: { content: { company: () => '/subPackages/content/pages/company/index' } } }
      if (id.includes('/i18n/')) return { t: key => key }
      return { default: {} }
    }, { active: true })
    await vue.nextTick(); await Promise.resolve()
    await page.bindings.openAbout()
    expect(navigateTo).toHaveBeenCalledWith('/subPackages/content/pages/company/index')
    expect(page.bindings.newsItems.value).toEqual(items)
    const source = readFileSync('src/pages/home/tabs/TabNews.vue', 'utf8')
    expect(source.indexOf('class="about-banner"')).toBeLessThan(source.indexOf('v-if="loading"'))
    expect(source).toContain('@click="openAbout"')
    expect(source).toContain('@keydown.enter="openAbout"')
    expect(source).not.toContain('<AppButton')
    page.stop()
  })
  it('中英文入口文案完整，切换语言不改变目标路由', () => {
    registerMainLocales(); setLocale('zh-CN')
    expect(t('main.news.aboutAction')).toBe('探索薰风')
    expect(t('main.news.aboutDescription')).toContain('自2001年创立以来')
    setLocale('en-US'); expect(t('main.news.aboutAction')).toBe('Explore KUMPOO')
    expect(t('main.news.aboutDescription')).toContain('Founded in 2001')
    setLocale('zh-CN')
  })
})
