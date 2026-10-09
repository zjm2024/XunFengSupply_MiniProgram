/**
 * 客户端订单动作展示定义。
 * 是否可展示、可执行由服务端 AllowedActions 决定；此处仅负责统一 UI 文案和样式。
 */
const ACTION_BUTTONS = Object.freeze({
  pay: { key: 'pay', label: '立即付款', type: 'primary' },
  cancel: { key: 'cancel', label: '取消订单', type: 'secondary' },
  viewLogistics: { key: 'viewLogistics', label: '查看物流', type: 'secondary' },
  confirmReceipt: { key: 'confirmReceipt', label: '确认收货', type: 'primary' },
  afterSale: { key: 'afterSale', label: '申请售后', type: 'secondary' },
})

/**
 * 转换服务端动作到标准按钮配置；未知或内部动作不展示给客户。
 * @param {string[]} actions 服务端 AllowedActions
 * @returns {Array<{key:string, label:string, type:string}>}
 */
export function getOrderActionButtons(actions) {
  if (!Array.isArray(actions)) return []
  return actions.map(action => ACTION_BUTTONS[action]).filter(Boolean)
}
