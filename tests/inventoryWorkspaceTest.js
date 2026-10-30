import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPageSetup } from './helpers/sfcHarness.js'

let vue, i18n
const stops=[]
beforeEach(async()=>{
  vi.resetModules(); vue=await import('vue'); i18n=await import('@/shared/i18n/index.js')
  const {registerMainLocales}=await import('@/app/i18n/registerMain.js');registerMainLocales()
  await import('@/subPackages/account/i18n/register.js')
  vi.stubGlobal('uni',{showToast:vi.fn(),getStorageSync:vi.fn(),setStorageSync:vi.fn(),removeStorageSync:vi.fn()})
})
afterEach(()=>{stops.splice(0).forEach(fn=>fn());vi.restoreAllMocks();vi.unstubAllGlobals()})

/** Execute real page setup with only network and native navigation isolated. */
async function open(file,supplied={}) {
  const api={ getDealerInventoryProducts:vi.fn(async()=>({items:[],totalCount:0})),getDealerInventoryList:vi.fn(async()=>({items:[],totalCount:0})),getDealerInventoryDetail:vi.fn(async()=>null),
    getDealerInventoryOverview:vi.fn(async()=>({skuCount:2})),getDealerInventoryTransactions:vi.fn(async()=>({items:[],totalCount:0})),...supplied }
  const hooks={},navigator={navigateTo:vi.fn()},routes={account:{inventory:p=>p,inventoryDetail:id=>'/sku/'+id,inventoryOverview:()=>'/overview',inventoryLedger:p=>p||{}},order:{inventoryAfterSaleApply:p=>p,detail:id=>'/order/'+id,afterSaleDetail:id=>'/return/'+id}}
  const user={hasPermission:vi.fn(()=>true)}
  const page=await loadPageSetup('subPackages/account/pages/inventory/'+file,async id=>{
    if(id==='vue')return vue
    if(id==='@dcloudio/uni-app')return {onLoad:fn=>{hooks.load=fn},onShow:fn=>{hooks.show=fn},onUnload:fn=>{hooks.unload=fn}}
    if(id.includes('i18n/index'))return i18n
    if(id.includes('pageState'))return import('@/shared/model/pageState.js')
    if(id.includes('navigator'))return {navigator}
    if(id.includes('config/routes'))return {routes}
    if(id.includes('inventoryReturnDraft'))return import('@/shared/model/inventoryReturnDraft.js')
    if(id.includes('userStore'))return {useUserStore:()=>user}
    if(id.includes('utils/format'))return import('@/shared/utils/format.js')
    if(id.includes('refreshAnimation'))return {waitForRefreshAnimation:vi.fn()}
    if(id.includes('/api/'))return api
    return {default:{}}
  });stops.push(page.stop);return {v:page.bindings,hooks,api,navigator,user}
}
/** Resolve requests in a controlled order to verify stale-response handling. */
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}

describe('dealer inventory workspace',()=>{
  it('ignores a slow older search and an older append after a filter change',async()=>{
    const a=deferred(),b=deferred(),c=deferred()
    const api=vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise).mockReturnValueOnce(c.promise).mockResolvedValue({items:[{productId:9}],totalCount:1})
    const {v}=await open('index.vue',{getDealerInventoryProducts:api})
    const first=v.reload();v.keyword.value='new';const next=v.reload()
    b.resolve({items:[{productId:2}],totalCount:40});await next
    a.resolve({items:[{productId:1}],totalCount:1});await first
    expect(v.items.value.map(x=>x.productId)).toEqual([2])
    const append=v.loadMore();await v.changeTab('low');c.resolve({items:[{productId:3}],totalCount:40});await append
    expect(v.items.value.map(x=>x.productId)).toEqual([9]);expect(v.pageNum.value).toBe(1)
  })
  it('reads again on returning from a submitted return and ignores a response after unload',async()=>{
    const slow=deferred(),get=vi.fn().mockResolvedValueOnce({skuId:11,availableQuantity:6,recentTransactions:[]}).mockResolvedValueOnce({skuId:11,availableQuantity:2,recentTransactions:[]}).mockReturnValueOnce(slow.promise)
    const {v,hooks}=await open('detail.vue',{getDealerInventoryDetail:get});hooks.load({skuId:'11'})
    await hooks.show();expect(v.detail.value.availableQuantity).toBe(6)
    await hooks.show();expect(v.detail.value.availableQuantity).toBe(2)
    const pending=hooks.show();hooks.unload();slow.resolve({skuId:11,availableQuantity:999});await pending
    expect(v.detail.value.availableQuantity).toBe(2)
  })
  it('does not fetch an invalid SKU detail or an invalid scoped ledger',async()=>{
    const detail=await open('detail.vue');detail.hooks.load({skuId:'-1'});await detail.hooks.show();expect(detail.api.getDealerInventoryDetail).not.toHaveBeenCalled()
    const ledger=await open('ledger.vue');ledger.hooks.load({skuId:'bad'});await ledger.hooks.show();expect(ledger.api.getDealerInventoryTransactions).not.toHaveBeenCalled()
  })
  it('keeps SKU scope when resetting filters, uses inclusive local calendar dates and resets page',async()=>{
    const {v,hooks,api}=await open('ledger.vue');hooks.load({skuId:'11'})
    v.startDate.value='2026-10-29';v.endDate.value='2026-10-30';v.keyword.value='AS';v.businessType.value='RETURN_OUT'
    await v.reload();expect(api.getDealerInventoryTransactions).toHaveBeenLastCalledWith(expect.objectContaining({skuId:11,startAt:new Date(2026,9,29).toISOString(),endAt:new Date(2026,9,31).toISOString()}))
    await v.changeStart({detail:{value:'2026-11-01'}});expect(uni.showToast).toHaveBeenCalled();expect(v.startDate.value).toBe('2026-10-29')
    await v.resetFilters();expect(v.skuId.value).toBe(11);expect(v.keyword.value).toBe('');expect(v.endDate.value).toBe('')
    await v.clearSku();expect(v.skuId.value).toBeNull()
  })
  it('does not duplicate concurrent ledger pages and retries failed appends without advancing',async()=>{
    const pending=deferred(),get=vi.fn().mockResolvedValueOnce({items:[{transactionId:1}],totalCount:50}).mockReturnValueOnce(pending.promise).mockResolvedValue({items:[{transactionId:2}],totalCount:50})
    const {v}=await open('ledger.vue',{getDealerInventoryTransactions:get});await v.reload()
    const more=v.loadMore();await v.loadMore();expect(get).toHaveBeenCalledTimes(2)
    pending.reject(new Error('retry'));await more;expect(v.pageNum.value).toBe(1);expect(v.loadMoreStatus.value).toBe('error')
    await v.loadMore();expect(v.pageNum.value).toBe(2);expect(v.items.value).toHaveLength(2)
  })
  it('translates reservation-only movements without presenting them as physical receipts',async()=>{
    const {v}=await open('ledger.vue');expect(v.businessTypeText('AFTER_SALE_RESERVE')).toContain('占用')
    expect(v.signed(0)).toBe('0');expect(v.deltaClass(0)).toBe('');expect(v.signed(-3)).toBe('-3')
    i18n.setLocale('en');expect(v.businessTypeText('AFTER_SALE_RELEASE')).toBe('Return reservation released')
  })
  it('checks source permissions and opens the actual return or order',async()=>{
    const {v,navigator,user}=await open('ledger.vue')
    v.openSource({sourceType:'AFTER_SALE',sourceId:4});expect(navigator.navigateTo).toHaveBeenLastCalledWith('/return/4')
    user.hasPermission.mockReturnValue(false);v.openSource({sourceType:'ORDER',sourceId:5});expect(navigator.navigateTo).toHaveBeenCalledTimes(1)
  })
  it('summary reads once at a time and its inventory shortcuts pass stable filters',async()=>{
    const pending=deferred(),get=vi.fn(()=>pending.promise)
    const {v,api,navigator}=await open('overview.vue',{getDealerInventoryOverview:get})
    const one=v.loadData();await v.loadData();expect(api.getDealerInventoryOverview).toHaveBeenCalledTimes(1)
    pending.resolve({skuCount:3});await one;expect(v.overview.value.skuCount).toBe(3)
    v.openInventory('low');expect(navigator.navigateTo).toHaveBeenCalledWith({stockStatus:'low'})
  })
  it('API maps stable activity filters and both axes, without sending identity',async()=>{
    const dispatch=vi.fn().mockResolvedValue({Items:[{TransactionId:'3',SkuId:'11',QuantityDelta:'0',ReservedDelta:'-2',SpecSnapshot:'{"skuCode":"XF"}'}],TotalCount:1})
    vi.doMock('@/shared/api/dispatchClient.js',()=>({dispatch}))
    const api=await import('@/subPackages/account/api/inventory.js')
    const result=await api.getDealerInventoryTransactions({skuId:11,keyword:' AS ',businessType:'RETURN_OUT',startAt:'2026-10-29T00:00:00Z',dealerId:99})
    expect(dispatch).toHaveBeenCalledWith('MallInventory','Mini.DealerInventoryController','GetTransactions',{PageNum:1,PageSize:20,SkuId:11,Keyword:'AS',BusinessType:'RETURN_OUT',StartAt:'2026-10-29T00:00:00Z',EndAt:null})
    expect(result.items[0]).toMatchObject({skuId:11,transactionId:3,quantityDelta:0,reservedDelta:-2,skuCode:'XF'})
  })
})
