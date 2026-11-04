import { registerNamespace } from '@/shared/i18n/index.js'
import zhCN from './zh-CN.json'
import enUS from './en-US.json'

/** 分享分包自己注册双语资源，不让主包导入业务页面。 */
export function registerShareLocales() {
  registerNamespace('share', { owner: 'subPackages/share', zhCN, enUS })
}
