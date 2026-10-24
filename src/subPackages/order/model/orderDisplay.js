/**
 * 订单列表和详情只展示服务端字典结果，不在页面中重新推导业务状态。
 * 元数据缺失必须明确呈现不可用，不能回退成成功、已发货或已退款。
 */
const SUPPORTED_TONES = new Set(['default', 'info', 'warning', 'error', 'success'])

/** 统一处理缺失元数据和服务端允许的标签样式。 */
function present(display) {
  if (!display?.metadataComplete || !display.text || !display.description) {
    return {
      code: display?.code || '',
      text: '状态暂不可用',
      description: '状态信息暂不可用，请稍后刷新或联系客服。',
      type: 'default',
      metadataComplete: false,
      showProgress: false,
    }
  }
  return { ...display, type: SUPPORTED_TONES.has(display.tone) ? display.tone : 'default' }
}

/** 列表与详情使用同一个客户主状态入口。 */
export function getOrderCustomerDisplay(order) {
  return present(order?.customerStatus)
}

/** 退款是补充事实，不取代交易主状态；没有退款事实时不展示。 */
export function getCustomerRefundDisplay(order) {
  return order?.customerRefund ? present(order.customerRefund) : null
}

/** 配送单只展示后端判定的本批次结果，页面不再把作废推断为退款。 */
export function getSplitCustomerDisplay(split) {
  return present(split?.customerStatus)
}
