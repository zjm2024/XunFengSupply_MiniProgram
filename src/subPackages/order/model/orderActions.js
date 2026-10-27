import { t } from '@/shared/i18n/index.js'
import '../i18n/register.js'

/**
 * 客户端订单动作展示定义。
 * 是否可展示、可执行由服务端 AllowedActions 决定；此处仅负责统一 UI 文案和样式。
 */
const ACTION_BUTTONS = Object.freeze({
  pay: { key: 'pay', labelKey: 'order.actions.pay', type: 'primary', priority: 0 },
  cancel: { key: 'cancel', labelKey: 'order.actions.cancel', type: 'secondary', priority: 9 },
  viewLogistics: { key: 'viewLogistics', labelKey: 'order.actions.viewLogistics', type: 'secondary', priority: 3 },
  confirmReceipt: { key: 'confirmReceipt', labelKey: 'order.actions.confirmReceipt', type: 'primary', priority: 0 },
  afterSale: { key: 'afterSale', labelKey: 'order.actions.afterSale', type: 'secondary', priority: 1 },
})

/**
 * 转换服务端动作到标准按钮配置；未知或内部动作不展示给客户。
 * @param {string[]} actions 服务端 AllowedActions
 * @returns {Array<{key:string, label:string, type:string}>}
 */
export function getOrderActionButtons(actions) {
  if (!Array.isArray(actions)) return []
  return actions
    .map(action => Object.prototype.hasOwnProperty.call(ACTION_BUTTONS, action) ? ACTION_BUTTONS[action] : null)
    .filter(Boolean)
    .map(action => ({ key: action.key, label: t(action.labelKey), type: action.type, priority: action.priority }))
}
