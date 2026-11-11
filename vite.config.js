import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'
import { createReadStream, existsSync } from 'node:fs'
import { SHARE_PUBLIC_ROUTES } from './src/app/config/sharePublicRoutes.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [uni(), {
      name: 'private-pdf-dev-assets',
      configureServer(server) {
        const assets = new Map([
          ['/subPackages/content/static/pdf-viewer/index.html', 'text/html; charset=utf-8'],
          ['/subPackages/content/static/pdf-viewer/viewer.js', 'application/javascript; charset=utf-8'],
          ['/subPackages/content/static/pdf-viewer/viewer.css', 'text/css; charset=utf-8'],
          ['/subPackages/content/static/pdf-viewer/pdfjs.js', 'application/javascript; charset=utf-8'],
          ['/subPackages/auth/static/pdf-worker/pdfjsworker.js', 'application/javascript; charset=utf-8'],
        ])
        // UniApp 分包静态目录在构建时复制，开发模式需在 SPA 回退之前提供阅读器文件。
        server.middlewares.use((request, response, next) => {
          const pathname = new URL(request.url, 'http://localhost').pathname
          const contentType = assets.get(pathname)
          if (!contentType) return next()
          const filename = path.resolve(__dirname, 'src' + pathname)
          if (!existsSync(filename)) {
            response.statusCode = 404
            response.end('PDF viewer asset not found')
            return
          }
          response.setHeader('Content-Type', contentType)
          createReadStream(filename).pipe(response)
        })
      },
    }, {
      name: 'share-public-route',
      enforce: 'post',
      // UniApp 保留真实页面元数据，公开 H5 路由使用短地址；原地址兼容旧链接。
      transform(code, id) {
        if (process.env.UNI_PLATFORM !== 'h5' || !id.includes('pages-json-js')) return
        let result = code
        for (const [internal, external] of Object.entries(SHARE_PUBLIC_ROUTES)) {
          const source = "path:'" + internal + "',"
          if (!result.includes(source)) throw new Error('分享短路由生成失败：' + internal)
          result = result.replace(source, "path:'" + external + "',alias:'" + internal + "',")
        }
        return result
      },
    }],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:5002',
          changeOrigin: false,
        },
      },
    },
    build: {
      rollupOptions: { output: { manualChunks: undefined } },
    },
  }
})
