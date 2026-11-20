import business from '../static/message/business.svg'
import order from '../static/message/order.svg'
import audit from '../static/message/audit.svg'
import bill from '../static/message/bill.svg'
import announcement from '../static/message/announcement.svg'
const icons = { business, order, audit, bill, announcement }
/** 服务端支持的消息分类及本地矢量图；业务为订单、审核、账单汇总。 */
export const messageCategories = [
  { type: 'business', key: 'business', countKeys: ['order', 'audit', 'bill'] },
  { type: '1', key: 'order', countKeys: ['order'] },
  { type: '2', key: 'audit', countKeys: ['audit'] },
  { type: '3', key: 'bill', countKeys: ['bill'] },
  { type: '4', key: 'announcement', countKeys: ['announcement'] },
]
/** 返回打包内 SVG，不依赖远端图片或运行时图标生成。 */
export function messageIcon(type) {
  const category = messageCategories.find(item => item.type === String(type))
  return icons[category?.key || 'announcement']
}
