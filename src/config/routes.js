/**
 * @file 路由常量定义 - 全局唯一路由来源
 * @description
 * V2 版本无 TabBar，所有页面使用 navigateTo/redirectTo/reLaunch
 * 禁止使用 switchTab（除非未来重新引入 TabBar 并更新此文件）
 *
 * 路由命名规范：
 * - 主包页面：/pages/{module}/{action}
 * - 分包页面：/subPackages/{subName}/{page}
 */

// ==================== 主包页面（V2 有效页面） ====================

/** 冷启动页（首个启动路由） */
export const STARTUP = '/pages/startup/index'

/** 首页 - 双入口（商品下单 / 新闻资讯） */
export const HOME = '/pages/home/index'

/** 经销商中心 */
export const DEALER_CENTER = '/pages/dealer-center/index'

/** 购物车 */
export const CART = '/pages/cart/index'

/** 商品列表 */
export const PRODUCT_LIST = '/pages/product/list'

/** 商品详情 */
export const PRODUCT_DETAIL = '/pages/product/detail'

/** 批量选规格 */
export const PRODUCT_VARIANTS = '/pages/product/variants'

/** 结算页 */
export const CHECKOUT = '/pages/checkout/index'

/** 订单列表 */
export const ORDER = '/pages/order/index'

/** 新闻列表 */
export const NEWS = '/pages/news/index'

/** 新闻详情 */
export const NEWS_DETAIL = '/pages/news/detail'

/** 产品手册 */
export const MANUAL = '/pages/manual/index'
export const MANUAL_PREVIEW = '/pages/manual/preview'

/** 消息中心 */
export const MESSAGE = '/pages/message/index'

/** 账户信息 */
export const ACCOUNT_PROFILE = '/pages/account/profile'

/** 充值 */
export const RECHARGE = '/pages/recharge/index'

/** 月度账单 */
export const BILL = '/pages/bill/index'

/** 资金流水 */
export const FUND_FLOW = '/pages/fund-flow/index'

/** 售后 */
export const AFTER_SALES = '/pages/aftersales/index'

/** 发票 */
export const INVOICE = '/pages/invoice/index'

/** 地址管理 */
export const ADDRESS = '/pages/address/index'

/** 代金券 */
export const VOUCHER = '/pages/voucher/index'

/** 子账号 */
export const SUB_ACCOUNT = '/pages/sub-account/index'

/** 安全设置 */
export const SECURITY = '/pages/security/index'

/** 语言设置 */
export const LANGUAGE = '/pages/language/index'

/** 帮助中心 */
export const HELP = '/pages/help/index'

/** 关于 */
export const ABOUT = '/pages/about/index'

// ==================== 分包页面 ====================

// --- authSub：认证分包 ---
export const LOGIN = '/subPackages/authSub/login'
export const APPLY_SIGN = '/subPackages/authSub/applySign'

// --- goodsSub：商品分包 ---
export const GOODS_DETAIL = '/subPackages/goodsSub/goodsDetail'
export const REPLENISH_LIST = '/subPackages/goodsSub/replenishList'

// --- orderSub：订单分包 ---
export const ORDER_CONFIRM = '/subPackages/orderSub/orderConfirm'
export const ORDER_LIST = '/subPackages/orderSub/orderList'
export const ORDER_DETAIL_SUB = '/subPackages/orderSub/orderDetail'

// --- paySub：支付分包 ---
export const PAY_PAGE = '/subPackages/paySub/payPage'

// --- settlementSub：结算分包 ---
export const BILL_LIST = '/subPackages/settlementSub/billList'
export const BILL_DETAIL = '/subPackages/settlementSub/billDetail'

// --- afterSaleSub：售后分包 ---
export const APPLY_AFTER_SALE = '/subPackages/afterSaleSub/applyAfterSale'
export const AFTER_SALE_LIST = '/subPackages/afterSaleSub/afterSaleList'

// --- systemSub：系统分包 ---
export const MESSAGE_LIST = '/subPackages/systemSub/messageList'
export const AGREEMENT = '/subPackages/systemSub/agreement'

// --- accountSub：账户分包 ---
export const SUB_ACCOUNT_MANAGE = '/subPackages/accountSub/subAccountManage'
export const ACCOUNT_STATUS = '/subPackages/accountSub/accountStatus'

// ==================== 已注册页面完整列表（用于路由审计） ====================

/** 所有在 pages.json 中注册的页面路径 */
export const REGISTERED_ROUTES = [
  // 启动页
  STARTUP,
  // 主包
  HOME, DEALER_CENTER, CART, PRODUCT_LIST, PRODUCT_DETAIL, PRODUCT_VARIANTS,
  CHECKOUT, ORDER, NEWS, NEWS_DETAIL, MANUAL, MANUAL_PREVIEW, MESSAGE,
  ACCOUNT_PROFILE, RECHARGE, BILL, FUND_FLOW, AFTER_SALES, INVOICE,
  ADDRESS, VOUCHER, SUB_ACCOUNT, SECURITY, LANGUAGE, HELP, ABOUT,
  // 分包
  LOGIN, APPLY_SIGN,
  GOODS_DETAIL, REPLENISH_LIST,
  ORDER_CONFIRM, ORDER_LIST, ORDER_DETAIL_SUB,
  PAY_PAGE,
  BILL_LIST, BILL_DETAIL,
  APPLY_AFTER_SALE, AFTER_SALE_LIST,
  MESSAGE_LIST, AGREEMENT,
  SUB_ACCOUNT_MANAGE, ACCOUNT_STATUS,
]

// ==================== 旧版页面（待迁移/删除） ====================

/**
 * 旧版页面迁移清单
 * 这些页面不在 pages.json 中注册，但源码中可能仍有引用
 * 状态说明：
 *   dead     - 无任何引用，可安全删除
 *   migrate  - 有引用，需要迁移到新版页面
 *   pending  - 待确认迁移方案
 */
export const LEGACY_ROUTES = {
  // 旧首页 - 已被 pages/home/index 替代
  '/pages/home/home': {
    status: 'migrate',
    replacement: HOME,
    note: 'login.vue 中有 3 处 switchTab 引用',
  },
  // 旧购物车 - 已被 pages/cart/index 替代
  '/pages/cart/cart': {
    status: 'dead',
    replacement: CART,
    note: '暂未发现活跃引用',
  },
  // 旧分类页 - V2 已移除分类 Tab
  '/pages/classify/classify': {
    status: 'dead',
    replacement: PRODUCT_LIST,
    note: 'V2 双入口架构不需要独立分类页',
  },
  // 旧我的页面 - 已被 dealer-center 替代
  '/pages/mine/mine': {
    status: 'dead',
    replacement: DEALER_CENTER,
    note: 'V2 经销商中心替代',
  },
}

// ==================== 白名单页面（无需登录即可访问） ====================

/** 公开页面（不需要登录态） */
export const PUBLIC_ROUTES = new Set([
  STARTUP,
  LOGIN,
  APPLY_SIGN,
  ACCOUNT_STATUS,
  AGREEMENT,
])

// ==================== 页面元数据（权限、标题、业务约束）====================

/**
 * 页面路由元数据
 * 用于守卫判断和页面配置
 *
 * @typedef {Object} RouteMeta
 * @property {string} title - 页面标题（用于 Header / 分享）
 * @property {boolean} requireAuth - 是否需要登录
 * @property {boolean} requireSign - 是否需要已完成签约
 * @property {string[]} [permissions] - 所需权限点（空数组表示仅登录即可）
 * @property {'main'|'sub'} [owner] - 主账号/子账号可见（默认都可见）
 */

/** @type {Object<string, RouteMeta>} */
export const ROUTE_META = {
  // ===== 认证页（公开）=====
  [LOGIN]:               { title: '登录', requireAuth: false },
  [APPLY_SIGN]:          { title: '申请成为经销商', requireAuth: false },
  [AGREEMENT]:           { title: '用户协议', requireAuth: false },

  // ===== 首页 & 导航（需登录）=====
  [HOME]:                { title: '薰风经销商', requireAuth: true },
  [DEALER_CENTER]:       { title: '经销商中心', requireAuth: true, permissions: [] },
  [NEWS]:                { title: '新闻资讯', requireAuth: true },
  [NEWS_DETAIL]:         { title: '新闻详情', requireAuth: true },
  [MANUAL]:              { title: '产品手册', requireAuth: true },
  [MANUAL_PREVIEW]:      { title: '手册预览', requireAuth: true },
  [HELP]:                { title: '帮助中心', requireAuth: true },
  [ABOUT]:               { title: '关于我们', requireAuth: true },
  [LANGUAGE]:            { title: '语言设置', requireAuth: false }, // 可在登录前切换

  // ===== 商品（需登录+签约）=====
  [PRODUCT_LIST]:        { title: '商品列表', requireAuth: true, requireSign: true },
  [PRODUCT_DETAIL]:      { title: '商品详情', requireAuth: true, requireSign: true },
  [PRODUCT_VARIANTS]:    { title: '选择规格', requireAuth: true, requireSign: true },
  [GOODS_DETAIL]:        { title: '商品详情', requireAuth: true, requireSign: true },
  [REPLENISH_LIST]:      { title: '补货推荐', requireAuth: true, requireSign: true },

  // ===== 购物车 & 结算（需登录+签约）=====
  [CART]:                { title: '购物车', requireAuth: true, requireSign: true },
  [CHECKOUT]:            { title: '确认订单', requireAuth: true, requireSign: true },

  // ===== 订单（需登录+签约）=====
  [ORDER]:               { title: '我的订单', requireAuth: true, requireSign: true },
  [ORDER_CONFIRM]:       { title: '确认订单', requireAuth: true, requireSign: true },
  [ORDER_LIST]:          { title: '订单列表', requireAuth: true, requireSign: true },
  [ORDER_DETAIL_SUB]:    { title: '订单详情', requireAuth: true, requireSign: true },

  // ===== 支付（需登录+签约）=====
  [PAY_PAGE]:            { title: '收银台', requireAuth: true, requireSign: true },

  // ===== 售后（需登录+签约）=====
  [AFTER_SALES]:         { title: '售后管理', requireAuth: true, requireSign: true },
  [APPLY_AFTER_SALE]:    { title: '申请售后', requireAuth: true, requireSign: true },
  [AFTER_SALE_LIST]:     { title: '售后记录', requireAuth: true, requireSign: true },

  // ===== 消息（需登录）=====
  [MESSAGE]:             { title: '消息中心', requireAuth: true },
  [MESSAGE_LIST]:        { title: '消息列表', requireAuth: true },

  // ===== 账户 & 安全（需登录）=====
  [ACCOUNT_PROFILE]:     { title: '账户信息', requireAuth: true },
  [ACCOUNT_STATUS]:      { title: '账户状态', requireAuth: false }, // 冻结时也可访问
  [SECURITY]:            { title: '安全设置', requireAuth: true },
  [SUB_ACCOUNT]:         { title: '子账号管理', requireAuth: true, owner: 'main' },
  [SUB_ACCOUNT_MANAGE]:  { title: '子账号管理', requireAuth: true, owner: 'main' },
  [ADDRESS]:             { title: '地址管理', requireAuth: true, requireSign: true },

  // ===== 资金 & 账单（需登录+签约）=====
  [RECHARGE]:            { title: '充值', requireAuth: true, requireSign: true },
  [BILL]:                { title: '月度账单', requireAuth: true, requireSign: true },
  [BILL_LIST]:           { title: '账单列表', requireAuth: true, requireSign: true },
  [BILL_DETAIL]:         { title: '账单详情', requireAuth: true, requireSign: true },
  [FUND_FLOW]:           { title: '资金流水', requireAuth: true, requireSign: true },
  [INVOICE]:             { title: '发票管理', requireAuth: true, requireSign: true },
  [VOUCHER]:             { title: '代金券', requireAuth: true, requireSign: true },
}

/**
 * 获取页面元数据
 * @param {string} path - 路由路径
 * @returns {RouteMeta} 元数据（未找到返回默认值）
 */
export function getRouteMeta(path) {
  return ROUTE_META[path] || {
    title: '',
    requireAuth: true,
    requireSign: false,
    permissions: [],
  }
}

// ==================== 需要登录但允许特殊状态的页面 ====================

/** 冻结账号可访问的页面 */
export const FROZEN_ALLOWED_ROUTES = new Set([
  ACCOUNT_STATUS,
  HELP,
  ABOUT,
  AGREEMENT,
])

// ==================== 默认导航目标 ====================

/** 登录成功后默认跳转 */
export const DEFAULT_LOGIN_REDIRECT = HOME

/** 登出后默认跳转 */
export const DEFAULT_LOGOUT_REDIRECT = LOGIN
