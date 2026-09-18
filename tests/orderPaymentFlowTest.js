import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const readSource = relativePath => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')

describe('下单支付流程契约', () => {
  it('创建订单后应立即跳转支付页', () => {
    const source = readSource('src/subPackages/commerce/pages/checkout/index.vue')

    expect(source).toContain('navigator.redirectTo(routes.order.pay(orderId')
    expect(source).not.toContain("title: '订单创建成功'")
  })

  it('支付页只运行本地倒计时，不应定时轮询订单接口', () => {
    const source = readSource('src/subPackages/order/pages/pay/index.vue')

    expect(source).toContain('countdownTimer = setInterval')
    expect(source).not.toContain('startReservePolling')
    expect(source).not.toContain('reserveTimer')
    expect(source).not.toMatch(/setInterval\s*\([^)]*loadOrderInfo/s)
  })

  it('支付页不应向客户展示内部库存系统状态', () => {
    const source = readSource('src/subPackages/order/pages/pay/index.vue')

    expect(source).toContain('paying || !orderPayable || paymentExpired')
    expect(source).not.toContain('WMS 正在预占库存')
    expect(source).not.toContain('本地库存已占用')
    expect(source).not.toContain('更新状态')
  })

  it('倒计时归零只提示期限结束，不应主动取消订单或宣称取消完成', () => {
    const source = readSource('src/subPackages/order/pages/pay/index.vue')

    expect(source).toContain('请到订单详情查看处理结果')
    expect(source).not.toContain('系统已取消')
    expect(source).not.toMatch(/handlePaymentExpired[\s\S]*cancelOrder\(/)
  })

  it('订单详情和配送安排只展示客户可理解的状态', () => {
    const detailSource = readSource('src/subPackages/order/pages/detail/index.vue')
    const splitSource = readSource('src/subPackages/order/pages/split/index.vue')

    expect(detailSource).not.toContain("'WMS': 'WMS'")
    expect(detailSource).not.toContain('状态变更为')
    expect(splitSource).not.toContain('确认拆单并推送 WMS')
    expect(splitSource).not.toContain('warehouse-code')
    expect(splitSource).toContain('确认配送安排')
  })
})
