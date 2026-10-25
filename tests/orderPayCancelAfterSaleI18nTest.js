import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const readSource = relativePath => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
const readResource = locale => JSON.parse(readSource(`src/subPackages/order/i18n/${locale}.json`))

describe('订单支付、取消与售后双语边界', () => {
  it('支付页只切换显示文案，不改变支付状态门禁和提交入口', () => {
    const source = readSource('src/subPackages/order/pages/pay/index.vue')

    expect(source).toContain("t('order.pay.chooseMethod')")
    expect(source).toContain("t('order.pay.expiredContent')")
    expect(source).toContain('res.allowedActions.includes(\'pay\')')
    expect(source).toContain('confirmDealerOrderPayment({')
    expect(source).toContain('clientRequestId: `credit-pay-')
    expect(source).toContain('clientRequestId: `balance-pay-')
    expect(source).not.toContain('cancelOrder(')
  })

  it('取消原因的显示翻译不得污染提交给后端的原始原因', () => {
    const source = readSource('src/subPackages/order/pages/cancel/index.vue')

    expect(source).toContain('labelKey:')
    expect(source).toContain('reason: \'不想要了/改变主意\'')
    expect(source).toContain('params.reason = selected?.reason || null')
    expect(source).not.toContain('params.reason = selected?.label')
    expect(source).toContain('t(reason.labelKey)')
  })

  it('售后原因和取消售后审计原因仍使用用户/业务原始文本', () => {
    const applySource = readSource('src/subPackages/order/pages/after-sale/apply.vue')
    const listSource = readSource('src/subPackages/order/pages/after-sale/list.vue')

    expect(applySource).toContain("t('order.afterSale.submit')")
    expect(applySource).toContain('reason: form.reason.trim()')
    expect(listSource).toContain("reason: '经销商主动取消'")
    expect(listSource).toContain("t('order.afterSaleList.cancelContent'")
  })

  it('新增订单资源在中英文中保持同构且关键提示有英文版本', () => {
    const zh = readResource('zh-CN')
    const en = readResource('en-US')
    const walk = (left, right, prefix = []) => {
      for (const key of Object.keys(left)) {
        const current = [...prefix, key]
        if (left[key] && typeof left[key] === 'object') walk(left[key], right[key], current)
        else expect(typeof right[key], current.join('.')).toBe('string')
      }
    }

    walk(zh, en)
    expect(en.pay.expiredContent).not.toBe(zh.pay.expiredContent)
    expect(en.cancel.reasons.changedMind).not.toBe(zh.cancel.reasons.changedMind)
    expect(en.afterSale.submit).not.toBe(zh.afterSale.submit)
  })
})
