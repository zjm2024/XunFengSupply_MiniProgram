import { registerNamespace } from '@/shared/i18n/index.js'
import zhCN from './zh-CN.json'
import enUS from './en-US.json'

/** 订单分包在渲染前注册壳层/操作资源，不包含后端状态字典。 */
registerNamespace('order', { owner: 'subPackages/order', zhCN, enUS })
