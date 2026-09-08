/**
 * 消息状态管理 - 系统未读消息管理
 * 对应业务流程节点：
 * 1. 全链路消息 → 订单状态变更推送
 * 2. 全链路消息 → 付款提醒、发货通知、售后结果、对账提醒
 * 3. 全链路消息 → 系统公告
 */

import { defineStore } from 'pinia'

export const useMessageStore = defineStore('message', {
  state: () => ({
    // 未读消息总数
    unreadCount: 0,
    
    // 各类型未读数
    typeUnreadCount: {
      order: 0,          // 订单状态变更
      payment: 0,        // 付款提醒
      shipping: 0,       // 发货通知
      afterSale: 0,      // 售后结果
      settlement: 0,     // 对账提醒
      system: 0          // 系统公告
    },
    
    // 最新一条消息预览（用于首页展示）
    latestMessage: null,
    
    // 消息列表缓存
    messageList: [],
    
    // 加载状态
    loading: false
  }),

  getters: {
    // 是否有未读消息
    hasUnread: (state) => state.unreadCount > 0,
    
    // 未读数量显示文本（超过99显示99+）
    unreadText: (state) => {
      if (state.unreadCount > 99) return '99+'
      return String(state.unreadCount)
    },
    
    // 是否需要显示红点
    showBadge: (state) => state.unreadCount > 0
  },

  actions: {
    /**
     * 设置未读数量
     * @param {number|Object} count - 总未读数 或 各类型未读数对象
     */
    setUnreadCount(count) {
      if (typeof count === 'number') {
        this.unreadCount = count
      } else if (typeof count === 'object') {
        this.typeUnreadCount = { ...this.typeUnreadCount, ...count }
        this.unreadCount = Object.values(this.typeUnreadCount).reduce((a, b) => a + b, 0)
      }
    },
    
    /**
     * 增加某类型的未读数
     * @param {string} type - 消息类型 order/payment/shipping/afterSale/settlement/system
     * @param {number} count - 增加的数量
     */
    addUnread(type, count = 1) {
      if (this.typeUnreadCount[type] !== undefined) {
        this.typeUnreadCount[type] += count
        this.unreadCount += count
      }
    },
    
    /**
     * 减少某类型的未读数（标记已读时调用）
     * @param {string} type - 消息类型
     * @param {number} count - 减少的数量
     */
    reduceUnread(type, count = 1) {
      if (this.typeUnreadCount[type] !== undefined) {
        this.typeUnreadCount[type] = Math.max(0, this.typeUnreadCount[type] - count)
        this.unreadCount = Math.max(0, this.unreadCount - count)
      }
    },
    
    /**
     * 全部标记已读
     */
    markAllRead() {
      this.unreadCount = 0
      this.typeUnreadCount = {
        order: 0,
        payment: 0,
        shipping: 0,
        afterSale: 0,
        settlement: 0,
        system: 0
      }
    },
    
    /**
     * 设置最新消息
     * @param {Object} message - 消息对象
     */
    setLatestMessage(message) {
      this.latestMessage = message
    },
    
    /**
     * 设置消息列表
     * @param {Array} list - 消息列表
     */
    setMessageList(list) {
      this.messageList = list || []
    },
    
    /**
     * 在消息列表头部插入新消息（实时推送时使用）
     * @param {Object} message - 新消息
     */
    prependMessage(message) {
      this.messageList.unshift(message)
      this.latestMessage = message
      this.addUnread(this.getMessageTypeKey(message.type))
    },
    
    /**
     * 将消息类型值转换为key
     * @param {number} typeValue - 类型值
     * @returns {string}
     */
    getMessageTypeKey(typeValue) {
      const map = {
        1: 'order',
        2: 'payment',
        3: 'shipping',
        4: 'afterSale',
        5: 'settlement',
        99: 'system'
      }
      return map[typeValue] || 'system'
    },
    
    /**
     * 设置加载状态
     * @param {boolean} loading
     */
    setLoading(loading) {
      this.loading = loading
    }
  }
})
