/** APP 内 APK 下载与安装；页面销毁后停止下载并屏蔽迟到回调。 */
export function createOnlineUpdater(onState, native = typeof plus !== 'undefined' ? plus : null) {
  let task = null
  let packagePath = ''
  let packageUrl = ''
  let busy = false
  let disposed = false
  let generation = 0
  let deadline = null

  /** 只发布当前页面拥有的任务状态。 */
  function publish(state, extra = {}) {
    if (!disposed) onState({ state, ...extra })
  }

  /** 失败保留强制更新入口，允许重试；不把安装器打开当作升级完成。 */
  function fail(code, token) {
    if (disposed || token !== generation) return
    clearTimeout(deadline)
    busy = false
    publish('failed', { code })
  }

  /** 将完整本地 APK 交给系统，权限、签名和用户确认由系统安装器处理。 */
  function install(token) {
    clearTimeout(deadline)
    let rejected = false
    publish('installing')
    try {
      native.runtime.install(packagePath, { force: false }, () => {}, () => { rejected = true; fail('installFailed', token) })
      busy = false
      // APK 安装可能切走或结束旧进程，不能依赖成功回调解除等待。
      if (!rejected && !disposed && token === generation) publish('installerOpened')
    } catch {
      fail('installFailed', token)
    }
  }

  /** 每次点击最多创建一个下载；完整包重试安装时复用，不重复下载。 */
  function start(url) {
    if (disposed || busy) return
    const token = ++generation
    if (!native?.runtime || !native?.os) return fail('nativeOnly', token)
    const address = typeof url === 'string' ? url.trim() : ''
    if (native.os.name?.toLowerCase() === 'ios') {
      if (!/^https:\/\/apps\.apple\.com\/[\w\-/]+(?:\?[^\s]*)?$/i.test(address)) {
        return fail('downloadUnavailable', token)
      }
      try {
        let rejected = false
        native.runtime.openURL(address, () => { rejected = true; fail('storeFailed', token) })
        if (!rejected) publish('storeOpened')
      } catch { fail('storeFailed', token) }
      return
    }
    if (native.os.name?.toLowerCase() !== 'android' || !native.downloader) {
      return fail('nativeOnly', token)
    }
    // 沿用后端 HTTPS APK 直链，支持签名查询参数，不执行网页/脚本/本地地址。
    if (!/^https:\/\/[^\s/?#@]+\/[^\s?#]*\.apk(?:\?[^\s#]*)?$/i.test(address)) {
      return fail('downloadUnavailable', token)
    }
    busy = true
    if (packagePath && packageUrl === address) return install(token)
    packagePath = ''
    packageUrl = address
    publish('downloading', { progress: 0 })
    try {
      task = native.downloader.createDownload(address, {
        filename: `_doc/app-update/update-${Date.now()}-${token}.apk`, timeout: 120, retry: 0,
      }, (download, status) => {
        if (disposed || token !== generation || !busy) return
        clearTimeout(deadline)
        if (status !== 200 || !download.filename || download.downloadedSize <= 0 ||
          (download.totalSize > 0 && download.downloadedSize !== download.totalSize)) {
          task?.abort()
          task = null
          return fail('downloadFailed', token)
        }
        packagePath = download.filename
        task = null
        install(token)
      })
      task.addEventListener('statechanged', (download) => {
        if (disposed || token !== generation || !busy) return
        const progress = download.totalSize > 0
          ? Math.min(99, Math.max(0, Math.floor(download.downloadedSize * 100 / download.totalSize))) : null
        publish('downloading', { progress })
      })
      // 原生 timeout 只约束响应等待，额外限制本轮下载总时长。
      deadline = setTimeout(() => {
        if (disposed || token !== generation || !busy) return
        task?.abort()
        task = null
        fail('downloadFailed', token)
      }, 10 * 60 * 1000)
      task.start()
    } catch {
      task?.abort()
      task = null
      fail('downloadFailed', token)
    }
  }

  /** 只取消本实例下载，不枚举或清理其他下载；已交给安装器的包保持可读。 */
  function dispose() {
    disposed = true
    generation++
    clearTimeout(deadline)
    task?.abort()
    task = null
    busy = false
  }

  return { start, dispose }
}
