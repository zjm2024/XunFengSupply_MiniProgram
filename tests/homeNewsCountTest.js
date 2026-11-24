import { describe, it, expect, vi } from 'vitest'
import * as vue from 'vue'
import { loadPageSetup } from './helpers/sfcHarness.js'

describe('首页资讯返回条数', () => {
  it.each([8, 3, 0])('接口返回%s条时完整保留，短时切换不重复加载', async count => {
    const items = Array.from({ length: count }, (_, index) => ({ id: String(index + 1), title: '资讯' + index }))
    const getNewsList = vi.fn().mockResolvedValue({ items })
    const page = await loadPageSetup('pages/home/tabs/TabNews.vue', async id => {
      if (id === 'vue') return vue
      if (id.endsWith('/api/news.js')) return { getNewsList }
      if (id.includes('/i18n/')) return { t: key => key }
      return { default: {}, navigator: {}, routes: {} }
    }, { active: true })
    await vue.nextTick(); await Promise.resolve()
    expect(getNewsList).toHaveBeenCalledWith({ pageNum: 1, pageSize: 8 })
    expect(page.bindings.newsItems.value).toEqual(items)
    expect(page.bindings.newsItems.value).toHaveLength(count)
    page.props.active = false; await vue.nextTick()
    page.props.active = true; await vue.nextTick()
    expect(getNewsList).toHaveBeenCalledTimes(1)
    page.stop()
  })
})
