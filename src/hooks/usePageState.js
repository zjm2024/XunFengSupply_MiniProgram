/**
 * @file usePageState - 页面状态管理组合式函数
 * @description
 * 统一管理页面的数据加载状态，避免用 data.length === 0 同时推断"空"和"失败"。
 *
 * 状态流转：
 *   idle → loading → content | empty | error
 *   content → refreshing → content | error (保留旧内容 = hasStaleContent)
 *   content → loadingMore → content | error (分页追加失败)
 *   any → offline (网络断开)
 *
 * 使用方式：
 *   const { status, data, error, isLoading, isEmpty, isError, hasMore,
 *           isRefreshing, isLoadingMore, hasStaleContent,
 *           setLoading, setContent, setEmpty, setError, setOffline,
 *           refresh, loadMore, retry } = usePageState(fetchFn, options)
 *
 * @example
 * // 基础用法
 * const { status, data, refresh } = usePageState(async () => {
 *   return await api.getNewsList()
 * })
 *
 * @example
 * // 分页用法
 * const { status, data, loadMore, hasMore } = usePageState(
 *   async (page) => await api.getOrders({ page }),
 *   { pageSize: 10 }
 * )
 */

import { ref, computed, watch } from 'vue'
import { PageStatus } from '../config/pageState.js'
import { isAppError } from '../config/errors.js'

// ==================== 默认配置 ====================

const DEFAULT_OPTIONS = {
  /** 首次是否自动加载 */
  autoLoad: true,
  /** 每页条数（分页模式） */
  pageSize: 10,
  /** 空数据时是否显示 empty 状态（false 则保持 content+空数组） */
  showEmptyOnNoData: true,
  /** 错误时是否保留旧数据 */
  keepStaleDataOnError: true,
  /** 刷新失败时是否保留旧数据 */
  keepStaleDataOnRefreshFail: true,
}

// ==================== 主函数 ====================

/**
 * 创建页面状态管理器
 *
 * @param {Function} fetchFn - 数据获取函数
 *   - 无参调用：首载/刷新/重试
 *   - 接收 { page, pageSize }：分页加载更多
 *   - 返回数据（数组或对象）
 * @param {Object} [options={}] - 配置选项
 * @param {boolean} [options.autoLoad=true] - 是否自动加载
 * @param {number} [options.pageSize=10] - 分页大小
 * @param {boolean} [options.showEmptyOnNoData=true] - 空数据显示空状态
 * @param {boolean} [options.keepStaleDataOnError=true] - 错误时保留旧数据
 * @returns {Object} 状态管理 API
 */
export function usePageState(fetchFn, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // ==================== 响应式状态 ====================

  /** 当前页面状态 */
  const status = ref(PageStatus.IDLE)

  /** 数据列表/对象 */
  const data = ref(null)

  /** 错误对象（AppError 或 Error） */
  const error = ref(null)

  /** 当前页码（分页用） */
  const currentPage = ref(1)

  /** 是否还有更多数据 */
  const hasMore = ref(true)

  /** 是否正在刷新中 */
  const isRefreshing = ref(false)

  /** 是否正在加载更多 */
  const isLoadingMore = ref(false)

  /** 内部：是否有旧数据（用于区分首次加载失败 vs 刷新失败） */
  const _hasStaleContent = ref(false)

  // ==================== 计算属性 ====================

  /** 是否正在加载（首屏） */
  const isLoading = computed(() => status.value === PageStatus.LOADING)

  /** 是否为空状态 */
  const isEmpty = computed(() => status.value === PageStatus.EMPTY)

  /** 是否为错误状态 */
  const isError = computed(() => status.value === PageStatus.ERROR)

  /** 是否为离线状态 */
  const isOffline = computed(() => status.value === PageStatus.OFFLINE)

  /** 是否有内容 */
  const hasContent = computed(() => status.value === PageStatus.CONTENT)

  /** 是否有可用数据（content 或 有 stale 的 error） */
  const hasData = computed(() => {
    if (data.value === null || data.value === undefined) return false
    if (Array.isArray(data.value)) return data.value.length > 0
    return true
  })

  /** 错误时是否有旧数据可展示 */
  const hasStaleContent = computed(() => _hasStaleContent.value && hasData.value)

  // ==================== 状态设置方法 ====================

  /**
   * 设置加载中状态（首屏）
   */
  function setLoading() {
    status.value = PageStatus.LOADING
    error.value = null
  }

  /**
   * 设置内容状态
   * @param {*} newData - 新数据
   * @param {boolean} [isAppend=false] - 是否为追加（分页）
   */
  function setContent(newData, isAppend = false) {
    if (isAppend && Array.isArray(data.value) && Array.isArray(newData)) {
      data.value = [...data.value, ...newData]
    } else {
      data.value = newData
    }
    error.value = null
    _hasStaleContent.value = false

    // 判断是否应该显示 empty 或 content
    const isEmptyData = Array.isArray(newData)
      ? newData.length === 0
      : (newData === null || newData === undefined || newData === '')

    if (isEmptyData && opts.showEmptyOnNoData && !isAppend) {
      status.value = PageStatus.EMPTY
    } else {
      status.value = PageStatus.CONTENT
    }
  }

  /**
   * 设置空数据状态
   */
  function setEmpty() {
    status.value = PageStatus.EMPTY
    data.value = Array.isArray(data.value) ? [] : null
    error.value = null
  }

  /**
   * 设置错误状态
   * @param {Error|AppError|string} err - 错误信息
   */
  function setError(err) {
    error.value = err instanceof Error ? err : new Error(String(err))

    // 如果有旧数据且配置允许保留 → 显示错误但保留数据
    if (hasData.value && opts.keepStaleDataOnError) {
      _hasStaleContent.value = true
      status.value = PageStatus.ERROR
    } else if (_hasStaleContent.value) {
      // 之前有数据，刷新失败了
      status.value = PageStatus.ERROR
    } else {
      // 首次加载就失败
      status.value = PageStatus.ERROR
      data.value = null
    }
  }

  /**
   * 设置离线状态
   * @param {string} [message] - 离线提示
   */
  function setOffline(message) {
    status.value = PageStatus.OFFLINE
    if (message) {
      error.value = new Error(message)
    }
  }

  // ==================== 数据操作方法 ====================

  /**
   * 首次加载 / 重试
   * @returns {Promise<boolean>} 是否成功
   */
  async function retry() {
    return refresh()
  }

  /**
   * 刷新（保留旧数据直到成功）
   * @returns {Promise<boolean>} 是否成功
   */
  async function refresh() {
    // 如果已有数据，标记为 stale
    if (hasData.value) {
      _hasStaleContent.value = true
      isRefreshing.value = true
    } else {
      setLoading()
    }

    try {
      const result = await executeFetch()
      setContent(result, false)
      currentPage.value = 1
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      isRefreshing.value = false
    }
  }

  /**
   * 加载更多（分页）
   * @returns {Promise<boolean>} 是否成功且有数据
   */
  async function loadMore() {
    if (!hasMore.value || isLoadingMore.value) return false

    isLoadingMore.value = true
    const nextPage = currentPage.value + 1

    try {
      const result = await executeFetch(nextPage)

      if (Array.isArray(result) && result.length < opts.pageSize) {
        hasMore.value = false
      }

      if (Array.isArray(result) && result.length === 0) {
        hasMore.value = false
        // 没有更多数据了，但保持当前状态
        isLoadingMore.value = false
        return false
      }

      setContent(result, true) // 追加模式
      currentPage.value = nextPage
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      isLoadingMore.value = false
    }
  }

  /**
   * 执行数据获取（内部）
   * @param {number} [page=1] - 页码
   * @returns {Promise<*>}
   */
  async function executeFetch(page = 1) {
    try {
      // 如果 fetchFn 接受参数 → 传入分页信息；否则直接调用
      const result = await fetchFn({ page, pageSize: opts.pageSize })
      return result
    } catch (err) {
      // 统一处理取消请求
      if (isAppError(err) && err.kind === 'cancelled') {
        throw err
      }
      throw err
    }
  }

  /**
   * 重置所有状态到初始值
   */
  function reset() {
    status.value = PageStatus.IDLE
    data.value = null
    error.value = null
    currentPage.value = 1
    hasMore.value = true
    isRefreshing.value = false
    isLoadingMore.value = false
    _hasStaleContent.value = false
  }

  // ==================== 自动加载 ====================

  if (opts.autoLoad) {
    // 延迟到下一个微任务，确保调用者可以设置其他选项
    Promise.resolve().then(() => {
      refresh()
    })
  }

  // ==================== 返回 API ====================

  return {
    // 状态
    status,
    data,
    error,
    currentPage,
    hasMore,
    isRefreshing,
    isLoadingMore,

    // 计算属性
    isLoading,
    isEmpty,
    isError,
    isOffline,
    hasContent,
    hasData,
    hasStaleContent,

    // 状态设置
    setLoading,
    setContent,
    setEmpty,
    setError,
    setOffline,

    // 操作方法
    refresh,
    loadMore,
    retry,
    reset,
  }
}

export default usePageState
