// #ifdef H5
import './app/navigation/shareLandingBoot.js'
// #endif
import { createSSRApp } from 'vue'
import { getInputPlaceholderStyle } from './shared/composables/useResponsive.js'
import { createPinia } from 'pinia'
import { installNotificationLifecycle } from './shared/services/notificationLifecycle.js'
import App from './App.vue'
import { registerMainLocales } from './app/i18n/registerMain.js'
import { initializeAppLocale } from './app/i18n/localePersistence.js'
import { APP_SURFACE } from './app/config/shareSurface.js'
import { setLocale } from './shared/i18n/index.js'

/** 创建应用与会话容器；首版客户分享站固定中文，不继承经销商语言偏好。 */
export function createApp() {
  registerMainLocales()
  if (APP_SURFACE.mode === 'share-h5') setLocale('zh-CN')
  else initializeAppLocale()
  const app = createSSRApp(App)
  // 统一原生input/textarea提示，避免金额字号继承；getter保留窗口响应性。
  Object.defineProperty(app.config.globalProperties, '$inputPlaceholderStyle', { get: getInputPlaceholderStyle })
  const pinia = createPinia()
  app.use(pinia)
  if (APP_SURFACE.mode !== 'share-h5') installNotificationLifecycle(pinia)

  return { app }
}
