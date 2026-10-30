import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
import {loadPageSetup} from './helpers/sfcHarness.js'
let vue,i18n,draftModule
const stops=[]
beforeEach(async()=>{
 vi.resetModules();vue=await import('vue');i18n=await import('@/shared/i18n/index.js')
 const {registerMainLocales}=await import('@/app/i18n/registerMain.js');registerMainLocales()
 await import('@/subPackages/account/i18n/register.js');await import('@/subPackages/order/i18n/register.js')
 vi.stubGlobal('uni',{showToast:vi.fn(),getStorageSync:vi.fn(),setStorageSync:vi.fn(),removeStorageSync:vi.fn()})
 draftModule=await import('@/shared/model/inventoryReturnDraft.js')
})
afterEach(()=>{stops.splice(0).forEach(fn=>fn());vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()})
const sku=(id,productId=1,availableQuantity=5)=>({skuId:id,productId,productName:'Product '+productId,skuName:'Blue / '+id,unit:'pairs',availableQuantity})
/** Execute the actual inventory or review setup with only HTTP and native navigation substituted. */
async function open(file,overrides={}){
 const draft=draftModule.useInventoryReturnDraft('1:1'),hooks={},navigator={navigateTo:vi.fn(),redirectTo:vi.fn(),back:vi.fn()}
 const api={getDealerInventoryProducts:vi.fn(async()=>({items:[{productId:1,skuCount:2},{productId:2,skuCount:1}],totalCount:2})),getDealerInventoryList:vi.fn(async p=>({items:p.productId===2?[sku(3,2)]:[sku(1),sku(2)],totalCount:p.productId===2?1:2})),
  getDealerInventoryReturnItems:vi.fn(async ids=>ids.map(id=>sku(id,id===3?2:1))),getDealerFinanceContext:vi.fn(async()=>({accounts:[{accountId:7,realName:'Balance',accountStatus:1,financeStatus:1}]})),applyInventoryAfterSale:vi.fn(async()=>({afterSaleId:55})),...overrides}
 const routes={account:{inventory:()=>'/inventory',inventoryDetail:id=>'/sku/'+id,inventoryOverview:()=>'/overview',inventoryLedger:()=>'/ledger'},order:{inventoryAfterSaleApply:()=>'/return',afterSaleDetail:id=>'/return/'+id,afterSaleList:()=>'/returns'}}
 const relative=file==='index'?'subPackages/account/pages/inventory/index.vue':'subPackages/order/pages/after-sale/inventory-apply.vue'
 const page=await loadPageSetup(relative,async id=>{
  if(id==='vue')return vue
  if(id==='@dcloudio/uni-app')return {onLoad:fn=>hooks.load=fn,onShow:fn=>hooks.show=fn,onUnload:fn=>hooks.unload=fn}
  if(id.includes('i18n/index'))return i18n
  if(id.includes('pageState'))return import('@/shared/model/pageState.js')
  if(id.includes('inventoryReturnDraft'))return draftModule
  if(id.includes('userStore'))return {useUserStore:()=>({dealerId:1,userId:1})}
  if(id.includes('config/routes'))return {routes}
  if(id.includes('navigator'))return {navigator}
  if(id.includes('refreshAnimation'))return {waitForRefreshAnimation:vi.fn()}
  if(id.includes('/api/'))return api
  return {default:{}}
 });stops.push(page.stop);return {v:page.bindings,api,hooks,draft,navigator}
}

describe('multi-product inventory returns',()=>{
 it('loads variants only on expansion, retains cross-SPU quantities through filtering',async()=>{
  const {v,api,draft}=await open('index');await v.reload();expect(api.getDealerInventoryList).not.toHaveBeenCalled()
  await v.toggleProduct({productId:1,skuCount:2});expect(api.getDealerInventoryList).toHaveBeenCalledWith(expect.objectContaining({productId:1,pageNum:1}))
  v.toggleSku(sku(1));v.setQuantity(sku(1),3);await v.toggleProduct({productId:2,skuCount:1});v.toggleSku(sku(3,2))
  await v.changeTab('available');v.keywordInput.value='other';await v.applySearch()
  expect(draft.state.items.map(row=>[row.skuId,row.quantity])).toEqual([[1,3],[3,1]])
  expect(v.selectedSummary.value).toContain('2');expect(draft.state.items).toHaveLength(2)
 })
 it('ignores a late variant response after a filter change',async()=>{
  let resolve;const promise=new Promise(r=>resolve=r)
  const {v}=await open('index',{getDealerInventoryList:vi.fn(()=>promise)})
  await v.reload();const old=v.toggleProduct({productId:1,skuCount:2});await v.changeTab('low');resolve({items:[sku(1)],totalCount:1});await old
  expect(v.variants[1]).toBeUndefined()
 })
 it('clamps quantity and rejects unavailable SKUs without changing other selected products',async()=>{
  const draft=draftModule.useInventoryReturnDraft('1:1');expect(draft.set(sku(1),999)).toBe(true);expect(draft.state.items[0].quantity).toBe(5)
  expect(draft.set(sku(2,2,0),1)).toBe(false);expect(draft.state.items).toHaveLength(1)
 })
 it('caps at 500 variants and clears selections on account changes and logout',async()=>{
  const draft=draftModule.useInventoryReturnDraft('1:1');for(let n=1;n<=500;n++)expect(draft.set(sku(n),1)).toBe(true)
  expect(draft.set(sku(501),1)).toBe(false)
  const another=draftModule.useInventoryReturnDraft('1:2');expect(another.state.items).toHaveLength(0);expect(draft.set(sku(1))).toBe(false)
  another.set(sku(8));const {runSessionCleanup}=await import('@/shared/session/sessionCleanup.js');await runSessionCleanup();expect(another.state.items).toHaveLength(0);expect(another.owns()).toBe(false)
 })
 it('reviews every selected SKU in one read and groups them by product',async()=>{
  const draft=draftModule.useInventoryReturnDraft('1:1');draft.set(sku(1),2);draft.set(sku(2),1);draft.set(sku(3,2),3)
  const {v,api}=await open('review');await v.loadData()
  expect(api.getDealerInventoryReturnItems).toHaveBeenCalledTimes(1);expect(api.getDealerInventoryReturnItems).toHaveBeenCalledWith([1,2,3])
  expect(v.productGroups.value.map(group=>group.items.length)).toEqual([2,1]);v.form.reason='Return';expect(v.canSubmit.value).toBeTruthy()
 })
 it('preserves exceeded quantities for correction, blocks missing products and never silently drops them',async()=>{
  const draft=draftModule.useInventoryReturnDraft('1:1');draft.set(sku(1),4);draft.set(sku(3,2),2)
  const {v,api}=await open('review',{getDealerInventoryReturnItems:vi.fn(async()=>[sku(1,1,1)])});await v.loadData();v.form.reason='Return'
  expect(v.rows.value).toHaveLength(2);expect(v.rows.value[0].quantity).toBe(4);expect(v.rows.value[1].availableQuantity).toBe(0)
  await v.submit();expect(api.applyInventoryAfterSale).not.toHaveBeenCalled();v.removeItem(3);v.setQuantity(v.rows.value[0],1);expect(v.canSubmit.value).toBeTruthy()
 })
 it('submits one multi-SPU request with no warehouse and prevents double taps',async()=>{
  let finish;const apply=vi.fn(()=>new Promise(r=>finish=r)),draft=draftModule.useInventoryReturnDraft('1:1');draft.set(sku(1),2);draft.set(sku(3,2),1)
  const {v,api}=await open('review',{applyInventoryAfterSale:apply});await v.loadData();v.form.reason='Return';const one=v.submit();await v.submit()
  expect(api.applyInventoryAfterSale).toHaveBeenCalledTimes(1);const sent=apply.mock.calls[0][0];expect(sent.items).toEqual([{skuId:1,quantity:2},{skuId:3,quantity:1}]);expect(JSON.stringify(sent)).not.toContain('warehouse')
  finish({afterSaleId:55});await one;expect(draft.state.items).toHaveLength(0)
 })
 it('keeps the exact original key after a timeout even if read quantities changed, and blocks edits until resolved',async()=>{
  const draft=draftModule.useInventoryReturnDraft('1:1');draft.set(sku(1),3)
  const api=vi.fn().mockRejectedValueOnce(Object.assign(new Error('timeout'),{kind:'timeout'})).mockResolvedValue({afterSaleId:55})
  const first=await open('review',{applyInventoryAfterSale:api});await first.v.loadData();first.v.form.reason='Return';first.v.form.expressNo='  SF-ORIGINAL  ';await first.v.submit();const sent=api.mock.calls[0][0];expect(sent.expressNo).toBe('SF-ORIGINAL')
  expect(draft.state.pendingIntent).toBeTruthy();expect(draft.set(sku(2),1)).toBe(false);first.hooks.unload()
  const second=await open('review',{applyInventoryAfterSale:api,getDealerInventoryReturnItems:vi.fn(async()=>[sku(1,1,0)])});await second.v.loadData()
  expect(second.v.form.expressNo).toBe('SF-ORIGINAL');expect(second.v.locked.value).toBe(true);second.v.form.expressNo='CHANGED';expect(second.v.canSubmit.value).toBeTruthy();await second.v.submit();expect(api.mock.calls[1][0]).toEqual(sent);expect(draft.state.pendingIntent).toBeNull()
 })
 it('releases final business errors for correction and keeps the selection',async()=>{
  const draft=draftModule.useInventoryReturnDraft('1:1');draft.set(sku(1),3)
  const {v}=await open('review',{applyInventoryAfterSale:vi.fn().mockRejectedValue(Object.assign(new Error('stock changed'),{kind:'business'}))});await v.loadData();v.form.reason='Return';await v.submit()
  expect(draft.state.pendingIntent).toBeNull();expect(draft.state.items).toHaveLength(1);expect(v.locked.value).toBe(false)
 })
 it('unloaded review cannot publish a late success into another account',async()=>{
  let finish;const draft=draftModule.useInventoryReturnDraft('1:1');draft.set(sku(1),1)
  const {v,hooks,navigator}=await open('review',{applyInventoryAfterSale:vi.fn(()=>new Promise(r=>finish=r))});await v.loadData();v.form.reason='Return';const pending=v.submit();hooks.unload()
  const other=draftModule.useInventoryReturnDraft('1:2');other.set(sku(9));finish({afterSaleId:55});await pending
  expect(other.state.items[0].skuId).toBe(9);expect(navigator.redirectTo).not.toHaveBeenCalled()
 })
 it('batch API normalizes current quantities without exposing warehouse fields',async()=>{
  const dispatch=vi.fn().mockResolvedValue([{SkuId:1,ProductId:2,AvailableQuantity:4,Warehouses:[{WarehouseId:99}]}]);vi.doMock('@/shared/api/dispatchClient.js',()=>({dispatch}))
  const {getDealerInventoryReturnItems}=await import('@/shared/api/dealerInventoryReturnOptions.js');const result=await getDealerInventoryReturnItems([1,1]);expect(dispatch).toHaveBeenCalledWith('MallInventory','Mini.DealerInventoryController','GetReturnItems',{SkuIds:[1]});expect(result[0]).toMatchObject({skuId:1,productId:2,availableQuantity:4});expect(result[0]).not.toHaveProperty('warehouses')
 })
})

describe('inventory return express draft',()=>{
 it('keeps optional tracking when returning to selection and clears it on account switch',async()=>{
  const draft=draftModule.useInventoryReturnDraft('1:1');draft.set(sku(1),1)
  const first=await open('review');await first.v.loadData();first.v.form.expressNo='SF-SAVED';first.v.continueSelecting()
  const second=await open('review');expect(second.v.form.expressNo).toBe('SF-SAVED')
  draftModule.useInventoryReturnDraft('1:2');expect(draft.state.expressNo).toBe('')
 })
})
