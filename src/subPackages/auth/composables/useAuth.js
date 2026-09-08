/**
 * 签约、登录、账号状态校验逻辑组合式钩子
 *
 * ⚠️ 重要说明（对接后端 System.AuthController 后）：
 *   - 登录接口改为账号密码模式（非验证码）
 *   - checkAccountStatus 已废弃，后端 Login 接口在账号异常时直接返回错误码
 *   - verifyAccountStatus 改为通过 GetCurrentUser 异步获取
 *
 * 对应业务流程节点：
 * 1. 签约准入 → 提交资质、查询签约状态
 * 2. 登录认证 → 账号密码登录、Token管理
 * 3. 账号状态 → 冻结检测、路由拦截
 */
import { ref } from 'vue'
import { useUserStore } from '../../../shared/session/userStore.js'
import { login, getCurrentUser, applySign, sendCode, getSignStatus } from '../api/auth.js'
import { validateSignForm, validatePhone, validateCode } from '../../../shared/utils/validate.js'
import { navigator } from '../../../app/navigation/navigator.js'
import { routes } from '../../../app/config/routes.js'

export function useAuth() {
  const userStore = useUserStore()
  const loading = ref(false)

  // ==================== 签约相关 ====================

  /**
   * 检查签约状态并决定跳转
   * @returns {Object} { isSigned, status }
   */
  async function checkSignStatus() {
    try {
      const res = await getSignStatus()
      userStore.setSignStatus(res.status)
      return { 
        isSigned: res.status === 2, 
        status: res.status 
      }
    } catch (e) {
      console.error('检查签约状态失败:', e)
      return { isSigned: false, status: 0 }
    }
  }

  /**
   * 提交签约申请
   * @param {Object} formData - 表单数据
   * @returns {Promise<Object>} 提交结果
   */
  async function submitSignApplication(formData) {
    // 表单校验
    const { valid, firstError } = validateSignForm(formData)
    if (!valid) {
      return { success: false, error: firstError }
    }

    loading.value = true
    try {
      await applySign(formData)
      // 更新本地签约状态为审核中
      userStore.setSignStatus(1)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message || '提交失败' }
    } finally {
      loading.value = false
    }
  }

  // ==================== 登录相关 ====================

  /**
   * 发送验证码
   * ⚠️ 后端尚未实现验证码功能
   * @param {string} phone - 手机号
   * @returns {Promise<boolean>}
   */
  async function sendLoginCode(phone) {
    const phoneError = validatePhone(phone)
    if (phoneError) {
      uni.showToast({ title: phoneError, icon: 'none' })
      return false
    }

    try {
      await sendCode(phone)
      return true
    } catch (e) {
      uni.showToast({ title: e.message || '发送失败', icon: 'none' })
      return false
    }
  }

  /**
   * 账号密码登录（对接后端 System.AuthController.Login）
   * @param {string} username - 账号
   * @param {string} password - 密码
   * @returns {Promise<Object>} 登录结果
   */
  async function performLogin(username, password) {
    if (!username || !password) {
      return { success: false, error: '请输入账号和密码' }
    }

    loading.value = true
    try {
      // 调用后端登录接口
      const res = await login(username, password)

      // 存储完整登录信息到 Store（Token + 用户信息 + 权限）
      userStore.setLoginData(res)

      return { success: true }
    } catch (e) {
      return { success: false, error: e.message || '登录失败' }
    } finally {
      loading.value = false
    }
  }

  // ==================== 账号状态校验 ====================

  /**
   * 校验账号状态（通过 GetCurrentUser 接口获取最新用户信息）
   * ⚠️ 替代旧的 checkAccountStatus，后端未实现单独的状态查询接口
   *
   * @returns {Promise<boolean>} 是否正常
   */
  async function verifyAccountStatus() {
    try {
      // 通过 GetCurrentUser 获取最新用户信息
      const userInfo = await getCurrentUser()

      // 更新 Store 中的用户信息
      userStore.setLoginData({
        token: userStore.token,
        refreshToken: userStore.refreshToken,
        expiresIn: userStore.tokenExpiresIn,
        userInfo: userInfo,
      })

      // 检查账号状态（后端 status: 1=正常, 0=禁用）
      if (userInfo.status === 0) {
        userStore.setFrozenStatus(true)
        redirectToFrozenPage('账号已被禁用')
        return false
      }

      userStore.setAccountStatus(userInfo.status || 1)
      return true
    } catch (e) {
      console.error('账号状态校验失败:', e)
      return true // 接口异常时放行，避免阻塞用户
    }
  }

  /**
   * 跳转到冻结提示页
   */
  function redirectToFrozenPage(reason) {
    navigator.reLaunch(routes.auth.accountStatus(reason ? { reason } : undefined))
  }

  return {
    loading,
    checkSignStatus,
    submitSignApplication,
    sendLoginCode,
    performLogin,
    verifyAccountStatus,
  }
}
