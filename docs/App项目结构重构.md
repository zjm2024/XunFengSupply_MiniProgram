# SupplyChain MiniProgram 项目结构重构与业务收口执行提示词 V3

> 本文件是本轮重构的唯一执行依据。直接在真实项目中实施，不要只分析、只写计划、只创建目录，也不要再另建一份“新架构方案”。
>
> 本提示词基于 2026-09-06 对磁盘现状、三端构建、测试、源码引用和微信构建产物的重新检查编写。此前任何“已完成”结论与本文件冲突时，以本文件为准。

## 0. 项目位置、权限与总目标

前端项目：

    E:\MyWork\AppProject\SupplyChain.MiniProgram

只读后端契约：

    E:\MyWork\全部项目\供应链项目\SupplyChain.Backend

本次总目标：

    最小主包
      + auth、commerce、order、account、content 五个业务分包
      + app 应用级基础设施
      + shared 真正跨包共享能力
      + 商品、购物车、结算真实接口闭环
      + 可发布的小程序包体门禁

当前工作区已有大量用户未提交修改，必须在现有修改上继续完成。禁止执行：

- git reset --hard
- git checkout -- 文件或目录
- git clean
- 覆盖式重新生成项目
- 回滚用户已经完成的 UI、响应式、商品详情和购物车成果
- 修改后端代码
- 修改无关的 .catpaw、管理端项目或 UI 设计稿
- 擅自创建分支、提交或推送
- 未检查引用就批量删除

允许删除的对象只有本文件“必须删除清单”明确列出的前端旧文件，并且必须先完成替代、修改全部引用、通过对应 Gate，再删除旧文件。

## 1. 当前真实完成情况

不要再次笼统声称“重构已完成”。当前状态是“页面目录迁移已有进展，但代码依赖、运行时行为、审计与旧文件清理尚未完成”。

### 1.1 已经完成或基本完成

- pages.json 的主包页面已收敛为 pages/startup/index 和 pages/home/index。
- pages.json 已建立 auth、commerce、order、account、content 五个分包。
- 旧的 authSub、goodsSub、orderSub、paySub、afterSaleSub、settlementSub、systemSub 页面目录在工作树中已删除。
- 当前 App、微信小程序、H5 三端均能完成编译。
- 当前 Vitest 共 8 个测试文件、199 个断言通过。
- 除 src/app/navigation/navigator.js 外，源码静态扫描暂未发现直接调用 UniApp 页面跳转 API。
- 微信小程序当前真实构建产物 dist/build/mp-weixin 的原始文件合计约 867,513 bytes：
  - main：541,198 bytes
  - account：81,979 bytes
  - auth：50,814 bytes
  - commerce：87,608 bytes
  - content：46,551 bytes
  - order：59,363 bytes

以上只能证明“目前可编译”，不能证明“重构完成”或“页面运行正确”。

### 1.2 当前必须返工的问题

1. npm run audit:routes 失败，package.json 指向不存在的 scripts/auditRoutes.js，实际只有 scripts/audit-routes.mjs。
2. scripts/audit-routes.mjs 和 scripts/audit-size.mjs 均违反 JavaScript 文件名规则。
3. audit-size.mjs 统计 src 源码并乘估算系数，不是分析 dist/build/mp-weixin 的真实产物，不能用于发布验收。
4. 根 src/api 仍有 10 个兼容转发文件。
5. 根 src/hooks 仍有 8 个兼容转发文件。
6. 根 src/store 仍聚合业务 Store，main.js 因此把 cart、message、order 的入口带入主包。
7. 根 src/config、src/utils、src/components 仍存在大量旧实现和重复组件。
8. shared 中仍有“再转发回根目录”的假迁移：
   - shared/utils/storage.js 转发到 src/utils/storage.js
   - shared/utils/business.js 转发到 src/utils/business.js
   - shared/composables/usePageState.js 引用 src/config/pageState.js
   - shared UI 仍引用 src/hooks 和 src/components
9. commerce 的商品、购物车、结算正式页面仍引用根 api、hooks、store、config、components，测试覆盖的新实现不是页面唯一实际实现。
10. startup 页面仍引用根 hooks/useAppBootstrap.js 和根 config/startup.js。
11. app/bootstrap/useAppBootstrap.js 直接 import auth 分包代码，违反“主包不得 import 分包”。
12. content 新闻、消息页面仍引用根 api、hooks、store、utils、components。
13. auth apply-sign 页面仍引用根 api、utils、components。
14. account 多个页面仍引用根 empty-view。
15. src/app/config/constant.js 混合 Token、用户、商品、订单、售后、账单、UI 和校验规则，是新的“大杂烩”。
16. src/subPackages/commerce/pages/checkout/index.vue 导入 safeNavigateTo，却实际调用未定义的 navigator 和 ORDER_LIST；构建未报告，但运行时会报错。
17. checkout 没有先调用 PreviewOrder，金额仍信任本地购物车；提交前没有可靠 flush；成功后调用 clearCart 会误删未选商品；没有使用 CreateOrder 返回的 orderId。
18. 多个订单、售后、账单页面给 StatusTag 传 statusValue 和业务 type，但 shared/ui/StatusTag 实际只支持 type、text，运行时展示契约已断裂。
19. about 页面仍导航到未注册且不存在的 /pages/webview/index。
20. default-product.png、default-avatar.png、guide-1.png、guide-2.png 被引用但文件不存在。
21. 根 static/images/jersey-model.png 约 173,050 bytes，属于内容手册占位资源，却进入主包。
22. root jersey-red.png 被订单页面当兜底图，业务资源错误进入主包。
23. 正式页面仍存在 Mock、TODO、Promise.reject 占位；不能把占位页面描述为已对接。
24. docs/APP_RESTRUCTURE_PLAN.md 内容过时、章节编号错误，仍写 2 个测试/旧路由等历史状态。

## 2. 不得违反的结构规则

### 2.1 唯一分层

允许的源码顶层只有：

    src/app
    src/shared
    src/pages
    src/subPackages
    src/static
    src/nativePlugins

禁止重新出现：

    src/api
    src/hooks
    src/store
    src/config
    src/utils
    src/components
    src/modules
    src/features
    src/services

### 2.2 依赖方向

允许：

    主包页面 -> app、shared
    分包页面 -> 本分包代码、app/navigation、shared
    app -> shared
    shared -> shared

禁止：

- src/pages、src/app、src/shared import 任意 src/subPackages 文件。
- 一个 subPackage import 另一个 subPackage 文件。
- shared import 商品、购物车、订单、账单、售后等分包实现。
- 页面直接 import dispatchClient 并手写后端请求。
- 页面或 Store 构造 PascalCase DTO。
- API、model、service、store 调用 toast、弹窗或页面导航。
- main.js 聚合或导出任何业务 Store。
- 通过 re-export 保留根 api、hooks、store 兼容层。
- 为了“先让构建通过”而创建新的转发文件。

### 2.3 JavaScript 文件命名

所有源码、测试、脚本只使用最后一个 .js 扩展名，主名使用 camelCase。

允许：

    productApi.js
    cartStore.js
    orderMapper.js
    cartSyncScheduler.js
    cartMapperTest.js
    auditRoutes.js
    analyzeMpPackage.js

禁止：

    product.api.js
    cart.store.js
    order.mapper.js
    cartMapper.test.js
    audit-routes.mjs
    audit-size.mjs
    任意 .mjs
    任意 .cjs

package.json 当前没有 type: module。scripts 下两个 Node 脚本必须使用 CommonJS require/module.exports，不要为了 ESM 修改整个项目模块类型。

Vue 组件目录和文件使用 PascalCase；页面路径沿用 pages.json 需要的 kebab-case。

## 3. 唯一最终目录

下面是本轮完成后必须得到的目录。不要创建空目录，不要保留同义重复文件，不要改成另一套命名。

~~~text
SupplyChain.MiniProgram/
├─ package.json
├─ package-lock.json
├─ vite.config.js
├─ vitest.config.js
├─ scripts/
│  ├─ auditRoutes.js
│  └─ analyzeMpPackage.js
├─ tests/
│  ├─ auditRoutesTest.js
│  ├─ cartHookIntegrationTest.js
│  ├─ cartMapperTest.js
│  ├─ cartSyncSchedulerTest.js
│  ├─ checkoutApiTest.js
│  ├─ checkoutBoundaryTest.js
│  ├─ navigatorTest.js
│  ├─ orderApiTest.js
│  ├─ orderCheckoutIntegrationTest.js
│  ├─ packageBoundaryTest.js
│  ├─ packageSizeTest.js
│  ├─ pageRegistrationTest.js
│  ├─ productApiTest.js
│  └─ routesTest.js
├─ docs/
│  ├─ APP_RESTRUCTURE_PLAN.md
│  ├─ APP_UI_FOUNDATION.md
│  ├─ MINI_API_CONTRACT.md
│  └─ REFACTOR_PHASE0_AUDIT.md
└─ src/
   ├─ App.vue
   ├─ main.js
   ├─ manifest.json
   ├─ pages.json
   ├─ uni.scss
   ├─ nativePlugins/
   │  └─ .gitkeep
   ├─ app/
   │  ├─ bootstrap/
   │  │  ├─ appBootstrap.js
   │  │  └─ bootstrapApi.js
   │  ├─ config/
   │  │  ├─ routeMeta.js
   │  │  ├─ routes.js
   │  │  ├─ runtimeConfig.js
   │  │  └─ startupConfig.js
   │  └─ navigation/
   │     ├─ navigator.js
   │     └─ routeGuard.js
   ├─ pages/
   │  ├─ startup/
   │  │  ├─ index.vue
   │  │  └─ components/
   │  │     ├─ StartupBrand.vue
   │  │     ├─ StartupError.vue
   │  │     └─ StartupLoading.vue
   │  └─ home/
   │     └─ index.vue
   ├─ shared/
   │  ├─ api/
   │  │  ├─ appError.js
   │  │  ├─ areaApi.js
   │  │  ├─ dispatchClient.js
   │  │  └─ uploadClient.js
   │  ├─ contracts/
   │  │  └─ orderContract.js
   │  ├─ composables/
   │  │  ├─ usePageState.js
   │  │  └─ useResponsive.js
   │  ├─ model/
   │  │  └─ pageState.js
   │  ├─ session/
   │  │  ├─ sessionCleanup.js
   │  │  ├─ sessionKeys.js
   │  │  ├─ userProfile.js
   │  │  └─ userStore.js
   │  ├─ styles/
   │  │  ├─ reset.scss
   │  │  ├─ responsive.scss
   │  │  └─ tokens.scss
   │  ├─ ui/
   │  │  ├─ AppButton/AppButton.vue
   │  │  ├─ AppCard/AppCard.vue
   │  │  ├─ AppContent/AppContent.vue
   │  │  ├─ AppHeader/AppHeader.vue
   │  │  ├─ AppIcon/AppIcon.vue
   │  │  ├─ AppImage/AppImage.vue
   │  │  ├─ AppListGroup/AppListGroup.vue
   │  │  ├─ AppListItem/AppListItem.vue
   │  │  ├─ AppLoadMore/AppLoadMore.vue
   │  │  ├─ AppNetworkBanner/AppNetworkBanner.vue
   │  │  ├─ AppPageShell/AppPageShell.vue
   │  │  ├─ AppPageState/AppPageState.vue
   │  │  ├─ AppStatusBarSpacer/AppStatusBarSpacer.vue
   │  │  ├─ AreaCascadePicker/AreaCascadePicker.vue
   │  │  ├─ ConfirmPopup/ConfirmPopup.vue
   │  │  ├─ FileUploader/FileUploader.vue
   │  │  ├─ FixedActionBar/FixedActionBar.vue
   │  │  └─ StatusTag/StatusTag.vue
   │  └─ utils/
   │     ├─ format.js
   │     ├─ helpers.js
   │     └─ storage.js
   ├─ static/
   │  ├─ fonts/
   │  │  └─ .gitkeep
   │  └─ images/
   │     └─ logo.png
   └─ subPackages/
      ├─ auth/
      │  ├─ api/
      │  │  └─ authApi.js
      │  ├─ components/
      │  │  └─ LoginSliderCaptcha.vue
      │  ├─ composables/
      │  │  └─ useAuth.js
      │  ├─ model/
      │  │  ├─ authConstants.js
      │  │  ├─ authMapper.js
      │  │  └─ signValidation.js
      │  └─ pages/
      │     ├─ account-status/index.vue
      │     ├─ agreement/index.vue
      │     ├─ apply-sign/index.vue
      │     └─ login/index.vue
      ├─ commerce/
      │  ├─ api/
      │  │  ├─ cartApi.js
      │  │  ├─ checkoutApi.js
      │  │  └─ productApi.js
      │  ├─ components/
      │  │  ├─ BatchCheckbox/BatchCheckbox.vue
      │  │  └─ QuantityStepper/QuantityStepper.vue
      │  ├─ composables/
      │  │  ├─ useCart.js
      │  │  ├─ useCheckout.js
      │  │  └─ useProduct.js
      │  ├─ model/
      │  │  ├─ cartMapper.js
      │  │  ├─ cartStore.js
      │  │  ├─ checkoutConstants.js
      │  │  ├─ checkoutMapper.js
      │  │  ├─ productConstants.js
      │  │  └─ productMapper.js
      │  ├─ pages/
      │  │  ├─ cart/index.vue
      │  │  ├─ checkout/index.vue
      │  │  └─ product/
      │  │     ├─ detail.vue
      │  │     ├─ list.vue
      │  │     └─ variants.vue
      │  └─ services/
      │     ├─ cartService.js
      │     └─ cartSyncScheduler.js
      ├─ order/
      │  ├─ api/
      │  │  ├─ afterSaleApi.js
      │  │  └─ orderApi.js
      │  ├─ composables/
      │  │  └─ useOrder.js
      │  ├─ model/
      │  │  ├─ afterSaleMapper.js
      │  │  ├─ orderConstants.js
      │  │  ├─ orderMapper.js
      │  │  └─ orderStore.js
      │  └─ pages/
      │     ├─ after-sale/
      │     │  ├─ apply.vue
      │     │  └─ list.vue
      │     ├─ detail/index.vue
      │     ├─ list/index.vue
      │     └─ pay/index.vue
      ├─ account/
      │  ├─ api/
      │  │  ├─ accountApi.js
      │  │  └─ settlementApi.js
      │  ├─ composables/
      │  │  ├─ useAccount.js
      │  │  └─ useSettlement.js
      │  ├─ model/
      │  │  ├─ accountConstants.js
      │  │  └─ accountMapper.js
      │  └─ pages/
      │     ├─ address/index.vue
      │     ├─ bill/detail.vue
      │     ├─ bill/list.vue
      │     ├─ center/index.vue
      │     ├─ fund-flow/index.vue
      │     ├─ invoice/index.vue
      │     ├─ language/index.vue
      │     ├─ profile/index.vue
      │     ├─ recharge/index.vue
      │     ├─ security/index.vue
      │     ├─ sub-account/index.vue
      │     └─ voucher/index.vue
      └─ content/
         ├─ api/
         │  ├─ contentApi.js
         │  └─ messageApi.js
         ├─ composables/
         │  ├─ useContent.js
         │  └─ useMessage.js
         ├─ model/
         │  ├─ contentMapper.js
         │  └─ messageStore.js
         ├─ pages/
         │  ├─ about/index.vue
         │  ├─ help/index.vue
         │  ├─ manual/index.vue
         │  ├─ manual/preview.vue
         │  ├─ message/index.vue
         │  ├─ news/detail.vue
         │  └─ news/index.vue
         └─ static/
            └─ images/
               └─ manualPlaceholder.png
~~~

说明：

- 不要把 content/pages/news/index.vue 擅自改成 list.vue；pages.json 当前真实注册的是 news/index，保持一致。
- AppIcon 必须收敛为 shared/ui/AppIcon/AppIcon.vue，更新全部 import，不能同时保留 shared/ui/AppIcon.vue。
- manualPlaceholder.png 只在手册预览确实仍需本地占位时保留；从 jersey-model.png 迁移并压缩后，文件必须位于 content 分包。若可以用接口/CDN或纯 CSS 空态，则不创建该文件。
- 除上述条件资源外，不创建空目录或空实现。目标树中声明的 .js 文件必须有真实职责且被真实代码引用。

## 4. 逐文件迁移、合并和删除清单

严格按本节执行。目标文件先承接真实实现，更新引用并测试，最后删除旧文件。

### 4.1 应用启动与配置

| 当前文件 | 动作 | 唯一目标 |
|---|---|---|
| src/config/env.js | 迁移真实运行环境配置 | src/app/config/runtimeConfig.js |
| src/config/startup.js | 重命名并迁移 | src/app/config/startupConfig.js |
| src/config/pageState.js | 迁移真实枚举和默认文案 | src/shared/model/pageState.js |
| src/config/permission.js | 拆分 | 导航访问规则放 src/app/config/routeMeta.js；账户展示常量放 account/model/accountConstants.js |
| src/app/bootstrap/useAppBootstrap.js | 重命名并修正依赖 | src/app/bootstrap/appBootstrap.js |
| src/hooks/useAppBootstrap.js | 删除转发层 | 所有调用改为 src/app/bootstrap/appBootstrap.js |
| src/app/config/constant.js | 拆分后删除 | 按下述归属拆分，不保留大杂烩 |

constant.js 拆分要求：

- TOKEN_KEY、用户缓存 Key -> shared/session/sessionKeys.js。
- 请求状态码 -> shared/api/dispatchClient.js 内部或 appError.js；没有跨文件使用就不要导出。
- PAYMENT_MODE、DELIVERY_TYPE -> shared/contracts/orderContract.js。
- 商品状态、价格相关常量 -> commerce/model/productConstants.js。
- 结算页面常量 -> commerce/model/checkoutConstants.js。
- ORDER_STATUS、订单展示映射、售后常量 -> order/model/orderConstants.js。
- 账单、账户相关常量 -> account/model/accountConstants.js。
- 登录、签约、校验相关常量 -> auth/model/authConstants.js。
- PAGE_SIZE 等纯分页常量只在真实使用处保留；不要再制造 commonConstants 大文件。
- DEFAULT_PRODUCT_IMG、DEFAULT_AVATAR 不得指向不存在文件；改用 AppImage 的错误态。
- CREDIT_RULES 中由客户端伪造信誉分增减的函数删除，授信和信誉结果以服务端为准。

bootstrap 依赖要求：

- appBootstrap.js 不得 import subPackages/auth。
- 冷启动需要的 GetBootstrapContext、CheckAppVersion 等最小请求迁到 app/bootstrap/bootstrapApi.js。
- authApi.js 只保留登录、验证码、签约等 auth 分包真实业务。
- startup/index.vue 直接引用 appBootstrap.js 和 startupConfig.js。

### 4.2 API

| 当前文件 | 动作 | 唯一目标 |
|---|---|---|
| src/api/auth.js 与 subPackages/auth/api/auth.js | 合并真实实现并重命名 | subPackages/auth/api/authApi.js |
| src/api/goods.js 与 commerce/api/productApi.js | 合并，删除转发 | commerce/api/productApi.js |
| src/api/cartApi.js 与 commerce/api/cartApi.js | 合并为唯一实现 | commerce/api/cartApi.js |
| src/api/order.js | 拆分 | PreviewOrder/CreateOrder -> commerce/api/checkoutApi.js；已创建订单操作 -> order/api/orderApi.js |
| src/api/aftersale.js | 合并 | order/api/afterSaleApi.js |
| src/api/settlement.js 与 account/api/settlement.js | 合并并重命名 | account/api/settlementApi.js |
| src/api/news.js 与 content/api/news.js | 合并并重命名 | content/api/contentApi.js |
| src/api/message.js 与 content/api/message.js | 合并并重命名 | content/api/messageApi.js |
| src/api/area.js 与 shared/api/area.js | 合并并重命名 | shared/api/areaApi.js |
| src/api/file.js 与 shared/api/file.js | 合并并重命名 | shared/api/uploadClient.js |

完成后删除整个 src/api。目标 API 不得 import 根 src/api，也不得只是 export ... from 旧文件。

### 4.3 composables、Store 与 service

| 当前文件 | 动作 | 唯一目标 |
|---|---|---|
| src/hooks/useAuth.js | 删除转发，调用方改路径 | auth/composables/useAuth.js |
| src/hooks/useCart.js | 删除转发，调用方改路径 | commerce/composables/useCart.js |
| src/hooks/useCartSyncScheduler.js | 删除转发 | commerce/services/cartSyncScheduler.js |
| src/hooks/useOrder.js | 删除转发 | order/composables/useOrder.js |
| src/hooks/useSettlement.js | 删除转发 | account/composables/useSettlement.js |
| src/hooks/usePageState.js | 删除转发 | shared/composables/usePageState.js |
| src/hooks/useResponsive.js | 删除转发 | shared/composables/useResponsive.js |
| src/store/modules/cart.js | 删除转发 | commerce/model/cartStore.js |
| src/store/modules/order.js | 删除转发 | order/model/orderStore.js |
| src/store/modules/message.js | 删除转发 | content/model/messageStore.js |
| src/store/index.js | 删除聚合入口 | main.js 直接 createPinia |

main.js 的目标写法是直接 import createPinia，创建 Pinia 后 app.use(pinia)。不得从 main.js 导入、导出 cartStore、orderStore、messageStore。

退出登录使用 shared/session/sessionCleanup.js 的注册机制。userStore 不得静态 import 三个业务 Store，否则业务代码会回到主包。

shared/utils/storage.js 必须承接真实实现，不得 re-export src/utils/storage.js。

### 4.4 utils

| 当前文件 | 动作 | 唯一目标 |
|---|---|---|
| src/utils/storage.js | 迁移真实实现 | shared/utils/storage.js |
| src/utils/format.js | 迁移通用格式化 | shared/utils/format.js |
| src/utils/helpers.js | 只迁移真正通用且被使用的函数 | shared/utils/helpers.js |
| src/utils/validate.js | 迁移签约表单校验 | auth/model/signValidation.js |
| src/utils/business.js | 拆分并删除客户端伪业务 | 用户展示等级可放 shared/session/userProfile.js；账户映射放 account/model；本地加扣信誉分删除 |
| src/utils/index.js | 删除 barrel | 调用方直接 import 具体文件 |

完成后删除整个 src/utils。

### 4.5 组件

| 当前文件 | 动作 | 唯一目标 |
|---|---|---|
| src/components/AppStatusBarSpacer.vue | 迁移 | shared/ui/AppStatusBarSpacer/AppStatusBarSpacer.vue |
| src/components/AreaCascadePicker/AreaCascadePicker.vue | 迁移 | shared/ui/AreaCascadePicker/AreaCascadePicker.vue |
| src/components/empty-view/empty-view.vue | 合并后删除 | 列表空态统一使用 shared/ui/AppPageState/AppPageState.vue |
| src/components/EmptyState/EmptyState.vue | 删除重复实现 | 使用 AppPageState |
| src/components/QuantityStepper/QuantityStepper.vue | 删除重复实现 | commerce/components/QuantityStepper/QuantityStepper.vue |
| src/components/batch-checkbox/batch-checkbox.vue | 删除重复实现 | commerce/components/BatchCheckbox/BatchCheckbox.vue |
| src/components/upload-file/upload-file.vue 与 shared/ui/uploadFile/uploadFile.vue | 合并并重命名 | shared/ui/FileUploader/FileUploader.vue |
| src/components/message-popup/message-popup.vue | 无引用，删除 | 不创建替代 |
| src/components/uni-nav-bar/uni-nav-bar.vue | 无业务引用，删除 | 使用 AppHeader |
| src/components/uni-popup/uni-popup.vue | 无业务引用，删除 | 使用 @dcloudio/uni-ui 官方 uni-popup |
| src/components/uni-icons/uni-icons.vue | 删除兼容桥 | 使用 AppIcon 或官方 uni-icons |
| shared/ui/AppIcon.vue | 迁入标准目录后删除 | shared/ui/AppIcon/AppIcon.vue |
| shared/ui/pay-mode-popup/pay-mode-popup.vue | 当前无引用，删除 | 需要支付选择时在 commerce 或 order 重新实现明确组件 |

StatusTag 的唯一公开接口固定为：

    props: type、text

orderMapper、afterSaleMapper、accountMapper 把服务端状态值转换成 type/text。页面禁止继续传 statusValue。必须逐页修复：

- order/pages/list/index.vue
- order/pages/after-sale/list.vue
- account/pages/bill/list.vue
- account/pages/bill/detail.vue

完成后删除整个 src/components。

### 4.6 样式

| 当前文件 | 动作 | 唯一目标 |
|---|---|---|
| src/shared/styles/variable.scss | 重命名并保留现有设计变量 | src/shared/styles/tokens.scss |
| src/shared/styles/reset.scss | 保留并修正引用 | 原路径 |
| src/shared/styles/responsive.scss | 保留并修正引用 | 原路径 |
| src/uni.scss | 保留 UniApp 特殊入口，只转发必须全局注入的 Token | 原路径 |

App.vue 只引入真正全局的 reset 和基础样式。分包业务样式不能全部塞进 App.vue。完成 tokens.scss 迁移后，源码中不得再引用 variable.scss，也不得并存两套颜色、字号、间距真相来源。

### 4.7 静态资源

- 保留 src/static/images/logo.png。
- 删除 src/static/images/jersey-red.png，并把订单商品图改为 AppImage 的中性错误态。
- src/static/images/jersey-model.png 不得留在主包。确需本地占位时压缩并移动到 content/static/images/manualPlaceholder.png，否则删除。
- 清除对不存在的 default-product.png、default-avatar.png、guide-1.png、guide-2.png 的引用。
- 商品、新闻、手册正式图片优先使用接口/CDN。
- UI、docs、测试资源不得复制进 src。

### 4.8 脚本

先创建并验证：

    scripts/auditRoutes.js
    scripts/analyzeMpPackage.js

然后删除：

    scripts/audit-routes.mjs
    scripts/audit-size.mjs

package.json 最终脚本固定为：

~~~json
{
  "audit:routes": "node scripts/auditRoutes.js",
  "audit:size": "node scripts/analyzeMpPackage.js",
  "audit:all": "npm run audit:routes && npm run audit:size"
}
~~~

不得出现 package.json 指向不存在文件。

## 5. 必须彻底删除的旧路径

所有替代完成并通过对应测试后，以下路径必须从磁盘消失，不允许保留兼容入口：

~~~text
src/api/
src/hooks/
src/store/
src/config/
src/utils/
src/components/
src/app/bootstrap/useAppBootstrap.js
src/app/config/constant.js
src/shared/api/area.js
src/shared/api/file.js
src/shared/ui/AppIcon.vue
src/shared/ui/pay-mode-popup/
src/shared/ui/uploadFile/
scripts/audit-routes.mjs
scripts/audit-size.mjs
src/pages/home/home.vue
src/static/images/jersey-red.png
src/static/images/jersey-model.png
src/subPackages/accountSub/
src/subPackages/afterSaleSub/
src/subPackages/authSub/
src/subPackages/goodsSub/
src/subPackages/orderSub/
src/subPackages/paySub/
src/subPackages/settlementSub/
src/subPackages/systemSub/
~~~

注意：这里的“删除整个 src/components”是指旧根目录。shared/ui 和分包 components 必须保留。

不得删除：

- src/pages/startup/index.vue 及其三个局部组件。
- src/pages/home/index.vue。
- pages.json 中已注册的五个分包页面。
- src/shared/styles 中已经完成的 UI Token 和响应式成果。
- 当前购物车调度器及其测试；应修正并扩展，不得回滚。
- 用户未提交的其他无关改动。

## 6. 路由必须唯一

pages.json 是注册事实来源，routes.js 是唯一地址构造来源，navigator.js 是唯一 UniApp 导航执行入口。

### 6.1 routes.js

必须导出语义工厂，页面不得手写完整内部路由：

    routes.startup()
    routes.home()
    routes.auth.login(options)
    routes.auth.applySign(options)
    routes.auth.agreement(options)
    routes.auth.accountStatus(options)
    routes.commerce.productList(options)
    routes.commerce.productDetail(productId, options)
    routes.commerce.productVariants(productId, options)
    routes.commerce.cart(options)
    routes.commerce.checkout(options)
    routes.order.list(options)
    routes.order.detail(orderId, options)
    routes.order.pay(orderId, options)
    routes.order.afterSaleApply(orderId, options)
    routes.order.afterSaleList(options)
    routes.account.center()
    routes.account.profile()
    routes.account.address()
    routes.account.subAccount()
    routes.account.security()
    routes.account.recharge()
    routes.account.fundFlow()
    routes.account.billList(options)
    routes.account.billDetail(billId, options)
    routes.account.invoice()
    routes.account.voucher()
    routes.account.language()
    routes.content.news()
    routes.content.newsDetail(id)
    routes.content.manual()
    routes.content.manualPreview(id)
    routes.content.messages()
    routes.content.help()
    routes.content.about()

所有 query 值统一 encodeURIComponent；routes 只能返回 pages.json 中实际注册的路径。

### 6.2 navigator.js

- 只有此文件允许调用 uni.navigateTo、uni.redirectTo、uni.reLaunch、uni.navigateBack。
- 负责页面栈满时从 navigateTo 降级到 redirectTo。
- 负责返回无上级页面时回首页。
- 负责调用纯 routeGuard 判定。
- 页面统一使用 navigator 的明确方法，不保留 safeNavigateTo 和手写路径两种并存方式。
- startup、登录成功、401、退出登录也必须经过 navigator。

必须立即修复：

- checkout/index.vue 中未定义的 navigator、ORDER_LIST。
- about/index.vue 的不存在 webview 路由：本轮直接取消跳转并显示“暂未开放”，除非先创建、注册并验证真实 webview 页面。
- home、account center、useAuth 中的手写 /subPackages/... 路径。

### 6.3 routeGuard.js

- 只返回 allow/redirect/reason 等判定结果。
- 不直接执行任何 uni 导航。
- 不 import 分包。
- routeMeta.js 保存登录、签约、冻结、主子账号、权限等路由元数据。

## 7. 商品、购物车、结算接口闭环

必须重新读取后端真实代码，不得根据旧前端函数名猜字段：

- XunFeng.Module.MallProduct/Controllers/Mini/ProductController.cs
- XunFeng.Module.MallProduct/DTOs/DealerProductDtos.cs
- XunFeng.Module.MallOrder/Controllers/Mini/CartController.cs
- XunFeng.Module.MallOrder/DTOs/CartDtos.cs
- XunFeng.Module.MallOrder/Controllers/Mini/OrderController.cs
- XunFeng.Module.MallOrder/DTOs/OrderCreateDtos.cs
- XunFeng.Module.MallOrder/DTOs/OrderQueryDtos.cs

真实 Dispatch：

| 业务 | Module | Controller | Method |
|---|---|---|---|
| 商品 | MallProduct | Mini.ProductController | GetProductList、GetProductDetail、GetCategoryTree |
| 购物车 | MallOrder | Mini.CartController | GetCart、AddToCart、BatchUpdateQuantity、RemoveItems、SelectItems、SelectAll、ClearCart、GetCartSummary |
| 结算 | MallOrder | Mini.OrderController | PreviewOrder、CreateOrder |
| 订单 | MallOrder | Mini.OrderController | GetOrderList、GetOrderDetail、GetOrderCounts、CancelOrder、GetLogistics、ConfirmReceipt |

边界固定为：

- Vue 页面、composable、Store 只使用 camelCase 领域对象。
- mapper 将 camelCase 请求转为后端 PascalCase DTO。
- mapper 将后端 PascalCase 响应转为 camelCase。
- 不依赖 .NET 大小写不敏感掩盖错误。
- GetProductDetail 请求发送 ProductId。
- AddToCart 发送 SkuId、Quantity、ClientRequestId。
- BatchUpdateQuantity 发送 Items，其中每项是 CartItemId、Quantity。
- SelectItems 发送 CartItemIds、Selected。
- PreviewOrder 发送 Items、AddressId、DeliveryType。
- CreateOrder 发送 ClientRequestId、Items、AddressId、PaymentMode、DeliveryType、CustomerRemark。

商品页面：

- product/list.vue 只通过 useProduct 调 productApi。
- product/detail.vue 和 variants.vue 只用 productId 请求详情，SKU 必须来自服务端。
- 展示经销商价格、DisplayStock、MinOrderQty、CanPurchase。
- 加购提交真实 SkuId 和合法绝对数量。
- 图片失败使用 AppImage，不再硬编码球衣图片。

结算页面：

1. 从 cartStore 取得选中项快照。
2. await cartService.flushForCheckout()；失败则停留在购物车或结算页并允许重试。
3. 调 checkoutApi.previewOrder()。
4. 页面展示服务端 preview 的金额、库存、价格、配送结果，不相信本地汇总作为最终金额。
5. 用户确认后，用同一个 clientRequestId 调 createOrder；失败重试不得换幂等 ID。
6. 使用响应中的 orderId 导航 routes.order.detail(orderId) 或支付页。
7. 成功后重新 GetCart 校准，或只移除服务端确认已下单项；禁止 clearCart 清空未选商品。
8. 直接打开 checkout 页面时，如果 Pinia 无选中项，应恢复/请求购物车，而不是静默展示空白。

## 8. 购物车高频写入与并发保护

当前后端承压有限，禁止每次点击加减、输入数量或勾选都立即请求。

canonical 实现固定为：

    commerce/model/cartStore.js
    commerce/services/cartSyncScheduler.js
    commerce/services/cartService.js
    commerce/composables/useCart.js

正式 cart、product、checkout 页面必须使用这套实现，测试也必须 import 同一目标，不能测一套、页面跑另一套。

调度规则：

1. UI 本地乐观更新。
2. 数量保存绝对最终值，不保存 +1/-1 增量。
3. 同一 CartItemId 在窗口内只保留最后值。
4. trailing debounce 650ms。
5. maxWait 1500ms。
6. 单批最多 50 条。
7. 同时最多一个购物车写请求在途。
8. 在途期间的新变更进入下一批。
9. 数量、单项选择、全选、删除可以分操作批次；同一项删除必须覆盖未发送的数量/选择修改。
10. 多次 flush 必须复用在途 Promise，或等待到队列真正 idle，不能重复发送同批数据。
11. onHide、onUnload、onBeforeUnmount 连续触发只能形成一次 best-effort flush。
12. 进入结算必须执行强一致 flush；最终失败必须 reject，禁止继续下单。
13. 400、403、404、409、413、422 等业务错误不自动重试。
14. 网络错误、超时、5xx 最多重试 2 次，指数退避加随机抖动。
15. 失败操作保留 dirty 状态，可由用户重试。
16. 旧响应不得覆盖用户稍后产生的新数量和选择状态。
17. 成功同步后不要每批都重新 GetCart；首次进入、缓存过期、冲突、用户主动刷新时才全量校准。
18. AddToCart 使用 ClientRequestId 或前端提交锁，防止双击重复加购。
19. 页面隐藏自动 flush 失败只记录同步状态，不弹阻塞 Toast；用户进入结算失败需要明确提示。
20. scheduler 的 API 依赖在 createCartSyncScheduler 时注入；flush 不再临时接收 api 参数。

## 9. Mock、TODO 和未开放功能

当前存在但后端未确认的售后列表、账单、地址、发票、优惠券、子账户、安全设备、消息等能力，必须逐个查后端。

处理规则：

- 后端有接口：按真实 Controller/DTO 接通，并加 mapper 与测试。
- 后端无接口：删除 Mock 列表和假成功操作；页面展示明确“暂未开放”或“暂无数据”状态。
- 不允许 API 用 Promise.reject 占位、页面却仍显示可操作入口。
- 未准备发布且没有接口的页面，可以从 pages.json、routes.js 和菜单入口一并取消注册；源码如保留，必须在交付报告明确 future 状态，且不能伪装已完成。
- 不得虚构客服电话、版本接口、支付接口或上传协议。

## 10. 审计脚本的具体实现

### 10.1 scripts/auditRoutes.js

必须读取 pages.json，移除可能存在的 BOM，构造注册路由集合，并以非零退出码阻止以下问题：

1. pages.json 注册页面文件不存在。
2. src/pages 和各 subPackages/pages 下存在正式 .vue 页面但未注册。
3. routes.js 基础 path 不在注册集合。
4. 源码中的内部绝对路由不在注册集合。
5. 仍有 /pages/product、/pages/cart、/pages/order 等旧路径。
6. 除 navigator.js 外直接调用五种 UniApp 导航 API。
7. src/pages、src/app、src/shared import subPackages。
8. 分包跨包 import。
9. shared import subPackages。
10. easycom 指向的本地文件不存在。
11. package.json script 指向不存在文件。
12. src 中残留根 api、hooks、store、config、utils、components。
13. 源码和 tests/scripts 中存在 .mjs、.cjs 或多点 JS 文件名。

不要把 error 降级成 warning。禁止通过排除正式页面来让审计“变绿”。导航基础设施只豁免 navigator.js；startup 也不豁免。

### 10.2 scripts/analyzeMpPackage.js

只分析真实目录：

    dist/build/mp-weixin

如果目录不存在，直接非零退出并提示先运行 npm run build:weixin。禁止扫描 src 后乘估算系数。

输出：

- 主包 bytes 和 MiB。
- 每个分包 bytes 和 MiB。
- 总包 bytes 和 MiB。
- 最大 30 个文件。
- 大于 100KB 的文件。
- 相同 hash 的重复文件。
- 主包中疑似业务 API、Store、页面资源。

内部门槛：

- 主包目标不超过 1.5MiB，超过即失败。
- 单分包目标不超过 1.5MiB，超过即失败。
- 单分包绝不接近平台 2MiB 限制。
- 总包目标不超过 15MiB，超过即失败。
- 主包单个业务占位图片超过 100KB 即失败。

## 11. 必须新增或扩展的测试

当前 199 个断言要保留。新增测试必须覆盖真实生产入口：

- productApiTest.js：ProductId、分页、分类、SKU、camelCase/PascalCase 映射。
- checkoutApiTest.js：PreviewOrder、CreateOrder DTO 与响应 orderId。
- pageRegistrationTest.js：pages.json 每个页面存在且正式页面全部注册。
- packageBoundaryTest.js：主包/shared 不 import 分包，分包不跨包，根旧目录不存在。
- auditRoutesTest.js：构造无效路由、越层 import、缺失脚本时必须非零失败。
- packageSizeTest.js：针对临时产物验证 main/分包/总包和大文件门槛。
- StatusTag 调用契约至少由页面静态测试或组件测试覆盖，确保没有 statusValue。
- checkout SFC 或 useCheckout 集成测试覆盖 flush -> preview -> create -> 使用 orderId -> 校准购物车顺序。

购物车调度器继续覆盖：

- debounce
- maxWait
- 单飞
- flush 等待在途
- 最终值合并
- 数量和选择共存
- 删除覆盖待修改
- 生命周期去重
- 业务错误不重试
- 网络/5xx 有限重试
- 失败保留 dirty
- 强制 flush 失败 reject
- 旧响应不覆盖新状态
- 多次 flush 不重复请求
- 分批上限 50

测试文件只使用 XxxTest.js，不得创建 .test.js、.spec.js、.mjs。

## 12. 固定执行顺序

不得跳步。每一步都要实际改代码并验证。

### Gate 0：保存基线

执行并记录：

    git status --short
    git diff --stat
    rg --files src scripts tests

更新 docs/APP_RESTRUCTURE_PLAN.md，写入当前真实状态。不能只更新文档后停止。

### Gate 1：修复审计脚本

1. 创建 auditRoutes.js 和 analyzeMpPackage.js。
2. 更新 package.json。
3. 给脚本加测试。
4. 确认 npm run audit:routes 在当前未清理状态下会失败；这证明门禁有效。

### Gate 2：先建立 app/shared 真正实现

1. 迁移 runtime、startup、pageState、storage、format、session。
2. 修正 appBootstrap，不再 import auth 分包。
3. 合并 shared UI。
4. 更新 main.js 直接创建 Pinia。
5. 更新所有主包和 shared import。
6. 运行测试与三端构建。

### Gate 3：逐分包闭环迁移

按 auth -> commerce -> order -> account -> content 顺序，每次只处理一个分包：

1. 把真实 API 实现迁入目标。
2. 建 mapper、composable、model/service。
3. 更新该分包全部页面 import。
4. 修复路由。
5. 修复组件接口。
6. 查 Mock/TODO。
7. 运行相关测试、audit:routes、微信构建。
8. 再进入下一个分包。

commerce 必须作为一个整体完成商品 -> 规格 -> 加购 -> 购物车 -> 结算，不能只搬文件。

### Gate 4：删除旧目录

删除前先逐项运行：

    rg -n "@/api|@/hooks|@/store|@/config|@/utils|@/components" src
    rg -n "from .*subPackages|import .*subPackages" src/pages src/app src/shared
    rg -n "safeNavigateTo|/pages/webview|default-product|default-avatar|guide-1|guide-2|jersey-" src
    rg -n "statusValue" src

这些命令中属于旧依赖和坏引用的结果必须为 0。然后按第 5 节精确删除，不得用 git clean。

### Gate 5：最终验证

严格依次执行，任何一步失败都继续修，不得交付：

    npm test
    npm run audit:routes
    npm run build:h5
    npm run build:app
    npm run build:weixin
    npm run audit:size
    npm run audit:all

npm test 必须真实 exit 0，不得出现未处理异常。Sass legacy-js-api 警告可以记录为非阻塞风险，但不能用来掩盖其他错误。

## 13. 最终验收条件

只有全部满足才可以说完成：

- 三端构建成功。
- 所有测试成功且 exit 0。
- audit:routes 为 0 error、0 结构 warning。
- audit:size 分析真实 dist/build/mp-weixin 并通过。
- 主包 pages 只有 startup、home。
- 五个 subPackages 保留，业务文件跟随所属分包。
- 第 5 节旧路径全部不存在。
- 无 re-export 兼容层。
- 无两个 cart Store、两个 cart API、两个 QuantityStepper、两个 EmptyState。
- main.js 不 import 业务 Store。
- app/shared/main pages 不 import subPackages。
- 分包之间不互相 import。
- 页面不直接调用 dispatch。
- 除 navigator.js 外无直接页面导航。
- 页面内部路由全部通过 routes 工厂。
- checkout 不再有未定义 navigator/ORDER_LIST。
- StatusTag 调用与组件 props 一致。
- 所有静态资源引用真实存在。
- root static 不含分包专属大图。
- 商品、购物车、结算使用真实后端 DTO。
- 购物车高频写入具备合并、单飞、flush、有限重试与幂等保护。
- 结算顺序是 flush -> PreviewOrder -> CreateOrder -> orderId 导航 -> cart 校准。
- 未接后端的页面没有 Mock 假数据和假成功操作。
- docs/APP_RESTRUCTURE_PLAN.md 更新为“实际完成记录”，不再保留过时结论。

## 14. 最终交付格式

最终回复必须逐项给出证据，禁止只说“全部完成”：

1. 最终目录树，与第 3 节逐项对照。
2. 实际修改文件清单。
3. 实际删除文件清单及每项替代文件。
4. 仍保留文件及保留理由。
5. pages.json 主包与五个分包路由表。
6. 依赖边界扫描结果。
7. 商品、购物车、结算调用链和后端方法映射。
8. 高频购物车调度参数与测试结果。
9. npm test 的文件数和断言数。
10. H5、App、微信构建结果。
11. audit:routes 和 audit:size 原始摘要。
12. 主包、各分包、总包真实 bytes/MiB。
13. 未接通的后端功能清单，不得伪装完成。
14. git status --short，证明没有回滚用户修改。

不要再次以“编译通过”代替结构验收，不要再把 warning 当成完成，不要保留“以后再删”的兼容转发层。按 Gate 0 到 Gate 5 持续实施，直到全部硬性条件通过。
