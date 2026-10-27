import { beforeEach, describe, it, expect } from 'vitest'
import { setLocale } from '@/shared/i18n/index.js'
import { getOrderCustomerDisplay, getCustomerRefundDisplay, getSplitCustomerDisplay } from '@/subPackages/order/model/orderDisplay.js'

const completed = {
  code: 'COMPLETED', text: '字典维护的交易完成标题', description: '字典维护的完成说明',
  tone: 'success', metadataComplete: true, showProgress: true,
}

describe('客户订单字典展示', () => {
  beforeEach(() => setLocale('zh-CN'))

  it('元数据缺失的提示随语言切换，服务端完整状态仍原样保留', () => {
    setLocale('en-US')
    expect(getOrderCustomerDisplay({}).text).toBe('Status unavailable')
    expect(getOrderCustomerDisplay({}).showProgress).toBe(false)
    expect(getOrderCustomerDisplay({ customerStatus: completed }).text).toBe(completed.text)
  })
  it('列表和详情不再按原始状态覆盖服务端字典文案', () => {
    const order = { orderStatus: 40, paymentStatus: 0, customerStatus: completed }
    expect(getOrderCustomerDisplay(order).text).toBe('字典维护的交易完成标题')
    expect(getOrderCustomerDisplay(order).description).toBe('字典维护的完成说明')
  })

  it('完成单仍可显示退款处理中，主状态保持交易完成', () => {
    const order = {
      customerStatus: completed,
      customerRefund: { code: 'REFUNDING', text: '退款处理中', description: '款项尚未退回', tone: 'warning', metadataComplete: true },
    }
    expect(getOrderCustomerDisplay(order).code).toBe('COMPLETED')
    expect(getCustomerRefundDisplay(order).text).toBe('退款处理中')
  })

  it('缺失标题或启用元数据时不能回退为成功、已发货或已退款', () => {
    const missing = getOrderCustomerDisplay({ customerStatus: { ...completed, metadataComplete: false } })
    expect(missing.metadataComplete).toBe(false)
    expect(missing.type).toBe('default')
    expect(missing.showProgress).toBe(false)
    expect(missing.text).toBe('状态暂不可用')
    expect(getCustomerRefundDisplay({})).toBeNull()
    expect(getCustomerRefundDisplay({ customerRefund: { code: 'REFUNDED' } }).text).toBe('状态暂不可用')
  })

  it('配送安排作废由服务端决定，前端不按取消状态误报退款', () => {
    const split = {
      status: 6, shippedQuantity: 0,
      customerStatus: { code: 'SPLIT_INVALIDATED', text: '本次安排已作废', description: '原订单和款项保留', tone: 'default', metadataComplete: true },
    }
    expect(getSplitCustomerDisplay(split).text).toBe('本次安排已作废')
    expect(getSplitCustomerDisplay(split).description).toBe('原订单和款项保留')
  })
})

