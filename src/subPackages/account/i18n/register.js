import { registerNamespace } from '@/shared/i18n/index.js'
import zhCN from './zh-CN.json'
import enUS from './en-US.json'

/** 分包模块求值即注册，早于页面 setup/render；不加载其他业务域。 */
registerNamespace('account', { owner: 'subPackages/account', zhCN, enUS })
