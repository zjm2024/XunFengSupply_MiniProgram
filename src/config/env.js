/**
 * 环境配置 - 开发/测试/生产域名环境
 * 对应业务流程：全流程接口请求基础地址
 *
 * ⚠️ Phase 5 修复说明：
 *   1. 微信小程序环境不再强制使用生产域名，改为按 NODE_ENV 切换
 *   2. 开发环境指向本地后端 localhost:5002（Mini API 端口）
 *   3. 测试/生产环境域名与 Admin 前端保持一致
 */

const envConfig = {
  // 开发环境（本地后端）
  development: {
    baseUrl: 'http://localhost:5002',
    wsUrl: 'ws://localhost:5002',
    uploadUrl: 'http://localhost:5002',
    envName: '开发环境'
  },
  // 测试环境
  test: {
    baseUrl: 'https://test-api.kumpoo.cn',
    wsUrl: 'wss://test-ws.kumpoo.cn',
    uploadUrl: 'https://test-api.kumpoo.cn',
    envName: '测试环境'
  },
  // 生产环境
  production: {
    baseUrl: 'https://xf-book-api.kumpoo.cn',
    wsUrl: 'wss://xf-book-api.kumpoo.cn',
    uploadUrl: 'https://xf-book-api.kumpoo.cn',
    envName: '生产环境'
  }
}

/**
 * 获取当前环境配置
 *
 * 环境判断逻辑：
 * 1. 通过 Vite 的 import.meta.env.MODE 判断（development / production）
 * 2. 测试环境通过 VITE_API_ENV=test 手动指定
 * 3. 不再因为微信小程序环境就强制使用生产域名
 */
function getEnvConfig() {
  // 优先从环境变量读取（支持 .env 文件覆盖）
  const envMode = import.meta.env.VITE_API_ENV || import.meta.env.MODE || 'development'

  if (envMode === 'production') {
    return envConfig.production
  }

  if (envMode === 'test') {
    return envConfig.test
  }

  return envConfig.development
}

export default getEnvConfig()
