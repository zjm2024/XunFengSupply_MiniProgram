# APP 前端与 Mini 后端接口契约

统一入口：`POST /mini/api/dispatch`

请求体固定为：

```json
{
  "module": "MallDealer",
  "class": "Mini.LoginController",
  "method": "Login",
  "params": {}
}
```

后端输入字段大小写不敏感，响应统一输出 camelCase。前端 `src/api/base.js` 会解包
`{ code, message, data, traceId }`，业务页面拿到的是 `data`，不得再次读取 `res.data`。

## 已对齐端点

| 前端模块 | module | class | method |
| --- | --- | --- | --- |
| 登录/滑块/免登/退出/改密 | MallDealer | Mini.LoginController | Login / GetLoginCaptcha / VerifyLoginCaptcha / AutoLogin / Logout / ChangePassword |
| 用户资料/启动上下文 | MallDealer | Mini.ProfileController | GetProfile / GetBootstrapContext / UpdateProfile / UpdateLanguage |
| 入驻申请 | MallDealer | Mini.ApplicationController | SubmitApplication |
| 子账号 | MallDealer | Mini.SubAccountController | Create / GetList / ToggleStatus |
| 消息 | MallDealer | Mini.MessageController | GetMessages / MarkRead / MarkAllRead / GetUnreadCount |
| 商品 | MallProduct | Mini.ProductController | GetProductList / GetProductDetail / GetCategoryTree |
| 订单 | MallOrder | Mini.OrderController | PreviewOrder / CreateOrder / CancelOrder / GetOrderList / GetOrderDetail / GetOrderCounts / GetLogistics / ConfirmReceipt |
| 公告 | System | Mini.AnnouncementController | GetList / GetDetail |
| 行政区划 | System | Mini.SysAreaController | GetAreaTree / GetAreaChildren / GetAreaByCode |
| APP 版本 | System | Mini.AppVersionController | CheckVersion |
| 七牛凭证 | System | Mini.QiniuController | GetUploadToken / GetApplicationUploadToken |

## 关键字段

- 分页请求统一使用 `pageNum`、`pageSize`；分页响应使用 `items`、`totalCount`、`pageNum`、`pageSize`、`totalPages`。
- 订单列表页码字段是 `pageNum`，不是 `pageIndex`。
- 消息类型字段是 `msgType`，不是 `type`。
- 登录响应是扁平结构：`token`、`customerId`、`username`、`realName`、`grade`、`isMaster`、`expiresAt`，没有 `userInfo`、`refreshToken`、`expiresIn`。
- 商品字段使用 `productId`、`productName`、`productCode`、`imageUrl`、`minCurrentPrice`、`totalEffectiveStock`、`minOrderQty`；API 适配层同时提供页面展示别名。
- 公告类型：`1=政策`、`2=资讯`、`3=上新`、`4=结算通知`。

## 后端缺口（禁止伪接）

- RefreshToken：没有 `Mini.AuthController.RefreshToken`，401 只清理登录态并重新登录。
- 购物车：MallProduct 中仅有未开放的框架方法，且 MallOrder 尚无实际 CartController。
- 售后：`ApplyAfterSale` 端点存在，但 V1 固定返回“暂未开放”。
- 发票：`ApplyInvoice` 端点存在，但当前固定返回“暂未开放”。
- 账单、还款、产品手册、补货推荐、售后列表/详情等暂无 Mini 端点。

