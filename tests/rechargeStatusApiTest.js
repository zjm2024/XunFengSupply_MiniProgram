import { describe, expect, it, vi } from 'vitest'
const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }))
vi.mock('@/shared/api/dispatchClient.js', () => ({ dispatch }))
import { getRechargeStatus, createAppRecharge, createNativeRecharge } from '@/shared/api/dealerFinance.js'

describe('read-only recharge status API', () => {
  it.each([createAppRecharge, createNativeRecharge])('充值请求始终不携带商品订单号', async create => {
    dispatch.mockResolvedValue({ RechargeNo: 'RC-ONE', Status: 0 })
    await create({ amount: 10, clientRequestId: 'fixed-one', channel: 'wechat', orderId: 88, erpOrderNo: 'CLIENT-FAKE' })
    expect(dispatch.mock.lastCall[3]).toMatchObject({ Amount: 10 })
    expect(dispatch.mock.lastCall[3]).not.toHaveProperty('OrderId')
    expect(dispatch.mock.lastCall[3]).not.toHaveProperty('ErpOrderNo')
    await create({ amount: 10, clientRequestId: 'fixed-two', channel: 'wechat' })
    expect(dispatch.mock.lastCall[3]).not.toHaveProperty('OrderId')
    dispatch.mockReset()
  })

  it('only sends the recharge number and normalizes committed server facts', async () => {
    dispatch.mockReset()
    dispatch.mockResolvedValueOnce({ RechargeNo: 'RC-ONE', Status: 2, Amount: 100, CompletedAtUtc: '2026-10-27T01:00:00Z' })
    expect(await getRechargeStatus('RC-ONE')).toMatchObject({ rechargeNo: 'RC-ONE', status: 2, amount: 100,
      completedAtUtc: '2026-10-27T01:00:00Z' })
    expect(dispatch).toHaveBeenLastCalledWith('Finance', 'Mini.DealerFinanceController', 'GetRechargeStatus', { RechargeNo: 'RC-ONE' })
    dispatch.mockRejectedValueOnce(new Error('network'))
    await expect(getRechargeStatus('RC-ONE')).rejects.toThrow('network')
    expect(dispatch).toHaveBeenCalledTimes(2)
  })
})
