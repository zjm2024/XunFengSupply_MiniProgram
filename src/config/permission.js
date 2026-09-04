/**
 * 账号权限配置 - 总店创建子账号权限控制
 * 对应业务流程：总店管理员创建业务员子账号，分配不同操作权限
 */

// ==================== 账号角色枚举 ====================
export const ACCOUNT_ROLE = {
  ADMIN: { value: 'admin', label: '总店管理员', desc: '拥有所有权限，可管理子账号' },
  SALESMAN: { value: 'salesman', label: '业务员', desc: '受限权限，由总店分配' },
  FINANCE: { value: 'finance', label: '财务人员', desc: '仅查看账单和结算相关' }
}

// ==================== 权限点定义 ====================
export const PERMISSIONS = {
  // 商品相关权限
  VIEW_GOODS: 'view_goods',              // 浏览商品
  VIEW_PRICE: 'view_price',              // 查看价格（敏感信息）
  
  // 购物车相关权限
  CART_MANAGE: 'cart_manage',            // 购物车管理（添加/修改/删除）
  
  // 订单相关权限
  ORDER_CREATE: 'order_create',          // 创建订单
  ORDER_VIEW: 'order_view',              // 查看订单列表
  ORDER_DETAIL: 'order_detail',          // 查看订单详情
  ORDER_CANCEL: 'order_cancel',          // 取消订单
  
  // 结算相关权限
  PAYMENT_PAY: 'payment_pay',            // 执行付款操作
  CREDIT_USE: 'credit_use',              // 使用授信额度
  BILL_VIEW: 'bill_view',                // 查看账单
  BILL_EXPORT: 'bill_export',            // 导出凭证
  
  // 售后相关权限
  AFTER_SALE_APPLY: 'after_sale_apply',  // 发起售后申请
  AFTER_SALE_VIEW: 'after_sale_view',    // 查看售后进度
  
  // 账号管理权限
  SUB_ACCOUNT_MANAGE: 'sub_account_manage', // 子账号管理（仅总店）
  PERMISSION_ASSIGN: 'permission_assign'   // 分配权限（仅总店）
}

// ==================== 角色默认权限映射 ====================
export const ROLE_PERMISSION_MAP = {
  // 总店管理员 - 全部权限
  admin: [
    PERMISSIONS.VIEW_GOODS,
    PERMISSIONS.VIEW_PRICE,
    PERMISSIONS.CART_MANAGE,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_DETAIL,
    PERMISSIONS.ORDER_CANCEL,
    PERMISSIONS.PAYMENT_PAY,
    PERMISSIONS.CREDIT_USE,
    PERMISSIONS.BILL_VIEW,
    PERMISSIONS.BILL_EXPORT,
    PERMISSIONS.AFTER_SALE_APPLY,
    PERMISSIONS.AFTER_SALE_VIEW,
    PERMISSIONS.SUB_ACCOUNT_MANAGE,
    PERMISSIONS.PERMISSION_ASSIGN
  ],
  // 业务员 - 受限权限（不可付款、不可管理账号）
  salesman: [
    PERMISSIONS.VIEW_GOODS,
    PERMISSIONS.VIEW_PRICE,
    PERMISSIONS.CART_MANAGE,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_DETAIL,
    PERMISSIONS.AFTER_SALE_APPLY,
    PERMISSIONS.AFTER_SALE_VIEW
  ],
  // 财务人员 - 仅财务相关权限
  finance: [
    PERMISSIONS.VIEW_GOODS,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_DETAIL,
    PERMISSIONS.BILL_VIEW,
    PERMISSIONS.BILL_EXPORT,
    PERMISSIONS.PAYMENT_PAY,
    PERMISSIONS.AFTER_SALE_VIEW
  ]
}

/**
 * 检查用户是否拥有指定权限
 * @param {string} role - 用户角色
 * @param {string} permission - 权限点
 * @returns {boolean} 是否有权限
 */
export function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSION_MAP[role] || []
  return permissions.includes(permission)
}

/**
 * 检查用户是否拥有任一指定权限
 * @param {string} role - 用户角色
 * @param {Array<string>} permissions - 权限点数组
 * @returns {boolean} 是否有任一权限
 */
export function hasAnyPermission(role, permissions) {
  const userPermissions = ROLE_PERMISSION_MAP[role] || []
  return permissions.some(p => userPermissions.includes(p))
}
