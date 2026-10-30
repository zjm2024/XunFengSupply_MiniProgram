import {beforeEach,describe,it,expect,vi} from 'vitest'
beforeEach(()=>vi.resetModules())
describe.each(['order','inventory'])('%s optional return tracking mapping',source=>{
 it('sends trimmed ExpressNo without changing the request key',async()=>{
  const dispatch=vi.fn().mockResolvedValue({});vi.doMock('@/shared/api/dispatchClient.js',()=>({dispatch}))
  const api=await import('@/shared/api/afterSale.js'),method=source==='order'?api.applyAfterSale:api.applyInventoryAfterSale
  await method({orderId:88,refundAccountId:77,afterSaleType:2,reason:'return',expressNo:'  SF-00123  ',clientRequestId:'stable-key',items:[]})
  const payload=dispatch.mock.calls[0][3];expect(payload.ExpressNo).toBe('SF-00123');expect(payload.ClientRequestId).toBe('stable-key');expect(payload).not.toHaveProperty('express_no')
 })
 it('omits an empty value so existing request DTOs remain unchanged',async()=>{
  const dispatch=vi.fn().mockResolvedValue({});vi.doMock('@/shared/api/dispatchClient.js',()=>({dispatch}))
  const api=await import('@/shared/api/afterSale.js'),method=source==='order'?api.applyAfterSale:api.applyInventoryAfterSale
  await method({orderId:88,expressNo:'   ',items:[]});expect(dispatch.mock.calls[0][3]).not.toHaveProperty('ExpressNo')
 })
})
