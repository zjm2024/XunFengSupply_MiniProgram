import { HOME, PUBLIC_STOCK, STARTUP } from './routes.js'

/** 仅H5构建可选择分享表面，APP/小程序保持经销商启动流程。 */
export function createAppSurface(mode, platform) {
  if (mode && !['dealer', 'share-h5'].includes(mode)) throw new Error('Invalid VITE_APP_SURFACE')
  const surface = mode === 'share-h5' && platform === 'h5' ? 'share-h5' : 'dealer'
  return Object.freeze({ mode: surface, entry: surface === 'share-h5' ? STARTUP : HOME,
    publicEntry: PUBLIC_STOCK })
}
let platform = 'native'
// #ifdef H5
platform = 'h5'
// #endif
export const APP_SURFACE = createAppSurface(import.meta.env.VITE_APP_SURFACE || 'dealer', platform)
