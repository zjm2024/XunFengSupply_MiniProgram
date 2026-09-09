/**
 * @file 路由常量、元数据与工厂 - 全局唯一路由来源（SSOT）
 * @description
 * 合并原 routeMeta.js 到此文件，统一维护：
 *   - 路径常量（与 pages.json 严格一致）
 *   - ROUTE_META 元数据（requireAuth / requireSign / allowFrozen / owner）
 *   - 派生集合 PUBLIC_ROUTES / FROZEN_ALLOWED_ROUTES（从 ROUTE_META 推导，不独立维护）
 *   - 路由工厂（routes 对象）
 *   - URL 标准化与注册判定（normalizeRoutePath / isRegisteredRoute）
 *   - 登录 redirect 安全校验（sanitizeRedirect）
 *   - query 构造和编码（buildQuery）
 *
 * 不得：
 *   - import Pinia Store
 *   - 调用任何 uni API
 *   - 做登录、签约、冻结和权限判断（由 routeGuard.js / navigator.js 负责）
 *   - 再维护第二套 routeMeta 文件
 */

// ==================== 主包页面 ====================

/** 冷启动页 */
export const STARTUP = '/pages/startup/index'

/** 首页 */
export const HOME = '/pages/home/index'

// ==================== auth：认证分包 ====================

export const LOGIN = '/subPackages/auth/pages/login/index'
export const APPLY_SIGN = '/subPackages/auth/pages/apply-sign/index'
export const AGREEMENT = '/subPackages/auth/pages/agreement/index'
export const ACCOUNT_STATUS = '/subPackages/auth/pages/account-status/index'

// ==================== commerce：商品/交易分包 ====================

export const PRODUCT_LIST = '/subPackages/commerce/pages/product/list'
export const PRODUCT_DETAIL = '/subPackages/commerce/pages/product/detail'
export const PRODUCT_VARIANTS = '/subPackages/commerce/pages/product/variants'
export const CART = '/subPackages/commerce/pages/cart/index'
export const CHECKOUT = '/subPackages/commerce/pages/checkout/index'

// ==================== order：订单分包 ====================

export const ORDER_LIST = '/subPackages/order/pages/list/index'
export const ORDER_DETAIL = '/subPackages/order/pages/detail/index'
export const PAY_PAGE = '/subPackages/order/pages/pay/index'
export const APPLY_AFTER_SALE = '/subPackages/order/pages/after-sale/apply'
export const AFTER_SALE_LIST = '/subPackages/order/pages/after-sale/list'

// ==================== account：账户分包 ====================

export const ACCOUNT_CENTER = '/subPackages/account/pages/center/index'
export const ACCOUNT_PROFILE = '/subPackages/account/pages/profile/index'
export const ADDRESS = '/subPackages/account/pages/address/index'
export const SUB_ACCOUNT = '/subPackages/account/pages/sub-account/index'
export const SECURITY = '/subPackages/account/pages/security/index'
export const RECHARGE = '/subPackages/account/pages/recharge/index'
export const FUND_FLOW = '/subPackages/account/pages/fund-flow/index'
export const BILL_LIST = '/subPackages/account/pages/bill/list'
export const BILL_DETAIL = '/subPackages/account/pages/bill/detail'
export const INVOICE = '/subPackages/account/pages/invoice/index'
export const VOUCHER = '/subPackages/account/pages/voucher/index'
export const LANGUAGE = '/subPackages/account/pages/language/index'
export const SETTINGS = '/subPackages/account/pages/settings/index'

// ==================== content：资讯分包 ====================

export const NEWS = '/subPackages/content/pages/news/index'
export const NEWS_DETAIL = '/subPackages/content/pages/news/detail'
export const MANUAL = '/subPackages/content/pages/manual/index'
export const MANUAL_PREVIEW = '/subPackages/content/pages/manual/preview'
export const MESSAGE = '/subPackages/content/pages/message/index'
export const HELP = '/subPackages/content/pages/help/index'
export const ABOUT = '/subPackages/content/pages/about/index'

// ==================== 已注册完整列表 ====================

export const REGISTERED_ROUTES = Object.freeze([
  STARTUP, HOME,
  LOGIN, APPLY_SIGN, AGREEMENT, ACCOUNT_STATUS,
  PRODUCT_LIST, PRODUCT_DETAIL, PRODUCT_VARIANTS, CART, CHECKOUT,
  ORDER_LIST, ORDER_DETAIL, PAY_PAGE, APPLY_AFTER_SALE, AFTER_SALE_LIST,
  ACCOUNT_CENTER, ACCOUNT_PROFILE, ADDRESS, SUB_ACCOUNT, SECURITY,
  RECHARGE, FUND_FLOW, BILL_LIST, BILL_DETAIL, INVOICE, VOUCHER, LANGUAGE, SETTINGS,
  NEWS, NEWS_DETAIL, MANUAL, MANUAL_PREVIEW, MESSAGE, HELP, ABOUT,
])

// ==================== 内部集合（用于高效查询）====================

const REGISTERED_ROUTES_SET = new Set(REGISTERED_ROUTES)

// ==================== 路由元数据 ====================

/**
 * 全部 35 个注册页面的元数据。
 * key 必须与上方导出常量严格一致。
 *
 * @type {Record<string, { title: string, requireAuth: boolean, requireSign: boolean, allowFrozen: boolean, owner: string|null }>}
 */
export const ROUTE_META = Object.freeze({
  // ===== 主包 =====
  [STARTUP]: {
    title: '启动',
    requireAuth: false,
    requireSign: false,
    allowFrozen: true,
    owner: null,
  },
  [HOME]: {
    title: '薰风经销商',
    requireAuth: true,
    requireSign: false,
    allowFrozen: false,
    owner: null,
  },

  // ===== auth 分包 =====
  [LOGIN]: {
    title: '登录',
    requireAuth: false,
    requireSign: false,
    allowFrozen: true,
    owner: null,
  },
  [APPLY_SIGN]: {
    title: '申请成为经销商',
    requireAuth: false,
    requireSign: false,
    allowFrozen: true,
    owner: null,
  },
  [AGREEMENT]: {
    title: '用户协议',
    requireAuth: false,
    requireSign: false,
    allowFrozen: true,
    owner: null,
  },
  [ACCOUNT_STATUS]: {
    title: '账户状态',
    requireAuth: false,
    requireSign: false,
    allowFrozen: true,
    owner: null,
  },

  // ===== commerce 分包 =====
  [PRODUCT_LIST]: {
    title: '商品列表',
    requireAuth: true,
    requireSign: false,
    allowFrozen: false,
    owner: null,
  },
  [PRODUCT_DETAIL]: {
    title: '商品详情',
    requireAuth: true,
    requireSign: false,
    allowFrozen: false,
    owner: null,
  },
  [PRODUCT_VARIANTS]: {
    title: '批量采购',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },
  [CART]: {
    title: '购物车',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },
  [CHECKOUT]: {
    title: '确认订单',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },

  // ===== order 分包 =====
  [ORDER_LIST]: {
    title: '我的订单',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },
  [ORDER_DETAIL]: {
    title: '订单详情',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },
  [PAY_PAGE]: {
    title: '收银台',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },
  [APPLY_AFTER_SALE]: {
    title: '申请售后',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },
  [AFTER_SALE_LIST]: {
    title: '售后记录',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },

  // ===== account 分包 =====
  [ACCOUNT_CENTER]: {
    title: '经销商中心',
    requireAuth: true,
    requireSign: false,
    allowFrozen: false,
    owner: null,
  },
  [ACCOUNT_PROFILE]: {
    title: '账户信息',
    requireAuth: true,
    requireSign: false,
    allowFrozen: false,
    owner: null,
  },
  [ADDRESS]: {
    title: '地址管理',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },
  [SUB_ACCOUNT]: {
    title: '子账号管理',
    requireAuth: true,
    requireSign: false,
    allowFrozen: false,
    owner: 'main',
  },
  [SECURITY]: {
    title: '安全设置',
    requireAuth: true,
    requireSign: false,
    allowFrozen: false,
    owner: null,
  },
  [RECHARGE]: {
    title: '充值',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },
  [FUND_FLOW]: {
    title: '资金流水',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },
  [BILL_LIST]: {
    title: '账单列表',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },
  [BILL_DETAIL]: {
    title: '账单详情',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },
  [INVOICE]: {
    title: '发票管理',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },
  [VOUCHER]: {
    title: '代金券',
    requireAuth: true,
    requireSign: true,
    allowFrozen: false,
    owner: null,
  },
  [LANGUAGE]: {
    title: '语言设置',
    requireAuth: false,
    requireSign: false,
    allowFrozen: true,
    owner: null,
  },
  [SETTINGS]: {
    title: '设置',
    requireAuth: true,
    requireSign: false,
    allowFrozen: false,
    owner: null,
  },

  // ===== content 分包 =====
  [NEWS]: {
    title: '新闻资讯',
    requireAuth: true,
    requireSign: false,
    allowFrozen: false,
    owner: null,
  },
  [NEWS_DETAIL]: {
    title: '新闻详情',
    requireAuth: true,
    requireSign: false,
    allowFrozen: false,
    owner: null,
  },
  [MANUAL]: {
    title: '产品手册',
    requireAuth: true,
    requireSign: false,
    allowFrozen: false,
    owner: null,
  },
  [MANUAL_PREVIEW]: {
    title: '手册预览',
    requireAuth: true,
    requireSign: false,
    allowFrozen: false,
    owner: null,
  },
  [MESSAGE]: {
    title: '消息中心',
    requireAuth: true,
    requireSign: false,
    allowFrozen: false,
    owner: null,
  },
  [HELP]: {
    title: '帮助中心',
    requireAuth: true,
    requireSign: false,
    allowFrozen: true,
    owner: null,
  },
  [ABOUT]: {
    title: '关于我们',
    requireAuth: true,
    requireSign: false,
    allowFrozen: true,
    owner: null,
  },
})

// ==================== 派生集合（从 ROUTE_META 推导，避免独立维护两份列表）====================

/**
 * 可免登录访问的页面路径集合。
 * 由 ROUTE_META.requireAuth === false 自动推导。
 */
export const PUBLIC_ROUTES = Object.freeze(
  new Set(
    Object.keys(ROUTE_META).filter(path => ROUTE_META[path].requireAuth === false),
  ),
)

/**
 * 冻结账号仍可访问的页面路径集合。
 * 由 ROUTE_META.allowFrozen === true 自动推导。
 */
export const FROZEN_ALLOWED_ROUTES = Object.freeze(
  new Set(
    Object.keys(ROUTE_META).filter(path => ROUTE_META[path].allowFrozen === true),
  ),
)

/**
 * 根据标准化 path 读取精确 routeMeta。
 * 如果 path 未在 ROUTE_META 中注册，返回 null（由调用方判定）。
 */
export function getRouteMeta(path) {
  return ROUTE_META[path] || null
}

// ==================== 默认导航目标 ====================

export const DEFAULT_LOGIN_REDIRECT = HOME
export const DEFAULT_LOGOUT_REDIRECT = LOGIN

// ==================== 查询字符串构造 ====================

/**
 * 把普通对象编码成 query 字符串（不含前缀 '?'）。
 *
 * 规则：
 *   - 参数本身必须是 plain object，否则在开发与测试环境抛 TypeError
 *   - 顶层 array / string / number / boolean 参数抛 TypeError
 *   - value 为 undefined / null 的项被忽略
 *   - value 为 primitive 类型（string/number/boolean）时编码其字符串形式
 *   - value 为 plain object 时抛 TypeError（避免 [object Object]）
 *   - key 与 value 都经 encodeURIComponent 编码
 *
 * @param {Record<string, any>} params
 * @returns {string}
 */
export function buildQuery(params) {
  // 接受 undefined / null 时不输出
  if (params === undefined || params === null) return ''

  // 必须在开发/测试环境拒绝 primitive / array / function
  if (typeof params !== 'object' || Array.isArray(params) || params === null) {
    throw new TypeError(
      `[routes.buildQuery] 参数必须是 plain object，收到 ${typeof params}`,
    )
  }

  const parts = []
  for (const key of Object.keys(params)) {
    const value = params[key]
    if (value === undefined || value === null) continue
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        // 数组可以展开为重复 key
        for (const item of value) {
          if (item === undefined || item === null) continue
          if (typeof item === 'object') {
            throw new TypeError(
              `[routes.buildQuery] 数组元素不能是对象 (key=${key})`,
            )
          }
          parts.push(
            `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`,
          )
        }
        continue
      }
      throw new TypeError(
        `[routes.buildQuery] 对象 value 不允许，会生成 [object Object] (key=${key})`,
      )
    }
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
  }
  return parts.join('&')
}

// ==================== 有效 ID 校验 ====================

/**
 * 有效 ID 是非空字符串或大于 0 的有限数字。
 * 字符串 ID 必须 trim。
 */
function normalizeId(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return null
}

function assertValidId(value, factoryName) {
  const normalized = normalizeId(value)
  if (normalized === null) {
    throw new Error(
      `[routes.${factoryName}] 缺少有效 ID（需要非空字符串或大于 0 的数字，收到 ${JSON.stringify(value)}）`,
    )
  }
  return normalized
}

// ==================== 语义化路由工厂 ====================

/**
 * 返回 `${base}?${query}` 或 `${base}`。
 * 保证同一个 base 不会出现两个 '?'。
 */
function withQuery(base, params) {
  const qs = buildQuery(params)
  if (!qs) return base
  return `${base}?${qs}`
}

export const routes = {
  startup: () => STARTUP,
  home: () => HOME,

  auth: {
    login: ({ redirect } = {}) =>
      withQuery(LOGIN, redirect ? { redirect } : null),
    applySign: () => APPLY_SIGN,
    agreement: ({ type = 'user' } = {}) =>
      withQuery(AGREEMENT, { type }),
    accountStatus: ({ reason } = {}) =>
      withQuery(ACCOUNT_STATUS, reason ? { reason } : null),
  },

  commerce: {
    productList: ({ categoryId, keyword, mode } = {}) =>
      withQuery(PRODUCT_LIST, { categoryId, keyword, mode }),
    productDetail: (productId) => {
      const id = assertValidId(productId, 'productDetail')
      return withQuery(PRODUCT_DETAIL, { productId: id })
    },
    productVariants: (productId) => {
      const id = assertValidId(productId, 'productVariants')
      return withQuery(PRODUCT_VARIANTS, { productId: id })
    },
    cart: () => CART,
    checkout: ({ source = 'cart' } = {}) =>
      withQuery(CHECKOUT, { source }),
  },

  order: {
    list: ({ status, selectMode } = {}) =>
      withQuery(ORDER_LIST, { status, selectMode }),
    detail: (orderId) => {
      const id = assertValidId(orderId, 'order.detail')
      return withQuery(ORDER_DETAIL, { orderId: id })
    },
    pay: (orderId, { paymentMode } = {}) => {
      const id = assertValidId(orderId, 'order.pay')
      return withQuery(PAY_PAGE, { orderId: id, ...(paymentMode ? { paymentMode } : null) })
    },
    afterSaleApply: (orderId) => {
      const id = assertValidId(orderId, 'order.afterSaleApply')
      return withQuery(APPLY_AFTER_SALE, { orderId: id })
    },
    afterSaleList: () => AFTER_SALE_LIST,
  },

  account: {
    center: () => ACCOUNT_CENTER,
    profile: () => ACCOUNT_PROFILE,
    address: ({ selectMode } = {}) =>
      withQuery(ADDRESS, selectMode ? { selectMode } : null),
    subAccount: () => SUB_ACCOUNT,
    security: () => SECURITY,
    recharge: () => RECHARGE,
    fundFlow: () => FUND_FLOW,
    billList: ({ year, month } = {}) =>
      withQuery(BILL_LIST, { year, month }),
    billDetail: (billId) => {
      const id = assertValidId(billId, 'account.billDetail')
      return withQuery(BILL_DETAIL, { billId: id })
    },
    /**
     * 账单还款专用路由。
     * 使用 settlement 子包的支付页面，而非 order.pay（那是订单支付路由）。
     */
    billPay: (billId) => {
      const id = assertValidId(billId, 'account.billPay')
      // TODO: 待 settlement 支付页就绪后替换为实际路由
      return withQuery(PAY_PAGE, { billId: id, source: 'bill' })
    },
    invoice: () => INVOICE,
    voucher: () => VOUCHER,
    language: () => LANGUAGE,
    settings: () => SETTINGS,
  },

  content: {
    news: () => NEWS,
    newsDetail: (id) => {
      const validId = assertValidId(id, 'content.newsDetail')
      return withQuery(NEWS_DETAIL, { id: validId })
    },
    manual: () => MANUAL,
    /**
     * 手册预览。
     * @param {string} manualId 手册 ID（注意：来自新闻流的 item.id 实际为 newsId，调用方必须自行确认是手册类型后传入真实 manualId）
     * @param {{ needConfirm?: boolean }} [options]
     */
    manualPreview: (manualId, { needConfirm = false } = {}) => {
      const id = assertValidId(manualId, 'content.manualPreview')
      return withQuery(MANUAL_PREVIEW, { manualId: id, needConfirm })
    },
    messages: () => MESSAGE,
    help: () => HELP,
    about: () => ABOUT,
  },
}

// ==================== URL 标准化与注册判定 ====================

/**
 * 去掉 query、hash，保留开头 '/'。
 * 对空值返回空字符串。
 */
export function normalizeRoutePath(url) {
  if (!url || typeof url !== 'string') return ''
  // 去掉 hash
  let cleaned = url.split('#')[0]
  // 去掉 query
  cleaned = cleaned.split('?')[0]
  // 确保以 / 开头
  if (!cleaned.startsWith('/')) cleaned = `/${cleaned}`
  return cleaned
}

/**
 * 是否为 pages.json 注册的内部路由。
 * @param {string} url
 */
export function isRegisteredRoute(url) {
  const normalized = normalizeRoutePath(url)
  if (!normalized) return false
  return REGISTERED_ROUTES_SET.has(normalized)
}

/**
 * 校验登录 redirect 目标是否安全。
 *
 * 拒绝：
 *   - http:// / https:// / // 外链
 *   - javascript: / data: 协议
 *   - 路径穿越（包含 ..）
 *   - 未在 REGISTERED_ROUTES 注册的内部地址
 *   - startup、login 自循环目标
 *
 * 不合法时返回 fallbackUrl（默认首页）。
 */
export function sanitizeRedirect(url, fallbackUrl) {
  const fallback = typeof fallbackUrl === 'string' ? fallbackUrl : HOME

  if (!url || typeof url !== 'string') return fallback
  const trimmed = url.trim()
  if (!trimmed) return fallback

  // 拒绝绝对协议 / 伪协议
  if (/^(https?:)?\/\//i.test(trimmed)) return fallback
  if (/^javascript:/i.test(trimmed)) return fallback
  if (/^data:/i.test(trimmed)) return fallback

  // 路径标准化后判定
  const normalized = normalizeRoutePath(trimmed)

  // 不允许路径穿越
  if (normalized.includes('..')) return fallback

  // 拒绝未注册路由
  if (!REGISTERED_ROUTES_SET.has(normalized)) return fallback

  // 自循环目标拒绝
  if (normalized === normalizeRoutePath(STARTUP)) return fallback
  if (normalized === normalizeRoutePath(LOGIN)) return fallback

  return trimmed
}
