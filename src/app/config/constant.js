/**
 * @file 全局常量定义
 * @description 集中管理所有业务常量、状态码、枚举值，禁止在页面中硬编码数字
 */

// ==================== 存储Key ====================

/** Token存储Key */
export const TOKEN_KEY = 'supply_chain_token'

/** 用户信息存储Key */
export const USER_INFO_KEY = 'supply_chain_user_info'

/** 购物车本地缓存Key */
export const CART_KEY = 'supply_chain_cart'

/** 设备信息Key */
export const DEVICE_KEY = 'supply_chain_device'

// ==================== 状态码 ====================

/** 请求成功码（匹配后端 ApiResult.Code，200-299 范围均为成功） */
export const CODE_SUCCESS = 200

/** Token过期/未授权 */
export const CODE_UNAUTHORIZED = 401

/** 无权限 */
export const CODE_FORBIDDEN = 403

/** 参数错误 */
export const CODE_PARAM_ERROR = 400

/** 服务器错误 */
export const CODE_SERVER_ERROR = 500

// ==================== 用户相关常量 ====================

/** 用户类型枚举 */
export const USER_TYPE = {
  /** 普通经销商 */
  NORMAL: 1,
  /** VIP经销商 */
  VIP: 2,
  /** 核心经销商 */
  CORE: 3,
}

/** 审核状态枚举 */
export const AUDIT_STATUS = {
  /** 待审核 */
  PENDING: 0,
  /** 审核通过 */
  APPROVED: 1,
  /** 审核拒绝 */
  REJECTED: 2,
}

/** 审核状态映射（用于页面展示） */
export const AUDIT_STATUS_MAP = {
  [AUDIT_STATUS.PENDING]: { text: '待审核', color: '#ff9500' },
  [AUDIT_STATUS.APPROVED]: { text: '已通过', color: '#07c160' },
  [AUDIT_STATUS.REJECTED]: { text: '已拒绝', color: '#e64545' },
}

// ==================== 订单相关常量 ====================
// 订单状态值与后端 OrderStatus 枚举对齐

/** 订单状态枚举（对应后端 XunFeng.Module.MallOrder.Enums.OrderStatus） */
export const ORDER_STATUS = {
  /** 草稿 */
  DRAFT: 0,
  /** 待审核 */
  PENDING_REVIEW: 10,
  /** 审核驳回 */
  REVIEW_REJECTED: 11,
  /** 待支付 */
  PENDING_PAYMENT: 20,
  /** 处理中 */
  PROCESSING: 40,
  /** 已完成 */
  COMPLETED: 60,
  /** 取消中 */
  CANCELLING: 90,
  /** 已取消 */
  CANCELLED: 91,
}

/** 订单状态映射（用于页面展示） */
export const ORDER_STATUS_MAP = {
  [ORDER_STATUS.DRAFT]: { text: '草稿', color: '#909399' },
  [ORDER_STATUS.PENDING_REVIEW]: { text: '待审核', color: '#ff9500' },
  [ORDER_STATUS.REVIEW_REJECTED]: { text: '审核驳回', color: '#e64545' },
  [ORDER_STATUS.PENDING_PAYMENT]: { text: '待付款', color: '#ff9500' },
  [ORDER_STATUS.PROCESSING]: { text: '处理中', color: '#1890ff' },
  [ORDER_STATUS.COMPLETED]: { text: '已完成', color: '#07c160' },
  [ORDER_STATUS.CANCELLING]: { text: '取消中', color: '#fa8c16' },
  [ORDER_STATUS.CANCELLED]: { text: '已取消', color: '#999999' },
}

/** 支付状态枚举（对应后端 PaymentStatus） */
export const PAYMENT_STATUS = {
  UNPAID: 0,
  PAYING: 1,
  PARTIALLY_PAID: 2,
  CONFIRMED: 3,
  FAILED: 4,
  UNKNOWN: 5,
}

/** 履约状态枚举（对应后端 FulfillmentStatus） */
export const FULFILLMENT_STATUS = {
  NOT_STARTED: 0,
  PICKING: 1,
  PICKED: 2,
  SHIPPING: 3,
  SHIPPED: 4,
  DELIVERED: 5,
  COMPLETED: 6,
}

/** 结算模式枚举（对应后端 PaymentMode） */
export const PAYMENT_MODE = {
  CASH: 1,
  CREDIT: 2,
  COMBINATION: 3,
}

/** 配送方式枚举（对应后端 DeliveryType） */
export const DELIVERY_TYPE = {
  DELIVERY: 1,
  PICKUP: 2,
}

/** 结算方式映射（使用 PAYMENT_MODE） */
export const SETTLE_TYPE = PAYMENT_MODE

/** 结算方式映射 */
export const SETTLE_TYPE_MAP = {
  [PAYMENT_MODE.CASH]: { text: '现款支付', icon: '💰' },
  [PAYMENT_MODE.CREDIT]: { text: '授信赊账', icon: '💳' },
  [PAYMENT_MODE.COMBINATION]: { text: '组合支付', icon: '💳' },
}

// ==================== 售后相关常量 ====================

/** 售后类型枚举 */
export const AFTER_SALE_TYPE = {
  /** 仅退款 */
  REFUND_ONLY: 1,
  /** 退货退款 */
  RETURN_REFUND: 2,
  /** 换货 */
  EXCHANGE: 3,
}

/** 售后状态枚举 */
export const AFTER_SALE_STATUS = {
  /** 待审核 */
  PENDING_REVIEW: 0,
  /** 待退货 */
  PENDING_RETURN: 1,
  /** 待收货 */
  PENDING_RECEIVE: 2,
  /** 退款中 */
  REFUNDING: 3,
  /** 已完成 */
  COMPLETED: 4,
  /** 已拒绝 */
  REJECTED: 5,
  /** 已取消 */
  CANCELLED: 6,
}

/** 售后状态映射 */
export const AFTER_SALE_STATUS_MAP = {
  [AFTER_SALE_STATUS.PENDING_REVIEW]: { text: '待审核', color: '#ff9500' },
  [AFTER_SALE_STATUS.PENDING_RETURN]: { text: '待退货', color: '#1890ff' },
  [AFTER_SALE_STATUS.PENDING_RECEIVE]: { text: '待收货', color: '#722ed1' },
  [AFTER_SALE_STATUS.REFUNDING]: { text: '退款中', color: '#fa8c16' },
  [AFTER_SALE_STATUS.COMPLETED]: { text: '已完成', color: '#07c160' },
  [AFTER_SALE_STATUS.REJECTED]: { text: '已拒绝', color: '#e64545' },
  [AFTER_SALE_STATUS.CANCELLED]: { text: '已取消', color: '#999999' },
}

// ==================== 发票相关常量 ====================

/** 发票类型枚举 */
export const INVOICE_TYPE = {
  /** 不开发票 */
  NONE: 0,
  /** 增值税普通发票 */
  NORMAL: 1,
  /** 增值税专用发票 */
  SPECIAL: 2,
}

/** 发票抬头类型 */
export const INVOICE_TITLE_TYPE = {
  /** 个人 */
  PERSONAL: 1,
  /** 企业 */
  ENTERPRISE: 2,
}

// ==================== 商品相关常量 ====================

/** 商品上下架状态 */
export const PRODUCT_STATUS = {
  /** 上架 */
  ON_SALE: 1,
  /** 下架 */
  OFF_SALE: 0,
}

/** 价格等级枚举（对应经销商等级） */
export const PRICE_LEVEL = {
  /** 普通价 */
  LEVEL_1: 1,
  /** VIP价 */
  LEVEL_2: 2,
  /** 核心价 */
  LEVEL_3: 3,
}

// ==================== 促销活动常量 ====================

/** 活动状态 */
export const ACTIVITY_STATUS = {
  /** 未开始 */
  NOT_STARTED: 0,
  /** 进行中 */
  ONGOING: 1,
  /** 已结束 */
  ENDED: 2,
  /** 已失效 */
  INVALID: 3,
}

// ==================== 分页常量 ====================

/** 默认每页条数 */
export const PAGE_SIZE = 10

/** 分页选项 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50]

// ==================== UI展示常量 ====================

/** 默认头像 */
export const DEFAULT_AVATAR = '/static/images/default-avatar.png'

/** 默认商品图 */
export const DEFAULT_PRODUCT_IMG = '/static/images/default-product.png'

/** 金额精度（小数位数） */
export const MONEY_PRECISION = 2

/** 手机号正则 */
export const REGEX_PHONE = /^1[3-9]\d{9}$/

/** 密码正则（6-20位字母数字组合） */
export const REGEX_PASSWORD = /^[a-zA-Z0-9]{6,20}$/

/** 统一社会信用代码正则 */
export const REGEX_CREDIT_CODE = /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/

// ==================== 信誉分规则常量 ====================

/** 信誉分规则 */
export const CREDIT_RULES = {
  /** 按时付款加分 */
  ON_TIME_PAYMENT: 5,
  /** 提前付款加分 */
  EARLY_PAYMENT: 8,
  /** 月度正常履约加分 */
  MONTHLY_RECOVERY: 3,
  /** 正常售后加分 */
  SUCCESS_AFTER_SALE: 2,
  /** 逾期付款扣分 */
  OVERDUE_PAYMENT: -15,
  /** 拒收扣分 */
  REJECT_RECEIPT: -20,
  /** 恶意售后扣分 */
  FRAUD_AFTER_SALE: -30,
  /** 最低信誉分 */
  MIN_SCORE: 0,
  /** 最高信誉分 */
  MAX_SCORE: 100,
}

/** 授信等级 */
export const CREDIT_LEVEL = {
  /** 核心经销商 ≥95分 */
  LEVEL_4: { minScore: 95, maxCredit: 500000, label: '核心经销商' },
  /** 优质经销商 ≥80分 */
  LEVEL_3: { minScore: 80, maxCredit: 300000, label: '优质经销商' },
  /** 标准经销商 ≥60分 */
  LEVEL_2: { minScore: 60, maxCredit: 150000, label: '标准经销商' },
  /** 初级经销商 <60分 */
  LEVEL_1: { minScore: 0, maxCredit: 50000, label: '初级经销商' },
}

// ==================== 账单状态常量 ====================

/** 账单状态枚举（用于 status-tag 组件） */
export const BILL_STATUS = {
  /** 未结算 */
  UNSETTLED: { value: 0, label: '未结算', color: '#FF9800' },
  /** 部分结算 */
  PARTIAL: { value: 1, label: '部分结算', color: '#E6A23C' },
  /** 已结清 */
  SETTLED: { value: 2, label: '已结清', color: '#67C23A' },
  /** 已逾期 */
  OVERDUE: { value: 3, label: '已逾期', color: '#F56C6C' },
}
