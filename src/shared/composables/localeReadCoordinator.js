import { getLocale } from '@/shared/i18n/index.js'

/**
 * 显式只读投影刷新协调器：合并读请求、拒绝迟到语种结果，隐藏页面延迟重取。
 * 仅可传入查询接口；禁止包装付款/下单/退款或读后写工作流。
 */
export function createLocaleReadCoordinator({ read, apply, onError, onBusy, isReady = () => true }) {
  let visible = false
  let disposed = false
  let generation = 0
  let queued = false
  let queuedReason = 'show'
  let flight = null
  let appliedLocale = null

  /** 检查是否被后续查询/语种替代；不取消网络请求，不影响请求层认证处理。 */
  function isStale(context) {
    if (disposed || context.generation !== generation) return true
    if (!visible) {
      queued = true
      queuedReason = context.reason
      return true
    }
    if (context.locale !== getLocale()) {
      generation++
      queued = true
      queuedReason = 'locale'
      return true
    }
    return false
  }

  /** 顺序执行查询；旧语种结果/错误不应用到页面，只保留一次最新查询。 */
  async function drain() {
    while (queued && visible && !disposed && isReady()) {
      queued = false
      const context = {
        generation,
        locale: getLocale(),
        reason: queuedReason,
        localeChanged: queuedReason === 'locale' || (appliedLocale !== null && appliedLocale !== getLocale()),
        isCurrent: () => !disposed && visible && context.generation === generation && context.locale === getLocale(),
      }
      try {
        const value = await read(context)
        if (isStale(context)) continue
        apply(value, context)
        appliedLocale = context.locale
      } catch (error) {
        if (!isStale(context)) onError?.(error, context)
      }
    }
  }

  /** 同一时刻仅有一个读流程；排队时不让现有 loading 提前结束。 */
  function pump() {
    if (flight) return flight
    if (disposed || !visible || !queued || !isReady()) return Promise.resolve()
    onBusy?.(true)
    flight = Promise.resolve().then(drain).finally(() => {
      flight = null
      onBusy?.(false)
      if (queued && visible && !disposed && isReady()) return pump()
    })
    return flight
  }

  /** 用户刷新/查询条件变化只替换旧读结果，保留最新查询等待执行。 */
  function refresh(reason = 'query') {
    if (disposed) return Promise.resolve()
    generation++
    queued = true
    queuedReason = reason
    return pump()
  }

  /** 语言变化只标记当前读投影过期，后台页面不立即发请求。 */
  function localeChanged() {
    return refresh('locale')
  }

  /** 页面显示时恢复最新只读查询；已有同语种在途请求不重复创建。 */
  function activate({ refresh: shouldRefresh = true } = {}) {
    if (disposed) return Promise.resolve()
    visible = true
    if (shouldRefresh && !flight && !queued) {
      queued = true
      queuedReason = 'show'
    }
    return pump()
  }

  /** 页面隐藏时暂停新查询，已经发出的网络请求自然完成。 */
  function deactivate() {
    visible = false
  }

  /** 页面卸载只禁止后续读投影应用，不中止或重发任何业务请求。 */
  function dispose() {
    disposed = true
    visible = false
    queued = false
    generation++
  }

  return { refresh, localeChanged, activate, deactivate, dispose }
}
