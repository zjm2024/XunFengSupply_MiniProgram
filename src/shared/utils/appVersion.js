import { versionName, versionCode } from '@/manifest.json'

/** 开发运行使用项目版本，正式原生包使用实际安装包版本。 */
export function getAppVersionInfo() {
  const runtime = typeof plus !== 'undefined' ? plus.runtime : null
  const useNative = !import.meta.env.DEV && runtime
  return {
    versionCode: Number(useNative ? runtime.versionCode : versionCode),
    versionName: String(useNative ? runtime.version : versionName),
    source: useNative ? 'native-package' : import.meta.env.DEV ? 'manifest-development' : 'manifest-build',
  }
}

export function getAppVersionName() {
  return getAppVersionInfo().versionName
}
