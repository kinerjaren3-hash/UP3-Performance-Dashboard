/* Bridge data lokal (format dashboard yang sudah ada) ⇄ Supabase REST.
   Dokumen UP3 dan ULP tersimpan terpisah. Konflik menggunakan last-save-wins.
*/
(()=>{
  'use strict';
  const KEYS=['up3_monitoring_pekanbaru_v1','ulp_monitoring_pekanbaru_v1'];
  const cfg=window.DASHBOARD_SUPABASE||{};
  const url=String(cfg.url||'').replace(/\/$/,'');
  const key=String(cfg.publishableKey||'');
  const ready=/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)&&key&&!key.startsWith('ISI_');
  const originalSet=Storage.prototype.setItem;
  const status=(msg,isError=false)=>{const el=document.getElementById('cloudStatus');if(el){el.textContent=msg;el.style.color=isError?'#b9323e':'#087453'}};
  let armed=false;
  let busy=false;
  const timers={};
  const headers=()=>({'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'});
  async function request(path,options={}){
    const res=await fetch(url+'/rest/v1/'+path,{...options,headers:{...headers(),...(options.headers||{})}});
    if(!res.ok){let detail='';try{detail=await res.text()}catch{}throw new Error('HTTP '+res.status+' '+detail.slice(0,180))}
    return res.status===204?null:res.json();
  }
  function localPayload(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}}
  async function push(k){
    if(!ready)return;
    const payload=localPayload(k);if(payload===null)return;
    await request('dashboard_snapshots?on_conflict=doc_key',{method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({doc_key:k,payload,changed_at:new Date().toISOString()})});
  }
  async function pull(){
    const rows=await request('dashboard_snapshots?select=doc_key,payload');
    let changed=false;
    for(const row of rows){
      if(!KEYS.includes(row.doc_key))continue;
      const str=JSON.stringify(row.payload);
      if(str!==localStorage.getItem(row.doc_key)){originalSet.call(localStorage,row.doc_key,str);changed=true}
    }
    return changed;
  }
  Storage.prototype.setItem=function(k,val){
    originalSet.call(this,k,val);
    if(this!==localStorage||!armed||!KEYS.includes(k))return;
    clearTimeout(timers[k]);
    timers[k]=setTimeout(()=>{push(k).then(()=>status('Tersambung · perubahan tersimpan di cloud')).catch(err=>status('Gagal sinkronisasi: '+err.message,true))},400);
  };
  async function boot(){
    if(!ready){status('Belum terkoneksi: isi cloud-config.js dengan Project URL dan Publishable Key.',true);return}
    status('Menghubungkan ke Supabase...');
    try{
       const changed=await pull();
       armed=true;
       status('Tersambung ke Supabase · data online siap');
       if(changed){location.reload();return}
    }catch(err){status('Koneksi gagal: '+err.message,true)}
  }
  window.addEventListener('DOMContentLoaded',()=>{
    const sync=document.getElementById('cloudSync'),upload=document.getElementById('cloudUpload');
    sync.onclick=async()=>{if(!ready){status('Konfigurasi Supabase belum diisi.',true);return}if(!confirm('Ambil data cloud? Perubahan lokal yang belum terkirim dapat terganti.'))return;
      sync.disabled=true; try{const changed=await pull();status('Data cloud diambil');if(changed)location.reload()}catch(err){status('Gagal mengambil data: '+err.message,true)}finally{sync.disabled=false}};
    upload.onclick=async()=>{if(!ready){status('Konfigurasi Supabase belum diisi.',true);return}if(!confirm('Kirim data lokal dan timpa data cloud UP3/ULP yang sudah ada?'))return;
      upload.disabled=true;try{for(const k of KEYS)await push(k);armed=true;status('Data lokal berhasil dikirim ke Supabase')}catch(err){status('Gagal mengirim: '+err.message,true)}finally{upload.disabled=false}};
    boot();
  });
})();