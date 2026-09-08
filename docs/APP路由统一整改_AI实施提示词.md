# SupplyChain MiniProgram 路由跳转统一整改执行提示词

> 这是一次直接修改真实代码的路由专项任务，不是审计建议。必须完成全部文件修改、页面调用迁移、测试和三端构建后才能结束。
>
> 本任务只处理路由注册、URL 构造、访问守卫、页面跳转、回跳参数和跨页面选择交互。不要顺手重写 UI、API、购物车或后端。

## 0. 项目位置与保护要求

前端项目：

    E:\MyWork\AppProject\SupplyChain.MiniProgram

工作区已有大量用户未提交修改，必须保留。禁止：

- git reset --hard
- git checkout -- 文件
- git clean
- 覆盖式重建项目
- 回滚当前 UI、接口、购物车和项目结构修改
- 修改后端
- 擅自提交或推送
- 只补 import 后就宣布完成
- 只以 build 成功作为路由正确的证明

开始前先执行并记录：

    git status --short
    git diff --stat
    npm test
    npm run audit:routes

## 1. 当前状态结论

现有 Agent 只完成了以下 6 个未定义变量的补充导入：

- login/index.vue 导入 navigator。
- apply-sign/index.vue 导入 navigator、AGREEMENT。
- product/list.vue 导入 navigator。
- product/detail.vue 导入 navigator。
- product/variants.vue 导入 navigator。
- order/list/index.vue 导入 PAY_PAGE。

这些修改可以保留，但不能视为路由统一完成。

当前仍有这些架构和运行时问题：

1. routes 常量、routes 工厂、navigator 快捷方法、safe 包装函数、页面硬编码路径五套调用方式并存。
2. navigator.js 自己实现 canAccess，没有使用 routeGuard.js。
3. routeGuard.js 没有检查 requireSign。
4. navigator 的重复守卫没有检查 requireSign 和 owner=main。
5. 带 query 的公开页面不会被识别为公开页面。
6. 未注册路由没有在真正执行导航前被拒绝。
7. 登录成功没有恢复 redirect 目标，永远回首页。
8. 账单支付错误地拿 billId 当 orderId。
9. checkout 成功后 navigateTo 订单列表，会返回结算页并可能重复提交，也没有使用 CreateOrder 返回的 orderId。
10. 售后申请传 selectMode，但订单列表不读取、不返回选择结果。
11. 地址页准备了 addressSelected 事件，但结算页没有进入地址选择流程。
12. 手册预览跳转有的没有传 ID，有的传了 ID但目标页不读取。
13. startup 使用 catch 处理导航失败，但 navigator 当前失败是 resolve(false)，catch 不会执行。
14. AppHeader 的 safeNavigateBack 永远返回 true，因此组件的 back 事件永远不会 emit。
15. 现有测试和 audit:routes 没有发现 Vue 页面里的 navigator/PAY_PAGE 未定义，门禁不完整。

## 2. 本次唯一允许的路由架构

最终只允许四个核心文件：

~~~text
src/app/
├─ config/
│  ├─ routes.js
│  └─ routeMeta.js
└─ navigation/
   ├─ navigator.js
   └─ routeGuard.js
~~~

职责必须严格分开：

### routes.js

只负责：

- 路径事实。
- query 构造和编码。
- 语义化 URL 工厂。
- URL path 标准化。
- 注册路由判定。
- 登录 redirect 的安全校验。

不得：

- import Pinia Store。
- 调用任何 uni API。
- 做登录、签约、冻结和权限判断。

### routeMeta.js

只负责：

- 每个路由的 requireAuth。
- requireSign。
- allowFrozen。
- owner=main 等访问元数据。

不得：

- 调用 uni API。
- import 页面或分包实现。
- 执行导航。

### routeGuard.js

只负责：

- 根据标准化 path 和用户状态返回访问判定。
- 不执行任何导航。

返回结构固定：

~~~javascript
{
  allowed: true,
  path
}
~~~

或：

~~~javascript
{
  allowed: false,
  path,
  reason: 'NOT_REGISTERED' | 'NOT_LOGGED_IN' | 'NOT_SIGNED' |
          'ACCOUNT_FROZEN' | 'MAIN_ACCOUNT_ONLY',
  redirectUrl
}
~~~

### navigator.js

只负责：

- 唯一调用 uni.navigateTo、uni.redirectTo、uni.reLaunch、uni.navigateBack 的位置。
- 调用 routeGuard。
- 执行被拒绝后的跳转。
- 页面栈不足时安全兜底。
- 统一返回 Promise<boolean>。

不得：

- 再声明第二个 canAccess。
- 再维护第二套 PUBLIC_ROUTES/FROZEN 列表。
- 硬编码业务页面字符串。
- 再提供 toProductDetail、toOrderDetail 等第二套业务路由。

## 3. 页面唯一调用格式

所有页面必须同时使用 routes 工厂和 navigator 通用方法：

~~~javascript
import { routes } from '@/app/config/routes.js'
import { navigator } from '@/app/navigation/navigator.js'

await navigator.navigateTo(routes.commerce.productDetail(productId))
await navigator.redirectTo(routes.order.detail(orderId))
await navigator.reLaunch(routes.auth.login())
await navigator.back()
~~~

禁止：

~~~javascript
navigator.navigateTo('/subPackages/commerce/pages/product/detail')
navigator.navigateTo(PRODUCT_DETAIL, { productId })
navigator.toProductDetail({ productId })
safeNavigateTo(...)
safeRedirectTo(...)
safeReLaunch(...)
safeNavigateBack(...)
~~~

原因：

- query 只能由 routes 工厂构造一次。
- navigator 的第二个参数不再承担 query。
- 页面不应同时选择“常量方式”和“工厂方式”。
- 删除业务快捷方法可以避免 routes 与 navigator 两套签名长期漂移。

## 4. routes.js 必须按以下接口重写

基础 path 可以在 routes.js 内部定义，但业务页面只允许 import routes，不允许 import PAY_PAGE、ORDER_DETAIL、AGREEMENT 等大写路径常量。

最终工厂签名固定：

~~~javascript
export const routes = {
  startup: () => string,
  home: () => string,

  auth: {
    login: ({ redirect } = {}) => string,
    applySign: () => string,
    agreement: ({ type = 'user' } = {}) => string,
    accountStatus: ({ reason } = {}) => string,
  },

  commerce: {
    productList: ({ categoryId, keyword } = {}) => string,
    productDetail: (productId) => string,
    productVariants: (productId) => string,
    cart: () => string,
    checkout: ({ source = 'cart' } = {}) => string,
  },

  order: {
    list: ({ status, selectMode } = {}) => string,
    detail: (orderId) => string,
    pay: (orderId, { paymentMode } = {}) => string,
    afterSaleApply: (orderId) => string,
    afterSaleList: () => string,
  },

  account: {
    center: () => string,
    profile: () => string,
    address: ({ selectMode } = {}) => string,
    subAccount: () => string,
    security: () => string,
    recharge: () => string,
    fundFlow: () => string,
    billList: ({ year, month } = {}) => string,
    billDetail: (billId) => string,
    invoice: () => string,
    voucher: () => string,
    language: () => string,
  },

  content: {
    news: () => string,
    newsDetail: (id) => string,
    manual: () => string,
    manualPreview: (manualId, { needConfirm = false } = {}) => string,
    messages: () => string,
    help: () => string,
    about: () => string,
  },
}
~~~

### 4.1 buildQuery

buildQuery 只接受普通对象。

- undefined、null 不输出。
- 字符串、数字、数组传给 buildQuery 时，开发和测试环境必须抛 TypeError。
- key 和 value 都 encodeURIComponent。
- 不允许对象值被编码为 [object Object]。
- 同一 URL 不能生成两个 ?。

### 4.2 必填 ID

以下工厂缺少有效 ID 时必须抛出明确错误，禁止生成没有参数的详情页 URL：

- productDetail(productId)
- productVariants(productId)
- order.detail(orderId)
- order.pay(orderId)
- order.afterSaleApply(orderId)
- account.billDetail(billId)
- content.newsDetail(id)
- content.manualPreview(manualId)

有效 ID 是非空字符串或大于 0 的有限数字。字符串 ID 必须 trim。

### 4.3 URL 标准化

routes.js 导出：

~~~javascript
normalizeRoutePath(url)
isRegisteredRoute(url)
sanitizeRedirect(url, fallbackUrl)
~~~

normalizeRoutePath 必须：

- 去掉 query。
- 去掉 hash。
- 保留开头 /。
- 对空值返回空字符串。

例如：

~~~javascript
normalizeRoutePath('/subPackages/auth/pages/agreement/index?type=privacy')
// /subPackages/auth/pages/agreement/index
~~~

sanitizeRedirect 必须拒绝：

- http://
- https://
- //
- javascript:
- data:
- 包含路径穿越的值。
- 未在 pages.json/REGISTERED_ROUTES 注册的内部地址。
- startup 和 login 自循环目标。

不合法时返回 routes.home()。

## 5. routeMeta.js 必须独立

把 routes.js 中的 ROUTE_META、PUBLIC_ROUTES、FROZEN_ALLOWED_ROUTES 迁入 routeMeta.js。

元数据必须覆盖 pages.json 中全部 35 个页面，不允许依靠默认值掩盖漏配。

示例：

~~~javascript
{
  path: '/subPackages/commerce/pages/cart/index',
  requireAuth: true,
  requireSign: true,
  allowFrozen: false,
  owner: null,
}
~~~

基本规则：

- startup、login、applySign、agreement、accountStatus、language 可免登录。
- 商品、购物车、结算、订单、账单、地址等需要登录且需要完成签约。
- accountStatus、agreement、help、about、language 可按现有产品规则允许冻结账号访问。
- subAccount 必须 owner=main。
- 每条 path 必须存在于 REGISTERED_ROUTES。

## 6. routeGuard.js 必须成为唯一判定入口

删除 navigator.js 内部的 canAccess、isPublicRoute、isFrozenAllowed。

routeGuard 的检查顺序固定：

1. normalizeRoutePath(url)。
2. isRegisteredRoute(url)，未注册返回 NOT_REGISTERED。
3. 读取精确 routeMeta。
4. requireAuth=false 则放行。
5. 未登录返回 NOT_LOGGED_IN，redirectUrl 为 routes.auth.login({ redirect: 原完整 URL })。
6. 冻结且 allowFrozen=false，返回 ACCOUNT_FROZEN。
7. requireSign=true 且未签约，返回 NOT_SIGNED，目标为 routes.auth.applySign()。
8. owner=main 且非主账号，返回 MAIN_ACCOUNT_ONLY，目标为 routes.home()。
9. 其余放行。

routeGuard 应允许测试注入用户快照，不能只能依赖全局 Pinia：

~~~javascript
canAccess(url, {
  isLogin,
  isSigned,
  isFrozen,
  isMainAccount,
})
~~~

navigator 调用时可以从 userStore 构造快照。

## 7. navigator.js 统一实现要求

最终只导出：

~~~javascript
navigator.navigateTo(url, options?)
navigator.redirectTo(url)
navigator.reLaunch(url)
navigator.back(options?)
navigator.backWithConfirm(options?)
navigator.handleAuthError()
navigator.resetAuthGuard()
~~~

删除：

- safeNavigateTo
- safeRedirectTo
- safeReLaunch
- safeNavigateBack
- toHome
- toLogin
- toProductList
- toProductDetail
- toCart
- toCheckout
- toOrderDetail
- toAfterSaleApply
- toAccountCenter
- 文件底部重复导出的 HOME、LOGIN

### 7.1 返回值

所有导航方法统一返回 Promise<boolean>：

- UniApp success -> true。
- 守卫拒绝且已成功跳到 redirectUrl -> false。
- UniApp fail 且降级也失败 -> false。
- 不静默 throw。

调用方不得使用 .catch 判断 false：

错误：

~~~javascript
navigator.reLaunch(url).catch(showError)
~~~

正确：

~~~javascript
const success = await navigator.reLaunch(url)
if (!success) showError()
~~~

修复 pages/startup/index.vue 的 routeOnce。

### 7.2 navigateTo options

query 已经包含在 routes 工厂返回值中。第二参数只允许 UniApp 导航选项，例如跨页 eventChannel：

~~~javascript
navigator.navigateTo(url, {
  events: {
    addressSelected(payload) {},
  },
})
~~~

navigator 负责把白名单 options 传给 uni.navigateTo，但 url 只能来自第一个参数。禁止第二参数再次拼 query。

### 7.3 被拒绝处理

- NOT_LOGGED_IN -> reLaunch 登录页，并保留 redirect。
- NOT_SIGNED -> reLaunch 签约页。
- ACCOUNT_FROZEN -> reLaunch 账户状态页。
- MAIN_ACCOUNT_ONLY -> 提示无权限并回首页/上一页。
- NOT_REGISTERED -> 不调用 UniApp 导航，开发环境打印明确错误并返回 false。

内部执行安全 redirect 时不能再次形成无限递归守卫。

### 7.4 返回兜底

页面栈足够时 navigateBack。

页面栈不足或 navigateBack 失败时：

- 已登录且账号可用 -> reLaunch routes.home()。
- 未登录 -> reLaunch routes.auth.login()。
- 冻结 -> reLaunch routes.auth.accountStatus()。

禁止无条件 reLaunch HOME。

## 8. AppHeader 返回行为

当前 AppHeader 调 safeNavigateBack 后永远得到 true，导致 back 事件永远不触发。

统一为：

- AppHeader 默认 autoBack=true，点击时 await navigator.back()。
- 同时 emit 一个 backResult 事件，参数为 { success }，仅用于观察。
- 需要自定义返回/未保存确认的页面设置 autoBack=false，并监听 back 事件。
- 删除当前页面中只是重复调用 safeNavigateBack 的 @back。

本轮现有页面没有必要的自定义返回逻辑，因此：

- product/list、product/detail、product/variants、cart、news/detail、manual/preview、profile 的重复 @back 监听删除。
- 统一依赖 AppHeader 默认返回。
- 若确实存在未保存表单，再单独设置 autoBack=false。

## 9. 每个调用文件必须这样修改

### 9.1 主包

src/pages/home/index.vue：

~~~javascript
navigator.navigateTo(routes.commerce.productList())
navigator.navigateTo(routes.content.news())
navigator.navigateTo(routes.content.messages())
navigator.navigateTo(routes.account.center())
~~~

删除所有 /subPackages/... 硬编码。

src/pages/startup/index.vue：

- targetUrl 先 sanitizeRedirect/检查注册。
- 使用 await navigator.reLaunch(targetUrl)。
- 返回 false 时进入现有 error 状态。
- 不再使用 .catch 处理 false。

### 9.2 auth

login/index.vue：

- import onLoad、routes、navigator。
- onLoad 读取 options.redirect。
- 使用 sanitizeRedirect 校验并保存 redirectTarget。
- 登录成功后 navigator.reLaunch(redirectTarget)，不是永远回首页。
- 协议：navigator.navigateTo(routes.auth.agreement({ type }))。
- 申请签约：navigator.navigateTo(routes.auth.applySign())。
- 删除 safeNavigateTo、safeReLaunch 和大写 AGREEMENT/APPLY_SIGN import。

apply-sign/index.vue：

- 合作协议：navigator.navigateTo(routes.auth.agreement({ type: 'sign' }))。
- 删除 AGREEMENT 常量和 safeNavigateBack。
- 成功后的目标根据当前产品流程明确选择 accountStatus 或 login，不允许依靠页面栈偶然返回。

useAuth.js：

- 删除自己维护的 canAccessPage/whiteList，访问判定只用 routeGuard。
- 冻结：navigator.reLaunch(routes.auth.accountStatus({ reason }))。
- 未登录：navigator.reLaunch(routes.auth.login())。
- 未签约：navigator.reLaunch(routes.auth.applySign())。
- 删除全部硬编码路径和 safeReLaunch。

account-status/index.vue：

- 退出时先 await userStore.logout()。
- 再 navigator.reLaunch(routes.auth.login())。

about/index.vue：

- 协议使用 routes.auth.agreement({ type: 'user' })。
- 隐私使用 routes.auth.agreement({ type: 'privacy' })。
- 删除硬编码 auth 路径。

### 9.3 commerce

product/list.vue：

~~~javascript
navigator.navigateTo(routes.commerce.cart())
navigator.navigateTo(routes.commerce.productDetail(item.productId))
~~~

product/detail.vue：

~~~javascript
navigator.navigateTo(routes.commerce.cart())
~~~

product/variants.vue：

- 必须通过 routes.commerce.productVariants(productId) 进入。
- 去购物车使用 routes.commerce.cart()。

cart/index.vue：

~~~javascript
navigator.navigateTo(routes.commerce.productDetail(productId))
navigator.navigateTo(routes.commerce.productList())
navigator.navigateTo(routes.commerce.checkout())
~~~

checkout/index.vue：

- 不再 import ORDER_LIST。
- CreateOrder 成功必须读取 response.orderId。
- orderId 缺失视为响应错误，不允许假成功跳转。
- 提交成功后默认：

~~~javascript
await navigator.redirectTo(routes.order.detail(response.orderId))
~~~

- 如果后端明确返回 requiresPayment=true，才进入：

~~~javascript
await navigator.redirectTo(
  routes.order.pay(response.orderId, { paymentMode: response.paymentMode })
)
~~~

- 禁止 navigateTo 订单列表。
- 地址卡片增加点击：

~~~javascript
navigator.navigateTo(routes.account.address({ selectMode: 'checkout' }), {
  events: {
    addressSelected(address) {
      // 更新当前结算地址并重新 PreviewOrder
    },
  },
})
~~~

### 9.4 order

order/list/index.vue：

- 删除 PAY_PAGE 常量。
- 详情：navigator.navigateTo(routes.order.detail(orderId))。
- 支付：navigator.navigateTo(routes.order.pay(order.orderId))。
- 读取 options.selectMode。
- selectMode=afterSale 时，点击订单不进详情，而是通过 opener eventChannel 返回 orderSelected 后 navigator.back()。
- 普通模式保持详情跳转。

order/detail/index.vue：

- 删除 PAY_PAGE、APPLY_AFTER_SALE 常量。
- 支付：routes.order.pay(orderId)。
- 售后：routes.order.afterSaleApply(orderId)。

order/after-sale/apply.vue：

- 有 orderId 时直接加载可售后商品。
- 无 orderId 点击选订单：

~~~javascript
navigator.navigateTo(routes.order.list({ selectMode: 'afterSale' }), {
  events: {
    orderSelected(payload) {
      // 校验 payload.orderId，赋值并加载商品
    },
  },
})
~~~

- 删除 ORDER_LIST 常量。

message/index.vue：

- 全部使用 routes 工厂。
- 消息关联订单详情必须校验 relatedId。
- 支付消息使用 routes.order.pay(relatedId)。
- 售后消息使用 afterSaleList。
- 账单消息只有 billId 时进入 billDetail；只有列表语义时进入 billList。

### 9.5 account

center/index.vue 的全部入口改为：

~~~javascript
routes.content.messages()
routes.account.profile()
routes.order.list()
routes.account.recharge()
routes.account.billList()
routes.account.fundFlow()
routes.order.afterSaleList()
routes.account.invoice()
routes.account.address()
routes.account.voucher()
routes.account.subAccount()
routes.account.security()
routes.account.language()
routes.content.help()
routes.content.about()
~~~

退出登录使用 routes.auth.login()。

bill/list.vue 与 bill/detail.vue：

- 账单详情继续使用 routes.account.billDetail(billId)。
- 删除 routes.order.pay(billId)。
- billId 不是 orderId，绝不能包装成 orderId。
- 如果 payBill API 已真实实现，原页调用 payBill(billId) 并刷新账单。
- 如果后端未实现，隐藏/禁用支付入口并展示“账单支付暂未开放”。
- 不得为了能跳页面而跳订单支付页。

address/index.vue：

- onLoad 读取 selectMode。
- selectMode=checkout 时，选择地址通过 opener eventChannel emit addressSelected，然后 await navigator.back()。
- 普通地址管理模式不在点击卡片时直接返回。

### 9.6 content

news/index.vue：

- 新闻详情：routes.content.newsDetail(item.id)。
- 手册预览必须存在真实 manualId；不存在就不导航。

manual/index.vue：

- preview(item) 调 routes.content.manualPreview(item.id)。

help/index.vue：

- guide.id 如果不是 manualId，不能假装手册 ID。
- 有对应 manualId 才调用 manualPreview(manualId)。
- 没有真实目标时显示暂未开放，不导航到错误内容。

manual/preview.vue：

- 增加 onLoad。
- 读取 manualId、needConfirm。
- 缺少 manualId 进入明确错误态并禁止下载。
- 根据 manualId 请求/显示对应手册，不能无论传什么都显示固定“2026 产品电子手册”。

## 10. 路由方法使用规则

必须统一：

| 场景 | 方法 |
|---|---|
| 列表进入详情、首页进入业务页、打开选择页 | navigator.navigateTo |
| 表单提交完成，不允许返回旧表单 | navigator.redirectTo |
| 冷启动完成、登录成功、退出登录、401、冻结/签约拦截 | navigator.reLaunch |
| 普通返回 | navigator.back |
| 未保存内容确认 | navigator.backWithConfirm |

禁止在业务页面直接调用：

- uni.navigateTo
- uni.redirectTo
- uni.reLaunch
- uni.switchTab
- uni.navigateBack

状态栏 plus.navigator 不属于页面路由，不要误删。

## 11. 必须补充的测试

保留现有测试，并新增/重写以下覆盖。

### routesTest.js

至少覆盖：

- pages.json 35 个注册页面与 routes/routeMeta 一一对应。
- 每个详情工厂缺 ID 都抛错。
- order.pay(123) 生成 orderId=123。
- order.pay({ orderId: 123 }) 必须抛错，防止两种签名并存。
- order.pay('BILL123') 只代表订单 ID字符串；账单页面静态检查不得调用它。
- agreement privacy/sign 参数。
- accountStatus reason 参数。
- manualPreview manualId 参数。
- query 特殊字符编码。
- buildQuery 拒绝 primitive、array、object value。
- normalizeRoutePath 能移除 query/hash。
- sanitizeRedirect 拒绝外链、协议注入、未注册路由和登录自循环。

### routeGuardTest.js

至少覆盖：

- 带 query 的公开协议页仍公开。
- 未登录访问商品详情跳登录，并保留完整 redirect。
- 已登录未签约访问购物车跳 applySign。
- 冻结用户只能访问 allowFrozen 页面。
- 非主账号访问 subAccount 被拒绝。
- 未注册内部路径被拒绝。
- query 不影响 routeMeta 匹配。

### navigatorTest.js

至少覆盖：

- navigator 真正调用 routeGuard。
- navigator.js 不再存在第二个 canAccess。
- navigateTo/redirectTo/reLaunch 返回 Promise<boolean>。
- startup 能识别 false。
- navigateTo 失败的 redirectTo 降级。
- 未登录返回时不能兜底到首页。
- 带 redirect 的登录页不会被再次拦截。
- NOT_SIGNED、ACCOUNT_FROZEN、MAIN_ACCOUNT_ONLY 分别执行正确目标。
- eventChannel options 能传给 uni.navigateTo。

### pageNavigationContractTest.js

静态扫描全部 src/pages 和 src/subPackages 页面：

- 不存在硬编码 /pages/ 或 /subPackages/ 字符串。
- 不 import 大写路由常量。
- 不调用 navigator.toXxx。
- 不使用 safeNavigateXxx。
- 不在 navigator.js 外调用 UniApp 五种导航 API。
- 使用 navigator 的文件必须显式 import navigator。
- 使用 routes 的文件必须显式 import routes。
- 不存在 PAY_PAGE、ORDER_LIST、AGREEMENT 等未导入标识。
- bill 页面不得调用 routes.order.pay。
- 所有目标页 onLoad 参数与 routes 工厂键一致。

仅正则扫描路径不够。必须至少加入 ESLint 的 no-undef 与 eslint-plugin-vue，或使用 Vue SFC parser 检查 script setup 标识，确保以后 navigator 未导入会直接失败。

## 12. auditRoutes.js 必须增强

现有 audit:routes 显示 0 错误却漏掉 6 个运行时未定义变量，当前门禁不合格。

增强后以下问题必须返回非零退出码：

- 页面硬编码内部绝对路由。
- 页面 import 大写路由常量。
- safeNavigateXxx 残留。
- navigator.toXxx 残留。
- navigator 未导入却被调用。
- routes 未导入却被调用。
- navigator.js 外直接调用 UniApp 导航。
- routes/routeMeta/pages.json 不一致。
- 详情页工厂与目标 onLoad 参数不一致。
- bill 页面调用 order.pay。
- navigator.js 声明本地 canAccess。
- routeGuard 没有 requireSign 检查。

不要通过把正式页面加入 ignore 列表来消除错误。

## 13. 固定执行顺序

### Gate A：重写核心四文件

1. 重写 routes.js。
2. 新建 routeMeta.js。
3. 重写 routeGuard.js。
4. 重写 navigator.js。
5. 核心测试通过。

Gate A 不通过，不改页面调用。

### Gate B：逐模块迁移页面

按顺序：

    startup/home
    auth
    commerce
    order
    account
    content
    AppHeader

每处理一组：

- 更新 import。
- 替换调用。
- 核对目标 onLoad。
- 运行相关测试。

### Gate C：跨页面业务契约

完成：

- 登录 redirect 恢复。
- checkout -> address -> addressSelected。
- afterSaleApply -> order list select -> orderSelected。
- manual list/help/news -> manual preview manualId。
- checkout success -> order detail/pay。
- bill payment 不再冒充 order payment。

### Gate D：删除旧调用层

删除 safe 包装函数、navigator 业务快捷方法和页面大写路由常量 import。

运行：

    rg -n "safeNavigate|navigator\.to[A-Z]" src
    rg -n "['\"]/subPackages/|['\"]/pages/" src/pages src/subPackages
    rg -n "uni\.(navigateTo|redirectTo|reLaunch|switchTab|navigateBack)" src
    rg -n "PAY_PAGE|ORDER_LIST|ORDER_DETAIL|AGREEMENT|MANUAL_PREVIEW" src/pages src/subPackages

验收要求：

- 前两项结果为 0。
- UniApp 导航只允许在 navigator.js 出现。
- 大写路由常量只允许 app/config、app/navigation 内部使用。

### Gate E：最终验证

严格依次执行：

    npm test
    npm run audit:routes
    npm run build:h5
    npm run build:app
    npm run build:weixin

任何命令失败必须继续修复，不能用“编译通过但还有后续问题”结束。

## 14. 最终交付要求

最终回复必须提供：

1. routes.js、routeMeta.js、routeGuard.js、navigator.js 的最终职责。
2. 删除的旧接口：safe 方法、toXxx 方法、大写常量页面 import。
3. 所有页面路由调用迁移清单。
4. 登录 redirect 实际流程。
5. 地址和售后 eventChannel 流程。
6. checkout 成功后的真实 orderId 跳转。
7. 账单支付最终处理结果。
8. 手册 manualId 参数闭环。
9. 路由测试数量和结果。
10. audit:routes 摘要。
11. H5、App、微信构建结果。
12. 以下扫描的原始结果：

       rg -n "safeNavigate|navigator\.to[A-Z]" src
       rg -n "['\"]/subPackages/|['\"]/pages/" src/pages src/subPackages
       rg -n "uni\.(navigateTo|redirectTo|reLaunch|switchTab|navigateBack)" src

只有统一到：

    navigator.navigateTo(routes.xxx())
    navigator.redirectTo(routes.xxx())
    navigator.reLaunch(routes.xxx())
    navigator.back()

这一套调用方式，并完成守卫与跨页面参数闭环后，才可以声明路由统一完成。
