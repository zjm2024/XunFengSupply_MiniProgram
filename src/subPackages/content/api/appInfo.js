import { checkAppVersion } from '@/app/bootstrap/bootstrapApi.js'

/** 复用启动期版本检测协议，页面仅传领域参数，不重复维护调度接口。 */
export function checkAppUpdate({ platform, versionCode, versionName }) {
  return checkAppVersion({ Platform: platform, VersionCode: versionCode, VersionName: versionName })
}
