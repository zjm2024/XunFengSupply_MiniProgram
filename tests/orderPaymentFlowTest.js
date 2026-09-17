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

  it('WMS 处理中不应阻止支付，只有失败状态才禁用支付', () => {
    const source = readSource('src/subPackages/order/pages/pay/index.vue')

    expect(source).toContain('paying || !orderPayable || stockFailed || paymentExpired')
    expect(source).not.toContain('paying || !stockReady')
    expect(source).toContain('本地库存已占用，可先完成支付')
  })

  it('倒计时归零只提示期限结束，不应主动取消订单或宣称取消完成', () => {
    const source = readSource('src/subPackages/order/pages/pay/index.vue')

    expect(source).toContain('请到订单详情查看后端最终处理状态')
    expect(source).not.toContain('系统已取消')
    expect(source).not.toMatch(/handlePaymentExpired[\s\S]*cancelOrder\(/)
  })
})
