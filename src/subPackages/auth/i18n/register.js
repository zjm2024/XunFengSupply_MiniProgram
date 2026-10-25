import { registerNamespace } from '@/shared/i18n/index.js'
import zhCN from './zh-CN.json'
import enUS from './en-US.json'

/** 认证分包在页面渲染前独立注册，只管理认证壳层资源。 */
registerNamespace('auth', { owner: 'subPackages/auth', zhCN, enUS })
