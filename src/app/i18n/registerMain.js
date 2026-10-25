import { registerNamespace } from '@/shared/i18n/index.js'
import commonZh from '@/shared/locales/common/zh-CN.json'
import commonEn from '@/shared/locales/common/en-US.json'
import mainZh from '@/app/locales/main/zh-CN.json'
import mainEn from '@/app/locales/main/en-US.json'

/** 主包仅注册 common 与 main，不引用任何分包资源。 */
export function registerMainLocales() {
  registerNamespace('common', { owner: 'shared/common', zhCN: commonZh, enUS: commonEn })
  registerNamespace('main', { owner: 'app/main', zhCN: mainZh, enUS: mainEn })
}
