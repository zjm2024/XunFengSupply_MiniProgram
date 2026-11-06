import { createSharePayment } from './createSharePayment.js'
import { createShareCheckout } from './createShareCheckout.js'
import { prepareShareOrder, createShareOrder, getCurrentShareOrder, cancelCurrentShareOrder } from '../api/shareOrderApi.js'
import { getShareCheckoutAreas, getShareCheckoutCarriers, previewShareCheckout } from '../api/shareCheckoutApi.js'
import { exchangeShareAccess, resolveShareAccess } from '../api/shareAccessApi.js'
import { getShareCatalogCategories, getShareCatalogList, getShareCatalogDetail, quoteShareCatalogSelection } from '../api/shareCatalogApi.js'
import { createShareLocalCart } from '../model/shareLocalCart.js'
const CODE = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/
const DRAFT = /^[a-f0-9]{32}$/
/** 单页访客编排；所有凭据只在实例闭包，状态不包含原码/CSRF、经销商身份或收件信息。 */
export function createShareRetail({ landing, enabled, queryOnly = false, checkoutEnabled = true, onChange, api = { exchangeShareAccess, resolveShareAccess, getShareCatalogCategories, getShareCatalogList, getShareCatalogDetail, quoteShareCatalogSelection, getShareCheckoutAreas, getShareCheckoutCarriers, previewShareCheckout, prepareShareOrder, createShareOrder, getCurrentShareOrder, cancelCurrentShareOrder }, cartFactory = createShareLocalCart, schedule = setTimeout, cancel = clearTimeout }) {
  let access = null, original = null, locator = null, cart = null, unsubscribe = null, timer = null
  let draftIdentity = null, opening = null
  let generation = 0, active = true, expired = false, entryKey = '', disposed = false
  const state = { phase: 'loading', view: 'entry', busy: false, error: '', categories: [], products: [], total: 0, page: 1,
    query: { keyword: '', categoryId: null }, detail: null, cart: null, quotes: [], order: null, isOwner: false }
  const paymentModel = createSharePayment({getAccess:()=>active&&!expired?access:null,schedule,cancel,onPaid:()=>resume(),onChange:value=>{state.payment=value;emit()}})
  const checkoutModel = createShareCheckout({ getAccess: () => active && !expired ? access : null, getDraft: () => cart?.getSnapshot(),
    api, schedule, cancel, onCreated: async () => { if (await resume() && state.order) await paymentModel.start() }, onSessionError: fail, onChange: value => { state.checkout = value; emit() } })
  /** 输出脱离引用的安全快照，凭据从不进入Vue状态/调试面板。 */
  function emit() { onChange(JSON.parse(JSON.stringify(state))) }
  /** 隐藏时清空全部价格和私密会话内存，保留合法本地购物意向。 */
  function clearVisible() { state.order = null; checkoutModel.reset(); state.products = []; state.categories = []; state.detail = null; state.quotes = []; state.busy = false }
  /** 页面离开时取消计时与购物草稿监听。 */
  function releaseCart(invalid = false) {
    if (!queryOnly && invalid && !cart && draftIdentity) cart = cartFactory(draftIdentity)
    if (invalid) cart?.invalidate('closed')
    unsubscribe?.(); unsubscribe = null; cart?.dispose(); cart = null
    if (timer !== null) cancel(timer); timer = null
  }
  /** 异步结果必须仍属于同一可见页面。 */
  function current(version) { return active && !disposed && version === generation }
  /** 终态才删除草稿；网络错误/会话失效不等同于链接终止。 */
  function fail(error) {
    clearVisible()
    const status = error?.httpStatus
    if ([401, 403, 410].includes(status)) {
      releaseCart(status === 410); access = null; state.cart = null
      state.phase = 'unavailable'; state.view = 'entry'; state.error = status === 410 ? 'closed' : 'session'
    } else { state.error = status === 429 ? 'limited' : 'retry'; state.phase = 'unavailable'; state.view = 'entry' }
    emit()
  }
  /** 不自动重试写入/换访问键；调用者通过明确按钮重试原始交换。 */
  function open(query) {
    if (opening) return opening
    const pending = openCore(query).finally(() => { if (opening === pending) opening = null })
    opening = pending
    return pending
  }
  /** 建立或恢复当前访客，同一文档并发恢复共用一个请求，隐藏后允许新一轮。 */
  async function openCore(query) {
    if (disposed || !enabled) { state.phase = 'unavailable'; state.view = 'entry'; state.error = 'surface'; emit(); return false }
    const version = ++generation; active = true; state.busy = true; state.error = ''; clearVisible(); state.busy = true; state.phase = 'loading'; state.view = 'entry'; emit()
    if (!locator && !original) {
      if (/^[1-9]\d{0,18}$/.test(String(query?.categoryId || ''))) state.query = { keyword: '', categoryId: String(query.categoryId) }
      if (typeof query?.entry === 'string' && DRAFT.test(query.entry)) { entryKey = query.entry; original = landing?.take(entryKey) }
      else if (CODE.test(query?.contextId || '') && DRAFT.test(query?.draftId || '')) locator = { contextId: query.contextId, draftId: query.draftId }
    }
    try {
      let result = null
      let restoredDraftId = null
      if (original) {
        // 重开原链接始终让服务端检查期限，缓存只用于找回同一购物草稿。
        const remembered = await landing?.restore?.(original.token)
        if (!current(version)) return false
        if (remembered && remembered.draftId !== original.draftId) {
          try {
            result = await api.exchangeShareAccess({ ...original, clientRequestId: remembered.draftId })
            restoredDraftId = remembered.draftId
          } catch (error) {
            if (error?.errorCode !== 'SHARE_ACCESS_CONFLICT') throw error
          }
        }
        if (!result) result = await api.exchangeShareAccess(original)
      } else if (locator) result = await api.resolveShareAccess(locator)
      if (!current(version)) return false
      if (!result) throw Object.assign(new Error('Invalid sharing entry'), { httpStatus: 401 })
      if (original) {
        locator = { contextId: result.contextId, draftId: restoredDraftId || original.draftId }
        if (!landing?.accepted(entryKey, locator.contextId, locator.draftId)) throw Object.assign(new Error('Entry replaced'), { httpStatus: 401 })
        // 原下单者由服务端找回，其余访客保留兑换键以复用浏览器会话。
        if (!result.state.isOwner) await landing?.remember?.(original.token, locator, result.state.expiresAtUtc)
        if (!current(version)) return false
        original = null
      }
      access = { contextId: result.contextId, csrfToken: result.csrfToken }
      draftIdentity = { shareId: result.state.publicShareId, draftId: locator.draftId, expiresAtUtc: result.state.expiresAtUtc, serverNowUtc: result.state.serverNowUtc }
      releaseCart(result.state.mode === 2)
      state.isOwner = result.state.isOwner
      if (result.state.mode === 2) {
        const detail = api.getCurrentShareOrder ? await api.getCurrentShareOrder(access) : null
        if (!current(version)) return false
        state.phase = 'bound'; state.view = detail ? 'order' : 'entry'; state.cart = null; state.order = detail; state.busy = false
        armExpiry(Math.max(0, Date.parse(result.state.sessionExpiresAtUtc) - Date.parse(result.state.serverNowUtc)), version)
        emit(); await paymentModel.resume(); return true
      }
      state.phase = 'catalog'
      if (!queryOnly) {
        cart = cartFactory(draftIdentity)
        state.cart = cart.getSnapshot()
        unsubscribe = cart.subscribe(value => { const changed = state.cart?.localCartRevision !== value.localCartRevision; state.cart = value; if (changed) checkoutModel.changed(); emit() })
      }
      const delay = Math.max(0, Date.parse(result.state.sessionExpiresAtUtc) - Date.parse(result.state.serverNowUtc))
      armExpiry(delay, version)
      state.busy = false
      return await catalog(state.query)
    } catch (error) { if (current(version)) fail(error); return false }
  }
  /** 超过浏览器32位计时上限时分段等待，不将长期链接误判为立即到期。 */
  function armExpiry(remaining, version) {
    const chunk = Math.min(remaining, 2147483647)
    timer = schedule(() => {
      if (!current(version)) return
      if (remaining > chunk) { armExpiry(remaining - chunk, version); return }
      expired = true; hide(); state.phase = 'unavailable'; state.view = 'entry'; state.error = 'session'; emit()
    }, chunk)
  }
  /** 每次进入或语言切换重新读取当前分类与报价，不信任本地价格。 */
  async function catalog(query = state.query, append = false) {
    if (state.phase !== 'catalog' || !access || state.busy || expired || !active) return false
    if (state.view === 'checkout') checkoutModel.reset()
    const version = generation; state.busy = true; state.error = ''; emit()
    const next = append ? state.page + 1 : 1, filter = append ? state.query : { keyword: query.keyword || '', categoryId: query.categoryId || null, ...(query.hasImage === true ? {hasImage:true} : {}) }
    try {
      const [categories, page] = await Promise.all([append ? Promise.resolve(state.categories) : api.getShareCatalogCategories(access),
        api.getShareCatalogList({ ...access, ...filter, pageNum: next })])
      if (!current(version)) return false
      state.categories = categories; state.products = append ? [...state.products, ...page.items] : page.items
      state.page = next; state.total = page.totalCount; state.query = filter; state.view = 'catalog'; state.busy = false; emit(); return true
    } catch (error) { if (current(version)) fail(error); return false }
  }
  /** 只进入独立SKU详情，不导航普通采购页；规格保持显式分页。 */
  async function detail(productId, append = false) {
    if (state.phase !== 'catalog' || !access || state.busy || !active) return false
    const version = generation; state.busy = true; state.error = ''; if (!append) { state.detail = null; state.view = 'detail' } emit()
    try {
      const next = append && state.detail ? state.detail.skus.pageNum + 1 : 1
      const result = await api.getShareCatalogDetail({ ...access, productId, pageNum: next })
      if (!current(version)) return false
      if (append) result.skus.items = [...state.detail.skus.items, ...result.skus.items]
      state.detail = result; state.view = 'detail'; state.busy = false; emit(); return true
    } catch (error) { if (current(version)) fail(error); return false }
  }
  /** 本地只改SKU/数量/勾选，页面展示价格不传入存储。 */
  function add(skuId, quantity = 1) {
    if (queryOnly || !cart || state.busy || !active || !access) return false
    const sku = state.detail?.skus.items.find(value => value.skuId === skuId)
    if (!sku || sku.stockState === 'OUT_OF_STOCK') return false
    const previous = cart.getSnapshot().items.find(item => item.skuId === skuId)?.quantity || 0
    try { cart.setItem({ skuId, quantity: previous + quantity, selected: true }); return true } catch { state.error = 'quantity'; emit(); return false }
  }
  /** 刷新购物意向时向专用只读接口重报价，不写服务器购物车。 */
  async function basket() {
    if (queryOnly || !cart || !access || state.busy || !active) return false
    checkoutModel.reset()
    const version = generation; state.busy = true; state.error = ''; state.view = 'cart'; state.quotes = []; emit()
    try {
      state.cart = cart.refresh()
      const ids = state.cart.items.map(item => item.skuId)
      const quotes = ids.length ? await api.quoteShareCatalogSelection({ ...access, skuIds: ids }) : []
      if (!current(version)) return false
      state.quotes = quotes; state.busy = false; emit(); return true
    } catch (error) { if (current(version)) fail(error); return false }
  }
  /** 独立结算只读本地勾选意向，不导航普通采购或先保存地址。 */
  async function checkout() {
    if (queryOnly || !checkoutEnabled || !cart || !access || state.busy || !active || expired) return false
    state.cart = cart.refresh(); state.view = 'checkout'; emit()
    return checkoutModel.open()
  }
  /** 表单字段变化仅撤销旧预览，不缓存或自动上传收件信息。 */
  function checkoutChanged() { if (!queryOnly && checkoutEnabled) checkoutModel.changed() }
  /** 独立级联地区请求不携带登录身份或收件人。 */
  function checkoutAreas(parent, level) { return queryOnly || !checkoutEnabled ? Promise.resolve([]) : checkoutModel.areas(parent, level) }
  /** 当前所选Items在内部即时提取，页面不提供金额/主体。 */
  function checkoutPreview(input) { return queryOnly || !checkoutEnabled ? Promise.resolve(false) : checkoutModel.preview(input) }
  /** 草稿变更不构成库存或金额承诺；下一阶段正式预览仍必须重核。 */
  function edit(skuId, quantity, selected) {
    if (queryOnly || !cart || !access || state.busy || !active) return false
    try { cart.setItem({ skuId, quantity, selected }); return true } catch { state.error = 'quantity'; emit(); return false }
  }
  /** 只删除当前草稿的一条意向。 */
  function remove(skuId) { if (!queryOnly && cart && access && active && !state.busy) cart.removeItem(skuId) }
  /** 返回目录是同一个公开页内视图切换，不读经销商会话。 */
  function back() { if (state.view === 'checkout') { if (state.checkout?.locked || state.checkout?.busy) return false; return basket() } return catalog(state.query) }
  /** 页面隐藏/后台缓存恢复必须清凭据并阻止迟到数据复活。 */
  function hide() { paymentModel.reset(); opening = null; active = false; generation++; original = null; access = null; releaseCart(); clearVisible(); state.cart = null; emit() }
  /** 仅用公开定位和原Cookie恢复，绝不重新凭空生成兑换键。 */
  function resume() { if (disposed || expired) return false; return open(locator) }
  /** 页面销毁释放监听，不删除仍有效的购物意向。 */
  function dispose() { hide(); disposed = true }
  /** 并行分类预览仍使用当前访客凭据，隐藏或换入口后丢弃迟到数据。 */
  async function preview(query) {
    if (!active || !access || expired || disposed) return { items: [] }
    const version = generation
    try { const result = await api.getShareCatalogList({ categoryId: query.categoryId, pageNum: query.pageNum, pageSize: query.pageSize, hasImage: query.hasImage, ...access }); return current(version) ? result : { items: [] } }
    catch (error) { if (current(version)) fail(error); throw error }
  }
  /** 仅输出浏览器URL已有的公开定位，不输出Cookie、CSRF或原码。 */
  function location() { return active && access && locator ? { ...locator } : null }
  emit()
  /** 正式提交入口只复用独立结算编排，不调用采购或支付。 */
  function checkoutSubmit() { return checkoutModel.submit() }
  /** 取消未知时保留当前订单，重试仍作用于原订单，不发送采购取消。 */
  async function cancelOrder() {
    if(!active||!access||!state.isOwner||state.busy)return false
    const version=generation;state.busy=true;state.error='';emit()
    try { await (api.cancelCurrentShareOrder || cancelCurrentShareOrder)(access);if(!current(version))return false;return await resume() }
    catch(error){if(current(version)){state.busy=false;state.error=[401,403].includes(error?.httpStatus)?'session':error?.httpStatus>=400&&error?.httpStatus<500?'cancel':'retry';emit()}return false}
  }
  return { cancelOrder, pay:()=>paymentModel.start(), paymentQuery:()=>paymentModel.query(), checkoutSubmit, preview, location, open, resume, catalog, detail, add, basket, checkout, checkoutChanged, checkoutAreas, checkoutPreview, edit, remove, back, hide, dispose }
}
