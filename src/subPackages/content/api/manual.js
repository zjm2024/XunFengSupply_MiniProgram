// 产品手册接口统一复用主 API，保持资讯分包的调用边界清晰。
export {
  getManualCategories,
  getManualList,
  getManualDetail,
  getManualDownloadUrl,
} from '../../../shared/api/manual.js'
