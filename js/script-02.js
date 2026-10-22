/* Extracted from original index.html; execution order: 2 of 5 */
(()=>{
const key='ulp_monitoring_pekanbaru_v1';const dataDefault={ulps:[],entries:{}};
let db;try{db=JSON.parse(localStorage.getItem(key))||dataDefault}catch(e){db=dataDefault};if(!Array.isArray(db.ulps)||!db.entries)db=structuredClone(dataDefault);
// Hilangkan unit contoh dari daftar serta penyimpanan lama, tanpa mengubah ULP lain.
db.ulps=db.ulps.filter(n=>n!=='ULP 1');
for(const k of Object.keys(db.entries)){try{if(JSON.parse(k)[0]==='ULP 1')delete db.entries[k]}catch(e){}}
try{localStorage.setItem(key,JSON.stringify(db))}catch(e){}
const $=id=>document.getElementById(id),name=$('ulpName'),period=$('ulpPeriod'),rows=$('ulpRows'),message=$('ulpMessage');
const htmlsafe=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const recordKey=(n,p)=>JSON.stringify([n,p]);const records=()=>db.entries[recordKey(name.value,period.value)]||{};
function save(){localStorage.setItem(key,JSON.stringify(db))}
function list(){
 const current=name.value||db.ulps[0]||'';
 const opts=(db.ulps.length?db.ulps:['']).map(x=>`<option value="${htmlsafe(x)}">${htmlsafe(x)}</option>`).join('');
 name.innerHTML=opts;
 $('ulpChartName').innerHTML=opts;
 name.value=db.ulps.includes(current)?current:(db.ulps[0]||'');
 $('ulpSave').disabled=!db.ulps.length;
 $('ulpDelete').disabled=!db.ulps.length;
 $('ulpChartName').value=name.value;
}
function score(id,target,real){if(!Number.isFinite(target)||!Number.isFinite(real))return null;if(id===10)return real===0?100:null;if(target===0)return null;return id<=4?real/target*100:(2-real/target)*100}
function readRows(){let result={};rows.querySelectorAll('tr[data-id]').forEach(tr=>{let id=tr.dataset.id,els=tr.querySelectorAll('input');const num=e=>e.value.trim()===''?null:Number(e.value);let [t,r,p]=[...els].map(num);if([t,r,p].some(x=>x!==null))result[id]={target:t,realisasi:r,pencapaian:score(Number(id),t,r)}});return result}
function renderUlp(){
 const k=Math.max(0,Math.min(11,Number(period.value.slice(5,7))-1));
 const wig=$('ulpWig').value,q=$('ulpSearch').value.toLowerCase().trim();
 const selected=metrics.filter(m=>(wig==='all'||wig===m.wig)&&m.name.toLowerCase().includes(q));
 const data=selected.map(m=>{
  const v={...m,target:Array(12).fill(null),realisasi:Array(12).fill(null),pencapaian:Array(12).fill(null),note:''};
  for(let i=0;i<12;i++){
   const r=db.entries[recordKey(name.value,`2026-${String(i+1).padStart(2,'0')}`)]?.[m.id];
   if(r){for(const fld of ['target','realisasi','pencapaian'])v[fld][i]=Number.isFinite(r[fld])?r[fld]:null}
  }
  return v;
 });
 const current=data.filter(m=>Number.isFinite(m.pencapaian[k]));
 const counts={r:0,y:0,g:0,up:0,down:0};
 current.forEach(m=>{counts[status(m.pencapaian[k])]++;const d=diff(m,k);if(d!==null){const t=state(d);if(t==='up'||t==='down')counts[t]++}});
 ['ulpTotal','ulpRed','ulpYellow','ulpGreen','ulpImprove','ulpWorse'].forEach((id,i)=>$(id).textContent=[selected.length,counts.r,counts.y,counts.g,counts.up,counts.down][i]);
 $('ulpDashTitle').textContent=`Ringkasan Indikator Kinerja · ${name.value} · S/D ${months[k]} 2026`;
 $('ulpDashCards').innerHTML=data.length?data.map(m=>{
  if(Number.isFinite(m.pencapaian[k]))return card(m,k);
  return `<article class="kcard" style="background:#f8fbfe;border-color:#d9e3ee"><div class="cardhead"><div class="cardlead"><div class="number">${String(m.id).padStart(2,'0')}</div><div><div class="wig">${htmlsafe(m.wig)}</div><h3>${htmlsafe(m.name)}</h3><div class="meta">${htmlsafe(m.unit)} · Belum ada data pencapaian pada periode ini</div></div></div><div class="cardright"><span class="pill" style="background:#e8eef4;color:#526b80">Belum diisi</span></div></div>${chart(m,k)}<div class="legendline"><span><b style="background:#2e7ad8"></b>Target</span><span><b style="background:#f1943b"></b>Realisasi</span><span><b style="background:#ce444c"></b>Pencapaian (%)</span></div></article>`
 }).join(''):'<p>Tidak ada indikator yang cocok.</p>';
 $('ulpTrenHead').textContent=k===0?'Analisis Tren ULP · Januari 2026':'Analisis Tren ULP · '+months[k-1]+' → '+months[k]+' 2026';
 $('ulpTrendGrid').innerHTML=k===0?'<p style="padding:12px">Tren tersedia mulai Februari.</p>':
 trendcol('MEMBAIK','good',data.filter(m=>state(diff(m,k))==='up').sort((a,b)=>diff(b,k)-diff(a,k)),k)+
 trendcol('MEMBURUK','bad',data.filter(m=>state(diff(m,k))==='down').sort((a,b)=>diff(a,k)-diff(b,k)),k)+
 trendcol('TETAP','flat',data.filter(m=>diff(m,k)!==null&&state(diff(m,k))==='flat'),k);
}
$('ulpChartName').addEventListener('change',()=>{
 name.value=$('ulpChartName').value;
 table();
});
$('ulpChartPeriod').addEventListener('change',()=>{
 period.value=$('ulpChartPeriod').value;
 table();
});
$('ulpWig').addEventListener('change',renderUlp);
$('ulpSearch').addEventListener('input',renderUlp);
$('ulpReset').onclick=()=>{$('ulpWig').value='all';$('ulpSearch').value='';renderUlp()};
function table(){if(!db.ulps.length){rows.innerHTML='<tr><td colspan=7>Belum ada ULP. Tambahkan nama ULP terlebih dahulu.</td></tr>'; $('ulpRecap').innerHTML='<tr><td colspan=6>Belum ada data ULP.</td></tr>'; $('ulpDashCards').innerHTML='<p>Tambahkan ULP untuk mulai mengisi data.</p>'; return;} $('ulpChartName').value=name.value;$('ulpChartPeriod').value=period.value;const rec=records();rows.innerHTML=metrics.map(m=>{const v=rec[m.id]||{},t=v.target??'',r=v.realisasi??'',p=score(m.id,v.target,v.realisasi)??'';return `<tr data-id="${m.id}"><td>${String(m.id).padStart(2,'0')}</td><td><b>${htmlsafe(m.name)}</b><div style="color:#6c8296">${htmlsafe(m.wig)}</div></td><td>${htmlsafe(m.unit)}</td><td><input aria-label="Target ${htmlsafe(m.name)}" type="number" step="any" data-field="target" value="${t}"></td><td><input aria-label="Realisasi ${htmlsafe(m.name)}" type="number" step="any" data-field="realisasi" value="${r}"></td><td><input aria-label="Pencapaian ${htmlsafe(m.name)}" type="number" step="any" data-field="pencapaian" value="${p}" readonly title="Dihitung otomatis dari target dan realisasi" style="background:#edf5fa;cursor:not-allowed"></td><td class="ulp-result"></td></tr>`}).join('');compute();summary();renderUlp()}
function compute(){rows.querySelectorAll('tr[data-id]').forEach(tr=>{const id=Number(tr.dataset.id),inputs=tr.querySelectorAll('input');const t=inputs[0].value.trim()===''?null:Number(inputs[0].value),r=inputs[1].value.trim()===''?null:Number(inputs[1].value);const v=score(id,t,r);inputs[2].value=v===null?'':v.toFixed(2);inputs[2].readOnly=true;inputs[2].style.background='#edf5fa';const cell=tr.querySelector('.ulp-result');cell.textContent=v===null?(id===10&&r!==null&&r>0?'Perlu verifikasi':'Belum lengkap'):(v>=100?'● Hijau':v>=95?'● Kuning':'● Merah');cell.style.color=v===null?'#687990':v>=100?'#00875c':v>=95?'#ad7b00':'#c5303b'})}
function summary(){let rec=records(),vals=Object.values(rec).map((v,i)=>v),scores=metrics.map(m=>rec[m.id]?.pencapaian).filter(Number.isFinite);$('ulpSummary').innerHTML=`<div class="ulp-chip"><b>${scores.length}/10</b>KPI terisi</div><div class="ulp-chip"><b>${scores.filter(v=>v>=100).length}</b>Hijau</div><div class="ulp-chip"><b>${scores.filter(v=>v>=95&&v<100).length}</b>Kuning</div><div class="ulp-chip"><b>${scores.filter(v=>v<95).length}</b>Merah</div>`;$('ulpPreview').innerHTML=metrics.map(m=>{let r=rec[m.id],p=r?.pencapaian;return `<div class="ulp-card"><h4>${String(m.id).padStart(2,'0')} · ${htmlsafe(m.name)}</h4><div class="sub">${htmlsafe(m.wig)} · ${htmlsafe(m.unit)}</div><div>Target: <b>${r?.target??'—'}</b> &nbsp; Realisasi: <b>${r?.realisasi??'—'}</b></div><div>Pencapaian: <b>${Number.isFinite(p)?p.toFixed(2)+'%':'Belum diisi'}</b></div><div class="bar"><span style="width:${Number.isFinite(p)?Math.max(0,Math.min(100,p)):0}%;background:${!Number.isFinite(p)?'#ccd9e6':p>=100?'#0a9566':p>=95?'#e4b72f':'#cc4754'}"></span></div></div>`}).join('');$('ulpRecap').innerHTML=Object.entries(db.entries).map(([k,val])=>{let np;try{np=JSON.parse(k)}catch{return ''};let v=Object.values(val).map(x=>x.pencapaian).filter(Number.isFinite);return `<tr><td>${htmlsafe(np[0])}</td><td>${htmlsafe(np[1])}</td><td>${v.length}/10</td><td>${v.filter(x=>x>=100).length}</td><td>${v.filter(x=>x>=95&&x<100).length}</td><td>${v.filter(x=>x<95).length}</td></tr>`}).join('')||'<tr><td colspan="6">Belum ada data tersimpan.</td></tr>'}
function download(blob,filename){let u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
$('ulpAdd').onclick=()=>{const n=$('ulpNew').value.trim();if(!n){message.textContent='Masukkan nama ULP.';return}if(n==='ULP 1'){message.textContent='Gunakan nama ULP yang sebenarnya.';return}if(db.ulps.includes(n)){message.textContent='ULP sudah terdaftar.';return}db.ulps.push(n);save();list();name.value=n;$('ulpNew').value='';message.textContent='ULP ditambahkan.';table()};
$('ulpSave').onclick=()=>{db.entries[recordKey(name.value,period.value)]=readRows();try{save();message.textContent='Data '+name.value+' periode '+period.value+' tersimpan di browser ini.';table()}catch(e){message.textContent='Gagal menyimpan: '+e.message}};
$('ulpDelete').onclick=()=>{if(!confirm('Hapus data ULP '+name.value+' untuk '+period.value+'?'))return;delete db.entries[recordKey(name.value,period.value)];save();table();message.textContent='Data periode dihapus.'};
$('ulpExport').onclick=()=>download(new Blob([JSON.stringify({...db,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),'input_kinerja_ULP_2026.json');
$('ulpCsv').onclick=()=>{let lines=['ULP,Periode,ID,WIG,Indikator,Satuan,Target,Realisasi,Pencapaian'];for(let [k,rs] of Object.entries(db.entries)){let np=JSON.parse(k);for(let m of metrics){let r=rs[m.id];if(!r)continue;lines.push([np[0],np[1],m.id,m.wig,m.name,m.unit,r.target??'',r.realisasi??'',r.pencapaian??''].map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(','))}}download(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),'rekap_kinerja_ULP_2026.csv')};
$('ulpImport').onchange=async e=>{let file=e.target.files[0];if(!file)return;try{let o=JSON.parse(await file.text());if(!Array.isArray(o.ulps)||!o.entries||typeof o.entries!=='object')throw Error('Format tidak sesuai');if(!confirm('Impor akan mengganti data ULP yang tersimpan di browser ini. Lanjutkan?'))return;db={ulps:o.ulps.filter(x=>typeof x==='string'&&x!=='ULP 1'),entries:o.entries};for(const k of Object.keys(db.entries)){try{if(JSON.parse(k)[0]==='ULP 1')delete db.entries[k]}catch(e){}}for(const record of Object.values(db.entries)){for(const [id,v] of Object.entries(record)){if(v&&typeof v==='object')v.pencapaian=score(Number(id),v.target,v.realisasi)}}save();list();table();message.textContent='Data berhasil diimpor.'}catch(err){message.textContent='Gagal impor: '+err.message}e.target.value=''};
name.onchange=table;period.onchange=table;rows.addEventListener('input',compute);
months.forEach((m,i)=>$('ulpChartPeriod').add(new Option('S/D '+m.toUpperCase()+' 2026',`2026-${String(i+1).padStart(2,'0')}`)));
list();table();
})();
