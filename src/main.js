import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { registerMainLocales } from './app/i18n/registerMain.js'
import { initializeAppLocale } from './app/i18n/localePersistence.js'

export function createApp() {
  registerMainLocales()
  initializeAppLocale()
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)

  return { app }
}
