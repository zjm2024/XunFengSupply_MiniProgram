import { registerNamespace } from '@/shared/i18n/index.js'
import zhCN from './zh-CN.json'
import enUS from './en-US.json'

/** 所属分包在页面渲染前注册壳层资源，不包含商品/资讯正文或业务状态。 */
registerNamespace('commerce', { owner: 'subPackages/commerce', zhCN, enUS })
