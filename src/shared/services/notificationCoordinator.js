/** A single session-scoped coordinator. All async results carry a generation guard. */
export function createNotificationCoordinator({ getSession, fetchSummary, applySummary, reset, bind, navigate, now = Date.now }) {
  let generation = 0, key = '', ready = false, inflight = null, binding = null, pending = null, last = 0, lastOpened = '', lastOpenedAt = 0
  const sessionKey = () => { const s=getSession(); return s.token && s.accountId ? String(s.accountId)+':'+String(s.dealerId) : '' }
  function synchronize() {
    const next = sessionKey()
    if (next !== key) { generation++; key=next; inflight=null; binding=null; last=0; reset() }
    return Boolean(key && ready)
  }
  async function refresh(force = false) {
    if (!synchronize()) return
    if (inflight) return inflight
    if (!force && now()-last < 1500) return
    const epoch=generation
    const task=fetchSummary().then(result=>{ if(epoch===generation && key===sessionKey()){applySummary(result);last=now()} })
    inflight=task
    try { await task } finally { if(inflight===task) inflight=null }
  }
  async function register() {
    if (!synchronize() || !bind) return
    const epoch=generation, session=getSession()
    const result=await bind(session)
    if(epoch===generation && key===sessionKey()) binding=result
  }
  async function openPending() {
    if (!synchronize() || !pending) return
    const target=pending
    // An old account's queued notification must never be opened after switching accounts.
    if (String(target.accountId)!==String(getSession().accountId)) {pending=null;return}
    if (!binding || (target.bindingVersion && target.bindingVersion!==binding.bindingVersion)) return
    pending=null
    const identity=key+':'+target.messageId
    if(lastOpened===identity && now()-lastOpenedAt<1500)return
    lastOpened=identity;lastOpenedAt=now()
    try { await navigate(target.messageId) } catch(error) { lastOpened='';throw error }
  }
  async function resume() {
    ready = true
    synchronize()
    const summary = refresh(true).catch(() => {})
    await register().catch(() => {})
    await openPending()
    await summary
  }
  async function receive(event) {
    let data=event?.data
    for(let n=0;n<3;n++){
      if(typeof data==='string'){try{data=JSON.parse(data)}catch{return}}
      if(data?.payload!=null)data=data.payload
    }
    if(!data || !/^[1-9][0-9]{0,18}$/.test(String(data.messageId||'')))return
    if(event.type==='click')pending={messageId:String(data.messageId),accountId:String(data.accountId||''),bindingVersion:String(data.bindingVersion||'')}
    if(!synchronize())return
    if(String(data.accountId)!==String(getSession().accountId))return
    const summary = refresh(true).catch(() => {})
    if (event.type === 'click') await openPending()
    await summary
  }
  function clear({ preservePending = false } = {}) {
    generation++;key='';ready=false;inflight=null;binding=null
    if (!preservePending) pending=null
    else if(pending) pending={...pending,bindingVersion:''}
    last=0;lastOpened='';reset()
  }
  return { refresh, resume, receive, clear, synchronize }
}
