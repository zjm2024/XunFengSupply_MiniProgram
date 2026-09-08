/**
 * 用户状态管理 - 经销商信息、账号状态、授信额度、信誉分、登录态
 *
 * 后端数据结构（MallDealer.Mini.LoginController.Login 返回）：
 *   { token, customerId, username, realName, grade, isMaster, expiresAt }
 * Profile/BootstrapContext 也是扁平结构，本 Store 统一兼容这些真实响应。
 *
 * 对应业务流程节点：
 * 1. 签约准入 → 签约状态、登录态管理
 * 2. 全流程 → 账号是否冻结、子账号权限控制
 * 3. 授信额度体系 → 授信额度、信誉分存储
 */

import { defineStore } from 'pinia'
import storage from '../utils/storage.js'
import { getCreditLevel, formatOrderStatus, formatBillStatus } from '../utils/business.js'
import { runSessionCleanup } from './sessionCleanup.js'

export const useUserStore = defineStore('user', {
  state: () => ({
    // ==================== 登录/Token相关 ====================
    token: storage.get('token', ''),
    refreshToken: storage.get('refreshToken', ''),  // 刷新令牌
    tokenExpiresIn: storage.get('tokenExpiresIn', 0), // Token有效期（秒）
    isLoggedIn: !!storage.get('token', ''),
    loginTime: null,                // 登录时间戳

    // ==================== 用户基本信息（来自后端 LoginUserInfo）====================
    userId: storage.get('userId', ''),          // customerId
    username: storage.get('username', ''),        // 登录账号
    realName: storage.get('realName', ''),        // 真实姓名
    nickname: storage.get('nickname', ''),        // 昵称
    avatarUrl: storage.get('avatarUrl', ''),      // 头像URL
    isAdmin: storage.get('isAdmin', false),       // 是否超级管理员

    // ==================== 经销商基本信息 ====================
    dealerInfo: storage.get('dealerInfo', {
      id: '',
      storeName: '',        // 门店名称
      contactName: '',      // 联系人姓名
      contactPhone: '',     // 联系电话
      address: ''           // 门店地址
    }),

    // ==================== 账号状态 ====================
    accountStatus: 1,              // 账号状态 0冻结 1正常 2审核中 -1拒绝
    isFrozen: false,               // 是否被冻结（快捷标识）
    signStatus: 2,                 // 签约状态 0未签约 1审核中 2已签约 -1拒绝

    // ==================== 角色权限（来自后端 roles[] / permissions[]）====================
    roleIds: storage.get('roleIds', []),         // 角色ID列表
    permissions: storage.get('permissions', []), // 权限标识集合
    isMainAccount: true,            // 是否为主账号（总店管理员）

    // ==================== 授信体系 ====================
    creditScore: storage.get('creditScore', 80),   // 信誉分
    totalCreditLimit: 0,             // 总授信额度（分）
    usedCreditLimit: 0,              // 已用授信额度（分）
    availableCreditLimit: 0,         // 可用授信额度（分）
    creditLevel: '',                 // 授信等级名称
  }),

  getters: {
    // 是否已登录
    isLogin: (state) => !!state.token && state.isLoggedIn,
    
    // 账号是否正常可用
    isAccountNormal: (state) => state.accountStatus === 1 && !state.isFrozen,
    
    // 是否已完成签约
    isSigned: (state) => state.signStatus === 2,
    
    // 是否可以下单（正常+已签约）
    canOrder: (state) => state.isAccountNormal && state.isSigned,
    
    // 授信等级信息对象
    creditLevelInfo: (state) => getCreditLevel(state.creditScore),
    
    // 是否可以使用授信支付（信誉分>=60且有额度）
    canUseCreditPay: (state) => 
      state.creditScore >= 60 && state.availableCreditLimit > 0,
    
    // 显示用的门店名称
    displayName: (state) => state.dealerInfo.storeName || state.dealerInfo.contactName || '经销商',
  },

  actions: {
    // ==================== 登录/登出 ====================
    
    /**
     * 设置登录成功后的数据
     * @param {Object} data - 登录/Profile/BootstrapContext 返回数据
     * 兼容旧版 userInfo 嵌套结构，但以 Mini 后端的扁平 camelCase 响应为准。
     */
    setLoginData(data = {}) {
      const info = data.userInfo || data
      const token = data.token || this.token

      // Token 相关
      this.token = token
      this.refreshToken = data.refreshToken || this.refreshToken || ''

      const expiresAt = Number(data.expiresAt || 0)
      const expiresInFromTimestamp = expiresAt > 0
        ? Math.max(0, expiresAt - Math.floor(Date.now() / 1000))
        : 0
      this.tokenExpiresIn = Number(data.expiresIn || expiresInFromTimestamp || this.tokenExpiresIn || 0)
      this.isLoggedIn = Boolean(token)
      this.isFrozen = false
      if (token) this.loginTime = Date.now()

      // 持久化 Token
      if (token) storage.set('token', token)
      if (data.refreshToken) {
        storage.set('refreshToken', data.refreshToken)
      }
      if (this.tokenExpiresIn) {
        storage.set('tokenExpiresIn', this.tokenExpiresIn)
      }

      // 用户基本信息：Mini 使用 customerId；adminUserId 仅用于兼容旧数据。
      if (info && typeof info === 'object') {
        this.userId = info.customerId ?? info.adminUserId ?? this.userId
        this.username = info.username ?? this.username
        this.realName = info.realName ?? this.realName
        this.nickname = info.nickname ?? this.nickname
        this.avatarUrl = info.avatarUrl ?? this.avatarUrl
        this.isAdmin = info.isAdmin ?? this.isAdmin
        this.isMainAccount = info.isMaster ?? this.isMainAccount

        if (info.status !== undefined && info.status !== null) {
          this.setAccountStatus(Number(info.status))
        }
        if (info.signStatus !== undefined && info.signStatus !== null) {
          this.setSignStatus(Number(info.signStatus))
        }

        // 角色和权限
        if (Array.isArray(info.roles)) this.roleIds = [...info.roles]
        if (Array.isArray(info.permissions)) this.permissions = [...info.permissions]

        // 持久化用户信息
        storage.set('userId', this.userId)
        storage.set('username', this.username)
        storage.set('realName', this.realName)
        storage.set('nickname', this.nickname)
        storage.set('avatarUrl', this.avatarUrl)
        storage.set('isAdmin', this.isAdmin)
        storage.set('roleIds', this.roleIds)
        storage.set('permissions', this.permissions)

        // 兼容旧 dealerInfo 结构
        this.setDealerInfo({
          id: info.customerId ?? info.adminUserId ?? this.dealerInfo.id,
          storeName: info.companyName ?? this.dealerInfo.storeName,
          contactName: info.contactName ?? info.realName ?? info.nickname ?? this.dealerInfo.contactName,
          contactPhone: info.mobile ?? this.dealerInfo.contactPhone,
          avatar: info.avatarUrl ?? this.dealerInfo.avatar,
        })
      }
    },
    
    /**
     * 退出登录，清除所有用户域状态
     * 清理范围：Token/RefreshToken、用户信息、购物车、订单缓存、消息、权限
     *
     * 清理策略：
     *   1. 先重置所有 state 到初始值（响应式立即生效）
     *   2. 调用 storage.clearAllForLogout() 按清单精确清除本地存储
     *   3. 触发 sessionCleanup（各分包注册的清理函数）
     */
    async logout() {
      // 1. 重置自身状态到初始值
      this.token = ''
      this.refreshToken = ''
      this.tokenExpiresIn = 0
      this.isLoggedIn = false
      this.loginTime = null
      this.userId = ''
      this.username = ''
      this.realName = ''
      this.nickname = ''
      this.avatarUrl = ''
      this.isAdmin = false
      this.dealerInfo = { id: '', storeName: '', contactName: '', contactPhone: '', address: '' }
      this.accountStatus = 1
      this.isFrozen = false
      this.signStatus = 0
      this.roleIds = []
      this.permissions = []
      this.isMainAccount = true
      this.creditScore = 80
      this.totalCreditLimit = 0
      this.usedCreditLimit = 0
      this.availableCreditLimit = 0
      this.creditLevel = ''

      // 2. 按清单精确清除本地存储（保留非登录相关缓存如主题/语言偏好）
      storage.clearAllForLogout()

      // 3. 触发 sessionCleanup（各分包注册的清理函数）
      try {
        await runSessionCleanup()
      } catch (e) {
        // sessionCleanup 可能未注册，忽略
      }
    },

    /**
     * 从本地存储恢复登录态（App 冷启动时调用）
     * 检查 Token 是否存在，若存在则恢复 isLoggedIn 标志
     *
     * @returns {boolean} 是否成功恢复登录态
     */
    restoreLoginState() {
      const token = storage.get('token', '')
      if (token) {
        this.token = token
        this.isLoggedIn = true
        this.refreshToken = storage.get('refreshToken', '')
        this.tokenExpiresIn = storage.get('tokenExpiresIn', 7200)
        
        // 恢复基本用户信息（不触发网络请求）
        this.userId = storage.get('userId', '')
        this.username = storage.get('username', '')
        this.realName = storage.get('realName', '')
        this.nickname = storage.get('nickname', '')
        this.avatarUrl = storage.get('avatarUrl', '')
        this.isAdmin = storage.get('isAdmin', false)
        this.roleIds = storage.get('roleIds', [])
        this.permissions = storage.get('permissions', [])
        this.creditScore = storage.get('creditScore', 80)
        this.dealerInfo = storage.get('dealerInfo', { id: '', storeName: '', contactName: '', contactPhone: '', address: '' })
        
        console.log('[UserStore] 登录态恢复成功')
        return true
      }
      
      console.log('[UserStore] 无本地 Token，需要重新登录')
      return false
    },

    // ==================== 经销商信息 ====================
    
    /**
     * 更新经销商信息
     * @param {Object} info - 经销商信息
     */
    setDealerInfo(info) {
      this.dealerInfo = { ...this.dealerInfo, ...info }
      storage.set('dealerInfo', this.dealerInfo)
    },

    // ==================== 账号状态 ====================
    
    /**
     * 设置账号状态
     * @param {number} status - 账号状态码
     */
    setAccountStatus(status) {
      this.accountStatus = status
      this.isFrozen = status === 0
    },
    
    /**
     * 设置冻结状态
     * @param {boolean} frozen - 是否冻结
     */
    setFrozenStatus(frozen) {
      this.isFrozen = frozen
      if (frozen) {
        this.accountStatus = 0
      }
    },
    
    /**
     * 设置签约状态
     * @param {number} status - 签约状态码
     */
    setSignStatus(status) {
      this.signStatus = status
    },

    // ==================== 权限管理 ====================
    
    /**
     * 设置角色和权限
     * @param {Array<number>} roleIds - 角色ID列表
     * @param {Array<string>} permissions - 权限标识集合
     */
    setRoleAndPermissions(roleIds, permissions) {
      this.roleIds = roleIds || []
      this.permissions = permissions || []
      this.isMainAccount = true  // Mini端默认为主账号

      storage.set('roleIds', this.roleIds)
      storage.set('permissions', this.permissions)
    },
    
    /**
     * 检查是否有指定权限
     * @param {string} permission - 权限点
     * @returns {boolean}
     */
    hasPermission(permission) {
      return this.permissions.includes(permission)
    },

    // ==================== 授信额度 ====================
    
    /**
     * 更新授信额度信息
     * @param {Object} data - { totalLimit, usedLimit, score }
     */
    updateCreditInfo(data) {
      if (data.score !== undefined) {
        this.creditScore = data.score
        storage.set('creditScore', data.score)
      }
      if (data.totalLimit !== undefined) {
        this.totalCreditLimit = data.totalLimit
      }
      if (data.usedLimit !== undefined) {
        this.usedCreditLimit = data.usedLimit
      }
      this.availableCreditLimit = Math.max(0, this.totalCreditLimit - this.usedCreditLimit)
      this.creditLevel = this.creditLevelInfo.label
    },
    
    /**
     * 更新信誉分
     * @param {number} score - 新的信誉分
     */
    updateCreditScore(score) {
      this.creditScore = score
      storage.set('creditScore', score)
      const levelInfo = getCreditLevel(score)
      this.creditLevel = levelInfo.label
      this.totalCreditLimit = levelInfo.maxCredit * 100
      this.availableCreditLimit = Math.max(0, this.totalCreditLimit - this.usedCreditLimit)
    }
  }
})
