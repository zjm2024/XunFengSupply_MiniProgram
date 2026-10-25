import { ref } from 'vue'
import { locale } from '@/shared/i18n/index.js'
import { setAppLocale } from '@/app/i18n/localePersistence.js'
import { updateLanguage } from '@/shared/api/auth.js'
import { useUserStore } from '@/shared/session/userStore.js'

/** 账户偏好同步仅由用户点选触发；不注册语言监听器、不重试任何业务请求。 */
export function useLanguageSettings() {
  const saving = ref(false)
  const syncFailed = ref(false)
  const userStore = useUserStore()

  /** 本机立即生效；已登录时单次保存账号偏好，失败保留本机语言并允许显式重试。 */
  async function selectLanguage(value) {
    if (saving.value || (locale.value === value && !syncFailed.value)) return null
    const selected = setAppLocale(value)
    syncFailed.value = false
    if (!userStore.token) return 'local'
    saving.value = true
    try {
      await updateLanguage(selected)
      return 'saved'
    } catch {
      syncFailed.value = true
      return 'local-only'
    } finally {
      saving.value = false
    }
  }

  return { saving, syncFailed, selectLanguage }
}
