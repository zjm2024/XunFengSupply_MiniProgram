import { versionName } from '@/manifest.json'

/** 原生客户端显示安装包版本，其他端显示当前构建版本。 */
export function getAppVersionName() {
  // #ifdef APP-PLUS
  if (typeof plus !== 'undefined' && plus.runtime?.version) return plus.runtime.version
  // #endif
  return versionName
}
