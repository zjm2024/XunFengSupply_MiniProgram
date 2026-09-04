import { createSSRApp } from 'vue'
import App from './App.vue'
import pinia from './store/index.js'

export function createApp() {
  const app = createSSRApp(App)

  // 使用统一的 Pinia 实例（来自 store/index.js）
  app.use(pinia)

  return { app }
}
