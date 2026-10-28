import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest'
import { effectScope,reactive,ref,nextTick } from 'vue'
import { loadPageSetup } from './helpers/sfcHarness.js'

const api=vi.hoisted(()=>({dispatch:vi.fn()}))
vi.mock('@/shared/api/dispatchClient.js',()=>api)
import {normalizeHome,normalizeHomeProduct,getHomeSection,getHomePreviews} from '@/shared/api/homePage.js'
import {homeTargetRoute} from '@/shared/utils/homeNavigation.js'
const definition={mode:'custom',contractVersion:1,homePageId:'9007199254740993',configStamp:'p:1',canPurchase:true,components:[{homeComponentId:'9007199254740995',clientKey:'floor',componentType:5,config:{previewCount:4},items:[]}]}

describe('首页协议与受控导航',()=>{
 beforeEach(()=>api.dispatch.mockReset())
 it('保留long字符串精度且拒绝未知布局版本',()=>{expect(normalizeHome(definition).homePageId).toBe('9007199254740993');expect(()=>normalizeHome({...definition,contractVersion:2})).toThrow();expect(normalizeHome(null).mode).toBe('default')})
 it('缺失报价不会显示为零价，真实零价保留',()=>{expect(()=>normalizeHomeProduct({productId:'1',minCurrentPrice:null})).toThrow();expect(normalizeHomeProduct({productId:'1',minCurrentPrice:0}).price).toBe(0)})
 it('楼层分页仅提交受控范围和筛选参数',async()=>{api.dispatch.mockResolvedValue({homePageId:'1',homeComponentId:'2',items:[]});await getHomeSection({homePageId:'1',componentId:'2',configStamp:'1:8',pageNum:3,keyword:'球',sort:1,dealerId:999});expect(api.dispatch.mock.calls[0]).toEqual(['System','Mini.HomePageController','GetSectionProducts',{HomePageId:'1',HomeComponentId:'2',ConfigStamp:'1:8',Keyword:'球',Sort:1,PageNum:3,PageSize:20}])})
 it('批量楼层仍保留各层独立失败结果',async()=>{api.dispatch.mockResolvedValue([{homeComponentId:'1',state:'ready',items:[{productId:'10',minCurrentPrice:12}]},{homeComponentId:'2',state:'error'}]);const rows=await getHomePreviews(definition,['1','2']);expect(rows[0].items[0].price).toBe(12);expect(rows[1]).toMatchObject({state:'error',items:[]})})
 it('拒绝未注册的功能和任意路径，正确映射同页楼层',()=>{expect(homeTargetRoute({targetType:7,target:{feature:'https://example.com'}},definition)).toBeNull();expect(homeTargetRoute({targetType:3,target:{componentClientKey:'floor'}},definition)).toContain('componentId=9007199254740995');expect(homeTargetRoute({targetType:3,target:{id:'999'}},definition)).toBeNull()})
})

describe('通用专区并发与失效处理',()=>{
 let page,hook,requests,navigate
 beforeEach(async()=>{requests=[];navigate=vi.fn();page=await loadPageSetup('subPackages/commerce/pages/home-section/index.vue',async id=>{if(id==='vue')return import('vue');if(id==='@dcloudio/uni-app')return {onLoad:fn=>{hook=fn}};if(id.endsWith('/homePage.js'))return {getHomeSection:params=>new Promise((resolve,reject)=>requests.push({params,resolve,reject}))};if(id.endsWith('/i18n/index.js'))return {t:key=>key,getLocale:()=> 'zh-CN'};if(id.endsWith('/userStore.js'))return {useUserStore:()=>reactive({userId:1,dealerId:1,permissions:[]})};if(id.endsWith('/navigator.js'))return {navigator:{navigateTo:navigate,reLaunch:navigate}};if(id.endsWith('/routes.js'))return import('@/app/config/routes.js');return {default:{}}});hook({homePageId:'1',componentId:'2',configStamp:'1:7'})})
 afterEach(()=>page.stop())
 it('快速搜索时忽略旧页，失败不跳过页码',async()=>{page.bindings.keyword.value='new';page.bindings.reload();requests[0].resolve({items:[{productId:'old'}],hasMore:false});await nextTick();requests[1].resolve({items:[{productId:'new'}],hasMore:true,title:'专区',canPurchase:true});await nextTick();expect(page.bindings.items.value.map(p=>p.productId)).toEqual(['new']);page.bindings.loadMore();requests[2].reject(new Error('network'));await nextTick();page.bindings.loadMore();expect(requests[3].params.pageNum).toBe(2)})
 it('配置失效时清空商品且不给全量商品兜底',async()=>{requests[0].reject({errorCode:'SYSTEM.HOME_SCOPE_CHANGED'});await nextTick();expect(page.bindings.unavailable.value).toBe(true);expect(page.bindings.items.value).toEqual([]);expect(navigate).not.toHaveBeenCalled();page.bindings.loadMore();expect(requests).toHaveLength(1)})
})
