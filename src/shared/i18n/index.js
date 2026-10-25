import { readonly, shallowRef } from 'vue'

const currentLocale = shallowRef('zh-CN')
const namespaces = new Map()
const missingKeys = new Set()

/** 业务语言仅支持两种，未知值最终回退中文；不改变 UniApp 框架语言。 */
export function normalizeLocale(value) {
  return /^en(?:-|$)/i.test(String(value ?? '').trim().replace(/_/g, '-')) ? 'en-US' : 'zh-CN'
}

/** 获取响应式业务语言，可在模板和 computed 中直接跟踪。 */
export function getLocale() {
  return currentLocale.value
}

/** 仅变更运行时语言；不访问存储、API、会话或分包。 */
export function setLocale(value) {
  currentLocale.value = normalizeLocale(value)
}

/** 注册所属包资源；同一模块重复调用幂等，其他来源占用命名空间立即报错。 */
export function registerNamespace(namespace, { owner, zhCN, enUS }) {
  if (!/^[a-z][a-zA-Z0-9]*$/.test(namespace) || !owner || !zhCN || !enUS) {
    throw new Error('Invalid i18n namespace registration')
  }
  const existing = namespaces.get(namespace)
  if (existing) {
    if (existing.owner === owner && existing.zhCN === zhCN && existing.enUS === enUS) return
    throw new Error('Duplicate i18n namespace: ' + namespace)
  }
  namespaces.set(namespace, { owner, zhCN, enUS })
}

/** 仅按资源路径查找，不以中文原文或状态 code 作为翻译键。 */
function findMessage(messages, path) {
  return path.reduce((value, part) => value && Object.prototype.hasOwnProperty.call(value, part)
    ? value[part] : undefined, messages)
}

/** 渲染稳定 key 与具名参数；英文缺失回退中文，不实现 ICU 或业务状态投影。 */
export function t(key, parameters = {}) {
  const [namespace, ...path] = String(key).split('.')
  const resources = namespaces.get(namespace)
  const locale = currentLocale.value
  const localized = resources && findMessage(locale === 'en-US' ? resources.enUS : resources.zhCN, path)
  const fallback = resources && findMessage(resources.zhCN, path)
  const message = typeof localized === 'string' && localized.trim() ? localized : fallback
  if (typeof message !== 'string') {
    if (import.meta.env?.DEV && !missingKeys.has(key)) {
      missingKeys.add(key)
      console.warn('[i18n] Missing resource:', key)
    }
    return String(key)
  }
  return message.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (token, name) =>
    Object.prototype.hasOwnProperty.call(parameters, name) ? String(parameters[name]) : token)
}

/** 提供只读 locale，调用方通过显式入口切换，避免绕过持久化桥接。 */
export const locale = readonly(currentLocale)
