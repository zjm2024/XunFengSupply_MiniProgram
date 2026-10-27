import { describe, expect, it } from 'vitest'
import { fitActionRow } from '@/shared/ui/actionRowLayout.js'
import { loadPageSetup } from './helpers/sfcHarness.js'
import * as vue from 'vue'
import * as constants from '@/app/config/constant.js'

const actions = [{ key: 'reorder', priority: 2 }, { key: 'pay', priority: 0 }, { key: 'cancel', priority: 9 }]

describe('操作行自适应与完整菜单', () => {
  it('足够宽时完整展示，不额外产生更多入口', () => {
    expect(fitActionRow(actions, 800, [112, 112, 140])).toEqual({ visible: actions, overflow: [] })
  })
  it('窄屏保留付款，中等宽度保留再来一单和付款，取消进入菜单', () => {
    expect(fitActionRow(actions, 288, [112, 112, 140]).visible.map(action => action.key)).toEqual(['pay'])
    expect(fitActionRow(actions, 343, [112, 112, 140]).visible.map(action => action.key)).toEqual(['reorder', 'pay'])
    expect(fitActionRow(actions, 343, [112, 112, 140]).overflow.map(action => action.key)).toEqual(['cancel'])
  })
  it('长英文按实测宽度收进菜单，不依赖动作数量或语言猜宽度', () => {
    expect(fitActionRow(actions, 343, [180, 150, 180]).visible.map(action => action.key)).toEqual(['pay'])
  })
  it('多个动作在任意宽度下均无丢失、无重复，并保留完整禁用信息', () => {
    const all = [...actions, { key: 'afterSale', priority: 1 }, { key: 'tracking', priority: 3, type: 'disabled' }]
    for (const width of [180, 240, 288, 343, 720]) {
      const result = fitActionRow(all, width, [112, 135, 120, 180, 145])
      expect([...result.visible, ...result.overflow].map(action => action.key).sort()).toEqual(all.map(action => action.key).sort())
      expect([...result.visible, ...result.overflow].find(action => action.key === 'tracking').type).toBe('disabled')
    }
  })
  it('空动作与单个超长动作仍可正常布局', () => {
    expect(fitActionRow([], 200)).toEqual({ visible: [], overflow: [] })
    expect(fitActionRow([actions[1]], 200, [450]).visible).toEqual([actions[1]])
  })
})

describe('订单状态组件真实进度计算', () => {
  it('响应式节点数组切换文案后进度宽度仍是有效数值', async () => {
    const view = await loadPageSetup('shared/ui/OrderStatusProgress/OrderStatusProgress.vue', async id => {
      if (id === 'vue') return vue
      if (id.endsWith('/constant.js')) return constants
      throw new Error('Unexpected progress import ' + id)
    }, { status: constants.ORDER_STATUS.PENDING_PAYMENT, paymentStatus: 0, fulfillmentStatus: 0,
      journeyVisible: true, stepLabels: ['提交订单', '完成付款', '商家发货', '交易完成'] })
    expect(view.bindings.progressPercent.value).toBe(33)
    view.props.stepLabels = ['Order placed', 'Payment completed', 'Shipped', 'Order completed']
    expect(view.bindings.steps.value[1].title).toBe('Payment completed')
    expect(view.bindings.progressPercent.value).toBe(33)
    view.props.status = constants.ORDER_STATUS.COMPLETED
    expect(view.bindings.progressPercent.value).toBe(100)
    view.props.journeyVisible = false
    expect(view.bindings.showProgress.value).toBe(false)
    view.stop()
  })
})
