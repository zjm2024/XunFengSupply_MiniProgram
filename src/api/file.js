/**
 * 文件上传接口 - 七牛云对象存储
 *
 * 后端映射：
 *   Module: System
 *   - Mini.QiniuController → GetUploadToken / GetApplicationUploadToken
 */

import { dispatch } from './base.js'

const QINIU_UPLOAD_URL = import.meta.env.VITE_QINIU_UPLOAD_URL || 'https://upload-z2.qiniup.com'
const APPLICATION_LICENSE_SCENE = 'dealer-application-license'
const TOKEN_SAFETY_WINDOW_MS = 5 * 60 * 1000

const credentialCache = new Map()
const credentialInflight = new Map()

function normalizeCredential(data) {
  const expiresAtValue = Number(data?.expiresAt ?? data?.ExpiresAt ?? 0)
  return {
    token: String(data?.token ?? data?.Token ?? ''),
    cdnDomain: String(data?.cdnDomain ?? data?.CdnDomain ?? '').replace(/\/+$/, ''),
    expiresAt: expiresAtValue > 1e12 ? expiresAtValue : expiresAtValue * 1000,
  }
}

function hasValidCredential(credential) {
  return Boolean(
    credential?.token &&
    credential?.cdnDomain &&
    credential.expiresAt > Date.now() + TOKEN_SAFETY_WINDOW_MS,
  )
}

function getUploadCredential(scene) {
  const cacheKey = scene || 'default'
  const cached = credentialCache.get(cacheKey)
  if (hasValidCredential(cached)) return Promise.resolve(cached)
  if (credentialInflight.has(cacheKey)) return credentialInflight.get(cacheKey)

  const isApplicationLicense = scene === APPLICATION_LICENSE_SCENE
  const method = isApplicationLicense ? 'GetApplicationUploadToken' : 'GetUploadToken'
  const params = isApplicationLicense ? {} : { key: 'mini/uploads' }

  const request = dispatch(
    'System',
    'Mini.QiniuController',
    method,
    params,
    { anonymous: isApplicationLicense },
  )
    .then((data) => {
      const credential = normalizeCredential(data)
      if (!hasValidCredential(credential)) {
        throw new Error('上传凭证无效，请稍后重试')
      }
      credentialCache.set(cacheKey, credential)
      return credential
    })
    .finally(() => credentialInflight.delete(cacheKey))

  credentialInflight.set(cacheKey, request)
  return request
}

function uploadToQiniu(filePath, credential) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: QINIU_UPLOAD_URL,
      filePath,
      name: 'file',
      formData: { token: credential.token },
      success: (response) => {
        let result
        try {
          result = JSON.parse(response.data || '{}')
        } catch {
          reject(new Error('上传服务返回格式异常'))
          return
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(result?.error || '图片上传失败，请稍后重试'))
          return
        }

        const key = String(result?.key || '').replace(/^\/+/, '')
        if (!key) {
          reject(new Error('上传成功但未返回文件地址'))
          return
        }

        resolve({ key, url: `${credential.cdnDomain}/${key}` })
      },
      fail: () => reject(new Error('图片上传失败，请检查网络后重试')),
    })
  })
}

/**
 * 上传图片到对象存储。
 * @param {string} filePath uni.chooseImage 返回的本地文件路径
 * @param {{ scene?: string }} options 上传场景
 */
export async function uploadImage(filePath, options = {}) {
  if (!filePath) throw new Error('请选择需要上传的图片')
  const credential = await getUploadCredential(options.scene)
  return uploadToQiniu(filePath, credential)
}

export { APPLICATION_LICENSE_SCENE }
