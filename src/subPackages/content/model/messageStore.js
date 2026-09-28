/**
 * 内容分包兼容入口：消息状态统一由 shared/model/messageStore 管理。
 * 首页和消息中心必须共用同一份未读数与消息快照，避免红点状态分裂。
 */
export { useMessageStore } from '../../../shared/model/messageStore.js'
