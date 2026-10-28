import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({getHome:vi.fn(),getHomePreviews:vi.fn(),user:null,cleanup:[]}))
vi.mock('vue',async original=>({...await original(),onBeforeUnmount:fn=>mocks.cleanup.push(fn)}))
vi.mock('@/shared/api/homePage.js',()=>({getHome:mocks.getHome,getHomePreviews:mocks.getHomePreviews}))
vi.mock('@/shared/session/userStore.js',()=>({useUserStore:()=>mocks.user}))
import {effectScope,reactive,ref,nextTick} from 'vue'
import {useHomePage} from '@/shared/composables/useHomePage.js'
const home=(name='current',count=0)=>({mode:'custom',homePageId:name,configStamp:name+':1',canPurchase:true,components:Array.from({length:count},(_,index)=>({homeComponentId:String(index+1),componentType:5,config:{previewCount:8}}))})
const tick=async()=>{await Promise.resolve();await nextTick();await Promise.resolve()}
describe('首页状态与按需读取',()=>{
 let scope,active,state
 beforeEach(()=>{vi.useFakeTimers();mocks.cleanup=[];mocks.getHome.mockReset();mocks.getHomePreviews.mockReset();mocks.user=reactive({isLoggedIn:true,userId:1,dealerId:1,permissions:[]});scope=effectScope();active=ref(true)})
 afterEach(()=>{mocks.cleanup.forEach(fn=>fn());scope.stop();vi.clearAllTimers();vi.useRealTimers()})
 it('布局请求失败使用原首页模式',async()=>{mocks.getHome.mockRejectedValue(new Error('timeout'));state=scope.run(()=>useHomePage(active));await tick();expect(state.home.value.mode).toBe('default');expect(state.loading.value).toBe(false)})
 it('账号切换后旧账号响应不能覆盖新首页',async()=>{const resolve=[];mocks.getHome.mockImplementation(()=>new Promise(done=>resolve.push(done)));state=scope.run(()=>useHomePage(active));mocks.user.userId=2;await tick();expect(resolve).toHaveLength(2);resolve[1](home('new-account'));await tick();resolve[0](home('old-account'));await tick();expect(state.home.value.homePageId).toBe('new-account')})
 it('六个楼层按每批24件串行读取，避免滚动时并发放大',async()=>{mocks.getHome.mockResolvedValue(home('six',6));const pending=[];mocks.getHomePreviews.mockImplementation((definition,ids)=>new Promise(done=>pending.push({ids,done})));state=scope.run(()=>useHomePage(active));await tick();for(const id of ['3','4','5','6'])state.requestSection(id);await vi.advanceTimersByTimeAsync(31);expect(pending).toHaveLength(1);expect(pending[0].ids).toHaveLength(3);pending[0].done(pending[0].ids.map(id=>({homeComponentId:id,state:'ready',items:[]})));await tick();await vi.advanceTimersByTimeAsync(31);expect(pending).toHaveLength(2);expect(pending[1].ids).toHaveLength(3);pending[1].done([]);await tick()})
 it('首页隐藏时暂停未发出的楼层批次，返回后继续',async()=>{mocks.getHome.mockResolvedValue(home('visible',2));mocks.getHomePreviews.mockResolvedValue([]);state=scope.run(()=>useHomePage(active));await tick();active.value=false;await tick();await vi.advanceTimersByTimeAsync(100);expect(mocks.getHomePreviews).not.toHaveBeenCalled();active.value=true;await tick();await vi.advanceTimersByTimeAsync(31);expect(mocks.getHomePreviews).toHaveBeenCalledOnce()})
})
