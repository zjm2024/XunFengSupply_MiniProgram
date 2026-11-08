import { watch } from 'vue'
import { useUserStore } from '../session/userStore.js'
import { useMessageStore } from '../model/messageStore.js'
import { registerSessionCleanup, registerSessionRelease } from '../session/sessionCleanup.js'
import { getUnreadSummary } from '../api/messageApi.js'
import { bindPushDevice, unbindPushDevice } from '../api/notificationApi.js'
import storage from '../utils/storage.js'
import { navigator } from '../../app/navigation/navigator.js'
import { routes } from '../../app/config/routes.js'
import { createNotificationCoordinator } from './notificationCoordinator.js'

let coordinator = null
let lastBinding = null
let foreground = true
let sessionReady = false
let preserveLoginTarget = false
let pushReady = false
let fallbackTimer = null
const PUSH_ENABLED = import.meta.env.VITE_NOTIFICATION_PUSH_ENABLED === 'true'

/** Read OS permission without treating missing APIs as authorization. */
export function getSystemNotificationPermission() {
  try { const setting=uni.getAppAuthorizeSetting?.(); return setting?.notificationAuthorized === 'authorized' }
  catch { return false }
}
/** An installation ID is an opaque identifier; server authorization never relies on it alone. */
function installationId() {
  let id=storage.get('notificationInstallationId','')
  if(!/^[a-f0-9]{32}$/.test(id)){
    id=Array.from({length:32},()=>Math.floor(Math.random()*16).toString(16)).join('')
    storage.set('notificationInstallationId',id)
  }
  return id
}
/** Bind only the native signed app after enabling the deployed push integration. */
async function registerDevice(session) {
  pushReady=false
  let response=null
  // #ifdef APP-PLUS
  if(PUSH_ENABLED && typeof uni.getPushClientId==='function'){
    const cid=await new Promise((resolve,reject)=>uni.getPushClientId({success:r=>resolve(r.cid),fail:reject}))
    if(String(useUserStore().userId)!==String(session.accountId) || useUserStore().token!==session.token)return null
    response=await bindPushDevice({installationId:installationId(),pushClientId:cid,
      platform:uni.getSystemInfoSync().platform,permissionGranted:getSystemNotificationPermission()})
    if(String(useUserStore().userId)!==String(session.accountId) || useUserStore().token!==session.token)return null
    lastBinding={installationId:installationId(),bindingVersion:response.bindingVersion??response.BindingVersion,token:session.token}
    pushReady=true
    storage.set('notificationBinding',{accountId:String(session.accountId),bindingVersion:lastBinding.bindingVersion})
  }
  // #endif
  return response?{bindingVersion:response.bindingVersion??response.BindingVersion}:null
}
/** Install once after Pinia creation; bootstrap itself remains the only startup router. */
export function installNotificationLifecycle(pinia) {
  if(coordinator)return
  const user=useUserStore(pinia),messages=useMessageStore(pinia)
  coordinator=createNotificationCoordinator({
    getSession:()=>({accountId:user.userId,dealerId:user.dealerId,token:user.isLogin&&user.isAccountNormal?user.token:''}),
    fetchSummary:getUnreadSummary,applySummary:value=>messages.applySummary(value),reset:()=>messages.$reset(),
    bind:registerDevice,navigate:id=>navigator.navigateTo(routes.content.messageDetail(id)),
  })
  watch(()=>[user.userId,user.dealerId,user.isLogin,user.isAccountNormal],()=>{pushReady=false;coordinator.synchronize()},{flush:'sync'})
  registerSessionRelease('notifications',releaseNotificationBinding)
  registerSessionCleanup('notifications',()=>{clearTimeout(fallbackTimer);fallbackTimer=null;pushReady=false;sessionReady=false;coordinator.clear({preservePending:preserveLoginTarget});preserveLoginTarget=false;lastBinding=null;storage.remove('notificationBinding')})
  // #ifdef APP-PLUS
  if(PUSH_ENABLED && typeof uni.onPushMessage==='function')uni.onPushMessage(event=>coordinator.receive(event).catch(()=>{}))
  // #endif
  uni.onNetworkStatusChange?.(event=>{if(event.isConnected && foreground)notificationAppShow()})
}
/** Home readiness follows successful bootstrap/login navigation and may safely consume a queued click. */
export function notificationSessionReady() { sessionReady=true;return coordinator?.resume().catch(()=>{}).finally(scheduleFallback) }
export function notificationAppShow() {foreground=true;return (sessionReady?coordinator?.resume():coordinator?.refresh(true))?.catch(()=>{}).finally(scheduleFallback)}
export function notificationAppHide() {foreground=false;clearTimeout(fallbackTimer);fallbackTimer=null}
/** Best-effort remote unbind uses the old token and version before local logout. */
export async function releaseNotificationBinding(options = {}) {
  preserveLoginTarget = options.preserveNotificationTarget === true
  clearTimeout(fallbackTimer);fallbackTimer=null;pushReady=false;sessionReady=false
  const binding=lastBinding
  coordinator?.clear({preservePending:preserveLoginTarget});lastBinding=null;storage.remove('notificationBinding')
  if(binding)await unbindPushDevice(binding,binding.token).catch(()=>{})
}

/** Foreground-only low-frequency recovery while native push is disabled or unavailable. */
function scheduleFallback() {
  clearTimeout(fallbackTimer);fallbackTimer=null
  if(!foreground || !sessionReady || pushReady)return
  fallbackTimer=setTimeout(()=>{fallbackTimer=null;coordinator?.refresh(true).catch(()=>{}).finally(scheduleFallback)},60000+Math.floor(Math.random()*15000))
}
