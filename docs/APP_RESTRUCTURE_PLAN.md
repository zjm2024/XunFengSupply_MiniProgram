# APP 重构实施计划

> 创建日期：2026-09-05
> 最后更新：2026-09-06
> 状态：**已完成 (Gate 1-4)**

## 1. 完成状态总览

### 1.1 已完成的迁移

| 根目录 | 状态 | 处理方式 |
|--------|------|----------|
| `src/api/` | ✅ 已删除 | 真实实现已迁入各分包 api 目录 |
| `src/hooks/` | ✅ 已删除 | 真实实现已迁入 shared/composables 和各分包 composables |
| `src/store/` | ✅ 已删除 | 真实实现已迁入各分包 model 目录 |
| `src/config/` | ✅ 已删除 | 拆分为 app/config/runtimeConfig.js, startupConfig.js, routeMeta.js 和 shared/model/pageState.js |
| `src/utils/` | ✅ 已删除 | 真实实现已迁入 shared/utils 和各分包 |
| `src/components/` | ✅ 已删除 | 真实实现已迁入 shared/ui 和各分包 components |

### 1.2 路由修复

| 问题 | 状态 | 处理方式 |
|------|------|----------|
| `checkout/index.vue` 中未定义的 navigator/ORDER_LIST | ✅ 已修复 | 添加正确导入 |
| `about/index.vue` 引用不存在的 `/pages/webview/index` | ✅ 已修复 | 隐私政策改为暂未开放提示，用户协议跳转到 agreement 页面 |
| `app/config/routes.js` 中的旧路径字符串 | ✅ 确认无误 | 路径正确，审计脚本误报已修正 |

### 1.3 命名规范修复

| 问题 | 状态 |
|------|------|
| `scripts/audit-routes.mjs`, `scripts/audit-size.mjs` | ✅ 已删除，由 CommonJS 版本替代 |
| 多点 JS 文件名 | ✅ 无违规 |

## 2. 实施计划

### Phase 1: 修复路由系统 (Gate A)
- 重写 `routes.js` 导出语义工厂
- 修复 `navigator.js` 导入结构和 `toProductDetail` 错误
- `routeGuard.js` 只负责判定，不执行导航
- 所有页面使用 navigator

### Phase 2: 物理迁移 (Gate B)
- 删除根 api/hooks/store/modules/config
- 真实实现迁入对应分包
- 删除所有转发层

### Phase 3: 后端契约对齐 (Gate C)
商品:
- `GetProductList`: Module=MallProduct, Class=Mini.ProductController
- `GetProductDetail`: 请求 `{ ProductId }`
- `GetCategoryTree`

购物车:
- Module=MallOrder, Class=Mini.CartController
- `GetCart|AddToCart|BatchUpdateQuantity|RemoveItems|SelectItems|SelectAll|ClearCart|GetCartSummary`

结算/订单:
- Module=MallOrder, Class=Mini.OrderController
- `PreviewOrder`: `{ Items, AddressId?, DeliveryType }`
- `CreateOrder`: `{ ClientRequestId, Items, AddressId?, PaymentMode, DeliveryType, CustomerRemark? }`

### Phase 4: 测试完善
- routesTest.js
- navigatorTest.js
- checkoutFlowTest.js
- cartSyncSchedulerTest.js (重写)
- pageRegistrationTest.js
- packageBoundaryTest.js
- auditRoutesTest.js

## 3. 后端契约对照表

| 业务 | Module | Controller | Method |
|------|--------|------------|--------|
| 商品列表 | MallProduct | Mini.ProductController | GetProductList |
| 商品详情 | MallProduct | Mini.ProductController | GetProductDetail |
| 分类树 | MallProduct | Mini.ProductController | GetCategoryTree |
| 购物车 | MallOrder | Mini.CartController | GetCart/AddToCart/BatchUpdateQuantity/RemoveItems/SelectItems/SelectAll/ClearCart/GetCartSummary |
| 预览订单 | MallOrder | Mini.OrderController | PreviewOrder |
| 创建订单 | MallOrder | Mini.OrderController | CreateOrder |
| 订单列表 | MallOrder | Mini.OrderController | GetOrderList |
| 订单详情 | MallOrder | Mini.OrderController | GetOrderDetail |

## 4. DTO 字段映射 (camelCase ↔ PascalCase)

### CartItemResponse
| PascalCase | camelCase |
|------------|-----------|
| CartItemId | cartItemId |
| ProductId | productId |
| SkuId | skuId |
| ProductName | productName |
| SkuName | skuName |
| ImageUrl | imageUrl |
| Unit | unit |
| CurrentPrice | currentPrice |
| Quantity | quantity |
| MinOrderQty | minOrderQty |
| DisplayStock | displayStock |
| Selected | selected |
| CanPurchase | canPurchase |
| InvalidReason | invalidReason |
| Subtotal | subtotal |

### AddToCart Request
| PascalCase | camelCase |
|------------|-----------|
| SkuId | skuId |
| Quantity | quantity |
| ClientRequestId | clientRequestId |

### CreateOrder Request
| PascalCase | camelCase |
|------------|-----------|
| ClientRequestId | clientRequestId |
| Items | items [{ skuId, quantity }] |
| PaymentMode | paymentMode |
| DeliveryType | deliveryType |
| CustomerRemark | customerRemark |

### CreateOrder Response
| PascalCase | camelCase |
|------------|-----------|
| OrderId | orderId |
| OrderNo | orderNo |
| PayableAmount | payableAmount |
| OrderStatus | orderStatus |
| Idempotent | idempotent |
