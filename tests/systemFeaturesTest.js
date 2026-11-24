import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
const m=vi.hoisted(()=>({read:vi.fn(),user:null,shows:[],clear:[]}))
vi.mock('@/shared/api/systemFeatures.js',()=>({getSystemFeatures:m.read}))
vi.mock('@/shared/session/userStore.js',()=>({useUserStore:()=>m.user}))
vi.mock('@/shared/session/sessionCleanup.js',()=>({registerSessionCleanup:(_,fn)=>m.clear.push(fn)}))
vi.mock('@dcloudio/uni-app',()=>({onShow:fn=>m.shows.push(fn)}))
let vue,scope,useSystemFeatures
const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve()}
beforeEach(async()=>{vi.resetModules();m.read.mockReset();m.shows=[];m.clear=[];vue=await import('vue');m.user=vue.reactive({userId:'1',dealerId:'1',token:'test',isLoggedIn:true});scope=vue.effectScope();({useSystemFeatures}=await import('@/shared/composables/useSystemFeatures.js'))})
afterEach(()=>scope.stop())
describe('系统功能配置策略',()=>{
 it('未知时隐藏，明确开启后展示，关闭后隐藏',async()=>{let done;m.read.mockImplementation(()=>new Promise(resolve=>done=resolve));const state=scope.run(useSystemFeatures);expect(state.afterSaleEnabled.value).toBe(false);done({afterSaleApplicationEnabled:true});await tick();expect(state.afterSaleEnabled.value).toBe(true);m.read.mockResolvedValue({afterSaleApplicationEnabled:false});await state.refreshFeatures();expect(state.afterSaleEnabled.value).toBe(false)})
 it('多页面并发读取合并，重新显示时再次校验',async()=>{let done;m.read.mockImplementation(()=>new Promise(resolve=>done=resolve));const a=scope.run(useSystemFeatures),b=scope.run(useSystemFeatures);a.refreshFeatures();b.refreshFeatures();expect(m.read).toHaveBeenCalledOnce();done({afterSaleApplicationEnabled:true});await tick();m.read.mockResolvedValue({afterSaleApplicationEnabled:false});await m.shows[0]();expect(m.read).toHaveBeenCalledTimes(2);expect(b.afterSaleEnabled.value).toBe(false)})
 it('切号后旧响应不能重新开放',async()=>{const requests=[];m.read.mockImplementation(()=>new Promise(done=>requests.push(done)));const state=scope.run(useSystemFeatures);m.user.userId='2';await vue.nextTick();requests[1]({afterSaleApplicationEnabled:false});await tick();requests[0]({afterSaleApplicationEnabled:true});await tick();expect(state.afterSaleEnabled.value).toBe(false)})
 it('网络失败隐藏，恢复后可重新开放',async()=>{m.read.mockResolvedValue({afterSaleApplicationEnabled:true});const state=scope.run(useSystemFeatures);await tick();m.read.mockRejectedValueOnce(new Error('offline'));await state.refreshFeatures();expect(state.afterSaleEnabled.value).toBe(false);await state.refreshFeatures();expect(state.afterSaleEnabled.value).toBe(true)})
 it('退出后迟到结果不能覆盖清理',async()=>{let done;m.read.mockImplementation(()=>new Promise(resolve=>done=resolve));const state=scope.run(useSystemFeatures);await m.clear[0]();done({afterSaleApplicationEnabled:true});await tick();expect(state.afterSaleEnabled.value).toBe(false)})
 it('未登录不请求配置',async()=>{m.user.isLoggedIn=false;const state=scope.run(useSystemFeatures);await tick();expect(m.read).not.toHaveBeenCalled();expect(state.afterSaleEnabled.value).toBe(false)})
})
it('关闭仅移除售后新申请动作，物流等原动作保留', async () => {
 const {getOrderActionButtons}=await import('@/subPackages/order/model/orderActions.js')
 expect(getOrderActionButtons(['afterSale','viewLogistics','confirmReceipt'],true,false).map(a=>a.key)).toEqual(['viewLogistics','confirmReceipt'])
 expect(getOrderActionButtons(['afterSale'],true,true).map(a=>a.key)).toEqual(['afterSale'])
})


/** 执行真实页面动作选择器，验证入口由功能开关、账号权限及服务端允许动作共同控制。 */
async function readPageActionSelector(file, name) {
 const {readFileSync}=await import('node:fs'), {parse}=await import('@vue/compiler-sfc'), {parse:parseJs}=await import('@babel/parser')
 const content=parse(readFileSync(file,'utf8')).descriptor.scriptSetup.content
 const ast=parseJs(content,{sourceType:'module'}), statement=ast.program.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name===name || node.type==='VariableDeclaration'&&node.declarations.some(item=>item.id.name===name))
 const expression=statement.type==='FunctionDeclaration'?content.slice(statement.start,statement.end):'const '+name+' = '+content.slice(statement.declarations.find(item=>item.id.name===name).init.arguments[0].start,statement.declarations.find(item=>item.id.name===name).init.arguments[0].end)
 return (context)=>new Function(...Object.keys(context),expression+';return '+name)(...Object.values(context))
}
it.each(['list','detail'])('订单%s按后台开关显示售后申请，且不越过权限和订单动作', async kind => {
 const {getOrderActionButtons}=await import('@/subPackages/order/model/orderActions.js')
 const file='src/subPackages/order/pages/'+kind+'/index.vue', name=kind==='list'?'getOrderActions':'actionButtons'
 const create=await readPageActionSelector(file,name), order={orderId:1,allowedActions:['afterSale','viewLogistics','confirmReceipt'],salesScene:1,itemCount:1}
 const enabled={value:true};let permitted=true
 const fn=create({getOrderActionButtons,userStore:{hasPermission:()=>permitted},afterSaleEnabled:enabled,reorderingOrderId:{value:null},reordering:{value:false},detail:{value:order},primaryShipment:{value:{trackingNo:'tracking'}},t:key=>key})
 const keys=()=> (kind==='list'?fn(order):fn()).map(item=>item.key)
 expect(keys()).toEqual(expect.arrayContaining(['afterSale','viewLogistics','confirmReceipt']))
 enabled.value=false
 expect(keys()).not.toContain('afterSale')
 expect(keys()).toEqual(expect.arrayContaining(['viewLogistics','confirmReceipt']))
 enabled.value=true
 expect(keys()).toContain('afterSale')
 permitted=false
 expect(keys()).not.toContain('afterSale');expect(keys()).toContain('viewLogistics')
 permitted=true;order.allowedActions=['viewLogistics','confirmReceipt']
 expect(keys()).not.toContain('afterSale')
})
it('售后列表入口与库存管理入口继续保留', async () => {
 const {readFileSync}=await import('node:fs'); const source=readFileSync('src/pages/home/tabs/TabAccount.vue','utf8')
 expect(source).toContain("key: 'after-sales'");expect(source).toContain('routes.order.afterSaleList()')
 expect(source).toContain("key: 'inventory'");expect(source).toContain('routes.account.inventoryOverview()')
})
