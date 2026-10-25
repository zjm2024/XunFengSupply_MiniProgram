import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPageSetup } from './helpers/sfcHarness.js'

let vue, i18n
const stops = []
beforeEach(async () => {
  vi.resetModules()
  vue = await import('vue')
  i18n = await import('@/shared/i18n/index.js')
  const { registerMainLocales } = await import('@/app/i18n/registerMain.js')
  registerMainLocales()
  await import('@/subPackages/content/i18n/register.js')
  vi.stubGlobal('uni', { showToast: vi.fn(), setClipboardData: vi.fn(), makePhoneCall: vi.fn() })
  vi.stubGlobal('getCurrentPages', () => [])
})
afterEach(() => {
  stops.splice(0).forEach(stop => stop())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** 运行内容页真实 setup，注入消息、附件 API 和导航替身。 */
async function open(relative, supplied = {}) {
  const api = { getMessageList: vi.fn(async () => ({ items: [], totalCount: 0 })),
    getUnreadCount: vi.fn(async () => 0), markAllAsRead: vi.fn(), markAsRead: vi.fn(),
    getManualDetail: vi.fn(async () => null), getNewsDetail: vi.fn(async () => null), ...supplied.api }
  const store = vue.reactive({ messageList: [], typeUnreadCount: { order: 2, audit: 1, bill: 0, announcement: 0 },
    unreadCount: 3, reduceUnread: vi.fn(), getMessageTypeKey: vi.fn(() => 'order'),
    setMessageList: vi.fn(), setLatestMessage: vi.fn(), setUnreadCount: vi.fn(), markAllRead: vi.fn(), ...supplied.store })
  const hooks = {}, navigator = { navigateTo: vi.fn(async () => true), back: vi.fn() }
  const page = await loadPageSetup('subPackages/content/pages/' + relative, async id => {
    if (id === 'vue') return { ...vue, onMounted: () => {} }
    if (id === '@dcloudio/uni-app') return { onLoad: fn => { hooks.load = fn }, onShow: fn => { hooks.show = fn },
      onReady: () => {}, onUnload: () => {} }
    if (id.includes('i18n/index')) return i18n
    if (id.includes('messageStore')) return { useMessageStore: () => store }
    if (id.includes('useResponsive')) return { useResponsive: () => ({ layout: vue.ref({}), safeArea: vue.ref({}) }) }
    if (id.includes('navigator')) return { navigator }
    if (id.includes('config/routes')) return { routes: { order: { detail: id => '/order/' + id },
      account: { billDetail: id => '/bill/' + id, notificationSettings: () => '/notifications' },
      content: { manualPdfPreview: id => '/pdf/' + id, manualPreview: id => '/manual/' + id,
        messageDetail: id => '/message/' + id }, auth: { agreement: () => '/agreement' } } }
    if (id.includes('resourceCache')) return { cacheRichTextImages: vi.fn(async value => value) }
    if (id.includes('/api/')) return api
    if (id.includes('utils/format')) return import('@/shared/utils/format.js')
    if (id.includes('refreshAnimation')) return { waitForRefreshAnimation: vi.fn() }
    return { default: {} }
  })
  stops.push(page.stop)
  return { v: page.bindings, hooks, api, store, navigator }
}

describe('内容页面壳层双语与原始内容隔离', () => {
  it.each([
    [-10, '刚刚', 'Just now'], [59, '刚刚', 'Just now'], [60, '1分钟前', '1 min ago'],
    [3599, '59分钟前', '59 min ago'], [3600, '1小时前', '1 hr ago'],
    [86400, '1天前', '1 d ago'], [604799, '6天前', '6 d ago'],
  ])('相对时间 %s 秒只翻译标签，保留 UTC 差值、分界和默认中文兼容', async (seconds, zh, en) => {
    const now = Date.parse('2026-10-25T08:00:00Z')
    vi.spyOn(Date, 'now').mockReturnValue(now)
    const date = new Date(now - seconds * 1000)
    const utc = date.toISOString()
    const { v } = await open('message/index.vue')
    expect(v.formatRelativeTime(date)).toBe(zh)
    expect(v.formatRelativeTime(date, v.relativeTimeLabel)).toBe(zh)
    const display = vue.computed(() => v.formatRelativeTime(date, v.relativeTimeLabel))
    i18n.setLocale('en')
    expect(display.value).toBe(en)
    expect(date.toISOString()).toBe(utc)
    expect(v.formatRelativeTime(date)).toBe(zh)
  })

  it('无效时间不格式化，一周以前沿用原绝对日期输出', async () => {
    const { v } = await open('message/index.vue')
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-25T08:00:00Z'))
    const label = vi.fn()
    expect(v.formatRelativeTime('invalid', label)).toBe('')
    expect(v.formatRelativeTime(null, label)).toBe('')
    const date = new Date('2026-10-18T08:00:00Z')
    const original = v.formatRelativeTime(date)
    i18n.setLocale('en')
    expect(v.formatRelativeTime(date, label)).toBe(original)
    expect(label).not.toHaveBeenCalled()
  })

  it('消息分类和标签刷新时保留筛选值、计数和正文，不读取或标记已读', async () => {
    const { v, api } = await open('message/index.vue')
    v.messageList.value = [{ messageId: 19, title: '原消息标题', content: '原消息正文', type: 1, isRead: false }]
    v.currentType.value = 1
    const facts = JSON.stringify(v.messageList.value)
    expect(v.messageTabs.value[2]).toMatchObject({ value: 1, label: '订单', count: 2 })
    i18n.setLocale('en')
    expect(v.messageTabs.value[2]).toMatchObject({ value: 1, label: 'Orders', count: 2 })
    expect(v.getTypeMeta(1)).toEqual({ label: 'Order notification', icon: 'order', tone: 'order' })
    expect(v.currentType.value).toBe(1)
    expect(JSON.stringify(v.messageList.value)).toBe(facts)
    expect(api.getMessageList).not.toHaveBeenCalled()
    expect(api.markAsRead).not.toHaveBeenCalled()
    expect(api.markAllAsRead).not.toHaveBeenCalled()
  })

  it('已打开消息只按原流程标记一次已读，语言变化只更新关联入口', async () => {
    const cached = { messageId: 19, title: '订单提醒', content: '原文', type: 1, isRead: false,
      relatedId: 77, relatedKind: 'order' }
    const { v, api, store, navigator } = await open('message/detail.vue', { store: { messageList: [cached] } })
    v.messageId.value = '19'
    await v.loadDetail()
    expect(api.markAsRead).toHaveBeenCalledTimes(1)
    expect(api.markAsRead).toHaveBeenCalledWith({ messageId: 19 })
    i18n.setLocale('en')
    await vue.nextTick()
    expect(v.relatedAction.value).toEqual({ title: 'View order', icon: 'order', kind: 'order' })
    expect(v.detail.value.title).toBe('订单提醒')
    expect(v.detail.value.content).toBe('原文')
    expect(v.detail.value.isRead).toBe(true)
    expect(api.markAsRead).toHaveBeenCalledTimes(1)
    expect(store.reduceUnread).toHaveBeenCalledTimes(1)
    v.openRelatedBusiness()
    expect(navigator.navigateTo).toHaveBeenCalledWith('/order/77')
    expect(api.getMessageList).not.toHaveBeenCalled()
  })

  it('批量已读的在途请求不会因切换重发，成功事实完整处理', async () => {
    let complete
    const { v, api, store } = await open('message/index.vue', {
      api: { markAllAsRead: vi.fn(() => new Promise(resolve => { complete = resolve })) },
    })
    v.unreadCount.value = 3
    v.messageList.value = [{ messageId: 19, content: '中文正文', isRead: false }]
    const pending = v.handleMarkAllRead()
    i18n.setLocale('en')
    expect(api.markAllAsRead).toHaveBeenCalledTimes(1)
    complete()
    await pending
    expect(v.unreadCount.value).toBe(0)
    expect(v.messageList.value[0]).toMatchObject({ content: '中文正文', isRead: true })
    expect(store.markAllRead).toHaveBeenCalledTimes(1)
    expect(uni.showToast).toHaveBeenLastCalledWith({ title: 'All messages marked as read', icon: 'success' })
  })

  it('消息本地错误重新取词，但服务器原始错误保持不变', async () => {
    const { v, api } = await open('message/detail.vue')
    await v.loadDetail()
    expect(v.errorText.value).toBe('消息参数无效')
    i18n.setLocale('en')
    expect(v.errorText.value).toBe('Invalid message reference')
    v.messageId.value = '19'
    const raw = Object.assign(new Error('后端原始提示'), { errorCode: 'UNCHANGED', traceId: 'trace1' })
    api.getMessageList.mockRejectedValueOnce(raw)
    await v.loadDetail()
    i18n.setLocale('zh')
    expect(v.loadFailure.value).toBe(raw)
    expect(v.errorText.value).toBe('后端原始提示')
    expect(raw.errorCode).toBe('UNCHANGED')
    expect(raw.traceId).toBe('trace1')
  })

  it('手册附件 URL、编号和中文正文不受语言影响，也不重新读详情', async () => {
    const { v, api, navigator } = await open('manual/preview.vue')
    v.manualId.value = '88'
    api.getManualDetail.mockResolvedValue({ id: 88, title: '中文手册', content: '<p>原正文</p>',
      fileUrl: 'https://example.invalid/original.pdf' })
    await v.loadDetail()
    await vue.nextTick()
    i18n.setLocale('en')
    await vue.nextTick()
    expect(v.detail.value).toMatchObject({ id: 88, title: '中文手册', content: '<p>原正文</p>',
      fileUrl: 'https://example.invalid/original.pdf' })
    expect(api.getManualDetail).toHaveBeenCalledTimes(1)
    await v.openFile()
    expect(navigator.navigateTo).toHaveBeenCalledWith('/pdf/88')
  })

  it('PDF 预览缺少编号的错误更新时不创建新 web-view 或读取附件', async () => {
    const { v, api } = await open('manual/pdf-preview.vue')
    await v.loadDetail()
    expect(v.errorText.value).toBe('缺少手册编号')
    i18n.setLocale('en')
    expect(v.errorText.value).toBe('Manual reference is missing')
    expect(v.viewerUrl.value).toBe('')
    expect(api.getManualDetail).not.toHaveBeenCalled()
  })

  it('新闻保持原文和复制目标，本地错误可切换', async () => {
    const { v, api } = await open('news/detail.vue')
    await v.loadDetail()
    i18n.setLocale('en')
    expect(v.errorText.value).toBe('Invalid article reference')
    v.detail.value = { id: 9, title: '中文新闻', content: '<p>原文</p>', articleUrl: 'https://example.invalid/news' }
    const facts = JSON.stringify(v.detail.value)
    v.copySourceUrl()
    expect(uni.setClipboardData.mock.lastCall[0].data).toBe('https://example.invalid/news')
    uni.setClipboardData.mock.lastCall[0].success()
    expect(uni.showToast).toHaveBeenLastCalledWith({ title: 'Link copied', icon: 'none' })
    expect(JSON.stringify(v.detail.value)).toBe(facts)
    expect(api.getNewsDetail).not.toHaveBeenCalled()
  })

  it('帮助分类、指南及关于页链接换语言时保留关键字、ID 与业务路由', async () => {
    const { v, navigator } = await open('help/index.vue')
    const about = await open('about/index.vue')
    v.keyword.value = '用户输入'
    const ids = v.guides.value.map(item => item.id)
    const keys = v.categories.value.map(item => item.key)
    i18n.setLocale('en')
    expect(v.categories.value[0].name).toBe('Orders')
    expect(v.guides.value[0].name).toBe('Getting started')
    expect(v.guides.value.map(item => item.id)).toEqual(ids)
    expect(v.categories.value.map(item => item.key)).toEqual(keys)
    expect(v.keyword.value).toBe('用户输入')
    expect(about.v.links.value[0]).toEqual({ key: 'user_agreement', name: 'User agreement' })
    v.openGuide(v.guides.value[0])
    expect(navigator.navigateTo).toHaveBeenCalledWith('/manual/1')
  })
})
