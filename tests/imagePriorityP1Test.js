import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
let cache, requests, records
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve()}
beforeEach(async()=>{
 vi.resetModules();requests=[];records=new Map()
 vi.stubGlobal('uni',{
  getAppBaseInfo:()=>({uniPlatform:'app'}),getStorageSync:k=>records.get(k),setStorageSync:(k,v)=>records.set(k,v),
  getStorageInfoSync:()=>({keys:[...records.keys()]}),removeStorageSync:k=>records.delete(k),
  getFileInfo:o=>o.success({size:100}),getSavedFileInfo:o=>o.success({size:100}),
  saveFile:o=>o.success({savedFilePath:'saved:'+o.tempFilePath}),removeSavedFile:o=>o.success(),
  downloadFile:vi.fn(o=>{const task={...o,abort:vi.fn(()=>o.fail())};requests.push(task);return task}),
 })
 cache=await import('@/shared/utils/resourceCache.js')
})
afterEach(async()=>{for(const task of requests)task.fail();await settle();await cache.clearResourceCache();vi.unstubAllGlobals();vi.useRealTimers()})
const source=id=>'https://cdn.test/'+id+'.jpg'
const finish=index=>requests[index].success({statusCode:200,tempFilePath:'file'+index})

describe('可见优先和共享取消',()=>{
 it('四槽占满时可见任务优先于附近和后台，维持并发四',async()=>{
  const blocking=Array.from({length:4},(_,i)=>cache.getCachedResource(source(i)))
  await settle();expect(requests).toHaveLength(4)
  const background=cache.getCachedResource(source('background'))
  const near=cache.requestCachedResource(source('near'),{priority:1})
  const visible=cache.requestCachedResource(source('visible'),{priority:0})
  await settle();expect(requests).toHaveLength(4)
  finish(0);await settle();expect(requests[4].url).toBe(source('visible'))
  finish(1);await settle();expect(requests[5].url).toBe(source('near'))
  finish(2);await settle();expect(requests[6].url).toBe(source('background'))
  for(let i=3;i<7;i++)finish(i)
  await Promise.all([...blocking,background,near.promise,visible.promise])
 })
 it('视口进入可以提升已排队任务优先级，离屏队列不再下载',async()=>{
  Array.from({length:4},(_,i)=>cache.getCachedResource(source(i)))
  const first=cache.requestCachedResource(source('first'),{priority:1})
  const promoted=cache.requestCachedResource(source('promoted'),{priority:1})
  const cancelled=cache.requestCachedResource(source('cancelled'),{priority:0})
  cancelled.release();promoted.setPriority(0)
  await settle();finish(0);await settle()
  expect(requests[4].url).toBe(source('promoted'))
  first.release();finish(4);await promoted.promise;await cancelled.promise;await first.promise
  expect(requests.some(x=>x.url===source('cancelled')||x.url===source('first'))).toBe(false)
 })
 it('同图多人订阅只下载一次，单人离开不取消，最后离开才abort',async()=>{
  const first=cache.requestCachedResource(source('same'))
  const second=cache.requestCachedResource(source('same'))
  await settle();expect(requests).toHaveLength(1)
  first.release();expect(requests[0].abort).not.toHaveBeenCalled()
  second.release();expect(requests[0].abort).not.toHaveBeenCalled()
  await new Promise(resolve=>setTimeout(resolve,140));expect(requests[0].abort).toHaveBeenCalledOnce()
  await Promise.all([first.promise,second.promise])
  expect(cache.getCachedResourcePath(source('same'))).toBe('')
 })
 it('原Promise调用仍持有任务，组件释放不得误取消',async()=>{
  const original=cache.getCachedResource(source('same'))
  const component=cache.requestCachedResource(source('same'))
  await settle();component.release();expect(requests[0].abort).not.toHaveBeenCalled()
  finish(0);expect(await original).toBe(await component.promise)
 })
 it('取消后重新订阅可重试，不接收旧任务，清缓存代际保持',async()=>{
  const first=cache.requestCachedResource(source('again'))
  await settle();first.release()
  await new Promise(resolve=>setTimeout(resolve,140))
  const next=cache.requestCachedResource(source('again'))
  await settle();expect(requests).toHaveLength(2)
  finish(1);expect(await next.promise).toBe('saved:file1');await first.promise
  expect(cache.getCachedResourcePath(source('again'))).toBe('saved:file1')
  await cache.clearResourceCache();expect(cache.getCachedResourcePath(source('again'))).toBe('')
 })
})

it('附近/视口持续变化和页面隐藏恢复更新可请求状态，卸载断开两路观察',async()=>{
 const fs=await import('node:fs')
 const vue=await import('vue')
 const code=fs.readFileSync('src/shared/composables/useImageVisibility.js','utf8').replace(/^import[^\n]+\n/gm,'').replace('export function','function')
 let mounted,unmount,hide,show
 const observers=[]
 uni.createIntersectionObserver=()=>{
  const observer={relativeToViewport:()=>observer,observe:(selector,callback)=>{observer.signal=callback},disconnect:vi.fn()}
  observers.push(observer);return observer
 }
 const use=new Function('getCurrentInstance','onBeforeUnmount','onMounted','ref','onHide','onShow',code+';return useImageVisibility')(
  ()=>({proxy:{}}),cb=>{unmount=cb},cb=>{mounted=cb},vue.ref,cb=>{hide=cb},cb=>{show=cb})
 const state=use(()=>true,'.image');mounted()
 expect(state.value).toBe(false);observers[0].signal({intersectionRatio:.1});expect(state.value).toBe(false)
 await new Promise(resolve=>setTimeout(resolve,180));expect(state.value).toBe(true)
 expect(state.priority.value).toBe(1);observers[1].signal({intersectionRatio:1});expect(state.priority.value).toBe(0)
 hide();expect(state.value).toBe(false);show();await new Promise(resolve=>setTimeout(resolve,80));expect(state.value).toBe(true)
 observers[0].signal({intersectionRatio:0});expect(state.value).toBe(false)
 unmount();expect(observers.every(x=>x.disconnect.mock.calls.length===1)).toBe(true)
 observers[0].signal({intersectionRatio:1});expect(state.value).toBe(false)
})

it.each(['/static/logo.png','file:///local/image.jpg','data:image/png;base64,AA','blob:local-id'])('本地及非HTTP来源%s保持原地址且不下载',async address=>{
 const request=cache.requestCachedResource(address,{kind:'image'})
 expect(await request.promise).toBe(address)
 expect(uni.downloadFile).not.toHaveBeenCalled()
 request.release()
})

it('原生abort异常时继续占用下载槽，不启动第五个网络请求',async()=>{
 const requestsHeld=Array.from({length:4},(_,i)=>cache.requestCachedResource(source(i)))
 await settle();requests[0].abort.mockImplementation(()=>{throw Error('unsupported abort')})
 requestsHeld[0].release()
 await new Promise(resolve=>setTimeout(resolve,140))
 expect(requests[0].abort).toHaveBeenCalledOnce()
 const queued=cache.requestCachedResource(source('fifth'))
 await settle();expect(requests).toHaveLength(4)
 finish(0);await settle();expect(requests).toHaveLength(5)
 for(let i=1;i<5;i++)finish(i)
 await Promise.all([...requestsHeld.map(x=>x.promise),queued.promise])
})
