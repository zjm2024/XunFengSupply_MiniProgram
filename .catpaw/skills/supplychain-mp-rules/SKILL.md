---
name: supplychain-mp-rules
description: 薰风经销商下单系统（SupplyChain.MiniProgram）项目开发规范。UniApp Vue3 + Vite + Pinia 微信小程序端。包含技术栈约束、代码风格、API协议、编译验证流程、后端对接规则。每次修改代码后必须执行编译验证。
metadata:
  skillhub.creator: "project-owner"
  skillhub.version: "V2"
  skillhub.source: "project-skill"
---

# 薰风经销商下单系统 - 项目开发规范

## 技术栈概览

| 层面 | 技术 | 版本 |
|------|------|------|
| 框架 | UniApp (Vue 3 Script Setup) | Vite 构建 |
| 状态管理 | Pinia | 模块化 Store |
| UI 方案 | uni-ui + 自研组件 | **禁止** uView/Vant |
| 目标平台 | 微信小程序 + App | |
| 主色调 | `#D7192D` 高级红 | B2B 品牌风格 |
| 后端协议 | 动态调度 `/api/dispatch` | .NET 8 |

---

## 编译验证（必须执行）

⚠️ **每次修改代码后，必须运行编译确认无错误：**

```bash
npm run build:weixin
```

成功标志：输出 `Build complete.` 和 `运行方式：打开 微信开发者工具, 导入 dist\build\mp-weixin 运行`

### 常见编译错误及修复

| 错误信息 | 原因 | 修复方式 |
|----------|------|----------|
| `await isn't allowed in non-async function` | Pinia action 使用了 await 但忘记加 async | 给方法添加 `async` 关键字 |
| `Multiple exports with the same name` | 函数已用 `export function` 导出，又重复 `export {}` | 删除底部重复的 `export { }` |
| `Unknown word` in SCSS file | `<style>` 缺少 `lang="scss"` 但导入了 .scss 文件 | 添加 `lang="scss"` 或改用纯 CSS 导入 |
| `DEPRECATION WARNING [legacy-js-api]` | Sass 老版 API 警告 | ⚠️ 可忽略，不影响编译 |

---

## API 协议规范

### 唯一请求入口：动态调度

所有接口统一走 `POST /api/dispatch`：

```json
{
  "module": "System",
  "class": "Mini.AuthController",
  "method": "Login",
  "params": { "username": "admin", "password": "***" }
}
```

### 模块映射表

| Module | Controller | 说明 |
|--------|------------|------|
| `System` | `Mini.AuthController` | 登录/退出/用户信息/改密/刷新Token |
| `System` | `Mini.SysAreaController` | 行政区划 |
| `System` | `Mini.QiniuController` | 文件上传凭证 |
| `System` | `Mini.AppVersionController` | App版本检查 |
| `MallProduct` | `Mini.ProductController` | 商品浏览（列表/详情/分类树） |
| `MallProduct` | `Mini.CartController` | 购物车 |
| `MallOrder` | `Mini.OrderController` | 订单操作 |
| `MallOrder` | `Mini.AfterSaleController` | 售后申请 |
| `MallOrder` | `Mini.InvoiceController` | 发票申请 |
| `MallDealer` | `Mini.ProfileController` | 个人资料 |
| `MallDealer` | `Mini.SubAccountController` | 子账号管理 |
| `MallDealer` | `Mini.MessageController` | 消息通知 |
| `MallDealer` | `Mini.ApplicationController` | 入驻申请 |

### ⚠️ 控制器命名规则

**所有控制器统一带 `Mini.` 前缀**，与后端 Mini 端接口对应：
- `Mini.AuthController`, `Mini.SysAreaController`, `Mini.QiniuController`, `Mini.AppVersionController`
- `Mini.ProductController`, `Mini.OrderController`, `Mini.SubAccountController`, `Mini.ProfileController`

### ⚠️ 关键规则

1. **systemType 不需要前端传入** — 后端宿主自动判断（Mini=2）
2. **公开接口白名单**：`Login`, `AutoLogin` — 这些接口不传 Authorization
3. **禁止前端传入身份参数**：`dealerId`, `customerId` 等由后端从登录态获取
4. **参数由页面层构建 PascalCase 实体，API 层直接透传**

### 参数传递规范

**API 层职责**：接收 `params` 对象，直接传给 `dispatch`，不做参数名映射

```javascript
// ✅ 正确：API 层直接透传
export function getOrderList(params) {
  return dispatch('MallOrder', 'Mini.OrderController', 'GetOrderList', params || {})
}
```

**页面层职责**：构建 PascalCase 的参数实体

```javascript
// ✅ 正确：页面层构建 PascalCase 参数
const params = {
  PageIndex: 1,
  PageSize: 20,
  OrderStatus: 2,
}
const result = await getOrderList(params)
```

**错误示例**：
```javascript
// ❌ 错误：API 层做映射
export function getOrderList(params) {
  const backendParams = {
    PageIndex: params.pageIndex,
    PageSize: params.pageSize,
  }
  return dispatch('MallOrder', 'Mini.OrderController', 'GetOrderList', backendParams)
}

// ❌ 错误：页面层传 camelCase
const params = { pageIndex: 1, pageSize: 20 }
await getOrderList(params)
```

---

## 目录结构规范

```
src/
├── api/              # 接口层（按业务模块拆分）
│   ├── base.js       # ⭐ 唯一请求入口（dispatch/request/get/post/uploadFile）
│   ├── auth.js       # 认证相关
│   ├── goods.js      # 商品
│   ├── cart.js       # 购物车
│   ├── order.js      # 订单
│   ├── message.js    # 消息
│   ├── aftersale.js  # 售后
│   ├── settlement.js # 结算
│   ├── area.js       # 行政区划
│   ├── file.js       # 文件上传
│   └── news.js       # 新闻公告
├── store/modules/    # Pinia Store
│   ├── user.js       # 用户状态（Token/权限/授信）
│   ├── cart.js       # 购物车状态
│   └── order.js       # 订单缓存
├── config/
│   ├── routes.js     # 路由常量
│   ├── constant.js   # 业务常量
│   └── errors.js     # AppError 错误类
├── components/       # 自研业务组件
├── hooks/            # 组合式函数
├── utils/            # 工具函数
├── styles/           # 样式文件
│   ├── uni.scss      # ⭐ Design Tokens
│   ├── reset.scss    # 全局重置
│   └── variable.scss # CSS 自定义属性
└── subPackages/      # 分包页面
    └── authSub/      # 登录/签约分包
```

---

## 代码风格规则

### JavaScript / Vue

1. **禁止 TypeScript** — 使用原生 JS（`.js` / `.vue`）
2. **使用 `<script setup>`** — 禁止 Options API
3. **导入顺序**：
   ```javascript
   // 1. Vue 核心
   import { ref, computed, onMounted } from 'vue'
   // 2. UniApp
   import { onLaunch, onLoad } from '@dcloudio/uni-app'
   // 3. 项目内部（相对路径）
   import { dispatch } from '../../shared/api/dispatchClient.js'
   import { useUserStore } from './store/modules/user.js'
   ```
4. **Pinia Store 规范**：
   - state 用 `storage.get/set` 持久化关键字段
   - logout() 必须是 `async`（因为用了 dynamic import）
   - 禁止在 state 中使用 `Set`/`Map`（序列化问题），用 `Array` 替代

### SCSS 样式

1. **Design Tokens 在 `uni.scss`** 中定义
2. **变量命名**：`$color-brand-500`, `$radius-card`, `$space-4`
3. **App.vue 的 `<style>` 必须加 `lang="scss"`**
4. **不要在 `.scss` 文件中使用 `@use`** — PostCSS 无法处理
5. **CSS 变量直接在 App.vue 内联定义**，不通过 @import 引入

### 组件命名

- 页面组件：`PascalCase.vue`（如 `LoginPage.vue`）
- 业务组件：`kebab-case.vue`（如 `status-tag.vue`）
- 分包目录：`camelCase`（如 `authSub`, `orderSub`）

---

## 标题栏组件统一规范

项目标题栏组件已统一收敛为以下三类，**禁止**在业务页面中自行组合 `AppBackButton` 或其他标题栏：

| 组件 | 路径 | 使用场景 | 特性 |
|------|------|---------|------|
| `AppHeader` | `shared/ui/AppHeader/AppHeader.vue` | 约 30 个标准业务页面 | 支持标题居中、返回按钮、消息入口、购物车、语言切换 |
| `AppCatalogHeader` | `shared/ui/AppCatalogHeader/AppCatalogHeader.vue` | 商品列表页 | 返回 + 搜索 + 排序 + 筛选 |
| `HomeTopBar` | `pages/home/components/HomeTopBar.vue` | 主 Tab 首页 | Logo、Tab 标题、设置和消息入口 |

三者内部统一复用唯一的 `AppBackButton` 组件（`shared/ui/AppBackButton/AppBackButton.vue`）。

### 使用规范

1. **标准业务页**（账户、安全、语言、订单、帮助等）→ 使用 `<AppHeader>`
2. **商品列表页** → 使用 `<AppCatalogHeader>`
3. **首页 Tab** → 使用 `<HomeTopBar>`
4. **禁止**在页面中直接使用 `AppBackButton` 自行拼接标题栏

### 返回行为

所有返回操作统一走 `navigator.back()`（`app/navigation/navigator.js`），`AppHeader` 内置该调用，无需页面自行处理。

```vue
<!-- ✅ 正确：标准业务页使用 AppHeader -->
<AppHeader title="安全设置" :show-back="true" :show-shadow="true" />

<!-- ❌ 错误：自行使用 AppBackButton 拼接标题栏 -->
<view class="custom-header">
  <AppBackButton @click="goBack" />
  <text>安全设置</text>
</view>
```

### AppHeader 常用 Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | String | `''` | 页面标题（绝对居中） |
| `showBack` | Boolean | `false` | 显示返回按钮 |
| `showLogo` | Boolean | `false` | 显示 Logo（首页用） |
| `showMessage` | Boolean | `false` | 显示消息入口 |
| `unreadCount` | Number | `0` | 未读数，> 0 显示红点 |
| `showShadow` | Boolean | `false` | 显示底部分割线 |
| `transparent` | Boolean | `false` | 透明背景（商品详情等） |
| `theme` | String | `'dark'` | `dark` / `light`（明暗图标） |

---

## 后端对接清单

当需要对接新接口时，按以下步骤：

1. **查阅 API 文档**：后端提供的接口文档
2. **确认参数结构**：检查 DTO 定义
3. **确认模块/控制器名称**：所有控制器统一带 `Mini.` 前缀
4. **禁止传入身份相关参数**：`customerId`, `dealerId` 等由后端从登录态获取
5. **在对应 api 文件中添加函数**：
   ```javascript
   export function xxxApi(params) {
     // API 层直接透传 params，不做映射
     return dispatch('Module', 'Mini.Controller', 'Method', params)
   }
   ```
6. **在页面层构建 PascalCase 参数**：
   ```javascript
   const params = {
     PageNum: 1,
     PageSize: 20,
     Keyword: '搜索关键词',
   }
   const result = await xxxApi(params)
   ```
7. **运行 `npm run build:weixin` 验证**

---

## 环境配置

| 文件 | 用途 |
|------|------|
| `.env.development` | 开发环境 |
| `.env.production` | 生产环境 |

后端 Mini API 默认端口：**5002**

---

## 已知注意事项

1. **`utils/request.js` 已废弃** — 所有请求走 `shared/api/dispatchClient.js`
2. **`store/modules/user.js` 已迁移** — 用户会话现位于 `shared/session/userStore.js`
3. **`config/routes.js` 已迁移** — 路由常量现位于 `app/config/routes.js`
4. **`utils/routeGuard.js` 已迁移** — 路由守卫现位于 `app/navigation/routeGuard.js`
2. **`EmptyState` 组件旧版** — 新版在 `components/AppPageState/`
3. **`checkAccountStatus()` 未实现** — 后端 Login 接口直接返回错误码表示账号异常
4. **设备免登未实现** — `autoLogin()` 返回 rejected Promise

---

## 修改代码后的标准流程

```
1. 编辑代码（JS/VUE/SCSS）
2. 运行 npm run build:weixin
3. 检查输出是否为 Build complete.
4. 如有错误 → 根据错误类型对照上表修复 → 回到步骤 2
5. 确认无误 → 提交修改
```
