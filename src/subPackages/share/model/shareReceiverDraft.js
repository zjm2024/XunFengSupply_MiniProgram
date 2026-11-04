import storage from '@/shared/utils/storage.js'
const KEY='share_receiver_draft_v1'
const fields={contactName:50,contactPhone:30,addressDetail:300,provinceCode:6,cityCode:6,districtCode:6}
const names=['province','city','district']
/** 只允许收件字段和地区展示名进入本机草稿，丢弃所有凭据/金额/订单字段。 */
function normalize(value){if(!value||typeof value!=='object')return null;const address={},region={};for(const [key,max]of Object.entries(fields)){const text=value.address?.[key]??'';if(typeof text!=='string'||text.length>max||/[\u0000-\u001f\u007f]/.test(text))return null;if(key.endsWith('Code')&&text&&!/^\d{6}$/.test(text))return null;address[key]=text;if(key.endsWith('Code'))region[key]=text}for(const key of names){const text=value.region?.[key]??'';if(typeof text!=='string'||text.length>120||/[\u0000-\u001f\u007f]/.test(text))return null;region[key]=text}return{address,region}}
/** 本机草稿保留30天；过期或损坏即清除，恢复后仍由结算接口核验地区和地址。 */
export function readReceiverDraft(now=Date.now()){const value=storage.get(KEY);if(!value)return null;const result=normalize(value);if(value.version!==1||!Number.isSafeInteger(value.savedAt)||value.savedAt>now+60000||now-value.savedAt>30*86400000||!result){storage.remove(KEY);return null}return result}
/** 自动保存输入草稿，允许未填完；不保存物流、备注、支付与会话信息。 */
export function saveReceiverDraft(address,region,now=Date.now()){const value=normalize({address,region});if(!value)return false;if(!Object.values(value.address).some(Boolean))return storage.remove(KEY);return storage.set(KEY,{version:1,savedAt:now,...value})}
/** 用户主动清除当前浏览器的分享收件草稿。 */
export function clearReceiverDraft(){return storage.remove(KEY)}
/** 给出首个具体地址错误，前端通过后服务端仍独立校验。 */
export function receiverError(address){if(!address.contactName?.trim())return '请填写收件人姓名';const phone=address.contactPhone?.trim().replace(/ /g,'')||'';if(phone.length<6||phone.length>30||!/^[-+()0-9]+$/.test(phone))return '请输入有效的联系电话';if(![address.provinceCode,address.cityCode,address.districtCode].every(code=>/^\d{6}$/.test(code||'')))return '请选择完整的省市区';if(!address.addressDetail?.trim())return '请填写详细地址';return ''}
