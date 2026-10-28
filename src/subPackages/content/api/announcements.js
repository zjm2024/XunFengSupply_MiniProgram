import { dispatch } from '@/shared/api/dispatchClient.js'
import { getLocale } from '@/shared/i18n/index.js'
/** 公告与新闻使用独立来源，语言由当前会话决定。 */
export function getAnnouncements(pageNum=1){return dispatch('System','Mini.AnnouncementController','GetList',{PageNum:pageNum,PageSize:20,LanguageCode:getLocale()})}
/** 仅后端允许读取的当前已发布公告可展示。 */
export function getAnnouncement(announcementId){return dispatch('System','Mini.AnnouncementController','GetDetail',{AnnouncementId:announcementId,LanguageCode:getLocale()})}
