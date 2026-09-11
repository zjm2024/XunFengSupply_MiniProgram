/**
 * 经销商会话状态。登录账号天然归属于经销商主体，签约状态不再作为前端准入条件。
 */
import { defineStore } from 'pinia'
import storage from '../utils/storage.js'
import { runSessionCleanup } from './sessionCleanup.js'

export const DEALER_PERMISSIONS = Object.freeze({
  ORDER_VIEW: 'ORDER_VIEW',
  ORDER_CREATE: 'ORDER_CREATE',
  BALANCE_VIEW: 'BALANCE_VIEW',
  SUB_ACCOUNT_MANAGE: 'SUB_ACCOUNT_MANAGE',
  COMBINATION_PAY_PARTICIPATE: 'COMBINATION_PAY_PARTICIPATE',
})

const emptyDealerInfo = () => ({
  id: '',
  storeName: '',
  contactName: '',
  contactPhone: '',
  address: '',
})

const emptyFinanceContext = () => ({
  subjectTotalBalance: 0,
  subjectFrozenBalance: 0,
  subjectAvailableBalance: 0,
  currentAccount: null,
  accounts: [],
  credit: {
    totalAmount: 0,
    usedAmount: 0,
    frozenAmount: 0,
    availableAmount: 0,
    status: 0,
    isFrozen: false,
  },
})

export const useUserStore = defineStore('user', {
  state: () => ({
    token: storage.get('token', ''),
    refreshToken: storage.get('refreshToken', ''),
    tokenExpiresIn: storage.get('tokenExpiresIn', 0),
    isLoggedIn: !!storage.get('token', ''),
    loginTime: null,

    userId: storage.get('userId', ''),
    dealerId: storage.get('dealerId', ''),
    username: storage.get('username', ''),
    realName: storage.get('realName', ''),
    nickname: storage.get('nickname', ''),
    avatarUrl: storage.get('avatarUrl', ''),
    isAdmin: storage.get('isAdmin', false),
    dealerInfo: storage.get('dealerInfo', emptyDealerInfo()),

    dealerStatus: Number(storage.get('dealerStatus', 1)),
    accountStatus: Number(storage.get('accountStatus', 1)),
    isFrozen: false,
    signStatus: 2,

    roleIds: storage.get('roleIds', []),
    permissions: storage.get('permissions', []),
    isMainAccount: storage.get('isMainAccount', true),
    financeContext: storage.get('financeContext', emptyFinanceContext()),

    // 兼容旧页面字段，数值全部由后端 Finance 上下文驱动。
    creditScore: 0,
    totalCreditLimit: 0,
    usedCreditLimit: 0,
    frozenCreditLimit: 0,
    availableCreditLimit: 0,
    creditStatus: 0,
    creditLevel: '',
  }),

  getters: {
    isLogin: state => !!state.token && state.isLoggedIn,
    isAccountNormal: state => state.dealerStatus === 1 && state.accountStatus === 1,
    isSigned: () => true,
    canOrder: state => state.dealerStatus === 1
      && state.accountStatus === 1
      && state.creditStatus !== 2
      && (state.isMainAccount || state.permissions.includes(DEALER_PERMISSIONS.ORDER_CREATE)),
    canUseCreditPay: state => state.creditStatus === 1 && state.availableCreditLimit > 0,
    displayName: state => state.dealerInfo.storeName
      || state.dealerInfo.contactName
      || state.realName
      || state.username
      || '经销商',
  },

  actions: {
    setLoginData(data = {}) {
      const info = data.userInfo || data
      const token = data.token || this.token
      this.token = token
      this.refreshToken = data.refreshToken || this.refreshToken || ''
      const expiresAt = Number(data.expiresAt || 0)
      this.tokenExpiresIn = Number(data.expiresIn
        || (expiresAt > 0 ? Math.max(0, expiresAt - Math.floor(Date.now() / 1000)) : 0)
        || this.tokenExpiresIn
        || 0)
      this.isLoggedIn = Boolean(token)
      if (token) {
        this.loginTime = Date.now()
        storage.set('token', token)
      }
      if (this.refreshToken) storage.set('refreshToken', this.refreshToken)
      if (this.tokenExpiresIn) storage.set('tokenExpiresIn', this.tokenExpiresIn)

      if (!info || typeof info !== 'object') return
      this.userId = info.customerId ?? info.adminUserId ?? this.userId
      this.dealerId = info.dealerId ?? this.dealerId ?? this.userId
      this.username = info.username ?? this.username
      this.realName = info.realName ?? this.realName
      this.nickname = info.nickname ?? this.nickname
      this.avatarUrl = info.avatarUrl ?? this.avatarUrl
      this.isAdmin = info.isAdmin ?? this.isAdmin
      this.isMainAccount = info.isMaster ?? this.isMainAccount
      this.dealerStatus = Number(info.dealerStatus ?? info.status ?? this.dealerStatus)
      this.accountStatus = Number(info.accountStatus ?? info.status ?? this.accountStatus)
      this.isFrozen = this.dealerStatus !== 1 || this.accountStatus !== 1
      this.signStatus = 2
      if (Array.isArray(info.roles)) this.roleIds = [...info.roles]
      if (Array.isArray(info.permissions)) this.permissions = [...info.permissions]

      this.setDealerInfo({
        id: this.dealerId,
        storeName: info.companyName ?? this.dealerInfo.storeName,
        contactName: info.contactName ?? info.realName ?? this.dealerInfo.contactName,
        contactPhone: info.mobile ?? this.dealerInfo.contactPhone,
        avatar: info.avatarUrl ?? this.dealerInfo.avatar,
      })
      const persisted = {
        userId: this.userId,
        dealerId: this.dealerId,
        username: this.username,
        realName: this.realName,
        nickname: this.nickname,
        avatarUrl: this.avatarUrl,
        isAdmin: this.isAdmin,
        dealerStatus: this.dealerStatus,
        accountStatus: this.accountStatus,
        roleIds: this.roleIds,
        permissions: this.permissions,
        isMainAccount: this.isMainAccount,
      }
      Object.entries(persisted).forEach(([key, value]) => storage.set(key, value))
    },

    async logout() {
      this.$reset()
      storage.clearAllForLogout()
      try {
        await runSessionCleanup()
      } catch (e) {
        // 分包未注册清理函数时无需阻断退出。
      }
    },

    restoreLoginState() {
      const token = storage.get('token', '')
      if (!token) return false
      this.token = token
      this.isLoggedIn = true
      this.refreshToken = storage.get('refreshToken', '')
      this.tokenExpiresIn = storage.get('tokenExpiresIn', 7200)
      this.userId = storage.get('userId', '')
      this.dealerId = storage.get('dealerId', this.userId)
      this.username = storage.get('username', '')
      this.realName = storage.get('realName', '')
      this.nickname = storage.get('nickname', '')
      this.avatarUrl = storage.get('avatarUrl', '')
      this.isAdmin = storage.get('isAdmin', false)
      this.roleIds = storage.get('roleIds', [])
      this.permissions = storage.get('permissions', [])
      this.isMainAccount = storage.get('isMainAccount', true)
      this.dealerStatus = Number(storage.get('dealerStatus', 1))
      this.accountStatus = Number(storage.get('accountStatus', 1))
      this.isFrozen = this.dealerStatus !== 1 || this.accountStatus !== 1
      this.dealerInfo = storage.get('dealerInfo', emptyDealerInfo())
      this.updateFinanceContext(storage.get('financeContext', emptyFinanceContext()), false)
      return true
    },

    setDealerInfo(info) {
      this.dealerInfo = { ...this.dealerInfo, ...info }
      storage.set('dealerInfo', this.dealerInfo)
    },

    setAccountStatus(status) {
      this.accountStatus = Number(status)
      this.isFrozen = this.dealerStatus !== 1 || this.accountStatus !== 1
      storage.set('accountStatus', this.accountStatus)
    },

    setFrozenStatus(frozen) {
      this.setAccountStatus(frozen ? 0 : 1)
    },

    setSignStatus() {
      this.signStatus = 2
    },

    setRoleAndPermissions(roleIds, permissions, isMainAccount = this.isMainAccount) {
      this.roleIds = roleIds || []
      this.permissions = permissions || []
      this.isMainAccount = Boolean(isMainAccount)
      storage.set('roleIds', this.roleIds)
      storage.set('permissions', this.permissions)
      storage.set('isMainAccount', this.isMainAccount)
    },

    hasPermission(permission) {
      return this.isMainAccount || this.permissions.includes(permission)
    },

    updateFinanceContext(data = {}, persist = true) {
      const credit = data.credit || {}
      this.financeContext = {
        ...emptyFinanceContext(),
        ...data,
        credit: { ...emptyFinanceContext().credit, ...credit },
      }
      this.totalCreditLimit = Number(credit.totalAmount || 0)
      this.usedCreditLimit = Number(credit.usedAmount || 0)
      this.frozenCreditLimit = Number(credit.frozenAmount || 0)
      this.availableCreditLimit = Number(credit.availableAmount || 0)
      this.creditStatus = Number(credit.status || 0)
      this.creditLevel = this.creditStatus === 2 ? '授信冻结' : '主体授信'
      if (persist) storage.set('financeContext', this.financeContext)
    },

    updateCreditInfo(data = {}) {
      this.updateFinanceContext({
        ...this.financeContext,
        credit: {
          ...this.financeContext.credit,
          totalAmount: data.totalLimit ?? data.totalAmount ?? this.totalCreditLimit,
          usedAmount: data.usedLimit ?? data.usedAmount ?? this.usedCreditLimit,
          frozenAmount: data.frozenAmount ?? this.frozenCreditLimit,
          availableAmount: data.availableAmount
            ?? Math.max(0, Number(data.totalLimit ?? this.totalCreditLimit)
              - Number(data.usedLimit ?? this.usedCreditLimit)
              - Number(data.frozenAmount ?? this.frozenCreditLimit)),
          status: data.status ?? this.creditStatus,
        },
      })
    },

    updateCreditScore() {
      // 已废弃：授信不再由前端信誉分推导。
    },
  },
})
