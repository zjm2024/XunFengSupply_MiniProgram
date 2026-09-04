/**
 * Pinia 状态管理入口
 * 对应业务流程：全流程状态管理统一入口
 */

import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

// 方便外部直接导入各模块
export { useUserStore } from './modules/user.js'
export { useCartStore } from './modules/cart.js'
export { useMessageStore } from './modules/message.js'
export { useOrderStore } from './modules/order.js'
