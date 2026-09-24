// 资讯分包统一复用主 API，避免两套新闻接口协议长期漂移。
export {
  ANNOUNCEMENT_TYPE,
  getNewsCategories,
  getNewsList,
  getNewsDetail,
} from '../../../shared/api/news.js'
