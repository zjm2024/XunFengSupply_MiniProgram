/**
 * 环境配置 - 开发/测试/生产域名环境
 * 对应业务流程：全流程接口请求基础地址
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
 */
function getEnvConfig() {
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
