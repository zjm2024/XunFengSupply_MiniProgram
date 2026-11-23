import { readFileSync } from 'node:fs'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { ref, watch, effectScope, nextTick } from 'vue'

const source = readFileSync('src/shared/composables/useImageVisibility.js', 'utf8')
  .replace(/^import[^\n]+\n/gm, '').replace('export function', 'function')
let cache, requests, scopes, owners, instances
const tick = async () => { for (let i = 0; i < 10; i++) { await nextTick(); await Promise.resolve() } }

function visibility({ lazy = true, supported = true, throws = false } = {}) {
  const observers = [], hooks = {}
  uni.createIntersectionObserver = supported ? () => {
    if (throws) throw Error('unsupported')
    const observer = { relativeToViewport: () => observer, observe: (_, callback) => { observer.signal = callback }, disconnect: vi.fn() }
    observers.push(observer)
    return observer
  } : undefined
  const use = new Function('getCurrentInstance', 'onBeforeUnmount', 'onMounted', 'ref', 'onHide', 'onShow', source + ';return useImageVisibility')(
    () => ({ proxy: {} }), callback => { hooks.unmount = callback }, callback => { hooks.mount = callback }, ref,
    callback => { hooks.hide = callback }, callback => { hooks.show = callback })
  const state = use(() => lazy, '.image')
  hooks.mount?.()
  const result = { state, observers, near: ratio => observers[0].signal({ intersectionRatio: ratio }),
    visible: ratio => observers[1].signal({ intersectionRatio: ratio }), hooks }
  instances.push(result)
  return result
}

beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers(); requests = []; scopes = []; owners = []; instances = []
  const records = new Map()
  vi.stubGlobal('uni', {
    getAppBaseInfo: () => ({ uniPlatform: 'app' }),
    getStorageSync: key => records.get(key), setStorageSync: (key, value) => records.set(key, value),
    getStorageInfoSync: () => ({ keys: [...records.keys()] }), removeStorageSync: key => records.delete(key),
    getFileInfo: options => options.success({ size: 100 }), getSavedFileInfo: options => options.success({ size: 100 }),
    saveFile: options => options.success({ savedFilePath: 'saved:' + options.tempFilePath }), removeSavedFile: options => options.success(),
    downloadFile: vi.fn(options => { const task = { ...options, abort: vi.fn(() => options.fail()) }; requests.push(task); return task }),
  })
  cache = await import('@/shared/utils/resourceCache.js')
})
afterEach(async () => {
  instances.forEach(instance => instance.hooks.unmount?.())
  owners.forEach(owner => owner.release()); scopes.forEach(scope => scope.stop())
  requests.forEach(request => request.fail()); await tick(); await cache.clearResourceCache()
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks()
})

function subscribe(instance, url) {
  const scope = effectScope(); scopes.push(scope)
  let owner
  scope.run(() => {
    watch(instance.state, allowed => {
      owner?.release()
      if (allowed) { owner = cache.requestCachedResource(url, { kind: 'image', priority: instance.state.priority.value }); owners.push(owner) }
    }, { immediate: true })
  })
  return () => owner
}

describe('快速滑过与往返复用', () => {
  it('100张图片各掠过16毫秒均不启动，停留底部64毫秒才请求最终图', async () => {
    for (let index = 0; index < 100; index++) {
      const instance = visibility(); subscribe(instance, 'https://cdn.test/' + index + '.jpg')
      instance.near(1); instance.visible(1)
      await vi.advanceTimersByTimeAsync(16)
      instance.near(0); instance.visible(0)
    }
    await tick(); expect(uni.downloadFile).not.toHaveBeenCalled()
    const last = visibility(); subscribe(last, 'https://cdn.test/bottom.jpg')
    last.near(1); last.visible(1)
    await vi.advanceTimersByTimeAsync(63); expect(requests).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1); await tick()
    expect(requests).toHaveLength(1); expect(requests[0].url).toBe('https://cdn.test/bottom.jpg')
  })
  it('仅附近稳定160毫秒预取，进入视口后采用较短门槛', async () => {
    const nearby = visibility(); nearby.near(1)
    await vi.advanceTimersByTimeAsync(159); expect(nearby.state.value).toBe(false)
    await vi.advanceTimersByTimeAsync(1); expect(nearby.state.value).toBe(true)
    const promoted = visibility(); promoted.near(1)
    await vi.advanceTimersByTimeAsync(40); promoted.visible(1)
    await vi.advanceTimersByTimeAsync(64); expect(promoted.state.value).toBe(true)
    expect(promoted.state.priority.value).toBe(0)
  })
  it('等待期间隐藏或卸载清掉定时，旧观察回调不能重新启动', async () => {
    const hidden = visibility(); hidden.near(1); hidden.visible(1)
    await vi.advanceTimersByTimeAsync(30); hidden.hooks.hide()
    await vi.advanceTimersByTimeAsync(200); expect(hidden.state.value).toBe(false)
    hidden.hooks.show(); await vi.advanceTimersByTimeAsync(64); expect(hidden.state.value).toBe(true)
    const removed = visibility(); removed.near(1); removed.hooks.unmount()
    removed.visible(1); await vi.advanceTimersByTimeAsync(200); expect(removed.state.value).toBe(false)
  })
  it('离屏后120毫秒内重新订阅共享原下载，不abort或重复下载', async () => {
    const first = cache.requestCachedResource('https://cdn.test/back.jpg'); owners.push(first)
    await tick(); first.release()
    await vi.advanceTimersByTimeAsync(80)
    const next = cache.requestCachedResource('https://cdn.test/back.jpg'); owners.push(next)
    await vi.advanceTimersByTimeAsync(100)
    expect(requests).toHaveLength(1); expect(requests[0].abort).not.toHaveBeenCalled()
    requests[0].success({ statusCode: 200, tempFilePath: 'same' }); await tick()
    expect(await next.promise).toBe(await first.promise)
  })
  it('超过宽限且无人使用则取消，排队任务仍立即撤销', async () => {
    const blockers = Array.from({ length: 4 }, (_, index) => cache.requestCachedResource('https://cdn.test/' + index)); owners.push(...blockers)
    await tick()
    const queued = cache.requestCachedResource('https://cdn.test/queued', { priority: 1 }); owners.push(queued); queued.release()
    await tick(); blockers[0].release()
    await vi.advanceTimersByTimeAsync(119); expect(requests[0].abort).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1); await tick(); expect(requests[0].abort).toHaveBeenCalledOnce()
    expect(requests.some(request => request.url.endsWith('/queued'))).toBe(false)
  })
  it('当前屏任务等待时立即回收无人使用的宽限任务，不等120毫秒', async () => {
    const blockers = Array.from({ length: 4 }, (_, index) => cache.requestCachedResource('https://cdn.test/' + index)); owners.push(...blockers)
    await tick(); blockers[0].release()
    const visible = cache.requestCachedResource('https://cdn.test/visible', { priority: 0 }); owners.push(visible)
    await tick(); expect(requests[0].abort).toHaveBeenCalledOnce()
    expect(requests).toHaveLength(5); expect(requests[4].url).toBe('https://cdn.test/visible')
  })
  it('另一个消费者持有的下载不受宽限取消影响', async () => {
    const first = cache.requestCachedResource('https://cdn.test/shared'), next = cache.requestCachedResource('https://cdn.test/shared'); owners.push(first, next)
    await tick(); first.release(); await vi.advanceTimersByTimeAsync(200)
    expect(requests[0].abort).not.toHaveBeenCalled()
  })
  it('观察能力不可用或显式非懒加载时立即放行', () => {
    expect(visibility({ supported: false }).state.value).toBe(true)
    expect(visibility({ lazy: false }).state.value).toBe(true)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fallback = visibility({ throws: true }); expect(fallback.state.value).toBe(true)
    fallback.hooks.hide(); fallback.hooks.show(); expect(fallback.state.value).toBe(true)
  })
})
