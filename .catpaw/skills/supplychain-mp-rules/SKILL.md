---
name: supplychain-mp-rules
description: 薰风经销商下单系统（SupplyChain.MiniProgram）项目开发规范。UniApp Vue3 + Vite + Pinia 微信小程序端。包含技术栈约束、代码风格、API协议、编译验证流程、后端对接规则。每次修改代码后必须执行编译验证。
metadata:
  skillhub.creator: "project-owner"
  skillhub.version: "V2"
  skillhub.source: "project-skill"
---

# 薰风经销商下单系统 - 项目开发规范

## 当前仓库定位（强制）

- **APP 唯一可编辑根目录**：`E:\MyWork\AppProject\SupplyChain.MiniProgram`
- **订单模块**：`src/subPackages/order/`；页面依次位于 `pages/list`、`pages/detail`、`pages/pay`、`pages/cancel`、`pages/after-sale`，接口位于 `api/orderApi.js`。
- **通用基础设施**：路由和运行配置在 `src/app/`，通用 API、会话、状态、组件和工具在 `src/shared/`。
- `E:\MyWork\全部项目\供应链项目\SupplyChain.MiniProgram` 是历史副本，**禁止对其实施前端代码修改、构建或验收**。如用户未明确指定其他目录，所有 APP 修改、构建与测试均在本仓库执行。

开始 APP 任务时，先确认 `src/pages.json` 的实际路由和目标文件；不得依据历史目录、同名文件或旧 Skill 推断编辑位置。

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
4. **页面与领域层使用 camelCase；分包 API 适配层负责将请求转换为后端 PascalCase DTO，并将响应规范化为 camelCase。**

### 参数传递规范

**API 层职责**：封装 `dispatch`，把页面传入的 camelCase 领域参数转换为后端 PascalCase DTO，并将响应转换为 camelCase 领域模型。

```javascript
// ✅ 正确：API 层集中完成契约适配
export function getOrderList(params) {
  return dispatch('MallOrder', 'Mini.OrderController', 'GetOrderList', {
    PageNum: params.pageNum,
    PageSize: params.pageSize,
  }).then(normalizeOrderList)
}
```

**页面层职责**：仅构建 camelCase 领域参数，不直接调用 `dispatch`。

```javascript
// ✅ 正确：页面层构建 camelCase 参数
const params = {
  pageNum: 1,
  pageSize: 20,
  orderStatus: 20,
}
const result = await getOrderList(params)
```

**错误示例**：
```javascript
// ❌ 错误：页面绕过 API 适配层，直接调用 dispatch
export function getOrderList(params) {
  return dispatch('MallOrder', 'Mini.OrderController', 'GetOrderList', params)
}

// ❌ 错误：页面传 PascalCase，绕过领域模型
await getOrderList({ PageNum: 1, PageSize: 20 })
```

---

## 目录结构规范

```
src/
├── app/                         # 应用启动、配置与路由守卫
│   ├── config/                  # routes、runtime、startup 配置
│   └── navigation/              # navigator、routeGuard
├── shared/                      # 可复用基础设施
│   ├── api/                     # dispatchClient 与通用接口封装
│   ├── session/                 # 用户会话与身份状态
│   ├── model/                   # 通用 Pinia 状态
│   ├── ui/                      # AppHeader、FixedActionBar 等共享组件
│   ├── composables/             # 通用组合式函数
│   └── utils/                   # 工具函数
├── pages/                       # 主包页面
├── subPackages/                 # 领域分包
│   ├── order/                   # 订单：api、model、composables、pages
│   ├── commerce/                # 商品、购物车、结算
│   ├── account/                 # 账户、库存、账单
│   ├── auth/                    # 登录、签约
│   └── content/                 # 消息、帮助、公告
├── static/                      # 静态资源
└── uni.scss                     # Design Tokens
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
   import { dispatch } from '@/shared/api/dispatchClient.js'
   import { useUserStore } from '@/shared/session/userStore.js'
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
6. **由页面层传入 camelCase 领域参数，API 适配层转换为 PascalCase DTO**：
   ```javascript
   const params = {
      pageNum: 1,
      pageSize: 20,
      keyword: '搜索关键词',
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

1. **订单 API 不在 `src/api/`** — 使用 `src/subPackages/order/api/orderApi.js`，公共请求入口在 `src/shared/api/`。
2. **用户会话位于 `shared/session/userStore.js`**，不要恢复旧 `store/modules/user.js` 导入。
3. **路由常量与守卫分别位于 `app/config/routes.js`、`app/navigation/routeGuard.js`**。
4. **标题栏与固定操作栏优先复用 `shared/ui/AppHeader/`、`shared/ui/FixedActionBar/`**，禁止页面自行拼接。
5. **`checkAccountStatus()` 未实现** — 后端 Login 接口直接返回错误码表示账号异常。
6. **设备免登未实现** — `autoLogin()` 返回 rejected Promise。

---

## 修改代码后的标准流程

```
1. 编辑代码（JS/VUE/SCSS）
2. 运行 npm run build:weixin
3. 检查输出是否为 Build complete.
4. 如有错误 → 根据错误类型对照上表修复 → 回到步骤 2
5. 确认无误 → 提交修改
```
