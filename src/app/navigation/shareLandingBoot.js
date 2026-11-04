import { captureWechatReturn } from './shareWechatReturn.js'
import { APP_SURFACE } from '../config/shareSurface.js'
import { createShareLanding } from './shareLanding.js'
import { installSurfaceBrowserGuard } from './surfaceBrowserGuard.js'
// 早于 UniApp Router 初始化，首次直达不依赖 getCurrentPages()。
if (typeof window !== 'undefined' && APP_SURFACE.mode === 'share-h5') captureWechatReturn(window)
if (typeof window !== 'undefined') installSurfaceBrowserGuard(window, APP_SURFACE)
/** H5静态依赖最先求值，SSR/APP/小程序不读取window或执行访客网络。 */
export const shareLanding = APP_SURFACE.mode === 'share-h5' && typeof window !== 'undefined' ? createShareLanding(window, true) : null
shareLanding?.install()
