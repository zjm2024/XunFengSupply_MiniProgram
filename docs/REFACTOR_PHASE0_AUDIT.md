# Phase 0 结构审计文档

> 生成时间：2026-09-04
> 审计范围：购物车、结算、商品链路

---

## 一、pages.json 注册路由清单

### 主包页面（27 页）
| 路径 | 状态 |
|------|------|
| pages/startup/index | ✅ 活跃 |
| pages/home/index | ✅ 活跃 |
| pages/dealer-center/index | ✅ 活跃 |
| pages/cart/index | ✅ 活跃 |
| pages/product/list | ✅ 活跃 |
| pages/product/detail | ✅ 活跃 |
| pages/product/variants | ✅ 活跃（旧版） |
| pages/checkout/index | ✅ 活跃 |
| pages/order/index | ✅ 活跃 |
| pages/news/index | ✅ 活跃 |
| pages/news/detail | ✅ 活跃 |
| pages/manual/index | ✅ 活跃 |
| pages/manual/preview | ✅ 活跃 |
| pages/message/index | ✅ 活跃 |
| pages/account/profile | ✅ 活跃 |
| pages/recharge/index | ✅ 活跃 |
| pages/bill/index | ✅ 活跃 |
| pages/fund-flow/index | ✅ 活跃 |
| pages/aftersales/index | ✅ 活跃 |
| pages/invoice/index | ✅ 活跃 |
| pages/address/index | ✅ 活跃 |
| pages/voucher/index | ✅ 活跃 |
| pages/sub-account/index | ✅ 活跃 |
| pages/security/index | ✅ 活跃 |
| pages/language/index | ✅ 活跃 |
| pages/help/index | ✅ 活跃 |
| pages/about/index | ✅ 活跃 |

### 分包页面（16 页）
| 分包 | 路径 | 状态 |
|------|------|------|
| authSub | login | ✅ 活跃 |
| authSub | applySign | ✅ 活跃 |
| goodsSub | goodsDetail | ⚠️ 重复（与 product/detail 并存） |
| goodsSub | replenishList | ⚠️ 未实现（返回 reject） |
| orderSub | orderConfirm | ⚠️ 重复（与 checkout 并存） |
| orderSub | orderList | ⚠️ 重复（与 order/index 并存） |
| orderSub | orderDetail | ✅ 活跃（唯一） |
| paySub | payPage | ✅ 活跃 |
| settlementSub | billList | ⚠️ 重复（与 bill/index 并存） |
| settlementSub | billDetail | ✅ 活跃 |
| afterSaleSub | applyAfterSale | ⚠️ 重复 |
| afterSaleSub | afterSaleList | ⚠️ 重复 |
| systemSub | messageList | ⚠️ 重复（与 message/index 并存） |
| systemSub | agreement | ✅ 活跃 |
| accountSub | subAccountManage | ⚠️ 重复（与 sub-account/index 并存） |
| accountSub | accountStatus | ✅ 活跃 |

---

## 二、未注册但存在于文件系统的页面

| 文件路径 | 状态 | 说明 |
|----------|------|------|
| pages/home/home.vue | 🔴 LEGACY | 旧首页，被 pages/home/index 替代 |
| pages/cart/cart.vue | 🔴 LEGACY | 旧购物车，被 pages/cart/index 替代 |
| pages/classify/classify.vue | 🔴 LEGACY | 旧分类页，V2 已移除 |
| pages/mine/mine.vue | 🔴 LEGACY | 旧"我的"，被 dealer-center 替代 |

---

## 三、重复业务链路

### 1. 商品详情
| 入口 | 注册路由 | 调用来源 |
|------|----------|----------|
| pages/product/detail.vue | /pages/product/detail | product/list, goods/detail（自调用） |
| subPackages/goodsSub/goodsDetail.vue | /subPackages/goodsSub/goodsDetail | 仅 goodsSub/replenishList |

**决策**：保留 `pages/product/detail.vue` 为主入口，`goodsSub/goodsDetail` 为遗留入口，待收敛。

### 2. 结算链路
| 入口 | 注册路由 | 调用来源 |
|------|----------|----------|
| pages/checkout/index.vue | /pages/checkout/index | pages/cart/index |
| subPackages/orderSub/orderConfirm.vue | /subPackages/orderSub/orderConfirm | subPackages/goodsSub/goodsDetail |

**决策**：保留 `pages/checkout/index.vue` 为主入口（新版 V2）。

### 3. 订单列表
| 入口 | 注册路由 |
|------|----------|
| pages/order/index.vue | /pages/order/index |
| subPackages/orderSub/orderList.vue | /subPackages/orderSub/orderList |

**决策**：保留 `pages/order/index.vue` 为主入口。

---

## 四、购物车 P0 问题清单

### P0-1: API 参数约定不一致 🔴

**问题**：调度器 `useCartSyncScheduler.js` 直接构造 PascalCase 后端 DTO 传入 API：
```javascript
// 调度器中
removeApi({ CartItemIds: op.ids })        // PascalCase DTO
selectAllApi({ Selected: op.selected })    // PascalCase DTO
updateApi({ Items: chunk })                // chunk 含 CartItemId/Quantity
selectApi({ CartItemIds: op.ids, Selected: op.value })
```

但 `cart.js` 中的 API 函数期望接收 **camelCase 领域对象**：
```javascript
// cart.js
export function removeItems(cartItemIds = []) {  // 期望数组
export function selectAll(selected = true) {     // 期望布尔值
export function batchUpdateQuantity(items = []) { // 期望 camelCase 数组
export function selectItems(params = {}) {        // 期望对象
```

**结果**：API 层的 camelCase→PascalCase 转换失效，后端收到的数据结构错乱。

### P0-2: 调度器互斥逻辑错误 🔴

**问题**：`enqueueQuantity` 和 `enqueueSelection` 互相删除对方的待同步项：
```javascript
// enqueueQuantity 中
if (pendingSelections.has(id)) pendingSelections.delete(id)  // ❌ 错误

// enqueueSelection 中
pendingQuantities.delete(id)  // ❌ 错误
```

**结果**：用户同时修改数量和勾选状态时，只有一个操作会被同步到服务端。

### P0-3: 调度器非单例 🔴

**问题**：`useCart()` 每次调用都 `createCartSyncScheduler()`，商品详情、规格页、购物车页各有独立队列。

**结果**：多页面并发写请求，可能产生竞争和重复提交。

### P0-4: dispose 顺序错误 🔴

**问题**：
```javascript
async function dispose() {
  disposed = true           // 先设置 disposed
  clearTimers()
  await processQueue()     // processQueue 检测到 disposed 立即退出
}
```

processQueue 开头检查：
```javascript
if (inflight || disposed) return  // disposed 为 true，直接退出
```

**结果**：dispose 无法 flush 残留变更。

### P0-5: 结算页缺陷 🔴

1. **缺少 flush**：结算前未调用 `flush()` 同步购物车变更
2. **未调 PreviewOrder**：结算页纯本地计算，无服务端价格/库存校验
3. **clientOrderId 每次重试新生成**：违反幂等原则
4. **过期 SKU 阻断**："购物车接口没有 SKU"提示已过期（后端已支持 SKU 购物车）

### P0-6: orderConfirm.vue 路由调用错误 🔴

```javascript
// 第 223 行 - 错误调用
safeNavigateTo({
  url: '/pages/address/index?mode=select',
  events: { ... }
})

// 应为
safeNavigateTo('/pages/address/index?mode=select', { events: { ... } })
```

### P0-7: 硬编码颜色 🟡

checkout/index.vue 中存在：
- `#D7192D` (brand 主色)
- `#EFEFF1` (border)
- `#111216` (text-primary)
- `#5E626B` (text-secondary)
- `#989BA3` (text-tertiary)

orderConfirm.vue 中存在：
- `#C41E3A`
- `#F56C6C`

---

## 五、文件处理清单

### 保留（活跃 V2 页面）
- src/api/cart.js（需修复 JSDoc）
- src/api/order.js
- src/hooks/useCart.js（需修复单例）
- src/hooks/useCartSyncScheduler.js（需修复 P0-1/2/4）
- src/store/modules/cart.js
- src/pages/cart/index.vue（需修复结算前 flush）
- src/pages/checkout/index.vue（需重构）
- src/pages/product/detail.vue
- src/pages/product/list.vue
- src/pages/order/index.vue
- src/config/routes.js
- src/utils/routeGuard.js

### 修复
- src/subPackages/orderSub/orderConfirm.vue（修复 safeNavigateTo 调用）

### 暂缓（保持现状，待后续阶段处理）
- src/subPackages/goodsSub/goodsDetail.vue
- src/subPackages/orderSub/orderList.vue
- src/subPackages/orderSub/orderDetail.vue
- src/subPackages/afterSaleSub/*
- src/subPackages/settlementSub/*
- src/subPackages/systemSub/messageList.vue
- src/subPackages/accountSub/subAccountManage.vue

### 待删除（已确认无活跃引用）
- src/pages/home/home.vue
- src/pages/cart/cart.vue
- src/pages/classify/classify.vue
- src/pages/mine/mine.vue

---

## 六、构建环境检查

当前 package.json 脚本：
- `npm run build:h5` ✅
- `npm run build:app` ✅
- `npm run build:weixin` ✅

缺失：
- ❌ ESLint
- ❌ Prettier
- ❌ Vitest
- ❌ 路由审计脚本
- ❌ 包体检查脚本

---

*本文档作为 Phase 0 输出，用于指导 Phase 1 修复工作。*
