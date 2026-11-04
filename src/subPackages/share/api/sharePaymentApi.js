import {dispatch} from '@/shared/api/dispatchClient.js'
import {shareAccessCode} from './shareAccessApi.js'
const states=new Set(['idle','authorization','ready','pending','paid','closed','refunding','refunded'])
/** 仅分享Cookie/CSRF运输，不接收订单、金额或OpenID。 */
async function request(access,method,params={}){if(!shareAccessCode(access?.contextId)||!shareAccessCode(access?.csrfToken))throw TypeError('Invalid share payment access');const row=await dispatch('Finance','Mini.SharePaymentController',method,params,{shareSession:true,anonymous:true,authStrategy:'passive',timeout:20000,header:{'X-Share-Context':access.contextId,'X-Share-CSRF':access.csrfToken}});if(row?.codeUrl && !(typeof row.codeUrl==='string' && row.codeUrl.startsWith('weixin://wxpay/bizpayurl?') && row.codeUrl.length<=2048 && !/[\s<>"']/.test(row.codeUrl)))throw TypeError('Invalid WeChat payment QR');if(!states.has(row?.status))throw TypeError('Invalid share payment response');if(row.authorizationUrl){const url=new URL(row.authorizationUrl);if(url.origin!=='https://open.weixin.qq.com'||url.pathname!=='/connect/oauth2/authorize')throw TypeError('Invalid WeChat authorization URL')}return {status:row.status,authorizationUrl:row.authorizationUrl||null,clientPayload:row.clientPayload||null,codeUrl:row.codeUrl||null}}
/** 申请本次公众号网页授权。 */
export const authorizeSharePayment=access=>request(access,'Authorize')
/** 提交一次性code和state，OpenID不进入客户端。 */
export const completeShareWechatAuthorization=(access,value)=>request(access,'CompleteAuthorization',{Code:value.code,State:value.state})
/** 创建/重用原微信交易。 */
export const payShareOrder=(access,value={})=>request(access,'Pay',value.native?{Native:true}:{})
/** 只查服务端实际资金事实。 */
export const querySharePayment=(access,value={})=>request(access,'Query',value.native?{Native:true}:{})
