import { computed, ref } from 'vue'
import { getPublicStockCategories, getPublicStockList } from '../api/publicStockApi.js'

/** 独立公开目录状态；新查询作废迟到响应，失败清空旧展示，不落本地缓存。 */
export function usePublicStockCatalog() {
  const categories = ref([])
  const items = ref([])
  const loading = ref(false)
  const failed = ref(false)
  const expired = ref(false)
  const currentPage = ref(0)
  const totalCount = ref(0)
  const pageSize = ref(20)
  const hasMore = computed(() => currentPage.value > 0 && currentPage.value < 10000 && currentPage.value * pageSize.value < totalCount.value)
  let generation = 0
  let query = {}

  /** 重载/分页共用内容版本，旧语言或旧分类响应不能污染当前列表。 */
  async function load(params = {}, { append = false, refreshCategories = false } = {}) {
    if (append && (loading.value || !hasMore.value)) return false
    if (!append) query = { categoryId: params.categoryId ?? null, keyword: String(params.keyword ?? ''), ...(params.hasImage === true ? {hasImage:true} : {}) }
    const epoch = ++generation
    const pageNum = append ? currentPage.value + 1 : 1
    loading.value = true
    failed.value = false
    expired.value = false
    if (!append) { items.value = []; totalCount.value = 0; currentPage.value = 0 }
    try {
      const [result, nextCategories] = await Promise.all([
        getPublicStockList({ ...query, pageNum, pageSize: 20 }),
        refreshCategories ? getPublicStockCategories() : Promise.resolve(null),
      ])
      if (epoch !== generation) return false
      items.value = append ? [...items.value, ...result.items.filter(row => !items.value.some(old => old.productId === row.productId))] : result.items
      totalCount.value = result.totalCount
      currentPage.value = result.pageNum
      pageSize.value = result.pageSize
      if (nextCategories) categories.value = nextCategories
      return true
    } catch (error) {
      if (epoch !== generation) return false
      items.value = []; categories.value = []; totalCount.value = 0; currentPage.value = 0
      failed.value = true
      expired.value = error?.httpStatus === 410 || error?.errorCode === 'PUBLIC_STOCK_LINK_EXPIRED'
      return false
    } finally {
      if (epoch === generation) loading.value = false
    }
  }

  /** 页面卸载后所有未完成请求仅被忽略，不产生状态写入。 */
  function dispose() { generation++ }
  return { categories, items, loading, failed, expired, hasMore, totalCount, load, dispose }
}
